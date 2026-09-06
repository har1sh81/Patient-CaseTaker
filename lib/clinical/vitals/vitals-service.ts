import { createClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import {
  VitalInput,
  NormalizedVitalRecord,
  VitalValidationResult,
  VitalsServiceResult,
} from './vitals-types';

/**
 * Normalizes and validates raw vital inputs against data-integrity rules.
 * Does NOT generate clinical diagnoses.
 */
export function normalizeAndValidateVitals(input: VitalInput): VitalValidationResult {
  const errors: string[] = [];

  let systolicBp: number | undefined;
  let diastolicBp: number | undefined;
  let heartRateBpm: number | undefined;
  let bodyTemperatureC: number | undefined;
  let spo2Percentage: number | undefined;
  let respiratoryRate: number | undefined;

  // 1. Blood Pressure Parsing & Validation
  let rawBpText = input.bloodPressureText;

  if (input.systolicBp !== undefined && input.diastolicBp !== undefined) {
    systolicBp = typeof input.systolicBp === 'number' ? input.systolicBp : parseInt(String(input.systolicBp), 10);
    diastolicBp = typeof input.diastolicBp === 'number' ? input.diastolicBp : parseInt(String(input.diastolicBp), 10);
  } else if (rawBpText && typeof rawBpText === 'string') {
    const bpMatch = rawBpText.trim().match(/^(\d{2,3})\s*[\/\-]\s*(\d{2,3})$/);
    if (bpMatch) {
      systolicBp = parseInt(bpMatch[1], 10);
      diastolicBp = parseInt(bpMatch[2], 10);
    } else {
      errors.push('Malformed blood pressure format. Must be Systolic/Diastolic (e.g., 120/80)');
    }
  } else if (input.systolicBp !== undefined || input.diastolicBp !== undefined) {
    errors.push('Malformed blood pressure input: both Systolic and Diastolic BP values are required');
  }

  if (systolicBp !== undefined && diastolicBp !== undefined) {
    if (isNaN(systolicBp) || isNaN(diastolicBp)) {
      errors.push('Blood pressure values must be numeric');
    } else {
      if (systolicBp < 40 || systolicBp > 300) {
        errors.push('Systolic BP out of valid range (40 - 300 mmHg)');
      }
      if (diastolicBp < 20 || diastolicBp > 200) {
        errors.push('Diastolic BP out of valid range (20 - 200 mmHg)');
      }
      if (systolicBp <= diastolicBp) {
        errors.push('Systolic BP must be strictly greater than Diastolic BP');
      }
    }
  }

  // 2. Body Temperature Normalization (Fahrenheit -> Celsius)
  if (input.bodyTemperature !== undefined && input.bodyTemperature !== null && String(input.bodyTemperature).trim() !== '') {
    let rawTemp = typeof input.bodyTemperature === 'number' ? input.bodyTemperature : parseFloat(String(input.bodyTemperature).replace(/[^\d.]/g, ''));
    const unitStr = String(input.temperatureUnit || input.bodyTemperature).toUpperCase();

    if (isNaN(rawTemp)) {
      errors.push('Body temperature must be numeric');
    } else {
      const isFahrenheit = unitStr.includes('F') || rawTemp > 50;
      let tempC = rawTemp;
      if (isFahrenheit) {
        tempC = (rawTemp - 32) * (5 / 9);
      }
      tempC = Math.round(tempC * 10) / 10;

      if (tempC < 30.0 || tempC > 45.0) {
        errors.push('Body temperature out of valid technical range (30°C - 45°C / 86°F - 113°F)');
      } else {
        bodyTemperatureC = tempC;
      }
    }
  }

  // 3. SpO2 Percentage Validation
  if (input.spo2Percentage !== undefined && input.spo2Percentage !== null && String(input.spo2Percentage).trim() !== '') {
    const spo2 = typeof input.spo2Percentage === 'number' ? input.spo2Percentage : parseInt(String(input.spo2Percentage).replace(/[^\d]/g, ''), 10);
    if (isNaN(spo2)) {
      errors.push('SpO2 percentage must be numeric');
    } else if (spo2 < 0 || spo2 > 100) {
      errors.push('SpO2 percentage must be between 0% and 100%');
    } else {
      spo2Percentage = spo2;
    }
  }

  // 4. Heart Rate Validation
  if (input.heartRateBpm !== undefined && input.heartRateBpm !== null && String(input.heartRateBpm).trim() !== '') {
    const hr = typeof input.heartRateBpm === 'number' ? input.heartRateBpm : parseInt(String(input.heartRateBpm).replace(/[^\d-]/g, ''), 10);
    if (isNaN(hr)) {
      errors.push('Heart rate must be numeric');
    } else if (hr < 20 || hr > 260) {
      errors.push('Heart rate must be a positive number within valid human limits (20 - 260 bpm)');
    } else {
      heartRateBpm = hr;
    }
  }

  // 5. Respiratory Rate Validation
  if (input.respiratoryRate !== undefined && input.respiratoryRate !== null && String(input.respiratoryRate).trim() !== '') {
    const rr = typeof input.respiratoryRate === 'number' ? input.respiratoryRate : parseInt(String(input.respiratoryRate).replace(/[^\d-]/g, ''), 10);
    if (isNaN(rr)) {
      errors.push('Respiratory rate must be numeric');
    } else if (rr < 4 || rr > 80) {
      errors.push('Respiratory rate must be a positive number within valid human limits (4 - 80 breaths/min)');
    } else {
      respiratoryRate = rr;
    }
  }

  // 6. Ensure at least one vital measurement was provided
  const hasAtLeastOne =
    systolicBp !== undefined ||
    diastolicBp !== undefined ||
    heartRateBpm !== undefined ||
    bodyTemperatureC !== undefined ||
    spo2Percentage !== undefined ||
    respiratoryRate !== undefined;

  if (!hasAtLeastOne && errors.length === 0) {
    errors.push('At least one valid vital measurement must be provided');
  }

  // 7. Timestamp & Provenance formatting
  let measuredAt = input.measuredAt;
  if (measuredAt) {
    const d = new Date(measuredAt);
    if (isNaN(d.getTime())) {
      errors.push('Invalid measuredAt timestamp format');
    } else {
      measuredAt = d.toISOString();
    }
  } else {
    measuredAt = new Date().toISOString();
  }

  const provenanceSource = input.provenanceSource || 'patient_reported';
  const verificationStatus = input.verificationStatus || (provenanceSource === 'patient_reported' ? 'unverified' : 'doctor_verified');

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    normalized: {
      systolicBp,
      diastolicBp,
      heartRateBpm,
      bodyTemperatureC,
      spo2Percentage,
      respiratoryRate,
      measuredAt,
      provenanceSource,
      verificationStatus,
    },
  };
}

