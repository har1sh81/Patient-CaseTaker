-- Migration: Task #9 Interview Sessions Table Architecture
-- Creates public.interview_sessions for state machine control of the Adaptive Clinical Interview Engine.

CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES public.encounters(id) ON DELETE CASCADE,
  department VARCHAR(100) NOT NULL DEFAULT 'General Medicine',
  consultation_mode VARCHAR(50) NOT NULL DEFAULT 'general_medicine', -- general_medicine, ayush
  language VARCHAR(10) NOT NULL DEFAULT 'en', -- en, ta, hi
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- not_started, active, paused, completed, terminated_for_safety
  chief_complaint TEXT,
  current_question_id VARCHAR(100),
  asked_question_ids JSONB DEFAULT '[]'::jsonb,
  answered_question_ids JSONB DEFAULT '[]'::jsonb,
  skipped_question_ids JSONB DEFAULT '[]'::jsonb,
  collected_facts JSONB DEFAULT '[]'::jsonb,
  red_flags JSONB DEFAULT '[]'::jsonb,
  progress INTEGER DEFAULT 0,
  progress_json JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_patient ON public.interview_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_encounter ON public.interview_sessions(encounter_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON public.interview_sessions(status);
