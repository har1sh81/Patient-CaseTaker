/**
 * Task #33 — ABDM FHIR Adapter & Bundle Hasher
 * MediKiosk Clinical Architecture
 * 
 * Consumes Task #32 FHIR R4 Bundle export.
 * Generates deterministic SHA-256 hash of the exported payload.
 */

import * as crypto from 'crypto';
import { exportPatientFhirBundle } from '../fhir/fhir-service';
import type { FhirBundle } from '../fhir/types';

export interface PreparedFhirBundleResult {
  success: boolean;
  bundle?: FhirBundle;
  bundleHash?: string;
  fhirVersion?: string;
  error?: string;
  errorCode?: 'CONSENT_DENIED' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR';
}

export async function prepareAbdmFhirBundle(
  patientId: string,
  options: {
    encounterId?: string;
    includeDocuments?: boolean;
    includeProvenance?: boolean;
  } = {}
): Promise<PreparedFhirBundleResult> {
  const fhirRes = await exportPatientFhirBundle({
    patientId,
    encounterId: options.encounterId,
    includeDocuments: options.includeDocuments ?? false,
    includeProvenance: options.includeProvenance ?? true,
  });

  if (!fhirRes.success || !fhirRes.data?.bundle) {
    return {
      success: false,
      error: fhirRes.error || 'Failed to generate FHIR Bundle',
      errorCode: fhirRes.errorCode as PreparedFhirBundleResult['errorCode'],
    };
  }

  const bundle = fhirRes.data.bundle;
  const bundleString = JSON.stringify(bundle);
  const bundleHash = crypto.createHash('sha256').update(bundleString).digest('hex');

  return {
    success: true,
    bundle,
    bundleHash,
    fhirVersion: fhirRes.data.fhirVersion || '4.0.1',
  };
}
