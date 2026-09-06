/**
 * Task #28 — Clinical Conflict Resolution Types
 * MediKiosk Clinical Engine
 */

export type ConflictType =
  | 'medication_status_conflict'
  | 'medication_dose_conflict'
  | 'lab_value_conflict'
  | 'lab_unit_conflict'
  | 'diagnosis_status_conflict'
  | 'procedure_status_conflict'
  | 'temporal_difference'
  | 'source_document_conflict'
  | 'extraction_uncertainty'
  | 'duplicate_or_near_duplicate'
  | 'other';

export type ResolutionStatus =
  | 'resolved_by_temporal_order'
  | 'resolved_by_explicit_status'
  | 'resolved_by_source_verification'
  | 'resolved_as_non_conflict'
  | 'unresolved'
  | 'needs_clinician_review';

export type ConflictSeverity = 'informational' | 'low' | 'moderate' | 'high';

export interface ConflictCandidate {
  sourceType: string; // 'medication' | 'lab' | 'diagnosis' | 'procedure' | 'vital' | 'document_extraction' | etc.
  sourceId: string;
  documentId?: string;
  eventDate?: string;
  eventDatePrecision?: string;
  value: unknown;
  unit?: string;
  status?: string;
  verificationStatus: string;
  provenance: Record<string, unknown>;
  sourceText?: string;
  needsReview?: boolean;
}

export interface ConflictRecord {
  id: string;
  patientId: string;
  encounterId?: string;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  resolutionStatus: ResolutionStatus;
  explanation: string;
  candidates: ConflictCandidate[];
  preferredCandidate?: ConflictCandidate | null;
  requiresClinicianReview: boolean;
  createdAt: string;
  updatedAt?: string;
  provenance?: Record<string, unknown>;
  conflictKey?: string;
}

export interface ConflictAnalysisOptions {
  patientId: string;
  encounterId?: string;
  eventTypes?: string[];
  fromDate?: string;
  toDate?: string;
  includeResolved?: boolean;
  limit?: number;
}

export interface ConflictQueryFilters {
  patientId: string;
  encounterId?: string;
  conflictType?: ConflictType;
  severity?: ConflictSeverity;
  includeResolved?: boolean;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export interface ConflictAnalysisResult {
  success: boolean;
  errorCode?: string;
  error?: string;
  data?: {
    patientId: string;
    conflicts: ConflictRecord[];
    summary: {
      total: number;
      unresolved: number;
      resolved: number;
      needsReview: number;
    };
  };
}
