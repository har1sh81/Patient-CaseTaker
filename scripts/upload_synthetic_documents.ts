import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DOCUMENTS_DIR = path.join(process.cwd(), 'public', 'synthetic_documents');
const BUCKET_NAME = 'medical-documents';

interface DocUploadMapping {
  fileName: string;
  patientId: string;
  mimeType: string;
}

const MAPPINGS: DocUploadMapping[] = [
  // Arumugam Kandasamy (a1111111-1111-4111-8111-000000000001)
  { fileName: 'arumugam_opd_prescription_2022.pdf', patientId: 'a1111111-1111-4111-8111-000000000001', mimeType: 'application/pdf' },
  { fileName: 'arumugam_lab_report_2023.pdf', patientId: 'a1111111-1111-4111-8111-000000000001', mimeType: 'application/pdf' },
  { fileName: 'arumugam_ecg_cardiac_report_2024.pdf', patientId: 'a1111111-1111-4111-8111-000000000001', mimeType: 'application/pdf' },
  { fileName: 'arumugam_discharge_summary_2018.pdf', patientId: 'a1111111-1111-4111-8111-000000000001', mimeType: 'application/pdf' },
  { fileName: 'arumugam_current_opd_note_2026.pdf', patientId: 'a1111111-1111-4111-8111-000000000001', mimeType: 'application/pdf' },

  // Rajesh Kumar Sharma (a1111111-1111-4111-8111-000000000003)
  { fileName: 'rajesh_lab_hba1c_2025_09.pdf', patientId: 'a1111111-1111-4111-8111-000000000003', mimeType: 'application/pdf' },
  { fileName: 'rajesh_lab_hba1c_2026_03.pdf', patientId: 'a1111111-1111-4111-8111-000000000003', mimeType: 'application/pdf' },
  { fileName: 'rajesh_lab_hba1c_2026_08.pdf', patientId: 'a1111111-1111-4111-8111-000000000003', mimeType: 'application/pdf' },
  { fileName: 'rajesh_prescription_2026.pdf', patientId: 'a1111111-1111-4111-8111-000000000003', mimeType: 'application/pdf' },
  { fileName: 'rajesh_consultation_note_2026.pdf', patientId: 'a1111111-1111-4111-8111-000000000003', mimeType: 'application/pdf' },

  // Meena Sundaram (a1111111-1111-4111-8111-000000000002)
  { fileName: 'meena_ayurveda_consultation_2025.pdf', patientId: 'a1111111-1111-4111-8111-000000000002', mimeType: 'application/pdf' },
  { fileName: 'meena_dashavidha_pariksha_2026.pdf', patientId: 'a1111111-1111-4111-8111-000000000002', mimeType: 'application/pdf' },
  { fileName: 'meena_ayurveda_followup_2026.pdf', patientId: 'a1111111-1111-4111-8111-000000000002', mimeType: 'application/pdf' },

  // Vikramaditya Singh (a1111111-1111-4111-8111-000000000008)
  { fileName: 'vikramaditya_historical_rx_2023.pdf', patientId: 'a1111111-1111-4111-8111-000000000008', mimeType: 'application/pdf' },
  { fileName: 'vikramaditya_current_rx_2026.pdf', patientId: 'a1111111-1111-4111-8111-000000000008', mimeType: 'application/pdf' },
  { fileName: 'vikramaditya_lab_report_2026.pdf', patientId: 'a1111111-1111-4111-8111-000000000008', mimeType: 'application/pdf' },
  { fileName: 'vikramaditya_ortho_note_2026.pdf', patientId: 'a1111111-1111-4111-8111-000000000008', mimeType: 'application/pdf' },

  // Suresh Velu (a1111111-1111-4111-8111-000000000006)
  { fileName: 'suresh_handwritten_prescription.png', patientId: 'a1111111-1111-4111-8111-000000000006', mimeType: 'image/png' },

  // Priya Ramanathan (a1111111-1111-4111-8111-000000000004)
  { fileName: 'priya_pediatric_growth_card.pdf', patientId: 'a1111111-1111-4111-8111-000000000004', mimeType: 'application/pdf' },

  // Sunita Devi Patel (a1111111-1111-4111-8111-000000000005)
  { fileName: 'sunita_usg_abdomen_report.pdf', patientId: 'a1111111-1111-4111-8111-000000000005', mimeType: 'application/pdf' },

  // Lakshmi Narasimhan (a1111111-1111-4111-8111-000000000007)
  { fileName: 'lakshmi_opd_prescription_2026.pdf', patientId: 'a1111111-1111-4111-8111-000000000007', mimeType: 'application/pdf' },

  // Karthik Subburaj (a1111111-1111-4111-8111-000000000009)
  { fileName: 'karthik_gastro_referral.pdf', patientId: 'a1111111-1111-4111-8111-000000000009', mimeType: 'application/pdf' },

  // Kavita R. Gupta (a1111111-1111-4111-8111-000000000010)
  { fileName: 'kavita_cbc_anemia_panel.pdf', patientId: 'a1111111-1111-4111-8111-000000000010', mimeType: 'application/pdf' },

  // Robert D'Souza (a1111111-1111-4111-8111-000000000011)
  { fileName: 'robert_usg_fatty_liver.pdf', patientId: 'a1111111-1111-4111-8111-000000000011', mimeType: 'application/pdf' },

  // Ananya Sengupta (a1111111-1111-4111-8111-000000000012)
  { fileName: 'ananya_discharge_summary.pdf', patientId: 'a1111111-1111-4111-8111-000000000012', mimeType: 'application/pdf' }
];

async function main() {
  console.log(`Starting upload of ${MAPPINGS.length} documents to bucket '${BUCKET_NAME}'...`);

  let successCount = 0;
  for (const item of MAPPINGS) {
    const filePath = path.join(DOCUMENTS_DIR, item.fileName);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `${item.patientId}/${item.fileName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: item.mimeType,
        upsert: true,
      });

    if (error) {
      console.error(`Failed to upload ${item.fileName}:`, error.message);
    } else {
      console.log(`Uploaded successfully: ${storagePath}`);
      successCount++;
    }
  }

  console.log(`Upload completed: ${successCount}/${MAPPINGS.length} documents stored in Supabase Storage.`);
}

main().catch(err => {
  console.error('Error uploading documents:', err);
  process.exit(1);
});
