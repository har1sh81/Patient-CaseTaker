import { PDFDocument, rgb, StandardFonts, StandardFonts as Fonts } from 'pdf-lib';
import { ClinicalConsultationSummary, SummaryMedicationItem, SummaryLabItem, SummaryHistoryItem } from '@/types/summary.types';

// Color palette
const COLORS = {
  primary: rgb(0.08, 0.38, 0.74),      // #1565C0 - Primary Blue
  primaryLight: rgb(0.85, 0.92, 1.0),   // Light blue tint
  success: rgb(0.15, 0.56, 0.27),       // #27AE60 - Green
  successLight: rgb(0.9, 0.96, 0.9),    // Light green tint
  warning: rgb(0.8, 0.5, 0.1),          // #CC8800 - Orange
  warningLight: rgb(1.0, 0.95, 0.85),   // Light orange tint
  danger: rgb(0.8, 0.2, 0.2),           // #CC3333 - Red
  dangerLight: rgb(1.0, 0.9, 0.9),      // Light red tint
  text: rgb(0.1, 0.1, 0.1),            // Near black
  textSecondary: rgb(0.3, 0.3, 0.3),   // Dark gray
  textMuted: rgb(0.5, 0.5, 0.5),       // Medium gray
  border: rgb(0.8, 0.85, 0.92),        // Light blue border
  surface: rgb(0.97, 0.98, 1.0),       // Very light blue
  white: rgb(1, 1, 1),
  black: rgb(0, 0, 0),
};

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

function getSourceBadge(source: string): string {
  switch (source) {
    case 'abdm': return '[ABDM]';
    case 'patient': return '[Patient]';
    case 'document': return '[Document]';
    case 'ai_extraction': return '[AI]';
    case 'demo_data': return '[Demo]';
    default: return `[${source}]`;
  }
}

