/**
 * Task #33 — ABDM Integration Domain Models & Types
 * MediKiosk Clinical Interoperability Architecture
 */

import type { FhirBundle } from '../fhir/types';

export type AbdmEnvironment = 'mock' | 'sandbox' | 'production';

export type AbdmExchangeStatus =
  | 'prepared'
  | 'consent_pending'
  | 'submitted'
  | 'accepted'
  | 'processing'
  | 'completed'
  | 'rejected'
  | 'failed';

export type AbdmPurpose =
  | 'consultation'
  | 'treatment'
  | 'continuity_of_care'
  | 'record_access';

export interface AbdmHealthRecordRequest {
  patientId: string;
  encounterId?: string;
  abhaNumber?: string;
  abhaAddress?: string;
  consentId?: string;
  purpose: AbdmPurpose;
  environment?: AbdmEnvironment;
  includeDocuments?: boolean;
  eventTypes?: string[];
  fromDate?: string;
  toDate?: string;
  forceResubmit?: boolean;
  requestedAt?: string;
}

export interface AbdmTransportResult {
  success: boolean;
  requestId?: string;
  status: AbdmExchangeStatus;
  environment: AbdmEnvironment;
  message: string;
  timestamp: string;
  responseMetadata?: Record<string, unknown>;
  error?: string;
}

export interface AbdmTransportStatusResult {
  requestId: string;
  environment: AbdmEnvironment;
  status: AbdmExchangeStatus;
  lastUpdated: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface AbdmTransportProvider {
  sendHealthRecord(
    request: AbdmHealthRecordRequest,
    bundle: FhirBundle
  ): Promise<AbdmTransportResult>;

  getHealthRecordStatus(
    requestId: string,
    environment: AbdmEnvironment
  ): Promise<AbdmTransportStatusResult>;
}

export interface AbdmExchangeRecord {
  id: string;
  patient_id: string;
  encounter_id?: string;
  consent_id?: string;
  purpose: string;
  environment: AbdmEnvironment;
  request_id: string;
  abha_address?: string;
  fhir_version: string;
  bundle_hash: string;
  scope_json: Record<string, unknown>;
  status: AbdmExchangeStatus;
  provider: string;
  response_metadata: Record<string, unknown>;
  idempotency_key?: string;
  requested_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AbdmServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: 'CONSENT_DENIED' | 'NOT_FOUND' | 'INVALID_INPUT' | 'INTERNAL_SERVER_ERROR' | 'IDEMPOTENT_SKIPPED';
}
