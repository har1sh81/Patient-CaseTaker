-- Migration: 20260906010000_seed_fake_abha_patients.sql
-- Description: Task #2 — Synthetic ABHA Patient Database Seed for MediKiosk
-- Features: 12 Realistic Synthetic Indian OPD Patients, External Identifiers (ABHA Number, ABHA Address, Hospital ID),
--          Demo Encounters (Standard & AYUSH, Multilingual ta/hi/en), Consents, and Initial Clinical Provenance Sources.

-- 1. Seed Patients (Deterministic UUIDs, synthetic Indian names, DOB for dynamic age)
INSERT INTO public.patients (
  id, first_name, last_name, full_name, date_of_birth, gender, phone_number, email, preferred_language
) VALUES
  ('a1111111-1111-4111-8111-000000000001', 'Arumugam', 'Kandasamy', 'Arumugam Kandasamy', '1972-04-14', 'Male', '+919840112345', 'arumugam.k@demo-mail.in', 'ta'),
  ('a1111111-1111-4111-8111-000000000002', 'Meena', 'Sundaram', 'Meena Sundaram', '1996-08-22', 'Female', '+919840223456', 'meena.s@demo-mail.in', 'ta'),
  ('a1111111-1111-4111-8111-000000000003', 'Rajesh', 'Sharma', 'Rajesh Kumar Sharma', '1958-11-05', 'Male', '+919810334567', 'rajesh.sharma@demo-mail.in', 'hi'),
  ('a1111111-1111-4111-8111-000000000004', 'Priya', 'Ramanathan', 'Priya Ramanathan', '2015-03-10', 'Female', '+919840445678', 'guardian.ramanathan@demo-mail.in', 'ta'),
  ('a1111111-1111-4111-8111-000000000005', 'Ananya', 'Banerjee', 'Ananya Banerjee', '2001-01-18', 'Female', '+919830556789', 'ananya.b@demo-mail.in', 'en'),
  ('a1111111-1111-4111-8111-000000000006', 'Suresh', 'Velu', 'Suresh Velu', '1980-06-30', 'Male', '+919840667890', 'suresh.velu@demo-mail.in', 'ta'),
  ('a1111111-1111-4111-8111-000000000007', 'Sunita', 'Patel', 'Sunita Devi Patel', '1975-09-12', 'Female', '+919820778901', 'sunita.patel@demo-mail.in', 'hi'),
  ('a1111111-1111-4111-8111-000000000008', 'Vikramaditya', 'Singh', 'Vikramaditya Singh', '1950-12-01', 'Male', '+919810889012', 'vikram.singh@demo-mail.in', 'en'),
  ('a1111111-1111-4111-8111-000000000009', 'Lakshmi', 'Narasimhan', 'Lakshmi Narasimhan', '1963-05-19', 'Female', '+919840990123', 'lakshmi.n@demo-mail.in', 'ta'),
  ('a1111111-1111-4111-8111-000000000010', 'Karthik', 'Subburaj', 'Karthik Subburaj', '1999-07-07', 'Male', '+919840001234', 'karthik.subbu@demo-mail.in', 'ta'),
  ('a1111111-1111-4111-8111-000000000011', 'Kavita', 'Gupta', 'Kavita R. Gupta', '1994-10-15', 'Female', '+919810111222', 'kavita.gupta@demo-mail.in', 'hi'),
  ('a1111111-1111-4111-8111-000000000012', 'Robert', 'DSouza', 'Robert DSouza', '1978-02-28', 'Male', '+919820222333', 'robert.dsouza@demo-mail.in', 'en')
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  full_name = EXCLUDED.full_name,
  date_of_birth = EXCLUDED.date_of_birth,
  gender = EXCLUDED.gender,
  phone_number = EXCLUDED.phone_number,
  email = EXCLUDED.email,
  preferred_language = EXCLUDED.preferred_language,
  updated_at = NOW();

