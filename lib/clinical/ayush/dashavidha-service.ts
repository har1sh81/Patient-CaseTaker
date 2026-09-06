import { createClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import {
  DashavidhaDomainName,
  DashavidhaParikshaPayload,
  SaveDashavidhaRequest,
  DashavidhaServiceResult,
  DashavidhaVerificationStatus,
  VayaObservationData,
  PramanaObservationData,
} from './dashavidha-types';

const VALID_DOMAINS: Set<DashavidhaDomainName> = new Set([
  'prakriti',
  'vikriti',
  'sara',
  'samhanana',
  'pramana',
  'satmya',
  'sattva',
  'aharaShakti',
  'vyayamaShakti',
  'vaya',
]);

const VALID_SOURCE_TYPES = new Set(['patient_input', 'clinician_assessment', 'measurement_required']);
const VALID_VERIFICATION_STATUSES = new Set(['unverified', 'doctor_verified', 'rejected']);

/**
 * Calculates Vaya (age & life-stage) from patient DOB without asking age again.
 */
export function calculateVayaFromDob(dobString?: string): VayaObservationData {
  if (!dobString) {
    return {
      notes: 'Date of birth not provided',
    };
  }

  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) {
    return {
      notes: 'Invalid date of birth format',
    };
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  let lifeStage: 'bala_childhood' | 'madhyama_middle' | 'vriddha_elderly' = 'madhyama_middle';
  if (age < 16) {
    lifeStage = 'bala_childhood';
  } else if (age >= 60) {
    lifeStage = 'vriddha_elderly';
  }

  return {
    dateOfBirth: dobString,
    ageYears: age,
    lifeStage,
    derivationMethod: 'derived_from_dob',
  };
}

/**
 * Calculates BMI from Pramana height and weight if both are valid.
 */
export function calculatePramanaBmi(heightCm?: number, weightKg?: number): number | undefined {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return undefined;
  }
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 10) / 10;
}

/**
 * Validates Pramana numeric ranges.
 */
export function validatePramanaData(pramana: PramanaObservationData): { valid: boolean; error?: string } {
  if (pramana.heightCm !== undefined) {
    if (typeof pramana.heightCm !== 'number' || isNaN(pramana.heightCm) || pramana.heightCm < 30 || pramana.heightCm > 300) {
      return { valid: false, error: 'Height must be a valid number between 30 cm and 300 cm' };
    }
  }
  if (pramana.weightKg !== undefined) {
    if (typeof pramana.weightKg !== 'number' || isNaN(pramana.weightKg) || pramana.weightKg < 1 || pramana.weightKg > 400) {
      return { valid: false, error: 'Weight must be a valid number between 1 kg and 400 kg' };
    }
  }
  return { valid: true };
}

/**
 * Retrieves the Dashavidha assessment for a given encounter ID.
 */
export async function getDashavidhaAssessment(
  encounterId: string
): Promise<DashavidhaServiceResult<DashavidhaParikshaPayload>> {
  try {
    if (!encounterId || typeof encounterId !== 'string') {
      return { success: false, statusCode: 400, error: 'Valid encounterId is required' };
    }

    const supabase = await createClient();

    // 1. Fetch encounter to verify patient ID & relationship
    const { data: encounter, error: encErr } = await supabase
      .from('encounters')
      .select('id, patient_id')
      .eq('id', encounterId)
      .limit(1);

    if (encErr || !encounter || encounter.length === 0) {
      return { success: false, statusCode: 404, error: 'Encounter not found' };
    }

    const patientId = encounter[0].patient_id;

    const { data: patientData } = await supabase
      .from('patients')
      .select('id, date_of_birth')
      .eq('id', patientId)
      .limit(1);

    const dobString = patientData && patientData.length > 0 ? patientData[0].date_of_birth : undefined;

    // 2. Check AYUSH Consent
    const hasConsent = await hasValidConsent(patientId, 'share_ayush_records');
    if (!hasConsent) {
      return {
        success: false,
        statusCode: 403,
        error: 'Patient consent share_ayush_records is missing or revoked',
      };
    }

    // 3. Fetch AYUSH record
    const { data: ayushData, error: ayushErr } = await supabase
      .from('clinical_ayush_assessments')
      .select('id, encounter_id, patient_id, dashavidha_pariksha, created_at, updated_at')
      .eq('encounter_id', encounterId)
      .limit(1);

    if (ayushErr) {
      return { success: false, statusCode: 500, error: `Database error: ${ayushErr.message}` };
    }

    let existingDashavidha: any = (ayushData && ayushData.length > 0 && ayushData[0].dashavidha_pariksha) || {};

    const domains = existingDashavidha.domains || {};

    // Auto-attach / refresh Vaya domain from DOB
    if (dobString) {
      const bayaData = calculateVayaFromDob(dobString);
      domains.vaya = {
        domainName: 'vaya',
        sourceType: 'clinician_assessment',
        provenanceSource: 'derived_from_dob',
        verificationStatus: 'doctor_verified',
        collectedAt: new Date().toISOString(),
        data: bayaData,
      };
    }

    const payload: DashavidhaParikshaPayload = {
      schemaVersion: '1.0',
      lastUpdated: existingDashavidha.lastUpdated || new Date().toISOString(),
      encounterId,
      patientId,
      domains,
    };

    return {
      success: true,
      statusCode: 200,
      data: payload,
    };
  } catch (err: any) {
    return { success: false, statusCode: 500, error: err.message || 'Failed to retrieve Dashavidha assessment' };
  }
}

