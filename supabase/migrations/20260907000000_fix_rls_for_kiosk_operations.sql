-- Fix RLS policies: grant service_role and anon full access for server-side kiosk operations.
-- The kiosk app runs server-side API routes that need unrestricted DB access.

-- Service role full access on all RLS-enabled tables
CREATE POLICY IF NOT EXISTS "Service role full access" ON public.patients FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON public.attention_flags FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON public.audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON public.conversation_answers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON public.document_extractions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON public.interview_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON public.medical_documents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON public.medical_timelines FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Service role storage access
CREATE POLICY IF NOT EXISTS "Service role can manage all storage objects" ON storage.objects FOR ALL TO service_role USING (bucket_id = 'medical_documents') WITH CHECK (bucket_id = 'medical_documents');

-- Anon role access for kiosk server-side operations (API routes use anon key when service role key is not a valid JWT)
CREATE POLICY IF NOT EXISTS "Anon full access" ON public.patients FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anon full access" ON public.attention_flags FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anon full access" ON public.audit_logs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anon full access" ON public.conversation_answers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anon full access" ON public.document_extractions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anon full access" ON public.interview_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anon full access" ON public.medical_documents FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anon full access" ON public.medical_timelines FOR ALL TO anon USING (true) WITH CHECK (true);

-- Anon storage access
CREATE POLICY IF NOT EXISTS "Anon can manage all storage objects" ON storage.objects FOR ALL TO anon USING (bucket_id = 'medical_documents') WITH CHECK (bucket_id = 'medical_documents');
