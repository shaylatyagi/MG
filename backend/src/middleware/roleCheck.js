const checkRole = (role) => (req, res, next) => {
    if (req.user.type !== role) return res.status(403).send("Unauthorized");
    next();
};

// Routes mein use karo
router.get('/company-list', verifyToken, checkRole('PLATFORM_ADMIN'), getCompanies);