import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ClinicalConsultationSummary } from '@/types/summary.types';

function cleanText(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/✓/g, '[CONFIRMED]')
    .replace(/🗣/g, '[Patient]')
    .replace(/📄/g, '[Document]')
    .replace(/🏥/g, '[ABDM]')
    .replace(/•/g, '-')
    .replace(/[^\x00-\x7F]/g, '');
}

export async function generateClinicalSummaryPDFBuffer(summary: ClinicalConsultationSummary): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait size
  const { width, height } = page.getSize();
  const margin = 40;
  let y = height - margin;

  const drawHeader = () => {
    // Header Bar
    page.drawRectangle({
      x: margin,
      y: y - 35,
      width: width - margin * 2,
      height: 35,
      color: rgb(0.08, 0.38, 0.74), // Primary Blue #1565C0
    });

    page.drawText('MEDIKIOSK - CLINICAL CONSULTATION SUMMARY', {
      x: margin + 12,
      y: y - 24,
      size: 13,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(`REF: ${cleanText(summary.reference.referenceNumber)}`, {
      x: width - margin - 110,
      y: y - 24,
      size: 10,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    y -= 45;
  };

  drawHeader();

  // Confirmation Badge Header
  page.drawRectangle({
    x: margin,
    y: y - 22,
    width: width - margin * 2,
    height: 22,
    color: rgb(0.9, 0.96, 0.9), // Green tint
    borderColor: rgb(0.2, 0.6, 0.2),
    borderWidth: 1,
  });

  page.drawText(cleanText(`${summary.patientConfirmation.badgeText}   |   ${summary.patientConfirmation.statusText}`), {
    x: margin + 10,
    y: y - 15,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.5, 0.1),
  });

  y -= 32;

  // Patient Information Card Box
  page.drawRectangle({
    x: margin,
    y: y - 65,
    width: width - margin * 2,
    height: 65,
    color: rgb(0.97, 0.98, 1.0),
    borderColor: rgb(0.8, 0.85, 0.92),
    borderWidth: 1,
  });

  page.drawText('PATIENT IDENTIFICATION & INTAKE DETAILS', {
    x: margin + 10,
    y: y - 16,
    size: 9,
    font: fontBold,
    color: rgb(0.15, 0.2, 0.3),
  });

  page.drawText(`Patient Name: ${summary.patient.fullName}`, {
    x: margin + 10,
    y: y - 32,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText(`Age / Gender: ${summary.patient.age || 'N/A'} yrs / ${summary.patient.gender || 'N/A'}`, {
    x: margin + 260,
    y: y - 32,
    size: 9,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText(`Hospital ID: ${summary.patient.hospitalNumber}`, {
    x: margin + 10,
    y: y - 48,
    size: 9,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText(`ABHA Ref: ${summary.patient.abhaReference}`, {
    x: margin + 180,
    y: y - 48,
    size: 9,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText(`Intake Date: ${summary.visit.generatedDate}`, {
    x: margin + 350,
    y: y - 48,
    size: 9,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  y -= 75;

  const checkPageBreak = (neededHeight: number) => {
    if (y - neededHeight < margin + 40) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - margin;
      drawHeader();
    }
  };

  // Section 1: Current Complaint & HPI
  checkPageBreak(90);

  page.drawText('CURRENT COMPLAINT & PRESENT ILLNESS', {
    x: margin,
    y: y - 12,
    size: 11,
    font: fontBold,
    color: rgb(0.08, 0.38, 0.74),
  });
  page.drawLine({
    start: { x: margin, y: y - 16 },
    end: { x: width - margin, y: y - 16 },
    thickness: 1,
    color: rgb(0.08, 0.38, 0.74),
  });
  y -= 26;

  page.drawText(`Primary Complaint: ${summary.chiefComplaint.primaryComplaint}`, {
    x: margin,
    y: y - 10,
    size: 10,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(`Duration: ${summary.chiefComplaint.duration || 'Not reported'}`, {
    x: margin + 300,
    y: y - 10,
    size: 9,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 20;

  if (summary.chiefComplaint.patientWords) {
    page.drawText(`Patient's Own Words: "${summary.chiefComplaint.patientWords}"`, {
      x: margin,
      y: y - 10,
      size: 9,
      font: fontOblique,
      color: rgb(0.2, 0.2, 0.4),
    });
    y -= 18;
  }

  if (summary.hpi.associatedSymptoms) {
    page.drawText(`Associated Symptoms: ${summary.hpi.associatedSymptoms}`, {
      x: margin,
      y: y - 10,
      size: 9,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 18;
  }

  y -= 10;

  // Section 2: Relevant Previous History
  checkPageBreak(80);

  page.drawText('RELEVANT PREVIOUS MEDICAL HISTORY', {
    x: margin,
    y: y - 12,
    size: 11,
    font: fontBold,
    color: rgb(0.08, 0.38, 0.74),
  });
  page.drawLine({
    start: { x: margin, y: y - 16 },
    end: { x: width - margin, y: y - 16 },
    thickness: 1,
    color: rgb(0.08, 0.38, 0.74),
  });
  y -= 26;

  if (summary.relevantPreviousHistory.length > 0) {
    summary.relevantPreviousHistory.forEach(item => {
      checkPageBreak(18);
      page.drawText(cleanText(`- ${item.conditionName}`), {
        x: margin + 10,
        y: y - 10,
        size: 9,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      const srcTag = item.source === 'abdm' ? '[Source: ABDM]' : item.source === 'patient' ? '[Source: Patient]' : '[Source: Document]';
      page.drawText(srcTag, {
        x: margin + 250,
        y: y - 10,
        size: 8,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 16;
    });
  } else {
    page.drawText('No relevant previous medical history found for this complaint.', {
      x: margin + 10,
      y: y - 10,
      size: 9,
      font: fontOblique,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 18;
  }

  y -= 10;

  // Section 3: Medications
  checkPageBreak(80);

  page.drawText('CURRENT MEDICATIONS', {
    x: margin,
    y: y - 12,
    size: 11,
    font: fontBold,
    color: rgb(0.08, 0.38, 0.74),
  });
  page.drawLine({
    start: { x: margin, y: y - 16 },
    end: { x: width - margin, y: y - 16 },
    thickness: 1,
    color: rgb(0.08, 0.38, 0.74),
  });
  y -= 26;

  if (summary.medications.length > 0) {
    summary.medications.forEach(med => {
      checkPageBreak(18);
      page.drawText(cleanText(`- ${med.medicationName} ${med.dose || ''}`), {
        x: margin + 10,
        y: y - 10,
        size: 9,
        font: fontRegular,
        color: rgb(0.1, 0.1, 0.1),
      });
      const srcTag = med.source === 'abdm' ? '[Source: ABDM]' : med.source === 'patient' ? '[Source: Patient]' : '[Source: Document]';
      page.drawText(srcTag, {
        x: margin + 250,
        y: y - 10,
        size: 8,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 16;
    });
  } else {
    page.drawText('No regular daily medications reported.', {
      x: margin + 10,
      y: y - 10,
      size: 9,
      font: fontOblique,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 18;
  }

  y -= 10;

  // Section 4: Information Not Reported
  checkPageBreak(70);

  page.drawText('INFORMATION NOT REPORTED', {
    x: margin,
    y: y - 12,
    size: 11,
    font: fontBold,
    color: rgb(0.5, 0.3, 0.1),
  });
  page.drawLine({
    start: { x: margin, y: y - 16 },
    end: { x: width - margin, y: y - 16 },
    thickness: 1,
    color: rgb(0.8, 0.6, 0.3),
  });
  y -= 26;

  if (summary.informationNotReported.length > 0) {
    summary.informationNotReported.forEach(info => {
      checkPageBreak(16);
      page.drawText(`- ${info} (Not reported)`, {
        x: margin + 10,
        y: y - 10,
        size: 9,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 15;
    });
  } else {
    page.drawText('All standard intake fields were completed.', {
      x: margin + 10,
      y: y - 10,
      size: 9,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 16;
  }

  // Footer on all pages
  const pages = pdfDoc.getPages();
  pages.forEach((p, idx) => {
    p.drawText(`Page ${idx + 1} of ${pages.length}`, {
      x: width / 2 - 25,
      y: 20,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
    p.drawText('Generated by MediKiosk Clinical Assistant System — Patient Confirmed Report', {
      x: margin,
      y: 20,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
