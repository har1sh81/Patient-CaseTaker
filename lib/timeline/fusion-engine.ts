
import { 
  ConversationAnswer, 
  DocumentExtractionResult, 
  ClinicalHistory, 
  MedicalTimeline, 
  FusedClinicalRecord,
  FusedRecordCategory,
  DataProvenance
} from '../../types';

const NORMALIZATION_MAP: Record<string, string> = {
  'htn': 'hypertension',
  'high blood pressure': 'hypertension',
  'high bp': 'hypertension',
  'bp': 'hypertension',
  'essential (primary) hypertension': 'hypertension',
  't2dm': 'type 2 diabetes',
  'dm': 'type 2 diabetes',
  'diabetes mellitus': 'type 2 diabetes',
};

function normalizeClinicalFact(fact: string): string {
  const lower = fact.toLowerCase().trim();
  return NORMALIZATION_MAP[lower] || lower;
}

function parseDatePrecision(dateStr?: string): { date?: string; datePrecision: 'exact' | 'month' | 'year' | 'unknown' } {
  if (!dateStr) return { datePrecision: 'unknown' };
  
  // Basic parsing
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    return { date: dateStr.substring(0, 10), datePrecision: 'exact' };
  }
  if (dateStr.match(/^\d{4}-\d{2}/)) {
    return { date: dateStr.substring(0, 7), datePrecision: 'month' };
  }
  if (dateStr.match(/^\d{4}/)) {
    return { date: dateStr.substring(0, 4), datePrecision: 'year' };
  }
  
  return { datePrecision: 'unknown' };
}

export function buildTimeline(
  sessionId: string,
  patientId: string,
  answers: ConversationAnswer[],
  extractions: DocumentExtractionResult[],
  abdmHistory?: ClinicalHistory
): MedicalTimeline {
  
  const records: FusedClinicalRecord[] = [];

  // 1. Process ABDM Records (from previously saved ClinicalHistory in Phase 7.5)
  if (abdmHistory) {
    if (abdmHistory.pastMedicalHistory) {
      abdmHistory.pastMedicalHistory.forEach(cond => {
        addOrMergeRecord(records, {
          sessionId,
          patientId,
          category: 'condition',
          originalValue: cond.conditionName,
          dateStr: cond.diagnosedDate,
          provenance: cond.provenance
        });
      });
    }
    if (abdmHistory.medications) {
      abdmHistory.medications.forEach(med => {
        addOrMergeRecord(records, {
          sessionId,
          patientId,
          category: 'medication',
          originalValue: `${med.name} ${med.dosage || ''}`.trim(),
          dateStr: med.startDate,
          provenance: med.provenance
        });
      });
    }
    if (abdmHistory.pastSurgicalHistory) {
      abdmHistory.pastSurgicalHistory.forEach(proc => {
        addOrMergeRecord(records, {
          sessionId,
          patientId,
          category: 'procedure',
          originalValue: proc.procedureName,
          dateStr: proc.date,
          provenance: proc.provenance
        });
      });
    }
  }

  // 2. Process Document Extractions
  extractions.forEach(ext => {
    ext.diagnosesMentioned.forEach(diag => {
      addOrMergeRecord(records, {
        sessionId,
        patientId,
        category: 'condition',
        originalValue: diag.name,
        dateStr: ext.documentDate, // fallback to doc date
        provenance: { source: 'ocr', documentId: ext.documentId }
      });
    });
    ext.medications.forEach(med => {
      addOrMergeRecord(records, {
        sessionId,
        patientId,
        category: 'medication',
        originalValue: `${med.name} ${med.dosage || ''}`.trim(),
        dateStr: ext.documentDate,
        provenance: { source: 'ocr', documentId: ext.documentId }
      });
    });
    ext.allergies.forEach(all => {
      addOrMergeRecord(records, {
        sessionId,
        patientId,
        category: 'allergy',
        originalValue: all.allergen,
        dateStr: ext.documentDate,
        provenance: { source: 'ocr', documentId: ext.documentId }
      });
    });
    ext.procedures.forEach(proc => {
      addOrMergeRecord(records, {
        sessionId,
        patientId,
        category: 'procedure',
        originalValue: proc.name,
        dateStr: proc.date || ext.documentDate,
        provenance: { source: 'ocr', documentId: ext.documentId }
      });
    });
    ext.laboratoryResults.forEach(lab => {
      addOrMergeRecord(records, {
        sessionId,
        patientId,
        category: 'laboratory',
        originalValue: `${lab.testName}: ${lab.valueRaw} ${lab.unit || ''}`.trim(),
        dateStr: lab.testDate || ext.documentDate,
        provenance: { source: 'ocr', documentId: ext.documentId }
      });
    });
  });

  // 3. Process Patient Interview
  // We look for answers that might represent conditions or meds.
  // For the prototype, we can use specific question IDs (like "past_medical_history", "medications").
  answers.forEach(ans => {
    if (ans.questionId === 'reason_for_visit' || ans.questionId === 'chief_complaint' || ans.section === 'chief_complaint' || ans.questionId === 'past_medical_history') {
      addOrMergeRecord(records, {
        sessionId,
        patientId,
        category: 'condition',
        originalValue: String(ans.normalizedValue || ans.rawValue || ans.transcript || ''),
        dateStr: undefined,
        provenance: { source: 'patient_voice', conversationMessageId: ans.id }
      });
    }
    if (ans.questionId === 'medications') {
      addOrMergeRecord(records, {
        sessionId,
        patientId,
        category: 'medication',
        originalValue: String(ans.normalizedValue || ans.rawValue),
        dateStr: undefined,
        provenance: { source: 'patient_voice', conversationMessageId: ans.id }
      });
    }
    if (ans.questionId === 'allergies') {
      addOrMergeRecord(records, {
        sessionId,
        patientId,
        category: 'allergy',
        originalValue: String(ans.normalizedValue || ans.rawValue),
        dateStr: undefined,
        provenance: { source: 'patient_voice', conversationMessageId: ans.id }
      });
    }
  });

  // 4. Detect Conflicts
  detectConflicts(records);

  // 5. Sort Chronologically
  records.sort((a, b) => {
    // Known dates first, unknown last
    if (a.datePrecision === 'unknown' && b.datePrecision !== 'unknown') return 1;
    if (b.datePrecision === 'unknown' && a.datePrecision !== 'unknown') return -1;
    
    // Sort descending by date
    if (a.date && b.date) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    
    return 0;
  });

  return {
    sessionId,
    patientId,
    records,
    lastUpdated: new Date().toISOString()
  };
}

