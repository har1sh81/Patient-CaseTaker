/**
 * Task #27 — Relevance Scorer Engine
 * MediKiosk Clinical Engine
 */

import type { TimelineEvent } from '../timeline/types';
import type { RankingTier, RelevanceCandidate, RelevanceContext } from './types';
import { extractRelevanceFeatures } from './relevance-features';

/**
 * Score a single timeline candidate against consultation context.
 */
export function scoreRelevanceCandidate(
  event: TimelineEvent,
  context: RelevanceContext
): RelevanceCandidate | null {
  const features = extractRelevanceFeatures(event, context);
  let score = 0;

  if (features.chiefComplaintMatch) score += 40;
  if (features.symptomMatch) score += 40;
  if (features.conceptOverlap) score += 25;
  if (features.verifiedDiagnosisMatch) score += 25;
  if (features.attentionFlagMatch) score += 30;
  if (features.ayushMatch) score += 25;
  if (features.medicationMatch) score += 20;
  if (features.labMatch) score += 15;
  if (features.procedureMatch) score += 15;
  if (features.departmentMatch) score += 15;
  if (features.encounterLinkage) score += 10;
  if (features.recencyBonus) score += 10;

  // Cap score at 100
  score = Math.min(100, score);

  // Filter out candidates with score below 25
  if (score < 25) {
    return null;
  }

  // Deduplicate and filter empty reasons
  const uniqueReasons = Array.from(new Set(features.reasons));

  let rankingTier: RankingTier = 'possibly_relevant';
  if (score >= 80) {
    rankingTier = 'highly_relevant';
  } else if (score >= 50) {
    rankingTier = 'relevant';
  }

  return {
    id: event.id,
    sourceType: event.sourceType,
    sourceId: event.sourceId,
    patientId: event.patientId,
    encounterId: event.encounterId,
    documentId: event.sourceDocumentId,
    pageNumber: event.pageNumber,
    title: event.title,
    summary: event.summary,
    eventDate: event.eventDate,
    verificationStatus: event.verificationStatus,
    provenance: (event as any).provenance || {
      sourceType: event.sourceType,
      sourceId: event.sourceId,
      documentId: event.sourceDocumentId,
      pageNumber: event.pageNumber,
    },
    provenanceSource: event.provenanceSource,
    details: event.details,
    relevanceScore: score,
    relevanceReasons: uniqueReasons,
    rankingTier,
  };
}
