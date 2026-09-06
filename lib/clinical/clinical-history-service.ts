import { createClient } from '@/lib/supabase/server';

export interface ClinicalHistoryOptions {
  encounterId?: string;
  category?: 'all' | 'symptoms' | 'vitals' | 'medications' | 'labs' | 'diagnoses' | 'answers' | 'ayush';
  department?: 'all' | 'general_medicine' | 'ayush';
  fromDate?: string;
  toDate?: string;
}

export interface PatientDemographics {
  id: string;
  fullName: string;
  firstName: string;
  lastName?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  preferredLanguage?: string | null;
}

export interface ClinicalEncounterSummary {
  id: string;
  patientId: string;
  status: string;
  intakeMode: string;
  languageCode: string;
  createdAt: string;
  conversationAnswers: Array<{
    id: string;
    questionId: string;
    section: string;
    sourceLanguage: string;
    rawText: string;
    normalizedEnglishText?: string | null;
    inputMethod: string;
    answeredAt: string;
    sourceId?: string | null;
  }>;
  symptoms: Array<{
    id: string;
    symptomName: string;
    symptomNameNative?: string | null;
    bodySite?: string | null;
    severityScore?: number | null;
    durationText?: string | null;
    onsetDate?: string | null;
    relievingFactors?: string | null;
    aggravatingFactors?: string | null;
    verificationStatus: string;
    provenanceSource: string;
    sourceId?: string | null;
    reportedAt: string;
  }>;
  vitals: Array<{
    id: string;
    systolicBp?: number | null;
    diastolicBp?: number | null;
    heartRateBpm?: number | null;
    bodyTemperatureC?: number | null;
    spo2Percentage?: number | null;
    respiratoryRate?: number | null;
    verificationStatus: string;
    provenanceSource: string;
    sourceId?: string | null;
    measuredAt: string;
  }>;
  medications: Array<{
    id: string;
    medicationName: string;
    medicationNameNative?: string | null;
    dosage?: string | null;
    frequency?: string | null;
    route?: string | null;
    status: string; // active, discontinued, completed
    verificationStatus: string;
    provenanceSource: string;
    sourceId?: string | null;
    prescribedAt?: string | null;
  }>;
  labResults: Array<{
    id: string;
    testName: string;
    resultValue: string;
    unit?: string | null;
    referenceRange?: string | null;
    abnormalFlag?: boolean | null;
    specimenDate?: string | null;
    verificationStatus: string;
    provenanceSource: string;
    sourceId?: string | null;
    testedAt: string;
  }>;
  diagnoses: Array<{
    id: string;
    icd10Code?: string | null;
    conditionName: string;
    clinicalStatus?: string | null;
    verificationStatus: string;
    provenanceSource: string;
    diagnosedBy?: string | null;
    sourceId?: string | null;
    diagnosedAt: string;
  }>;
  ayushAssessments: Array<{
    id: string;
    prakriti?: string | null;
    vikriti?: string | null;
    agni?: string | null;
    koshtha?: string | null;
    dashavidhaPariksha?: Record<string, unknown> | null;
    trividhaPariksha?: Record<string, unknown> | null;
    ashtavidhaPariksha?: Record<string, unknown> | null;
    verificationStatus: string;
    provenanceSource: string;
    sourceId?: string | null;
    assessedAt: string;
  }>;
}

export interface PatientClinicalHistoryResponse {
  patient: PatientDemographics;
  totalEncounters: number;
  encounters: ClinicalEncounterSummary[];
}

/**
 * Retrieves the complete, structured clinical history for a patient from Supabase.
 */
