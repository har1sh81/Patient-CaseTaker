import {
  ClinicalConsultationSummary,
  SummaryChiefComplaint,
  SummaryHPI,
  SummaryHistoryItem,
  SummaryMedicationItem,
  SummaryAllergyItem,
  SummaryLabItem,
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

  const reasonAns = answers.find(a => a.questionId === 'reason_for_visit' || a.questionId === 'chief_complaint');
  const patientWords = reasonAns ? String(reasonAns.transcript || reasonAns.rawValue || reasonAns.normalizedValue) : undefined;

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
  const assocAns = answers.find(a => a.questionId === 'associated_symptoms');

  const hpi: SummaryHPI = {
    duration: durationAns ? String(durationAns.rawValue || durationAns.transcript) : duration,
    location: locationAns ? String(locationAns.rawValue || locationAns.transcript) : undefined,
    associatedSymptoms: assocAns ? String(assocAns.rawValue || assocAns.transcript) : undefined,
    progression: progressionAns ? String(progressionAns.rawValue || progressionAns.transcript) : undefined,
  };

  // 2. Extract past history & medications
  const pastHistAns = answers.find(a => a.questionId === 'past_medical_history');
  const medAns = answers.find(a => a.questionId === 'current_medications');

  const relevantPreviousHistory: SummaryHistoryItem[] = [];
  if (pastHistAns) {
    const rawHist = String(pastHistAns.rawValue || pastHistAns.transcript || '');
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
    const rawMed = String(medAns.rawValue || medAns.transcript || '');
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

  // 3. Information Not Reported
  const missingFields: string[] = [];
  if (!hpi.location) missingFields.push('Exact symptom anatomical location');
  if (!hpi.associatedSymptoms) missingFields.push('Associated systemic symptoms');
  if (relevantPreviousHistory.length === 0) missingFields.push('Prior hospital discharge summaries');
  if (medications.length === 0) missingFields.push('Daily prescription dosage list');

  // 4. AYUSH Section
  let ayushSection;
  if (session.departmentMode === 'ayush') {
    const prakritiAns = answers.find(a => a.questionId === 'ayush_prakriti');
    const agniAns = answers.find(a => a.questionId === 'ayush_agni');
    const koshthaAns = answers.find(a => a.questionId === 'ayush_koshtha');

    ayushSection = {
      prakriti: prakritiAns ? String(prakritiAns.rawValue || prakritiAns.transcript) : 'Not assessed',
      agni: agniAns ? String(agniAns.rawValue || agniAns.transcript) : 'Not assessed',
      koshtha: koshthaAns ? String(koshthaAns.rawValue || koshthaAns.transcript) : 'Not assessed',
      ahara: [],
      vihara: [],
    };
  }

  const sessionIdStr = session.id || (session as any).sessionId || 'ses_demo';
  const nowIso = new Date().toISOString();
  const refNum = `MK-${sessionIdStr.slice(-6).toUpperCase()}`;

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
    familyHistory: [],
    personalHistory: [],
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
