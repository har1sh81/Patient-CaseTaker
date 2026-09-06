/**
 * Task #29 — Clinical Synthesis Rules Engine
 * MediKiosk Clinical Engine
 */

import type { AggregatedEvidence } from './synthesis-aggregator';
import type {
  StructuredClinicalSynthesis,
  SynthesisSectionItem,
  UnresolvedConflictItem,
} from './types';
import type { TimelineEvent } from '../timeline/types';
import type { RelevanceCandidate } from '../relevance/types';
import type { ConflictRecord } from '../conflicts/types';

/**
 * Checks if a clinical statement or text explicitly contains negation keywords.
 */
export function isExplicitlyNegated(text?: string): boolean {
  if (!text) return false;
  const norm = text.toLowerCase();
  return (
    norm.startsWith('no ') ||
    norm.includes(' no ') ||
    norm.includes('denies ') ||
    norm.includes('negative for') ||
    norm.includes('absent') ||
    norm.includes('without') ||
    norm.includes('nil') ||
    norm.includes('இல்லை') ||
    norm.includes('नहीं')
  );
}

/**
 * Maps a TimelineEvent or RelevanceCandidate into a standardized SynthesisSectionItem.
 */
export function mapToSectionItem(
  item: TimelineEvent | RelevanceCandidate,
  conflictFlag: boolean = false
): SynthesisSectionItem {
  const isCandidate = 'relevanceScore' in item;
  const title = item.title;
  const summary = item.summary;
  const textToScan = `${title} ${summary}`;
  const isNegated = isExplicitlyNegated(textToScan);
  const needsReview = (item as any).needsReview || (item as any).details?.needsReview || false;

  return {
    id: item.id,
    title,
    summary,
    details: item.details || {},
    eventDate: item.eventDate,
    eventDatePrecision: (item as any).eventDatePrecision,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    sourceDocumentId: isCandidate ? (item as RelevanceCandidate).documentId : (item as TimelineEvent).sourceDocumentId,
    pageNumber: item.pageNumber,
    verificationStatus: item.verificationStatus || 'unverified',
    provenanceSource: item.provenanceSource || 'patient_reported',
    provenance: (item as any).provenance,
    conflictFlag,
    needsReview,
    status: (item as any).details?.status || (item as any).details?.medicationStatus,
    referenceRange: (item as any).details?.referenceRange,
    interpretation: (item as any).details?.interpretation,
    isNegated,
  };
}

/**
 * Generates structured clinical synthesis from aggregated evidence.
 * Strictly source-grounded: 0 diagnoses, 0 prescriptions, 0 trend calculations, 0 LLM calls.
 */
