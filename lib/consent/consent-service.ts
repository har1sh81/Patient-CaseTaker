import { createClient, createAdminClient } from '@/lib/supabase/server';

export const SUPPORTED_PERMISSIONS = [
  'share_health_records',
  'share_ayush_records',
  'voice_recording',
  'ocr_processing',
] as const;

export type SupportedPermission = typeof SUPPORTED_PERMISSIONS[number];

export interface CheckConsentResult {
  allowed: boolean;
  reason?: string;
  consentId?: string;
}

/**
 * Server-side permission check for a patient's consent.
 * Evaluates whether the patient has active, valid, non-revoked, non-expired consent
 * for the specific requested permission.
 */
export async function hasValidConsent(
  patientId: string,
  permission: string,
  currentTime: Date = new Date()
): Promise<boolean> {
  const result = await evaluateConsent(patientId, permission, currentTime);
  return result.allowed;
}

/**
 * Evaluates detailed consent status for a given patient and permission.
 */
export async function evaluateConsent(
  patientId: string,
  permission: string,
  currentTime: Date = new Date()
): Promise<CheckConsentResult> {
  // Validate permission key
  if (!SUPPORTED_PERMISSIONS.includes(permission as SupportedPermission)) {
    return { allowed: false, reason: `Unsupported permission key '${permission}'` };
  }

  const supabase = await createAdminClient();

  // 1. Verify patient exists
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .maybeSingle();

  if (patientError || !patient) {
    return { allowed: false, reason: 'Patient not found' };
  }

  // 2. Fetch all consent records for patient ordered by created_at DESC
  const { data: consents, error: consentError } = await supabase
    .from('patient_consents')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (consentError || !consents || consents.length === 0) {
    return { allowed: false, reason: 'No consent record exists for patient' };
  }

  // 3. Search for ANY active, valid, non-revoked, non-expired consent record that grants permission
  let lastFailureReason = 'No active valid consent found';
  let lastConsentId: string | undefined = undefined;

  for (const record of consents) {
    const isAccepted = record.accepted === true && record.status === 'accepted';
    const isRevoked = !!record.withdrawn_at || record.status === 'revoked';
    
    let isExpired = record.status === 'expired';
    if (record.expires_at) {
      const expiryDate = new Date(record.expires_at);
      if (expiryDate <= currentTime) {
        isExpired = true;
      }
    }

    if (isRevoked) {
      lastFailureReason = 'Consent has been revoked';
      lastConsentId = record.id;
      continue;
    }

    if (isExpired) {
      lastFailureReason = 'Consent has expired';
      lastConsentId = record.id;
      continue;
    }

    if (!isAccepted) {
      lastFailureReason = 'Consent was rejected or not accepted';
      lastConsentId = record.id;
      continue;
    }

    // Check specific permission in JSONB permissions map
    const permissionsMap = record.permissions || {};
    const hasPermission = permissionsMap[permission] === true;

    if (hasPermission) {
      return { allowed: true, consentId: record.id };
    } else {
      lastFailureReason = `Permission '${permission}' is not granted in consent`;
      lastConsentId = record.id;
    }
  }

  return { allowed: false, reason: lastFailureReason, consentId: lastConsentId };
}

/**
 * Inserts an audit log entry into public.audit_logs for consent events.
 */
export async function logConsentAudit(
  action: 'consent_created' | 'consent_revoked' | 'consent_checked',
  patientId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from('audit_logs').insert({
      action,
      actor_type: 'patient',
      actor_id: patientId,
      metadata,
    });
  } catch (err) {
    console.error('[Consent Audit Log] Failed to write audit log:', err);
  }
}
