-- ================================================================
-- Recovery Nest — Fix + Steps 4-7
-- Run this AFTER the first run (steps 1-3 already succeeded)
-- ================================================================

-- PART A: Add missing column (also fixes KYC features for all drivers)
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'PENDING'
    CHECK (kyc_status IN ('PENDING','PARTIAL','SUBMITTED','UNDER_REVIEW','VERIFIED','APPROVED','REJECTED'));

-- STEP 4: 54 active riders as drivers
INSERT INTO public.drivers (full_name,mobile_number,driver_code,status,owner_code,kyc_status)
SELECT d.nm,d.ph,'RNR'||LPAD((ROW_NUMBER()OVER())::text,4,'0'),'ACTIVE',
  (SELECT owner_code FROM public.owners WHERE mobile_number='9899715718'),'PENDING'
FROM (VALUES
  ('Nitin Kumar','8127396913','EV0018'),
  ('Anil Yadav','9999342841','EV0019'),
  ('Saurabh','8528817683','EV0022'),
  ('Anshuman K Sharma','8882869524','EV0006'),
  ('Satish Suresh Singh','8827648802','EV0012'),
  ('Vidya Prakash Soni','9399846585','EV0002'),
  ('Abhishek Panday','9990366622','EV0020'),
  ('Subham Kumar','9812169724','EV0027'),
  ('Harsh Soni','9695144364','EV0032'),
  ('Puran singh bisht','7300813651','EV0040'),
  ('Sonu pal','6306712867','EV0047'),
  ('Sajid Khan','8265837886','EV0003'),
  ('sunny Pal','9568196516','EV0015'),
  ('Ankur Singh','9582530743','EV0035'),
  ('Himanshu Thakur','9318335890','EV0005'),
  ('Ankit Kumar','8009507210','EV0011'),
  ('Arun Kumar sah','9870569836','EV0021'),
  ('Dilshad Khan','9193489367','EV0043'),
  ('Humayun','9312316359','EV0038'),
  ('Ankush','8218654895','EV0010'),
  ('Ashish Raj','7667278325','EV0007'),
  ('Raj Yadav','8368344331','EV0033'),
  ('Mithun Kumar','8540081240','EV0031'),
  ('Adarsh Tiwari','6394859108','EV0036'),
  ('Dharampal Yadav','7079434308','EV0009'),
  ('Vikash','9536493042','EV0023'),
  ('Nitin Rajput','6306146026','EV0024'),
  ('Raj Kashyap','9580785294','EV0042'),
  ('Atul Tiwari','7840871087','EV0049'),
  ('Suraj Verma','8512820164','EV0004'),
  ('Anoop Kumar','7973769730','EV0039'),
  ('Rajan kumar','6206606047','EV0041'),
  ('Vikash Sharma','8802205846','EV0046'),
  ('Pushpendra Yadav','7454012664','EV0016'),
  ('Saikat sarkar','8348551907','EV0048'),
  ('Sachin Kumar','8928135631','EV0013'),
  ('Shahzad','9693182224','EV0045'),
  ('Nitin Singh','7310699743','EV0001'),
  ('Shravan Kumar','9310462935','EV0014'),
  ('Ajay Kumar','9953815140','EV0034'),
  ('Jitin Kumar','6306274926','EV0044'),
  ('Sachin chaurasiya','8887644332','EV0026'),
  ('Ankit','7827267103','EV0017'),
  ('Ajit Mishra','7800728105','EV0029'),
  ('Indrabhushan panday','8868045389','EV0053'),
  ('Nandu chaudhary','7428035923','EV0028'),
  ('Md. Shamsad','9625230659','EV0052'),
  ('Sumit Chaudhary','8929268907','EV0057'),
  ('Ankit Kumar','8218724348','EV0050'),
  ('Ajay Kumar','9626695671','EV0051'),
  ('Alamin Hussain','9821814835','EV0037'),
  ('Vineet Kumar','9580560389','EV0025'),
  ('Taliv Hussain','9217533505','EV0059'),
  ('Sanni kumar','7252827844','EV0069')
) AS d(nm,ph,ev)
ON CONFLICT (mobile_number) DO NOTHING;

