const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { generateToken, verifyToken } = require('../middleware/auth');
const twilio = require('twilio');

const sendOTP = async (phone, otp) => {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: `Your MobilityGrid OTP is ${otp}. Valid 10 mins. Do not share. -MobilityGrid`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${phone}`
    });
    console.log(`OTP ${otp} → ${phone} ✅`);
    return true;
  } catch (err) {
    console.error('Twilio error:', err.message);
    return false;
  }
};
// 1. SEND OTP
router.post('/send-otp', async (req, res) => {
  const { phone_number } = req.body;
  if (!phone_number) return res.status(400).json({ success: false, message: 'Phone required' });

  try {
    // Check karo user exist karta hai
    const userRes = await pool.query(
      `SELECT id, full_name FROM public.drivers WHERE mobile_number = $1
       UNION
       SELECT id, full_name FROM public.owners WHERE mobile_number = $1
       LIMIT 1`,
      [phone_number]
    );
    if (!userRes.rows[0])
      return res.status(404).json({ success: false, message: 'Phone registered nahi hai' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Purana OTP delete, naya save karo
    await pool.query(`DELETE FROM otps WHERE phone_number = $1`, [phone_number]);
    await pool.query(
      `INSERT INTO otps (phone_number, otp, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [phone_number, otp]
    );

    console.log(`OTP for ${phone_number}: ${otp}`);

    res.json({ success: true, message: 'OTP generated', otp }); // ✅ OTP return
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// 2. VERIFY OTP — fixed
router.post('/verify-otp', async (req, res) => {
  const { phone_number, otp } = req.body;
  if (!phone_number || !otp)
    return res.status(400).json({ success: false, message: 'Phone aur OTP required' });

  try {
    // ✅ OTP table se verify karo
    const otpRes = await pool.query(
      `SELECT * FROM otps 
       WHERE phone_number = $1 AND otp = $2 AND expires_at > NOW()
       LIMIT 1`,
      [phone_number, otp]
    );
    if (!otpRes.rows[0])
      return res.status(400).json({ success: false, message: 'OTP galat hai ya expire ho gaya' });

    // OTP delete karo
    await pool.query(`DELETE FROM otps WHERE phone_number = $1`, [phone_number]);

    // Driver ya Owner dhundo
    const driverRes = await pool.query(
      `SELECT *, 'DRIVER' as role FROM public.drivers WHERE mobile_number = $1 LIMIT 1`,
      [phone_number]
    );
    const ownerRes = await pool.query(
      `SELECT *, 'OWNER' as role FROM public.owners WHERE mobile_number = $1 LIMIT 1`,
      [phone_number]
    );

    const user = driverRes.rows[0] || ownerRes.rows[0];
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    const token = generateToken({ 
      id: user.id, 
      phone_number: user.mobile_number, 
      role: user.role 
    });

    res.json({
      success: true,
      message: 'OTP verified',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        mobile_number: user.mobile_number,
        role: user.role,
        owner_code: user.owner_code || null,
        driver_code: user.driver_code || null,
        status: user.status
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.put('/owner/vehicles/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query(
      `UPDATE public.vehicles SET operational_status = $1 WHERE id = $2`,
      [status, req.params.id]
    );
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});
// 3. Update Profile (Protected Route)
router.put('/update-profile', verifyToken, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Name required' });
  try {
    const result = await pool.query(
      'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [name, req.user.id] // req.user.id middleware se aa raha hai
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update' });
  }
});

// 4. Register
router.post('/register', async (req, res) => {
  const { phone_number, name, role } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (phone_number, name, role) VALUES ($1, $2, $3) RETURNING *',
      [phone_number, name, role]
    );
    const token = generateToken(result.rows[0]);
    res.status(201).json({ token, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed' });
  }
});

module.exports = router;