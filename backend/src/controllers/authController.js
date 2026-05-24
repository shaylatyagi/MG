import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';

// Generate unique usercode
const generateUsercode = async (userType, mobileNumber) => {
  const prefix = {
    'PLATFORM_ADMIN': 'ADM',
    'VEHICLE_OWNER_USER': 'OWN',
    'VEHICLE_DRIVER': 'DRV'
  }[userType] || 'USR';
  
  const suffix = mobileNumber.slice(-4);
  let usercode, exists;
  
  do {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    usercode = `${prefix}_${random}_${suffix}`;
    const result = await pool.query('SELECT 1 FROM auth.users WHERE user_code = $1', [usercode]);
    exists = result.rows.length > 0;
  } while (exists);
  
  return usercode;
};

// Register new user
export const register = async (req, res) => {
  const { mobileNumber, email, password, fullName, userType, referralCode } = req.body;
  
  try {
    // Check if user exists
    const existing = await pool.query(
      'SELECT id FROM auth.users WHERE mobile_number = $1',
      [mobileNumber]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Mobile number already registered' });
    }
    
    // Generate usercode
    const usercode = await generateUsercode(userType, mobileNumber);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await pool.query(`
      INSERT INTO auth.users (
        id, user_code, mobile_number, email, password_hash, 
        user_type, profile_photo_url, referral_code, is_mobile_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, user_code, referral_code
    `, [uuidv4(), usercode, mobileNumber, email, hashedPassword, userType, 
        `https://ui-avatars.com/api/?background=2563eb&color=fff&name=${encodeURIComponent(fullName)}`,
        usercode, true]);
    
    const newUser = result.rows[0];
    
    // Handle referral
    if (referralCode && referralCode !== newUser.user_code) {
      const referrer = await pool.query(
        'SELECT user_code FROM auth.users WHERE referral_code = $1',
        [referralCode]
      );
      
      if (referrer.rows.length > 0) {
        await pool.query(`
          INSERT INTO auth.referrals (referrer_user_code, referred_user_code, referral_code_used, reward_amount)
          VALUES ($1, $2, $3, $4)
        `, [referrer.rows[0].user_code, newUser.user_code, referralCode, 100]);
        
        await pool.query(`
          UPDATE auth.users SET total_referrals = total_referrals + 1, referral_earnings = referral_earnings + 100
          WHERE user_code = $1
        `, [referrer.rows[0].user_code]);
      }
    }
    
    // Generate token
    const token = jwt.sign(
      { id: newUser.id, user_code: newUser.user_code, user_type: userType },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      success: true,
      message: referralCode ? 'Registered with referral bonus!' : 'Registration successful',
      token,
      data: {
        usercode: newUser.user_code,
        mobileNumber,
        email,
        userType,
        referralCode: newUser.referral_code
      }
    });
    
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Login user
export const login = async (req, res) => {
  const { identifier, password } = req.body;
  
  try {
    // Find by usercode OR mobile number
    const result = await pool.query(`
      SELECT u.*, 
             COALESCE(
               (SELECT json_agg(DISTINCT ur.role_type) 
                FROM auth.user_roles ur 
                WHERE ur.usercode = u.user_code),
               json_build_array(u.user_type)
             ) as available_roles
      FROM auth.users u
      WHERE u.user_code = $1 OR u.mobile_number = $1
    `, [identifier]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Update last login
    await pool.query('UPDATE auth.users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    
    // Determine if role selection is needed
    const availableRoles = user.available_roles || [user.user_type];
    const needsRoleSelection = availableRoles.length > 1 && !identifier.includes('_');
    
    if (needsRoleSelection) {
      const tempToken = jwt.sign(
        { id: user.id, user_code: user.user_code, temp: true },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      
      return res.json({
        success: true,
        requireRoleSelection: true,
        token: tempToken,
        data: {
          usercode: user.user_code,
          mobileNumber: user.mobile_number,
          availableRoles: availableRoles
        }
      });
    }
    
    // Single role - direct login
    const token = jwt.sign(
      { id: user.id, user_code: user.user_code, user_type: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      data: {
        id: user.id,
        usercode: user.user_code,
        mobileNumber: user.mobile_number,
        email: user.email,
        userType: user.user_type,
        referralCode: user.referral_code,
        totalReferrals: user.total_referrals || 0,
        referralEarnings: user.referral_earnings || 0
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Select role after login (for multi-role users)
export const selectRole = async (req, res) => {
  const { usercode, selectedRole } = req.body;
  const tempToken = req.headers.authorization?.split(' ')[1];
  
  try {
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (!decoded.temp) {
      return res.status(401).json({ success: false, message: 'Invalid session' });
    }
    
    const token = jwt.sign(
      { user_code: usercode, user_type: selectedRole },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ success: true, token, role: selectedRole });
    
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid session' });
  }
};