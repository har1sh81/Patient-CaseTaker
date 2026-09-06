-- ============================================================================
-- Task #4: Seed Synthetic Medical Documents Corpus
-- MediKiosk Database Migration
-- Target: Supabase PostgreSQL
-- ============================================================================

-- Ensure the clinical_sources table has document provenance entries
INSERT INTO public.clinical_sources (
  id, encounter_id, source_type, source_entity, source_entity_id, confidence_level, description
) VALUES
  ('e1111111-4444-4111-8111-000000000001', 'c1111111-1111-4111-8111-000000000001', 'historical_document', 'medical_documents', 'arumugam_docs_corpus', 'high', 'Uploaded historical cardiac and OPD paper records for Arumugam Kandasamy'),
  ('e1111111-4444-4111-8111-000000000002', 'c1111111-1111-4111-8111-000000000002', 'external_document', 'medical_documents', 'meena_ayurveda_corpus', 'high', 'Uploaded external AYUSH paper records for Meena Sundaram'),
  ('e1111111-4444-4111-8111-000000000003', 'c1111111-1111-4111-8111-000000000003', 'external_document', 'medical_documents', 'rajesh_lab_corpus', 'high', 'Uploaded longitudinal lab reports for Rajesh Kumar Sharma'),
  ('e1111111-4444-4111-8111-000000000006', 'c1111111-1111-4111-8111-000000000006', 'scanned_paper', 'medical_documents', 'suresh_handwritten_rx', 'medium', 'Scanned handwritten OPD prescription for Suresh Velu'),
  ('e1111111-4444-4111-8111-000000000008', 'c1111111-1111-4111-8111-000000000008', 'historical_document', 'medical_documents', 'vikramaditya_rx_corpus', 'high', 'Uploaded historical prescriptions and ortho consult notes for Vikramaditya Singh')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description;

