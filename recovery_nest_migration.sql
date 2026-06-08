-- ================================================================
-- Recovery Nest LLP — Complete Fleet Onboarding Migration
-- 74 vehicles | 54 active riders | real data
--
-- BEFORE RUNNING: change the 2 values marked REPLACE below
-- ================================================================

-- STEP 1: Company
INSERT INTO public.companies (name, company_code, city, status)
VALUES ('Recovery Nest LLP', 'RECN1', 'Delhi', 'Active')
ON CONFLICT DO NOTHING;

-- STEP 2: Owner — REPLACE name and phone!
INSERT INTO public.owners (full_name, mobile_number, owner_code, status, company_id)
SELECT
  'Papa Ka Naam',
  '9800000000',
  'RECN'||LPAD((SELECT COALESCE(MAX(id),0)+1 FROM public.owners)::text,6,'0'),
  'ACTIVE',
  (SELECT id FROM public.companies WHERE company_code='RECN1')
ON CONFLICT (mobile_number) DO NOTHING;

-- STEP 3: 74 vehicles (daily_rent=0, update later with actual rates)
INSERT INTO public.vehicles (vehicle_number,vehicle_model,vehicle_type,chassis_number,status,owner_id,daily_rent)
SELECT v.r,v.m,'2W',v.c,'AVAILABLE',
  (SELECT id FROM public.owners WHERE mobile_number='9800000000'),0
