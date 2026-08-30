-- Migration: Security Hardening (Phase 19)
-- Description: Enables RLS on export_records and fixes doctor read access for finalized cases.

-- 1. Enable RLS on export_records
ALTER TABLE public.export_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own export records" ON public.export_records 
FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND patient_id = auth.uid()::text));

CREATE POLICY "Doctors can view export records for sent/finalized sessions" ON public.export_records 
FOR SELECT TO authenticated 
USING (public.is_doctor() AND EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND status IN ('sent_to_doctor', 'finalized')));

CREATE POLICY "Doctors can insert export records for sent/finalized sessions" ON public.export_records 
FOR INSERT TO authenticated 
WITH CHECK (public.is_doctor() AND EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND status IN ('sent_to_doctor', 'finalized')));

CREATE POLICY "Doctors can update export records for sent/finalized sessions" ON public.export_records 
FOR UPDATE TO authenticated 
USING (public.is_doctor() AND EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND status IN ('sent_to_doctor', 'finalized')));


-- 2. Fix Doctor Access for Finalized Sessions

-- Intake Sessions
DROP POLICY IF EXISTS "Doctors can view sent sessions" ON public.intake_sessions;
CREATE POLICY "Doctors can view sent sessions" ON public.intake_sessions 
FOR SELECT TO authenticated 
USING (public.is_doctor() AND status IN ('sent_to_doctor', 'finalized'));

DROP POLICY IF EXISTS "Doctors can update sent sessions" ON public.intake_sessions;
CREATE POLICY "Doctors can update sent sessions" ON public.intake_sessions 
FOR UPDATE TO authenticated 
USING (public.is_doctor() AND status IN ('sent_to_doctor', 'finalized'));

-- Conversation Messages
DROP POLICY IF EXISTS "Doctors can view messages for sent sessions" ON public.conversation_messages;
CREATE POLICY "Doctors can view messages for sent sessions" ON public.conversation_messages 
FOR SELECT TO authenticated 
USING (public.is_doctor() AND EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND status IN ('sent_to_doctor', 'finalized')));

-- Conversation Answers
DROP POLICY IF EXISTS "Doctors can view answers for sent sessions" ON public.conversation_answers;
CREATE POLICY "Doctors can view answers for sent sessions" ON public.conversation_answers 
FOR SELECT TO authenticated 
USING (public.is_doctor() AND EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND status IN ('sent_to_doctor', 'finalized')));

-- Medical Documents
DROP POLICY IF EXISTS "Doctors can view docs for sent sessions" ON public.medical_documents;
CREATE POLICY "Doctors can view docs for sent sessions" ON public.medical_documents 
FOR SELECT TO authenticated 
USING (public.is_doctor() AND EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND status IN ('sent_to_doctor', 'finalized')));

-- Document Extractions
DROP POLICY IF EXISTS "Doctors can view extractions for sent sessions" ON public.document_extractions;
CREATE POLICY "Doctors can view extractions for sent sessions" ON public.document_extractions 
FOR SELECT TO authenticated 
USING (public.is_doctor() AND EXISTS (SELECT 1 FROM public.medical_documents JOIN public.intake_sessions ON medical_documents.session_id = intake_sessions.id WHERE medical_documents.id = document_id AND intake_sessions.status IN ('sent_to_doctor', 'finalized')));

-- Clinical Histories
DROP POLICY IF EXISTS "Doctors can view clinical histories for sent sessions" ON public.clinical_histories;
CREATE POLICY "Doctors can view clinical histories for sent sessions" ON public.clinical_histories 
FOR SELECT TO authenticated 
USING (public.is_doctor() AND EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND status IN ('sent_to_doctor', 'finalized')));

-- Attention Flags
DROP POLICY IF EXISTS "Doctors can view attention flags for sent sessions" ON public.attention_flags;
CREATE POLICY "Doctors can view attention flags for sent sessions" ON public.attention_flags 
FOR SELECT TO authenticated 
USING (public.is_doctor() AND EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND status IN ('sent_to_doctor', 'finalized')));

-- Patient Corrections
DROP POLICY IF EXISTS "Doctors can view patient corrections for sent sessions" ON public.patient_corrections;
CREATE POLICY "Doctors can view patient corrections for sent sessions" ON public.patient_corrections 
FOR SELECT TO authenticated 
USING (public.is_doctor() AND EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND status IN ('sent_to_doctor', 'finalized')));

-- Clinical Reports
DROP POLICY IF EXISTS "Doctors can view reports for sent sessions" ON public.clinical_reports;
CREATE POLICY "Doctors can view reports for sent sessions" ON public.clinical_reports 
FOR SELECT TO authenticated 
USING (public.is_doctor() AND EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND status IN ('sent_to_doctor', 'finalized')));

DROP POLICY IF EXISTS "Doctors can update reports for sent sessions" ON public.clinical_reports;
CREATE POLICY "Doctors can update reports for sent sessions" ON public.clinical_reports 
FOR UPDATE TO authenticated 
USING (public.is_doctor() AND EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND status IN ('sent_to_doctor', 'finalized')));
