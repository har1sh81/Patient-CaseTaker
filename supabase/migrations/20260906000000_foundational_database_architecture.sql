-- Migration: 20260906000000_foundational_database_architecture.sql
-- Description: Task #1 — Foundational PostgreSQL Database Architecture for MediKiosk
-- Features: Normalized relational entities, UUID keys, separate clinical sources table,
--          provenance vs verification status separation, ABHA external ID isolation,
--          multilingual dual-text storage, modular AYUSH extension table, and un-mutated AI summary storage.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Patients Table (Normalized demographics, age computed dynamically from DOB)
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  full_name VARCHAR(200) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(30),
  phone_number VARCHAR(20),
  email VARCHAR(100),
  preferred_language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_phone_number ON public.patients(phone_number);
CREATE INDEX IF NOT EXISTS idx_patients_dob ON public.patients(date_of_birth);

-- 2. Patient External Identifiers Table (Separates ABHA/Hospital IDs from core patient UUID)
CREATE TABLE IF NOT EXISTS public.patient_external_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  identifier_type VARCHAR(50) NOT NULL, -- abha_number, abha_address, hospital_number, national_health_id
  identifier_value VARCHAR(200) NOT NULL,
  issuer VARCHAR(100),
  verification_status VARCHAR(30) DEFAULT 'unverified', -- unverified, verified, expired
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_patient_identifier UNIQUE (identifier_type, identifier_value)
);

CREATE INDEX IF NOT EXISTS idx_ext_identifiers_patient_id ON public.patient_external_identifiers(patient_id);
CREATE INDEX IF NOT EXISTS idx_ext_identifiers_lookup ON public.patient_external_identifiers(identifier_type, identifier_value);

-- 3. Encounters Table (Intake Sessions / Visits)
CREATE TABLE IF NOT EXISTS public.encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active', -- active, completed, expired, cancelled, sent_to_doctor
  intake_mode VARCHAR(30) DEFAULT 'kiosk_voice_touch',
  language_code VARCHAR(10) NOT NULL DEFAULT 'en',
  department_mode VARCHAR(30) NOT NULL DEFAULT 'standard', -- standard (Allopathy), ayush
  current_step VARCHAR(50) DEFAULT 'start',
  progress_metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON public.encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_status ON public.encounters(status);

-- 4. Patient Consents Table
CREATE TABLE IF NOT EXISTS public.patient_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
  consent_version VARCHAR(20) NOT NULL,
  language_code VARCHAR(10) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  accepted BOOLEAN NOT NULL DEFAULT FALSE,
  accepted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_consents_patient ON public.patient_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_encounter ON public.patient_consents(encounter_id);

