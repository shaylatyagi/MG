-- Skyewheels Onboarding — Add 4 drivers + vehicles under Ashish Yadav (owner_id=6)
-- Paste this in Neon SQL Editor and click Run

DO $$
DECLARE
  v_gurbaksh_id   INTEGER;
  v_annad_id      INTEGER;
  v_aditya_id     INTEGER;
  v_mohammad_id   INTEGER;
  v_veh_id        INTEGER;
BEGIN

  -- ── Driver 1: Gurbaksh ──────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.drivers WHERE mobile_number = '7042532074') THEN
    INSERT INTO public.drivers (full_name, mobile_number, owner_code, driver_code, wallet_balance, status, created_at)
    VALUES ('Gurbaksh', '7042532074', 'MG-OWN-ASH1891', 'DRVSKYW001', 0, 'ACTIVE', '2026-03-16')
    RETURNING id INTO v_gurbaksh_id;
    RAISE NOTICE 'Added driver Gurbaksh id=%', v_gurbaksh_id;
  ELSE
    SELECT id INTO v_gurbaksh_id FROM public.drivers WHERE mobile_number = '7042532074';
    RAISE NOTICE 'Driver Gurbaksh already exists id=%', v_gurbaksh_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE vehicle_number = 'SKYW-0040') THEN
    INSERT INTO public.vehicles (vehicle_number, vehicle_model, daily_rent, owner_id, driver_id, driver_name, driver_phone, status, chassis_number, created_at)
    VALUES ('SKYW-0040', 'Electric Scooter', 222, 6, v_gurbaksh_id, 'Gurbaksh', '7042532074', 'ASSIGNED', 'SKYEWHEELS2026001', '2026-03-16')
    RETURNING id INTO v_veh_id;
    UPDATE public.drivers SET assigned_vehicle_id = v_veh_id WHERE id = v_gurbaksh_id;
    RAISE NOTICE 'Vehicle SKYW-0040 added id=%', v_veh_id;
  ELSE
    RAISE NOTICE 'Vehicle SKYW-0040 already exists';
  END IF;

  -- ── Driver 2: Annad Bisht ────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.drivers WHERE mobile_number = '9873133787') THEN
    INSERT INTO public.drivers (full_name, mobile_number, owner_code, driver_code, wallet_balance, status, created_at)
    VALUES ('Annad Bisht', '9873133787', 'MG-OWN-ASH1891', 'DRVSKYW002', 0, 'ACTIVE', '2026-03-16')
    RETURNING id INTO v_annad_id;
    RAISE NOTICE 'Added driver Annad Bisht id=%', v_annad_id;
  ELSE
    SELECT id INTO v_annad_id FROM public.drivers WHERE mobile_number = '9873133787';
    RAISE NOTICE 'Driver Annad Bisht already exists id=%', v_annad_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE vehicle_number = 'SKYW-0036') THEN
    INSERT INTO public.vehicles (vehicle_number, vehicle_model, daily_rent, owner_id, driver_id, driver_name, driver_phone, status, chassis_number, created_at)
    VALUES ('SKYW-0036', 'Electric Scooter', 222, 6, v_annad_id, 'Annad Bisht', '9873133787', 'ASSIGNED', 'SKYEWHEELS2026003', '2026-03-16')
    RETURNING id INTO v_veh_id;
    UPDATE public.drivers SET assigned_vehicle_id = v_veh_id WHERE id = v_annad_id;
    RAISE NOTICE 'Vehicle SKYW-0036 added id=%', v_veh_id;
  ELSE
    RAISE NOTICE 'Vehicle SKYW-0036 already exists';
  END IF;

  -- ── Driver 3: Aditya Tiwari ──────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.drivers WHERE mobile_number = '8054347764') THEN
    INSERT INTO public.drivers (full_name, mobile_number, owner_code, driver_code, wallet_balance, status, created_at)
    VALUES ('Aditya Tiwari', '8054347764', 'MG-OWN-ASH1891', 'DRVSKYW003', 0, 'ACTIVE', '2026-04-04')
    RETURNING id INTO v_aditya_id;
    RAISE NOTICE 'Added driver Aditya Tiwari id=%', v_aditya_id;
  ELSE
    SELECT id INTO v_aditya_id FROM public.drivers WHERE mobile_number = '8054347764';
    RAISE NOTICE 'Driver Aditya Tiwari already exists id=%', v_aditya_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE vehicle_number = 'SKYEV-0061') THEN
    INSERT INTO public.vehicles (vehicle_number, vehicle_model, daily_rent, owner_id, driver_id, driver_name, driver_phone, status, chassis_number, created_at)
    VALUES ('SKYEV-0061', 'Electric Scooter', 222, 6, v_aditya_id, 'Aditya Tiwari', '8054347764', 'ASSIGNED', 'SKYEWHEELS2026009', '2026-04-04')
    RETURNING id INTO v_veh_id;
    UPDATE public.drivers SET assigned_vehicle_id = v_veh_id WHERE id = v_aditya_id;
    RAISE NOTICE 'Vehicle SKYEV-0061 added id=%', v_veh_id;
  ELSE
    RAISE NOTICE 'Vehicle SKYEV-0061 already exists';
  END IF;

  -- ── Driver 4: Mohammad Kadir ─────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.drivers WHERE mobile_number = '9779434195') THEN
    INSERT INTO public.drivers (full_name, mobile_number, owner_code, driver_code, wallet_balance, status, created_at)
    VALUES ('Mohammad Kadir', '9779434195', 'MG-OWN-ASH1891', 'DRVSKYW004', 0, 'ACTIVE', '2026-04-06')
    RETURNING id INTO v_mohammad_id;
    RAISE NOTICE 'Added driver Mohammad Kadir id=%', v_mohammad_id;
  ELSE
    SELECT id INTO v_mohammad_id FROM public.drivers WHERE mobile_number = '9779434195';
    RAISE NOTICE 'Driver Mohammad Kadir already exists id=%', v_mohammad_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE vehicle_number = 'SKYEV-0062') THEN
    INSERT INTO public.vehicles (vehicle_number, vehicle_model, daily_rent, owner_id, driver_id, driver_name, driver_phone, status, chassis_number, created_at)
    VALUES ('SKYEV-0062', 'Electric Scooter', 222, 6, v_mohammad_id, 'Mohammad Kadir', '9779434195', 'ASSIGNED', 'SKYEWHEELS2026008', '2026-04-06')
    RETURNING id INTO v_veh_id;
    UPDATE public.drivers SET assigned_vehicle_id = v_veh_id WHERE id = v_mohammad_id;
    RAISE NOTICE 'Vehicle SKYEV-0062 added id=%', v_veh_id;
  ELSE
    RAISE NOTICE 'Vehicle SKYEV-0062 already exists';
  END IF;

END $$;
