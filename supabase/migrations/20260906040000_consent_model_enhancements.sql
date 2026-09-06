-- Migration: 20260906040000_consent_model_enhancements.sql
-- Task #6 — Consent Data Model Enhancements for MediKiosk

-- 1. Add purpose, expires_at, and status columns to public.patient_consents
ALTER TABLE public.patient_consents 
  ADD COLUMN IF NOT EXISTS purpose VARCHAR(100) DEFAULT 'consultation',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'accepted';

-- 2. Update status of existing seeded records based on accepted / withdrawn_at state
UPDATE public.patient_consents
SET status = CASE
  WHEN withdrawn_at IS NOT NULL THEN 'revoked'
  WHEN expires_at IS NOT NULL AND expires_at <= NOW() THEN 'expired'
  WHEN accepted = TRUE THEN 'accepted'
  ELSE 'rejected'
END
WHERE status IS NULL OR status = 'accepted';

-- 3. Create index for high-performance consent checks
CREATE INDEX IF NOT EXISTS idx_patient_consents_lookup 
ON public.patient_consents(patient_id, accepted, status, expires_at);