-- 5. Clinical Sources Table (Dedicated Provenance / Source Registry)
CREATE TABLE IF NOT EXISTS public.clinical_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES public.encounters(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL, -- patient_reported, ocr_extracted, abdm_imported, ai_generated
  source_entity VARCHAR(50), -- conversation_answers, medical_documents, abdm_records, gemini_nlp
  source_entity_id VARCHAR(200),
  confidence_level VARCHAR(30) DEFAULT 'high',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_sources_encounter ON public.clinical_sources(encounter_id);
CREATE INDEX IF NOT EXISTS idx_clinical_sources_type ON public.clinical_sources(source_type);

-- 6. Conversation Answers Table (Preserves original multilingual input + English translation)
CREATE TABLE IF NOT EXISTS public.conversation_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  question_id VARCHAR(100) NOT NULL,
  section VARCHAR(100) NOT NULL,
  source_language VARCHAR(10) NOT NULL DEFAULT 'en',
  raw_text TEXT NOT NULL, -- Native input: e.g., "எனக்கு நெஞ்சு வலி இருக்கிறது"
  normalized_english_text TEXT, -- Translated English: "I have chest pain"
  input_method VARCHAR(30) NOT NULL, -- voice, touch, keyboard, demo
  edited_by_patient BOOLEAN DEFAULT FALSE,
  source_id UUID REFERENCES public.clinical_sources(id) ON DELETE SET NULL,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_answers_encounter_id ON public.conversation_answers(encounter_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON public.conversation_answers(question_id);

-- 7. Clinical Symptoms Table (Relational Symptom Facts)
CREATE TABLE IF NOT EXISTS public.clinical_symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  symptom_name VARCHAR(200) NOT NULL,
  symptom_name_native VARCHAR(200),
  body_site VARCHAR(100),
  severity_score INTEGER, -- 1-10
  duration_text VARCHAR(100),
  onset_date DATE,
  character_quality VARCHAR(100),
  aggravating_factors TEXT,
  relieving_factors TEXT,
  source_id UUID REFERENCES public.clinical_sources(id) ON DELETE SET NULL,
  provenance_source VARCHAR(50) NOT NULL DEFAULT 'patient_reported', -- patient_reported, ocr_extracted, abdm_imported, ai_generated
  verification_status VARCHAR(30) NOT NULL DEFAULT 'unverified', -- unverified, reviewed, doctor_verified, rejected
  verified_by VARCHAR(100),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_symptoms_encounter ON public.clinical_symptoms(encounter_id);
CREATE INDEX IF NOT EXISTS idx_symptoms_patient ON public.clinical_symptoms(patient_id);

-- 8. Clinical Vitals Table (Relational Vitals)
CREATE TABLE IF NOT EXISTS public.clinical_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  heart_rate_bpm INTEGER,
  body_temperature_c NUMERIC(4,1),
  spo2_percentage INTEGER,
  respiratory_rate INTEGER,
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  source_id UUID REFERENCES public.clinical_sources(id) ON DELETE SET NULL,
  provenance_source VARCHAR(50) NOT NULL DEFAULT 'patient_reported',
  verification_status VARCHAR(30) NOT NULL DEFAULT 'unverified',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vitals_encounter ON public.clinical_vitals(encounter_id);

-- 9. Clinical Medications Table (Relational Medications)
CREATE TABLE IF NOT EXISTS public.clinical_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medication_name VARCHAR(200) NOT NULL,
  medication_name_native VARCHAR(200),
  dosage VARCHAR(100),
  frequency VARCHAR(100),
  route VARCHAR(50),
  status VARCHAR(30) DEFAULT 'active', -- active, discontinued, completed
  source_id UUID REFERENCES public.clinical_sources(id) ON DELETE SET NULL,
  provenance_source VARCHAR(50) NOT NULL DEFAULT 'patient_reported',
  verification_status VARCHAR(30) NOT NULL DEFAULT 'unverified',
  verified_by VARCHAR(100),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medications_encounter ON public.clinical_medications(encounter_id);
CREATE INDEX IF NOT EXISTS idx_medications_patient ON public.clinical_medications(patient_id);

-- 10. Clinical Lab Results Table (Relational Lab Observations)
CREATE TABLE IF NOT EXISTS public.clinical_lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  test_name VARCHAR(200) NOT NULL,
  result_value VARCHAR(100) NOT NULL,
  unit VARCHAR(50),
  reference_range VARCHAR(100),
  abnormal_flag BOOLEAN DEFAULT FALSE,
  specimen_date DATE,
  source_id UUID REFERENCES public.clinical_sources(id) ON DELETE SET NULL,
  provenance_source VARCHAR(50) NOT NULL DEFAULT 'ocr_extracted',
  verification_status VARCHAR(30) NOT NULL DEFAULT 'unverified',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_results_encounter ON public.clinical_lab_results(encounter_id);

-- 11. Clinical Diagnoses Table (Clinician Entered & Verified Diagnoses ONLY)
CREATE TABLE IF NOT EXISTS public.clinical_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  condition_name VARCHAR(200) NOT NULL,
  icd10_code VARCHAR(20),
  clinical_status VARCHAR(30) DEFAULT 'active', -- active, resolved, relapse
  verification_status VARCHAR(30) NOT NULL DEFAULT 'doctor_verified', -- unverified, reviewed, doctor_verified, rejected
  diagnosed_by VARCHAR(100) NOT NULL,
  diagnosed_at TIMESTAMPTZ DEFAULT NOW(),
  source_id UUID REFERENCES public.clinical_sources(id) ON DELETE SET NULL,
  provenance_source VARCHAR(50) NOT NULL DEFAULT 'doctor_verified',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diagnoses_encounter ON public.clinical_diagnoses(encounter_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_patient ON public.clinical_diagnoses(patient_id);

-- 12. Clinical AYUSH Assessments Table (Modular AYUSH Extension Table)
CREATE TABLE IF NOT EXISTS public.clinical_ayush_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  prakriti_dosha VARCHAR(50), -- Vata-Pitta, Kapha, etc.
  vikriti_dosha VARCHAR(50),
  agni_type VARCHAR(50), -- Manda Agni, Tikshna Agni, Vama Agni, Sama Agni
  koshtha_type VARCHAR(50), -- Krura Koshtha, Mridu Koshtha, Madhyama Koshtha
  ahara_habits JSONB DEFAULT '{}'::jsonb, -- Dietary preferences & habits
  dashavidha_pariksha JSONB DEFAULT '{}'::jsonb, -- Sara, Samhanana, Pramana, Satmya, Satva, Ahara/Vyayama Shakti, Vaya
  trividha_pariksha JSONB DEFAULT '{}'::jsonb, -- Darshana, Sparshana, Prashna
  ashtavidha_pariksha JSONB DEFAULT '{}'::jsonb, -- Nadi, Mutra, Mala, Jihva, Shabda, Sparsha, Drik, Akriti
  source_id UUID REFERENCES public.clinical_sources(id) ON DELETE SET NULL,
  provenance_source VARCHAR(50) DEFAULT 'patient_reported',
  verification_status VARCHAR(30) DEFAULT 'unverified',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ayush_encounter ON public.clinical_ayush_assessments(encounter_id);

-- 13. Medical Documents Table
CREATE TABLE IF NOT EXISTS public.medical_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_path TEXT NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  upload_status VARCHAR(30) DEFAULT 'uploaded',
  ocr_status VARCHAR(30) DEFAULT 'pending',
  source_id UUID REFERENCES public.clinical_sources(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_encounter ON public.medical_documents(encounter_id);
CREATE INDEX IF NOT EXISTS idx_documents_patient ON public.medical_documents(patient_id);

-- 14. Document Extractions Table
CREATE TABLE IF NOT EXISTS public.document_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.medical_documents(id) ON DELETE CASCADE,
  raw_ocr_text TEXT,
  extracted_json JSONB DEFAULT '{}'::jsonb,
  confidence_score NUMERIC(3,2),
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extractions_document ON public.document_extractions(document_id);

-- 15. Attention Flags Table (Red Flags & Priority Triage)
CREATE TABLE IF NOT EXISTS public.attention_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL, -- high, medium, low
  flag_label VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  source_rule_id VARCHAR(100),
  requires_clinical_review BOOLEAN DEFAULT TRUE,
  acknowledged_by_doctor BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flags_encounter ON public.attention_flags(encounter_id);

-- 16. Clinical Consultation Summaries Table
CREATE TABLE IF NOT EXISTS public.clinical_consultation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  ai_summary_draft JSONB NOT NULL, -- Raw AI generated draft (NEVER overwritten!)
  patient_confirmed BOOLEAN DEFAULT FALSE,
  patient_confirmed_at TIMESTAMPTZ,
  physician_verified BOOLEAN DEFAULT FALSE,
  physician_verified_at TIMESTAMPTZ,
  physician_notes_edits JSONB DEFAULT '{}'::jsonb, -- Doctor's separate verification & edits
  pdf_storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_summaries_encounter ON public.clinical_consultation_summaries(encounter_id);

-- 17. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  actor_type VARCHAR(50) DEFAULT 'patient', -- patient, doctor, system
  actor_id VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_encounter ON public.audit_logs(encounter_id);
