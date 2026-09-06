/**
 * Task #31 — Source & Provenance Service
 * MediKiosk Clinical Architecture
 * 
 * Main service entrypoint for provenance operations.
 * Enforces patient consent checks, audit logging, and cross-patient security boundaries.
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import { resolveProvenanceChain } from './provenance-resolver';
import { validateProvenanceChain, validateProvenanceReference } from './provenance-validator';
import { registerProvenanceLink as saveLink } from './provenance-links';
import type { ProvenanceChain, ProvenanceLink, ProvenanceServiceResponse, ProvenanceValidationResult } from './types';

/**
 * Audit logger for provenance events.
 * Crucial Safety Rule: Never put raw clinical text in audit metadata!
 */
export async function logProvenanceAudit(
  action: 'provenance_lookup_started' | 'provenance_lookup_completed' | 'provenance_lookup_failed' | 'provenance_validation_failed',
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
    console.error('[Provenance Audit Log] Error recording log:', err);
  }
}

/**
 * Fetches and resolves the complete provenance chain for a given clinical entity.
 * Enforces patient consent checks (`share_health_records`, `share_ayush_records`).
 */
export async function getProvenanceChain(
  patientId: string,
  sourceType: string,
  sourceId: string
): Promise<ProvenanceServiceResponse<ProvenanceChain>> {
  if (!patientId || typeof patientId !== 'string' || patientId.trim() === '') {
    return { success: false, errorCode: 'INVALID_INPUT', error: 'Patient ID is required' };
  }

  if (!sourceType || !sourceId) {
    return { success: false, errorCode: 'INVALID_INPUT', error: 'sourceType and sourceId are required' };
  }

  await logProvenanceAudit('provenance_lookup_started', patientId, { sourceType, sourceId });

  // 1. Consent Verification
  const permissionKey = sourceType.toLowerCase().includes('ayush') ? 'share_ayush_records' : 'share_health_records';
  const hasConsent = await hasValidConsent(patientId, permissionKey);

  if (!hasConsent) {
    await logProvenanceAudit('provenance_lookup_failed', patientId, { sourceType, sourceId, reason: 'CONSENT_DENIED' });
    return {
      success: false,
      errorCode: 'CONSENT_DENIED',
      error: `Patient consent '${permissionKey}' required to access clinical provenance`,
    };
  }

  // 2. Resolve Multi-Hop Chain
  try {
    const chain = await resolveProvenanceChain(patientId, sourceType, sourceId);

    // 3. Validate Cross-Patient Safety
    const validation = validateProvenanceChain(patientId, chain);
    if (!validation.valid && validation.reason?.includes('PROVENANCE_VALIDATION_FAILED')) {
      await logProvenanceAudit('provenance_validation_failed', patientId, { sourceType, sourceId, reason: validation.reason });
      return {
        success: false,
        errorCode: 'PROVENANCE_VALIDATION_FAILED',
        error: validation.reason,
      };
    }

    await logProvenanceAudit('provenance_lookup_completed', patientId, {
      sourceType,
      sourceId,
      nodeCount: chain.nodes.length,
      linkCount: chain.links.length,
      chainValid: chain.chainValid,
    });

    return {
      success: true,
      data: chain,
    };
  } catch (err: any) {
    await logProvenanceAudit('provenance_lookup_failed', patientId, { sourceType, sourceId, error: err.message });
    return {
      success: false,
      errorCode: 'INTERNAL_SERVER_ERROR',
      error: err.message || 'Failed to resolve provenance chain',
    };
  }
}

/**
 * Validates a clinical provenance reference or chain deterministically.
 */
export async function validateProvenance(
  patientId: string,
  sourceType: string,
  sourceId: string
): Promise<ProvenanceServiceResponse<ProvenanceValidationResult>> {
  const chainRes = await getProvenanceChain(patientId, sourceType, sourceId);

  if (!chainRes.success || !chainRes.data) {
    return {
      success: false,
      errorCode: chainRes.errorCode,
      error: chainRes.error,
    };
  }

  const validation = validateProvenanceChain(patientId, chainRes.data);
  return {
    success: true,
    data: validation,
  };
}

/**
 * Registers an explicit directed provenance link between two clinical entities.
 */
export async function registerProvenanceLink(
  link: ProvenanceLink
): Promise<ProvenanceServiceResponse<{ linkId?: string }>> {
  const result = await saveLink(link);
  if (!result.success) {
    return {
      success: false,
      errorCode: 'PROVENANCE_REGISTRATION_FAILED',
      error: result.error,
    };
  }

  return {
    success: true,
    data: { linkId: result.linkId },
  };
}