-- Insert 25 Synthetic Medical Documents into medical_documents table
INSERT INTO public.medical_documents (
  id,
  patient_id,
  encounter_id,
  file_name,
  mime_type,
  storage_path,
  document_type,
  upload_status,
  ocr_status,
  source_id,
  uploaded_at
) VALUES
  -- FLAGSHIP CASE 1: Arumugam Kandasamy (5 Documents)
  (
    'd1111111-1111-4111-8111-000000000001',
    'a1111111-1111-4111-8111-000000000001',
    'c1111111-1111-4111-8111-000000000001',
    'arumugam_opd_prescription_2022.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000001/arumugam_opd_prescription_2022.pdf',
    'opd_prescription',
    'uploaded',
    'pending',
    'e1111111-4444-4111-8111-000000000001',
    '2022-11-14 10:30:00+00'
  ),
  (
    'd1111111-1111-4111-8111-000000000002',
    'a1111111-1111-4111-8111-000000000001',
    'c1111111-1111-4111-8111-000000000001',
    'arumugam_lab_report_2023.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000001/arumugam_lab_report_2023.pdf',
    'lab_report',
    'uploaded',
    'pending',
    'e1111111-4444-4111-8111-000000000001',
    '2023-05-20 11:15:00+00'
  ),
  (
    'd1111111-1111-4111-8111-000000000003',
    'a1111111-1111-4111-8111-000000000001',
    'c1111111-1111-4111-8111-000000000001',
    'arumugam_ecg_cardiac_report_2024.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000001/arumugam_ecg_cardiac_report_2024.pdf',
    'imaging_report',
    'uploaded',
    'pending',
    'e1111111-4444-4111-8111-000000000001',
    '2024-01-10 14:00:00+00'
  ),
  (
    'd1111111-1111-4111-8111-000000000004',
    'a1111111-1111-4111-8111-000000000001',
    'c1111111-1111-4111-8111-000000000001',
    'arumugam_discharge_summary_2018.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000001/arumugam_discharge_summary_2018.pdf',
    'discharge_summary',
    'uploaded',
    'pending',
    'e1111111-4444-4111-8111-000000000001',
    '2018-08-10 09:00:00+00'
  ),
  (
    'd1111111-1111-4111-8111-000000000005',
    'a1111111-1111-4111-8111-000000000001',
    'c1111111-1111-4111-8111-000000000001',
    'arumugam_current_opd_note_2026.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000001/arumugam_current_opd_note_2026.pdf',
    'consultation_note',
    'uploaded',
    'pending',
    'e1111111-3333-4111-8111-000000000001',
    '2026-09-01 08:30:00+00'
  ),

  -- FLAGSHIP CASE 2: Rajesh Kumar Sharma (5 Documents - Longitudinal Diabetes/HTN)
  (
    'd1111111-1111-4111-8111-000000000006',
    'a1111111-1111-4111-8111-000000000003',
    'c1111111-1111-4111-8111-000000000003',
    'rajesh_lab_hba1c_2025_09.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000003/rajesh_lab_hba1c_2025_09.pdf',
    'lab_report',
    'uploaded',
    'pending',
    'e1111111-4444-4111-8111-000000000003',
    '2025-09-15 10:00:00+00'
  ),
  (
    'd1111111-1111-4111-8111-000000000007',
    'a1111111-1111-4111-8111-000000000003',
    'c1111111-1111-4111-8111-000000000003',
    'rajesh_lab_hba1c_2026_03.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000003/rajesh_lab_hba1c_2026_03.pdf',
    'lab_report',
    'uploaded',
    'pending',
    'e1111111-4444-4111-8111-000000000003',
    '2026-03-10 11:30:00+00'
  ),
  (
    'd1111111-1111-4111-8111-000000000008',
    'a1111111-1111-4111-8111-000000000003',
    'c1111111-1111-4111-8111-000000000003',
    'rajesh_lab_hba1c_2026_08.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000003/rajesh_lab_hba1c_2026_08.pdf',
    'lab_report',
    'uploaded',
    'pending',
    'e1111111-4444-4111-8111-000000000003',
    '2026-08-25 09:15:00+00'
  ),
  (
    'd1111111-1111-4111-8111-000000000009',
    'a1111111-1111-4111-8111-000000000003',
    'c1111111-1111-4111-8111-000000000003',
    'rajesh_prescription_2026.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000003/rajesh_prescription_2026.pdf',
    'opd_prescription',
    'uploaded',
    'pending',
    'e1111111-4444-4111-8111-000000000003',
    '2026-08-28 12:00:00+00'
  ),
  (
    'd1111111-1111-4111-8111-000000000010',
    'a1111111-1111-4111-8111-000000000003',
    'c1111111-1111-4111-8111-000000000003',
    'rajesh_consultation_note_2026.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000003/rajesh_consultation_note_2026.pdf',
    'consultation_note',
    'uploaded',
    'pending',
    'e1111111-3333-4111-8111-000000000003',
    '2026-09-02 10:45:00+00'
  ),

  -- FLAGSHIP CASE 3: Meena Sundaram (3 AYUSH Documents)
  (
    'd1111111-1111-4111-8111-000000000011',
    'a1111111-1111-4111-8111-000000000002',
    'c1111111-1111-4111-8111-000000000002',
    'meena_ayurveda_consultation_2025.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000002/meena_ayurveda_consultation_2025.pdf',
    'ayush_record',
    'uploaded',
    'pending',
    'e1111111-4444-4111-8111-000000000002',
    '2025-10-12 11:00:00+00'
  ),
  (
    'd1111111-1111-4111-8111-000000000012',
    'a1111111-1111-4111-8111-000000000002',
    'c1111111-1111-4111-8111-000000000002',
    'meena_dashavidha_pariksha_2026.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000002/meena_dashavidha_pariksha_2026.pdf',
    'ayush_record',
    'uploaded',
    'pending',
    'e1111111-4444-4111-8111-000000000002',
    '2026-02-18 14:30:00+00'
  ),
  (
    'd1111111-1111-4111-8111-000000000013',
    'a1111111-1111-4111-8111-000000000002',
    'c1111111-1111-4111-8111-000000000002',
    'meena_ayurveda_followup_2026.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000002/meena_ayurveda_followup_2026.pdf',
    'ayush_record',
    'uploaded',
    'pending',
    'e1111111-4444-4111-8111-000000000002',
    '2026-08-14 16:00:00+00'
  ),

  -- FLAGSHIP CASE 4: Vikramaditya Singh (4 Documents)
  (
    'd1111111-1111-4111-8111-000000000014',
    'a1111111-1111-4111-8111-000000000008',
    'c1111111-1111-4111-8111-000000000008',
    'vikramaditya_historical_rx_2023.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000008/vikramaditya_historical_rx_2023.pdf',
    'opd_prescription',
    'uploaded',
    'pending',
    'e1111111-4444-4111-8111-000000000008',
    '2023-04-10 10:00:00+00'
  ),
  (
    'd1111111-1111-4111-8111-000000000015',
    'a1111111-1111-4111-8111-000000000008',
    'c1111111-1111-4111-8111-000000000008',
    'vikramaditya_current_rx_2026.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000008/vikramaditya_current_rx_2026.pdf',
    'opd_prescription',
    'uploaded',
    'pending',
    'e1111111-4444-4111-8111-000000000008',
    '2026-08-30 11:45:00+00'
  ),
  (
    'd1111111-1111-4111-8111-000000000016',
    'a1111111-1111-4111-8111-000000000008',
    'c1111111-1111-4111-8111-000000000008',
    'vikramaditya_lab_report_2026.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000008/vikramaditya_lab_report_2026.pdf',
    'lab_report',
    'uploaded',
    'pending',
    'e1111111-4444-4111-8111-000000000008',
    '2026-07-15 09:30:00+00'
  ),
  (
    'd1111111-1111-4111-8111-000000000017',
    'a1111111-1111-4111-8111-000000000008',
    'c1111111-1111-4111-8111-000000000008',
    'vikramaditya_ortho_note_2026.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000008/vikramaditya_ortho_note_2026.pdf',
    'consultation_note',
    'uploaded',
    'pending',
    'e1111111-4444-4111-8111-000000000008',
    '2026-08-05 15:20:00+00'
  ),

  -- OTHER PATIENTS (8 Documents)
  -- 5. Suresh Velu (1 Handwritten PNG Prescription)
  (
    'd1111111-1111-4111-8111-000000000018',
    'a1111111-1111-4111-8111-000000000006',
    'c1111111-1111-4111-8111-000000000006',
    'suresh_handwritten_prescription.png',
    'image/png',
    'medical-documents/a1111111-1111-4111-8111-000000000006/suresh_handwritten_prescription.png',
    'opd_prescription',
    'uploaded',
    'pending',
    'e1111111-4444-4111-8111-000000000006',
    '2026-08-12 11:10:00+00'
  ),

  -- 6. Priya Ramanathan (1 Pediatric Growth Card PDF)
  (
    'd1111111-1111-4111-8111-000000000019',
    'a1111111-1111-4111-8111-000000000004',
    'c1111111-1111-4111-8111-000000000004',
    'priya_pediatric_growth_card.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000004/priya_pediatric_growth_card.pdf',
    'miscellaneous',
    'uploaded',
    'pending',
    NULL,
    '2026-06-20 10:00:00+00'
  ),

  -- 7. Sunita Devi Patel (1 USG Abdomen Gallstones PDF)
  (
    'd1111111-1111-4111-8111-000000000020',
    'a1111111-1111-4111-8111-000000000005',
    'c1111111-1111-4111-8111-000000000005',
    'sunita_usg_abdomen_report.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000005/sunita_usg_abdomen_report.pdf',
    'imaging_report',
    'uploaded',
    'pending',
    NULL,
    '2026-07-28 14:00:00+00'
  ),

  -- 8. Lakshmi Narasimhan (1 OPD Prescription PDF)
  (
    'd1111111-1111-4111-8111-000000000021',
    'a1111111-1111-4111-8111-000000000007',
    'c1111111-1111-4111-8111-000000000007',
    'lakshmi_opd_prescription_2026.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000007/lakshmi_opd_prescription_2026.pdf',
    'opd_prescription',
    'uploaded',
    'pending',
    NULL,
    '2026-08-01 10:30:00+00'
  ),

  -- 9. Karthik Subburaj (1 Gastroenterology Referral PDF)
  (
    'd1111111-1111-4111-8111-000000000022',
    'a1111111-1111-4111-8111-000000000009',
    'c1111111-1111-4111-8111-000000000009',
    'karthik_gastro_referral.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000009/karthik_gastro_referral.pdf',
    'miscellaneous',
    'uploaded',
    'pending',
    NULL,
    '2026-08-19 12:15:00+00'
  ),

  -- 10. Kavita R. Gupta (1 Lab Report CBC/Anemia PDF)
  (
    'd1111111-1111-4111-8111-000000000023',
    'a1111111-1111-4111-8111-000000000010',
    'c1111111-1111-4111-8111-000000000010',
    'kavita_cbc_anemia_panel.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000010/kavita_cbc_anemia_panel.pdf',
    'lab_report',
    'uploaded',
    'pending',
    NULL,
    '2026-07-02 09:00:00+00'
  ),

  -- 11. Robert D'Souza (1 USG Fatty Liver PDF)
  (
    'd1111111-1111-4111-8111-000000000024',
    'a1111111-1111-4111-8111-000000000011',
    'c1111111-1111-4111-8111-000000000011',
    'robert_usg_fatty_liver.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000011/robert_usg_fatty_liver.pdf',
    'imaging_report',
    'uploaded',
    'pending',
    NULL,
    '2026-05-18 11:30:00+00'
  ),

  -- 12. Ananya Sengupta (1 Discharge Summary PDF)
  (
    'd1111111-1111-4111-8111-000000000025',
    'a1111111-1111-4111-8111-000000000012',
    'c1111111-1111-4111-8111-000000000012',
    'ananya_discharge_summary.pdf',
    'application/pdf',
    'medical-documents/a1111111-1111-4111-8111-000000000012/ananya_discharge_summary.pdf',
    'discharge_summary',
    'uploaded',
    'pending',
    NULL,
    '2024-11-22 10:00:00+00'
  )
ON CONFLICT (id) DO UPDATE SET
  file_name = EXCLUDED.file_name,
  mime_type = EXCLUDED.mime_type,
  storage_path = EXCLUDED.storage_path,
  document_type = EXCLUDED.document_type,
  upload_status = EXCLUDED.upload_status,
  ocr_status = EXCLUDED.ocr_status,
  source_id = EXCLUDED.source_id,
  uploaded_at = EXCLUDED.uploaded_at;