export async function getPatientClinicalHistory(
  patientId: string,
  options: ClinicalHistoryOptions = {}
): Promise<PatientClinicalHistoryResponse | null> {
  const supabase = await createClient();

  // 1. Fetch Patient Demographics
  const { data: patient, error: patientErr } = await supabase
    .from('patients')
    .select('id, first_name, last_name, full_name, date_of_birth, gender, phone_number, email, preferred_language')
    .eq('id', patientId)
    .maybeSingle();

  if (patientErr || !patient) {
    return null;
  }

  // 2. Fetch Encounters
  let query = supabase
    .from('encounters')
    .select('id, patient_id, status, intake_mode, language_code, created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (options.encounterId) {
    query = query.eq('id', options.encounterId);
  }

  if (options.fromDate) {
    query = query.gte('created_at', options.fromDate);
  }

  if (options.toDate) {
    query = query.lte('created_at', options.toDate);
  }

  const { data: encounters, error: encErr } = await query;
  if (encErr || !encounters) {
    return null;
  }

  const encounterIds = encounters.map((e) => e.id);
  if (encounterIds.length === 0) {
    return {
      patient: {
        id: patient.id,
        fullName: patient.full_name,
        firstName: patient.first_name,
        lastName: patient.last_name,
        dateOfBirth: patient.date_of_birth,
        gender: patient.gender,
        phoneNumber: patient.phone_number,
        email: patient.email,
        preferredLanguage: patient.preferred_language,
      },
      totalEncounters: 0,
      encounters: [],
    };
  }

  // 3. Batch Fetch Clinical Facts
  const category = options.category || 'all';

  const fetchAnswers = category === 'all' || category === 'answers';
  const fetchSymptoms = category === 'all' || category === 'symptoms';
  const fetchVitals = category === 'all' || category === 'vitals';
  const fetchMeds = category === 'all' || category === 'medications';
  const fetchLabs = category === 'all' || category === 'labs';
  const fetchDiagnoses = category === 'all' || category === 'diagnoses';
  const fetchAyush = category === 'all' || category === 'ayush';

  const [
    { data: answers },
    { data: symptoms },
    { data: vitals },
    { data: meds },
    { data: labs },
    { data: diagnoses },
    { data: ayush },
  ] = await Promise.all([
    fetchAnswers
      ? supabase
          .from('conversation_answers')
          .select('id, encounter_id, question_id, section, source_language, raw_text, normalized_english_text, input_method, source_id, answered_at, created_at')
          .in('encounter_id', encounterIds)
          .order('answered_at', { ascending: true })
      : { data: [] },

    fetchSymptoms
      ? supabase
          .from('clinical_symptoms')
          .select('id, encounter_id, symptom_name, symptom_name_native, body_site, severity_score, duration_text, onset_date, relieving_factors, aggravating_factors, verification_status, provenance_source, source_id, created_at')
          .in('encounter_id', encounterIds)
          .order('created_at', { ascending: false })
      : { data: [] },

    fetchVitals
      ? supabase
          .from('clinical_vitals')
          .select('id, encounter_id, systolic_bp, diastolic_bp, heart_rate_bpm, body_temperature_c, spo2_percentage, respiratory_rate, measured_at, verification_status, provenance_source, source_id, created_at')
          .in('encounter_id', encounterIds)
          .order('measured_at', { ascending: false })
      : { data: [] },

    fetchMeds
      ? supabase
          .from('clinical_medications')
          .select('id, encounter_id, medication_name, medication_name_native, dosage, frequency, route, status, verification_status, provenance_source, source_id, created_at')
          .in('encounter_id', encounterIds)
          .order('created_at', { ascending: false })
      : { data: [] },

    fetchLabs
      ? supabase
          .from('clinical_lab_results')
          .select('id, encounter_id, test_name, result_value, unit, reference_range, abnormal_flag, specimen_date, verification_status, provenance_source, source_id, created_at')
          .in('encounter_id', encounterIds)
          .order('created_at', { ascending: false })
      : { data: [] },

    fetchDiagnoses
      ? supabase
          .from('clinical_diagnoses')
          .select('id, encounter_id, condition_name, icd10_code, clinical_status, verification_status, diagnosed_by, diagnosed_at, source_id, provenance_source, created_at')
          .in('encounter_id', encounterIds)
          .order('diagnosed_at', { ascending: false })
      : { data: [] },

    fetchAyush
      ? supabase
          .from('clinical_ayush_assessments')
          .select('id, encounter_id, prakriti_dosha, vikriti_dosha, agni_type, koshtha_type, dashavidha_pariksha, trividha_pariksha, ashtavidha_pariksha, verification_status, provenance_source, source_id, created_at')
          .in('encounter_id', encounterIds)
          .order('created_at', { ascending: false })
      : { data: [] },
  ]);

  // Group facts by encounter_id
  const encounterMap = new Map<string, ClinicalEncounterSummary>();

  for (const enc of encounters) {
    encounterMap.set(enc.id, {
      id: enc.id,
      patientId: enc.patient_id,
      status: enc.status,
      intakeMode: enc.intake_mode,
      languageCode: enc.language_code,
      createdAt: enc.created_at,
      conversationAnswers: [],
      symptoms: [],
      vitals: [],
      medications: [],
      labResults: [],
      diagnoses: [],
      ayushAssessments: [],
    });
  }

  (answers || []).forEach((row) => {
    const enc = encounterMap.get(row.encounter_id);
    if (enc) {
      enc.conversationAnswers.push({
        id: row.id,
        questionId: row.question_id,
        section: row.section,
        sourceLanguage: row.source_language,
        rawText: row.raw_text,
        normalizedEnglishText: row.normalized_english_text,
        inputMethod: row.input_method,
        sourceId: row.source_id,
        answeredAt: row.answered_at || row.created_at,
      });
    }
  });

  (symptoms || []).forEach((row) => {
    const enc = encounterMap.get(row.encounter_id);
    if (enc) {
      enc.symptoms.push({
        id: row.id,
        symptomName: row.symptom_name,
        symptomNameNative: row.symptom_name_native,
        bodySite: row.body_site,
        severityScore: row.severity_score ? Number(row.severity_score) : null,
        durationText: row.duration_text,
        onsetDate: row.onset_date,
        relievingFactors: row.relieving_factors,
        aggravatingFactors: row.aggravating_factors,
        verificationStatus: row.verification_status,
        provenanceSource: row.provenance_source,
        sourceId: row.source_id,
        reportedAt: row.created_at,
      });
    }
  });

  (vitals || []).forEach((row) => {
    const enc = encounterMap.get(row.encounter_id);
    if (enc) {
      enc.vitals.push({
        id: row.id,
        systolicBp: row.systolic_bp ? Number(row.systolic_bp) : null,
        diastolicBp: row.diastolic_bp ? Number(row.diastolic_bp) : null,
        heartRateBpm: row.heart_rate_bpm ? Number(row.heart_rate_bpm) : null,
        bodyTemperatureC: row.body_temperature_c ? Number(row.body_temperature_c) : null,
        spo2Percentage: row.spo2_percentage ? Number(row.spo2_percentage) : null,
        respiratoryRate: row.respiratory_rate ? Number(row.respiratory_rate) : null,
        verificationStatus: row.verification_status,
        provenanceSource: row.provenance_source,
        sourceId: row.source_id,
        measuredAt: row.measured_at || row.created_at,
      });
    }
  });

  (meds || []).forEach((row) => {
    const enc = encounterMap.get(row.encounter_id);
    if (enc) {
      enc.medications.push({
        id: row.id,
        medicationName: row.medication_name,
        medicationNameNative: row.medication_name_native,
        dosage: row.dosage,
        frequency: row.frequency,
        route: row.route,
        status: row.status,
        verificationStatus: row.verification_status,
        provenanceSource: row.provenance_source,
        sourceId: row.source_id,
        prescribedAt: row.created_at,
      });
    }
  });

  (labs || []).forEach((row) => {
    const enc = encounterMap.get(row.encounter_id);
    if (enc) {
      enc.labResults.push({
        id: row.id,
        testName: row.test_name,
        resultValue: row.result_value,
        unit: row.unit,
        referenceRange: row.reference_range,
        abnormalFlag: row.abnormal_flag,
        specimenDate: row.specimen_date,
        verificationStatus: row.verification_status,
        provenanceSource: row.provenance_source,
        sourceId: row.source_id,
        testedAt: row.specimen_date || row.created_at,
      });
    }
  });

  (diagnoses || []).forEach((row) => {
    const enc = encounterMap.get(row.encounter_id);
    if (enc) {
      enc.diagnoses.push({
        id: row.id,
        icd10Code: row.icd10_code,
        conditionName: row.condition_name,
        clinicalStatus: row.clinical_status,
        verificationStatus: row.verification_status,
        provenanceSource: row.provenance_source,
        diagnosedBy: row.diagnosed_by,
        sourceId: row.source_id,
        diagnosedAt: row.diagnosed_at || row.created_at,
      });
    }
  });

  (ayush || []).forEach((row) => {
    const enc = encounterMap.get(row.encounter_id);
    if (enc) {
      enc.ayushAssessments.push({
        id: row.id,
        prakriti: row.prakriti_dosha,
        vikriti: row.vikriti_dosha,
        agni: row.agni_type,
        koshtha: row.koshtha_type,
        dashavidhaPariksha: row.dashavidha_pariksha,
        trividhaPariksha: row.trividha_pariksha,
        ashtavidhaPariksha: row.ashtavidha_pariksha,
        verificationStatus: row.verification_status,
        provenanceSource: row.provenance_source,
        sourceId: row.source_id,
        assessedAt: row.created_at,
      });
    }
  });

  let summaries = Array.from(encounterMap.values());

  // Department filtering if requested
  if (options.department && options.department !== 'all') {
    if (options.department === 'ayush') {
      summaries = summaries.filter((e) => e.ayushAssessments.length > 0);
    } else if (options.department === 'general_medicine') {
      summaries = summaries.filter((e) => e.symptoms.length > 0 || e.vitals.length > 0 || e.medications.length > 0 || e.labResults.length > 0);
    }
  }

  return {
    patient: {
      id: patient.id,
      fullName: patient.full_name,
      firstName: patient.first_name,
      lastName: patient.last_name,
      dateOfBirth: patient.date_of_birth,
      gender: patient.gender,
      phoneNumber: patient.phone_number,
      email: patient.email,
      preferredLanguage: patient.preferred_language,
    },
    totalEncounters: summaries.length,
    encounters: summaries,
  };
}
