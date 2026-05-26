require('dotenv').config(); //read backend .env fileyou 

const express = require('express');

const router = express.Router();

const { v4: uuidv4 } = require('uuid');

const pool = require('../config/db');

const CLIENT_ID = process.env.PAYYANTRA_CLIENT_ID;

const CLIENT_SECRET = process.env.PAYYANTRA_CLIENT_SECRET;

const BASE_URL = process.env.PAYYANTRA_BASE_URL;


console.log('PayYantra Config Loaded:', {
  BASE_URL,
  CLIENT_ID: CLIENT_ID ? '✅ Present' : '❌ Missing',
  CLIENT_SECRET: CLIENT_SECRET ? '✅ Present' : '❌ Missing'
});


// GET TOKEN
const getToken = async () => {

  try {

    const res = await fetch(`${BASE_URL}/api/auth/token`, {

      method: 'POST',

      headers: {

        'x-client-id': CLIENT_ID,

        'x-client-secret': CLIENT_SECRET,

        'Content-Type': 'application/json',

      },

    });

    const data = await res.json();

    if (!data?.data?.token) {

      throw new Error('Failed to get token from PayYantra');

    }

    return data.data.token;

  } catch (err) {

    console.error('Get Token Error:', err.message);

    throw err;

  }

};
// ... top pe sab imports ...
// ====================== ADD TO YOUR EXISTING payment.js ======================