FROM (VALUES
  ('EV0001','Jaunty','ADCSYSL250903804'),
  ('EV0002','Jaunty','ADCSYSL250903927'),
  ('EV0003','Jaunty','ADCSYSL250903944'),
  ('EV0004','Jaunty','ADCSYSL250904158'),
  ('EV0005','Jaunty','ADCSYSL250904085'),
  ('EV0006','Jaunty','ADCSYSL250904114'),
  ('EV0007','Jaunty','ADCSYSL250904051'),
  ('EV0008','Jaunty','ADCSYSL250904113'),
  ('EV0009','Jaunty','ADCSYSL250902667'),
  ('EV0010','Jaunty','ADCSYSL250903786'),
  ('EV0011','Jaunty','ADCSYSL250904044'),
  ('EV0012','Jaunty','ADCSYSL250904144'),
  ('EV0013','Jaunty','ADCSYSL250902481'),
  ('EV0014','Jaunty','ADCSYSL250904096'),
  ('EV0015','Jaunty','ADCSYSL250904160'),
  ('EV0016','Jaunty','ADCSYSL250904073'),
  ('EV0017','Jaunty','ADCSYSL250904086'),
  ('EV0018','Jaunty','ADCSYSL250904082'),
  ('EV0019','Jaunty','ADCSYSL250904122'),
  ('EV0020','Jaunty','ADCSYSL250904148'),
  ('EV0021','Jaunty','ADCSYSL250904072'),
  ('EV0022','Jaunty','ADCSYSL250903805'),
  ('EV0023','Jaunty','ADCSYSL250904099'),
  ('EV0024','Jaunty','ADCSYSL250904163'),
  ('EV0025','Jaunty','SL422Z101SC048236'),
  ('EV0026','Dangus Pro','MD9EADPR09202515574'),
  ('EV0027','Dangus Pro','MD9EADPR09202515465'),
  ('EV0028','Dangus Pro','MD9EADPR09202515421'),
  ('EV0029','Dangus Pro','MD9EADPR09202515509'),
  ('EV0030','Dangus Pro','MD9EADPR09202515469'),
  ('EV0031','Dangus Pro','MD9EADPR09202515727'),
  ('EV0032','Dangus Pro','MD9EADPR09202515485'),
  ('EV0033','Dangus Pro','MD9EADPR09202515462'),
  ('EV0034','Dangus Pro','MD9EADPR09202515709'),
  ('EV0035','Dangus Pro','MD9EADPR09202515420'),
  ('EV0036','Dangus Pro','MD9EADPR09202515714'),
  ('EV0037','Dangus Pro','MD9EADPR09202515406'),
  ('EV0038','Dangus Pro','MD9EADPR09202515463'),
  ('EV0039','Dangus Pro','MD9EADPR09202515737'),
  ('EV0040','Dangus Pro','MD9EADPR09202515580'),
  ('EV0041','Dangus Pro','MD9EADPR09202515452'),
  ('EV0042','Dangus Pro','MD9EADPR09202515577'),
  ('EV0043','Dangus Pro','MD9EADPR09202515477'),
  ('EV0044','Dangus Pro','MD9EADPR09202515470'),
  ('EV0045','Dangus Pro','MD9EADPR09202515416'),
  ('EV0046','Dangus Pro','MD9EADPR09202515424'),
  ('EV0047','Dangus Pro','MD9EADPR09202515489'),
  ('EV0048','Dangus Pro','MD9EADPR09202515434'),
  ('EV0049','Dangus Pro','MD9EADPR09202515590'),
  ('EV0050','Dangus Pro','MD9EADPR09202515571'),
  ('EV0051','Swift Volt','IMPL25KAFR002100'),
  ('EV0052','Swift Volt','IMPL25KAFR002058'),
  ('EV0053','Swift Volt','IMPL25KAFR002113'),
  ('EV0054','Swift Volt','IMPL25KAFR002048'),
  ('EV0055','Swift Volt','IMPL25KAFR002030'),
  ('EV0056','Swift Volt','IMPL25KAFR002157'),
  ('EV0057','Swift Volt','IMPL25KAFR002072'),
  ('EV0058','Swift Volt','IMPL25KAFR002086'),
  ('EV0059','Swift Volt','IMPL25KAFR002140'),
  ('EV0060','Swift Volt','IMPL25KAFR002158'),
  ('EV0061','Swift Volt','IMPL25KAFR002090'),
  ('EV0062','Swift Volt','IMPL25KAFR002112'),
  ('EV0063','Swift Volt','IMPL25KAFR002050'),
  ('EV0064','Swift Volt','IMPL25KAFR002054'),
  ('EV0065','Swift Volt','IMPL25KAFR002093'),
  ('EV0066','Swift Volt','IMPL25KAFR002074'),
  ('EV0067','Swift Volt','IMPL25KAFR002079'),
  ('EV0068','Swift Volt','IMPL25KAFR002061'),
  ('EV0069','Swift Volt','IMPL25KAFR002128'),
  ('EV0070','Swift Volt','IMPL25KAFR002071'),
  ('EV0071','Swift Volt','IMPL25KAFR002031'),
  ('EV0072','Swift Volt','IMPL25KAFR002129'),
  ('EV0073','Swift Volt','IMPL25KAFR002107'),
  ('EV0074','Swift Volt','IMPL25KAFR002109')
) AS v(r,m,c)
ON CONFLICT (vehicle_number) DO NOTHING;

-- STEP 4: 54 active riders as drivers
INSERT INTO public.drivers (full_name,mobile_number,driver_code,status,owner_code,kyc_status)
SELECT d.nm,d.ph,'RNR'||LPAD((ROW_NUMBER()OVER())::text,4,'0'),'ACTIVE',
  (SELECT owner_code FROM public.owners WHERE mobile_number='9800000000'),'PENDING'
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
WHERE o.mobile_number='9800000000' AND v.driver_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- STEP 7: Verify
SELECT
  (SELECT name FROM public.companies WHERE company_code='RECN1') AS company,
  (SELECT full_name FROM public.owners WHERE mobile_number='9800000000') AS owner,
  COUNT(v.id) FILTER(WHERE v.status='ACTIVE')    AS assigned_vehicles,
  COUNT(v.id) FILTER(WHERE v.status='AVAILABLE') AS free_vehicles,
  COUNT(v.id)                                     AS total_vehicles
FROM public.vehicles v
JOIN public.owners o ON o.id=v.owner_id
WHERE o.mobile_number='9800000000';