-- 2. Seed Patient External Identifiers (ABHA Number, ABHA Address, Hospital Record ID)
-- Uses clearly fake demo identifiers. Covers single, multiple, and unverified scenarios.
INSERT INTO public.patient_external_identifiers (
  id, patient_id, identifier_type, identifier_value, issuer, verification_status, metadata
) VALUES
  -- Patient 1: ABHA Number + ABHA Address + Hospital Number (Verified)
  ('b1111111-1111-4111-8111-000000000101', 'a1111111-1111-4111-8111-000000000001', 'abha_number', 'DEMO-ABHA-918273645001', 'NDHM_ABDM_DEMO', 'verified', '{"auth_methods": ["OTP", "DEMOGRAPHIC"]}'::jsonb),
  ('b1111111-1111-4111-8111-000000000102', 'a1111111-1111-4111-8111-000000000001', 'abha_address', 'arumugam.k@abdm.demo', 'NDHM_ABDM_DEMO', 'verified', '{"primary": true}'::jsonb),
  ('b1111111-1111-4111-8111-000000000103', 'a1111111-1111-4111-8111-000000000001', 'hospital_number', 'HOSP-OPD-2026-0101', 'GH_CHENNAI_OPD', 'verified', '{"unit": "General Medicine"}'::jsonb),

  -- Patient 2: ABHA Number + ABHA Address (AYUSH Patient)
  ('b1111111-1111-4111-8111-000000000201', 'a1111111-1111-4111-8111-000000000002', 'abha_number', 'DEMO-ABHA-918273645002', 'NDHM_ABDM_DEMO', 'verified', '{"auth_methods": ["OTP"]}'::jsonb),
  ('b1111111-1111-4111-8111-000000000202', 'a1111111-1111-4111-8111-000000000002', 'abha_address', 'meenasundaram@abdm.demo', 'NDHM_ABDM_DEMO', 'verified', '{"primary": true}'::jsonb),

  -- Patient 3: ABHA Number Only (Unverified Scenario)
  ('b1111111-1111-4111-8111-000000000301', 'a1111111-1111-4111-8111-000000000003', 'abha_number', 'DEMO-ABHA-918273645003', 'NDHM_ABDM_DEMO', 'unverified', '{"pending_verification": "mobile_otp"}'::jsonb),

  -- Patient 4: Hospital Number Only
  ('b1111111-1111-4111-8111-000000000401', 'a1111111-1111-4111-8111-000000000004', 'hospital_number', 'HOSP-OPD-2026-0104', 'GH_CHENNAI_OPD', 'verified', '{"unit": "Pediatrics"}'::jsonb),

  -- Patient 5: ABHA Number + ABHA Address + Hospital ID
  ('b1111111-1111-4111-8111-000000000501', 'a1111111-1111-4111-8111-000000000005', 'abha_number', 'DEMO-ABHA-918273645005', 'NDHM_ABDM_DEMO', 'verified', '{"auth_methods": ["FINGERPRINT", "OTP"]}'::jsonb),
  ('b1111111-1111-4111-8111-000000000502', 'a1111111-1111-4111-8111-000000000005', 'abha_address', 'ananyab@abdm.demo', 'NDHM_ABDM_DEMO', 'verified', '{"primary": true}'::jsonb),
  ('b1111111-1111-4111-8111-000000000503', 'a1111111-1111-4111-8111-000000000005', 'hospital_number', 'HOSP-AYUSH-2026-0005', 'GH_AYUSH_DEPT', 'verified', '{"unit": "Ayurveda"}'::jsonb),

  -- Patient 6: ABHA Address Only
  ('b1111111-1111-4111-8111-000000000601', 'a1111111-1111-4111-8111-000000000006', 'abha_address', 'suresh.velu@abdm.demo', 'NDHM_ABDM_DEMO', 'verified', '{"primary": true}'::jsonb),

  -- Patient 7: ABHA Number + Hospital ID
  ('b1111111-1111-4111-8111-000000000701', 'a1111111-1111-4111-8111-000000000007', 'abha_number', 'DEMO-ABHA-918273645007', 'NDHM_ABDM_DEMO', 'verified', '{"auth_methods": ["OTP"]}'::jsonb),
  ('b1111111-1111-4111-8111-000000000702', 'a1111111-1111-4111-8111-000000000007', 'hospital_number', 'HOSP-OPD-2026-0107', 'GH_DELHI_OPD', 'verified', '{"unit": "General Medicine"}'::jsonb),

  -- Patient 8: ABHA Number + ABHA Address + Hospital ID
  ('b1111111-1111-4111-8111-000000000801', 'a1111111-1111-4111-8111-000000000008', 'abha_number', 'DEMO-ABHA-918273645008', 'NDHM_ABDM_DEMO', 'verified', '{"auth_methods": ["DEMOGRAPHIC"]}'::jsonb),
  ('b1111111-1111-4111-8111-000000000802', 'a1111111-1111-4111-8111-000000000008', 'abha_address', 'vikram.singh@abdm.demo', 'NDHM_ABDM_DEMO', 'verified', '{"primary": true}'::jsonb),
  ('b1111111-1111-4111-8111-000000000803', 'a1111111-1111-4111-8111-000000000008', 'hospital_number', 'HOSP-AYUSH-2026-0008', 'GH_AYUSH_DEPT', 'verified', '{"unit": "Siddha"}'::jsonb),

  -- Patient 9: ABHA Number (Unverified) + Hospital ID (Verified)
  ('b1111111-1111-4111-8111-000000000901', 'a1111111-1111-4111-8111-000000000009', 'abha_number', 'DEMO-ABHA-918273645009', 'NDHM_ABDM_DEMO', 'unverified', '{"pending_verification": "demographic_match"}'::jsonb),
  ('b1111111-1111-4111-8111-000000000902', 'a1111111-1111-4111-8111-000000000009', 'hospital_number', 'HOSP-OPD-2026-0109', 'GH_CHENNAI_OPD', 'verified', '{"unit": "General Medicine"}'::jsonb),

  -- Patient 10: ABHA Number + ABHA Address
  ('b1111111-1111-4111-8111-000000001001', 'a1111111-1111-4111-8111-000000000010', 'abha_number', 'DEMO-ABHA-918273645010', 'NDHM_ABDM_DEMO', 'verified', '{"auth_methods": ["OTP"]}'::jsonb),
  ('b1111111-1111-4111-8111-000000001002', 'a1111111-1111-4111-8111-000000000010', 'abha_address', 'karthik.subbu@abdm.demo', 'NDHM_ABDM_DEMO', 'verified', '{"primary": true}'::jsonb),

  -- Patient 11: Hospital ID Only (AYUSH Department)
  ('b1111111-1111-4111-8111-000000001101', 'a1111111-1111-4111-8111-000000000011', 'hospital_number', 'HOSP-AYUSH-2026-0011', 'GH_AYUSH_DEPT', 'verified', '{"unit": "Homeopathy"}'::jsonb),

  -- Patient 12: ABHA Number + ABHA Address + Hospital ID
  ('b1111111-1111-4111-8111-000000001201', 'a1111111-1111-4111-8111-000000000012', 'abha_number', 'DEMO-ABHA-918273645012', 'NDHM_ABDM_DEMO', 'verified', '{"auth_methods": ["OTP"]}'::jsonb),
  ('b1111111-1111-4111-8111-000000001202', 'a1111111-1111-4111-8111-000000000012', 'abha_address', 'robert.dsouza@abdm.demo', 'NDHM_ABDM_DEMO', 'verified', '{"primary": true}'::jsonb),
  ('b1111111-1111-4111-8111-000000001203', 'a1111111-1111-4111-8111-000000000012', 'hospital_number', 'HOSP-OPD-2026-0112', 'GH_MUMBAI_OPD', 'verified', '{"unit": "General Medicine"}'::jsonb)
