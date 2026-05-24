import pool from '../config/db.js';

// Get driver dashboard
export const getDashboard = async (req, res) => {
  const { user_code } = req.user;
  
  try {
    // Get assigned vehicle
    const vehicle = await pool.query(`
      SELECT v.*, o.company_name as owner_name
      FROM auth.vehicles v
      JOIN auth.client_companies o ON o.id = v.client_company_id
      WHERE v.assigned_driver_usercode = $1
    `, [user_code]);
    
    // Get payment summary
    const payments = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) as pending_dues,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END), 0) as paid_amount
      FROM auth.payments
      WHERE driver_usercode = $1 AND payment_type = 'RENT'
    `, [user_code]);
    
    // Get wallet balance
    const wallet = await pool.query(`
      SELECT balance FROM auth.wallets WHERE usercode = $1
    `, [user_code]);
    
    res.json({
      success: true,
      data: {
        vehicle: vehicle.rows[0],
        dues: payments.rows[0],
        walletBalance: wallet.rows[0]?.balance || 0
      }
    });
    
  } catch (error) {
    console.error('Driver dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get wallet balance and transactions
export const getWallet = async (req, res) => {
  const { user_code } = req.user;
  
  try {
    const wallet = await pool.query(`
      SELECT balance, total_credited, total_debited
      FROM auth.wallets
      WHERE usercode = $1
    `, [user_code]);
    
    const transactions = await pool.query(`
      SELECT * FROM auth.wallet_transactions
      WHERE usercode = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [user_code]);
    
    res.json({
      success: true,
      data: {
        balance: wallet.rows[0]?.balance || 0,
        transactions: transactions.rows
      }
    });
    
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Make payment
export const makePayment = async (req, res) => {
  const { user_code } = req.user;
  const { amount, paymentMethod } = req.body;
  
  try {
    // Create payment record
    const payment = await pool.query(`
      INSERT INTO auth.payments (id, driver_usercode, amount, payment_method, status, payment_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [uuidv4(), user_code, amount, paymentMethod, 'COMPLETED', 'RENT']);
    
    res.json({ success: true, data: payment.rows[0] });
    
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};