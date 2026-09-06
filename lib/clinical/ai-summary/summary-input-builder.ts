/**
 * Task #30 — AI Summary Input Builder
 * MediKiosk Clinical Engine
 * 
 * Constructs a tightly controlled, minimal JSON payload for the LLM
 * derived strictly from Task #29 Structured Clinical Synthesis.
 * Does NOT include raw database dumps or unrestricted patient records.
 */

import type { StructuredClinicalSynthesis } from '../synthesis/types';
import type { AiSummaryInput, SummaryLanguage } from './types';

export function buildAiSummaryInput(
  patientId: string,
  synthesis: StructuredClinicalSynthesis,
  options?: {
    encounterId?: string;
    summaryLanguage?: SummaryLanguage;
  }
): AiSummaryInput {
  return {
    patientId,
    encounterId: options?.encounterId || synthesis.consultationContext?.encounterId,
    consultationContext: {
      chiefComplaint: synthesis.consultationContext?.chiefComplaint || '',
      department: synthesis.consultationContext?.department || '',
      consultationMode: synthesis.consultationContext?.consultationMode || '',
      encounterId: options?.encounterId || synthesis.consultationContext?.encounterId,
    },
    currentPresentation: Array.isArray(synthesis.currentPresentation) ? synthesis.currentPresentation : [],
    relevantHistory: Array.isArray(synthesis.relevantHistory) ? synthesis.relevantHistory : [],
    medications: Array.isArray(synthesis.medications) ? synthesis.medications : [],
    vitals: Array.isArray(synthesis.vitals) ? synthesis.vitals : [],
    laboratoryFindings: Array.isArray(synthesis.laboratoryFindings) ? synthesis.laboratoryFindings : [],
    procedures: Array.isArray(synthesis.procedures) ? synthesis.procedures : [],
    diagnoses: Array.isArray(synthesis.diagnoses) ? synthesis.diagnoses : [],
    ayushContext: Array.isArray(synthesis.ayushContext) ? synthesis.ayushContext : [],
    unresolvedConflicts: Array.isArray(synthesis.unresolvedConflicts) ? synthesis.unresolvedConflicts : [],
    uncertainties: Array.isArray(synthesis.uncertainties) ? synthesis.uncertainties : [],
    missingInformation: Array.isArray(synthesis.missingInformation) ? synthesis.missingInformation : [],
    summaryLanguage: options?.summaryLanguage || 'en',
  };
}
