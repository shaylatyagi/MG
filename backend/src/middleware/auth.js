const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'voltops_super_secret_key_2025');
        req.user = decoded; 
        next(); // Yahan next() call karna zaroori hai
    } catch (err) {
        return res.status(403).json({ message: 'Invalid token' });
    }
};

const generateToken = (payload) => {
    // Sign full payload — includes id, role, owner_id, phone_number, permissions
    return jwt.sign(payload, process.env.JWT_SECRET || 'voltops_super_secret_key_2025', { expiresIn: '30d' });
};

// requirePermission(perm) — use after verifyToken on owner/manager shared routes
// OWNER: always allowed. MANAGER: must have perm === true in JWT permissions.
const requirePermission = (perm) => (req, res, next) => {
  const { role, permissions } = req.user || {};
  if (role === 'OWNER' || role === 'admin') return next();
  if (role === 'MANAGER') {
    const perms = typeof permissions === 'string' ? JSON.parse(permissions) : (permissions || {});
    if (perms[perm]) return next();
    return res.status(403).json({ success: false, message: `Permission denied: ${perm}` });
  }
  return res.status(403).json({ success: false, message: 'Access denied' });
};

module.exports = { verifyToken, generateToken, requirePermission };