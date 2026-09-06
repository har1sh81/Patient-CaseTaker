/**
 * Task #29 — Clinical Synthesis Types
 * MediKiosk Clinical Engine
 */

export interface ClinicalSynthesisContext {
  patientId: string;
  encounterId?: string;
  department?: string;
  consultationMode?: string;
  chiefComplaint?: string;
  symptoms?: string[];
  clinicalFacts?: string[];
  requestedEventTypes?: string[];
  fromDate?: string;
  toDate?: string;
  limit?: number;
  currentDate?: string;
}

export interface SynthesisSectionItem {
  id: string;
  title: string;
  summary: string;
  details?: Record<string, any>;
  eventDate?: string;
  eventDatePrecision?: string;
  sourceType: string;
  sourceId: string;
  sourceDocumentId?: string;
  pageNumber?: number;
  verificationStatus: string;
  provenanceSource: string;
  provenance?: Record<string, any>;
  conflictFlag?: boolean;
  needsReview?: boolean;
  status?: string;
  referenceRange?: string;
  interpretation?: string;
  isNegated?: boolean;
}

export interface UnresolvedConflictItem {
  id: string;
  conflictType: string;
  severity: string;
  resolutionStatus: string;
  requiresClinicianReview: boolean;
  explanation: string;
  candidates: any[];
  preferredCandidate?: any;
}

export interface StructuredClinicalSynthesis {
  consultationContext: {
    chiefComplaint?: string;
    department?: string;
    consultationMode?: string;
    encounterId?: string;
  };
  currentPresentation: SynthesisSectionItem[];
  relevantHistory: SynthesisSectionItem[];
  medications: SynthesisSectionItem[];
  vitals: SynthesisSectionItem[];
  laboratoryFindings: SynthesisSectionItem[];
  procedures: SynthesisSectionItem[];
  diagnoses: SynthesisSectionItem[];
  ayushContext: SynthesisSectionItem[];
  unresolvedConflicts: UnresolvedConflictItem[];
  uncertainties: SynthesisSectionItem[];
  missingInformation: string[];
  summaryText: string;
}

export interface ClinicalSynthesisRecord {
  id?: string;
  patientId: string;
  encounterId?: string;
  synthesisVersion: string;
  generatedAt: string;
  verificationStatus: string;
  fingerprint: string;
  synthesis: StructuredClinicalSynthesis;
}

export interface ClinicalSynthesisResult {
  success: boolean;
  data?: ClinicalSynthesisRecord;
  errorCode?: string;
  error?: string;
}