// GET DRIVER WALLET (from vehicle_drivers table - auth schema)
router.get('/driver/wallet', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'Phone number required' });
    
    const result = await pool.query(
      `SELECT COALESCE(vd.wallet_balance, 0) as balance 
       FROM auth.vehicle_drivers vd
       JOIN auth.users u ON u.id = vd.user_id
       WHERE u.mobile_number = $1`,
      [phone]
    );
    
    res.json({ balance: parseFloat(result.rows[0]?.balance || 0) });
  } catch (err) {
    console.error('Wallet fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch wallet' });
  }
});
// ADD DRIVER - Fixed version
// ADD DRIVER - With proper validation and error messages
router.post('/owner/add-driver', async (req, res) => {
  try {
    const { full_name, mobile_number, license_number, owner_id } = req.body;
    
    console.log('Add driver request:', { full_name, mobile_number, owner_id });
    
    // Validate required fields
    if (!full_name || !mobile_number || !owner_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    // Validate name - NO NUMBERS ALLOWED
    if (/[0-9]/.test(full_name)) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ Name cannot contain numbers! Only letters and spaces allowed.' 
      });
    }
    
    // Validate name - only letters, spaces, dots
    if (!/^[A-Za-z\s\.]+$/.test(full_name)) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ Name can only contain letters, spaces, and dots.' 
      });
    }
    
    // Validate phone number (exactly 10 digits)
    if (!/^\d{10}$/.test(mobile_number)) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ Phone number must be exactly 10 digits' 
      });
    }
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM auth.users WHERE mobile_number = $1',
      [mobile_number]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ Driver with this phone number already exists' 
      });
    }
    
    // Get owner's company ID
    const companyResult = await pool.query(
      `SELECT cc.id as company_id 
       FROM auth.client_companies cc
       JOIN auth.client_company_users ccu ON ccu.client_company_id = cc.id
       WHERE ccu.user_id = $1
       LIMIT 1`,
      [owner_id]
    );
    
    const companyId = companyResult.rows[0]?.company_id;
    
    if (!companyId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Owner company not found' 
      });
    }
    
    // Generate unique user code
    const userCode = `DRV${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Create user
    const newUser = await pool.query(
      `INSERT INTO auth.users (user_code, mobile_number, user_type, account_status, created_at)
       VALUES ($1, $2, 'VEHICLE_DRIVER', 'ACTIVE', NOW())
       RETURNING id`,
      [userCode, mobile_number]
    );
    
    const userId = newUser.rows[0].id;
    
    // Create vehicle driver record
    await pool.query(
      `INSERT INTO auth.vehicle_drivers 
       (user_id, vehicle_owner_company_id, driver_code, full_name, profile_photo_url, onboarding_status, wallet_balance, daily_rent, created_at)
       VALUES ($1, $2, $3, $4, '', 'VERIFIED', 0, 850, NOW())`,
      [userId, companyId, userCode, full_name]
    );
    
    console.log(`✅ Driver added successfully: ${full_name} (${mobile_number})`);
    
    res.json({ 
      success: true, 
      message: '✅ Driver added successfully!', 
      driver_id: userId,
      driver_code: userCode
    });
    
  } catch (err) {
    console.error('Add driver error:', err);
    
    // Check for specific constraint violation
    if (err.message.includes('numbers')) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ Name cannot contain numbers! Please use only letters.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add driver: ' + err.message 
    });
  }
});
// TEST ENDPOINT - Set test dues for a driver (REMOVE IN PRODUCTION)
router.post('/driver/set-test-dues', async (req, res) => {
  try {
    const { phone, amount } = req.body;
    
    // Create a test vehicle assignment
    const userResult = await pool.query(
      'SELECT id FROM auth.users WHERE mobile_number = $1',
      [phone]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    const driverId = userResult.rows[0].id;
    
    // Check if driver already has a vehicle
    const existingVehicle = await pool.query(
      'SELECT id FROM auth.owner_vehicles WHERE driver_id = $1',
      [driverId]
    );
    
    if (existingVehicle.rows.length === 0) {
      // Create a test vehicle for this driver
      await pool.query(
        `INSERT INTO auth.owner_vehicles 
         (owner_id, vehicle_number, vehicle_model, daily_rent, driver_id, status)
         VALUES 
         ((SELECT id FROM auth.users WHERE user_type = 'PLATFORM_ADMIN' LIMIT 1),
          'TEST-001', 'Test EV Vehicle', $1, $2, 'ASSIGNED')`,
        [amount || 850, driverId]
      );
    }
    
    res.json({ success: true, message: `Test dues set to ₹${amount || 850}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to set test dues' });
  }
});
// GET DRIVER DUES
router.get('/driver/dues', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'Phone number required' });
    
    // Get daily rent from assigned vehicle
    const vehicleResult = await pool.query(
      `SELECT ov.daily_rent 
       FROM auth.owner_vehicles ov
       JOIN auth.users u ON u.id = ov.driver_id
       WHERE u.mobile_number = $1`,
      [phone]
    );
    
    const dailyRent = vehicleResult.rows[0]?.daily_rent || 850;
    
    // Get total paid today
    const paidResult = await pool.query(
      `SELECT COALESCE(SUM(order_amount), 0) as total_paid
       FROM ms_orders
       WHERE payer_mobile = $1 
       AND transaction_status = 'SUCCESS'
       AND order_completion_date >= CURRENT_DATE`,
      [phone]
    );
    
    const totalPaid = parseFloat(paidResult.rows[0]?.total_paid || 0);
    const pendingDues = Math.max(0, dailyRent - totalPaid);
    
    res.json({ dues: pendingDues, daily_rent: dailyRent });
  } catch (err) {
    console.error('Dues fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch dues' });
  }
});

// GET DRIVER TELEMETRY
router.get('/driver/telemetry', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'Phone number required' });
    
    const result = await pool.query(
      `SELECT 
        COALESCE(ov.vehicle_number, 'MH-12-QX-4019') as vehicleNumber,
        COALESCE(vd.wallet_balance, 0) as wallet
       FROM auth.users u
       LEFT JOIN auth.owner_vehicles ov ON ov.driver_id = u.id
       LEFT JOIN auth.vehicle_drivers vd ON vd.user_id = u.id
       WHERE u.mobile_number = $1`,
      [phone]
    );
    
    res.json({
      vehicleNumber: result.rows[0]?.vehiclenumber || 'MH-12-QX-4019',
      battery: 92,
      driven: 45,
      wallet: parseFloat(result.rows[0]?.wallet || 0)
    });
  } catch (err) {
    console.error('Telemetry error:', err);
    res.json({ vehicleNumber: 'MH-12-QX-4019', battery: 92, driven: 45, wallet: 0 });
  }
});

