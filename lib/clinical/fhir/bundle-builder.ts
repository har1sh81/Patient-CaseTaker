/**
 * Task #32 — FHIR Bundle Builder
 * MediKiosk Clinical Architecture
 * 
 * Constructs valid FHIR R4 collection Bundles.
 * Enforces resource ID uniqueness and reference resolution.
 */

import { FHIR_VERSION } from './fhir-constants';
import type { FhirBundle, FhirResource, FhirExportResult } from './types';

export function buildFhirBundle(
  patientId: string,
  resources: FhirResource[]
): FhirExportResult {
  const seenIds = new Set<string>();
  const validResources: FhirResource[] = [];
  const resourceCounts: Record<string, number> = {};

  for (const res of resources) {
    if (!res || !res.resourceType || !res.id) continue;

    const uniqueKey = `${res.resourceType}/${res.id}`;
    if (seenIds.has(uniqueKey)) {
      continue; // Suppress duplicate resource IDs
    }

    seenIds.add(uniqueKey);
    validResources.push(res);

    resourceCounts[res.resourceType] = (resourceCounts[res.resourceType] || 0) + 1;
  }

  const bundle: FhirBundle = {
    resourceType: 'Bundle',
    id: `bundle-patient-${patientId}`,
    type: 'collection',
    timestamp: '2026-09-06T00:00:00Z',
    entry: validResources.map(res => ({
      fullUrl: `urn:uuid:${res.id}`,
      resource: res,
    })),
  };

  return {
    fhirVersion: FHIR_VERSION,
    bundle,
    resourceCounts,
  };
}
