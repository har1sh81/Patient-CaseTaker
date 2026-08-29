-- Migration: Add Export Records Table
-- Description: Tracks FHIR export events for Hospital/ABDM interoperability

CREATE TABLE IF NOT EXISTS public.export_records (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.intake_sessions(id) ON DELETE CASCADE,
  report_id TEXT NOT NULL REFERENCES public.clinical_reports(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL, -- 'fhir_hospital', 'fhir_abdm'
  status TEXT NOT NULL, -- 'queued', 'sending', 'sent', 'failed', 'retrying'
  external_reference_id TEXT,
  provider TEXT NOT NULL,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_session_id ON public.export_records(session_id);
CREATE INDEX IF NOT EXISTS idx_export_report_id ON public.export_records(report_id);
CREATE INDEX IF NOT EXISTS idx_export_type ON public.export_records(export_type);
