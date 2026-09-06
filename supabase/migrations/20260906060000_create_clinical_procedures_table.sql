-- Migration: Task #25 Clinical Procedures Table Architecture
-- Creates public.clinical_procedures for storing extracted procedures, surgeries, and interventions.

CREATE TABLE IF NOT EXISTS public.clinical_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES public.encounters(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.clinical_sources(id) ON DELETE SET NULL,
  procedure_name VARCHAR(200) NOT NULL,
  raw_procedure_name TEXT,
  procedure_name_native TEXT,
  normalized_procedure_name TEXT,
  category VARCHAR(50) DEFAULT 'other', -- surgery, diagnostic, therapeutic, intervention, rehabilitation, other
  status VARCHAR(50) NOT NULL DEFAULT 'performed', -- planned, scheduled, performed, completed, cancelled, declined, historical, unknown
  procedure_date TEXT, -- Preserves year-only precision (e.g. '2018') as text without inventing fake timestamps
  indication_text TEXT,
  body_site TEXT,
  laterality TEXT,
  provider_text TEXT,
  facility_text TEXT,
  outcome_text TEXT,
  needs_review BOOLEAN DEFAULT FALSE,
  is_uncertain BOOLEAN DEFAULT FALSE,
  uncertainty_reason TEXT,
  verification_status VARCHAR(30) NOT NULL DEFAULT 'unverified',
  provenance_source VARCHAR(50) NOT NULL DEFAULT 'document_extraction',
  page_number INTEGER DEFAULT 1,
  source_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_procedures_patient ON public.clinical_procedures(patient_id);
CREATE INDEX IF NOT EXISTS idx_procedures_encounter ON public.clinical_procedures(encounter_id);