/**
 * Saves a normalized vital record into public.clinical_vitals.
 * Checks patient ownership, consent, validation, and idempotency.
 */
export async function saveVitalRecord(
  patientId: string,
  encounterId: string,
  input: VitalInput
): Promise<VitalsServiceResult<NormalizedVitalRecord>> {
  try {
    if (!patientId || !encounterId) {
      return { success: false, statusCode: 400, error: 'patientId and encounterId are required' };
    }

    const supabase = await createClient();

    // 1. Verify encounter exists and matches patient
    const { data: encounter, error: encErr } = await supabase
      .from('encounters')
      .select('id, patient_id')
      .eq('id', encounterId)
      .limit(1);

    if (encErr || !encounter || encounter.length === 0) {
      return { success: false, statusCode: 404, error: 'Encounter not found' };
    }

    if (encounter[0].patient_id !== patientId) {
      return {
        success: false,
        statusCode: 400,
        error: 'Patient ID mismatch: encounter does not belong to the specified patient',
      };
    }

    // 2. Check Consent (share_health_records)
    const consentValid = await hasValidConsent(patientId, 'share_health_records');
    if (!consentValid) {
      return {
        success: false,
        statusCode: 403,
        error: 'Patient consent share_health_records is missing or revoked',
      };
    }

    // 3. Normalize & Validate Input
    const validation = normalizeAndValidateVitals(input);
    if (!validation.valid || !validation.normalized) {
      return {
        success: false,
        statusCode: 400,
        error: validation.errors.join('; '),
      };
    }

    const norm = validation.normalized;

    // 4. Idempotency & Deduplication Check: Check if exact same record exists at same measuredAt
    const { data: existingVitals } = await supabase
      .from('clinical_vitals')
      .select('*')
      .eq('encounter_id', encounterId)
      .eq('measured_at', norm.measuredAt)
      .limit(1);

    if (existingVitals && existingVitals.length > 0) {
      const ex = existingVitals[0];
      if (
        ex.systolic_bp === (norm.systolicBp ?? null) &&
        ex.diastolic_bp === (norm.diastolicBp ?? null) &&
        ex.heart_rate_bpm === (norm.heartRateBpm ?? null) &&
        ex.body_temperature_c === (norm.bodyTemperatureC ?? null) &&
        ex.spo2_percentage === (norm.spo2Percentage ?? null) &&
        ex.respiratory_rate === (norm.respiratoryRate ?? null)
      ) {
        return {
          success: true,
          statusCode: 200,
          data: {
            id: ex.id,
            patientId: ex.patient_id,
            encounterId: ex.encounter_id,
            systolicBp: ex.systolic_bp ?? undefined,
            diastolicBp: ex.diastolic_bp ?? undefined,
            heartRateBpm: ex.heart_rate_bpm ?? undefined,
            bodyTemperatureC: ex.body_temperature_c ? Number(ex.body_temperature_c) : undefined,
            spo2Percentage: ex.spo2_percentage ?? undefined,
            respiratoryRate: ex.respiratory_rate ?? undefined,
            measuredAt: ex.measured_at,
            provenanceSource: ex.provenance_source,
            verificationStatus: ex.verification_status,
            sourceId: ex.source_id ?? undefined,
            createdAt: ex.created_at,
          },
        };
      }
    }

    // 5. Insert new vital record into clinical_vitals
    const { data: inserted, error: insertErr } = await supabase
      .from('clinical_vitals')
      .insert({
        patient_id: patientId,
        encounter_id: encounterId,
        systolic_bp: norm.systolicBp ?? null,
        diastolic_bp: norm.diastolicBp ?? null,
        heart_rate_bpm: norm.heartRateBpm ?? null,
        body_temperature_c: norm.bodyTemperatureC ?? null,
        spo2_percentage: norm.spo2Percentage ?? null,
        respiratory_rate: norm.respiratoryRate ?? null,
        measured_at: norm.measuredAt,
        provenance_source: norm.provenanceSource,
        verification_status: norm.verificationStatus,
        source_id: input.sourceId ?? null,
      })
      .select()
      .single();

    if (insertErr || !inserted) {
      return { success: false, statusCode: 500, error: `Failed to insert vital record: ${insertErr?.message}` };
    }

    return {
      success: true,
      statusCode: 201,
      data: {
        id: inserted.id,
        patientId: inserted.patient_id,
        encounterId: inserted.encounter_id,
        systolicBp: inserted.systolic_bp ?? undefined,
        diastolicBp: inserted.diastolic_bp ?? undefined,
        heartRateBpm: inserted.heart_rate_bpm ?? undefined,
        bodyTemperatureC: inserted.body_temperature_c ? Number(inserted.body_temperature_c) : undefined,
        spo2Percentage: inserted.spo2_percentage ?? undefined,
        respiratoryRate: inserted.respiratory_rate ?? undefined,
        measuredAt: inserted.measured_at,
        provenanceSource: inserted.provenance_source,
        verificationStatus: inserted.verification_status,
        sourceId: inserted.source_id ?? undefined,
        createdAt: inserted.created_at,
      },
    };
  } catch (err: any) {
    return { success: false, statusCode: 500, error: err.message || 'Failed to save vital record' };
  }
}

