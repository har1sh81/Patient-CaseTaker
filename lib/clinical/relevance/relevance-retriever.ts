/**
 * Task #27 — Relevance Candidate Retriever
 * MediKiosk Clinical Engine
 */

import { getPatientTimeline } from '../timeline/timeline-service';
import type { RelevanceCandidate, RelevanceContext } from './types';
import { scoreRelevanceCandidate } from './relevance-scorer';

export async function retrieveRelevantCandidates(
  context: RelevanceContext
): Promise<{ candidates: RelevanceCandidate[]; totalRetrieved: number }> {
  // 1. Fetch Timeline Events for Patient
  const timelineRes = await getPatientTimeline({
    patientId: context.patientId,
    encounterId: context.encounterId,
    department: context.department,
    fromDate: context.fromDate,
    toDate: context.toDate,
    eventTypes: context.requestedEventTypes as any,
    descending: true,
  });

  if (!timelineRes.success || !timelineRes.data) {
    return { candidates: [], totalRetrieved: 0 };
  }

  const rawEvents = timelineRes.data.events || [];
  const scoredCandidates: RelevanceCandidate[] = [];

  // 2. Score Candidates
  for (const ev of rawEvents) {
    const candidate = scoreRelevanceCandidate(ev, context);
    if (candidate) {
      scoredCandidates.push(candidate);
    }
  }

  // 3. Deduplicate by sourceType + sourceId
  const seen = new Set<string>();
  const uniqueCandidates: RelevanceCandidate[] = [];
  for (const cand of scoredCandidates) {
    const key = `${cand.sourceType}:${cand.sourceId}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCandidates.push(cand);
    }
  }

  // 4. Deterministic Sort: Score DESC -> Event Date DESC -> Stable ID ASC
  uniqueCandidates.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    const dateA = a.eventDate || '';
    const dateB = b.eventDate || '';
    if (dateB !== dateA) {
      return dateB.localeCompare(dateA);
    }
    return a.id.localeCompare(b.id);
  });

  const totalRetrieved = uniqueCandidates.length;

  // 5. Apply Limit (default 20, max 50)
  const maxLimit = Math.min(50, Math.max(1, context.limit ?? 20));
  const returnedCandidates = uniqueCandidates.slice(0, maxLimit);

  return {
    candidates: returnedCandidates,
    totalRetrieved,
  };
}
