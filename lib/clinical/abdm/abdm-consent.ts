/**
 * Task #33 — ABDM Consent & Purpose Validator
 * MediKiosk Clinical Architecture
 * 
 * Reuses Task #6 consent verification.
 * Validates purpose limitations and patient ownership boundaries.
 */

import { hasValidConsent } from '@/lib/consent/consent-service';
import type { AbdmPurpose } from './types';

const VALID_PURPOSES: AbdmPurpose[] = [
  'consultation',
  'treatment',
  'continuity_of_care',
  'record_access',
];

export function isValidAbdmPurpose(purpose: string): purpose is AbdmPurpose {
  return VALID_PURPOSES.includes(purpose as AbdmPurpose);
}

export async function verifyAbdmConsent(
  patientId: string,
  isAyush: boolean = false
): Promise<{ hasConsent: boolean; permissionKey: string }> {
  const permissionKey = isAyush ? 'share_ayush_records' : 'share_health_records';
  const hasConsent = await hasValidConsent(patientId, permissionKey);
  return { hasConsent, permissionKey };
}
