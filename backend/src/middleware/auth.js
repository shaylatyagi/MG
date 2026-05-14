const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'voltops_super_secret_key_2025';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, phone_number: user.phone_number },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = { generateToken, verifyToken };