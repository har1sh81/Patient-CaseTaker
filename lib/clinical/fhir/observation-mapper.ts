/**
 * Task #32 — FHIR Observation Mapper
 * MediKiosk Clinical Architecture
 * 
 * Maps Vitals, Symptoms, Lab Results, and AYUSH Assessments into FHIR Observation R4.
 */

import { FHIR_SYSTEMS } from './fhir-constants';
import type { FhirObservation, FhirExtension } from './types';

/**
 * Maps a vital sign record into FHIR Observation (vital-signs).
 */
export function mapVitalToFhirObservation(vital: any): FhirObservation[] {
  const observations: FhirObservation[] = [];
  const subject = { reference: `Patient/${vital.patient_id}`, type: 'Patient' };
  const encounter = vital.encounter_id ? { reference: `Encounter/${vital.encounter_id}`, type: 'Encounter' } : undefined;
  const effectiveDateTime = vital.measured_at || vital.created_at;

  const extensions: FhirExtension[] = [
    { url: FHIR_SYSTEMS.EXTENSION_VERIFICATION_STATUS, valueString: vital.verification_status || 'unverified' },
    { url: FHIR_SYSTEMS.EXTENSION_PROVENANCE_SOURCE, valueString: vital.provenance_source || 'patient_reported' },
  ];

  // Blood Pressure
  if (vital.systolic_bp || vital.diastolic_bp) {
    observations.push({
      resourceType: 'Observation',
      id: `${vital.id}-bp`,
      status: 'final',
      category: [{ coding: [{ system: FHIR_SYSTEMS.OBSERVATION_CATEGORY_VITAL, code: 'vital-signs', display: 'Vital Signs' }], text: 'vital-signs' }],
      code: { coding: [], text: 'Blood Pressure' },
      subject,
      encounter,
      effectiveDateTime,
      component: [
        vital.systolic_bp ? { code: { text: 'Systolic Blood Pressure' }, valueQuantity: { value: vital.systolic_bp, unit: 'mmHg' } } : undefined,
        vital.diastolic_bp ? { code: { text: 'Diastolic Blood Pressure' }, valueQuantity: { value: vital.diastolic_bp, unit: 'mmHg' } } : undefined,
      ].filter(Boolean) as any,
      extension: extensions,
    });
  }

  // Heart Rate
  if (vital.heart_rate_bpm) {
    observations.push({
      resourceType: 'Observation',
      id: `${vital.id}-hr`,
      status: 'final',
      category: [{ coding: [{ system: FHIR_SYSTEMS.OBSERVATION_CATEGORY_VITAL, code: 'vital-signs', display: 'Vital Signs' }], text: 'vital-signs' }],
      code: { coding: [], text: 'Heart Rate' },
      subject,
      encounter,
      effectiveDateTime,
      valueQuantity: { value: vital.heart_rate_bpm, unit: 'beats/min' },
      extension: extensions,
    });
  }

  // Temperature
  if (vital.body_temperature_c) {
    observations.push({
      resourceType: 'Observation',
      id: `${vital.id}-temp`,
      status: 'final',
      category: [{ coding: [{ system: FHIR_SYSTEMS.OBSERVATION_CATEGORY_VITAL, code: 'vital-signs', display: 'Vital Signs' }], text: 'vital-signs' }],
      code: { coding: [], text: 'Body Temperature' },
      subject,
      encounter,
      effectiveDateTime,
      valueQuantity: { value: Number(vital.body_temperature_c), unit: 'degC' },
      extension: extensions,
    });
  }

  // SpO2
  if (vital.spo2_percentage) {
    observations.push({
      resourceType: 'Observation',
      id: `${vital.id}-spo2`,
      status: 'final',
      category: [{ coding: [{ system: FHIR_SYSTEMS.OBSERVATION_CATEGORY_VITAL, code: 'vital-signs', display: 'Vital Signs' }], text: 'vital-signs' }],
      code: { coding: [], text: 'Oxygen Saturation (SpO2)' },
      subject,
      encounter,
      effectiveDateTime,
      valueQuantity: { value: vital.spo2_percentage, unit: '%' },
      extension: extensions,
    });
  }

  return observations;
}

/**
 * Maps a symptom record into FHIR Observation (exam/symptom).
 */
