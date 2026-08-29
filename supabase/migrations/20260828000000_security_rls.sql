-- Create auth helper functions
CREATE OR REPLACE FUNCTION public.is_doctor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'doctor';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Patients Table
CREATE POLICY "Doctors can view all patients" ON public.patients FOR SELECT TO authenticated USING (public.is_doctor());
CREATE POLICY "Doctors can insert patients" ON public.patients FOR INSERT TO authenticated WITH CHECK (public.is_doctor());
CREATE POLICY "Doctors can update patients" ON public.patients FOR UPDATE TO authenticated USING (public.is_doctor());
CREATE POLICY "Patients can view own record" ON public.patients FOR SELECT TO authenticated USING (id = auth.uid()::text);
CREATE POLICY "Patients can update own record" ON public.patients FOR UPDATE TO authenticated USING (id = auth.uid()::text);

-- 2. Consents Table
CREATE POLICY "Doctors can view all consents" ON public.consents FOR SELECT TO authenticated USING (public.is_doctor());
CREATE POLICY "Patients can view own consents" ON public.consents FOR SELECT TO authenticated USING (patient_id = auth.uid()::text);
CREATE POLICY "Patients can insert own consents" ON public.consents FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid()::text);

-- 3. Intake Sessions Table
CREATE POLICY "Doctors can view sent sessions" ON public.intake_sessions FOR SELECT TO authenticated USING (public.is_doctor() AND status = 'sent_to_doctor');
CREATE POLICY "Doctors can update sent sessions" ON public.intake_sessions FOR UPDATE TO authenticated USING (public.is_doctor() AND status = 'sent_to_doctor');
CREATE POLICY "Patients can view own sessions" ON public.intake_sessions FOR SELECT TO authenticated USING (patient_id = auth.uid()::text);
CREATE POLICY "Patients can update own sessions" ON public.intake_sessions FOR UPDATE TO authenticated USING (patient_id = auth.uid()::text);

-- 4. Conversation Messages Table
CREATE POLICY "Doctors can view messages for sent sessions" ON public.conversation_messages FOR SELECT TO authenticated USING (public.is_doctor() AND EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND status = 'sent_to_doctor'));
CREATE POLICY "Patients can view own session messages" ON public.conversation_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND patient_id = auth.uid()::text));
CREATE POLICY "Patients can insert own session messages" ON public.conversation_messages FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND patient_id = auth.uid()::text));

-- 5. Conversation Answers Table
CREATE POLICY "Doctors can view answers for sent sessions" ON public.conversation_answers FOR SELECT TO authenticated USING (public.is_doctor() AND EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND status = 'sent_to_doctor'));
CREATE POLICY "Patients can view own session answers" ON public.conversation_answers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND patient_id = auth.uid()::text));
CREATE POLICY "Patients can insert own session answers" ON public.conversation_answers FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND patient_id = auth.uid()::text));

-- 6. Medical Documents Table
CREATE POLICY "Doctors can view docs for sent sessions" ON public.medical_documents FOR SELECT TO authenticated USING (public.is_doctor() AND EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND status = 'sent_to_doctor'));
CREATE POLICY "Patients can view own docs" ON public.medical_documents FOR SELECT TO authenticated USING (patient_id = auth.uid()::text);
CREATE POLICY "Patients can insert own docs" ON public.medical_documents FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid()::text);

-- 7. Document Extractions Table
CREATE POLICY "Doctors can view extractions for sent sessions" ON public.document_extractions FOR SELECT TO authenticated USING (public.is_doctor() AND EXISTS (SELECT 1 FROM public.medical_documents JOIN public.intake_sessions ON medical_documents.session_id = intake_sessions.id WHERE medical_documents.id = document_id AND intake_sessions.status = 'sent_to_doctor'));
CREATE POLICY "Patients can view own extractions" ON public.document_extractions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.medical_documents WHERE id = document_id AND patient_id = auth.uid()::text));

-- 8. Clinical Histories Table
CREATE POLICY "Doctors can view clinical histories for sent sessions" ON public.clinical_histories FOR SELECT TO authenticated USING (public.is_doctor() AND EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND status = 'sent_to_doctor'));
CREATE POLICY "Patients can view own clinical histories" ON public.clinical_histories FOR SELECT TO authenticated USING (patient_id = auth.uid()::text);
CREATE POLICY "Patients can insert own clinical histories" ON public.clinical_histories FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid()::text);

-- 9. Attention Flags Table
CREATE POLICY "Doctors can view attention flags for sent sessions" ON public.attention_flags FOR SELECT TO authenticated USING (public.is_doctor() AND EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND status = 'sent_to_doctor'));
CREATE POLICY "Patients can view own attention flags" ON public.attention_flags FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND patient_id = auth.uid()::text));

-- 10. Patient Corrections Table
CREATE POLICY "Doctors can view patient corrections for sent sessions" ON public.patient_corrections FOR SELECT TO authenticated USING (public.is_doctor() AND EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND status = 'sent_to_doctor'));
CREATE POLICY "Patients can view own patient corrections" ON public.patient_corrections FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND patient_id = auth.uid()::text));
CREATE POLICY "Patients can insert own patient corrections" ON public.patient_corrections FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND patient_id = auth.uid()::text));

-- 11. Clinical Reports Table
CREATE POLICY "Doctors can view reports for sent sessions" ON public.clinical_reports FOR SELECT TO authenticated USING (public.is_doctor() AND EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND status = 'sent_to_doctor'));
CREATE POLICY "Doctors can update reports for sent sessions" ON public.clinical_reports FOR UPDATE TO authenticated USING (public.is_doctor() AND EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND status = 'sent_to_doctor'));
CREATE POLICY "Patients can view own reports" ON public.clinical_reports FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.intake_sessions WHERE id = session_id AND patient_id = auth.uid()::text));

-- 12. Audit Logs Table
-- Audit logs should only be inserted by Service Role via server APIs.
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());

-- 13. Clinics Table
CREATE POLICY "Doctors can view clinics" ON public.clinics FOR SELECT TO authenticated USING (public.is_doctor());
CREATE POLICY "Admins can manage clinics" ON public.clinics FOR ALL TO authenticated USING (public.is_admin());

-- Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public) VALUES ('medical_documents', 'medical_documents', false) ON CONFLICT (id) DO NOTHING;

-- Storage Policies for medical_documents
CREATE POLICY "Patients can upload their own medical documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'medical_documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Patients can view their own medical documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'medical_documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Doctors can view all medical documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'medical_documents' AND public.is_doctor());
