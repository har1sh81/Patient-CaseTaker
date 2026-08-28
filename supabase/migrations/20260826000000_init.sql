-- Initial Schema Setup for MediKiosk
CREATE TABLE IF NOT EXISTS public.clinics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
