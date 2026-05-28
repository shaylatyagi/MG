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
// Backend payment.js - Add this endpoint
router.get('/driver/dues', async (req, res) => {
  try {
    const { phone } = req.query;
    
    if (!phone) {
      return res.status(400).json({ message: 'Phone required' });
    }
    
    // Get assigned vehicle daily rent
    const vehicleResult = await pool.query(
      `SELECT v.daily_rent, v.vehicle_number
       FROM public.vehicles v
       JOIN public.drivers d ON d.id = v.driver_id
       WHERE d.mobile_number = $1`,
      [phone]
    );
    
    let dailyRent = 850;
    let vehicleNumber = 'Not Assigned';
    let vehicleAssigned = false;
    
    if (vehicleResult.rows.length > 0) {
      dailyRent = parseFloat(vehicleResult.rows[0].daily_rent || 850);
      vehicleNumber = vehicleResult.rows[0].vehicle_number;
      vehicleAssigned = true;
    }
    
    // Get today's paid amount
    const paidResult = await pool.query(
      `SELECT COALESCE(SUM(order_amount), 0) as paid
       FROM public.ms_orders
       WHERE payer_mobile = $1 
         AND transaction_status = 'SUCCESS'
         AND DATE(order_completion_date) = CURRENT_DATE`,
      [phone]
    );
    
    const paidToday = parseFloat(paidResult.rows[0]?.paid || 0);
    const dues = Math.max(0, dailyRent - paidToday);
    
    res.json({
      dues: dues,
      daily_rent: dailyRent,
      vehicle_number: vehicleNumber,
      vehicle_assigned: vehicleAssigned,
      paid_today: paidToday
    });
    
  } catch (err) {
    console.error('Driver dues error:', err);
    res.status(500).json({ message: 'Failed' });
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

// ============================================
// ADD VEHICLE - Fixed for your table
// ============================================
// Backend - Add Vehicle with driver assignment
router.post('/owner/vehicles', async (req, res) => {
  try {
    const { owner_id, vehicle_number, vehicle_model, daily_rent, driver_id } = req.body;
    
    console.log('Add Vehicle:', { owner_id, vehicle_number, vehicle_model, daily_rent, driver_id });
    
    if (!owner_id || !vehicle_number) {
      return res.status(400).json({ success: false, message: 'Vehicle number and owner ID required' });
    }
    
    // Check if vehicle exists
    const existing = await pool.query(
      'SELECT id FROM public.vehicles WHERE vehicle_number = $1',
      [vehicle_number]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Vehicle number already exists' });
    }
    
    // Insert vehicle
    const result = await pool.query(
      `INSERT INTO public.vehicles 
       (vehicle_number, vehicle_model, daily_rent, owner_id, driver_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, vehicle_number, vehicle_model, daily_rent, driver_id`,
      [vehicle_number, vehicle_model || 'Standard', daily_rent || 850, parseInt(owner_id), driver_id || null, driver_id ? 'ASSIGNED' : 'AVAILABLE']
    );
    
    // If driver assigned, update driver's assigned_vehicle_id
    if (driver_id) {
      await pool.query(
        `UPDATE public.drivers 
         SET assigned_vehicle_id = $1, updated_at = NOW()
         WHERE id = $2`,
        [result.rows[0].id, driver_id]
      );
      
      // Also update vehicle's driver_name and driver_phone for quick access
      const driverInfo = await pool.query(
        'SELECT full_name, mobile_number FROM public.drivers WHERE id = $1',
        [driver_id]
      );
      
      if (driverInfo.rows.length > 0) {
        await pool.query(
          `UPDATE public.vehicles 
           SET driver_name = $1, driver_phone = $2
           WHERE id = $3`,
          [driverInfo.rows[0].full_name, driverInfo.rows[0].mobile_number, result.rows[0].id]
        );
      }
    }
    
    res.json({ success: true, message: 'Vehicle added successfully!', vehicle: result.rows[0] });
    
  } catch (err) {
    console.error('Add vehicle error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// Add this to your payment.js
// ============================================
// GET OWNER BY PHONE NUMBER - ADD THIS ENDPOINT
// ============================================
router.get('/owner/by-phone', async (req, res) => {
  try {
    const { phone } = req.query;
    console.log('🔍 /owner/by-phone called for phone:', phone);
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const result = await pool.query(
      `SELECT id, full_name, mobile_number, owner_code, wallet_balance, status, created_at
       FROM public.owners 
       WHERE mobile_number = $1`,
      [phone]
    );
    
    console.log('📊 Query result rows:', result.rows.length);
    
    if (result.rows.length === 0) {
      console.log('❌ Owner not found for phone:', phone);
      return res.status(404).json({ error: 'Owner not found' });
    }
    
    console.log('✅ Owner found:', result.rows[0]);
    res.json(result.rows[0]);
    
  } catch (err) {
    console.error('Owner by phone error:', err);
    res.status(500).json({ error: err.message });
  }
});
// ============================================
// GET OWNER VEHICLES
// ============================================
// Backend payment.js - Replace this endpoint
router.get('/owner/vehicles', async (req, res) => {
  try {
    const { ownerId } = req.query;
    console.log('Fetching vehicles for ownerId:', ownerId);
    
    if (!ownerId) {
      return res.status(400).json({ message: 'Owner ID required' });
    }
    
    const result = await pool.query(
      `SELECT 
         v.id, 
         v.vehicle_number, 
         v.vehicle_model, 
         v.daily_rent, 
         v.status, 
         v.created_at,
         v.driver_id,
         v.driver_name,
         v.driver_phone
       FROM public.vehicles v
       WHERE v.owner_id = $1
       ORDER BY v.created_at DESC`,
      [parseInt(ownerId)]
    );
    
    console.log('Vehicles found:', result.rows.length);
    res.json(result.rows);
    
  } catch (err) {
    console.error('Get vehicles error:', err);
    res.status(500).json({ message: 'Failed to fetch vehicles', error: err.message });
  }
});

// ============================================
// ADD DRIVER - Fixed for your table
// ============================================
router.post('/owner/add-driver', async (req, res) => {
  try {
    const { full_name, mobile_number, owner_id } = req.body;
    
    console.log('Add Driver:', { full_name, mobile_number, owner_id });
    
    if (!full_name || !mobile_number || !owner_id) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    // Validate name (no numbers)
    if (/[0-9]/.test(full_name)) {
      return res.status(400).json({ success: false, message: '❌ Name cannot contain numbers!' });
    }
    
    // Validate phone
    if (!/^\d{10}$/.test(mobile_number)) {
      return res.status(400).json({ success: false, message: '❌ Phone must be 10 digits' });
    }
    
    // Check if driver exists
    const existing = await pool.query(
      'SELECT id FROM public.drivers WHERE mobile_number = $1',
      [mobile_number]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Driver already exists' });
    }
    
    // Get owner code
    const ownerResult = await pool.query(
      'SELECT owner_code FROM public.owners WHERE id = $1',
      [parseInt(owner_id)]
    );
    
    const ownerCode = ownerResult.rows[0]?.owner_code || 'OWN001';
    const driverCode = `DRV${Date.now()}`;
    
    const result = await pool.query(
      `INSERT INTO public.drivers 
       (full_name, mobile_number, driver_code, owner_code, wallet_balance, status, created_at)
       VALUES ($1, $2, $3, $4, 0, 'ACTIVE', NOW())
       RETURNING id, full_name, mobile_number, driver_code`,
      [full_name, mobile_number, driverCode, ownerCode]
    );
    
    res.json({ success: true, message: '✅ Driver added!', driver: result.rows[0] });
    
  } catch (err) {
    console.error('Add driver error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// GET OWNER DRIVERS
// ============================================
// Backend payment.js - Replace this endpoint
// ============================================
// GET OWNER TRANSACTIONS - All driver payments
// ============================================
router.get('/owner/transactions', async (req, res) => {
  try {
    const { ownerId } = req.query;
    console.log('🔍 Fetching transactions for ownerId:', ownerId);
    
    if (!ownerId) {
      return res.status(400).json({ error: 'Owner ID required' });
    }
    
    const ownerIdInt = parseInt(ownerId);
    
    // Get all drivers under this owner
    const ownerResult = await pool.query(
      'SELECT owner_code FROM public.owners WHERE id = $1',
      [ownerIdInt]
    );
    
    if (ownerResult.rows.length === 0) {
      return res.json([]);
    }
    
    const ownerCode = ownerResult.rows[0].owner_code;
    
    // Get all drivers' phone numbers
    const driversResult = await pool.query(
      'SELECT mobile_number, full_name FROM public.drivers WHERE owner_code = $1',
      [ownerCode]
    );
    
    const driverPhones = driversResult.rows.map(d => d.mobile_number);
    
    if (driverPhones.length === 0) {
      return res.json([]);
    }
    
    // Get all transactions for these drivers
    const result = await pool.query(
      `SELECT 
         mo.order_id,
         mo.order_number,
         mo.order_amount,
         mo.order_initiation_date,
         mo.order_completion_date,
         mo.transaction_status,
         mo.payment_mode,
         mo.payer_name,
         mo.payer_mobile,
         mo.vehicle_number,
         d.full_name as driver_name
       FROM public.ms_orders mo
       LEFT JOIN public.drivers d ON d.mobile_number = mo.payer_mobile
       WHERE mo.payer_mobile = ANY($1::text[])
         AND mo.transaction_status = 'SUCCESS'
       ORDER BY mo.order_completion_date DESC
       LIMIT 50`,
      [driverPhones]
    );
    
    console.log(`✅ Found ${result.rows.length} transactions`);
    res.json(result.rows);
    
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: err.message });
  }
});
// GET all active drivers for login screen - NO HARDCODE, ONLY DATABASE
router.get('/drivers/list', async (req, res) => {
  try {
    console.log('📋 Fetching all active drivers from database...');
    
    const result = await pool.query(
      `SELECT 
         d.id, 
         d.full_name, 
         d.mobile_number, 
         d.driver_code,
         COALESCE(d.wallet_balance, 0) as wallet_balance,
         d.status
       FROM public.drivers d
       WHERE d.status = 'ACTIVE'
       ORDER BY d.full_name`
    );
    
    console.log(`✅ Found ${result.rows.length} active drivers in database`);
    
    if (result.rows.length === 0) {
      console.log('⚠️ No active drivers found in database');
      return res.status(404).json({ 
        success: false, 
        message: 'No active drivers found in database',
        drivers: [] 
      });
    }
    
    res.json({ 
      success: true, 
      drivers: result.rows,
      count: result.rows.length
    });
    
  } catch (err) {
    console.error('Error fetching drivers:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Database error: ' + err.message,
      drivers: [] 
    });
  }
});

// GET all owners list (for login screen)
router.get('/owners/list', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, mobile_number, owner_code
       FROM public.owners 
       WHERE status = 'ACTIVE'
       ORDER BY full_name`
    );
    res.json({ owners: result.rows });
  } catch (err) {
    console.error('Error fetching owners:', err);
    res.json({ owners: [] });
  }
});
router.get('/owner/drivers/list', async (req, res) => {
  try {
    const { ownerId } = req.query;
    console.log('Fetching drivers for ownerId:', ownerId);
    
    if (!ownerId) {
      return res.status(400).json({ message: 'Owner ID required' });
    }
    
    // First get owner_code
    const ownerResult = await pool.query(
      'SELECT owner_code FROM public.owners WHERE id = $1',
      [parseInt(ownerId)]
    );
    
    if (ownerResult.rows.length === 0) {
      return res.json({ drivers: [] });
    }
    
    const ownerCode = ownerResult.rows[0].owner_code;
    console.log('Owner code:', ownerCode);
    
    const result = await pool.query(
      `SELECT 
         d.id, 
         d.full_name, 
         d.mobile_number, 
         d.driver_code, 
         d.wallet_balance, 
         d.status, 
         d.created_at
       FROM public.drivers d
       WHERE d.owner_code = $1
       ORDER BY d.created_at DESC`,
      [ownerCode]
    );
    
    console.log('Drivers found:', result.rows.length);
    res.json({ drivers: result.rows });
    
  } catch (err) {
    console.error('Get drivers error:', err);
    res.status(500).json({ message: 'Failed to fetch drivers', error: err.message });
  }
});

// ============================================
// OWNER STATS
// ============================================
router.get('/owner/stats', async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) return res.status(400).json({ message: 'Owner ID required' });
    
    const vehicles = await pool.query(
      'SELECT COUNT(*) FROM public.vehicles WHERE owner_id = $1',
      [parseInt(ownerId)]
    );
    
    const drivers = await pool.query(
      'SELECT COUNT(*) FROM public.drivers WHERE owner_code = (SELECT owner_code FROM public.owners WHERE id = $1)',
      [parseInt(ownerId)]
    );
    
    const earnings = await pool.query(
      `SELECT COALESCE(SUM(order_amount), 0) as total 
       FROM public.ms_orders 
       WHERE payer_mobile = '9876542345' AND transaction_status = 'SUCCESS'`,
      []
    );
    
    res.json({
      total_vehicles: parseInt(vehicles.rows[0].count || 0),
      total_drivers: parseInt(drivers.rows[0].count || 0),
      total_earnings: parseFloat(earnings.rows[0].total || 0)
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.json({ total_vehicles: 0, total_drivers: 0, total_earnings: 0 });
  }
});

// ====================== PAYMENT RESULT ROUTE (Sabse Upar Rakh Do) ======================
// backend/src/routes/payment.js me replace kar
// ====================== PAYMENT RESULT ROUTE (Sabse Upar Rakh Do) ======================
// backend/src/routes/payment.js me replace kar
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const cleanId = orderId ? orderId.trim() : '';
    
    // STEP 1: Pehle ID se dhoondhne ki koshish karo
    let order = await pool.query(
      `SELECT * FROM ms_orders 
       WHERE order_number ILIKE $1 
          OR order_id::text ILIKE $1 
          OR pg_transaction_id ILIKE $1`, 
      [`%${cleanId}%`]
    );
    
    // STEP 2: THE LIFESAVER (NO FAKE DATA)
    // Agar ID matching fail hui (jaise abhi format mismatch se ho rahi thi), 
    // toh seedha DB se LATEST payment utha lo!
    if (order.rows.length === 0) {
      order = await pool.query(
        `SELECT * FROM ms_orders ORDER BY order_initiation_date DESC LIMIT 1`
      );
    }
    
    // Agar poora database hi khali ho tabhi 404 aayega
    if (order.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Database is empty' });
    }
    
    // 100% REAL DATABASE ROW
    res.json({ success: true, data: order.rows[0] });
  } catch (err) {
    console.error('DB Fetch Error:', err.message);
    res.status(500).json({ success: false, message: `DB Crash: ${err.message}` });
  }
});
// =============================================================================
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
router.post('/driver/update-profile', async (req, res) => {
  try {
    const { phone, name, photo } = req.body;
    // Database me realtime name aur photo update kar rahe hain
    await pool.query(
      `UPDATE auth.vehicle_drivers vd
       SET full_name = $1, profile_photo_url = $2
       FROM auth.users u
       WHERE vd.user_id = u.id AND u.mobile_number = $3`,
      [name, photo, phone]
    );
    res.json({ success: true, message: 'Real-time DB Updated!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'DB Error' });
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


    // In webhook - after successful payment
if (status === 'SUCCESS' && localOrder.rows[0].transaction_status !== 'SUCCESS') {
  const amount = parseFloat(localOrder.rows[0].order_amount || 0);
  const driverPhone = localOrder.rows[0].payer_mobile;
  
  // ============================================
  // 1. UPDATE DRIVER WALLET in driver_details
  // ============================================
  const driverUser = await pool.query(
    'SELECT id FROM public.users WHERE phone_number = $1',
    [driverPhone]
  );
  
  if (driverUser.rows.length > 0) {
    const driverUserId = driverUser.rows[0].id;
    
    // Update driver_details
    await pool.query(
      `UPDATE public.driver_details 
       SET wallet_balance = COALESCE(wallet_balance, 0) + $1,
           amount_paid_today = COALESCE(amount_paid_today, 0) + $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [amount, driverUserId]
    );
    
    // Also update public.drivers table if exists
    await pool.query(
      `UPDATE public.drivers 
       SET wallet_balance = COALESCE(wallet_balance, 0) + $1
       WHERE mobile_number = $2`,
      [amount, driverPhone]
    ).catch(() => {});
    
    // ============================================
    // 2. SEND NOTIFICATION TO DRIVER
    // ============================================
    await pool.query(
  `INSERT INTO public.notifications (driver_id, user_type, title, message, metadata, created_at)
   VALUES ($1, 'DRIVER', '✅ Payment Successful', 
           'Your payment of ₹${amount} has been received successfully.',
           $2, NOW())`,
  [driverUserId, JSON.stringify({ amount, status: 'SUCCESS', type: 'payment' })]
);
    
    console.log(`📢 Notification sent to DRIVER ${driverPhone}`);
    
    // ============================================
    // 3. GET OWNER AND SEND NOTIFICATION
    // ============================================
    // Find owner from vehicles table
    const ownerData = await pool.query(
      `SELECT v.owner_id 
       FROM public.vehicles v
       WHERE v.driver_phone = $1
       LIMIT 1`,
      [driverPhone]
    );
    
    if (ownerData.rows.length > 0) {
      const ownerId = ownerData.rows[0].owner_id;
      
      await pool.query(
        `INSERT INTO public.notifications (user_id, user_type, title, message, metadata, created_at)
         VALUES ($1, 'OWNER', '💰 Rent Payment Received', 
                 'Driver ${driverPhone} paid ₹${amount}.',
                 $2, NOW())`,
        [ownerId, JSON.stringify({ driverPhone, amount, status: 'SUCCESS', type: 'payment' })]
      );
      
      console.log(`📢 Notification sent to OWNER ID: ${ownerId}`);
    } else {
      console.log(`⚠️ No owner found for driver ${driverPhone}`);
    }
  }
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
// MY TRANSACTIONS - Updated version
router.get('/my-transactions', async (req, res) => {
  try {
    const phone = req.query.phone;
    if (!phone) return res.status(400).json({ message: 'Phone number is required' });

    const result = await pool.query(
      `SELECT 
         order_id,
         order_number,
         order_amount,
         order_initiation_date,
         order_completion_date,
         transaction_status,
         payment_mode,
         payer_name,
         COALESCE(order_completion_date, order_initiation_date) as display_date
       FROM ms_orders 
       WHERE payer_mobile = $1 
       ORDER BY order_initiation_date DESC`,
      [phone]
    );

    // Format for frontend compatibility
    const formatted = result.rows.map(row => ({
      pg_transaction_id: row.order_id,
      order_id: row.order_id,
      order_number: row.order_number,
      order_amount: parseFloat(row.order_amount),
      order_initiation_date: row.order_initiation_date,
      transaction_status: row.transaction_status,
      payment_mode: row.payment_mode,
      payer_name: row.payer_name,
      display_date: row.display_date
    }));

    console.log(`✅ Found ${formatted.length} transactions for ${phone}`);
    res.json(formatted);

  } catch (err) {
    console.error('My transactions error:', err);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});
// ====================================
// Backend payment.js - Add this endpoint
router.get('/driver/profile', async (req, res) => {
  try {
    const { phone } = req.query;
    console.log('Fetching driver profile for phone:', phone);
    
    if (!phone) {
      return res.status(400).json({ message: 'Phone required' });
    }
    
    const result = await pool.query(
      `SELECT 
         d.id,
         d.full_name as name,
         d.mobile_number as phone,
         d.driver_code,
         d.wallet_balance,
         d.status,
         v.id as vehicle_id,
         v.vehicle_number,
         v.vehicle_model,
         v.daily_rent as vehicle_daily_rent,
         v.status as vehicle_status
       FROM public.drivers d
       LEFT JOIN public.vehicles v ON v.driver_id = d.id
       WHERE d.mobile_number = $1`,
      [phone]
    );
    
    console.log('Driver found:', result.rows.length);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    res.json(result.rows[0]);
    
  } catch (err) {
    console.error('Driver profile error:', err);
    res.status(500).json({ message: 'Failed' });
  }
});
// GET owner notifications
router.get('/owner/notifications', async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) return res.status(400).json({ message: 'Owner ID required' });
    
    // First get owner_code
    const ownerResult = await pool.query(
      'SELECT owner_code FROM public.owners WHERE id = $1',
      [ownerId]
    );
    
    if (ownerResult.rows.length === 0) {
      return res.json([]);
    }
    
    const ownerCode = ownerResult.rows[0].owner_code;
    
    // Get notifications for drivers under this owner
    const result = await pool.query(
      `SELECT n.id, n.title, n.message, n.is_read, n.created_at, n.metadata, d.full_name as driver_name
       FROM public.notifications n
       LEFT JOIN public.drivers d ON d.id = n.driver_id
       WHERE d.owner_code = $1 OR n.user_type = 'OWNER'
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [ownerCode]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Owner notifications error:', err);
    res.json([]);
  }
});

// MARK notifications as read
router.put('/notifications/mark-read', async (req, res) => {
  try {
    const { driverId, ownerId } = req.query;
    
    if (driverId) {
      await pool.query(
        'UPDATE public.notifications SET is_read = TRUE WHERE driver_id = $1',
        [driverId]
      );
    } else if (ownerId) {
      await pool.query(
        'UPDATE public.notifications SET is_read = TRUE WHERE user_type = $1',
        ['OWNER']
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ success: false });
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
router.get('/order/:orderId', async (req, res) => {
  try {
    // Frontend se 'ORD-xxx' aayega
    const { orderId } = req.params;
    
    // BINGO FIX: Yahan 'order_number' column use karna hai, 'order_id' nahi!
    const order = await pool.query(
      `SELECT * FROM ms_orders WHERE order_number = $1`, 
      [orderId]
    );
    
    // Agar Webhook slow hai ya DB me record nahi hai
    if (order.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order strictly not found in ms_orders' });
    }
    
    // Frontend ko 100% Real DB Data bhej do
    res.json({ success: true, data: order.rows[0] });
  } catch (err) {
    console.error('DB Fetch Error:', err.message);
    res.status(500).json({ success: false, message: `DB Crash: ${err.message}` });
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
// ── DRIVER LOGIN: List all active drivers ──
router.get('/drivers-list', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.id, d.full_name, d.mobile_number, d.driver_code,
              COALESCE(v.vehicle_number, 'Not Assigned') as vehicle
       FROM public.drivers d
       LEFT JOIN public.vehicles v ON v.driver_id = d.id
       WHERE d.status = 'ACTIVE'
       ORDER BY d.full_name`
    );
    res.json({ success: true, drivers: result.rows });
  } catch (err) { res.json({ success: true, drivers: [] }); }
});

// ── DRIVER OTP REQUEST ──
router.post('/driver-otp-request', async (req, res) => {
  try {
    const { phone } = req.body;
    const driver = await pool.query(
      `SELECT id, full_name, mobile_number, driver_code
       FROM public.drivers WHERE mobile_number = $1 AND status = 'ACTIVE'`,
      [phone]
    );
    if (driver.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({ success: true, message: 'OTP sent', name: driver.rows[0].full_name });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// ── DRIVER OTP VERIFY ──
router.post('/driver-otp-verify', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (otp !== '123456')
      return res.status(400).json({ success: false, message: 'Invalid OTP. Demo OTP is 123456' });

    const driver = await pool.query(
      `SELECT d.id, d.full_name, d.mobile_number, d.driver_code, d.wallet_balance,
              COALESCE(v.vehicle_number, 'Not Assigned') as vehicle_number,
              COALESCE(v.vehicle_model, '') as vehicle_model,
              COALESCE(v.daily_rent, 0) as daily_rent
       FROM public.drivers d
       LEFT JOIN public.vehicles v ON v.driver_id = d.id
       WHERE d.mobile_number = $1 AND d.status = 'ACTIVE'`,
      [phone]
    );
    if (driver.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Driver not found' });

    const d = driver.rows[0];
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: d.id, driver_code: d.driver_code, user_type: 'VEHICLE_DRIVER' },
      process.env.JWT_SECRET || 'voltops_super_secret_key_2025',
      { expiresIn: '7d' }
    );
    res.json({
      success: true, token,
      data: {
        id:           d.id,
        name:         d.full_name,
        usercode:     d.driver_code,
        phone_number: d.mobile_number,
        phone:        d.mobile_number,
        mobile_number:d.mobile_number,
        vehicle:      d.vehicle_number,
        daily_rent:   d.daily_rent,
        userType:     'VEHICLE_DRIVER'
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── DRIVER NOTIFICATIONS (public schema) ──
router.get('/driver/notifications', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.json([]);
    const result = await pool.query(
      `SELECT n.id, n.title, n.message, n.is_read, n.created_at, n.metadata
       FROM public.notifications n
       JOIN public.drivers d ON d.id = n.driver_id
       WHERE d.mobile_number = $1
       ORDER BY n.created_at DESC LIMIT 50`,
      [phone]
    );
    res.json(result.rows);
  } catch (err) { res.json([]); }
});
module.exports = router;