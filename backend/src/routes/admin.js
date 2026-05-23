const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// List All Tenants
router.get('/tenants', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM auth.client_companies');
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Onboard New Tenant
router.post('/register-company', async (req, res) => {
    const { companyName, legalName, gstNumber } = req.body;
    try {
        const query = `
            INSERT INTO auth.client_companies (company_code, company_name, legal_name, gst_number) 
            VALUES ($1, $2, $3, $4) RETURNING id`;
        const code = companyName.slice(0,4).toUpperCase() + Math.floor(Math.random()*100);
        await pool.query(query, [code, companyName, legalName, gstNumber]);
        res.status(201).json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;