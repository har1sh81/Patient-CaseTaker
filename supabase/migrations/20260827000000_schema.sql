-- 1. Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
  id TEXT PRIMARY KEY,
  hospital_number TEXT,
  abha_reference TEXT,
  mobile_number TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT,
  full_name TEXT NOT NULL,
  date_of_birth TEXT,
  age INTEGER,
  gender TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_hospital_number ON public.patients(hospital_number) WHERE hospital_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_abha_reference ON public.patients(abha_reference) WHERE abha_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_mobile_number ON public.patients(mobile_number);

-- 2. Consents Table
CREATE TABLE IF NOT EXISTS public.consents (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  permissions JSONB NOT NULL,
  accepted BOOLEAN NOT NULL,
  accepted_at TIMESTAMPTZ,
  language TEXT NOT NULL,
  source TEXT NOT NULL,
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consents_patient_id ON public.consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_consents_session_id ON public.consents(session_id);

-- 3. Intake Sessions Table
CREATE TABLE IF NOT EXISTS public.intake_sessions (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES public.patients(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  language TEXT NOT NULL,
  department_mode TEXT NOT NULL,
  consent_id TEXT REFERENCES public.consents(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  current_step TEXT NOT NULL,
  progress JSONB NOT NULL,
  cleanup_status JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_patient_id ON public.intake_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.intake_sessions(status);

-- 4. Conversation Messages Table
CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.intake_sessions(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  linked_question_id TEXT,
  speech_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.conversation_messages(session_id);

-- 5. Conversation Answers Table
CREATE TABLE IF NOT EXISTS public.conversation_answers (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.intake_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  section TEXT NOT NULL,
  raw_value JSONB NOT NULL,
  normalized_value JSONB,
  input_method TEXT NOT NULL,
  transcript TEXT,
  provenance JSONB NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL,
  edited_by_patient BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_answers_session_id ON public.conversation_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON public.conversation_answers(question_id);

-- 6. Medical Documents Table
CREATE TABLE IF NOT EXISTS public.medical_documents (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.intake_sessions(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT,
  document_type TEXT NOT NULL,
  document_date TEXT,
  upload_status TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL,
  provenance JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_session_id ON public.medical_documents(session_id);
CREATE INDEX IF NOT EXISTS idx_documents_patient_id ON public.medical_documents(patient_id);

-- 7. Document Extractions Table
CREATE TABLE IF NOT EXISTS public.document_extractions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES public.medical_documents(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_date TEXT,
  extraction_status TEXT NOT NULL,
  diagnoses_mentioned JSONB NOT NULL,
  medications JSONB NOT NULL,
  procedures JSONB NOT NULL,
  laboratory_results JSONB NOT NULL,
  admissions JSONB NOT NULL,
  timeline_events JSONB NOT NULL,
  unstructured_summary TEXT,
  confidence TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extractions_document_id ON public.document_extractions(document_id);

-- 8. Clinical Histories Table
CREATE TABLE IF NOT EXISTS public.clinical_histories (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.intake_sessions(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  chief_complaint JSONB,
  history_of_present_illness JSONB,
  past_medical_history JSONB NOT NULL,
  past_surgical_history JSONB NOT NULL,
  medications JSONB NOT NULL,
  allergies JSONB NOT NULL,
  family_history JSONB NOT NULL,
  personal_history JSONB,
  social_history JSONB,
  review_of_systems JSONB,
  source_summary JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_session_id ON public.clinical_histories(session_id);
CREATE INDEX IF NOT EXISTS idx_clinical_patient_id ON public.clinical_histories(patient_id);

-- 9. Attention Flags Table
CREATE TABLE IF NOT EXISTS public.attention_flags (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.intake_sessions(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  label TEXT NOT NULL,
  message TEXT NOT NULL,
  source_rule_id TEXT,
  source_data JSONB NOT NULL,
  requires_clinical_review BOOLEAN NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  acknowledged_by_patient BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flags_session_id ON public.attention_flags(session_id);

-- 10. Patient Corrections Table
CREATE TABLE IF NOT EXISTS public.patient_corrections (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.intake_sessions(id) ON DELETE CASCADE,
  field_path TEXT NOT NULL,
  previous_value JSONB,
  corrected_value JSONB,
  corrected_by TEXT NOT NULL,
  corrected_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corrections_session_id ON public.patient_corrections(session_id);

-- 11. Clinical Reports Table
CREATE TABLE IF NOT EXISTS public.clinical_reports (
  id TEXT PRIMARY KEY,
  report_version TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  session_id TEXT NOT NULL REFERENCES public.intake_sessions(id) ON DELETE CASCADE,
  patient JSONB NOT NULL,
  visit JSONB NOT NULL,
  clinical_history JSONB NOT NULL,
  document_summary JSONB NOT NULL,
  medical_timeline JSONB NOT NULL,
  attention_flags JSONB NOT NULL,
  ayush JSONB,
  patient_confirmation JSONB NOT NULL,
  physician_verification JSONB NOT NULL,
  reference JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_session_id ON public.clinical_reports(session_id);

-- 12. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES public.intake_sessions(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_session_id ON public.audit_logs(session_id);
