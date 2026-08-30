import { FusedClinicalRecord, RelevanceLevel, RelevantFusedRecord, ConversationAnswer } from '../../types';

export interface ComplaintContext {
  complaint: string;
  duration?: string;
  severity?: string;
  extractedFacts?: unknown[];
}

// A deterministic mapping of common complaints to relevant medical terms, diagnoses, and medications
const MEDICAL_SYNONYMS: Record<string, string[]> = {
  'stomach pain': ['gastritis', 'ulcer', 'stomach', 'abdominal', 'gastric', 'gerd', 'reflux', 'peptic', 'dyspepsia', 'pantoprazole', 'omeprazole', 'antacid', 'digestion', 'endoscopy'],
  'chest pain': ['heart', 'cardiac', 'angina', 'myocardial', 'infarction', 'coronary', 'ecg', 'troponin', 'aspirin', 'clopidogrel', 'statin', 'cardiovascular'],
  'knee pain': ['knee', 'joint', 'arthritis', 'osteoarthritis', 'meniscus', 'ligament', 'acl', 'orthopedic', 'ibuprofen', 'diclofenac'],
  'headache': ['migraine', 'head', 'tension', 'cluster', 'neurology', 'ct brain', 'mri brain', 'paracetamol', 'ibuprofen'],
  'fever': ['pyrexia', 'infection', 'fever', 'temperature', 'typhoid', 'malaria', 'dengue', 'antibiotic', 'paracetamol', 'cbc'],
  'cough': ['resp', 'lungs', 'chest', 'asthma', 'copd', 'bronchitis', 'pneumonia', 'inhaler', 'salbutamol', 'x-ray chest']
};

export function extractComplaintContext(answers: ConversationAnswer[]): ComplaintContext | null {
  const complaintAnswer = answers.find(
    a => a.questionId === 'reason_for_visit' ||
         a.questionId === 'chief_complaint' ||
         a.section === 'chief_complaint'
  );
  const durationAnswer = answers.find(
    a => a.questionId === 'symptom_duration' || a.questionId === 'duration'
  );
  const severityAnswer = answers.find(
    a => a.questionId === 'pain_scale' || a.questionId === 'severity'
  );

  if (!complaintAnswer) return null;

  const rawText = String(complaintAnswer.rawValue || complaintAnswer.transcript || '').trim();
  if (!rawText) return null;

  return {
    complaint: rawText,
    duration: durationAnswer ? String(durationAnswer.rawValue || '').trim() : undefined,
    severity: severityAnswer ? String(severityAnswer.rawValue || '').trim() : undefined,
  };
}

export function evaluateRelevance(
  record: FusedClinicalRecord,
  complaintContext: ComplaintContext
): RelevantFusedRecord {
  const complaintWords = complaintContext.complaint.split(/\s+/);
  
  // Determine relevant keywords based on the complaint
  let keywords: string[] = [...complaintWords];
  
  // Inject synonyms if the complaint matches our known mapping
  for (const [key, synonyms] of Object.entries(MEDICAL_SYNONYMS)) {
    if (complaintContext.complaint.includes(key)) {
      keywords = [...keywords, ...synonyms];
    }
  }

  const factText = record.clinicalFact.toLowerCase();
  const originalText = record.originalValues.join(' ').toLowerCase();
  const searchTarget = factText + ' ' + originalText;

  let relevance: RelevanceLevel = 'not_relevant';
  let relevanceReason = undefined;

  // Simple deterministic matching
  const hasDirectMatch = keywords.some(kw => kw.length > 2 && searchTarget.includes(kw));

  if (hasDirectMatch) {
    relevance = 'direct';
    relevanceReason = 'Keyword match with current complaint or related medical terms';
  } else if (record.category === 'encounter' || record.category === 'other') {
    // Some general categories might be contextual
    relevance = 'contextual';
    relevanceReason = 'General patient history context';
  }

  return {
    ...record,
    relevance,
    relevanceReason
  };
}

export function reconstructHistory(
  records: FusedClinicalRecord[],
  answers: ConversationAnswer[]
): { context: ComplaintContext | null, relevantRecords: RelevantFusedRecord[] } {
  const context = extractComplaintContext(answers);
  
  if (!context) {
    // If no complaint is found, we might treat all records as contextual or just return them
    const allRecords = records.map(r => ({ ...r, relevance: 'contextual' as RelevanceLevel, relevanceReason: 'No specific complaint context found' }));
    return { context: null, relevantRecords: allRecords };
  }

  const evaluatedRecords = records.map(r => evaluateRelevance(r, context));
  
  // Filter out not_relevant
  const relevantRecords = evaluatedRecords.filter(r => r.relevance !== 'not_relevant');

  return {
    context,
    relevantRecords
  };
}