/**
 * Retrieves all vitals for an encounter ordered by measured_at DESC.
 */
export async function getEncounterVitals(
  encounterId: string
): Promise<VitalsServiceResult<NormalizedVitalRecord[]>> {
  try {
    if (!encounterId) {
      return { success: false, statusCode: 400, error: 'encounterId is required' };
    }

    const supabase = await createClient();

    const { data: encounter } = await supabase
      .from('encounters')
      .select('id, patient_id')
      .eq('id', encounterId)
      .limit(1);

    if (!encounter || encounter.length === 0) {
      return { success: false, statusCode: 404, error: 'Encounter not found' };
    }

    const patientId = encounter[0].patient_id;

    // Check Consent
    const consentValid = await hasValidConsent(patientId, 'share_health_records');
    if (!consentValid) {
      return { success: false, statusCode: 403, error: 'Patient consent share_health_records is missing or revoked' };
    }

    const { data: vitals, error } = await supabase
      .from('clinical_vitals')
      .select('*')
      .eq('encounter_id', encounterId)
      .order('measured_at', { ascending: false });

    if (error) {
      return { success: false, statusCode: 500, error: error.message };
    }

    const records: NormalizedVitalRecord[] = (vitals || []).map((v) => ({
      id: v.id,
      patientId: v.patient_id,
      encounterId: v.encounter_id,
      systolicBp: v.systolic_bp ?? undefined,
      diastolicBp: v.diastolic_bp ?? undefined,
      heartRateBpm: v.heart_rate_bpm ?? undefined,
      bodyTemperatureC: v.body_temperature_c ? Number(v.body_temperature_c) : undefined,
      spo2Percentage: v.spo2_percentage ?? undefined,
      respiratoryRate: v.respiratory_rate ?? undefined,
      measuredAt: v.measured_at,
      provenanceSource: v.provenance_source,
      verificationStatus: v.verification_status,
      sourceId: v.source_id ?? undefined,
      createdAt: v.created_at,
    }));

    return { success: true, statusCode: 200, data: records };
  } catch (err: any) {
    return { success: false, statusCode: 500, error: err.message || 'Failed to retrieve encounter vitals' };
  }
}