export function mapSymptomToFhirObservation(symptom: any): FhirObservation {
  return {
    resourceType: 'Observation',
    id: symptom.id,
    status: 'final',
    category: [{ coding: [{ system: FHIR_SYSTEMS.OBSERVATION_CATEGORY_EXAM, code: 'exam', display: 'Exam' }], text: 'symptom' }],
    code: { coding: [], text: symptom.symptom_name },
    subject: { reference: `Patient/${symptom.patient_id}`, type: 'Patient' },
    encounter: symptom.encounter_id ? { reference: `Encounter/${symptom.encounter_id}`, type: 'Encounter' } : undefined,
    effectiveDateTime: symptom.created_at,
    valueString: symptom.severity_score ? `Severity: ${symptom.severity_score}/10` : (symptom.duration_text || 'Reported'),
    extension: [
      { url: FHIR_SYSTEMS.EXTENSION_VERIFICATION_STATUS, valueString: symptom.verification_status || 'unverified' },
      { url: FHIR_SYSTEMS.EXTENSION_PROVENANCE_SOURCE, valueString: symptom.provenance_source || 'patient_reported' },
      symptom.symptom_name_native ? { url: 'https://medikiosk.in/fhir/StructureDefinition/native-text', valueString: symptom.symptom_name_native } : undefined,
    ].filter(Boolean) as FhirExtension[],
  };
}

/**
 * Maps a lab result into FHIR Observation (laboratory).
 */
export function mapLabToFhirObservation(lab: any): FhirObservation {
  let valNum: number | undefined = undefined;
  if (lab.result_value && !isNaN(Number(lab.result_value))) {
    valNum = Number(lab.result_value);
  }

  return {
    resourceType: 'Observation',
    id: lab.id,
    status: 'final',
    category: [{ coding: [{ system: FHIR_SYSTEMS.OBSERVATION_CATEGORY_LAB, code: 'laboratory', display: 'Laboratory' }], text: 'laboratory' }],
    code: { coding: [], text: lab.test_name },
    subject: { reference: `Patient/${lab.patient_id}`, type: 'Patient' },
    encounter: lab.encounter_id ? { reference: `Encounter/${lab.encounter_id}`, type: 'Encounter' } : undefined,
    effectiveDateTime: lab.specimen_date || lab.created_at,
    valueQuantity: valNum !== undefined ? { value: valNum, unit: lab.unit || undefined } : undefined,
    valueString: valNum === undefined ? lab.result_value : undefined,
    referenceRange: lab.reference_range ? [{ text: lab.reference_range }] : undefined,
    extension: [
      { url: FHIR_SYSTEMS.EXTENSION_VERIFICATION_STATUS, valueString: lab.verification_status || 'unverified' },
      { url: FHIR_SYSTEMS.EXTENSION_PROVENANCE_SOURCE, valueString: lab.provenance_source || 'ocr_extracted' },
      lab.abnormal_flag ? { url: 'https://medikiosk.in/fhir/StructureDefinition/abnormal-flag', valueBoolean: true } : undefined,
    ].filter(Boolean) as FhirExtension[],
  };
}

/**
 * Maps an AYUSH assessment record into FHIR Observation (ayush-observation).
 */
export function mapAyushToFhirObservation(ayush: any): FhirObservation {
  const extensions: FhirExtension[] = [];
  if (ayush.prakriti_dosha) extensions.push({ url: FHIR_SYSTEMS.EXTENSION_AYUSH_PRAKRITI, valueString: ayush.prakriti_dosha });
  if (ayush.vikriti_dosha) extensions.push({ url: FHIR_SYSTEMS.EXTENSION_AYUSH_VIKRITI, valueString: ayush.vikriti_dosha });
  if (ayush.agni_type) extensions.push({ url: FHIR_SYSTEMS.EXTENSION_AYUSH_AGNI, valueString: ayush.agni_type });
  if (ayush.koshtha_type) extensions.push({ url: FHIR_SYSTEMS.EXTENSION_AYUSH_KOSHTHA, valueString: ayush.koshtha_type });
  if (ayush.dashavidha_pariksha) extensions.push({ url: FHIR_SYSTEMS.EXTENSION_AYUSH_DASHAVIDHA, valueValue: ayush.dashavidha_pariksha });

  return {
    resourceType: 'Observation',
    id: ayush.id,
    status: 'final',
    category: [{ coding: [{ system: FHIR_SYSTEMS.OBSERVATION_CATEGORY_AYUSH, code: 'ayush', display: 'AYUSH Assessment' }], text: 'AYUSH Assessment' }],
    code: { coding: [], text: 'AYUSH Clinical Assessment' },
    subject: { reference: `Patient/${ayush.patient_id}`, type: 'Patient' },
    encounter: ayush.encounter_id ? { reference: `Encounter/${ayush.encounter_id}`, type: 'Encounter' } : undefined,
    effectiveDateTime: ayush.created_at,
    extension: extensions,
  };
}