interface RecordInput {
  sessionId: string;
  patientId: string;
  category: FusedRecordCategory;
  originalValue: string;
  dateStr?: string;
  provenance: DataProvenance;
}

function addOrMergeRecord(records: FusedClinicalRecord[], input: RecordInput) {
  if (!input.originalValue || input.originalValue.trim() === '') return;

  const normalized = normalizeClinicalFact(input.originalValue);
  const { date, datePrecision } = parseDatePrecision(input.dateStr);

  // Check if we can fuse with an existing record
  // Rules for fusion: Same category AND same normalized fact.
  const existing = records.find(r => r.category === input.category && r.clinicalFact === normalized);

  if (existing) {
    if (!existing.originalValues.includes(input.originalValue)) {
      existing.originalValues.push(input.originalValue);
    }
    // Update date if the new one is more precise, or just keep the existing one if we already have it.
    // For simplicity, we prioritize exact dates over unknown.
    if (existing.datePrecision === 'unknown' && datePrecision !== 'unknown') {
      existing.date = date;
      existing.datePrecision = datePrecision;
    }
    
    // Add provenance if not duplicate source
    const hasProv = existing.provenances.some(p => 
      p.source === input.provenance.source && 
      p.sourceId === input.provenance.sourceId && 
      p.documentId === input.provenance.documentId && 
      p.conversationMessageId === input.provenance.conversationMessageId
    );
    if (!hasProv) {
      existing.provenances.push(input.provenance);
    }
  } else {
    records.push({
      id: crypto.randomUUID(),
      sessionId: input.sessionId,
      patientId: input.patientId,
      category: input.category,
      clinicalFact: normalized,
      originalValues: [input.originalValue],
      date,
      datePrecision,
      provenances: [input.provenance],
      status: 'active',
      confidence: 'medium',
      createdAt: new Date().toISOString()
    });
  }
}

function detectConflicts(records: FusedClinicalRecord[]) {
  // A simple deterministic conflict rule for Phase 11:
  // If we have two medications with the same base name (e.g., Amlodipine) but different dosages, flag as conflict.
  
  const medRecords = records.filter(r => r.category === 'medication');
  
  for (let i = 0; i < medRecords.length; i++) {
    for (let j = i + 1; j < medRecords.length; j++) {
      const a = medRecords[i];
      const b = medRecords[j];
      
      const baseNameA = a.clinicalFact.split(' ')[0];
      const baseNameB = b.clinicalFact.split(' ')[0];
      
      if (baseNameA === baseNameB && a.clinicalFact !== b.clinicalFact) {
        // They share a base drug name but differ in dosage/full string
        // Mark both as conflict
        const groupId = `conflict_${crypto.randomUUID()}`;
        
        a.status = 'conflict';
        if (!a.conflicts) a.conflicts = [];
        a.conflicts.push({
          conflictGroupId: groupId,
          conflictingValue: b.originalValues[0],
          provenance: b.provenances[0]
        });
        
        b.status = 'conflict';
        if (!b.conflicts) b.conflicts = [];
        b.conflicts.push({
          conflictGroupId: groupId,
          conflictingValue: a.originalValues[0],
          provenance: a.provenances[0]
        });
      }
    }
  }
}
