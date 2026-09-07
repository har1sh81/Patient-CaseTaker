-- Fix RLS policies: grant service_role and anon full access for server-side kiosk operations.
-- The kiosk app runs server-side API routes that need unrestricted DB access.

-- Service role full access on all RLS-enabled tables
DROP POLICY IF EXISTS "Service role full access" ON public.patients;
CREATE POLICY "Service role full access" ON public.patients FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON public.attention_flags;
CREATE POLICY "Service role full access" ON public.attention_flags FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON public.audit_logs;
CREATE POLICY "Service role full access" ON public.audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON public.conversation_answers;
CREATE POLICY "Service role full access" ON public.conversation_answers FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON public.document_extractions;
CREATE POLICY "Service role full access" ON public.document_extractions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON public.interview_sessions;
CREATE POLICY "Service role full access" ON public.interview_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON public.medical_documents;
CREATE POLICY "Service role full access" ON public.medical_documents FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON public.medical_timelines;
CREATE POLICY "Service role full access" ON public.medical_timelines FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Service role storage access
DROP POLICY IF EXISTS "Service role can manage all storage objects" ON storage.objects;
CREATE POLICY "Service role can manage all storage objects" ON storage.objects FOR ALL TO service_role USING (bucket_id = 'medical_documents') WITH CHECK (bucket_id = 'medical_documents');

-- Anon role access for kiosk server-side operations (API routes use anon key when service role key is not a valid JWT)
DROP POLICY IF EXISTS "Anon full access" ON public.patients;
CREATE POLICY "Anon full access" ON public.patients FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon full access" ON public.attention_flags;
CREATE POLICY "Anon full access" ON public.attention_flags FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon full access" ON public.audit_logs;
CREATE POLICY "Anon full access" ON public.audit_logs FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon full access" ON public.conversation_answers;
CREATE POLICY "Anon full access" ON public.conversation_answers FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon full access" ON public.document_extractions;
CREATE POLICY "Anon full access" ON public.document_extractions FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon full access" ON public.interview_sessions;
CREATE POLICY "Anon full access" ON public.interview_sessions FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon full access" ON public.medical_documents;
CREATE POLICY "Anon full access" ON public.medical_documents FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon full access" ON public.medical_timelines;
CREATE POLICY "Anon full access" ON public.medical_timelines FOR ALL TO anon USING (true) WITH CHECK (true);

-- Anon storage access
DROP POLICY IF EXISTS "Anon can manage all storage objects" ON storage.objects;
CREATE POLICY "Anon can manage all storage objects" ON storage.objects FOR ALL TO anon USING (bucket_id = 'medical_documents') WITH CHECK (bucket_id = 'medical_documents');