ON CONFLICT (identifier_type, identifier_value) DO UPDATE SET
  patient_id = EXCLUDED.patient_id,
  issuer = EXCLUDED.issuer,
  verification_status = EXCLUDED.verification_status,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- 3. Seed Demo Encounters (Kiosk OPD sessions)
INSERT INTO public.encounters (
  id, patient_id, status, intake_mode, language_code, department_mode, current_step, progress_metadata, started_at
) VALUES
  ('c1111111-1111-4111-8111-000000000001', 'a1111111-1111-4111-8111-000000000001', 'completed', 'kiosk_voice_touch', 'ta', 'standard', 'summary', '{"step_index": 5, "kiosk_id": "KIOSK-CHENNAI-01"}'::jsonb, NOW() - INTERVAL '2 hours'),
  ('c1111111-1111-4111-8111-000000000002', 'a1111111-1111-4111-8111-000000000002', 'active', 'kiosk_voice_touch', 'ta', 'ayush', 'complaint_input', '{"step_index": 2, "kiosk_id": "KIOSK-CHENNAI-02"}'::jsonb, NOW() - INTERVAL '15 minutes'),
  ('c1111111-1111-4111-8111-000000000003', 'a1111111-1111-4111-8111-000000000003', 'completed', 'kiosk_voice_touch', 'hi', 'standard', 'summary', '{"step_index": 5, "kiosk_id": "KIOSK-DELHI-01"}'::jsonb, NOW() - INTERVAL '1 day'),
  ('c1111111-1111-4111-8111-000000000004', 'a1111111-1111-4111-8111-000000000004', 'active', 'kiosk_voice_touch', 'ta', 'standard', 'consent', '{"step_index": 1, "kiosk_id": "KIOSK-CHENNAI-01"}'::jsonb, NOW() - INTERVAL '5 minutes'),
  ('c1111111-1111-4111-8111-000000000005', 'a1111111-1111-4111-8111-000000000005', 'completed', 'kiosk_voice_touch', 'en', 'ayush', 'summary', '{"step_index": 5, "kiosk_id": "KIOSK-KOLKATA-01"}'::jsonb, NOW() - INTERVAL '3 hours'),
  ('c1111111-1111-4111-8111-000000000006', 'a1111111-1111-4111-8111-000000000006', 'active', 'kiosk_voice_touch', 'ta', 'standard', 'vitals', '{"step_index": 3, "kiosk_id": "KIOSK-CHENNAI-03"}'::jsonb, NOW() - INTERVAL '10 minutes'),
  ('c1111111-1111-4111-8111-000000000007', 'a1111111-1111-4111-8111-000000000007', 'completed', 'kiosk_voice_touch', 'hi', 'standard', 'summary', '{"step_index": 5, "kiosk_id": "KIOSK-DELHI-02"}'::jsonb, NOW() - INTERVAL '4 hours'),
  ('c1111111-1111-4111-8111-000000000008', 'a1111111-1111-4111-8111-000000000008', 'active', 'kiosk_voice_touch', 'en', 'ayush', 'ayush_questions', '{"step_index": 4, "kiosk_id": "KIOSK-MUMBAI-01"}'::jsonb, NOW() - INTERVAL '8 minutes'),
  ('c1111111-1111-4111-8111-000000000009', 'a1111111-1111-4111-8111-000000000009', 'completed', 'kiosk_voice_touch', 'ta', 'standard', 'summary', '{"step_index": 5, "kiosk_id": "KIOSK-CHENNAI-01"}'::jsonb, NOW() - INTERVAL '5 hours'),
  ('c1111111-1111-4111-8111-000000000010', 'a1111111-1111-4111-8111-000000000010', 'active', 'kiosk_voice_touch', 'ta', 'standard', 'documents', '{"step_index": 3, "kiosk_id": "KIOSK-CHENNAI-02"}'::jsonb, NOW() - INTERVAL '12 minutes')