// GET DRIVER NOTIFICATIONS
router.get('/driver/notifications', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'Phone number required' });
    
    const result = await pool.query(
      `SELECT n.* FROM auth.notifications n
       JOIN auth.users u ON u.id = n.user_id
       WHERE u.mobile_number = $1 AND n.user_type = 'DRIVER'
       ORDER BY n.created_at DESC LIMIT 50`,
      [phone]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Notifications error:', err);
    res.json([]);
  }
});

// GET OWNER VEHICLES
router.get('/owner/vehicles', async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) return res.status(400).json({ message: 'Owner ID required' });
    
    const result = await pool.query(
      `SELECT 
        ov.*,
        u.mobile_number as driver_phone,
        vd.full_name as driver_name
       FROM auth.owner_vehicles ov
       LEFT JOIN auth.users u ON u.id = ov.driver_id
       LEFT JOIN auth.vehicle_drivers vd ON vd.user_id = u.id
       WHERE ov.owner_id = $1
       ORDER BY ov.created_at DESC`,
      [ownerId]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Owner vehicles error:', err);
    res.json([]);
  }
});

// GET OWNER DRIVERS LIST
router.get('/owner/drivers/list', async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) return res.status(400).json({ message: 'Owner ID required' });
    
    const result = await pool.query(
      `SELECT 
        vd.user_id as id,
        vd.full_name,
        u.mobile_number as phone_number,
        u.user_code as driver_code,
        COALESCE(ov.vehicle_number, 'Not Assigned') as assigned_vehicle
       FROM auth.vehicle_drivers vd
       JOIN auth.users u ON u.id = vd.user_id
       LEFT JOIN auth.owner_vehicles ov ON ov.driver_id = u.id
       WHERE vd.vehicle_owner_company_id = (
         SELECT cc.id FROM auth.client_companies cc
         JOIN auth.client_company_users ccu ON ccu.client_company_id = cc.id
         WHERE ccu.user_id = $1
       )
       ORDER BY vd.created_at DESC`,
      [ownerId]
    );
    
    res.json({ drivers: result.rows });
  } catch (err) {
    console.error('Owner drivers error:', err);
    res.json({ drivers: [] });
  }
});

// GET OWNER STATS
router.get('/owner/stats', async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) return res.status(400).json({ message: 'Owner ID required' });
    
    const vehiclesResult = await pool.query(
      'SELECT COUNT(*) as total FROM auth.owner_vehicles WHERE owner_id = $1',
      [ownerId]
    );
    
    const driversResult = await pool.query(
      `SELECT COUNT(*) as total FROM auth.vehicle_drivers vd
       WHERE vd.vehicle_owner_company_id = (
         SELECT cc.id FROM auth.client_companies cc
         JOIN auth.client_company_users ccu ON ccu.client_company_id = cc.id
         WHERE ccu.user_id = $1
       )`,
      [ownerId]
    );
    
    const earningsResult = await pool.query(
      `SELECT COALESCE(SUM(mo.order_amount), 0) as total
       FROM ms_orders mo
       WHERE mo.payer_mobile IN (
         SELECT u.mobile_number FROM auth.users u
         JOIN auth.vehicle_drivers vd ON vd.user_id = u.id
         WHERE vd.vehicle_owner_company_id = (
           SELECT cc.id FROM auth.client_companies cc
           JOIN auth.client_company_users ccu ON ccu.client_company_id = cc.id
           WHERE ccu.user_id = $1
         )
       )
       AND mo.transaction_status = 'SUCCESS'
       AND mo.order_completion_date >= CURRENT_DATE`,
      [ownerId]
    );
    
    res.json({
      total_vehicles: parseInt(vehiclesResult.rows[0]?.total || 0),
      total_drivers: parseInt(driversResult.rows[0]?.total || 0),
      total_earnings: parseFloat(earningsResult.rows[0]?.total || 0)
    });
  } catch (err) {
    console.error('Owner stats error:', err);
    res.json({ total_vehicles: 0, total_drivers: 0, total_earnings: 0 });
  }
});

