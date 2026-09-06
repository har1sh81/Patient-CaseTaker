/**
 * Task #26 — Clinical Timeline Generation Types
 * MediKiosk Clinical Engine
 */

import type { DocumentType } from '../documents/document-storage-types';

export type VerificationStatus = 'unverified' | 'verified' | 'doctor_verified' | 'reviewed' | 'rejected' | string;
export type ProvenanceSource =
  | 'patient_uploaded'
  | 'historical_document'
  | 'external_document'
  | 'scanned_paper'
  | 'kiosk_upload'
  | 'patient_reported'
  | 'kiosk_device'
  | 'document_extraction'
  | string;

export type TimelineEventType =
  | 'encounter'
  | 'symptom'
  | 'vital'
  | 'medication'
  | 'lab'
  | 'diagnosis'
  | 'procedure'
  | 'document'
  | 'ayush_assessment'
  | 'attention_flag'
  | 'conversation';

export type EventDatePrecision = 'day' | 'month' | 'year' | 'encounter' | 'unknown';

export type ImportanceLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Standardized Chronological Clinical Timeline Event.
 */
export interface TimelineEvent {
  id: string;
  patientId: string;
  encounterId?: string;
  eventDate?: string; // e.g. "2026-04-12", "2026-04", "2018"
  eventDatePrecision: EventDatePrecision;
  eventDateSource?: string; // e.g. "specimen_date", "procedure_date", "encounter_date", "created_at"
  eventType: TimelineEventType;
  title: string;
  summary: string;
  sourceType: string;
  sourceId: string;
  sourceDocumentId?: string;
  pageNumber?: number;
  sourceText?: string;
  verificationStatus: VerificationStatus;
  provenanceSource?: ProvenanceSource;
  importance?: ImportanceLevel;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Query options for fetching patient timelines.
 */
export interface TimelineQueryOptions {
  patientId: string;
  department?: string;
  encounterId?: string;
  fromDate?: string;
  toDate?: string;
  eventTypes?: TimelineEventType[];
  descending?: boolean; // default true (newest first)
}

/**
 * Service response payload for timeline queries.
 */
export interface TimelineResult {
  success: boolean;
  data?: {
    patientId: string;
    events: TimelineEvent[];
    datedEvents: TimelineEvent[];
    undatedEvents: TimelineEvent[];
    total: number;
  };
  errorCode?: string;
  error?: string;
}
