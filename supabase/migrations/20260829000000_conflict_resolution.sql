-- Migration: Add Conflict Resolution Tracking
-- Description: Adds tracking for explicit physician conflict resolutions to the attention_flags table.

ALTER TABLE public.attention_flags
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS resolution_decision TEXT,
ADD COLUMN IF NOT EXISTS resolved_by TEXT,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_flags_status ON public.attention_flags(status);
