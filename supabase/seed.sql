-- MediKiosk Database Seed Data
-- Mock clinics, doctors, and triage users
INSERT INTO public.clinics (id, name, location) VALUES
('cli_01', 'City Health Centre', 'Main Wing, 1st Floor')
ON CONFLICT DO NOTHING;