// ADD VEHICLE
router.post('/owner/vehicles', async (req, res) => {
  try {
    const { owner_id, vehicle_number, vehicle_model, daily_rent, driver_id } = req.body;
    
    if (!owner_id || !vehicle_number || !vehicle_model || !daily_rent) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const existing = await pool.query(
      'SELECT id FROM auth.owner_vehicles WHERE vehicle_number = $1',
      [vehicle_number]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Vehicle number already exists' });
    }
    
    const result = await pool.query(
      `INSERT INTO auth.owner_vehicles 
       (owner_id, vehicle_number, vehicle_model, daily_rent, driver_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [owner_id, vehicle_number, vehicle_model, daily_rent, driver_id || null, driver_id ? 'ASSIGNED' : 'AVAILABLE']
    );
    
    if (driver_id) {
      await pool.query(
        `INSERT INTO auth.notifications (user_id, user_type, title, message)
         VALUES ($1, 'DRIVER', 'Vehicle Assigned', 
                 'You have been assigned vehicle ${vehicle_number}')`,
        [driver_id]
      );
    }
    
    res.json({ success: true, vehicle: result.rows[0] });
  } catch (err) {
    console.error('Add vehicle error:', err);
    res.status(500).json({ message: 'Failed to add vehicle' });
  }
});
// ====================== PAYMENT RESULT ROUTE (Sabse Upar Rakh Do) ======================
// backend/src/routes/payment.js me replace kar
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.query; // Frontend se PayYantra ka status aayega
    
    // 1. Agar payment successful hui hai, toh pehle apne DB ko UPDATE karo
    if (status === 'Success' || status === 'SUCCESS') {
      await pool.query(
        `UPDATE ms_orders 
         SET transaction_status = 'SUCCESS', status = 'SUCCESS', order_completion_date = NOW() 
         WHERE order_id = $1 OR order_number = $1 OR pg_transaction_id = $1`, 
        [orderId]
      );
    }

    // 2. Ab updated record ko Database se READ karo
    // Note: Hum multiple columns check kar rahe hain taaki column name ki wajah se 404 na aaye
    const order = await pool.query(
      `SELECT * FROM ms_orders 
       WHERE order_id = $1 OR order_number = $1 OR pg_transaction_id = $1`, 
      [orderId]
    );
    
    // Agar DB me order sach me nahi mila, toh hi 404 bhejenge
    if (order.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order strictly not found in ms_orders' });
    }
    
    // 100% Real DB data return karo
    res.json({ success: true, data: order.rows[0] });
  } catch (err) {
    console.error('DB Fetch/Update Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// =============================================================================

// Baaki sab routes (create-order, webhook, my-transactions, etc.) yahan rahenge...

// CREATE ORDER 
router.post('/create-order', async (req, res) => {

  const { amount, customerName, customerPhone, customerEmail } = req.body;

  console.log('Create Order Received:', { amount, customerName, customerPhone, customerEmail });

  if (!amount || Number(amount) <= 0 || !customerPhone) {

    return res.status(400).json({ 
      success: false, 
      message: 'Invalid amount or phone number',
      received: { amount, phone: customerPhone }
    });

  }


  const parsedAmount = Number(amount);

  const orderId = uuidv4();

  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;


  try {

    // Insert order in db
    const insertResult = await pool.query(

  `INSERT INTO ms_orders 
  (
    order_id,
    order_number,
    order_amount,
    currency,
    payer_name,
    payer_mobile,
    payer_email,
    transaction_status
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
  RETURNING *`,

  [
    orderId,
    orderNumber,
    parsedAmount,
    'INR',
    customerName,
    customerPhone,
    customerEmail
  ]

);

console.log('✅ ORDER INSERTED IN DB');

console.log(insertResult.rows[0]);


    const token = await getToken();

    const orderPayload = {

      referenceId: orderId,
      merchantOrderId: orderNumber,

      amount: parsedAmount, 

      currency: 'INR',

      customerName: customerName || 'Driver',

      customerEmail: customerEmail || process.env.DEFAULT_EMAIL,

      customerPhone: customerPhone,

      notifyUrl: process.env.PAYYANTRA_NOTIFY_URL,

      returnUrl: process.env.PAYYANTRA_RETURN_URL,

      allowedPaymentMethods: ['UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'INTERNET_BANKING'],

    };


    console.log('Sending to PayYantra:', orderPayload);

    const orderRes = await fetch(`${BASE_URL}/api/v2/merchant/orders`, {

      method: 'POST',

      headers: {

        'Authorization': `Bearer ${token}`,

        'Content-Type': 'application/json',

      },

      body: JSON.stringify(orderPayload),

    });


    const orderData = await orderRes.json();

    console.log('PayYantra Response:', { status: orderRes.status, data: orderData });


    if (!orderRes.ok) {

      throw new Error(orderData.message || `PayYantra Error: ${orderRes.status}`);

    }


    if (orderData?.data?.transactionId) {

      await pool.query(

        `UPDATE ms_orders SET pg_transaction_id = $1 WHERE order_id = $2`,

        [orderData.data.transactionId, orderId]

      );

    }


    const checkoutUrl = orderData?.data?.data?.checkoutUrl || orderData?.data?.checkoutUrl || orderData?.data?.url;


    if (!checkoutUrl) {

      throw new Error('No checkout URL received from PayYantra');

    }


    res.json({

      success: true,

      data: orderData,

      orderId,

      orderNumber,

      paymentUrl: checkoutUrl,

      checkoutUrl

    });


  } catch (err) {

    console.error('=== PAYMENT CREATION FAILED ===', err.message);

    res.status(500).json({

      success: false,

      message: 'Payment Initiation Failed',

      error: err.message,

      details: 'Check server logs for more info'

    });

  }

});


router.get('/driver-details', async (req, res) => {

  try {

    const phone = req.query.phone;

    if (!phone) {

      return res.status(400).json({ message: 'Phone number is required' });

    }


    const result = await pool.query(

      `SELECT * FROM driver_details 
       WHERE user_id = (SELECT id FROM users WHERE phone_number = $1 LIMIT 1)`,

      [phone]

    );


    if (result.rows.length === 0) {

      const newDriver = await pool.query(

        `INSERT INTO driver_details 
         (user_id, wallet_balance, daily_rent, amount_paid_today, battery_level, kms_driven, vehicle_number)
         VALUES (
           (SELECT id FROM users WHERE phone_number = $1 LIMIT 1), 
           0, 100, 0, 0, 0, 'Not Assigned'
         ) RETURNING *`,

        [phone]

      );

      return res.json(newDriver.rows[0]);

    }


    res.json(result.rows[0]);


  } catch (err) {

    console.error(err);

    res.status(500).json({ message: 'Failed to fetch driver details' });

  }

});


// WEBHOOK
router.post('/webhook', async (req, res) => {

  const body = req.body;

  console.log('Webhook received:', body);


  try {

    const payload = body.data || body;     

    const orderId =
  payload.referenceId ||
  payload.merchantOrderId ||
  payload.orderId;

    let rawStatus = payload.transactionStatus || payload.status;    


    // STATUS MAPPER
    let status = rawStatus ? String(rawStatus).toUpperCase() : 'PENDING';

    if (status === 'INITIATED') status = 'PENDING';

    if (status === 'SUCCESSFUL') status = 'SUCCESS';


    if (!orderId) return res.status(400).json({ message: 'orderId missing' });


    const localOrder = await pool.query('SELECT * FROM ms_orders WHERE order_id = $1 OR order_number = $1 LIMIT 1', [orderId]);


    if (localOrder.rows.length === 0) {

      return res.status(404).json({ message: 'Order not found' });

    }


    if (status === 'SUCCESS' && localOrder.rows[0].transaction_status !== 'SUCCESS') {

      const amount = parseFloat(localOrder.rows[0].order_amount || 0);

      await pool.query(

        `UPDATE driver_details 
         SET 
           wallet_balance = COALESCE(wallet_balance, 0) + $1,
           amount_paid_today = COALESCE(amount_paid_today, 0) + $1,
           updated_at = NOW()
         WHERE user_id = (
           SELECT id FROM users WHERE phone_number = $2 LIMIT 1
         )`,

        [amount, localOrder.rows[0].payer_mobile]

      );

      console.log(`💰 Wallet Updated: +₹${amount} for ${localOrder.rows[0].payer_mobile}`);

    }


    const paymentMode = payload.paymentMode || payload.paymentMethod || payload.payment_mode || payload.method || null;


    await pool.query(

      `UPDATE ms_orders SET
        transaction_status = $1,
        transaction_status_code = $2,
        pg_transaction_id = COALESCE($3, pg_transaction_id),
        bank_reference_no = COALESCE($4, bank_reference_no),
        bank_utr_no = COALESCE($5, bank_utr_no),
        payment_mode = COALESCE($6, payment_mode),
        order_completion_date = NOW()
       WHERE order_id = $7`,

      [

        status,

        payload.statusCode || null,

        payload.transactionId || payload.transactionPublicId || null,

        payload.bankReferenceNo || payload.rrn || null, 

        payload.bankUTRNo || null,

        paymentMode,

        orderId

      ]

    );


    res.json({
  success: true,
  message: 'Webhook processed'
});

  } catch (err) {

    console.error('Webhook error:', err);

    res.status(500).json({ message: 'Webhook processing failed' });

  }

});


// MY TRANSACTIONS
router.get('/my-transactions', async (req, res) => {

  try {

    const phone = req.query.phone;

    if (!phone) return res.status(400).json({ message: 'Phone number is required' });


    const result = await pool.query(

      `SELECT * FROM ms_orders WHERE payer_mobile = $1 ORDER BY order_initiation_date DESC`,

      [phone]

    );


    res.json(result.rows);


  } catch (err) {

    console.error(err);

    res.status(500).json({ message: 'Failed to fetch transactions' });

  }

});


// CHECK PENDING (Inquiry API) 
router.post('/check-pending', async (req, res) => {

  try {

    const pending = await pool.query("SELECT * FROM ms_orders WHERE transaction_status = 'PENDING'");


    if (pending.rows.length === 0) {

      return res.json({ message: 'No pending orders' });

    }


    const token = await getToken();

    const updated = [];


    for (const order of pending.rows) {

      try {

        const statusRes = await fetch(`${BASE_URL}/api/pay/status/by-reference/${order.order_id}`, {

          headers: { 'Authorization': `Bearer ${token}` }

        });

        const data = await statusRes.json();        

        let rawStatus = data.transactionStatus || data.status;        


        // STATUS MAPPER
        let newStatus = rawStatus ? String(rawStatus).toUpperCase() : null;

        if (newStatus === 'INITIATED') newStatus = 'PENDING';

        if (newStatus === 'SUCCESSFUL') newStatus = 'SUCCESS';


        if (newStatus && newStatus !== 'PENDING') {

          const amount = parseFloat(order.order_amount);


          if (newStatus === 'SUCCESS') {

            await pool.query(

              `UPDATE driver_details 
               SET wallet_balance = COALESCE(wallet_balance, 0) + $1,
                   amount_paid_today = COALESCE(amount_paid_today, 0) + $1,
                   updated_at = NOW()
               WHERE user_id = (SELECT id FROM users WHERE phone_number = $2 LIMIT 1)`,

              [amount, order.payer_mobile]

            );

          }

          

          const paymentMode = data.paymentMode || data.paymentMethod || data.payment_mode || data.method || null;


          await pool.query(

            `UPDATE ms_orders SET 
              transaction_status = $1,
              pg_transaction_id = COALESCE($2, pg_transaction_id),
              bank_reference_no = COALESCE($3, bank_reference_no),
              bank_utr_no = COALESCE($4, bank_utr_no),
              payment_mode = COALESCE($5, payment_mode),
              order_completion_date = NOW()
             WHERE order_id = $6`,

            [

              newStatus, 

              data.transactionId || data.transactionPublicId || null, 

              data.bankReferenceNo || data.rrn || null, 

              data.bankUTRNo || null, 

              paymentMode, 

              order.order_id

            ]

          );

          updated.push(order.order_number);

        }

      } catch (err) {

        console.error(`Inquiry failed for ${order.order_id}:`, err.message);

      }

    }


    res.json({ message: 'Inquiry complete', updated: updated.length });


  } catch (err) {

    console.error(err);

    res.status(500).json({ message: 'Inquiry failed' });

  }

});


// SINGLE ORDER STATUS (Frontend ke liye)
router.get('/status/:orderId', async (req, res) => {

  const { orderId } = req.params;

  console.log('Status check requested for:', orderId);


  try {

    const localResult = await pool.query(

      'SELECT * FROM ms_orders WHERE order_id = $1 OR order_number = $1',

      [orderId]

    );


    if (localResult.rows.length === 0) {

      return res.status(404).json({ 

        message: 'Order not found in local DB',

        orderId 

      });

    }


    const token = await getToken();

    const localOrder = localResult.rows[0];

const statusRes = await fetch(
  `${BASE_URL}/api/pay/status/by-reference/${localOrder.order_id}`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);


    const rawData = await statusRes.json();
    console.log('🔥 PURE INQUIRY RESPONSE:', JSON.stringify(rawData, null, 2));
    const pyData = rawData.data || {};     


    // STATUS MAPPER
    let rawStatus = pyData.status || pyData.transactionStatus || localResult.rows[0].transaction_status;

    let newStatus = rawStatus ? String(rawStatus).toUpperCase() : 'PENDING';    

    if (newStatus === 'INITIATED') newStatus = 'PENDING';

    if (newStatus === 'SUCCESSFUL') newStatus = 'SUCCESS';


    const amount = parseFloat(localResult.rows[0].order_amount);

    

    // Update local DB if status changed
    if (newStatus && newStatus !== localResult.rows[0].transaction_status) {      

      if (newStatus === 'SUCCESS') {

        await pool.query(

          `UPDATE driver_details 
           SET wallet_balance = COALESCE(wallet_balance, 0) + $1,
               amount_paid_today = COALESCE(amount_paid_today, 0) + $1,
               updated_at = NOW()
           WHERE user_id = (SELECT id FROM users WHERE phone_number = $2 LIMIT 1)`,

          [amount, localResult.rows[0].payer_mobile]

        );

      }


      const paymentMode = pyData.paymentMode || pyData.paymentMethod || pyData.payment_mode || pyData.method || null;


      await pool.query(

        `UPDATE ms_orders SET 
          transaction_status = $1,
          pg_transaction_id = COALESCE($2, pg_transaction_id),
          bank_reference_no = COALESCE($3, bank_reference_no),
          bank_utr_no = COALESCE($4, bank_utr_no),
          payment_mode = COALESCE($5, payment_mode),
          order_completion_date = NOW()
         WHERE order_id = $6`,

        [

          newStatus,

          pyData.transactionPublicId || pyData.transactionId || null,

          pyData.rrn || pyData.bankReferenceNo || null,

          pyData.bankUTRNo || null,

          paymentMode,

          orderId

        ]

      );

    }


    res.json({

      success: true,

      status: newStatus,

      amount: amount, 

      orderId: orderId,

      pyData: pyData

    });


  } catch (err) {

    console.error('Status check error:', err.message);

    res.status(500).json({ message: 'Status check failed', error: err.message });

  }

});


// INQUIRY BY PAYYANTRA ORDER ID 
router.get('/inquiry-by-order/:payyantraOrderId', async (req, res) => {

  const { payyantraOrderId } = req.params;

  console.log('🔍 Inquiry requested for PayYantra Order ID:', payyantraOrderId);


  try {

    const token = await getToken();

    const pyRes = await fetch(`${BASE_URL}/api/pay/status/${payyantraOrderId}`, {

      headers: { 'Authorization': `Bearer ${token}` },

    });


    const rawData = await pyRes.json();

    const pyData = rawData.data || {}; 


    // STATUS MAPPER
    let rawStatus = pyData.status ? String(pyData.status).toUpperCase() : 'PENDING';

    let pyStatus = rawStatus;

    if (rawStatus === 'INITIATED') pyStatus = 'PENDING';

    if (rawStatus === 'SUCCESSFUL') pyStatus = 'SUCCESS';


    const localOrderId = pyData.referenceId;

    const amount = parseFloat(pyData.amount || 0);


    if (!localOrderId) {

      return res.status(404).json({ 

        success: false, 

        message: 'PayYantra order found, but referenceId is missing in their response.' 

      });

    }


    const localOrderResult = await pool.query(

      'SELECT * FROM ms_orders WHERE order_id = $1 OR order_number = $1', 

      [localOrderId]

    );


    if (localOrderResult.rows.length === 0) {

      return res.status(404).json({ success: false, message: 'Order not found in local DB' });

    }


    const currentLocalStatus = localOrderResult.rows[0].transaction_status;


    if (pyStatus === 'SUCCESS' && currentLocalStatus !== 'SUCCESS') {

      await pool.query(

        `UPDATE driver_details 
         SET wallet_balance = COALESCE(wallet_balance, 0) + $1,
             amount_paid_today = COALESCE(amount_paid_today, 0) + $1,
             updated_at = NOW()
         WHERE user_id = (SELECT id FROM users WHERE phone_number = $2 LIMIT 1)`,

        [amount, localOrderResult.rows[0].payer_mobile]

      );

      console.log(`💰 Wallet Automatically Updated via Inquiry API for ${localOrderResult.rows[0].payer_mobile}`);

    }


    const paymentMode = pyData.paymentMode || pyData.paymentMethod || pyData.payment_mode || pyData.method || null;


    await pool.query(

      `UPDATE ms_orders SET 
        transaction_status = $1,
        pg_transaction_id = COALESCE($2, pg_transaction_id),
        bank_reference_no = COALESCE($3, bank_reference_no),
        bank_utr_no = COALESCE($4, bank_utr_no),
        payment_mode = COALESCE($5, payment_mode),
        order_completion_date = NOW()
       WHERE order_id = $6`,

      [

        pyStatus,

        pyData.transactionPublicId || pyData.transactionId || null,

        pyData.rrn || pyData.bankReferenceNo || null,

        pyData.bankUTRNo || null,

        paymentMode,

        localOrderId

      ]

    );


    res.json({

      success: true,

      status: pyStatus,

      amount: amount,

      orderId: localOrderId,

      payyantraOrderId: payyantraOrderId,

      pyData: pyData

    });


  } catch (err) {

    console.error('❌ Inquiry API Error:', err.message);

    res.status(500).json({ success: false, message: 'Inquiry processing failed', error: err.message });

  }

});


// SYNC ALL MISSING DATA (One-Time Backfill)
router.post('/sync-all-orders', async (req, res) => {

  console.log('Starting full sync for missing payment modes...');

  try {

    const missingData = await pool.query("SELECT * FROM ms_orders WHERE payment_mode IS NULL OR payment_mode = ''");


    if (missingData.rows.length === 0) {

      return res.json({ message: 'All orders are already updated! No missing data found.' });

    }


    const token = await getToken();

    const updated = [];


    for (const order of missingData.rows) {

      try {

        const statusRes = await fetch(`${BASE_URL}/api/pay/status/by-reference/${order.order_id}`, {

          headers: { 'Authorization': `Bearer ${token}` }

        });

        const data = await statusRes.json();        

        let rawStatus = data.transactionStatus || data.status;        

        // STATUS MAPPER
        let newStatus = rawStatus ? String(rawStatus).toUpperCase() : null;

        if (newStatus === 'INITIATED') newStatus = 'PENDING';

        if (newStatus === 'SUCCESSFUL') newStatus = 'SUCCESS';


        const paymentMode = data.paymentMode || data.paymentMethod || data.payment_mode || data.method || null;


        if (paymentMode || newStatus) {

          await pool.query(

            `UPDATE ms_orders SET 
              transaction_status = COALESCE($1, transaction_status),
              pg_transaction_id = COALESCE($2, pg_transaction_id),
              bank_reference_no = COALESCE($3, bank_reference_no),
              bank_utr_no = COALESCE($4, bank_utr_no),
              payment_mode = COALESCE($5, payment_mode)
             WHERE order_id = $6`,

            [

              newStatus, 

              data.transactionId || data.transactionPublicId || null, 

              data.bankReferenceNo || data.rrn || null, 

              data.bankUTRNo || null, 

              paymentMode, 

              order.order_id

            ]

          );

          updated.push(order.order_number);

        }

      } catch (err) {

        console.error(`Sync failed for ${order.order_id}:`, err.message);

      }

    }

    res.json({ message: 'Sync complete', updatedCount: updated.length, updatedOrders: updated });

  } catch (err) {

    console.error(err);

    res.status(500).json({ message: 'Sync failed' });

  }

});

module.exports = router;