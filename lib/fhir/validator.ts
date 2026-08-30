export interface FHIRValidationResult {
  valid: boolean;
  resourceType: string;
  bundleType: string;
  totalEntries: number;
  resourceCounts: Record<string, number>;
  errors: string[];
  warnings: string[];
}

const SUPPORTED_RESOURCE_TYPES = new Set([
  'Patient',
  'Encounter',
  'Condition',
  'MedicationStatement',
  'AllergyIntolerance',
  'Procedure',
  'Observation',
  'DocumentReference',
]);

export function validateFHIRBundle(bundle: any): FHIRValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const resourceCounts: Record<string, number> = {};

  if (!bundle || typeof bundle !== 'object') {
    return {
      valid: false,
      resourceType: 'Unknown',
      bundleType: 'Unknown',
      totalEntries: 0,
      resourceCounts: {},
      errors: ['Invalid bundle: Payload must be a non-null JSON object.'],
      warnings: [],
    };
  }

  if (bundle.resourceType !== 'Bundle') {
    errors.push(`Invalid resourceType: Expected 'Bundle', got '${bundle.resourceType}'.`);
  }

  if (bundle.type !== 'collection' && bundle.type !== 'transaction') {
    warnings.push(`Non-standard bundle type: Expected 'collection' or 'transaction', got '${bundle.type}'.`);
  }

  if (!Array.isArray(bundle.entry)) {
    errors.push('Missing bundle entries: Bundle must contain an "entry" array.');
    return {
      valid: false,
      resourceType: bundle.resourceType || 'Unknown',
      bundleType: bundle.type || 'Unknown',
      totalEntries: 0,
      resourceCounts: {},
      errors,
      warnings,
    };
  }

  let patientId: string | null = null;

  // 1. Inspect Resources
  bundle.entry.forEach((entry: any, idx: number) => {
    const res = entry?.resource;
    if (!res) {
      errors.push(`Entry index ${idx}: Missing resource object.`);
      return;
    }

    const type = res.resourceType;
    if (!type) {
      errors.push(`Entry index ${idx}: Missing resourceType property.`);
      return;
    }

    if (!SUPPORTED_RESOURCE_TYPES.has(type)) {
      warnings.push(`Entry index ${idx}: Unsupported FHIR resourceType '${type}'.`);
    }

    resourceCounts[type] = (resourceCounts[type] || 0) + 1;

    // Resource-specific validations
    if (type === 'Patient') {
      if (!res.id) errors.push('Patient resource missing required "id".');
      patientId = res.id;
      if (!Array.isArray(res.name) || res.name.length === 0 || !res.name[0].text) {
        errors.push('Patient resource missing required "name.text" property.');
      }
    }

    if (type === 'Encounter') {
      if (!res.id) errors.push('Encounter resource missing required "id".');
      if (!res.subject?.reference) {
        errors.push('Encounter resource missing required subject reference.');
      }
    }

    if (type === 'Condition') {
      if (!res.code?.text) errors.push(`Condition entry ${idx} missing code text.`);
    }

    if (type === 'MedicationStatement') {
      if (!res.medicationCodeableConcept?.text) errors.push(`MedicationStatement entry ${idx} missing medication text.`);
    }
  });

  // 2. Reference Integrity Check
  if (patientId) {
    const expectedRef = `Patient/${patientId}`;
    bundle.entry.forEach((entry: any, idx: number) => {
      const res = entry?.resource;
      if (res && res.resourceType !== 'Patient') {
        const ref = res.subject?.reference || res.patient?.reference;
        if (ref && ref !== expectedRef) {
          warnings.push(`Entry index ${idx} (${res.resourceType}): Reference '${ref}' does not match patient '${expectedRef}'.`);
        }
      }
    });
  } else {
    errors.push('Bundle missing required Patient resource entry.');
  }

  return {
    valid: errors.length === 0,
    resourceType: bundle.resourceType || 'Bundle',
    bundleType: bundle.type || 'collection',
    totalEntries: bundle.entry.length,
    resourceCounts,
    errors,
    warnings,
  };
}
