-- ================================================================
-- Recovery Nest LLP — Data Update SQL
-- Run in Neon console
-- ================================================================

-- 0. Add email column to owners (if it doesn't exist)
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS email TEXT;

-- 1. Update owner full name + email
UPDATE public.owners
SET full_name   = 'Mukesh Kumar Paul',
    email       = 'business@recoverynest.in',
    updated_at  = NOW()
WHERE mobile_number = '9899715718';

-- 2. Update company address + city
UPDATE public.companies
SET city       = 'Delhi',
    address    = '207, G/F, New Lahore Colony, Shastri Nagar - 110031',
    updated_at = NOW()
WHERE company_code = 'RECN1';

-- 3. Update vehicle models
UPDATE public.vehicles SET vehicle_model = 'Jaunty'     WHERE vehicle_number IN ('EV0001','EV0002','EV0003','EV0004','EV0005','EV0006','EV0007','EV0008','EV0009','EV0010','EV0011','EV0012','EV0013','EV0014','EV0015','EV0016','EV0017','EV0018','EV0019','EV0020','EV0021','EV0022','EV0023','EV0024','EV0025');
UPDATE public.vehicles SET vehicle_model = 'Dangus Pro' WHERE vehicle_number IN ('EV0026','EV0027','EV0028','EV0029','EV0030','EV0031','EV0032','EV0033','EV0034','EV0035','EV0036','EV0037','EV0038','EV0039','EV0040','EV0041','EV0042','EV0043','EV0044','EV0045','EV0046','EV0047','EV0048','EV0049','EV0050');
UPDATE public.vehicles SET vehicle_model = 'Swift Volt' WHERE vehicle_number IN ('EV0051','EV0052','EV0053','EV0054','EV0055','EV0056','EV0057','EV0058','EV0059','EV0060','EV0061','EV0062','EV0063','EV0064','EV0065','EV0066','EV0067','EV0068','EV0069','EV0070','EV0071','EV0072','EV0073','EV0074');

-- 4. Verify
SELECT o.full_name, o.email, o.mobile_number, c.name AS company, c.city, c.address
FROM public.owners o JOIN public.companies c ON c.id = o.company_id
WHERE o.m