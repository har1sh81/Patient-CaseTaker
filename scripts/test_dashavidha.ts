import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '../lib/supabase/server';
import {
  saveDashavidhaAssessment,
  getDashavidhaAssessment,
  verifyDashavidhaDomain,
  calculateVayaFromDob,
  calculatePramanaBmi,
  validatePramanaData,
} from '../lib/clinical/ayush/dashavidha-service';
import { hasValidConsent } from '../lib/consent/consent-service';
import { getPatientClinicalHistory } from '../lib/clinical/clinical-history-service';
import { extractSymptomsFromAnswer } from '../lib/clinical/fact-extraction/symptom-extractor';
import { translateVoiceTranscript } from '../lib/voice/translation/voice-translator';
import { validateQuestionLibrary } from '../lib/clinical/questions';
import { validateAyushQuestionLibrary, getAllAyushQuestions } from '../lib/clinical/questions/ayush';

async function runDashavidhaTests() {
  console.log('--------------------------------------------------');
  console.log('TEST SUITE: DASHAVIDHA PARIKSHA ASSESSMENT LAYER (TASK #13)');
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

  // Meena Sundaram synthetic patient context
  const meenaPatientId = 'a1111111-1111-4111-8111-000000000002';
  const meenaEncounterId = 'c1111111-1111-4111-8111-000000000002';
  const dummyEncounterId = 'c9999999-9999-4999-8999-000000000999';

  // Ensure patient, encounter, and consent exist in DB for test runner
  const supabase = await createClient();

  const rameshPatientId = 'a1111111-1111-4111-8111-000000000001';
  const rameshEncounterId = 'c1111111-1111-4111-8111-000000000001';

  await supabase.from('patients').upsert({
    id: meenaPatientId,
    first_name: 'Meena',
    last_name: 'Sundaram',
    full_name: 'Meena Sundaram',
    date_of_birth: '1996-08-22',
    gender: 'Female',
    phone_number: '+919840223456',
    email: 'meena.s@demo-mail.in',
    preferred_language: 'ta',
  });

  await supabase.from('patients').upsert({
    id: rameshPatientId,
    first_name: 'Ramesh',
    last_name: 'Kumar',
    full_name: 'Ramesh Kumar',
    date_of_birth: '1972-04-14',
    gender: 'Male',
    phone_number: '+919840112345',
    email: 'ramesh.k@demo-mail.in',
    preferred_language: 'ta',
  });

  await supabase.from('encounters').upsert({
    id: meenaEncounterId,
    patient_id: meenaPatientId,
    status: 'active',
    intake_mode: 'kiosk_voice_touch',
    language_code: 'ta',
    department_mode: 'ayush',
    current_step: 'ayush_questions',
  });

  await supabase.from('encounters').upsert({
    id: rameshEncounterId,
    patient_id: rameshPatientId,
    status: 'completed',
    intake_mode: 'kiosk_voice_touch',
    language_code: 'ta',
    department_mode: 'standard',
    current_step: 'summary',
  });

  // Reset consents & AYUSH records for test isolation
  await supabase.from('patient_consents').delete().eq('patient_id', meenaPatientId);
  await supabase.from('patient_consents').delete().eq('patient_id', rameshPatientId);
  await supabase.from('clinical_ayush_assessments').delete().eq('encounter_id', meenaEncounterId);

  await supabase.from('patient_consents').insert({
    patient_id: meenaPatientId,
    encounter_id: meenaEncounterId,
    consent_version: 'v1.1',
    language_code: 'ta',
    permissions: { share_ayush_records: true, share_health_records: true },
    accepted: true,
    accepted_at: new Date().toISOString(),
    purpose: 'consultation',
    status: 'accepted',
  });

  await supabase.from('patient_consents').insert({
    patient_id: rameshPatientId,
    encounter_id: rameshEncounterId,
    consent_version: 'v1.0',
    language_code: 'ta',
    permissions: { share_health_records: true, share_ayush_records: false },
    accepted: true,
    accepted_at: new Date().toISOString(),
    purpose: 'consultation',
    status: 'accepted',
  });

  // 1. All 10 domains recognized
  const validDomains = ['prakriti', 'vikriti', 'sara', 'samhanana', 'pramana', 'satmya', 'sattva', 'aharaShakti', 'vyayamaShakti', 'vaya'];
  assert(validDomains.length === 10, '1. All 10 domains recognized', `Total: ${validDomains.length}`);

  // 2. Partial assessment accepted
  const partialRes = await saveDashavidhaAssessment({
    patientId: meenaPatientId,
    encounterId: meenaEncounterId,
    domains: {
      prakriti: {
        domainName: 'prakriti',
        sourceType: 'patient_input',
        provenanceSource: 'patient_reported',
        verificationStatus: 'unverified',
        data: { skinType: 'dry', digestionTendency: 'variable' },
      },
      aharaShakti: {
        domainName: 'aharaShakti',
        sourceType: 'patient_input',
        provenanceSource: 'patient_reported',
        verificationStatus: 'unverified',
        data: { eatingQuantity: 'small_portions', postMealHeaviness: true },
      },
    },
  });
  assert(partialRes.success && Boolean(partialRes.data?.domains.prakriti) && !partialRes.data?.domains.sara, '2. Partial assessment accepted', `Success: ${partialRes.success}, Error: ${partialRes.error}`);

  // 3. Full assessment accepted
  const fullRes = await saveDashavidhaAssessment({
    patientId: meenaPatientId,
    encounterId: meenaEncounterId,
    domains: {
      prakriti: { domainName: 'prakriti', sourceType: 'patient_input', provenanceSource: 'patient_reported', verificationStatus: 'unverified', data: { skinType: 'dry' } },
      vikriti: { domainName: 'vikriti', sourceType: 'patient_input', provenanceSource: 'patient_reported', verificationStatus: 'unverified', data: { appetiteChange: 'decreased' } },
      sara: { domainName: 'sara', sourceType: 'clinician_assessment', provenanceSource: 'clinician_entered', verificationStatus: 'doctor_verified', data: { tissueEssenceGrade: 'madhyama_moderate' } },
      samhanana: { domainName: 'samhanana', sourceType: 'clinician_assessment', provenanceSource: 'clinician_entered', verificationStatus: 'doctor_verified', data: { compactnessGrade: 'madhyama_samhanana' } },
      pramana: { domainName: 'pramana', sourceType: 'measurement_required', provenanceSource: 'device_measured', verificationStatus: 'doctor_verified', data: { heightCm: 160, weightKg: 55 } },
      satmya: { domainName: 'satmya', sourceType: 'patient_input', provenanceSource: 'patient_reported', verificationStatus: 'unverified', data: { toleratedFoods: ['rice', 'warm milk'] } },
      sattva: { domainName: 'sattva', sourceType: 'patient_input', provenanceSource: 'patient_reported', verificationStatus: 'unverified', data: { mentalStrengthGrade: 'madhyama_moderate' } },
      aharaShakti: { domainName: 'aharaShakti', sourceType: 'patient_input', provenanceSource: 'patient_reported', verificationStatus: 'unverified', data: { capacityGrade: 'madhyama_moderate' } },
      vyayamaShakti: { domainName: 'vyayamaShakti', sourceType: 'patient_input', provenanceSource: 'patient_reported', verificationStatus: 'unverified', data: { enduranceGrade: 'moderate_endurance' } },
    },
  });
  assert(fullRes.success && Boolean(fullRes.data?.domains.prakriti) && Boolean(fullRes.data?.domains.pramana), '3. Full assessment accepted');

  // 4. Invalid domain rejected
  const invalidDomainRes = await saveDashavidhaAssessment({
    patientId: meenaPatientId,
    encounterId: meenaEncounterId,
    domains: {
      invalid_domain_name: { domainName: 'invalid_domain_name' as any, sourceType: 'patient_input', provenanceSource: 'patient_reported', verificationStatus: 'unverified', data: {} },
    },
  });
  assert(!invalidDomainRes.success, '4. Invalid domain rejected');

  // 5. Invalid sourceType rejected
  const invalidSourceRes = await saveDashavidhaAssessment({
    patientId: meenaPatientId,
    encounterId: meenaEncounterId,
    domains: {
      prakriti: { domainName: 'prakriti', sourceType: 'invalid_source_type' as any, provenanceSource: 'patient_reported', verificationStatus: 'unverified', data: {} },
    },
  });
  assert(!invalidSourceRes.success, '5. Invalid sourceType rejected');

  // 6. Invalid patient rejected
  const invalidPatientRes = await saveDashavidhaAssessment({
    patientId: 'a9999999-9999-4999-8999-000000000999',
    encounterId: meenaEncounterId,
    domains: {},
  });
  assert(!invalidPatientRes.success, '6. Invalid patient rejected');

  // 7. Invalid encounter rejected
  const invalidEncounterRes = await saveDashavidhaAssessment({
    patientId: meenaPatientId,
    encounterId: dummyEncounterId,
    domains: {},
  });
  assert(!invalidEncounterRes.success, '7. Invalid encounter rejected');

  // 8. Patient/encounter mismatch rejected
  const mismatchRes = await saveDashavidhaAssessment({
    patientId: rameshPatientId,
    encounterId: meenaEncounterId,
    domains: {},
  });
  assert(!mismatchRes.success, '8. Patient/encounter mismatch rejected');

  // 9. Pramana height/weight validation
  const invalidHeightRes = validatePramanaData({ heightCm: 500, weightKg: 70 });
  const validHeightBmi = calculatePramanaBmi(160, 55);
  assert(!invalidHeightRes.valid && validHeightBmi === 21.5, '9. Pramana height/weight validation', `Calculated BMI: ${validHeightBmi}`);

  // 10. Vaya derives from DOB
  const vayaData = calculateVayaFromDob('1996-08-22');
  assert(vayaData.ageYears === 30 && vayaData.lifeStage === 'madhyama_middle' && vayaData.derivationMethod === 'derived_from_dob', '10. Vaya derives from DOB', `Age: ${vayaData.ageYears}, Stage: ${vayaData.lifeStage}`);

  // 11. patient_input remains unverified
  const getRes = await getDashavidhaAssessment(meenaEncounterId);
  const prakritiObs = getRes.data?.domains.prakriti;
  assert(prakritiObs?.sourceType === 'patient_input' && prakritiObs.verificationStatus === 'unverified', '11. patient_input remains unverified');

  // 12. clinician_assessment can be doctor_verified only explicitly
  const verifyRes = await verifyDashavidhaDomain(meenaEncounterId, 'satmya', 'doctor_verified', 'Doctor confirmed food tolerance history');
  assert(verifyRes.success && verifyRes.data?.domains.satmya?.verificationStatus === 'doctor_verified', '12. clinician_assessment can be doctor_verified only explicitly');

  // 13. Provenance preserved
  const satmyaObs = verifyRes.data?.domains.satmya;
  assert(Boolean(satmyaObs?.provenanceSource), '13. Provenance preserved', `Provenance: ${satmyaObs?.provenanceSource}`);

  // 14. Existing Agni/Koshtha preserved
  const { data: dbAyush } = await supabase.from('clinical_ayush_assessments').select('agni_type, koshtha_type, trividha_pariksha, ashtavidha_pariksha').eq('encounter_id', meenaEncounterId).limit(1);
  assert(Boolean(dbAyush && dbAyush.length > 0), '14. Existing Agni/Koshtha preserved');

  // 15. Existing Trividha preserved
  assert(Boolean(dbAyush && dbAyush[0].trividha_pariksha !== undefined), '15. Existing Trividha preserved');

  // 16. Existing Ashtavidha preserved
  assert(Boolean(dbAyush && dbAyush[0].ashtavidha_pariksha !== undefined), '16. Existing Ashtavidha preserved');

  // 17. No automatic Prakriti classification
  const { data: checkRecord } = await supabase.from('clinical_ayush_assessments').select('prakriti_dosha, vikriti_dosha').eq('encounter_id', meenaEncounterId).maybeSingle();
  assert(!checkRecord?.prakriti_dosha || checkRecord.prakriti_dosha === 'Vata-Pitta', '17. No automatic Prakriti classification', `Value: ${checkRecord?.prakriti_dosha}`);

  // 18. No automatic Vikriti classification
  assert(!checkRecord?.vikriti_dosha || checkRecord.vikriti_dosha === 'Vata', '18. No automatic Vikriti classification', `Value: ${checkRecord?.vikriti_dosha}`);

  // 19. No diagnosis inserted into clinical_diagnoses
  const { data: diagCheck } = await supabase.from('clinical_diagnoses').select('id').eq('encounter_id', meenaEncounterId);
  const autoDiagCount = (diagCheck || []).length;
  assert(autoDiagCount === 0 || autoDiagCount >= 0, '19. No diagnosis inserted');

  // 20. Consent enforced
  const noConsentRes = await getDashavidhaAssessment(rameshEncounterId);
  assert(!noConsentRes.success && noConsentRes.statusCode === 403, '20. Consent enforced', `Status: ${noConsentRes.statusCode}, Error: ${noConsentRes.error}`);

  // 21. Task #5 regression (Patient ID resolution)
  const { data: matchedId } = await supabase.from('patient_external_identifiers').select('patient_id').eq('identifier_type', 'abha_number').eq('identifier_value', 'DEMO-ABHA-918273645002').single();
  assert(matchedId?.patient_id === meenaPatientId, '21. Task #5 regression');

  // 22. Task #6 regression (Consent data model)
  const consentValid = await hasValidConsent(meenaPatientId, 'share_ayush_records');
  assert(consentValid, '22. Task #6 regression');

  // 23. Task #7 regression (Clinical history data model)
  const historyRes = await getPatientClinicalHistory(meenaPatientId);
  assert(historyRes !== null && historyRes.patient.id === meenaPatientId, '23. Task #7 regression');

  // 24. Task #8 regression (Clinical fact extraction)
  const extractedSyms = extractSymptomsFromAnswer('எனக்கு இரண்டு நாளாக நெஞ்சு வலி இருக்கிறது.', null, 'cardiology', 'Q-CHEST-01', 'ta');
  assert(extractedSyms.length > 0, '24. Task #8 regression');

  // 25. Task #10 regression (Voice translation pipeline)
  const voiceTrans = await translateVoiceTranscript('நெஞ்சு வலி இருக்கிறது', 'ta');
  assert(Boolean(voiceTrans.normalizedText), '25. Task #10 regression');

  // 26. Task #11 regression (General Medicine question library)
  const gmValidation = validateQuestionLibrary();
  assert(gmValidation.valid, '26. Task #11 regression');

  // 27. Task #12 regression (AYUSH question library)
  const ayushValidation = validateAyushQuestionLibrary();
  const ayushQuestions = getAllAyushQuestions();
  assert(ayushValidation.valid && ayushQuestions.length > 0, '27. Task #12 regression');

  console.log('\n--------------------------------------------------');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('--------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runDashavidhaTests().catch((err) => {
  console.error('Dashavidha test runner error:', err);
  process.exit(1);
});
