const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
router.post('/owner/add-driver', async (req, res) => {
  try {
    const { full_name, mobile_number, owner_id } = req.body;

    if (!full_name || !mobile_number || !owner_id)
      return res.status(400).json({ success: false, message: 'Missing required fields' });

    if (/[0-9]/.test(full_name))
      return res.status(400).json({ success: false, message: '❌ Name cannot contain numbers' });

    if (!/^[A-Za-z\s.]+$/.test(full_name))
      return res.status(400).json({ success: false, message: '❌ Name: letters, spaces and dots only' });

    if (!/^\d{10}$/.test(mobile_number))
      return res.status(400).json({ success: false, message: '❌ Phone must be exactly 10 digits' });

    // Check duplicate
    const dup = await pool.query(
      'SELECT id FROM auth.users WHERE mobile_number = $1', [mobile_number]
    );
    if (dup.rows.length > 0)
      return res.status(400).json({ success: false, message: '❌ Driver with this phone already exists' });

    // ── Get OR auto-create owner company ──
    let companyResult = await pool.query(
      `SELECT cc.id AS company_id
       FROM auth.client_companies cc
       JOIN auth.client_company_users ccu ON ccu.client_company_id = cc.id
       WHERE ccu.user_id = $1 LIMIT 1`,
      [owner_id]
    );

    let companyId = companyResult.rows[0]?.company_id;

    if (!companyId) {
      // Auto-create company for this owner
      const ownerInfo = await pool.query(
        'SELECT mobile_number, profile_photo_url FROM auth.users WHERE id = $1', [owner_id]
      );
      if (ownerInfo.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Owner not found' });

      const { mobile_number: ownerPhone, profile_photo_url } = ownerInfo.rows[0];
      const newCompanyId = require('uuid').v4();

      await pool.query(
        `INSERT INTO auth.client_companies (id, company_code, company_name, company_status, contact_mobile)
         VALUES ($1, $2, $3, 'ACTIVE', $4) ON CONFLICT DO NOTHING`,
        [newCompanyId, 'CC_' + Date.now(), ownerPhone + ' Fleet Co.', ownerPhone]
      );
      await pool.query(
        `INSERT INTO auth.client_company_users (id, user_id, client_company_id, full_name, profile_photo_url, user_status)
         VALUES ($1, $2, $3, $4, $5, 'ACTIVE') ON CONFLICT DO NOTHING`,
        [require('uuid').v4(), owner_id, newCompanyId, 'Owner ' + ownerPhone, profile_photo_url || '']
      );
      companyId = newCompanyId;
    }

    // Create user account for driver
    const userCode = `DRV${Date.now()}${Math.random().toString(36).substring(2,6).toUpperCase()}`;
    const avatarUrl = `https://ui-avatars.com/api/?background=16a34a&color=fff&name=${encodeURIComponent(full_name)}&size=128`;

    const newUser = await pool.query(
      `INSERT INTO auth.users (user_code, mobile_number, user_type, account_status, profile_photo_url, is_mobile_verified, created_at)
       VALUES ($1, $2, 'VEHICLE_DRIVER', 'ACTIVE', $3, true, NOW())
       RETURNING id`,
      [userCode, mobile_number, avatarUrl]
    );
    const driverUserId = newUser.rows[0].id;

    // Create driver record
    await pool.query(
      `INSERT INTO auth.vehicle_drivers
       (user_id, vehicle_owner_company_id, driver_code, full_name, profile_photo_url,
        onboarding_status, wallet_balance, daily_rent, owner_user_id, created_at)
       VALUES ($1, $2, $3, $4, $5, 'VERIFIED', 0, 0, $6, NOW())`,
      [driverUserId, companyId, userCode, full_name, avatarUrl, owner_id]
    );

    // Notify owner
    await pool.query(
      `INSERT INTO auth.notifications (user_id, user_type, title, message, metadata)
       VALUES ($1, 'VEHICLE_OWNER_USER', 'New Driver Added',
               $2, $3)`,
      [
        owner_id,
        `${full_name} has been added to your fleet.`,
        JSON.stringify({ driver_id: driverUserId, driver_code: userCode, mobile: mobile_number })
      ]
    ).catch(() => {}); // Non-blocking

    res.json({
      success: true,
      message: '✅ Driver added successfully!',
      driver_id: driverUserId,
      driver_code: userCode
    });

  } catch (err) {
    console.error('Add driver error:', err);
    res.status(500).json({ success: false, message: 'Failed to add driver: ' + err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────
// REPLACE: POST /webhook
// Fix: updates auth.vehicle_drivers wallet + notifies owner + tracks IDs
// ─────────────────────────────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  const body = req.body;
  console.log('Webhook received:', body);

  try {
    const payload   = body.data || body;
    const orderId   = payload.referenceId || payload.merchantOrderId || payload.orderId;
    let rawStatus   = payload.transactionStatus || payload.status;
    let status      = rawStatus ? String(rawStatus).toUpperCase() : 'PENDING';
    if (status === 'INITIATED')  status = 'PENDING';
    if (status === 'SUCCESSFUL') status = 'SUCCESS';

    if (!orderId) return res.status(400).json({ message: 'orderId missing' });

    const localOrder = await pool.query(
      'SELECT * FROM ms_orders WHERE order_id = $1 OR order_number = $1 LIMIT 1',
      [orderId]
    );
    if (localOrder.rows.length === 0)
      return res.status(404).json({ message: 'Order not found' });

    const order = localOrder.rows[0];

    if (status === 'SUCCESS' && order.transaction_status !== 'SUCCESS') {
      const amount       = parseFloat(order.order_amount || 0);
      const driverPhone  = order.payer_mobile;

      // ── 1. Get driver & vehicle info ──
      const driverInfo = await pool.query(
        `SELECT
           u.id          AS driver_user_id,
           vd.id         AS vd_id,
           ov.id         AS vehicle_id,
           ov.vehicle_number,
           ov.daily_rent,
           ov.owner_id
         FROM auth.users u
         LEFT JOIN auth.vehicle_drivers vd ON vd.user_id = u.id
         LEFT JOIN auth.owner_vehicles  ov ON ov.driver_id = u.id
         WHERE u.mobile_number = $1
         LIMIT 1`,
        [driverPhone]
      );
      const di = driverInfo.rows[0];

      // ── 2. Update driver wallet ──
      if (di?.vd_id) {
        await pool.query(
          `UPDATE auth.vehicle_drivers
           SET wallet_balance    = COALESCE(wallet_balance, 0) + $1,
               amount_paid_today = COALESCE(amount_paid_today, 0) + $1,
               updated_at        = NOW()
           WHERE id = $2`,
          [amount, di.vd_id]
        );
      }

      // ── 3. Tag ms_orders with IDs ──
      await pool.query(
        `UPDATE ms_orders
         SET owner_id = $1, driver_id = $2, vehicle_id = $3, vehicle_number = $4
         WHERE order_id = $5 OR order_number = $5`,
        [di?.owner_id || null, di?.driver_user_id || null, di?.vehicle_id || null, di?.vehicle_number || null, orderId]
      );

      // ── 4. Notify OWNER ──
      if (di?.owner_id) {
        const driverName = await pool.query(
          'SELECT full_name FROM auth.vehicle_drivers WHERE user_id = $1', [di.driver_user_id]
        );
        const name = driverName.rows[0]?.full_name || driverPhone;
        await pool.query(
          `INSERT INTO auth.notifications (user_id, user_type, title, message, metadata)
           VALUES ($1, 'VEHICLE_OWNER_USER', '💰 Rent Payment Received',
                   $2, $3)`,
          [
            di.owner_id,
            `${name} paid ₹${amount} for vehicle ${di.vehicle_number || '—'}`,
            JSON.stringify({
              driver_id:      di.driver_user_id,
              vehicle_id:     di.vehicle_id,
              vehicle_number: di.vehicle_number,
              amount,
              order_id:       orderId
            })
          ]
        ).catch(() => {});
      }

      // ── 5. Notify DRIVER ──
      if (di?.driver_user_id) {
        await pool.query(
          `INSERT INTO auth.notifications (user_id, user_type, title, message, metadata)
           VALUES ($1, 'VEHICLE_DRIVER', '✅ Payment Successful',
                   $2, $3)`,
          [
            di.driver_user_id,
            `Your payment of ₹${amount} has been received successfully.`,
            JSON.stringify({ amount, order_id: orderId, vehicle_number: di.vehicle_number })
          ]
        ).catch(() => {});
      }

      console.log(`💰 Webhook SUCCESS: ₹${amount} from ${driverPhone}`);
    }

    // ── Update order status ──
    const paymentMode = payload.paymentMode || payload.paymentMethod || null;
    await pool.query(
      `UPDATE ms_orders SET
         transaction_status       = $1,
         transaction_status_code  = $2,
         pg_transaction_id        = COALESCE($3, pg_transaction_id),
         bank_reference_no        = COALESCE($4, bank_reference_no),
         bank_utr_no              = COALESCE($5, bank_utr_no),
         payment_mode             = COALESCE($6, payment_mode),
         order_completion_date    = NOW()
       WHERE order_id = $7`,
      [
        status,
        payload.statusCode            || null,
        payload.transactionId         || payload.transactionPublicId || null,
        payload.bankReferenceNo       || payload.rrn || null,
        payload.bankUTRNo             || null,
        paymentMode,
        orderId
      ]
    );

    res.json({ success: true, message: 'Webhook processed' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});


// ─────────────────────────────────────────────────────────────────────
// NEW: GET /owner/notifications
// ─────────────────────────────────────────────────────────────────────
router.get('/owner/notifications', async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) return res.status(400).json({ message: 'ownerId required' });

    const result = await pool.query(
      `SELECT * FROM auth.notifications
       WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [ownerId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Owner notifications error:', err);
    res.json([]);
  }
});


// ─────────────────────────────────────────────────────────────────────
// NEW: GET /driver/notifications
// ─────────────────────────────────────────────────────────────────────
router.get('/driver/notifications', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'phone required' });

    const result = await pool.query(
      `SELECT n.* FROM auth.notifications n
       JOIN auth.users u ON u.id = n.user_id
       WHERE u.mobile_number = $1
       ORDER BY n.created_at DESC LIMIT 50`,
      [phone]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Driver notifications error:', err);
    res.json([]);
  }
});


// ─────────────────────────────────────────────────────────────────────
// NEW: PUT /notifications/mark-read
// ─────────────────────────────────────────────────────────────────────
router.put('/notifications/mark-read', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    await pool.query(
      'UPDATE auth.notifications SET is_read = TRUE WHERE user_id = $1', [userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ message: 'Failed' });
  }
});


// ─────────────────────────────────────────────────────────────────────
// NEW: GET /owner/recent-payments
// Payment feed for owner dashboard (with driver name + vehicle)
// ─────────────────────────────────────────────────────────────────────
router.get('/owner/recent-payments', async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) return res.status(400).json({ message: 'ownerId required' });

    const result = await pool.query(
      `SELECT
         mo.order_amount,
         mo.transaction_status,
         mo.order_initiation_date,
         mo.order_completion_date,
         mo.vehicle_number,
         mo.payer_mobile,
         COALESCE(vd.full_name, mo.payer_name, mo.payer_mobile) AS driver_name
       FROM ms_orders mo
       LEFT JOIN auth.users u   ON u.mobile_number = mo.payer_mobile
       LEFT JOIN auth.vehicle_drivers vd ON vd.user_id = u.id
       WHERE mo.owner_id = $1
         AND mo.transaction_status = 'SUCCESS'
       ORDER BY mo.order_initiation_date DESC
       LIMIT 20`,
      [ownerId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Recent payments error:', err);
    res.json([]);
  }
});


// ─────────────────────────────────────────────────────────────────────
// REPLACE: GET /driver/dues
// Fix: returns 0 if no vehicle assigned
// ─────────────────────────────────────────────────────────────────────
router.get('/driver/dues', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'Phone number required' });

    // Check if vehicle assigned
    const vehicleResult = await pool.query(
      `SELECT ov.id, ov.daily_rent, ov.vehicle_number
       FROM auth.owner_vehicles ov
       JOIN auth.users u ON u.id = ov.driver_id
       WHERE u.mobile_number = $1
       LIMIT 1`,
      [phone]
    );

    // No vehicle → no rent
    if (vehicleResult.rows.length === 0) {
      return res.json({ dues: 0, daily_rent: 0, vehicle_assigned: false });
    }

    const { daily_rent, vehicle_number } = vehicleResult.rows[0];

    // How much paid today?
    const paidResult = await pool.query(
      `SELECT COALESCE(SUM(order_amount), 0) AS total_paid
       FROM ms_orders
       WHERE payer_mobile = $1
         AND transaction_status = 'SUCCESS'
         AND order_completion_date >= CURRENT_DATE`,
      [phone]
    );
    const totalPaid   = parseFloat(paidResult.rows[0]?.total_paid || 0);
    const pendingDues = Math.max(0, parseFloat(daily_rent) - totalPaid);

    res.json({
      dues:             pendingDues,
      daily_rent:       parseFloat(daily_rent),
      vehicle_number,
      vehicle_assigned: true
    });
  } catch (err) {
    console.error('Dues fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch dues' });
  }
});


// ─────────────────────────────────────────────────────────────────────
// NEW: GET /driver/profile — driver ID, vehicle, wallet in one call
// ─────────────────────────────────────────────────────────────────────
router.get('/driver/profile', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'Phone required' });

    const result = await pool.query(
      `SELECT
         u.id              AS user_id,
         u.user_code       AS driver_code,
         u.mobile_number,
         vd.full_name,
         vd.wallet_balance,
         vd.daily_rent,
         vd.amount_paid_today,
         ov.vehicle_number,
         ov.vehicle_model,
         ov.daily_rent     AS vehicle_daily_rent
       FROM auth.users u
       LEFT JOIN auth.vehicle_drivers vd ON vd.user_id = u.id
       LEFT JOIN auth.owner_vehicles  ov ON ov.driver_id = u.id
       WHERE u.mobile_number = $1
       LIMIT 1`,
      [phone]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Driver not found' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Driver profile error:', err);
    res.status(500).json({ message: 'Failed' });
  }
});


// ─────────────────────────────────────────────────────────────────────
// NEW: GET /owner/stats  (enhanced — includes paid_today count)
// ─────────────────────────────────────────────────────────────────────
router.get('/owner/stats', async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) return res.status(400).json({ message: 'Owner ID required' });

    const [v, d, e, p] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM auth.owner_vehicles WHERE owner_id = $1',  [ownerId]),
      pool.query(
        `SELECT COUNT(*) FROM auth.vehicle_drivers vd
         WHERE vd.vehicle_owner_company_id = (
           SELECT cc.id FROM auth.client_companies cc
           JOIN auth.client_company_users ccu ON ccu.client_company_id = cc.id
           WHERE ccu.user_id = $1 LIMIT 1)`,
        [ownerId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(order_amount), 0) AS total
         FROM ms_orders WHERE owner_id = $1 AND transaction_status = 'SUCCESS'
         AND order_completion_date >= CURRENT_DATE`,
        [ownerId]
      ),
      pool.query(
        `SELECT COUNT(DISTINCT payer_mobile) AS cnt
         FROM ms_orders WHERE owner_id = $1 AND transaction_status = 'SUCCESS'
         AND order_completion_date >= CURRENT_DATE`,
        [ownerId]
      ),
    ]);

    res.json({
      total_vehicles: parseInt(v.rows[0].count || 0),
      total_drivers:  parseInt(d.rows[0].count || 0),
      total_earnings: parseFloat(e.rows[0].total || 0),
      paid_today:     parseInt(p.rows[0].cnt || 0),
    });
  } catch (err) {
    console.error('Owner stats error:', err);
    res.json({ total_vehicles: 0, total_drivers: 0, total_earnings: 0, paid_today: 0 });
  }
});
module.exports = router;