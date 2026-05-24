import pool from '../config/db.js';

// Get platform stats
export const getStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM auth.users WHERE user_type = 'VEHICLE_OWNER_USER') as total_owners,
        (SELECT COUNT(*) FROM auth.users WHERE user_type = 'VEHICLE_DRIVER') as total_drivers,
        (SELECT COUNT(*) FROM auth.vehicles) as total_vehicles,
        (SELECT COUNT(*) FROM auth.payments WHERE status = 'COMPLETED') as total_transactions,
        (SELECT COALESCE(SUM(amount), 0) FROM auth.payments WHERE status = 'COMPLETED') as total_volume
    `);
    
    res.json({ success: true, data: stats.rows[0] });
    
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all tenants (client companies)
export const getTenants = async (req, res) => {
  try {
    const tenants = await pool.query(`
      SELECT cc.*, COUNT(v.id) as vehicle_count
      FROM auth.client_companies cc
      LEFT JOIN auth.vehicles v ON v.client_company_id = cc.id
      GROUP BY cc.id
      ORDER BY cc.created_at DESC
    `);
    
    res.json({ success: true, data: tenants.rows });
    
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};