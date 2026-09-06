import {
  ALL_AYUSH_QUESTIONS,
  getAllAyushQuestions,
  getQuestionsForAyushSection,
  getQuestionsForAyushAssessment,
  getDashavidhaQuestions,
  getTrividhaQuestions,
  getAshtavidhaQuestions,
  validateAyushQuestionLibrary,
} from '../lib/clinical/questions/ayush';
import { validateQuestionLibrary, getAllQuestions } from '../lib/clinical/questions';
import { extractSymptomsFromAnswer } from '../lib/clinical/fact-extraction/symptom-extractor';
import { translateVoiceTranscript } from '../lib/voice/translation/voice-translator';

async function runAyushLibraryTests() {
  console.log('--------------------------------------------------');
  console.log('TEST SUITE: AYUSH QUESTION LIBRARY (TASK #12)');
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

  // 1. AYUSH library loads successfully
  assert(ALL_AYUSH_QUESTIONS.length > 0, '1. AYUSH library loads successfully', `Loaded ${ALL_AYUSH_QUESTIONS.length} questions`);

  // 2. Every question has a unique stable ID
  const ids = ALL_AYUSH_QUESTIONS.map((q) => q.id);
  const uniqueIds = new Set(ids);
  assert(ids.length === uniqueIds.size, '2. Every question has a unique stable ID', `Total: ${ids.length}, Unique: ${uniqueIds.size}`);

  // 3. Every question has version 1.0
  const allV1 = ALL_AYUSH_QUESTIONS.every((q) => q.version === '1.0');
  assert(allV1, '3. Every question has version 1.0');

  // 4. Every question has a valid answer type
  const validAnswerTypes = new Set(['free_text', 'yes_no', 'single_choice', 'multi_choice', 'numeric', 'numeric_scale', 'duration', 'date', 'time', 'body_site']);
  const allValidAnswerTypes = ALL_AYUSH_QUESTIONS.every((q) => validAnswerTypes.has(q.answerType));
  assert(allValidAnswerTypes, '4. Every question has a valid answer type');

  // 5. Every patient-facing question has EN/TA/HI
  const patientQuestions = ALL_AYUSH_QUESTIONS.filter((q) => q.sourceType === 'patient_input');
  const allHasEnTaHi = patientQuestions.every((q) => Boolean(q.questionText.en && q.questionText.ta && q.questionText.hi));
  assert(allHasEnTaHi, '5. Every patient-facing question has EN/TA/HI', `Checked ${patientQuestions.length} patient-facing questions`);

  // 6. Every question has a target field
  const allHasTargetField = ALL_AYUSH_QUESTIONS.every((q) => Boolean(q.targetField));
  assert(allHasTargetField, '6. Every question has a target field');

  // 7. Dashavidha has all 10 domains
  const dashavidha = getDashavidhaQuestions();
  const dDomains = new Set(dashavidha.map((q) => q.ayushDomain));
  const expectedDashavidha = ['prakriti', 'vikriti', 'sara', 'samhanana', 'pramana', 'satmya', 'sattva', 'ahara_shakti', 'vyayama_shakti', 'vaya'];
  const hasAllDashavidha = expectedDashavidha.every((dom) => dDomains.has(dom as any));
  assert(hasAllDashavidha, '7. Dashavidha has all 10 domains', `Found domains: ${Array.from(dDomains).join(', ')}`);

  // 8. Trividha has Darshana/Sparshana/Prashna
  const trividha = getTrividhaQuestions();
  const tDomains = new Set(trividha.map((q) => q.ayushDomain));
  const hasAllTrividha = ['darshana', 'sparshana', 'prashna'].every((dom) => tDomains.has(dom as any));
  assert(hasAllTrividha, '8. Trividha has Darshana/Sparshana/Prashna', `Found domains: ${Array.from(tDomains).join(', ')}`);

  // 9. Ashtavidha has all supported domains
  const ashtavidha = getAshtavidhaQuestions();
  const aDomains = new Set(ashtavidha.map((q) => q.ayushDomain));
  const expectedAshtavidha = ['nadi', 'jihva', 'mala', 'mutra', 'shabda', 'drik', 'akriti'];
  const hasAllAshtavidha = expectedAshtavidha.every((dom) => aDomains.has(dom as any));
  assert(hasAllAshtavidha, '9. Ashtavidha has all supported domains', `Found domains: ${Array.from(aDomains).join(', ')}`);

  // 10. Agni section exists
  const agniQuestions = getQuestionsForAyushSection('ayush_agni');
  assert(agniQuestions.length > 0, '10. Agni section exists', `Count: ${agniQuestions.length}`);

  // 11. Koshtha section exists
  const koshthaQuestions = getQuestionsForAyushSection('ayush_koshtha');
  assert(koshthaQuestions.length > 0, '11. Koshtha section exists', `Count: ${koshthaQuestions.length}`);

  // 12. Ahara section exists
  const aharaQuestions = getQuestionsForAyushSection('ayush_ahara');
  assert(aharaQuestions.length > 0, '12. Ahara section exists', `Count: ${aharaQuestions.length}`);

  // 13. Vihara section exists
  const viharaQuestions = getQuestionsForAyushSection('ayush_vihara');
  assert(viharaQuestions.length > 0, '13. Vihara section exists', `Count: ${viharaQuestions.length}`);

  // 14. Nidra section exists
  const nidraQuestions = getQuestionsForAyushSection('ayush_nidra');
  assert(nidraQuestions.length > 0, '14. Nidra section exists', `Count: ${nidraQuestions.length}`);

  // 15. Patient-input vs clinician-assessment metadata is valid
  const validSourceTypes = new Set(['patient_input', 'clinician_assessment', 'measurement_required']);
  const allValidSourceTypes = ALL_AYUSH_QUESTIONS.every((q) => validSourceTypes.has(q.sourceType));
  assert(allValidSourceTypes, '15. Patient-input vs clinician-assessment metadata is valid');

  // 16. No question directly asks the patient to self-diagnose a dosha condition
  const patientEnTexts = patientQuestions.map((q) => q.questionText.en.toLowerCase());
  const doshaDiagnosticPhrases = ['are you vata', 'are you pitta', 'do you have vishamagni', 'do you have mandagni', 'do you have tikshnagni'];
  const hasSelfDiagnosis = patientEnTexts.some((text) => doshaDiagnosticPhrases.some((phrase) => text.includes(phrase)));
  assert(!hasSelfDiagnosis, '16. No question directly asks the patient to self-diagnose a dosha condition');

  // 17. No treatment/prescription appears in patient questions
  const rxTerms = ['take ashwagandha', 'take triphala', 'take medicine', 'prescription', 'take paracetamol'];
  const hasPrescriptions = patientEnTexts.some((text) => rxTerms.some((term) => text.includes(term)));
  assert(!hasPrescriptions, '17. No treatment/prescription appears in patient questions');

  // 18. No diagnostic labels are disguised as questions
  const diagTerms = ['you have diabetes', 'you have hypertension', 'you have rheumatoid arthritis'];
  const hasDiagLabels = patientEnTexts.some((text) => diagTerms.some((term) => text.includes(term)));
  assert(!hasDiagLabels, '18. No diagnostic labels are disguised as questions');

  // 19. Retrieval functions are passive
  const allRetrieved = getAllAyushQuestions();
  assert(allRetrieved.length === ALL_AYUSH_QUESTIONS.length, '19. Retrieval functions are passive (returns static definitions)');

  // 20. Task #8 extraction regression passes
  const extractedSymptoms = extractSymptomsFromAnswer('எனக்கு இரண்டு நாளாக நெஞ்சு வலி இருக்கிறது.', null, 'cardiology', 'Q-CHEST-01', 'ta');
  assert(extractedSymptoms.length > 0 && extractedSymptoms[0].symptomName === 'Chest Pain', '20. Task #8 extraction regression passes');

  // 21. Task #10 voice pipeline regression passes
  const voiceResult = await translateVoiceTranscript('நெஞ்சு வலி மற்றும் மூச்சுத்திணறல் இருக்கிறது', 'ta');
  assert(Boolean(voiceResult.normalizedText), '21. Task #10 voice pipeline regression passes', `Normalized text: ${voiceResult.normalizedText}`);

  // 22. Task #11 General Medicine question library regression passes
  const fullValidation = validateQuestionLibrary();
  assert(fullValidation.valid, '22. Task #11 General Medicine question library regression passes', fullValidation.errors.join('; '));

  console.log('\n--------------------------------------------------');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('--------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAyushLibraryTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
