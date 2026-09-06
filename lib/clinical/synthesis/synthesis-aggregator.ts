/**
 * Task #29 — Synthesis Evidence Aggregator
 * MediKiosk Clinical Engine
 */

import { getRelevantClinicalEvidence } from '../relevance';
import { getPatientTimeline } from '../timeline/timeline-service';
import { analyzePatientConflicts } from '../conflicts';
import type { TimelineEvent } from '../timeline/types';
import type { RelevanceCandidate } from '../relevance/types';
import type { ConflictRecord } from '../conflicts/types';
import type { ClinicalSynthesisContext } from './types';

export interface AggregatedEvidence {
  context: ClinicalSynthesisContext;
  relevantCandidates: RelevanceCandidate[];
  timelineEvents: TimelineEvent[];
  conflicts: ConflictRecord[];
}

/**
 * Aggregates existing patient evidence, timeline events, and conflict records
 * using Task #27 relevance, Task #26 timeline, and Task #28 conflict resolution modules.
 */
export async function aggregateSynthesisEvidence(
  context: ClinicalSynthesisContext
): Promise<AggregatedEvidence> {
  // 1. Task #27 Relevant Evidence Retrieval
  const relevanceResult = await getRelevantClinicalEvidence({
    patientId: context.patientId,
    encounterId: context.encounterId,
    department: context.department,
    chiefComplaint: context.chiefComplaint,
    symptoms: context.symptoms,
    clinicalFacts: context.clinicalFacts,
    requestedEventTypes: context.requestedEventTypes,
    fromDate: context.fromDate,
    toDate: context.toDate,
    limit: Math.max(context.limit || 20, 30), // Ensure sufficient coverage for synthesis
    currentDate: context.currentDate,
  });

  const relevantCandidates = relevanceResult.success && relevanceResult.data
    ? relevanceResult.data.candidates
    : [];

  // 2. Task #26 Timeline Event Fetching
  const timelineResult = await getPatientTimeline({
    patientId: context.patientId,
    encounterId: context.encounterId,
    department: context.department,
    fromDate: context.fromDate,
    toDate: context.toDate,
    descending: true,
  });

  const timelineEvents = timelineResult.success && timelineResult.data
    ? timelineResult.data.events
    : [];

  // 3. Task #28 Clinical Conflicts Analysis
  const conflictResult = await analyzePatientConflicts({
    patientId: context.patientId,
    encounterId: context.encounterId,
    fromDate: context.fromDate,
    toDate: context.toDate,
    includeResolved: true,
  });

  const conflicts = conflictResult.success && conflictResult.data
    ? conflictResult.data.conflicts
    : [];

  return {
    context,
    relevantCandidates,
    timelineEvents,
    conflicts,
  };
}
