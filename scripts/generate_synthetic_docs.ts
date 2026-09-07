import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'synthetic_documents');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface DocSpec {
  fileName: string;
  patientName: string;
  patientAbha: string;
  hospitalName: string;
  docTitle: string;
  date: string;
  sections: { title?: string; text: string | string[] }[];
}

async function generatePdf(spec: DocSpec): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Header background bar
  page.drawRectangle({
    x: 0,
    y: height - 80,
    width: width,
    height: 80,
    color: rgb(0.08, 0.28, 0.48), // Dark medical blue
  });

  // Hospital Name
  page.drawText(spec.hospitalName.toUpperCase(), {
    x: 35,
    y: height - 35,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  // Document Title
  page.drawText(spec.docTitle, {
    x: 35,
    y: height - 58,
    size: 12,
    font: fontRegular,
    color: rgb(0.85, 0.92, 0.98),
  });

  // Date top right
  page.drawText(`Date: ${spec.date}`, {
    x: width - 150,
    y: height - 35,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  // Patient Info Card
  page.drawRectangle({
    x: 35,
    y: height - 135,
    width: width - 70,
    height: 45,
    color: rgb(0.95, 0.97, 0.99),
    borderColor: rgb(0.8, 0.85, 0.9),
    borderWidth: 1,
  });

  page.drawText(`Patient: ${spec.patientName}`, {
    x: 45,
    y: height - 110,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText(`ABHA Address: ${spec.patientAbha}`, {
    x: 45,
    y: height - 126,
    size: 9,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText(`Status: SYNTHETIC / DEMO DATA`, {
    x: width - 220,
    y: height - 110,
    size: 9,
    font: fontOblique,
    color: rgb(0.7, 0.2, 0.2),
  });

  let currentY = height - 165;

  for (const section of spec.sections) {
    if (currentY < 80) break;

    if (section.title) {
      page.drawText(section.title, {
        x: 35,
        y: currentY,
        size: 12,
        font: fontBold,
        color: rgb(0.08, 0.28, 0.48),
      });
      currentY -= 16;

      page.drawLine({
        start: { x: 35, y: currentY + 4 },
        end: { x: width - 35, y: currentY + 4 },
        thickness: 0.8,
        color: rgb(0.8, 0.85, 0.9),
      });
      currentY -= 8;
    }

    const lines = Array.isArray(section.text) ? section.text : [section.text];
    for (const line of lines) {
      if (currentY < 60) break;
      page.drawText(line, {
        x: 45,
        y: currentY,
        size: 10,
        font: fontRegular,
        color: rgb(0.15, 0.15, 0.15),
      });
      currentY -= 14;
    }

    currentY -= 10;
  }

  // Footer
  page.drawLine({
    start: { x: 35, y: 40 },
    end: { x: width - 35, y: 40 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });

  page.drawText('CONFIDENTIAL MEDICAL RECORD - FOR MEDIKIOSK SIH DEMO PURPOSES ONLY (SYNTHETIC DATA)', {
    x: 35,
    y: 26,
    size: 7,
    font: fontOblique,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(path.join(OUTPUT_DIR, spec.fileName), pdfBytes);
  console.log(`Generated PDF: ${spec.fileName}`);
}

/**
 * Creates a handwritten-looking PNG file using standard PNG encoder
 */
function generateHandwrittenPng(fileName: string): void {
  const width = 500;
  const height = 350;

  // Raw RGBA canvas: 500x350
  const rowSize = width * 4 + 1;
  const imgData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    imgData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Off-white paper background (subtle yellow tint)
      let r = 250, g = 248, b = 238;

      // Blue header bar
      if (y < 45) {
        r = 30; g = 80; b = 150;
      }

      // Rule lines
      if (y > 60 && y % 35 === 0) {
        r = 210; g = 220; b = 235;
      }

      // Prescription header text (white on blue)
      if (y >= 15 && y <= 30 && x >= 20 && x <= 220 && (y % 4 < 3 && x % 8 < 6)) {
        r = 255; g = 255; b = 255;
      }

      // Rx Symbol (Blue ink)
      const isRx = (x >= 35 && x <= 42 && y >= 70 && y <= 110) ||
                   (y >= 70 && y <= 77 && x >= 35 && x <= 70) ||
                   (y >= 90 && y <= 96 && x >= 35 && x <= 65) ||
                   (x - y === -45 && x >= 50 && x <= 75 && y >= 95 && y <= 120);

      // Cursive/handwriting simulated text strokes
      const isHandwritingLine1 = y >= 135 && y <= 140 && Math.sin(x / 5) > -0.4 && x > 70 && x < 420;
      const isHandwritingLine2 = y >= 170 && y <= 175 && Math.cos(x / 6) > -0.3 && x > 70 && x < 380;
      const isHandwritingLine3 = y >= 205 && y <= 210 && Math.sin(x / 4) > -0.5 && x > 70 && x < 400;
      const isHandwritingLine4 = y >= 240 && y <= 245 && Math.cos(x / 7) > -0.2 && x > 70 && x < 350;

      // Doctor signature squiggle
      const isSignature = y >= 285 && y <= 295 && Math.sin(x / 3) > 0 && x > 300 && x < 450;

      if (isRx || isHandwritingLine1 || isHandwritingLine2 || isHandwritingLine3 || isHandwritingLine4 || isSignature) {
        r = 20; g = 40; b = 160; // Deep Doctor Blue Ink
      }

      imgData[pxOffset] = r;
      imgData[pxOffset + 1] = g;
      imgData[pxOffset + 2] = b;
      imgData[pxOffset + 3] = 255;
    }
  }

  const compressedData = zlib.deflateSync(imgData);

  function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const pngBuffer = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(path.join(OUTPUT_DIR, fileName), pngBuffer);
  console.log(`Generated Handwritten PNG: ${fileName}`);
}

async function main() {
  console.log('Generating 24 Synthetic Medical Documents...');

  // 1. ARUMUGAM KANDASAMY (4 Documents)
  await generatePdf({
    fileName: 'ramesh_opd_prescription_2022.pdf',
    patientName: 'Ramesh Kumar (62M)',
    patientAbha: 'ramesh.k@abdm',
    hospitalName: 'Apollo Hospitals Chennai - Cardiology OPD',
    docTitle: 'Outpatient Prescription & Historical Clinical Summary',
    date: '2022-11-14',
    sections: [
      { title: 'Clinical History & Complaints', text: ['- Essential Hypertension diagnosed 2017.', '- Type 2 Diabetes Mellitus diagnosed 2019.', '- Complaint of occasional exertional dyspnea on stair climbing.'] },
      { title: 'Vitals Record', text: ['BP: 142/88 mmHg | PR: 76 bpm | SpO2: 98% on room air | Weight: 74 kg'] },
      { title: 'Prescribed Medications', text: ['1. Tab. Telmisartan 40 mg OD (Morning after food)', '2. Tab. Metformin 500 mg BD (With meals)', '3. Tab. Atorvastatin 10 mg HS (At bedtime)'] },
      { title: 'Physician Notes & Advice', text: ['- Dietary salt restriction (<5g/day). Low glycemic index diet.', '- Walk 30 mins daily. Follow-up after 3 months.'] },
    ],
  });

  await generatePdf({
    fileName: 'ramesh_lab_report_2023.pdf',
    patientName: 'Ramesh Kumar (62M)',
    patientAbha: 'ramesh.k@abdm',
    hospitalName: 'Metropolis Diagnostic Center Chennai',
    docTitle: 'Comprehensive Glycemic & Lipid Profile Lab Report',
    date: '2023-05-20',
    sections: [
      { title: 'Glycemic Parameters', text: ['Fasting Blood Glucose: 138 mg/dL  (Ref: 70-99 mg/dL) [HIGH]', 'Post Prandial Glucose: 194 mg/dL  (Ref: <140 mg/dL) [HIGH]', 'HbA1c (Glycated Hb): 7.4 %  (Ref: <5.7% Normal, >6.5% Diabetic) [HIGH]'] },
      { title: 'Lipid Profile', text: ['Total Cholesterol: 215 mg/dL  (Ref: <200 mg/dL)', 'Triglycerides: 185 mg/dL  (Ref: <150 mg/dL)', 'HDL Cholesterol: 38 mg/dL  (Ref: >40 mg/dL)', 'LDL Cholesterol: 140 mg/dL  (Ref: <100 mg/dL)'] },
      { title: 'Renal Function', text: ['Serum Creatinine: 1.05 mg/dL (Ref: 0.7 - 1.3 mg/dL)', 'Blood Urea Nitrogen: 16 mg/dL (Ref: 7 - 20 mg/dL)'] },
    ],
  });

  await generatePdf({
    fileName: 'ramesh_ecg_cardiac_report_2024.pdf',
    patientName: 'Ramesh Kumar (63M)',
    patientAbha: 'ramesh.k@abdm',
    hospitalName: 'Sri Ramachandra Cardiac Sciences',
    docTitle: '12-Lead Electrocardiogram (ECG) Diagnostic Brief',
    date: '2024-01-10',
    sections: [
      { title: 'ECG Acquisition Findings', text: ['Heart Rate: 72 bpm | Rhythm: Normal Sinus Rhythm | PR Interval: 156 ms', 'QRS Duration: 88 ms | QTc Interval: 418 ms | Axis: Normal (+30 degrees)'] },
      { title: 'Waveform Interpretation', text: ['- No acute ST-segment elevation or depression noted.', '- Non-specific T-wave flattening in lead V5-V6.', '- No pathological Q waves observed. Normal R-wave progression.'] },
      { title: 'Clinical Impression', text: ['Normal sinus rhythm with non-specific ST-T wave variations.', 'NOTE: Patient-reported symptoms of exertional heaviness should be correlated with clinical stress test if indicated. No diagnostic MI on baseline tracing.'] },
    ],
  });

  await generatePdf({
    fileName: 'ramesh_discharge_summary_2018.pdf',
    patientName: 'Ramesh Kumar (58M)',
    patientAbha: 'ramesh.k@abdm',
    hospitalName: 'Government General Hospital Chennai',
    docTitle: 'Inpatient Discharge Summary - Medical Ward',
    date: '2018-08-10',
    sections: [
      { title: 'Admission & Diagnosis', text: ['Admission Date: 2018-08-05 | Discharge Date: 2018-08-10', 'Primary Diagnosis: Uncontrolled Hypertension with Hypertensive Urgency', 'Secondary Diagnosis: Newly Diagnosed Type 2 Diabetes'] },
      { title: 'Course in Hospital', text: ['Patient presented with severe headache and elevated BP (180/110 mmHg). Managed with IV Antihypertensives and oral Telmisartan. BP stabilized to 134/84 mmHg prior to discharge. Glycemic evaluation started.'] },
      { title: 'Discharge Advice & Medications', text: ['- Tab Telmisartan 40mg OD', '- Tab Metformin 500mg BD', '- Salt restricted diet, regular BP monitoring'] },
    ],
  });

  await generatePdf({
    fileName: 'ramesh_current_opd_note_2026.pdf',
    patientName: 'Ramesh Kumar (65M)',
    patientAbha: 'ramesh.k@abdm',
    hospitalName: 'Government General Hospital Chennai - Kiosk OPD Intake',
    docTitle: 'Clinical Consultation Intake Note',
    date: '2026-09-01',
    sections: [
      { title: 'Patient Reported Chief Complaints', text: ['- Patient reports retrosternal chest tightness for the past 2 days, radiating to left shoulder.', '- Triggered by walking fast or climbing stairs, lasting 10-15 minutes.', '- Relieved by resting in sitting position. Accompanied by profuse sweating and dyspnea.'] },
      { title: 'Vitals at Intake', text: ['BP: 148/92 mmHg | HR: 84 bpm | SpO2: 97% | Temp: 98.4 F'] },
      { title: 'Plan & Recommendations', text: ['- Immediate STAT 12-lead ECG and Serum Troponin-T assessment.', '- Cardiology consultation for evaluation of stable vs unstable angina.'] },
    ],
  });

  // 2. RAJESH KUMAR SHARMA (5 Documents - Longitudinal HbA1c Case)
  await generatePdf({
    fileName: 'rajesh_lab_hba1c_2025_09.pdf',
    patientName: 'Rajesh Kumar Sharma (52M)',
    patientAbha: 'rajesh.sharma@abdm',
    hospitalName: 'Max Super Speciality Hospital Delhi - Endocrinology Lab',
    docTitle: 'Routine Glycemic Monitoring Lab Report (1 Year Ago)',
    date: '2025-09-15',
    sections: [
      { title: 'Glycated Hemoglobin (HbA1c)', text: ['HbA1c: 7.2 %  (Target for adult diabetic: <7.0%) [MODERATELY ELEVATED]', 'Estimated Average Glucose (eAG): 160 mg/dL'] },
      { title: 'Fasting & Post-Prandial Plasma Glucose', text: ['Fasting Plasma Glucose: 134 mg/dL (Ref: 70-100 mg/dL)', 'Post-Prandial Glucose (2h): 178 mg/dL (Ref: <140 mg/dL)'] },
      { title: 'Clinical Impression', text: ['Mild glycemic excursion. Continue current oral hypoglycemic agent (Metformin 500mg BD).'] },
    ],
  });

  await generatePdf({
    fileName: 'rajesh_lab_hba1c_2026_03.pdf',
    patientName: 'Rajesh Kumar Sharma (53M)',
    patientAbha: 'rajesh.sharma@abdm',
    hospitalName: 'Max Super Speciality Hospital Delhi - Endocrinology Lab',
    docTitle: '6-Month Follow-up Glycemic Profile',
    date: '2026-03-10',
    sections: [
      { title: 'Glycated Hemoglobin (HbA1c)', text: ['HbA1c: 8.4 %  (Previous: 7.2%) [UNCONTROLLED / WORSENING]', 'Estimated Average Glucose (eAG): 194 mg/dL'] },
      { title: 'Fasting & Post-Prandial Plasma Glucose', text: ['Fasting Plasma Glucose: 152 mg/dL', 'Post-Prandial Glucose (2h): 215 mg/dL'] },
      { title: 'Clinical Note', text: ['Glycemic control deteriorating. Dose escalation of Metformin SR to 1000mg BD recommended. Add Sulfonylurea.'] },
    ],
  });

  await generatePdf({
    fileName: 'rajesh_lab_hba1c_2026_08.pdf',
    patientName: 'Rajesh Kumar Sharma (53M)',
    patientAbha: 'rajesh.sharma@abdm',
    hospitalName: 'Max Super Speciality Hospital Delhi - Endocrinology Lab',
    docTitle: 'Current Comprehensive Glycemic Panel',
    date: '2026-08-25',
    sections: [
      { title: 'Glycated Hemoglobin (HbA1c)', text: ['HbA1c: 8.9 %  (Trend: 7.2% -> 8.4% -> 8.9%) [HIGHLY ELEVATED]', 'Estimated Average Glucose (eAG): 209 mg/dL'] },
      { title: 'Plasma Glucose', text: ['Fasting Plasma Glucose: 168 mg/dL', 'Post-Prandial Plasma Glucose: 242 mg/dL'] },
      { title: 'Lipid & Renal Profile', text: ['Total Cholesterol: 228 mg/dL | LDL: 152 mg/dL | Triglycerides: 210 mg/dL', 'Serum Creatinine: 1.1 mg/dL | Urine Microalbumin: 45 mg/L (Microalbuminuria present)'] },
    ],
  });

  await generatePdf({
    fileName: 'rajesh_prescription_2026.pdf',
    patientName: 'Rajesh Kumar Sharma (53M)',
    patientAbha: 'rajesh.sharma@abdm',
    hospitalName: 'Max Super Speciality Hospital Delhi - OPD',
    docTitle: 'Endocrinology & Internal Medicine OPD Prescription',
    date: '2026-08-28',
    sections: [
      { title: 'Diagnosis', text: ['Uncontrolled Type 2 Diabetes Mellitus (HbA1c 8.9%), Essential Hypertension, Mixed Dyslipidemia.'] },
      { title: 'Rx - Prescribed Medications', text: [
        '1. Tab. Metformin SR 1000 mg -- 1 tab BD (After Breakfast & Dinner)',
        '2. Tab. Glimepiride 2 mg -- 1 tab OD (Before Breakfast)',
        '3. Tab. Amlodipine 5 mg -- 1 tab OD (Morning)',
        '4. Tab. Atorvastatin 20 mg -- 1 tab HS (At Bedtime)'
      ] },
      { title: 'Special Advice', text: ['Strict diabetic diet, cut refined sugars. Home Blood Glucose Monitoring (HBGM) 3x/week. Review with glucose log in 4 weeks.'] },
    ],
  });

  await generatePdf({
    fileName: 'rajesh_consultation_note_2026.pdf',
    patientName: 'Rajesh Kumar Sharma (53M)',
    patientAbha: 'rajesh.sharma@abdm',
    hospitalName: 'Max Super Speciality Hospital Delhi',
    docTitle: 'Endocrinology Follow-up Clinical Consultation Note',
    date: '2026-09-02',
    sections: [
      { title: 'Clinical Assessment', text: ['53yo male with progressive hyperglycemia despite dual OAD therapy. Reports increased fatigability and nocturia (2-3 times/night). BP well-controlled on Amlodipine 5mg (128/82 mmHg).'] },
      { title: 'Longitudinal Trend Analysis', text: ['HbA1c progression over past 12 months: 7.2% (Sep 2025) -> 8.4% (Mar 2026) -> 8.9% (Aug 2026). Indicates therapeutic failure on dual oral regimen.'] },
      { title: 'Impression & Next Steps', text: ['If HbA1c remains >8.5% at next 1-month check, initiate Teneligliptin 20mg OD or basal Insulin Glargine at bedtime.'] },
    ],
  });

  // 3. MEENA SUNDARAM (3 AYUSH Documents)
  await generatePdf({
    fileName: 'meena_ayurveda_consultation_2025.pdf',
    patientName: 'Meena Sundaram (48F)',
    patientAbha: 'meena.sundaram@abdm',
    hospitalName: 'Aravind Ayurveda Hospital & Research Center Madurai',
    docTitle: 'Ayurveda Initial OPD Consultation Record',
    date: '2025-10-12',
    sections: [
      { title: 'Roga Pariksha (Disease Assessment)', text: ['Chief Complaint: Agnimandya (digestive impairment), Anaha (flatulence/bloating), Anidra (disturbed sleep). Duration: 6 months.'] },
      { title: 'Doshik Imbalance (Vikriti)', text: ['Vata-Kafaja Agnimandya with Samana Vayu Dushti and Kledaka Kapha Vriddhi.'] },
      { title: 'Chikitsa Sutra & Shamana Aushadhi', text: [
        '1. Hingvashtaka Churna -- 3g BD with warm water before meals',
        '2. Abhayarishta -- 15ml BD with equal water after meals',
        '3. Manasamitra Vatakam -- 1 tab HS with lukewarm milk for sleep'
      ] },
    ],
  });

  await generatePdf({
    fileName: 'meena_dashavidha_pariksha_2026.pdf',
    patientName: 'Meena Sundaram (49F)',
    patientAbha: 'meena.sundaram@abdm',
    hospitalName: 'Aravind Ayurveda Hospital & Research Center Madurai',
    docTitle: 'Dashavidha Pariksha Comprehensive AYUSH Assessment',
    date: '2026-02-18',
    sections: [
      { title: 'Tenfold Assessment (Dashavidha Pariksha)', text: [
        '1. Dushtyam (Tissues affected): Rasa & Medo Dhatu',
        '2. Desha (Habitat/Body site): Sadharana Desha / Koshtha',
        '3. Bala (Physical strength): Madhyama Bala',
        '4. Kala (Season/Time): Shishira Ritu',
        '5. Anala / Agni (Digestive fire): Manda Agni (Sluggish)',
        '6. Prakriti (Constitution): Vata-Pitta Prakriti',
        '7. Vaya (Age): Madhyama Vaya (49 yrs)',
        '8. Sattva (Mental stamina): Madhyama Sattva',
        '9. Satmya (Habituation): Sarva Rasa Satmya',
        '10. Ahara Shakti (Digestive capacity): Abhyavaharana Shakti - Madhyama, Jarana Shakti - Manda'
      ] },
      { title: 'Koshtha & Vihara Pariksha', text: ['Koshtha: Krura Koshtha (tendency for constipation). Nidana: Irregular meal timings & excessive dry food. Samprapti: Vata obstruction in Annavaha Srotas.'] },
    ],
  });

  await generatePdf({
    fileName: 'meena_ayurveda_followup_2026.pdf',
    patientName: 'Meena Sundaram (49F)',
    patientAbha: 'meena.sundaram@abdm',
    hospitalName: 'Aravind Ayurveda Hospital & Research Center Madurai',
    docTitle: 'Ayurvedic Follow-up Clinical Record & Pathya Advice',
    date: '2026-08-14',
    sections: [
      { title: 'Clinical Progress (Lakshana Shanti)', text: ['- Agni improved; bloating reduced by 60%. Sleep quality moderately improved (6 hours continuous sleep).', '- Bowel habits regularized to 1-2 times daily.'] },
      { title: 'Revised Chikitsa Plan', text: [
        '1. Drakshasava -- 20ml BD post-meals',
        '2. Triphala Churna -- 5g at bedtime with warm water',
        '3. Continue Manasamitra Vatakam at bedtime'
      ] },
      { title: 'Pathya-Apathya (Diet & Lifestyle Rules)', text: ['Pathya: Warm freshly cooked food, Cow ghee, Buttermilk with Jeera. Apathya: Cold drinks, night awakenings, stale food.'] },
    ],
  });

  // 4. VIKRAMADITYA SINGH (4 Documents)
  await generatePdf({
    fileName: 'vikramaditya_historical_rx_2023.pdf',
    patientName: 'Vikramaditya Singh (76M)',
    patientAbha: 'vikramaditya.singh@abdm',
    hospitalName: 'Fortis Escorts Hospital Jaipur - OPD',
    docTitle: 'Historical Outpatient Prescription - Geriatric Medicine',
    date: '2023-04-10',
    sections: [
      { title: 'Clinical Diagnoses', text: ['1. Long-standing Essential Hypertension (12+ yrs)', '2. Type 2 Diabetes Mellitus', '3. Bilateral Knee Osteoarthritis'] },
      { title: 'Prescribed Medications (2023)', text: [
        '1. Tab Amlodipine 5 mg -- 1 OD',
        '2. Tab Telmisartan 40 mg -- 1 OD',
        '3. Tab Metformin 500 mg -- 1 BD'
      ] },
    ],
  });

  await generatePdf({
    fileName: 'vikramaditya_current_rx_2026.pdf',
    patientName: 'Vikramaditya Singh (79M)',
    patientAbha: 'vikramaditya.singh@abdm',
    hospitalName: 'Fortis Escorts Hospital Jaipur - Geriatric Clinic',
    docTitle: 'Current Active Prescription & Medication Reconciliation',
    date: '2026-08-30',
    sections: [
      { title: 'Active Medications', text: [
        '1. Tab Telmisartan 40 mg -- 1 OD Morning (Hypertension)',
        '2. Tab Metformin 500 mg -- 1 BD with meals (Diabetes)',
        '3. Tab Glimepiride 1 mg -- 1 OD Morning (Added 2025 for glycemic control)',
        '4. Tab Paracetamol 650 mg -- 1 PRN for severe knee pain',
        '5. Tab Glucosamine Sulfate 1500 mg -- 1 OD (Joint health)'
      ] },
      { title: 'Discontinued / Deprescribed Medications', text: ['- Tab Amlodipine 5 mg: DISCONTINUED due to pedal edema in Jan 2025. Substituted with Telmisartan monotherapy.'] },
    ],
  });

  await generatePdf({
    fileName: 'vikramaditya_lab_report_2026.pdf',
    patientName: 'Vikramaditya Singh (79M)',
    patientAbha: 'vikramaditya.singh@abdm',
    hospitalName: 'Dr. Lal PathLabs Jaipur',
    docTitle: 'Geriatric Laboratory Evaluation (HbA1c & Renal Panel)',
    date: '2026-07-15',
    sections: [
      { title: 'Biochemistry & Glycemic Parameters', text: ['HbA1c: 7.9 % (Ref: <7.0%)', 'Fasting Blood Sugar: 146 mg/dL', 'Post Prandial Blood Sugar: 202 mg/dL'] },
      { title: 'Renal & Electrolyte Profile', text: ['Serum Creatinine: 1.25 mg/dL (Ref: 0.7 - 1.3 mg/dL)', 'eGFR: 58 mL/min/1.73m2 (Mildly decreased)', 'Serum Sodium: 138 mEq/L | Serum Potassium: 4.4 mEq/L'] },
    ],
  });

  await generatePdf({
    fileName: 'vikramaditya_ortho_note_2026.pdf',
    patientName: 'Vikramaditya Singh (79M)',
    patientAbha: 'vikramaditya.singh@abdm',
    hospitalName: 'Fortis Escorts Hospital Jaipur - Orthopedics OPD',
    docTitle: 'Orthopedic Consultation Note - Degenerative Joint Disease',
    date: '2026-08-05',
    sections: [
      { title: 'Examination Findings', text: ['Bilateral crepitus in knee joints, right > left. Joint space narrowing Grade III on X-ray. Range of motion: 0-110 degrees with end-range pain.'] },
      { title: 'Management & Advice', text: ['Quadriceps strengthening exercises, heat therapy. Avoid squatting and cross-legged sitting. Intra-articular Hyaluronic Acid injection recommended if pain unmanaged by Paracetamol.'] },
    ],
  });

  // 5. OTHER PATIENTS (8 Documents)

  // Suresh Velu - Handwritten PNG
  generateHandwrittenPng('suresh_handwritten_prescription.png');

  // Priya Ramanathan - Pediatric Growth Card PDF
  await generatePdf({
    fileName: 'priya_pediatric_growth_card.pdf',
    patientName: 'Priya Ramanathan (6F)',
    patientAbha: 'priya.ramanathan@abdm',
    hospitalName: 'Child Trust Hospital Chennai - Pediatrics',
    docTitle: 'Pediatric Growth & Immunization Tracking Record',
    date: '2026-06-20',
    sections: [
      { title: 'Anthropometric Growth Parameters', text: ['Age: 6 Years | Height: 114 cm (50th percentile) | Weight: 19.5 kg (45th percentile) | BMI: 15.0 kg/m2'] },
      { title: 'Vaccination History', text: ['DPT Booster 2: Completed | OPV Booster: Completed | MMR Dose 2: Completed | Typhoid Conjugate: Completed'] },
      { title: 'Pediatrician Note', text: ['Growth parameters normal on WHO growth chart. Healthy development. Deworming syrup advised.'] },
    ],
  });

  // Sunita Devi Patel - USG Abdomen Gallstones PDF
  await generatePdf({
    fileName: 'sunita_usg_abdomen_report.pdf',
    patientName: 'Sunita Devi Patel (42F)',
    patientAbha: 'sunita.patel@abdm',
    hospitalName: 'Apollo Diagnostics Ahmedabad',
    docTitle: 'Ultrasonography Whole Abdomen Report',
    date: '2026-07-28',
    sections: [
      { title: 'Gallbladder Examination', text: ['Gallbladder is distended with normal wall thickness (2.2 mm). Multiple echogenic calculi noted in lumen, largest measuring 8.5 mm with acoustic shadowing. No pericholecystic fluid.'] },
      { title: 'Other Abdominal Viscera', text: ['Liver: Normal size (13.2 cm) and echo texture. No focal lesion.', 'Kidneys & Spleen: Normal contours and echo architecture.'] },
      { title: 'Diagnostic Impression', text: ['Cholelithiasis (Multiple Gallstones without acute cholecystitis). Surgical consult advised for elective laparoscopic cholecystectomy.'] },
    ],
  });

  // Lakshmi Narasimhan - Thyroid & HTN OPD Rx PDF
  await generatePdf({
    fileName: 'lakshmi_opd_prescription_2026.pdf',
    patientName: 'Lakshmi Narasimhan (55F)',
    patientAbha: 'lakshmi.narasimhan@abdm',
    hospitalName: 'SIMS Hospital Chennai - Endocrinology OPD',
    docTitle: 'Hypothyroidism & Hypertension Consultation Prescription',
    date: '2026-08-01',
    sections: [
      { title: 'Clinical Diagnostics', text: ['1. Primary Hypothyroidism (TSH 6.8 mIU/L on current dose)', '2. Grade 1 Essential Hypertension (BP 136/84 mmHg)'] },
      { title: 'Prescriptions', text: [
        '1. Tab Thyronorm 75 mcg -- 1 tab OD early morning empty stomach (30 mins before tea)',
        '2. Tab Amlodipine 5 mg -- 1 tab OD morning after breakfast'
      ] },
    ],
  });

  // Karthik Subburaj - Gastro Referral Note PDF
  await generatePdf({
    fileName: 'karthik_gastro_referral.pdf',
    patientName: 'Karthik Subburaj (34M)',
    patientAbha: 'karthik.subburaj@abdm',
    hospitalName: 'MIOT International Hospital Chennai',
    docTitle: 'Specialist Referral Note - Gastroenterology',
    date: '2026-08-19',
    sections: [
      { title: 'Reason for Referral', text: ['34yo male presenting with persistent retrosternal burning pain (GERD) and postprandial fullness refractory to 4 weeks of OTC Antacids and PPIs.'] },
      { title: 'Clinical History', text: ['No alarm symptoms (no dysphagia, weight loss, or hematemesis). H. pylori stool antigen test requested. Advice upper GI endoscopy if symptoms persist beyond 2 weeks.'] },
    ],
  });

  // Kavita R. Gupta - Anemia CBC Lab PDF
  await generatePdf({
    fileName: 'kavita_cbc_anemia_panel.pdf',
    patientName: 'Kavita R. Gupta (31F)',
    patientAbha: 'kavita.gupta@abdm',
    hospitalName: 'Quest Diagnostics Mumbai',
    docTitle: 'Complete Blood Count & Iron Studies Panel',
    date: '2026-07-02',
    sections: [
      { title: 'Complete Blood Count (CBC)', text: [
        'Hemoglobin (Hb): 9.4 g/dL (Ref: 12.0 - 15.0 g/dL) [LOW]',
        'RBC Count: 3.8 x10^6/uL (Ref: 4.0 - 5.2 x10^6/uL)',
        'MCV: 71 fL (Ref: 80 - 100 fL) [MICROCYTIC]',
        'MCH: 22 pg (Ref: 27 - 33 pg) [HYPOCHROMIC]'
      ] },
      { title: 'Iron Studies', text: ['Serum Ferritin: 11 ng/mL (Ref: 15 - 150 ng/mL) [LOW]', 'Serum Iron: 38 ug/dL (Ref: 60 - 170 ug/dL)'] },
      { title: 'Impression', text: ['Microcytic Hypochromic Anemia secondary to Iron Deficiency. Oral Iron supplementation (Ferrous Ascorbate 100mg) recommended.'] },
    ],
  });

  // Robert D'Souza - Fatty Liver USG PDF
  await generatePdf({
    fileName: 'robert_usg_fatty_liver.pdf',
    patientName: 'Robert D\'Souza (50M)',
    patientAbha: 'robert.dsouza@abdm',
    hospitalName: 'Manipal Hospital Goa - Radiology Dept',
    docTitle: 'Ultrasonography Abdomen & Pelvis Report',
    date: '2026-05-18',
    sections: [
      { title: 'Hepato-biliary Ultrasound', text: ['Liver is enlarged in size measuring 16.4 cm. Diffuse increase in parenchymal echogenicity with posterior attenuation. Intrahepatic vascular margins partially obscured.'] },
      { title: 'Diagnostic Impression', text: ['Grade II Hepatic Steatosis (Moderate Fatty Liver Disease). No focal liver mass. Gallbladder and pancreas appear normal. Lifestyle modification and lipid evaluation advised.'] },
    ],
  });

  // Ananya Sengupta - Discharge Summary PDF
  await generatePdf({
    fileName: 'ananya_discharge_summary.pdf',
    patientName: 'Ananya Sengupta (38F)',
    patientAbha: 'ananya.sengupta@abdm',
    hospitalName: 'Manipal Hospital Bengaluru',
    docTitle: 'Inpatient Hospital Discharge Summary',
    date: '2024-11-22',
    sections: [
      { title: 'Admission Details', text: ['Admission Date: 2024-11-18 | Discharge Date: 2024-11-22', 'Diagnosis: Acute Cervical Radiculopathy (C6-C7) with Muscle Spasm'] },
      { title: 'Hospital Course & Treatment', text: ['Admitted with severe neck pain radiating to right arm. Treated conservatively with IV Analgesics, Muscle Relaxants, cervical traction, and physiotherapy. MRI Cervical Spine showed C6-C7 disc bulge. Pain intensity reduced significantly from 8/10 to 2/10.'] },
      { title: 'Discharge Advice', text: ['1. Tab Pregabalin 75mg HS for 14 days', '2. Tab Myoril 4mg BD for 5 days', '3. Cervical collar during travel. Avoid heavy lifting.'] },
    ],
  });

  console.log('Successfully generated all 24 synthetic document files!');
}

main().catch(err => {
  console.error('Error generating documents:', err);
  process.exit(1);
});