export function buildStructuredClinicalSynthesis(
  aggregated: AggregatedEvidence
): StructuredClinicalSynthesis {
  const { context, relevantCandidates, timelineEvents, conflicts } = aggregated;

  // 1. Consultation Context
  const consultationContext = {
    chiefComplaint: context.chiefComplaint,
    department: context.department,
    consultationMode: context.consultationMode,
    encounterId: context.encounterId,
  };

  // Build unified items pool from relevantCandidates and timelineEvents
  const seenKeys = new Set<string>();
  const itemsPool: SynthesisSectionItem[] = [];

  const addPoolItem = (item: TimelineEvent | RelevanceCandidate) => {
    const key = `${item.sourceType}:${item.sourceId}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      const isConflicting = conflicts.some(
        (c) =>
          c.candidates.some((cand) => cand.sourceType === item.sourceType && cand.sourceId === item.sourceId)
      );
      itemsPool.push(mapToSectionItem(item, isConflicting));
    }
  };

  // Add relevant candidates first (higher relevance weight)
  for (const cand of relevantCandidates) addPoolItem(cand);
  // Add timeline events for completeness
  for (const ev of timelineEvents) addPoolItem(ev);

  // 2. Current Presentation (Current encounter symptoms and current observations)
  const currentPresentation: SynthesisSectionItem[] = itemsPool.filter(
    (item) =>
      item.sourceType === 'symptom' ||
      (context.encounterId && item.details?.encounterId === context.encounterId)
  );

  // 3. Relevant Past History (Historical symptoms, past encounters, previous documents)
  const relevantHistory: SynthesisSectionItem[] = itemsPool.filter(
    (item) =>
      (item.sourceType === 'symptom' && item.eventDate && item.eventDate < '2026-01-01') ||
      item.sourceType === 'encounter' ||
      item.sourceType === 'document' ||
      (item.sourceType === 'procedure' && item.status === 'historical')
  );

  // 4. Current Medications
  const medications: SynthesisSectionItem[] = itemsPool.filter((item) => item.sourceType === 'medication');

  // 5. Relevant Vitals
  const vitals: SynthesisSectionItem[] = itemsPool.filter((item) => item.sourceType === 'vital');

  // 6. Relevant Laboratory Findings
  const laboratoryFindings: SynthesisSectionItem[] = itemsPool.filter((item) => item.sourceType === 'lab');

  // 7. Relevant Procedures
  const procedures: SynthesisSectionItem[] = itemsPool.filter((item) => item.sourceType === 'procedure');

  // 8. Existing Diagnoses (ONLY existing physician-verified or documented diagnoses, 0 new created)
  const diagnoses: SynthesisSectionItem[] = itemsPool.filter((item) => item.sourceType === 'diagnosis');

  // 9. AYUSH Context
  const ayushContext: SynthesisSectionItem[] = itemsPool.filter((item) => item.sourceType === 'ayush_assessment');

  // 10. Unresolved Conflicts
  const unresolvedConflicts: UnresolvedConflictItem[] = conflicts
    .filter((c) => c.resolutionStatus === 'unresolved' || c.requiresClinicianReview)
    .map((c) => ({
      id: c.id,
      conflictType: c.conflictType,
      severity: c.severity,
      resolutionStatus: c.resolutionStatus,
      requiresClinicianReview: c.requiresClinicianReview,
      explanation: c.explanation,
      candidates: c.candidates,
      preferredCandidate: c.preferredCandidate,
    }));

  // 11. Uncertainties
  const uncertainties: SynthesisSectionItem[] = itemsPool.filter(
    (item) => item.needsReview || (item.details && (item.details.isUncertain || item.details.needsReview))
  );

  // 12. Missing Information (Standardized phrasing "Not documented in retrieved records")
  const missingInformation: string[] = [];
  const hasAllergies = itemsPool.some((i) => i.title.toLowerCase().includes('allergy') || i.summary.toLowerCase().includes('allergy'));
  const hasSmoking = itemsPool.some((i) => i.title.toLowerCase().includes('smoking') || i.summary.toLowerCase().includes('tobacco'));
  const hasFamilyHistory = itemsPool.some((i) => i.title.toLowerCase().includes('family history') || i.summary.toLowerCase().includes('family'));

  if (!hasAllergies) missingInformation.push('Allergy status not documented in retrieved records');
  if (!hasSmoking) missingInformation.push('Smoking history not documented in retrieved records');
  if (!hasFamilyHistory) missingInformation.push('Family history not documented in retrieved records');

  // 13. Summary Text (Concise source-grounded narrative)
  const summaryParts: string[] = [];

  if (context.chiefComplaint) {
    summaryParts.push(`Consultation is for ${context.chiefComplaint}.`);
  } else {
    summaryParts.push('Consultation context documented.');
  }

  if (currentPresentation.length > 0) {
    const symList = currentPresentation.slice(0, 3).map((s) => s.title).join(', ');
    summaryParts.push(`Documented current presentation includes ${symList}.`);
  }

  if (vitals.length > 0) {
    const vList = vitals.slice(0, 2).map((v) => `${v.title}: ${v.summary}`).join('; ');
    summaryParts.push(`Recorded vitals: ${vList}.`);
  }

  if (medications.length > 0) {
    const mList = medications.slice(0, 2).map((m) => m.title).join(', ');
    summaryParts.push(`Documented medications: ${mList}.`);
  }

  if (diagnoses.length > 0) {
    const dList = diagnoses.map((d) => d.title).join(', ');
    summaryParts.push(`Documented diagnoses include ${dList}.`);
  }

  if (unresolvedConflicts.length > 0) {
    summaryParts.push(`${unresolvedConflicts.length} clinical conflict(s) require clinician review.`);
  }

  const summaryText = summaryParts.join(' ');

  return {
    consultationContext,
    currentPresentation,
    relevantHistory,
    medications,
    vitals,
    laboratoryFindings,
    procedures,
    diagnoses,
    ayushContext,
    unresolvedConflicts,
    uncertainties,
    missingInformation,
    summaryText,
  };
}