ON CONFLICT (id) DO UPDATE SET
  patient_id = EXCLUDED.patient_id,
  status = EXCLUDED.status,
  intake_mode = EXCLUDED.intake_mode,
  language_code = EXCLUDED.language_code,
  department_mode = EXCLUDED.department_mode,
  current_step = EXCLUDED.current_step,
  progress_metadata = EXCLUDED.progress_metadata,
  updated_at = NOW();

-- 4. Seed Patient Consents (Linked to Patient & Encounter)
INSERT INTO public.patient_consents (
  id, patient_id, encounter_id, consent_version, language_code, permissions, accepted, accepted_at
) VALUES
  ('d1111111-1111-4111-8111-000000000001', 'a1111111-1111-4111-8111-000000000001', 'c1111111-1111-4111-8111-000000000001', 'v1.0', 'ta', '{"share_health_records": true, "share_ayush_records": false, "voice_recording": true, "ocr_processing": true}'::jsonb, true, NOW() - INTERVAL '2 hours'),
  ('d1111111-1111-4111-8111-000000000002', 'a1111111-1111-4111-8111-000000000002', 'c1111111-1111-4111-8111-000000000002', 'v1.0', 'ta', '{"share_health_records": true, "share_ayush_records": true, "voice_recording": true, "ocr_processing": true}'::jsonb, true, NOW() - INTERVAL '15 minutes'),
  ('d1111111-1111-4111-8111-000000000003', 'a1111111-1111-4111-8111-000000000003', 'c1111111-1111-4111-8111-000000000003', 'v1.1', 'hi', '{"share_health_records": true, "share_ayush_records": false, "voice_recording": true, "ocr_processing": false}'::jsonb, true, NOW() - INTERVAL '1 day'),
  ('d1111111-1111-4111-8111-000000000004', 'a1111111-1111-4111-8111-000000000004', 'c1111111-1111-4111-8111-000000000004', 'v1.0', 'ta', '{"share_health_records": false, "share_ayush_records": false, "voice_recording": false, "ocr_processing": false}'::jsonb, false, NULL),
  ('d1111111-1111-4111-8111-000000000005', 'a1111111-1111-4111-8111-000000000005', 'c1111111-1111-4111-8111-000000000005', 'v1.0', 'en', '{"share_health_records": true, "share_ayush_records": true, "voice_recording": true, "ocr_processing": true}'::jsonb, true, NOW() - INTERVAL '3 hours'),
  ('d1111111-1111-4111-8111-000000000006', 'a1111111-1111-4111-8111-000000000006', 'c1111111-1111-4111-8111-000000000006', 'v1.0', 'ta', '{"share_health_records": true, "share_ayush_records": false, "voice_recording": true, "ocr_processing": true}'::jsonb, true, NOW() - INTERVAL '10 minutes'),
  ('d1111111-1111-4111-8111-000000000007', 'a1111111-1111-4111-8111-000000000007', 'c1111111-1111-4111-8111-000000000007', 'v1.1', 'hi', '{"share_health_records": true, "share_ayush_records": false, "voice_recording": true, "ocr_processing": true}'::jsonb, true, NOW() - INTERVAL '4 hours'),
  ('d1111111-1111-4111-8111-000000000008', 'a1111111-1111-4111-8111-000000000008', 'c1111111-1111-4111-8111-000000000008', 'v1.0', 'en', '{"share_health_records": true, "share_ayush_records": true, "voice_recording": true, "ocr_processing": true}'::jsonb, true, NOW() - INTERVAL '8 minutes')