/**
 * Saves or updates Dashavidha assessment domains for an encounter.
 */
export async function saveDashavidhaAssessment(
  request: SaveDashavidhaRequest
): Promise<DashavidhaServiceResult<DashavidhaParikshaPayload>> {
  try {
    const { patientId, encounterId, domains } = request;

    if (!encounterId || !patientId) {
      return { success: false, statusCode: 400, error: 'patientId and encounterId are required' };
    }

    const supabase = await createClient();

    // 1. Verify encounter exists and belongs to patient
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

    const { data: patientData } = await supabase
      .from('patients')
      .select('id, date_of_birth')
      .eq('id', patientId)
      .limit(1);

    const dobString = patientData && patientData.length > 0 ? patientData[0].date_of_birth : undefined;

    // 2. Consent Check
    const hasConsent = await hasValidConsent(patientId, 'share_ayush_records');
    if (!hasConsent) {
      return {
        success: false,
        statusCode: 403,
        error: 'Patient consent share_ayush_records is missing or revoked',
      };
    }

    // 3. Domain Validation
    if (!domains || typeof domains !== 'object') {
      return { success: false, statusCode: 400, error: 'Invalid domains payload' };
    }

    for (const [key, obs] of Object.entries(domains)) {
      if (!VALID_DOMAINS.has(key as DashavidhaDomainName)) {
        return { success: false, statusCode: 400, error: `Invalid domain name: '${key}'` };
      }

      if (obs) {
        if (!obs.sourceType || !VALID_SOURCE_TYPES.has(obs.sourceType)) {
          return { success: false, statusCode: 400, error: `Invalid sourceType for domain '${key}': ${obs.sourceType}` };
        }
        if (obs.verificationStatus && !VALID_VERIFICATION_STATUSES.has(obs.verificationStatus)) {
          return { success: false, statusCode: 400, error: `Invalid verificationStatus for domain '${key}'` };
        }
      }
    }

    // 4. Pramana Height / Weight Validation & BMI calculation if present
    if (domains.pramana && domains.pramana.data) {
      const validation = validatePramanaData(domains.pramana.data);
      if (!validation.valid) {
        return { success: false, statusCode: 400, error: validation.error };
      }
      if (domains.pramana.data.heightCm && domains.pramana.data.weightKg) {
        domains.pramana.data.bmiCalculated = calculatePramanaBmi(
          domains.pramana.data.heightCm,
          domains.pramana.data.weightKg
        );
      }
    }

    // 5. Fetch existing record to merge cleanly without overwriting unrelated domains or AYUSH columns
    const { data: existingAyush } = await supabase
      .from('clinical_ayush_assessments')
      .select('*')
      .eq('encounter_id', encounterId)
      .limit(1);

    let existingPayload: any = existingAyush && existingAyush.length > 0 ? existingAyush[0].dashavidha_pariksha : {};
    let existingDomains: any = existingPayload?.domains || {};

    // Merge new domains into existing domains
    const updatedDomains = { ...existingDomains };

    for (const [key, obs] of Object.entries(domains)) {
      if (obs) {
        updatedDomains[key] = {
          domainName: key,
          sourceType: obs.sourceType,
          provenanceSource: obs.provenanceSource || (obs.sourceType === 'patient_input' ? 'patient_reported' : 'clinician_entered'),
          verificationStatus: obs.verificationStatus || (obs.sourceType === 'patient_input' ? 'unverified' : 'doctor_verified'),
          collectedAt: obs.collectedAt || new Date().toISOString(),
          clinicianNotes: obs.clinicianNotes || '',
          data: obs.data || {},
        };
      }
    }

    // Always ensure Vaya is derived from DOB
    if (dobString) {
      updatedDomains.vaya = {
        domainName: 'vaya',
        sourceType: 'clinician_assessment',
        provenanceSource: 'derived_from_dob',
        verificationStatus: 'doctor_verified',
        collectedAt: new Date().toISOString(),
        data: calculateVayaFromDob(dobString),
      };
    }

    const finalPayload: DashavidhaParikshaPayload = {
      schemaVersion: '1.0',
      lastUpdated: new Date().toISOString(),
      encounterId,
      patientId,
      domains: updatedDomains,
    };

    // Upsert into clinical_ayush_assessments preserving existing fields
    if (existingAyush && existingAyush.length > 0) {
      const existingRecord = existingAyush[0];
      const { error: updateErr } = await supabase
        .from('clinical_ayush_assessments')
        .update({
          dashavidha_pariksha: finalPayload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRecord.id);

      if (updateErr) {
        return { success: false, statusCode: 500, error: `Failed to update AYUSH record: ${updateErr.message}` };
      }
    } else {
      const { error: insertErr } = await supabase
        .from('clinical_ayush_assessments')
        .insert({
          encounter_id: encounterId,
          patient_id: patientId,
          dashavidha_pariksha: finalPayload,
          provenance_source: 'patient_reported',
          verification_status: 'unverified',
        });

      if (insertErr) {
        return { success: false, statusCode: 500, error: `Failed to create AYUSH record: ${insertErr.message}` };
      }
    }

    return {
      success: true,
      statusCode: 200,
      data: finalPayload,
    };
  } catch (err: any) {
    return { success: false, statusCode: 500, error: err.message || 'Failed to save Dashavidha assessment' };
  }
}

/**
 * Updates the verification status of a specific Dashavidha domain (Clinician action).
 */
export async function verifyDashavidhaDomain(
  encounterId: string,
  domainName: DashavidhaDomainName,
  verificationStatus: DashavidhaVerificationStatus,
  clinicianNotes?: string
): Promise<DashavidhaServiceResult<DashavidhaParikshaPayload>> {
  try {
    if (!VALID_DOMAINS.has(domainName)) {
      return { success: false, statusCode: 400, error: `Invalid domain name: '${domainName}'` };
    }
    if (!VALID_VERIFICATION_STATUSES.has(verificationStatus)) {
      return { success: false, statusCode: 400, error: `Invalid verification status: '${verificationStatus}'` };
    }

    const currentRes = await getDashavidhaAssessment(encounterId);
    if (!currentRes.success || !currentRes.data) {
      return { success: false, statusCode: currentRes.statusCode || 404, error: currentRes.error };
    }

    const payload = currentRes.data;
    const targetDomain = payload.domains[domainName as keyof typeof payload.domains];

    if (!targetDomain) {
      return { success: false, statusCode: 404, error: `Domain '${domainName}' has not been assessed yet` };
    }

    targetDomain.verificationStatus = verificationStatus;
    if (clinicianNotes !== undefined) {
      targetDomain.clinicianNotes = clinicianNotes;
    }

    return saveDashavidhaAssessment({
      patientId: payload.patientId,
      encounterId: payload.encounterId,
      domains: {
        [domainName]: targetDomain,
      } as any,
    });
  } catch (err: any) {
    return { success: false, statusCode: 500, error: err.message || 'Failed to verify Dashavidha domain' };
  }
}