/**
 * Retrieves the latest vitals for a patient ordered by measured_at DESC (NOT created_at).
 */
export async function getLatestVitalsForPatient(
  patientId: string
): Promise<VitalsServiceResult<NormalizedVitalRecord | null>> {
  try {
    if (!patientId) {
      return { success: false, statusCode: 400, error: 'patientId is required' };
    }

    const consentValid = await hasValidConsent(patientId, 'share_health_records');
    if (!consentValid) {
      return { success: false, statusCode: 403, error: 'Patient consent share_health_records is missing or revoked' };
    }

    const supabase = await createClient();

    const { data: vitals, error } = await supabase
      .from('clinical_vitals')
      .select('*')
      .eq('patient_id', patientId)
      .order('measured_at', { ascending: false })
      .limit(1);

    if (error) {
      return { success: false, statusCode: 500, error: error.message };
    }

    if (!vitals || vitals.length === 0) {
      return { success: true, statusCode: 200, data: null };
    }

    const v = vitals[0];
    const record: NormalizedVitalRecord = {
      id: v.id,
      patientId: v.patient_id,
      encounterId: v.encounter_id,
      systolicBp: v.systolic_bp ?? undefined,
      diastolicBp: v.diastolic_bp ?? undefined,
      heartRateBpm: v.heart_rate_bpm ?? undefined,
      bodyTemperatureC: v.body_temperature_c ? Number(v.body_temperature_c) : undefined,
      spo2Percentage: v.spo2_percentage ?? undefined,
      respiratoryRate: v.respiratory_rate ?? undefined,
      measuredAt: v.measured_at,
      provenanceSource: v.provenance_source,
      verificationStatus: v.verification_status,
      sourceId: v.source_id ?? undefined,
      createdAt: v.created_at,
    };

    return { success: true, statusCode: 200, data: record };
  } catch (err: any) {
    return { success: false, statusCode: 500, error: err.message || 'Failed to retrieve latest vitals' };
  }
}
