-- Migration: 20260906100000_add_clinical_provenance_links.sql
-- Description: Task #31 — Clinical Provenance Links Table for MediKiosk
-- Features: Directed graph provenance links, idempotency constraint, patient isolation indexes.

CREATE TABLE IF NOT EXISTS public.clinical_provenance_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  from_type TEXT NOT NULL,
  from_id TEXT NOT NULL,
  to_type TEXT NOT NULL,
  to_id TEXT NOT NULL,
  relationship TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_provenance_link UNIQUE (patient_id, from_type, from_id, to_type, to_id, relationship)
);

CREATE INDEX IF NOT EXISTS idx_provenance_links_patient ON public.clinical_provenance_links(patient_id);
CREATE INDEX IF NOT EXISTS idx_provenance_links_from ON public.clinical_provenance_links(patient_id, from_type, from_id);
CREATE INDEX IF NOT EXISTS idx_provenance_links_to ON public.clinical_provenance_links(patient_id, to_type, to_id);
