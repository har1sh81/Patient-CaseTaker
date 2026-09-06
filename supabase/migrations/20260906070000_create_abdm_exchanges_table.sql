-- Migration: Task #33 ABDM Exchanges Table Architecture
-- Creates public.abdm_exchanges for tracking ABDM record exchange transactions, request IDs, bundle hashes, and transport statuses.

CREATE TABLE IF NOT EXISTS public.abdm_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
  consent_id UUID REFERENCES public.patient_consents(id) ON DELETE SET NULL,
  purpose VARCHAR(100) NOT NULL, -- consultation, treatment, continuity_of_care, record_access
  environment VARCHAR(30) NOT NULL DEFAULT 'mock', -- mock, sandbox, production
  request_id VARCHAR(100) NOT NULL,
  abha_address VARCHAR(200),
  fhir_version VARCHAR(20) NOT NULL DEFAULT '4.0.1',
  bundle_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of exported FHIR Bundle
  scope_json JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'submitted', -- prepared, consent_pending, submitted, accepted, processing, completed, rejected, failed
  provider VARCHAR(50) NOT NULL DEFAULT 'mock', -- mock, http
  response_metadata JSONB DEFAULT '{}'::jsonb,
  idempotency_key VARCHAR(128) UNIQUE,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abdm_exchanges_patient ON public.abdm_exchanges(patient_id);
CREATE INDEX IF NOT EXISTS idx_abdm_exchanges_encounter ON public.abdm_exchanges(encounter_id);
CREATE INDEX IF NOT EXISTS idx_abdm_exchanges_request_id ON public.abdm_exchanges(request_id);
CREATE INDEX IF NOT EXISTS idx_abdm_exchanges_idempotency ON public.abdm_exchanges(idempotency_key);
