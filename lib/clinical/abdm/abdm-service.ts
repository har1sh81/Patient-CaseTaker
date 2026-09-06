/**
 * Task #33 — ABDM Exchange Service
 * MediKiosk Clinical Architecture
 * 
 * Main orchestration service for ABDM health record exchange.
 * Enforces consent, patient boundaries, payload hashing, idempotency, audit, and provider transport.
 */

import * as crypto from 'crypto';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getAbdmConfig } from './abdm-config';
import { verifyAbdmConsent } from './abdm-consent';
import { prepareAbdmFhirBundle } from './abdm-fhir-adapter';
import { getAbdmTransportProvider } from './abdm-provider';
import { validateAbdmExchangeRequest } from './abdm-validation';
import type { AbdmHealthRecordRequest, AbdmTransportResult, AbdmServiceResponse, AbdmExchangeRecord } from './types';

/**
 * Audit logger for ABDM exchange events.
 * High-level metadata only (NEVER logs credentials, access tokens, or raw medical text).
 */
export async function logAbdmAudit(
  action: 'abdm_exchange_prepared' | 'abdm_exchange_submitted' | 'abdm_exchange_completed' | 'abdm_exchange_rejected' | 'abdm_exchange_failed' | 'abdm_status_checked',
  patientId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from('audit_logs').insert({
      action,
      actor_type: 'clinician',
      actor_id: patientId,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[ABDM Audit Log] Error writing audit log:', err);
  }
}

export async function submitAbdmExchange(
  request: AbdmHealthRecordRequest
): Promise<AbdmServiceResponse<{
  exchangeId: string;
  requestId: string;
  environment: string;
  status: string;
  fhirVersion: string;
  bundleHash: string;
  idempotentSkipped?: boolean;
  message: string;
}>> {
  // 1. Validate request syntax
  const valResult = validateAbdmExchangeRequest(request);
  if (!valResult.valid) {
    return { success: false, errorCode: 'INVALID_INPUT', error: valResult.reason };
  }

  const config = getAbdmConfig();
  const environment = request.environment || config.environment;
  const patientId = request.patientId;

  await logAbdmAudit('abdm_exchange_prepared', patientId, {
    encounterId: request.encounterId,
    purpose: request.purpose,
    environment,
    forceResubmit: request.forceResubmit,
  });

  // 2. Consent Verification
  const isAyush = request.eventTypes?.includes('ayush');
  const { hasConsent, permissionKey } = await verifyAbdmConsent(patientId, isAyush);

  if (!hasConsent) {
    await logAbdmAudit('abdm_exchange_rejected', patientId, { reason: 'CONSENT_DENIED', permissionKey });
    return {
      success: false,
      errorCode: 'CONSENT_DENIED',
      error: `Patient consent '${permissionKey}' required to perform ABDM exchange`,
    };
  }

  try {
    const adminSupabase = await createAdminClient();

    // Verify patient exists
    const { data: patient } = await adminSupabase.from('patients').select('id').eq('id', patientId).single();
    if (!patient) {
      await logAbdmAudit('abdm_exchange_failed', patientId, { reason: 'PATIENT_NOT_FOUND' });
      return { success: false, errorCode: 'NOT_FOUND', error: 'Patient record not found' };
    }

    // Verify encounter ownership if specified
    if (request.encounterId) {
      const { data: enc } = await adminSupabase.from('encounters').select('id').eq('id', request.encounterId).eq('patient_id', patientId).maybeSingle();
      if (!enc) {
        await logAbdmAudit('abdm_exchange_failed', patientId, { reason: 'ENCOUNTER_NOT_FOUND_OR_MISMATCH' });
        return { success: false, errorCode: 'NOT_FOUND', error: 'Encounter not found or does not belong to patient' };
      }
    }

    // Fetch ABHA identifier if available
    const { data: abhaRow } = await adminSupabase
      .from('patient_external_identifiers')
      .select('identifier_value')
      .eq('patient_id', patientId)
      .in('identifier_type', ['abha_address', 'abha_number'])
      .maybeSingle();

    const abhaAddress = request.abhaAddress || abhaRow?.identifier_value || undefined;

    // 3. Prepare Task #32 FHIR Bundle & compute SHA-256 Bundle Hash
    const fhirPrep = await prepareAbdmFhirBundle(patientId, {
      encounterId: request.encounterId,
      includeDocuments: request.includeDocuments ?? false,
      includeProvenance: true,
    });

    if (!fhirPrep.success || !fhirPrep.bundle || !fhirPrep.bundleHash) {
      await logAbdmAudit('abdm_exchange_failed', patientId, { error: fhirPrep.error });
      return {
        success: false,
        errorCode: fhirPrep.errorCode || 'INTERNAL_SERVER_ERROR',
        error: fhirPrep.error || 'Failed to prepare FHIR payload for ABDM exchange',
      };
    }

    const bundle = fhirPrep.bundle;
    const bundleHash = fhirPrep.bundleHash;
    const fhirVersion = fhirPrep.fhirVersion || '4.0.1';

    // 4. Calculate Idempotency Key
    const rawIdempotencyString = `${patientId}:${request.encounterId || 'all'}:${request.consentId || 'default'}:${request.purpose}:${bundleHash}:${environment}`;
    const baseIdempotencyKey = crypto.createHash('sha256').update(rawIdempotencyString).digest('hex');
    const idempotencyKey = request.forceResubmit ? `${baseIdempotencyKey}:force:${Date.now()}` : baseIdempotencyKey;

    // 5. Check Idempotency (unless forceResubmit is explicitly true)
    if (!request.forceResubmit) {
      const { data: existing } = await adminSupabase
        .from('abdm_exchanges')
        .select('*')
        .eq('idempotency_key', baseIdempotencyKey)
        .maybeSingle();

      if (existing) {
        await logAbdmAudit('abdm_exchange_completed', patientId, {
          exchangeId: existing.id,
          requestId: existing.request_id,
          idempotentSkipped: true,
        });

        return {
          success: true,
          data: {
            exchangeId: existing.id,
            requestId: existing.request_id,
            environment: existing.environment,
            status: existing.status,
            fhirVersion: existing.fhir_version,
            bundleHash: existing.bundle_hash,
            idempotentSkipped: true,
            message: environment === 'mock'
              ? 'DEMO / MOCK ABDM EXCHANGE — Idempotent exchange request (returned previous transaction record)'
              : 'Previous ABDM exchange record returned via idempotency key',
          },
        };
      }
    }

    // 6. Execute Provider Transport
    const provider = getAbdmTransportProvider(environment);
    const transportResult: AbdmTransportResult = await provider.sendHealthRecord(request, bundle);

    if (!transportResult.success || !transportResult.requestId) {
      await logAbdmAudit('abdm_exchange_failed', patientId, {
        environment,
        error: transportResult.message,
      });

      return {
        success: false,
        errorCode: 'INTERNAL_SERVER_ERROR',
        error: transportResult.message || 'ABDM transport provider execution failed',
      };
    }

    // 7. Persist Exchange Record in public.abdm_exchanges
    const { data: insertedRecord, error: dbError } = await adminSupabase
      .from('abdm_exchanges')
      .insert({
        patient_id: patientId,
        encounter_id: request.encounterId || null,
        consent_id: request.consentId || null,
        purpose: request.purpose,
        environment,
        request_id: transportResult.requestId,
        abha_address: abhaAddress || null,
        fhir_version: fhirVersion,
        bundle_hash: bundleHash,
        scope_json: {
          includeDocuments: request.includeDocuments ?? false,
          eventTypes: request.eventTypes || ['encounter', 'lab', 'medication', 'procedure'],
          fromDate: request.fromDate || null,
          toDate: request.toDate || null,
        },
        status: transportResult.status,
        provider: environment === 'mock' ? 'mock' : 'http',
        response_metadata: transportResult.responseMetadata || {},
        idempotency_key: idempotencyKey,
        requested_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (dbError) {
      console.error('[ABDM Service] Error persisting exchange record:', dbError);
    }

    await logAbdmAudit('abdm_exchange_submitted', patientId, {
      exchangeId: insertedRecord?.id,
      requestId: transportResult.requestId,
      environment,
      status: transportResult.status,
      bundleHash,
    });

    return {
      success: true,
      data: {
        exchangeId: insertedRecord?.id || transportResult.requestId,
        requestId: transportResult.requestId,
        environment,
        status: transportResult.status,
        fhirVersion,
        bundleHash,
        idempotentSkipped: false,
        message: transportResult.message,
      },
    };
  } catch (err: any) {
    console.error('[ABDM Service] Exchange exception:', err);
    await logAbdmAudit('abdm_exchange_failed', patientId, { error: err.message });
    return {
      success: false,
      errorCode: 'INTERNAL_SERVER_ERROR',
      error: err.message || 'An unexpected error occurred during ABDM exchange submission',
    };
  }
}