ON CONFLICT (id) DO UPDATE SET
  patient_id = EXCLUDED.patient_id,
  encounter_id = EXCLUDED.encounter_id,
  consent_version = EXCLUDED.consent_version,
  language_code = EXCLUDED.language_code,
  permissions = EXCLUDED.permissions,
  accepted = EXCLUDED.accepted,
  accepted_at = EXCLUDED.accepted_at;

-- 5. Seed Clinical Provenance Sources (Linked to Encounters)
INSERT INTO public.clinical_sources (
  id, encounter_id, source_type, source_entity, source_entity_id, confidence_level, description
) VALUES
  ('e1111111-2222-4111-8111-000000000001', 'c1111111-1111-4111-8111-000000000001', 'patient_reported', 'conversation_answers', 'q_chief_complaint_01', 'high', 'Patient self-reported chief complaints via kiosk voice in Tamil'),
  ('e1111111-2222-4111-8111-000000000002', 'c1111111-1111-4111-8111-000000000002', 'patient_reported', 'conversation_answers', 'q_ayush_complaint_01', 'high', 'Patient reported Prakriti / Digestion symptoms via kiosk touch in Tamil'),
  ('e1111111-2222-4111-8111-000000000003', 'c1111111-1111-4111-8111-000000000003', 'abdm_imported', 'abdm_records', 'abdm_rec_918273645003', 'high', 'ABDM linked historical health records imported during intake'),
  ('e1111111-2222-4111-8111-000000000005', 'c1111111-1111-4111-8111-000000000005', 'ai_generated', 'gemini_nlp', 'gemini_extract_005', 'medium', 'Initial AI symptom extraction draft from patient speech'),
  ('e1111111-2222-4111-8111-000000000007', 'c1111111-1111-4111-8111-000000000007', 'ocr_extracted', 'medical_documents', 'doc_scan_007', 'high', 'OCR extracted prescription and lab report data')
ON CONFLICT (id) DO UPDATE SET
  encounter_id = EXCLUDED.encounter_id,
  source_type = EXCLUDED.source_type,
  source_entity = EXCLUDED.source_entity,
  source_entity_id = EXCLUDED.source_entity_id,
  confidence_level = EXCLUDED.confidence_level,
  description = EXCLUDED.description;
