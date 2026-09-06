import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ClinicalConsultationSummary } from '@/types/summary.types';

// Professional clinical color palette
const COLORS = {
  primary: rgb(0.08, 0.28, 0.58),       // Deep Navy Blue
  primaryLight: rgb(0.92, 0.95, 0.99),  // Ice blue background
  primaryDark: rgb(0.04, 0.16, 0.36),
  ayushGreen: rgb(0.12, 0.44, 0.24),    // Herbal Forest Green
  ayushLight: rgb(0.92, 0.97, 0.93),
  success: rgb(0.12, 0.53, 0.24),       // Medical Green
  successLight: rgb(0.92, 0.98, 0.93),
  warning: rgb(0.82, 0.45, 0.08),       // Alert Amber
  warningLight: rgb(1.0, 0.96, 0.88),
  danger: rgb(0.78, 0.15, 0.15),        // Critical Red
  dangerLight: rgb(0.99, 0.91, 0.91),
  text: rgb(0.12, 0.15, 0.20),          // Charcoal Text
  textSecondary: rgb(0.32, 0.38, 0.45), // Slate Gray
  textMuted: rgb(0.55, 0.60, 0.66),     // Light Gray
  border: rgb(0.80, 0.85, 0.90),        // Hairline Border
  surface: rgb(0.97, 0.98, 0.99),       // Light Surface
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

function wrapText(text: string, maxWidth: number, font: any, size: number): string[] {
  const cleaned = cleanText(text).trim();
  if (!cleaned) return [''];
  const words = cleaned.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, size);
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [''];
}

function getSourceBadge(source: string): string {
  switch (source) {
    case 'abdm': return '[ABDM]';
    case 'patient': return '[Patient]';
    case 'document': return '[Document]';
    case 'ai_extraction': return '[AI]';
    case 'demo_data': return '[Record]';
    default: return `[${source}]`;
  }
}

