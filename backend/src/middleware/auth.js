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

const generateToken = (user) => {
    return jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'voltops_super_secret_key_2025', { expiresIn: '30d' });
};

module.exports = { verifyToken, generateToken };