export async function generateClinicalSummaryPDFBuffer(summary: ClinicalConsultationSummary): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
  const { width, height } = page.getSize();
  const margin = 45;
  const contentWidth = width - margin * 2;
  let y = height - margin;

  // Helper: Check if we need a new page
  const checkPageBreak = (neededHeight: number) => {
    if (y - neededHeight < margin + 60) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - margin;
      drawHeader();
    }
  };

  // Helper: Draw section header
  const drawSectionHeader = (title: string, color: typeof COLORS.primary) => {
    checkPageBreak(40);
    page.drawRectangle({
      x: margin,
      y: y - 24,
      width: contentWidth,
      height: 24,
      color: color,
    });
    page.drawText(title, {
      x: margin + 10,
      y: y - 17,
      size: 10,
      font: fontBold,
      color: COLORS.white,
    });
    y -= 32;
  };

  // Helper: Draw label-value pair
  const drawFieldValue = (label: string, value: string, x: number, yPos: number, maxWidth: number = 200) => {
    page.drawText(`${label}:`, {
      x,
      y: yPos,
      size: 8,
      font: fontBold,
      color: COLORS.textSecondary,
    });
    const labelTextWidth = fontBold.widthOfTextAtSize(`${label}:`, 8);
    page.drawText(cleanText(value) || 'N/A', {
      x: x + labelTextWidth + 5,
      y: yPos,
      size: 9,
      font: fontRegular,
      color: COLORS.text,
    });
  };

  // Helper: Draw a row in a table
  const drawTableRow = (cells: string[], x: number, yPos: number, widths: number[], isHeader: boolean = false) => {
    const font = isHeader ? fontBold : fontRegular;
    const color = isHeader ? COLORS.white : COLORS.text;
    const bgColor = isHeader ? COLORS.primary : undefined;

    if (bgColor) {
      page.drawRectangle({
        x,
        y: yPos - 4,
        width: widths.reduce((a, b) => a + b, 0),
        height: 16,
        color: bgColor,
      });
    }

    let xPos = x;
    cells.forEach((cell, i) => {
      page.drawText(cleanText(cell), {
        x: xPos + 4,
        y: yPos,
        size: 8,
        font,
        color,
      });
      xPos += widths[i];
    });
  };

  // ============================================
  // HEADER
  // ============================================
  const drawHeader = () => {
    // Top blue bar
    page.drawRectangle({
      x: margin,
      y: y - 40,
      width: contentWidth,
      height: 40,
      color: COLORS.primary,
    });

    // Title
    page.drawText('CLINICAL CONSULTATION SUMMARY', {
      x: margin + 12,
      y: y - 18,
      size: 14,
      font: fontBold,
      color: COLORS.white,
    });

    // Subtitle
    page.drawText('MediKiosk Smart Clinical Intake System', {
      x: margin + 12,
      y: y - 32,
      size: 8,
      font: fontOblique,
      color: rgb(0.7, 0.85, 1.0),
    });

    // Reference number
    page.drawText(`REF: ${cleanText(summary.reference.referenceNumber)}`, {
      x: width - margin - 120,
      y: y - 18,
      size: 10,
      font: fontBold,
      color: COLORS.white,
    });

    page.drawText(`Date: ${summary.visit.generatedDate}`, {
      x: width - margin - 120,
      y: y - 32,
      size: 8,
      font: fontRegular,
      color: rgb(0.7, 0.85, 1.0),
    });

    y -= 50;
  };

  drawHeader();

  // ============================================
  // PATIENT CONFIRMATION BADGE
  // ============================================
  checkPageBreak(30);
  const badgeColor = summary.patientConfirmation.confirmedByPatient ? COLORS.success : COLORS.warning;
  const badgeBg = summary.patientConfirmation.confirmedByPatient ? COLORS.successLight : COLORS.warningLight;
  
  page.drawRectangle({
    x: margin,
    y: y - 22,
    width: contentWidth,
    height: 22,
    color: badgeBg,
    borderColor: badgeColor,
    borderWidth: 1,
  });

  page.drawText(cleanText(summary.patientConfirmation.badgeText), {
    x: margin + 10,
    y: y - 15,
    size: 9,
    font: fontBold,
    color: badgeColor,
  });

  page.drawText(cleanText(summary.patientConfirmation.statusText), {
    x: margin + 250,
    y: y - 15,
    size: 9,
    font: fontRegular,
    color: badgeColor,
  });

  y -= 30;

  // ============================================
  // PATIENT INFORMATION CARD
  // ============================================
  checkPageBreak(80);
  
  page.drawRectangle({
    x: margin,
    y: y - 75,
    width: contentWidth,
    height: 75,
    color: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
  });

  // Section title
  page.drawText('PATIENT INFORMATION', {
    x: margin + 10,
    y: y - 14,
    size: 9,
    font: fontBold,
    color: COLORS.primary,
  });

  // Row 1
  drawFieldValue('Patient Name', summary.patient.fullName, margin + 10, y - 30, 180);
  drawFieldValue('Age/Gender', `${summary.patient.age || 'N/A'} yrs / ${summary.patient.gender || 'N/A'}`, margin + 280, y - 30);

  // Row 2
  drawFieldValue('Hospital ID', summary.patient.hospitalNumber || 'N/A', margin + 10, y - 46, 180);
  drawFieldValue('ABHA Ref', summary.patient.abhaReference || 'N/A', margin + 280, y - 46);

  // Row 3
  drawFieldValue('Intake Date', summary.visit.generatedDate, margin + 10, y - 62, 180);
  drawFieldValue('Department', summary.visit.departmentMode === 'ayush' ? 'AYUSH (Ayurveda)' : 'General Medicine', margin + 280, y - 62);

  y -= 85;

  // ============================================
  // SECTION 1: CHIEF COMPLAINT & HPI
  // ============================================
  drawSectionHeader('CHIEF COMPLAINT & HISTORY OF PRESENT ILLNESS', COLORS.primary);

  // Chief complaint
  checkPageBreak(60);
  page.drawText('Primary Complaint:', {
    x: margin + 10,
    y: y - 10,
    size: 9,
    font: fontBold,
    color: COLORS.text,
  });
  page.drawText(cleanText(summary.chiefComplaint.primaryComplaint), {
    x: margin + 100,
    y: y - 10,
    size: 10,
    font: fontBold,
    color: COLORS.primary,
  });

  if (summary.chiefComplaint.duration) {
    page.drawText(`Duration: ${cleanText(summary.chiefComplaint.duration)}`, {
      x: margin + 350,
      y: y - 10,
      size: 9,
      font: fontRegular,
      color: COLORS.textSecondary,
    });
  }
  y -= 20;

  if (summary.chiefComplaint.severity) {
    page.drawText(`Severity: ${cleanText(summary.chiefComplaint.severity)}`, {
      x: margin + 10,
      y: y - 10,
      size: 9,
      font: fontRegular,
      color: COLORS.textSecondary,
    });
    y -= 16;
  }

  if (summary.chiefComplaint.patientWords) {
    page.drawText(`Patient's Words: "${cleanText(summary.chiefComplaint.patientWords)}"`, {
      x: margin + 10,
      y: y - 10,
      size: 9,
      font: fontOblique,
      color: COLORS.textSecondary,
    });
    y -= 18;
  }

  // HPI Details
  const hpiFields = [
    { label: 'Onset', value: summary.hpi.onset },
    { label: 'Location', value: summary.hpi.location },
    { label: 'Character', value: summary.hpi.character },
    { label: 'Duration', value: summary.hpi.duration },
    { label: 'Progression', value: summary.hpi.progression },
    { label: 'Aggravating Factors', value: summary.hpi.aggravatingFactors || summary.hpi.aggravatingRelieving },
    { label: 'Relieving Factors', value: summary.hpi.relievingFactors },
    { label: 'Associated Symptoms', value: summary.hpi.associatedSymptoms },
    { label: 'Previous Treatments', value: summary.hpi.previousTreatments },
  ];

  const nonEmptyHpi = hpiFields.filter(f => f.value);
  if (nonEmptyHpi.length > 0) {
    page.drawText('History of Present Illness:', {
      x: margin + 10,
      y: y - 10,
      size: 9,
      font: fontBold,
      color: COLORS.text,
    });
    y -= 16;

    nonEmptyHpi.forEach(field => {
      checkPageBreak(16);
      page.drawText(`${field.label}: ${cleanText(field.value)}`, {
        x: margin + 20,
        y: y - 8,
        size: 8,
        font: fontRegular,
        color: COLORS.textSecondary,
      });
      y -= 14;
    });
  }

  y -= 10;

  // ============================================
  // SECTION 2: PAST MEDICAL HISTORY
  // ============================================
  drawSectionHeader('PAST MEDICAL HISTORY', COLORS.primary);

  checkPageBreak(40);
  if (summary.relevantPreviousHistory.length > 0) {
    summary.relevantPreviousHistory.forEach(item => {
      checkPageBreak(18);
      page.drawText(`• ${cleanText(item.conditionName)}`, {
        x: margin + 15,
        y: y - 10,
        size: 9,
        font: fontRegular,
        color: COLORS.text,
      });

      const srcBadge = getSourceBadge(item.source);
      page.drawText(srcBadge, {
        x: margin + 350,
        y: y - 10,
        size: 7,
        font: fontRegular,
        color: COLORS.textMuted,
      });

      if (item.status) {
        page.drawText(`(${item.status})`, {
          x: margin + 400,
          y: y - 10,
          size: 7,
          font: fontOblique,
          color: COLORS.textMuted,
        });
      }

      y -= 15;
    });
  } else {
    page.drawText('No relevant previous medical history reported.', {
      x: margin + 15,
      y: y - 10,
      size: 9,
      font: fontOblique,
      color: COLORS.textMuted,
    });
    y -= 16;
  }

  y -= 10;

  // ============================================
  // SECTION 3: CURRENT MEDICATIONS
  // ============================================
  drawSectionHeader('CURRENT MEDICATIONS', COLORS.primary);

  checkPageBreak(50);
  if (summary.medications.length > 0) {
    // Table header
    const medWidths = [150, 80, 80, 100, 80];
    drawTableRow(['Medication', 'Dose', 'Frequency', 'Source', 'Status'], margin + 10, y, medWidths, true);
    y -= 16;

    // Table rows
    summary.medications.forEach(med => {
      checkPageBreak(16);
      const srcBadge = getSourceBadge(med.source);
      const status = med.hasConflict ? 'CONFLICT' : (med.status || 'Active');
      
      drawTableRow([
        cleanText(med.medicationName),
        cleanText(med.dose) || '-',
        cleanText(med.frequency) || '-',
        srcBadge,
        status,
      ], margin + 10, y, medWidths);
      
      // Highlight conflicts
      if (med.hasConflict) {
        page.drawRectangle({
          x: margin + 10,
          y: y - 4,
          width: medWidths.reduce((a, b) => a + b, 0),
          height: 16,
          color: COLORS.dangerLight,
        });
        drawTableRow([
          cleanText(med.medicationName),
          cleanText(med.dose) || '-',
          cleanText(med.frequency) || '-',
          srcBadge,
          status,
        ], margin + 10, y, medWidths);
      }

      y -= 16;
    });

    // Conflict message if any
    const conflictMeds = summary.medications.filter(m => m.hasConflict && m.conflictMessage);
    if (conflictMeds.length > 0) {
      y -= 5;
      page.drawText('Medication Conflicts:', {
        x: margin + 15,
        y: y - 8,
        size: 8,
        font: fontBold,
        color: COLORS.danger,
      });
      y -= 14;
      conflictMeds.forEach(med => {
        page.drawText(`• ${cleanText(med.conflictMessage)}`, {
          x: margin + 25,
          y: y - 8,
          size: 8,
          font: fontOblique,
          color: COLORS.danger,
        });
        y -= 12;
      });
    }
  } else {
    page.drawText('No regular daily medications reported.', {
      x: margin + 15,
      y: y - 10,
      size: 9,
      font: fontOblique,
      color: COLORS.textMuted,
    });
    y -= 16;
  }

  y -= 10;

  // ============================================
  // SECTION 4: ALLERGIES
  // ============================================
  drawSectionHeader('ALLERGIES', COLORS.primary);

  checkPageBreak(40);
  if (summary.allergies.length > 0) {
    const allergyWidths = [150, 150, 150];
    drawTableRow(['Allergen', 'Reaction', 'Severity'], margin + 10, y, allergyWidths, true);
    y -= 16;

    summary.allergies.forEach(allergy => {
      checkPageBreak(16);
      drawTableRow([
        cleanText(allergy.allergen),
        cleanText(allergy.reaction) || '-',
        cleanText(allergy.severity) || '-',
      ], margin + 10, y, allergyWidths);
      y -= 16;
    });
  } else {
    page.drawText('No known allergies reported.', {
      x: margin + 15,
      y: y - 10,
      size: 9,
      font: fontOblique,
      color: COLORS.textMuted,
    });
    y -= 16;
  }

  y -= 10;

  // ============================================
  // SECTION 5: INVESTIGATIONS / LAB RESULTS
  // ============================================
  drawSectionHeader('INVESTIGATIONS & LAB RESULTS', COLORS.primary);

  checkPageBreak(40);
  if (summary.investigations.length > 0) {
    const labWidths = [120, 80, 60, 120, 80];
    drawTableRow(['Test', 'Value', 'Unit', 'Reference Range', 'Date'], margin + 10, y, labWidths, true);
    y -= 16;

    summary.investigations.forEach(lab => {
      checkPageBreak(16);
      drawTableRow([
        cleanText(lab.testName),
        cleanText(lab.value),
        cleanText(lab.unit) || '-',
        cleanText(lab.referenceRange) || '-',
        cleanText(lab.date) || '-',
      ], margin + 10, y, labWidths);
      y -= 16;
    });
  } else {
    page.drawText('No laboratory results available from uploaded documents.', {
      x: margin + 15,
      y: y - 10,
      size: 9,
      font: fontOblique,
      color: COLORS.textMuted,
    });
    y -= 16;
  }

  y -= 10;

  // ============================================
  // SECTION 6: FAMILY HISTORY
  // ============================================
  if (summary.familyHistory && summary.familyHistory.length > 0) {
    drawSectionHeader('FAMILY HISTORY', COLORS.primary);

    checkPageBreak(40);
    summary.familyHistory.forEach(item => {
      checkPageBreak(16);
      page.drawText(`• ${cleanText(item)}`, {
        x: margin + 15,
        y: y - 10,
        size: 9,
        font: fontRegular,
        color: COLORS.text,
      });
      y -= 15;
    });

    y -= 10;
  }

  // ============================================
  // SECTION 7: SOCIAL HISTORY
  // ============================================
  if (summary.socialHistory) {
    drawSectionHeader('SOCIAL HISTORY', COLORS.primary);

    checkPageBreak(60);
    const socialFields = [
      { label: 'Occupation', value: summary.socialHistory.occupation },
      { label: 'Smoking', value: summary.socialHistory.smoking },
      { label: 'Alcohol', value: summary.socialHistory.alcohol },
      { label: 'Exercise', value: summary.socialHistory.exercise },
      { label: 'Diet', value: summary.socialHistory.diet },
    ];

    const nonEmptySocial = socialFields.filter(f => f.value);
    if (nonEmptySocial.length > 0) {
      nonEmptySocial.forEach(field => {
        drawFieldValue(field.label, field.value || 'N/A', margin + 15, y - 10);
        y -= 16;
      });
    } else {
      page.drawText('No social history reported.', {
        x: margin + 15,
        y: y - 10,
        size: 9,
        font: fontOblique,
        color: COLORS.textMuted,
      });
      y -= 16;
    }

    y -= 10;
  }

  // ============================================
  // SECTION 8: MEDICAL TIMELINE
  // ============================================
  if (summary.medicalJourney && summary.medicalJourney.length > 0) {
    drawSectionHeader('MEDICAL TIMELINE', COLORS.primary);

    checkPageBreak(40);
    summary.medicalJourney.slice(0, 10).forEach(event => {
      checkPageBreak(20);
      
      // Date
      page.drawText(cleanText(event.date || 'Past'), {
        x: margin + 15,
        y: y - 8,
        size: 8,
        font: fontBold,
        color: COLORS.primary,
      });

      // Event title
      page.drawText(cleanText(event.title), {
        x: margin + 100,
        y: y - 8,
        size: 8,
        font: fontRegular,
        color: COLORS.text,
      });

      // Source
      if (event.provenance) {
        const srcBadge = getSourceBadge(event.provenance.source);
        page.drawText(srcBadge, {
          x: margin + 380,
          y: y - 8,
          size: 7,
          font: fontRegular,
          color: COLORS.textMuted,
        });
      }

      y -= 14;
    });

    y -= 10;
  }

  // ============================================
  // SECTION 9: UPLOADED DOCUMENTS
  // ============================================
  if (summary.uploadedDocuments && summary.uploadedDocuments.uploadedDocumentCount > 0) {
    drawSectionHeader('UPLOADED DOCUMENTS & EXTRACTED DATA', COLORS.primary);

    checkPageBreak(40);
    page.drawText(`Total Documents: ${summary.uploadedDocuments.uploadedDocumentCount}`, {
      x: margin + 15,
      y: y - 10,
      size: 9,
      font: fontRegular,
      color: COLORS.text,
    });
    y -= 16;

    // Extracted conditions
    if (summary.uploadedDocuments.extractedConditions && summary.uploadedDocuments.extractedConditions.length > 0) {
      page.drawText('Extracted Conditions from Documents:', {
        x: margin + 15,
        y: y - 10,
        size: 8,
        font: fontBold,
        color: COLORS.text,
      });
      y -= 14;

      summary.uploadedDocuments.extractedConditions.slice(0, 5).forEach((cond: any) => {
        checkPageBreak(14);
        page.drawText(`• ${cleanText(cond.name)}`, {
          x: margin + 25,
          y: y - 8,
          size: 8,
          font: fontRegular,
          color: COLORS.textSecondary,
        });
        y -= 12;
      });
    }

    // Lab results from documents
    if (summary.uploadedDocuments.laboratoryResults && summary.uploadedDocuments.laboratoryResults.length > 0) {
      page.drawText('Laboratory Results from Documents:', {
        x: margin + 15,
        y: y - 10,
        size: 8,
        font: fontBold,
        color: COLORS.text,
      });
      y -= 14;

      summary.uploadedDocuments.laboratoryResults.slice(0, 5).forEach((lab: any) => {
        checkPageBreak(14);
        page.drawText(`• ${cleanText(lab.testName)}: ${cleanText(lab.valueRaw)} ${cleanText(lab.unit) || ''}`, {
          x: margin + 25,
          y: y - 8,
          size: 8,
          font: fontRegular,
          color: COLORS.textSecondary,
        });
        y -= 12;
      });
    }

    y -= 10;
  }

  // ============================================
  // SECTION 10: CLINICAL ALERTS (RED FLAGS)
  // ============================================
  const activeFlags = summary.attentionFlags?.filter(f => f.status === 'active') || [];
  if (activeFlags.length > 0) {
    drawSectionHeader('CLINICAL ALERTS & RED FLAGS', COLORS.danger);

    checkPageBreak(40);
    activeFlags.forEach(flag => {
      checkPageBreak(24);
      
      const flagColor = flag.severity === 'critical' ? COLORS.danger : 
                        flag.severity === 'high' ? COLORS.warning : COLORS.textSecondary;

      page.drawRectangle({
        x: margin + 10,
        y: y - 18,
        width: contentWidth - 20,
        height: 18,
        color: flag.severity === 'critical' ? COLORS.dangerLight : COLORS.warningLight,
        borderColor: flagColor,
        borderWidth: 1,
      });

      page.drawText(`[${(flag.severity || 'INFO').toUpperCase()}]`, {
        x: margin + 15,
        y: y - 12,
        size: 7,
        font: fontBold,
        color: flagColor,
      });

      page.drawText(cleanText(flag.message), {
        x: margin + 70,
        y: y - 12,
        size: 8,
        font: fontRegular,
        color: COLORS.text,
      });

      y -= 22;
    });

    y -= 10;
  }

  // ============================================
  // SECTION 11: AYUSH (if applicable)
  // ============================================
  if (summary.ayush) {
    drawSectionHeader('AYUSH ASSESSMENT', COLORS.primary);

    checkPageBreak(80);
    const ayushFields = [
      { label: 'Prakriti (Constitution)', value: summary.ayush.prakriti },
      { label: 'Vikriti (Imbalance)', value: summary.ayush.vikriti },
      { label: 'Agni (Digestion)', value: summary.ayush.agni },
      { label: 'Koshtha (Bowel)', value: summary.ayush.koshtha },
    ];

    ayushFields.forEach(field => {
      if (field.value) {
        drawFieldValue(field.label, field.value, margin + 15, y - 10);
        y -= 16;
      }
    });

    if (summary.ayush.ahara && summary.ayush.ahara.length > 0) {
      page.drawText('Ahara (Diet):', {
        x: margin + 15,
        y: y - 10,
        size: 8,
        font: fontBold,
        color: COLORS.text,
      });
      y -= 14;
      summary.ayush.ahara.forEach(item => {
        page.drawText(`• ${cleanText(item)}`, {
          x: margin + 25,
          y: y - 8,
          size: 8,
          font: fontRegular,
          color: COLORS.textSecondary,
        });
        y -= 12;
      });
    }

    if (summary.ayush.vihara && summary.ayush.vihara.length > 0) {
      page.drawText('Vihara (Lifestyle):', {
        x: margin + 15,
        y: y - 10,
        size: 8,
        font: fontBold,
        color: COLORS.text,
      });
      y -= 14;
      summary.ayush.vihara.forEach(item => {
        page.drawText(`• ${cleanText(item)}`, {
          x: margin + 25,
          y: y - 8,
          size: 8,
          font: fontRegular,
          color: COLORS.textSecondary,
        });
        y -= 12;
      });
    }

    y -= 10;
  }

  // ============================================
  // SECTION 12: INFORMATION GAPS
  // ============================================
  if (summary.informationNotReported && summary.informationNotReported.length > 0) {
    drawSectionHeader('INFORMATION NOT REPORTED', COLORS.warning);

    checkPageBreak(40);
    summary.informationNotReported.forEach(info => {
      checkPageBreak(16);
      page.drawText(`• ${cleanText(info)}`, {
        x: margin + 15,
        y: y - 10,
        size: 8,
        font: fontRegular,
        color: COLORS.textSecondary,
      });
      y -= 14;
    });

    y -= 10;
  }

  // ============================================
  // PHYSICIAN SIGNATURE BLOCK
  // ============================================
  checkPageBreak(100);

  page.drawRectangle({
    x: margin,
    y: y - 90,
    width: contentWidth,
    height: 90,
    color: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
  });

  page.drawText('PHYSICIAN VERIFICATION', {
    x: margin + 10,
    y: y - 14,
    size: 9,
    font: fontBold,
    color: COLORS.primary,
  });

  // Signature line
  page.drawText('Physician Signature: ____________________________________', {
    x: margin + 10,
    y: y - 35,
    size: 9,
    font: fontRegular,
    color: COLORS.text,
  });

  page.drawText(`Date: _______________`, {
    x: margin + 350,
    y: y - 35,
    size: 9,
    font: fontRegular,
    color: COLORS.text,
  });

  // Comments
  page.drawText('Comments:', {
    x: margin + 10,
    y: y - 55,
    size: 9,
    font: fontBold,
    color: COLORS.text,
  });

  page.drawText('________________________________________________________________________________', {
    x: margin + 10,
    y: y - 70,
    size: 9,
    font: fontRegular,
    color: COLORS.textMuted,
  });

  page.drawText('________________________________________________________________________________', {
    x: margin + 10,
    y: y - 82,
    size: 9,
    font: fontRegular,
    color: COLORS.textMuted,
  });

  y -= 100;

  // ============================================
  // FOOTER (on all pages)
  // ============================================
  const pages = pdfDoc.getPages();
  pages.forEach((p, idx) => {
    // Footer line
    p.drawLine({
      start: { x: margin, y: 45 },
      end: { x: width - margin, y: 45 },
      thickness: 0.5,
      color: COLORS.border,
    });

    // Page number
    p.drawText(`Page ${idx + 1} of ${pages.length}`, {
      x: width / 2 - 30,
      y: 32,
      size: 8,
      font: fontRegular,
      color: COLORS.textMuted,
    });

    // Left footer
    p.drawText('Generated by MediKiosk Clinical Assistant System', {
      x: margin,
      y: 32,
      size: 7,
      font: fontRegular,
      color: COLORS.textMuted,
    });

    // Right footer
    p.drawText(`REF: ${cleanText(summary.reference.referenceNumber)}`, {
      x: width - margin - 120,
      y: 32,
      size: 7,
      font: fontRegular,
      color: COLORS.textMuted,
    });

    // Disclaimer
    p.drawText('CONFIDENTIAL - This report is generated for clinical use only. Patient confirmed.', {
      x: margin,
      y: 22,
      size: 6,
      font: fontOblique,
      color: COLORS.textMuted,
    });
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
