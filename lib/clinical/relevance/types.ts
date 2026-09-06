/**
 * Task #27 — Clinical Relevance Retrieval Types
 * MediKiosk Clinical Engine
 */

import type { ProvenanceSource, VerificationStatus } from '../timeline/types';

export type RankingTier = 'highly_relevant' | 'relevant' | 'possibly_relevant';

export interface RelevanceContext {
  patientId: string;
  encounterId?: string;
  department?: string;
  consultationMode?: string;
  chiefComplaint?: string;
  symptoms?: string[];
  clinicalFacts?: string[];
  questionContext?: string;
  requestedEventTypes?: string[];
  currentDate?: string; // ISO date string YYYY-MM-DD
  limit?: number; // Default 20, max 50
  fromDate?: string;
  toDate?: string;
}

export interface RelevanceCandidate {
  id: string;
  sourceType: string;
  sourceId: string;
  patientId: string;
  encounterId?: string;
  documentId?: string;
  pageNumber?: number;
  title: string;
  summary: string;
  eventDate?: string;
  verificationStatus: VerificationStatus;
  provenance: Record<string, unknown>;
  provenanceSource?: ProvenanceSource;
  details?: Record<string, unknown>;
  relevanceScore: number;
  relevanceReasons: string[];
  rankingTier: RankingTier;
}

export interface RelevanceResult {
  success: boolean;
  errorCode?: string;
  error?: string;
  data?: {
    queryContext: Record<string, unknown>;
    candidates: RelevanceCandidate[];
    totalRetrieved: number;
    totalReturned: number;
    generatedAt: string;
  };
}
