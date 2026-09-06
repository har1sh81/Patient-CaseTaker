-- Create OCR Responses table to map to the OCRResponse typescript type

CREATE TABLE IF NOT EXISTS public.ocr_responses (
  document_id UUID PRIMARY KEY REFERENCES public.medical_documents(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  pages JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence VARCHAR(20) NOT NULL,
  status VARCHAR(30) NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ocr_responses ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read and write (matching local dev / mock setup)
DROP POLICY IF EXISTS "Allow public access for now" ON public.ocr_responses;
CREATE POLICY "Allow public access for now" ON public.ocr_responses FOR ALL USING (true) WITH CHECK (true);
