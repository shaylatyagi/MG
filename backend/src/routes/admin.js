const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// 1. List All Tenants (Day 1 Target)
router.get('/tenants', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, company_name, company_code, company_status FROM auth.client_companies');
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Onboard New Tenant (Day 3 Target)
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

// 3. Platform Metrics Filter (Day 2 Target - NEW API)
router.get('/metrics', async (req, res) => {
    const { companyId, filter } = req.query; // Frontend se aayega e.g., ?companyId=123&filter=today
    
    try {
        // Default Condition: This Week
        let timeCondition = "order_initiation_date >= CURRENT_DATE - INTERVAL '7 days'";

        // Dynamic Filtering based on UI click
        if (filter === 'today') {
            timeCondition = "DATE(order_initiation_date) = CURRENT_DATE";
        } else if (filter === 'yesterday') {
            timeCondition = "DATE(order_initiation_date) = CURRENT_DATE - INTERVAL '1 day'";
        }

        const query = `
            SELECT 
                COUNT(id) AS total_orders,
                COALESCE(SUM(order_amount), 0) AS gross_revenue
            FROM ms_orders
            WHERE client_company_id = $1 AND ${timeCondition}
        `;

        const { rows } = await pool.query(query, [companyId]);
        
        // Frontend ko direct Object bhej rahe hain taaki react easily read kar sake
        res.json(rows[0]); 
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});

module.exports = router;