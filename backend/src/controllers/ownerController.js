import pool from '../config/db.js';

// Get owner dashboard data
export const getDashboard = async (req, res) => {
  const { user_code } = req.user;
  
  try {
    // Get company details
    const company = await pool.query(`
      SELECT cc.*, COUNT(v.id) as vehicle_count
      FROM auth.client_companies cc
      LEFT JOIN auth.vehicles v ON v.client_company_id = cc.id
      WHERE cc.owner_usercode = $1
      GROUP BY cc.id
    `, [user_code]);
    
    // Get fleet stats
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_vehicles,
        COUNT(CASE WHEN status = 'INACTIVE' THEN 1 END) as inactive_vehicles
      FROM auth.vehicles
      WHERE client_company_id = $1
    `, [company.rows[0]?.id]);
    
    res.json({
      success: true,
      data: {
        company: company.rows[0],
        stats: stats.rows[0]
      }
    });
    
  } catch (error) {
    console.error('Owner dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all vehicles
export const getVehicles = async (req, res) => {
  const { user_code } = req.user;
  
  try {
    const vehicles = await pool.query(`
      SELECT v.*, d.full_name as driver_name
      FROM auth.vehicles v
      LEFT JOIN auth.vehicle_drivers d ON d.id = v.assigned_driver_id
      WHERE v.owner_usercode = $1
      ORDER BY v.created_at DESC
    `, [user_code]);
    
    res.json({ success: true, data: vehicles.rows });
    
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Add new vehicle
export const addVehicle = async (req, res) => {
  const { user_code } = req.user;
  const { registrationNumber, model, dailyRate, vehicleType } = req.body;
  
  try {
    const result = await pool.query(`
      INSERT INTO auth.vehicles (id, registration_number, model, daily_rate, vehicle_type, owner_usercode, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [uuidv4(), registrationNumber, model, dailyRate, vehicleType, user_code, 'AVAILABLE']);
    
    res.status(201).json({ success: true, data: result.rows[0] });
    
  } catch (error) {
    console.error('Add vehicle error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all drivers
export const getDrivers = async (req, res) => {
  const { user_code } = req.user;
  
  try {
    const drivers = await pool.query(`
      SELECT d.*, u.mobile_number, u.email
      FROM auth.vehicle_drivers d
      JOIN auth.users u ON u.id = d.user_id
      WHERE d.owner_usercode = $1
      ORDER BY d.created_at DESC
    `, [user_code]);
    
    res.json({ success: true, data: drivers.rows });
    
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Add new driver
export const addDriver = async (req, res) => {
  const { user_code } = req.user;
  const { fullName, mobileNumber, licenseNumber, aadhaarNumber } = req.body;
  
  try {
    // First create user
    const hashedPassword = await bcrypt.hash(mobileNumber.slice(-6), 10);
    const usercode = await generateUsercode('VEHICLE_DRIVER', mobileNumber);
    
    const userResult = await pool.query(`
      INSERT INTO auth.users (id, user_code, mobile_number, password_hash, user_type, profile_photo_url, is_mobile_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [uuidv4(), usercode, mobileNumber, hashedPassword, 'VEHICLE_DRIVER', 
        `https://ui-avatars.com/api/?background=16a34a&color=fff&name=${encodeURIComponent(fullName)}`,
        true]);
    
    // Then create driver profile
    await pool.query(`
      INSERT INTO auth.vehicle_drivers (id, user_id, driver_code, full_name, driving_license_number, aadhaar_last4, owner_usercode, onboarding_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [uuidv4(), userResult.rows[0].id, usercode, fullName, licenseNumber, aadhaarNumber.slice(-4), user_code, 'PENDING']);
    
    res.status(201).json({ success: true, message: 'Driver added successfully', data: { usercode } });
    
  } catch (error) {
    console.error('Add driver error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};