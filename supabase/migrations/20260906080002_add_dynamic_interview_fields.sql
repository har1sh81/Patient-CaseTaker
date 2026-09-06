-- Migration: Add fields for Dynamic Interview State
-- Phase 2 requires additional state tracking for the conversational AI engine.

ALTER TABLE public.interview_sessions
  ADD COLUMN IF NOT EXISTS conversation_turns JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS covered_topics JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS missing_information JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_answer TEXT,
  ADD COLUMN IF NOT EXISTS turn_count INTEGER DEFAULT 0;
