-- Migration: Create Clinical Conflicts Table
-- Description: Task #28 Clinical Conflict Resolution storage table.
-- Stores identified, classified, and resolved/unresolved clinical conflicts between patient evidence items.

CREATE TABLE IF NOT EXISTS public.clinical_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
  conflict_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  resolution_status TEXT NOT NULL,
  explanation TEXT NOT NULL,
  preferred_source_type TEXT,
  preferred_source_id UUID,
  requires_clinician_review BOOLEAN NOT NULL DEFAULT false,
  candidates_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  provenance_json JSONB DEFAULT '{}'::jsonb,
  conflict_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying by patient, status, and severity
CREATE INDEX IF NOT EXISTS idx_clinical_conflicts_patient ON public.clinical_conflicts(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_conflicts_type ON public.clinical_conflicts(conflict_type);
CREATE INDEX IF NOT EXISTS idx_clinical_conflicts_resolution ON public.clinical_conflicts(resolution_status);
CREATE INDEX IF NOT EXISTS idx_clinical_conflicts_key ON public.clinical_conflicts(conflict_key);
