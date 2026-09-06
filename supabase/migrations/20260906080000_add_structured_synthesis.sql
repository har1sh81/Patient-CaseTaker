-- Task #29 Migration: Add structured_synthesis column to clinical_consultation_summaries
-- Description: Extends public.clinical_consultation_summaries to persist structured clinical synthesis data safely without overwriting ai_summary_draft.

ALTER TABLE public.clinical_consultation_summaries
  ADD COLUMN IF NOT EXISTS structured_synthesis JSONB,
  ADD COLUMN IF NOT EXISTS synthesis_version VARCHAR(20) DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS fingerprint TEXT;

-- Create index on fingerprint for fast idempotent lookup
CREATE INDEX IF NOT EXISTS idx_summaries_fingerprint ON public.clinical_consultation_summaries(fingerprint);
