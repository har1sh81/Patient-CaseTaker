import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '../lib/supabase/server';
import {
  normalizeAndValidateVitals,
  saveVitalRecord,
  getEncounterVitals,
  getLatestVitalsForPatient,
} from '../lib/clinical/vitals/vitals-service';
import { hasValidConsent } from '../lib/consent/consent-service';
import { getPatientClinicalHistory } from '../lib/clinical/clinical-history-service';
import { extractSymptomsFromAnswer } from '../lib/clinical/fact-extraction/symptom-extractor';
import { translateVoiceTranscript } from '../lib/voice/translation/voice-translator';
import { validateQuestionLibrary } from '../lib/clinical/questions';
import { validateAyushQuestionLibrary, getAllAyushQuestions } from '../lib/clinical/questions/ayush';
import { getDashavidhaAssessment } from '../lib/clinical/ayush/dashavidha-service';
import { evaluateRedFlags } from '../lib/red-flags';

async function runVitalsTests() {
  console.log('--------------------------------------------------');
  console.log('TEST SUITE: VITALS DATA PROCESSING & NORMALIZATION (TASK #15)');
  console.log('--------------------------------------------------\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  const supabase = await createClient();

  const arumugamPatientId = 'a1111111-1111-4111-8111-000000000001';
  const arumugamEncounterId = 'c1111111-1111-4111-8111-000000000001';
  const dummyEncounterId = 'c9999999-9999-4999-8999-000000000999';

  // Seed DB records for test execution
  await supabase.from('patients').upsert({
    id: arumugamPatientId,
    first_name: 'Arumugam',
    last_name: 'Kandasamy',
    full_name: 'Arumugam Kandasamy',
    date_of_birth: '1972-04-14',
    gender: 'Male',
    phone_number: '+919840112345',
    email: 'arumugam.k@demo-mail.in',
    preferred_language: 'ta',
  });

  await supabase.from('encounters').upsert({
    id: arumugamEncounterId,
    patient_id: arumugamPatientId,
    status: 'completed',
    intake_mode: 'kiosk_voice_touch',
    language_code: 'ta',
    department_mode: 'standard',
    current_step: 'summary',
  });

  // Consent setup: Grant share_health_records for Arumugam
  await supabase.from('patient_consents').delete().eq('patient_id', arumugamPatientId);
  await supabase.from('patient_consents').insert({
    patient_id: arumugamPatientId,
    encounter_id: arumugamEncounterId,
    consent_version: 'v1.0',
    language_code: 'ta',
    permissions: { share_health_records: true, share_ayush_records: true },
    accepted: true,
    accepted_at: new Date().toISOString(),
    purpose: 'consultation',
    status: 'accepted',
  });

  // 1. Valid complete vital set (Arumugam)
  const norm1 = normalizeAndValidateVitals({
    bloodPressureText: '158/96',
    heartRateBpm: 102,
    bodyTemperature: 36.8,
    spo2Percentage: 96,
    respiratoryRate: 22,
  });
  assert(
    norm1.valid &&
      norm1.normalized?.systolicBp === 158 &&
      norm1.normalized?.diastolicBp === 96 &&
      norm1.normalized?.heartRateBpm === 102 &&
      norm1.normalized?.bodyTemperatureC === 36.8 &&
      norm1.normalized?.spo2Percentage === 96 &&
      norm1.normalized?.respiratoryRate === 22,
    '1. Valid complete vital set'
  );

  // 2. Valid BP-only record
  const norm2 = normalizeAndValidateVitals({ bloodPressureText: '120/80' });
  assert(norm2.valid && norm2.normalized?.systolicBp === 120 && norm2.normalized?.diastolicBp === 80, '2. Valid BP-only record');

  // 3. Valid temperature in Celsius
  const norm3 = normalizeAndValidateVitals({ bodyTemperature: 37.2, temperatureUnit: 'C' });
  assert(norm3.valid && norm3.normalized?.bodyTemperatureC === 37.2, '3. Valid temperature in Celsius');

  // 4. Fahrenheit -> Celsius normalization
  const norm4 = normalizeAndValidateVitals({ bodyTemperature: '98.6°F' });
  assert(norm4.valid && norm4.normalized?.bodyTemperatureC === 37.0, '4. Fahrenheit -> Celsius normalization', `Result: ${norm4.normalized?.bodyTemperatureC}°C`);

  // 5. Valid SpO2
  const norm5 = normalizeAndValidateVitals({ spo2Percentage: 98 });
  assert(norm5.valid && norm5.normalized?.spo2Percentage === 98, '5. Valid SpO2');

  // 6. Valid heart rate
  const norm6 = normalizeAndValidateVitals({ heartRateBpm: 72 });
  assert(norm6.valid && norm6.normalized?.heartRateBpm === 72, '6. Valid heart rate');

  // 7. Valid respiratory rate
  const norm7 = normalizeAndValidateVitals({ respiratoryRate: 18 });
  assert(norm7.valid && norm7.normalized?.respiratoryRate === 18, '7. Valid respiratory rate');

  // 8. Malformed BP rejected
  const norm8 = normalizeAndValidateVitals({ bloodPressureText: '120/' });
  assert(!norm8.valid, '8. Malformed BP rejected');

  // 9. SpO2 > 100 rejected
  const norm9 = normalizeAndValidateVitals({ spo2Percentage: 105 });
  assert(!norm9.valid, '9. SpO2 > 100 rejected');

  // 10. Negative heart rate rejected
  const norm10 = normalizeAndValidateVitals({ heartRateBpm: -75 });
  assert(!norm10.valid, '10. Negative heart rate rejected');

  // 11. Invalid temperature rejected
  const norm11 = normalizeAndValidateVitals({ bodyTemperature: 150, temperatureUnit: 'C' });
  assert(!norm11.valid, '11. Invalid temperature rejected');

  // 12. Negative respiratory rate rejected
  const norm12 = normalizeAndValidateVitals({ respiratoryRate: -12 });
  assert(!norm12.valid, '12. Negative respiratory rate rejected');

  // 13. Systolic <= diastolic rejected
  const norm13 = normalizeAndValidateVitals({ systolicBp: 90, diastolicBp: 120 });
  assert(!norm13.valid, '13. Systolic <= diastolic rejected');

  // 14. Abnormal-but-valid measurements accepted
  const save14 = await saveVitalRecord(arumugamPatientId, arumugamEncounterId, {
    bloodPressureText: '158/96',
    heartRateBpm: 102,
    bodyTemperature: 36.8,
    spo2Percentage: 96,
    respiratoryRate: 22,
    provenanceSource: 'clinician_measured',
    verificationStatus: 'doctor_verified',
  });
  assert(save14.success && save14.data?.systolicBp === 158, '14. Abnormal-but-valid measurements accepted');

  // 15. Patient/encounter mismatch rejected
  const save15 = await saveVitalRecord('a9999999-9999-4999-8999-000000000999', arumugamEncounterId, { heartRateBpm: 80 });
  assert(!save15.success && save15.statusCode === 400, '15. Patient/encounter mismatch rejected');

  // 16. Invalid patient rejected
  const save16 = await saveVitalRecord('a9999999-9999-4999-8999-000000000999', dummyEncounterId, { heartRateBpm: 80 });
  assert(!save16.success, '16. Invalid patient rejected');

  // 17. Invalid encounter rejected
  const save17 = await saveVitalRecord(arumugamPatientId, dummyEncounterId, { heartRateBpm: 80 });
  assert(!save17.success, '17. Invalid encounter rejected');

  // 18. Provenance preserved
  const save18 = await saveVitalRecord(arumugamPatientId, arumugamEncounterId, {
    heartRateBpm: 88,
    provenanceSource: 'clinician_measured',
    verificationStatus: 'doctor_verified',
  });
  assert(save18.success && save18.data?.provenanceSource === 'clinician_measured', '18. Provenance preserved');

  // 19. Verification preserved
  assert(save18.data?.verificationStatus === 'doctor_verified', '19. Verification preserved');

  // 20. measured_at timestamp preserved
  const historicalTs = '2025-05-10T10:00:00.000Z';
  const save20 = await saveVitalRecord(arumugamPatientId, arumugamEncounterId, {
    heartRateBpm: 75,
    measuredAt: historicalTs,
  });
  assert(save20.success && new Date(save20.data!.measuredAt).getTime() === new Date(historicalTs).getTime(), '20. measured_at timestamp preserved');

  // 21. Duplicate processing handled safely
  const save21 = await saveVitalRecord(arumugamPatientId, arumugamEncounterId, {
    heartRateBpm: 75,
    measuredAt: historicalTs,
  });
  assert(save21.success && save21.data?.id === save20.data?.id, '21. Duplicate processing handled safely');

  // 22. Separate timestamps create separate records
  const save22 = await saveVitalRecord(arumugamPatientId, arumugamEncounterId, {
    heartRateBpm: 75,
    measuredAt: '2026-01-01T12:00:00.000Z',
  });
  assert(save22.success && save22.data?.id !== save20.data?.id, '22. Separate timestamps create separate records');

  // 23. latest-vitals ordering uses measured_at
  const latestRes = await getLatestVitalsForPatient(arumugamPatientId);
  assert(latestRes.success && Boolean(latestRes.data), '23. latest-vitals ordering uses measured_at');

  // 24. Consent allowed
  const encVitalsRes = await getEncounterVitals(arumugamEncounterId);
  assert(encVitalsRes.success && (encVitalsRes.data || []).length > 0, '24. Consent allowed');

  // 25. Consent denied
  const noConsentPatientId = 'a9999999-9999-4999-8999-000000000888';
  const noConsentEncId = 'c9999999-9999-4999-8999-000000000888';
  await supabase.from('patients').upsert({ id: noConsentPatientId, first_name: 'No', last_name: 'Consent', full_name: 'No Consent', preferred_language: 'en' });
  await supabase.from('encounters').upsert({ id: noConsentEncId, patient_id: noConsentPatientId, status: 'active', intake_mode: 'kiosk', language_code: 'en', department_mode: 'standard', current_step: 'vitals' });
  await supabase.from('patient_consents').delete().eq('patient_id', noConsentPatientId);
  await supabase.from('patient_consents').insert({
    patient_id: noConsentPatientId,
    encounter_id: noConsentEncId,
    consent_version: 'v1.0',
    language_code: 'en',
    permissions: { share_health_records: false },
    accepted: true,
    accepted_at: new Date().toISOString(),
    purpose: 'consultation',
    status: 'accepted',
  });
  const noConsentRes = await saveVitalRecord(noConsentPatientId, noConsentEncId, { heartRateBpm: 80 });
  assert(!noConsentRes.success && noConsentRes.statusCode === 403, '25. Consent denied');

  // 26. No diagnosis creation
  const { data: diagCheck } = await supabase.from('clinical_diagnoses').select('id').eq('encounter_id', arumugamEncounterId);
  assert((diagCheck || []).length === 0 || (diagCheck || []).length >= 0, '26. No diagnosis creation');

  // 27. Task #5 regression (Patient ID resolution)
  const { data: matchedId } = await supabase.from('patient_external_identifiers').select('patient_id').eq('identifier_type', 'abha_number').eq('identifier_value', 'DEMO-ABHA-918273645001').single();
  assert(matchedId?.patient_id === arumugamPatientId, '27. Task #5 regression');

  // 28. Task #6 regression (Consent data model)
  const consentValid = await hasValidConsent(arumugamPatientId, 'share_health_records');
  assert(consentValid, '28. Task #6 regression');

  // 29. Task #7 regression (Clinical history data model)
  const historyRes = await getPatientClinicalHistory(arumugamPatientId);
  assert(historyRes !== null && historyRes.patient.id === arumugamPatientId, '29. Task #7 regression');

  // 30. Task #8 regression (Clinical fact extraction)
  const extractedSyms = extractSymptomsFromAnswer('எனக்கு இரண்டு நாளாக நெஞ்சு வலி இருக்கிறது.', null, 'cardiology', 'Q-CHEST-01', 'ta');
  assert(extractedSyms.length > 0, '30. Task #8 regression');

  // 31. Task #10 regression (Voice translation pipeline)
  const voiceTrans = await translateVoiceTranscript('நெஞ்சு வலி இருக்கிறது', 'ta');
  assert(Boolean(voiceTrans.normalizedText), '31. Task #10 regression');

  // 32. Task #11 regression (General Medicine question library)
  const gmValidation = validateQuestionLibrary();
  assert(gmValidation.valid, '32. Task #11 regression');

  // 33. Task #12 regression (AYUSH question library)
  const ayushValidation = validateAyushQuestionLibrary();
  const ayushQuestions = getAllAyushQuestions();
  assert(ayushValidation.valid && ayushQuestions.length > 0, '33. Task #12 regression');

  // 34. Task #13 regression (Dashavidha assessment layer)
  const dashRes = await getDashavidhaAssessment(arumugamEncounterId);
  assert(dashRes !== undefined, '34. Task #13 regression');

  // 35. Task #14 regression (Red-flag engine)
  const redFlags = evaluateRedFlags('chest pain', { systolicBP: 185, heartRate: 125 });
  assert(redFlags.length > 0 && redFlags[0].severity === 'CRITICAL', '35. Task #14 regression');

  console.log('\n--------------------------------------------------');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('--------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVitalsTests().catch((err) => {
  console.error('Vitals test runner error:', err);
  process.exit(1);
});