-- STEP 5: Assign vehicles to riders
UPDATE public.vehicles veh
SET driver_id=dr.id, status='ACTIVE'
FROM (VALUES
  ('Nitin Kumar','8127396913','EV0018'),
  ('Anil Yadav','9999342841','EV0019'),
  ('Saurabh','8528817683','EV0022'),
  ('Anshuman K Sharma','8882869524','EV0006'),
  ('Satish Suresh Singh','8827648802','EV0012'),
  ('Vidya Prakash Soni','9399846585','EV0002'),
  ('Abhishek Panday','9990366622','EV0020'),
  ('Subham Kumar','9812169724','EV0027'),
  ('Harsh Soni','9695144364','EV0032'),
  ('Puran singh bisht','7300813651','EV0040'),
  ('Sonu pal','6306712867','EV0047'),
  ('Sajid Khan','8265837886','EV0003'),
  ('sunny Pal','9568196516','EV0015'),
  ('Ankur Singh','9582530743','EV0035'),
  ('Himanshu Thakur','9318335890','EV0005'),
  ('Ankit Kumar','8009507210','EV0011'),
  ('Arun Kumar sah','9870569836','EV0021'),
  ('Dilshad Khan','9193489367','EV0043'),
  ('Humayun','9312316359','EV0038'),
  ('Ankush','8218654895','EV0010'),
  ('Ashish Raj','7667278325','EV0007'),
  ('Raj Yadav','8368344331','EV0033'),
  ('Mithun Kumar','8540081240','EV0031'),
  ('Adarsh Tiwari','6394859108','EV0036'),
  ('Dharampal Yadav','7079434308','EV0009'),
  ('Vikash','9536493042','EV0023'),
  ('Nitin Rajput','6306146026','EV0024'),
  ('Raj Kashyap','9580785294','EV0042'),
  ('Atul Tiwari','7840871087','EV0049'),
  ('Suraj Verma','8512820164','EV0004'),
  ('Anoop Kumar','7973769730','EV0039'),
  ('Rajan kumar','6206606047','EV0041'),
  ('Vikash Sharma','8802205846','EV0046'),
  ('Pushpendra Yadav','7454012664','EV0016'),
  ('Saikat sarkar','8348551907','EV0048'),
  ('Sachin Kumar','8928135631','EV0013'),
  ('Shahzad','9693182224','EV0045'),
  ('Nitin Singh','7310699743','EV0001'),
  ('Shravan Kumar','9310462935','EV0014'),
  ('Ajay Kumar','9953815140','EV0034'),
  ('Jitin Kumar','6306274926','EV0044'),
  ('Sachin chaurasiya','8887644332','EV0026'),
  ('Ankit','7827267103','EV0017'),
  ('Ajit Mishra','7800728105','EV0029'),
  ('Indrabhushan panday','8868045389','EV0053'),
  ('Nandu chaudhary','7428035923','EV0028'),
  ('Md. Shamsad','9625230659','EV0052'),
  ('Sumit Chaudhary','8929268907','EV0057'),
  ('Ankit Kumar','8218724348','EV0050'),
  ('Ajay Kumar','9626695671','EV0051'),
  ('Alamin Hussain','9821814835','EV0037'),
  ('Vineet Kumar','9580560389','EV0025'),
  ('Taliv Hussain','9217533505','EV0059'),
  ('Sanni kumar','7252827844','EV0069')
) AS d(nm,ph,ev)
JOIN public.drivers dr ON dr.mobile_number=d.ph
WHERE veh.vehicle_number=d.ev AND veh.driver_id IS NULL;

-- STEP 6: Record history
INSERT INTO public.driver_vehicle_history (driver_id,vehicle_id,assigned_at,daily_rent,rent_type)
SELECT d.id,v.id,NOW(),v.daily_rent,'DAILY'
FROM public.vehicles v
JOIN public.drivers d ON d.id=v.driver_id
JOIN public.owners o ON o.id=v.owner_id
WHERE o.mobile_number='9899715718' AND v.driver_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- STEP 7: Verify
SELECT
  (SELECT name FROM public.companies WHERE company_code='RECN1') AS company,
  (SELECT full_name FROM public.owners WHERE mobile_number='9899715718') AS owner,
  COUNT(v.id) FILTER(WHERE v.status='ACTIVE')    AS assigned_vehicles,
  COUNT(v.id) FILTER(WHERE v.status='AVAILABLE') AS free_vehicles,
  COUNT(v.id)                                     AS total_vehicles
FROM public.vehicles v
JOIN public.owners o ON o.id=v.owner_id
WHERE o.mobile_number='9899715718';
