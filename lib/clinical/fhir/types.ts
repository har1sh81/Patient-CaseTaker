/**
 * Task #32 — FHIR R4 (4.0.1) Domain Models & Types
 * MediKiosk Clinical Interoperability Architecture
 */

import { FHIR_VERSION } from './fhir-constants';

export type FhirResourceType =
  | 'Patient'
  | 'Encounter'
  | 'Observation'
  | 'Condition'
  | 'MedicationStatement'
  | 'Procedure'
  | 'DiagnosticReport'
  | 'DocumentReference'
  | 'AllergyIntolerance'
  | 'Provenance'
  | 'Bundle';

export interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
  version?: string;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary';
  type?: FhirCodeableConcept;
  system?: string;
  value: string;
  assigner?: { display?: string };
}

export interface FhirReference {
  reference?: string;
  type?: string;
  display?: string;
}

export interface FhirExtension {
  url: string;
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueCodeableConcept?: FhirCodeableConcept;
  valueValue?: Record<string, unknown>;
}

export interface FhirQuantity {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

export interface FhirPeriod {
  start?: string;
  end?: string;
}

// 1. FHIR Patient Resource
export interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  identifier?: FhirIdentifier[];
  active?: boolean;
  name?: Array<{
    use?: string;
    text?: string;
    family?: string;
    given?: string[];
  }>;
  telecom?: Array<{
    system?: 'phone' | 'email';
    value?: string;
    use?: string;
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  communication?: Array<{
    language?: FhirCodeableConcept;
    preferred?: boolean;
  }>;
  extension?: FhirExtension[];
}

// 2. FHIR Encounter Resource
export interface FhirEncounter {
  resourceType: 'Encounter';
  id: string;
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled';
  class: FhirCoding;
  subject: FhirReference;
  period?: FhirPeriod;
  serviceType?: FhirCodeableConcept;
  extension?: FhirExtension[];
}

// 3. FHIR Observation Resource
export interface FhirObservation {
  resourceType: 'Observation';
  id: string;
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'unknown';
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  effectiveDateTime?: string;
  valueQuantity?: FhirQuantity;
  valueString?: string;
  valueBoolean?: boolean;
  referenceRange?: Array<{
    low?: FhirQuantity;
    high?: FhirQuantity;
    text?: string;
  }>;
  component?: Array<{
    code: FhirCodeableConcept;
    valueQuantity?: FhirQuantity;
    valueString?: string;
  }>;
  extension?: FhirExtension[];
}

// 4. FHIR Condition Resource
export interface FhirCondition {
  resourceType: 'Condition';
  id: string;
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  onsetDateTime?: string;
  recordedDate?: string;
  note?: Array<{ text: string }>;
  extension?: FhirExtension[];
}

// 5. FHIR MedicationStatement Resource
export interface FhirMedicationStatement {
  resourceType: 'MedicationStatement';
  id: string;
  status: 'active' | 'completed' | 'entered-in-error' | 'intended' | 'stopped' | 'on-hold' | 'unknown';
  medicationCodeableConcept: FhirCodeableConcept;
  subject: FhirReference;
  context?: FhirReference;
  effectiveDateTime?: string;
  dateAsserted?: string;
  dosage?: Array<{
    text?: string;
    route?: FhirCodeableConcept;
  }>;
  extension?: FhirExtension[];
}

// 6. FHIR Procedure Resource
export interface FhirProcedure {
  resourceType: 'Procedure';
  id: string;
  status: 'preparation' | 'in-progress' | 'not-done' | 'on-hold' | 'stopped' | 'completed' | 'entered-in-error' | 'unknown';
  code: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  performedDateTime?: string;
  bodySite?: FhirCodeableConcept[];
  note?: Array<{ text: string }>;
  extension?: FhirExtension[];
}

// 7. FHIR DiagnosticReport Resource
export interface FhirDiagnosticReport {
  resourceType: 'DiagnosticReport';
  id: string;
  status: 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled';
  code: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  effectiveDateTime?: string;
  result?: FhirReference[];
  conclusion?: string;
  extension?: FhirExtension[];
}

// 8. FHIR DocumentReference Resource
export interface FhirDocumentReference {
  resourceType: 'DocumentReference';
  id: string;
  status: 'current' | 'superseded' | 'entered-in-error';
  type: FhirCodeableConcept;
  subject: FhirReference;
  context?: {
    encounter?: FhirReference[];
  };
  date?: string;
  content: Array<{
    attachment: {
      contentType?: string;
      url?: string;
      title?: string;
    };
  }>;
  extension?: FhirExtension[];
}

// 9. FHIR AllergyIntolerance Resource
export interface FhirAllergyIntolerance {
  resourceType: 'AllergyIntolerance';
  id: string;
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  code: FhirCodeableConcept;
  patient: FhirReference;
  recordedDate?: string;
  extension?: FhirExtension[];
}

// 10. FHIR Provenance Resource
export interface FhirProvenance {
  resourceType: 'Provenance';
  id: string;
  target: FhirReference[];
  recorded: string;
  agent: Array<{
    type?: FhirCodeableConcept;
    who: FhirReference;
  }>;
  entity?: Array<{
    role: 'derivation' | 'source' | 'revision' | 'quotation';
    what: FhirReference;
  }>;
  extension?: FhirExtension[];
}

// Union of supported FHIR resources
export type FhirResource =
  | FhirPatient
  | FhirEncounter
  | FhirObservation
  | FhirCondition
  | FhirMedicationStatement
  | FhirProcedure
  | FhirDiagnosticReport
  | FhirDocumentReference
  | FhirAllergyIntolerance
  | FhirProvenance;

// FHIR Bundle Resource
export interface FhirBundle {
  resourceType: 'Bundle';
  id: string;
  type: 'collection';
  timestamp: string;
  entry: Array<{
    fullUrl: string;
    resource: FhirResource;
  }>;
}

export interface FhirExportOptions {
  patientId: string;
  encounterId?: string;
  eventTypes?: string[];
  fromDate?: string;
  toDate?: string;
  includeDocuments?: boolean;
  includeProvenance?: boolean;
}

export interface FhirExportResult {
  fhirVersion: typeof FHIR_VERSION;
  bundle: FhirBundle;
  resourceCounts: Record<string, number>;
}

export interface FhirServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  errorCode?: string;
  error?: string;
}
