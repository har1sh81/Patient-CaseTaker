/**
 * Task #32 — Deterministic FHIR R4 Structural Validator
 * MediKiosk Clinical Architecture
 * 
 * Validates structural integrity of generated FHIR Bundle & resources.
 */

import { FHIR_VERSION } from './fhir-constants';
import type { FhirBundle, FhirResource } from './types';

export interface FhirValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateFhirBundle(bundle: FhirBundle): FhirValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!bundle || bundle.resourceType !== 'Bundle') {
    return { valid: false, warnings: [], errors: ['Invalid bundle: resourceType must be "Bundle"'] };
  }

  if (bundle.type !== 'collection' && bundle.type !== 'document') {
    warnings.push(`Non-standard bundle type "${bundle.type}"`);
  }

  const registeredKeys = new Set<string>();
  const patientIds = new Set<string>();
  const encounterIds = new Set<string>();

  // First pass: collect available IDs
  for (const entry of bundle.entry || []) {
    const res = entry.resource;
    if (!res || !res.resourceType || !res.id) {
      errors.push('Bundle entry contains resource missing resourceType or id');
      continue;
    }

    const key = `${res.resourceType}/${res.id}`;
    if (registeredKeys.has(key)) {
      errors.push(`Duplicate resource ID detected in Bundle: ${key}`);
    }
    registeredKeys.add(key);

    if (res.resourceType === 'Patient') patientIds.add(res.id);
    if (res.resourceType === 'Encounter') encounterIds.add(res.id);
  }

  // Second pass: validate references and resource requirements
  for (const entry of bundle.entry || []) {
    const res = entry.resource;
    if (!res) continue;

    // Validate Subject Reference
    if ('subject' in res && res.subject) {
      const ref = (res.subject as any).reference;
      if (ref && ref.startsWith('Patient/')) {
        const pId = ref.replace('Patient/', '');
        if (!patientIds.has(pId)) {
          warnings.push(`Resource ${res.resourceType}/${res.id} references Patient/${pId} not present in bundle`);
        }
      }
    }

    // Validate Encounter Reference
    if ('encounter' in res && res.encounter) {
      const ref = (res.encounter as any).reference;
      if (ref && ref.startsWith('Encounter/')) {
        const eId = ref.replace('Encounter/', '');
        if (!encounterIds.has(eId)) {
          warnings.push(`Resource ${res.resourceType}/${res.id} references Encounter/${eId} not present in bundle`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

export function validateSingleFhirResource(resource: FhirResource): FhirValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!resource || !resource.resourceType) {
    return { valid: false, warnings: [], errors: ['Missing resourceType'] };
  }

  if (!resource.id) {
    errors.push(`Resource ${resource.resourceType} missing mandatory id`);
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}
