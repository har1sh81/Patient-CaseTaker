-- Create the missing medical_timelines table
CREATE TABLE IF NOT EXISTS public.medical_timelines (
  session_id TEXT PRIMARY KEY REFERENCES public.intake_sessions(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  records JSONB NOT NULL,
  last_updated TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timelines_patient_id ON public.medical_timelines(patient_id);

-- Enable RLS
ALTER TABLE public.medical_timelines ENABLE ROW LEVEL SECURITY;

-- Allow public access for demo environment
DROP POLICY IF EXISTS "Allow demo access to timelines" ON public.medical_timelines;
CREATE POLICY "Allow demo access to timelines" 
ON public.medical_timelines 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);