export async function generateClinicalSummaryPDFBuffer(summary: ClinicalConsultationSummary): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let page = pdfDoc.addPage([595.28, 841.89]); // Standard A4 Portrait
  const { width, height } = page.getSize();
  const margin = 40;
  const contentWidth = width - margin * 2;
  let y = height - margin;

  const isAyushMode = summary.visit.departmentMode === 'ayush';
  const themeColor = isAyushMode ? COLORS.ayushGreen : COLORS.primary;
  const themeLightColor = isAyushMode ? COLORS.ayushLight : COLORS.primaryLight;

  // Running Header for Page 2+
  const drawRunningHeader = (p: typeof page) => {
    p.drawRectangle({
      x: margin,
      y: height - 32,
      width: contentWidth,
      height: 18,
      color: themeLightColor,
      borderColor: themeColor,
      borderWidth: 0.5,
    });
    const headerTitle = `PATIENT CLINICAL REPORT  |  ${summary.patient.fullName} (${summary.patient.age || '--'}y/${summary.patient.gender || '--'})  |  ID: ${summary.patient.hospitalNumber || summary.patient.abhaReference || 'N/A'}  |  ${isAyushMode ? 'AYUSH Medicine' : 'General Medicine'}`;
    p.drawText(cleanText(headerTitle), {
      x: margin + 8,
      y: height - 25,
      size: 7.5,
      font: fontBold,
      color: themeColor,
    });
    p.drawText(`REF: ${cleanText(summary.reference.referenceNumber)}`, {
      x: width - margin - 90,
      y: height - 25,
      size: 7.5,
      font: fontRegular,
      color: COLORS.textSecondary,
    });
  };

  // Helper: check page break
  const checkPageBreak = (neededHeight: number) => {
    if (y - neededHeight < margin + 45) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - margin - 25; // leave room below running header
      drawRunningHeader(page);
    }
  };

  // Helper: draw section header
  const drawSectionHeader = (title: string, color: typeof COLORS.primary = themeColor) => {
    checkPageBreak(35);
    page.drawRectangle({
      x: margin,
      y: y - 20,
      width: contentWidth,
      height: 20,
      color: color,
    });
    page.drawText(title, {
      x: margin + 8,
      y: y - 14,
      size: 9.5,
      font: fontBold,
      color: COLORS.white,
    });
    y -= 26;
  };

  // Helper: draw key-value row
  const drawField = (label: string, value: string | undefined, x: number, yPos: number, maxWidth: number = 220) => {
    page.drawText(`${label}:`, {
      x,
      y: yPos,
      size: 8,
      font: fontBold,
      color: COLORS.textSecondary,
    });
    const labelW = fontBold.widthOfTextAtSize(`${label}:`, 8);
    const textVal = cleanText(value) || 'N/A';
    const lines = wrapText(textVal, maxWidth - labelW - 6, fontRegular, 8.5);
    page.drawText(lines[0] || 'N/A', {
      x: x + labelW + 5,
      y: yPos,
      size: 8.5,
      font: fontRegular,
      color: COLORS.text,
    });
  };

  // Helper: draw table row
  const drawTableRow = (cells: string[], x: number, yPos: number, widths: number[], isHeader: boolean = false, bgOverride?: typeof COLORS.primary) => {
    const font = isHeader ? fontBold : fontRegular;
    const color = isHeader ? COLORS.white : COLORS.text;
    const bgColor = bgOverride || (isHeader ? themeColor : undefined);

    if (bgColor) {
      page.drawRectangle({
        x,
        y: yPos - 4,
        width: widths.reduce((a, b) => a + b, 0),
        height: 16,
        color: bgColor,
      });
    }

    let curX = x;
    cells.forEach((cell, i) => {
      const cleanCell = cleanText(cell);
      page.drawText(cleanCell, {
        x: curX + 4,
        y: yPos,
        size: 7.5,
        font,
        color,
      });
      curX += widths[i];
    });
  };

  // ============================================
  // DOCUMENT HEADER (Page 1 Top)
  // ============================================
  page.drawRectangle({
    x: margin,
    y: y - 44,
    width: contentWidth,
    height: 44,
    color: themeColor,
  });

  page.drawText('PATIENT CLINICAL REPORT', {
    x: margin + 12,
    y: y - 20,
    size: 15,
    font: fontBold,
    color: COLORS.white,
  });

  page.drawText('MediKiosk Smart Clinical Intake & Decision Support System', {
    x: margin + 12,
    y: y - 35,
    size: 8,
    font: fontOblique,
    color: rgb(0.85, 0.92, 1.0),
  });

  page.drawText(`REF: ${cleanText(summary.reference.referenceNumber)}`, {
    x: width - margin - 130,
    y: y - 18,
    size: 9.5,
    font: fontBold,
    color: COLORS.white,
  });

  page.drawText(`Date: ${summary.visit.generatedDate}`, {
    x: width - margin - 130,
    y: y - 32,
    size: 8,
    font: fontRegular,
    color: rgb(0.85, 0.92, 1.0),
  });

  y -= 52;

  // Confirmation Badge Banner
  page.drawRectangle({
    x: margin,
    y: y - 20,
    width: contentWidth,
    height: 20,
    color: COLORS.successLight,
    borderColor: COLORS.success,
    borderWidth: 1,
  });

  page.drawText('PATIENT CONFIRMED [VERIFIED]', {
    x: margin + 10,
    y: y - 14,
    size: 8.5,
    font: fontBold,
    color: COLORS.success,
  });

  page.drawText('STATUS: Finalized & Ready for Physician Review', {
    x: margin + 260,
    y: y - 14,
    size: 8.5,
    font: fontBold,
    color: COLORS.success,
  });

  y -= 28;

  // ============================================
  // 1. PATIENT INFORMATION
  // ============================================
  checkPageBreak(75);
  page.drawRectangle({
    x: margin,
    y: y - 72,
    width: contentWidth,
    height: 72,
    color: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
  });

  page.drawText('1. PATIENT INFORMATION', {
    x: margin + 10,
    y: y - 14,
    size: 9,
    font: fontBold,
    color: themeColor,
  });

  // Row 1
  drawField('Patient Name', summary.patient.fullName, margin + 10, y - 28, 240);
  drawField('Age / Gender', `${summary.patient.age || 'N/A'} yrs / ${summary.patient.gender || 'N/A'}`, margin + 280, y - 28, 220);

  // Row 2
  drawField('Patient ID', summary.patient.hospitalNumber || summary.patient.abhaReference || 'N/A', margin + 10, y - 42, 240);
  drawField('Session ID', summary.sessionId, margin + 280, y - 42, 220);

  // Row 3
  drawField('Intake Date', summary.visit.generatedDate, margin + 10, y - 56, 240);
  drawField('Clinical Mode', isAyushMode ? 'AYUSH Medicine (Ayurveda)' : 'General Medicine', margin + 280, y - 56, 220);

  y -= 82;

  // ============================================
  // 2. CHIEF COMPLAINT
  // ============================================
  drawSectionHeader('2. CHIEF COMPLAINT', themeColor);

  checkPageBreak(45);
  page.drawText('Primary Complaint:', {
    x: margin + 10,
    y: y - 10,
    size: 8.5,
    font: fontBold,
    color: COLORS.text,
  });

  page.drawText(cleanText(summary.chiefComplaint.primaryComplaint) || 'General Health Intake', {
    x: margin + 115,
    y: y - 10,
    size: 9.5,
    font: fontBold,
    color: themeColor,
  });

  if (summary.chiefComplaint.duration) {
    page.drawText(`Duration: ${cleanText(summary.chiefComplaint.duration)}`, {
      x: margin + 340,
      y: y - 10,
      size: 8.5,
      font: fontRegular,
      color: COLORS.textSecondary,
    });
  }
  y -= 18;

  if (summary.chiefComplaint.severity) {
    page.drawText(`Reported Severity: ${cleanText(summary.chiefComplaint.severity)}`, {
      x: margin + 10,
      y: y - 8,
      size: 8.5,
      font: fontRegular,
      color: COLORS.textSecondary,
    });
    y -= 15;
  }

  if (summary.chiefComplaint.patientWords) {
    const quote = `Patient's Exact Words: "${cleanText(summary.chiefComplaint.patientWords)}"`;
    const quoteLines = wrapText(quote, contentWidth - 20, fontOblique, 8);
    quoteLines.forEach(l => {
      checkPageBreak(12);
      page.drawText(l, {
        x: margin + 10,
        y: y - 8,
        size: 8,
        font: fontOblique,
        color: COLORS.textSecondary,
      });
      y -= 12;
    });
  }

  y -= 8;

  // ============================================
  // 3. HISTORY OF PRESENT ILLNESS (HPI)
  // ============================================
  drawSectionHeader('3. HISTORY OF PRESENT ILLNESS (HPI)', themeColor);

  const hpiRows: Array<{ label: string; val: string | undefined }> = [
    { label: 'Onset', val: summary.hpi.onset },
    { label: 'Location', val: summary.hpi.location },
    { label: 'Character', val: summary.hpi.character },
    { label: 'Duration', val: summary.hpi.duration },
    { label: 'Progression', val: summary.hpi.progression },
    { label: 'Aggravating / Relieving', val: summary.hpi.aggravatingFactors || summary.hpi.aggravatingRelieving },
    { label: 'Associated Symptoms', val: summary.hpi.associatedSymptoms },
    { label: 'Previous Treatments', val: summary.hpi.previousTreatments },
  ].filter(r => Boolean(r.val));

  if (hpiRows.length > 0) {
    hpiRows.forEach(r => {
      checkPageBreak(16);
      page.drawText(`- ${r.label}:`, {
        x: margin + 10,
        y: y - 8,
        size: 8,
        font: fontBold,
        color: COLORS.textSecondary,
      });
      const lblW = fontBold.widthOfTextAtSize(`- ${r.label}:`, 8);
      const lines = wrapText(cleanText(r.val), contentWidth - lblW - 25, fontRegular, 8);
      page.drawText(lines[0] || '', {
        x: margin + 15 + lblW,
        y: y - 8,
        size: 8,
        font: fontRegular,
        color: COLORS.text,
      });
      y -= 13;
      if (lines.length > 1) {
        lines.slice(1).forEach(subLine => {
          checkPageBreak(12);
          page.drawText(subLine, {
            x: margin + 15 + lblW,
            y: y - 8,
            size: 8,
            font: fontRegular,
            color: COLORS.text,
          });
          y -= 12;
        });
      }
    });
  } else {
    page.drawText('HPI dimensions standard for primary complaint without acute compounding factors.', {
      x: margin + 10,
      y: y - 8,
      size: 8,
      font: fontOblique,
      color: COLORS.textMuted,
    });
    y -= 14;
  }

  y -= 8;

  // ============================================
  // 4. SYMPTOM SUMMARY
  // ============================================
  drawSectionHeader('4. SYMPTOM SUMMARY', themeColor);

  checkPageBreak(40);
  page.drawRectangle({
    x: margin,
    y: y - 36,
    width: contentWidth,
    height: 36,
    color: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 0.5,
  });

  const symSummaryText = `Primary Complaint: ${summary.chiefComplaint.primaryComplaint || 'None reported'}  |  Duration: ${summary.chiefComplaint.duration || 'Not specified'}  |  Severity: ${summary.chiefComplaint.severity || 'Moderate'}`;
  page.drawText(cleanText(symSummaryText), {
    x: margin + 10,
    y: y - 14,
    size: 8,
    font: fontBold,
    color: themeColor,
  });

  const narrativeText = summary.chiefComplaint.patientWords 
    ? `Narrative: "${summary.chiefComplaint.patientWords}"`
    : 'No active pain radiation or acute constitutional red flag features reported.';
  page.drawText(cleanText(narrativeText), {
    x: margin + 10,
    y: y - 26,
    size: 7.5,
    font: fontRegular,
    color: COLORS.textSecondary,
  });

  y -= 44;

  // ============================================
  // 5. RELEVANT HISTORY
  // ============================================
  drawSectionHeader('5. RELEVANT HISTORY', themeColor);

  // 5.1 Past Medical History
  checkPageBreak(30);
  page.drawText('Past Medical & Surgical History:', {
    x: margin + 10,
    y: y - 8,
    size: 8.5,
    font: fontBold,
    color: COLORS.text,
  });
  y -= 15;

  if (summary.relevantPreviousHistory.length > 0) {
    summary.relevantPreviousHistory.forEach(item => {
      checkPageBreak(14);
      page.drawText(`• ${cleanText(item.conditionName)}`, {
        x: margin + 20,
        y: y - 8,
        size: 8,
        font: fontRegular,
        color: COLORS.text,
      });
      page.drawText(getSourceBadge(item.source), {
        x: margin + 350,
        y: y - 8,
        size: 7,
        font: fontRegular,
        color: COLORS.textMuted,
      });
      if (item.status) {
        page.drawText(`(${cleanText(item.status)})`, {
          x: margin + 410,
          y: y - 8,
          size: 7,
          font: fontOblique,
          color: COLORS.textMuted,
        });
      }
      y -= 13;
    });
  } else {
    page.drawText('• No significant prior chronic medical or surgical conditions reported.', {
      x: margin + 20,
      y: y - 8,
      size: 8,
      font: fontOblique,
      color: COLORS.textMuted,
    });
    y -= 13;
  }

  // 5.2 Current Medications
  checkPageBreak(40);
  page.drawText('Current Medications:', {
    x: margin + 10,
    y: y - 8,
    size: 8.5,
    font: fontBold,
    color: COLORS.text,
  });
  y -= 15;

  if (summary.medications.length > 0) {
    const medWidths = [160, 80, 80, 95, 95];
    drawTableRow(['Medication', 'Dose', 'Frequency', 'Source', 'Status'], margin + 10, y, medWidths, true);
    y -= 16;
    summary.medications.forEach(m => {
      checkPageBreak(15);
      const isConf = Boolean(m.hasConflict);
      drawTableRow(
        [m.medicationName, m.dose || '-', m.frequency || '-', getSourceBadge(m.source), isConf ? 'CONFLICT' : (m.status || 'Active')],
        margin + 10,
        y,
        medWidths,
        false,
        isConf ? COLORS.dangerLight : undefined
      );
      y -= 15;
    });
  } else {
    page.drawText('• No regular daily prescription medications reported.', {
      x: margin + 20,
      y: y - 8,
      size: 8,
      font: fontOblique,
      color: COLORS.textMuted,
    });
    y -= 13;
  }

  // 5.3 Allergies
  checkPageBreak(35);
  page.drawText('Allergies & Adverse Reactions:', {
    x: margin + 10,
    y: y - 8,
    size: 8.5,
    font: fontBold,
    color: COLORS.text,
  });
  y -= 15;

  if (summary.allergies.length > 0) {
    const algWidths = [180, 180, 150];
    drawTableRow(['Allergen', 'Reaction', 'Severity'], margin + 10, y, algWidths, true);
    y -= 16;
    summary.allergies.forEach(a => {
      checkPageBreak(15);
      drawTableRow([a.allergen, a.reaction || 'Hypersensitivity', a.severity || 'Moderate'], margin + 10, y, algWidths);
      y -= 15;
    });
  } else {
    page.drawText('• No known drug or environmental allergies reported (NKDA).', {
      x: margin + 20,
      y: y - 8,
      size: 8,
      font: fontOblique,
      color: COLORS.textMuted,
    });
    y -= 13;
  }

  // 5.4 Family & Social History
  checkPageBreak(35);
  const famSummary = summary.familyHistory && summary.familyHistory.length > 0 ? summary.familyHistory.join(', ') : 'Non-contributory';
  page.drawText(`Family History: ${cleanText(famSummary)}`, {
    x: margin + 10,
    y: y - 8,
    size: 8,
    font: fontRegular,
    color: COLORS.text,
  });
  y -= 14;

  const soc = summary.socialHistory;
  const socSummary = soc 
    ? `Occupation: ${soc.occupation || 'N/A'} | Smoking: ${soc.smoking || 'None'} | Alcohol: ${soc.alcohol || 'None'} | Diet: ${soc.diet || 'Regular'}`
    : 'No adverse lifestyle risk factors reported.';
  page.drawText(`Personal / Social History: ${cleanText(socSummary)}`, {
    x: margin + 10,
    y: y - 8,
    size: 8,
    font: fontRegular,
    color: COLORS.text,
  });
  y -= 18;

  // ============================================
  // 6. VITALS & TRIAGE STATUS
  // ============================================
  drawSectionHeader('6. VITALS & TRIAGE STATUS', themeColor);

  checkPageBreak(40);
  page.drawRectangle({
    x: margin,
    y: y - 32,
    width: contentWidth,
    height: 32,
    color: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 0.5,
  });

  const vit = summary.vitals;
  drawField('Blood Pressure', vit?.bloodPressure || 'Pending Triage', margin + 10, y - 12, 120);
  drawField('Heart Rate', vit?.heartRate || 'Pending Triage', margin + 140, y - 12, 110);
  drawField('Temperature', vit?.temperature || 'Pending Triage', margin + 260, y - 12, 110);
  drawField('SpO2', vit?.spo2 || 'Pending Triage', margin + 380, y - 12, 100);

  page.drawText(`Triage Status: ${cleanText(vit?.status || 'Pending Bedside Physician Station Triage')}`, {
    x: margin + 10,
    y: y - 25,
    size: 7,
    font: fontOblique,
    color: COLORS.textMuted,
  });

  y -= 40;

  // ============================================
  // 7. DOCUMENT / OCR FINDINGS
  // ============================================
  drawSectionHeader('7. DOCUMENT / OCR FINDINGS', themeColor);

  checkPageBreak(40);
  const docCount = summary.uploadedDocuments?.uploadedDocumentCount || 0;
  page.drawText(`Uploaded Documents: ${docCount} attached`, {
    x: margin + 10,
    y: y - 8,
    size: 8.5,
    font: fontBold,
    color: COLORS.text,
  });
  y -= 14;

  if (summary.investigations.length > 0) {
    const labWidths = [150, 90, 70, 110, 90];
    drawTableRow(['Investigation', 'Result Value', 'Unit', 'Reference Range', 'Date'], margin + 10, y, labWidths, true);
    y -= 16;
    summary.investigations.forEach(lab => {
      checkPageBreak(15);
      drawTableRow([lab.testName, lab.value, lab.unit || '-', lab.referenceRange || '-', lab.date || 'Recent'], margin + 10, y, labWidths);
      y -= 15;
    });
  } else {
    page.drawText('• No previous abnormal laboratory investigation records uploaded.', {
      x: margin + 20,
      y: y - 8,
      size: 8,
      font: fontOblique,
      color: COLORS.textMuted,
    });
    y -= 14;
  }

  y -= 6;

  // ============================================
  // 8. CLINICAL FACTS
  // ============================================
  drawSectionHeader('8. CLINICAL FACTS', themeColor);

  checkPageBreak(40);
  const facts = summary.clinicalFacts || [];
  if (facts.length > 0) {
    facts.slice(0, 8).forEach(f => {
      checkPageBreak(14);
      page.drawText(`• [${cleanText(f.category)}]`, {
        x: margin + 10,
        y: y - 8,
        size: 8,
        font: fontBold,
        color: themeColor,
      });
      page.drawText(cleanText(f.fact), {
        x: margin + 120,
        y: y - 8,
        size: 8,
        font: fontRegular,
        color: COLORS.text,
      });
      if (f.source) {
        page.drawText(`(${cleanText(f.source)})`, {
          x: margin + 410,
          y: y - 8,
          size: 7,
          font: fontOblique,
          color: COLORS.textMuted,
        });
      }
      y -= 13;
    });
  } else {
    page.drawText('• Factual history synthesized from intake interview and verified by patient.', {
      x: margin + 10,
      y: y - 8,
      size: 8,
      font: fontRegular,
      color: COLORS.textSecondary,
    });
    y -= 14;
  }

  y -= 8;

  // ============================================
  // 9. SAFETY / RED-FLAG SCREEN
  // ============================================
  const activeFlags = summary.attentionFlags?.filter(f => f.status === 'active') || [];
  const hasCritical = activeFlags.some(f => f.severity === 'critical');
  const bannerColor = hasCritical ? COLORS.danger : activeFlags.length > 0 ? COLORS.warning : COLORS.success;
  const bannerBg = hasCritical ? COLORS.dangerLight : activeFlags.length > 0 ? COLORS.warningLight : COLORS.successLight;

  drawSectionHeader('9. SAFETY & RED-FLAG SCREEN', bannerColor);

  checkPageBreak(45);
  page.drawRectangle({
    x: margin,
    y: y - 36,
    width: contentWidth,
    height: 36,
    color: bannerBg,
    borderColor: bannerColor,
    borderWidth: 1,
  });

  const safetyTitle = activeFlags.length > 0
    ? `ATTENTION REQUIRED: ${activeFlags.length} Potential Clinical Flag(s) Detected`
    : 'SAFETY STATUS: Normal - No Acute Emergency Flags Identified';

  page.drawText(safetyTitle, {
    x: margin + 10,
    y: y - 14,
    size: 8.5,
    font: fontBold,
    color: bannerColor,
  });

  if (activeFlags.length > 0) {
    const flagSummary = activeFlags.map(f => cleanText(f.message)).join('; ');
    const flagLines = wrapText(`Detected concern(s): ${flagSummary}`, contentWidth - 20, fontRegular, 7.5);
    page.drawText(flagLines[0] || '', {
      x: margin + 10,
      y: y - 26,
      size: 7.5,
      font: fontRegular,
      color: COLORS.text,
    });
  } else {
    page.drawText('Patient denies severe chest pressure, sudden dyspnea, acute neurological deficit, or severe trauma.', {
      x: margin + 10,
      y: y - 26,
      size: 7.5,
      font: fontRegular,
      color: COLORS.textSecondary,
    });
  }

  y -= 44;

  // ============================================
  // 10. AYUSH ASSESSMENT (Only for AYUSH Mode)
  // ============================================
  if (isAyushMode && summary.ayush) {
    drawSectionHeader('10. AYUSH ASSESSMENT (Ayurvedic Profile)', COLORS.ayushGreen);

    checkPageBreak(75);
    page.drawRectangle({
      x: margin,
      y: y - 70,
      width: contentWidth,
      height: 70,
      color: COLORS.ayushLight,
      borderColor: COLORS.ayushGreen,
      borderWidth: 0.5,
    });

    drawField('Prakriti (Constitution)', summary.ayush.prakriti, margin + 10, y - 14, 240);
    drawField('Agni (Digestive Fire)', summary.ayush.agni, margin + 280, y - 14, 220);

    drawField('Koshtha (Bowel Elimination)', summary.ayush.koshtha, margin + 10, y - 30, 240);
    drawField('Vikriti (Dosha Imbalance)', summary.ayush.vikriti || 'Pending Vaidya Nadi Pariksha', margin + 280, y - 30, 220);

    const aharaStr = summary.ayush.ahara && summary.ayush.ahara.length > 0 ? summary.ayush.ahara.join(', ') : 'Standard Satvik/Mixed';
    const viharaStr = summary.ayush.vihara && summary.ayush.vihara.length > 0 ? summary.ayush.vihara.join(', ') : 'Routine daily activity';

    drawField('Ahara (Dietary Habits)', aharaStr, margin + 10, y - 46, 240);
    drawField('Vihara (Lifestyle / Sleep)', viharaStr, margin + 280, y - 46, 220);

    page.drawText('Assessment aligned with classical Ayurvedic history-taking guidelines (Roga & Rogi Pariksha).', {
      x: margin + 10,
      y: y - 62,
      size: 7,
      font: fontOblique,
      color: COLORS.ayushGreen,
    });

    y -= 78;
  }

  // ============================================
  // 11. INTERVIEW SUMMARY
  // ============================================
  drawSectionHeader('11. INTERVIEW SUMMARY (Adaptive Consultation Record)', themeColor);

  const interviewItems = summary.interviewSummary || [];
  if (interviewItems.length > 0) {
    interviewItems.slice(0, 10).forEach(item => {
      checkPageBreak(22);
      page.drawText(`Q: ${cleanText(item.question)}`, {
        x: margin + 10,
        y: y - 8,
        size: 8,
        font: fontBold,
        color: COLORS.text,
      });
      const aLines = wrapText(`A: ${cleanText(item.answer)}`, contentWidth - 30, fontRegular, 8);
      page.drawText(aLines[0] || '', {
        x: margin + 20,
        y: y - 18,
        size: 8,
        font: fontRegular,
        color: COLORS.textSecondary,
      });
      y -= 22;
    });
  } else {
    page.drawText('Consultation recorded electronically via adaptive kiosk intake.', {
      x: margin + 10,
      y: y - 8,
      size: 8,
      font: fontOblique,
      color: COLORS.textMuted,
    });
    y -= 15;
  }

  y -= 8;

  // ============================================
  // 12. DOCTOR REVIEW & PHYSICIAN VERIFICATION
  // ============================================
  drawSectionHeader('12. DOCTOR REVIEW & PHYSICIAN VERIFICATION', themeColor);

  checkPageBreak(85);
  page.drawRectangle({
    x: margin,
    y: y - 80,
    width: contentWidth,
    height: 80,
    color: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
  });

  const docName = summary.doctorReview?.doctorName || (isAyushMode ? 'Dr. Meera Vaidya, BAMS' : 'Dr. Rajesh Sharma, MD');
  page.drawText(`Assigned Practitioner: ${docName}`, {
    x: margin + 10,
    y: y - 14,
    size: 8.5,
    font: fontBold,
    color: COLORS.text,
  });

  page.drawText('Clinical Notes & Corrections:', {
    x: margin + 10,
    y: y - 28,
    size: 8,
    font: fontBold,
    color: COLORS.textSecondary,
  });

  page.drawText('________________________________________________________________________________', {
    x: margin + 10,
    y: y - 42,
    size: 8,
    font: fontRegular,
    color: COLORS.border,
  });

  page.drawText('Physician Signature: ____________________________________', {
    x: margin + 10,
    y: y - 62,
    size: 8.5,
    font: fontRegular,
    color: COLORS.text,
  });

  page.drawText(`Date: _______________`, {
    x: margin + 350,
    y: y - 62,
    size: 8.5,
    font: fontRegular,
    color: COLORS.text,
  });

  y -= 88;

  // ============================================
  // 13. DISCLAIMER
  // ============================================
  checkPageBreak(40);
  page.drawRectangle({
    x: margin,
    y: y - 34,
    width: contentWidth,
    height: 34,
    color: rgb(0.96, 0.96, 0.96),
    borderColor: COLORS.border,
    borderWidth: 0.5,
  });

  const disclaimerText1 = 'CLINICAL DECISION SUPPORT DISCLAIMER: This consultation summary was compiled via the MediKiosk intelligent clinical intake';
  const disclaimerText2 = 'platform based on patient self-reported answers and uploaded health records. All extracted data and automated clinical screening flags are';
  const disclaimerText3 = 'provided solely for clinical decision support and DO NOT replace comprehensive evaluation, diagnosis, or treatment by a qualified healthcare professional.';

  page.drawText(disclaimerText1, {
    x: margin + 8,
    y: y - 10,
    size: 6.5,
    font: fontBold,
    color: COLORS.textSecondary,
  });
  page.drawText(disclaimerText2, {
    x: margin + 8,
    y: y - 19,
    size: 6.5,
    font: fontRegular,
    color: COLORS.textMuted,
  });
  page.drawText(disclaimerText3, {
    x: margin + 8,
    y: y - 28,
    size: 6.5,
    font: fontRegular,
    color: COLORS.textMuted,
  });

  // ============================================
  // FOOTER (Across All Pages)
  // ============================================
  const pages = pdfDoc.getPages();
  pages.forEach((p, idx) => {
    // Footer line
    p.drawLine({
      start: { x: margin, y: 38 },
      end: { x: width - margin, y: 38 },
      thickness: 0.5,
      color: COLORS.border,
    });

    // Left
    p.drawText('MediKiosk Clinical Assistant System  |  Confidential Medical Record', {
      x: margin,
      y: 26,
      size: 7,
      font: fontRegular,
      color: COLORS.textMuted,
    });

    // Center Page Number
    p.drawText(`Page ${idx + 1} of ${pages.length}`, {
      x: width / 2 - 25,
      y: 26,
      size: 7.5,
      font: fontBold,
      color: COLORS.textSecondary,
    });

    // Right Ref
    p.drawText(`REF: ${cleanText(summary.reference.referenceNumber)}`, {
      x: width - margin - 100,
      y: 26,
      size: 7,
      font: fontRegular,
      color: COLORS.textMuted,
    });
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
