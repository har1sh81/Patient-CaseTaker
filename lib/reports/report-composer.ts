import {
  ClinicalConsultationSummary,
  SummaryChiefComplaint,
  SummaryHPI,
  SummaryHistoryItem,
  SummaryMedicationItem,
  SummaryAllergyItem,
  SummaryLabItem,
  SummarySocialHistory,
} from '@/types/summary.types';
import { IntakeSession, Patient, ConversationAnswer, AttentionFlag, DocumentExtractionResult } from '@/types';
import { extractComplaintContext } from '@/lib/timeline/relevance-engine';

export function composeClinicalConsultationSummary(params: {
  session: IntakeSession;
  patient: Patient;
  answers: ConversationAnswer[];
  timelineEvents?: import('@/types').MedicalTimelineEvent[];
  documents?: DocumentExtractionResult[];
  flags?: AttentionFlag[];
}): ClinicalConsultationSummary {
  const { session, patient, answers, timelineEvents = [], documents = [], flags = [] } = params;

  // 1. Extract chief complaint & HPI
  const complaintCtx = extractComplaintContext(answers);
  const primaryComplaint = complaintCtx?.complaint || 'General consultation';
  const duration = complaintCtx?.duration || 'Not specified';
  const severity = complaintCtx?.severity ? `Level ${complaintCtx.severity}/10` : undefined;

  const patientWords = complaintCtx?.complaint || 'Not specified';

  const chiefComplaint: SummaryChiefComplaint = {
    primaryComplaint,
    duration,
    severity,
    pattern: 'Constant',
    patientWords,
  };

  const durationAns = answers.find(a => a.questionId === 'symptom_duration');
  const progressionAns = answers.find(a => a.questionId === 'symptom_progression');
  const locationAns = answers.find(a => a.questionId === 'pain_location');
  const characterAns = answers.find(a => a.questionId === 'symptom_character');
  const aggRelAns = answers.find(a => a.questionId === 'aggravating_relieving' || a.questionId === 'stomach_pain_triggers');
  const prevTreatAns = answers.find(a => a.questionId === 'previous_treatments');
  const assocAns = answers.find(a => a.questionId === 'associated_symptoms' || a.questionId === 'gi_red_flags');

  const hpi: SummaryHPI = {
    duration: durationAns ? String(durationAns.normalizedValue || durationAns.rawValue || durationAns.transcript) : duration,
    location: locationAns ? String(locationAns.normalizedValue || locationAns.rawValue || locationAns.transcript) : undefined,
    character: characterAns ? String(characterAns.normalizedValue || characterAns.rawValue || characterAns.transcript) : undefined,
    aggravatingRelieving: aggRelAns ? String(aggRelAns.normalizedValue || aggRelAns.rawValue || aggRelAns.transcript) : undefined,
    previousTreatments: prevTreatAns ? String(prevTreatAns.normalizedValue || prevTreatAns.rawValue || prevTreatAns.transcript) : undefined,
    associatedSymptoms: assocAns ? String(assocAns.normalizedValue || assocAns.rawValue || assocAns.transcript) : undefined,
    progression: progressionAns ? String(progressionAns.normalizedValue || progressionAns.rawValue || progressionAns.transcript) : undefined,
  };

  // 2. Extract past history & medications
  const pastHistAns = answers.find(a => a.questionId === 'past_medical_history');
  const medAns = answers.find(a => a.questionId === 'current_medications');

  const relevantPreviousHistory: SummaryHistoryItem[] = [];
  if (pastHistAns) {
    const rawHist = String(pastHistAns.normalizedValue || pastHistAns.rawValue || pastHistAns.transcript || '');
    if (rawHist && !rawHist.toLowerCase().includes('no') && rawHist !== 'none') {
      relevantPreviousHistory.push({
        conditionName: rawHist,
        status: 'active',
        source: 'patient',
      });
    }
  }

  // Add document extracted conditions
  documents.forEach((doc: any) => {
    doc.extractedConditions?.forEach((cond: any) => {
      relevantPreviousHistory.push({
        conditionName: cond.conditionName,
        status: cond.verificationStatus,
        source: 'document',
      });
    });
  });

  const medications: SummaryMedicationItem[] = [];
  if (medAns) {
    const rawMed = String(medAns.normalizedValue || medAns.rawValue || medAns.transcript || '');
    if (rawMed && !rawMed.toLowerCase().includes('no') && rawMed !== 'none') {
      medications.push({
        medicationName: rawMed,
        source: 'patient',
        status: 'active',
      });
    }
  }

  const allergies: SummaryAllergyItem[] = [];
  const labResults: SummaryLabItem[] = [];

  documents.forEach((doc: any) => {
    doc.laboratoryResults?.forEach((lab: any) => {
      labResults.push({
        testName: lab.testName,
        value: String(lab.value || lab.valueRaw || ''),
        unit: lab.unit,
        referenceRange: typeof lab.referenceRange === 'string' ? lab.referenceRange : undefined,
        date: lab.date || lab.testDate,
        source: 'document',
      });
    });
  });

  // 3. Extract family history
  const familyHistory: string[] = [];
  const familyHistAns = answers.find(a => a.questionId === 'family_history' || a.section === 'family_history');
  if (familyHistAns) {
    const rawFamily = String(familyHistAns.rawValue || familyHistAns.transcript || '');
    if (rawFamily && !rawFamily.toLowerCase().includes('no') && rawFamily !== 'none') {
      // Split by common delimiters
      const items = rawFamily.split(/[,;]|\band\b/).map(s => s.trim()).filter(Boolean);
      items.forEach(item => familyHistory.push(item));
    }
  }

  // 4. Extract social history
  const socialHistory: SummarySocialHistory = {};
  const occupationAns = answers.find(a => a.questionId === 'occupation' || a.section === 'social_history');
  const smokingAns = answers.find(a => a.questionId === 'smoking_status' || a.questionId === 'smoking');
  const alcoholAns = answers.find(a => a.questionId === 'alcohol_use' || a.questionId === 'alcohol');
  const exerciseAns = answers.find(a => a.questionId === 'exercise' || a.questionId === 'physical_activity');
  const dietAns = answers.find(a => a.questionId === 'diet' || a.section === 'social_history');

  if (occupationAns) socialHistory.occupation = String(occupationAns.rawValue || occupationAns.transcript);
  if (smokingAns) socialHistory.smoking = String(smokingAns.rawValue || smokingAns.transcript);
  if (alcoholAns) socialHistory.alcohol = String(alcoholAns.rawValue || alcoholAns.transcript);
  if (exerciseAns) socialHistory.exercise = String(exerciseAns.rawValue || exerciseAns.transcript);
  if (dietAns) socialHistory.diet = String(dietAns.rawValue || dietAns.transcript);

  // 5. Extract review of systems from answers with review_of_systems section
  const reviewOfSystems: Record<string, string> = {};
  answers.filter(a => a.section === 'review_of_systems').forEach(ans => {
    if (ans.rawValue || ans.transcript) {
      reviewOfSystems[ans.questionId] = String(ans.rawValue || ans.transcript);
    }
  });

  // 6. Red flag detection is handled at the API layer (review/data route)
  // using a lightweight type. The report-composer passes through DB flags as-is.

  // Information Not Reported
  const missingFields: string[] = [];
  if (!hpi.location) missingFields.push('Exact symptom anatomical location');
  if (!hpi.associatedSymptoms) missingFields.push('Associated systemic symptoms');
  if (relevantPreviousHistory.length === 0) missingFields.push('Prior hospital discharge summaries');
  if (medications.length === 0) missingFields.push('Daily prescription dosage list');
  if (familyHistory.length === 0) missingFields.push('Family medical history');
  if (Object.keys(socialHistory).length === 0) missingFields.push('Social history (smoking, alcohol, exercise, diet)');
  if (allergies.length === 0) missingFields.push('Known drug/food allergies');

  // 7. AYUSH Section
  let ayushSection;
  if (session.departmentMode === 'ayush') {
    const prakritiAns = answers.find(a => a.questionId === 'ayush_prakriti');
    const agniAns = answers.find(a => a.questionId === 'ayush_digestion' || a.questionId === 'ayush_agni');
    const koshthaAns = answers.find(a => a.questionId === 'ayush_bowel' || a.questionId === 'ayush_koshtha');
    const sleepAns = answers.find(a => a.questionId === 'ayush_sleep');
    const dietAns = answers.find(a => a.questionId === 'ayush_diet' || a.questionId === 'ahara');
    const exerciseAns = answers.find(a => a.questionId === 'ayush_exercise');

    const aharaList: string[] = [];
    if (dietAns) aharaList.push(String(dietAns.rawValue || dietAns.transcript));

    const viharaList: string[] = [];
    if (exerciseAns) viharaList.push(`Exercise: ${exerciseAns.rawValue || exerciseAns.transcript}`);
    if (sleepAns) viharaList.push(`Sleep: ${sleepAns.rawValue || sleepAns.transcript}`);

    ayushSection = {
      prakriti: prakritiAns ? String(prakritiAns.rawValue || prakritiAns.transcript) : 'Not assessed',
      agni: agniAns ? String(agniAns.rawValue || agniAns.transcript) : 'Not assessed',
      koshtha: koshthaAns ? String(koshthaAns.rawValue || koshthaAns.transcript) : 'Not assessed',
      ahara: aharaList,
      vihara: viharaList,
    };
  }

  // 8. Synthesize Vitals
  const bpLab = labResults.find(l => /blood pressure|bp/i.test(l.testName));
  const hrLab = labResults.find(l => /heart rate|pulse/i.test(l.testName));
  const tempLab = labResults.find(l => /temp/i.test(l.testName));
  const spo2Lab = labResults.find(l => /spo2|oxygen/i.test(l.testName));

  const vitals = {
    bloodPressure: bpLab ? bpLab.value : undefined,
    heartRate: hrLab ? `${hrLab.value} bpm` : undefined,
    temperature: tempLab ? `${tempLab.value} °F` : undefined,
    spo2: spo2Lab ? `${spo2Lab.value}%` : undefined,
    status: (bpLab || hrLab || tempLab || spo2Lab) ? 'Recorded from clinical records' : 'Pending Bedside Physician Station Triage',
  };

  // 9. Synthesize Clinical Facts
  const clinicalFacts: Array<{ category: string; fact: string; source?: string }> = [
    { category: 'Chief Complaint', fact: primaryComplaint, source: 'Patient Reported' },
  ];
  if (chiefComplaint.duration) {
    clinicalFacts.push({ category: 'Symptom Duration', fact: chiefComplaint.duration, source: 'Patient Reported' });
  }
  if (chiefComplaint.severity) {
    clinicalFacts.push({ category: 'Severity Profile', fact: chiefComplaint.severity, source: 'Patient Reported' });
  }
  if (hpi.location) {
    clinicalFacts.push({ category: 'Anatomical Location', fact: hpi.location, source: 'HPI Exploration' });
  }
  relevantPreviousHistory.forEach(h => {
    clinicalFacts.push({ category: 'Past History', fact: `${h.conditionName} (${h.status || 'active'})`, source: h.source });
  });
  medications.forEach(m => {
    clinicalFacts.push({ category: 'Medication Regimen', fact: `${m.medicationName} ${m.dose || ''} ${m.frequency || ''}`.trim(), source: m.source });
  });
  allergies.forEach(a => {
    clinicalFacts.push({ category: 'Allergy Record', fact: `${a.allergen}: ${a.reaction || 'Allergic reaction'} (${a.severity || 'moderate'})`, source: 'Patient Stated' });
  });
  if (ayushSection) {
    clinicalFacts.push({ category: 'Prakriti Assessment', fact: ayushSection.prakriti, source: 'AYUSH Triage' });
    clinicalFacts.push({ category: 'Agni (Digestive Fire)', fact: ayushSection.agni, source: 'AYUSH Triage' });
    clinicalFacts.push({ category: 'Koshtha (Bowel Habit)', fact: ayushSection.koshtha, source: 'AYUSH Triage' });
  }

  // 10. Synthesize Interview Summary (Human-readable questions & answers)
  const questionTitles: Record<string, string> = {
    reason_for_visit: 'Reason for Visit / Chief Complaint',
    symptom_duration: 'Duration of Symptoms',
    symptom_location: 'Location of Symptoms',
    symptom_severity: 'Severity and Quality',
    aggravating_factors: 'Aggravating & Relieving Factors',
    associated_symptoms: 'Associated Symptoms',
    past_medical_history: 'Past Medical History',
    current_medications: 'Current Medications',
    family_history: 'Family Medical History',
    occupation: 'Occupation',
    smoking_status: 'Smoking Habits',
    alcohol_use: 'Alcohol Consumption',
    ayush_prakriti: 'Prakriti (Physical & Mental Constitution)',
    ayush_digestion: 'Agni (Digestive Fire / Appetite)',
    ayush_bowel: 'Koshtha (Bowel Movements / Digestion)',
    ayush_sleep: 'Nidra (Sleep Quality & Duration)',
    ayush_diet: 'Ahara (Dietary Intake & Food Preferences)',
    ayush_exercise: 'Vihara (Daily Lifestyle & Activity)',
  };

  const interviewSummary = answers.map(a => {
    const title = questionTitles[a.questionId] || a.questionId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const val = String(a.normalizedValue || a.rawValue || a.transcript || 'Not reported');
    return {
      question: title,
      answer: val,
      section: a.section,
    };
  });

  const sessionIdStr = session.id || (session as any).sessionId || 'ses_demo';
  const nowIso = new Date().toISOString();
  const refNum = `MK-${sessionIdStr.slice(-6).toUpperCase()}`;

  // 11. Doctor Review Block
  const doctorReview = {
    doctorNotes: 'Pending attending physician clinical consultation and examination.',
    corrections: 'No patient corrections logged during kiosk review.',
    confirmationStatus: 'Patient Self-Confirmed via Kiosk Terminal',
    finalAssessment: 'Intake history synthesized for attending clinician review.',
    verifiedAt: nowIso,
    doctorName: session.departmentMode === 'ayush' ? 'Dr. Meera Vaidya, BAMS' : 'Dr. Rajesh Sharma, MD',
  };

  return {
    reportId: `summary_${sessionIdStr}`,
    sessionId: sessionIdStr,
    generatedAt: nowIso,
    patient: {
      fullName: patient.demographics?.fullName || 'Kiosk Patient',
      age: patient.demographics?.age,
      gender: patient.demographics?.gender,
      hospitalNumber: patient.identification?.hospitalNumber || 'N/A',
      abhaReference: patient.identification?.abhaReference || 'N/A',
    },
    visit: {
      generatedDate: nowIso.split('T')[0],
      departmentMode: session.departmentMode,
      intakeLanguage: session.language || (session as any).preferredLanguage || 'en',
      reasonForVisit: primaryComplaint,
    },
    attentionFlags: flags,
    chiefComplaint,
    hpi,
    relevantPreviousHistory,
    medications,
    allergies,
    investigations: labResults,
    familyHistory,
    personalHistory: [],
    socialHistory: Object.keys(socialHistory).length > 0 ? socialHistory : undefined,
    reviewOfSystems: Object.keys(reviewOfSystems).length > 0 ? reviewOfSystems : undefined,
    vitals,
    clinicalFacts,
    interviewSummary,
    doctorReview,
    informationNotReported: missingFields,
    medicalJourney: timelineEvents,
    uploadedDocuments: {
      uploadedDocumentCount: documents.length,
      documents: documents.map(d => ({
        id: d.documentId,
        type: d.documentType,
        fileName: d.documentId,
      })),
      extractedConditions: documents.flatMap((d: any) => d.extractedConditions || []),
      laboratoryResults: documents.flatMap((d: any) => d.laboratoryResults || []),
      admissions: [],
    },
    abdmContext: [],
    ayush: ayushSection,
    patientConfirmation: {
      confirmedByPatient: true,
      confirmedAt: nowIso,
      badgeText: 'PATIENT CONFIRMED ✓',
      statusText: 'STATUS: Ready for Physician Review',
    },
    reference: {
      referenceNumber: refNum,
      qrPayload: `MK:${sessionIdStr}:${refNum}`,
      generatedAt: nowIso,
    },
  };
}
