/**
 * Task #30 — AI Clinical Summary Types
 * MediKiosk Clinical Engine
 */

import type { SynthesisSectionItem, UnresolvedConflictItem } from '../synthesis/types';

export type SummaryLanguage = 'en' | 'ta' | 'hi';

export interface AiSummaryInput {
  patientId: string;
  encounterId?: string;
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
  summaryLanguage?: SummaryLanguage;
}

export interface AiClinicalSummary {
  summaryText: string;
  status: 'draft';
  generatedAt: string;
  modelProvider: string;
  modelName: string;
  promptVersion: string;
  sourceSynthesisVersion: string;
  sourceFingerprint: string;
  safetyCheckStatus: 'passed' | 'rejected' | 'warning';
  physicianReviewRequired: true;
  generationWarnings: string[];
  provenanceReferences?: Record<string, any>[];
}

export interface AiSummaryGenerationResult {
  success: boolean;
  data?: AiClinicalSummary;
  errorCode?: string;
  error?: string;
  warnings?: string[];
}

export interface ClinicalSummaryProvider {
  generateSummary(input: AiSummaryInput): Promise<AiSummaryGenerationResult>;
}

export interface PhysicianReviewRequest {
  encounterId?: string;
  action: 'accept' | 'edit';
  editedText?: string;
  reviewedBy?: string;
}

export interface PhysicianNotesEditsData {
  status: 'accepted' | 'edited';
  editedText: string;
  reviewedBy?: string;
  reviewedAt: string;
  originalAiSummaryText: string;
}

export interface AiSummaryServiceRequest {
  patientId: string;
  encounterId?: string;
  summaryLanguage?: SummaryLanguage;
  forceRegenerate?: boolean;
}

export interface AiSummaryServiceResponse {
  success: boolean;
  data?: {
    patientId: string;
    encounterId?: string;
    summary: AiClinicalSummary;
    physicianReview?: PhysicianNotesEditsData;
  };
  errorCode?: string;
  error?: string;
}
