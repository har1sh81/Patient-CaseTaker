/**
 * Task #33 — ABDM Validation Helpers
 * MediKiosk Clinical Architecture
 */

import { isValidAbdmPurpose } from './abdm-consent';
import type { AbdmHealthRecordRequest } from './types';

export function validateAbdmExchangeRequest(req: AbdmHealthRecordRequest): { valid: boolean; reason?: string } {
  if (!req.patientId || typeof req.patientId !== 'string' || req.patientId.trim() === '') {
    return { valid: false, reason: 'Patient ID is required' };
  }

  if (!req.purpose || typeof req.purpose !== 'string' || !isValidAbdmPurpose(req.purpose)) {
    return { valid: false, reason: "Valid purpose required: 'consultation' | 'treatment' | 'continuity_of_care' | 'record_access'" };
  }

  if (req.environment && !['mock', 'sandbox', 'production'].includes(req.environment)) {
    return { valid: false, reason: "Environment must be one of 'mock' | 'sandbox' | 'production'" };
  }

  return { valid: true };
}
