-- Fix for Interview Sessions ID type to support 'ses_...' format from Intake Sessions
ALTER TABLE public.interview_sessions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.interview_sessions ALTER COLUMN id TYPE VARCHAR(50) USING id::text;
