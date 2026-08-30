import { LocalClinicalNLP } from '../lib/ai/local-nlp';

interface VoiceASRTestCase {
  id: string;
  lang: 'en' | 'hi' | 'ta';
  transcript: string;
  expectedSymptom?: string;
  expectedDosageOrDuration?: string;
  expectedNegated?: string[];
  expectedHistorical?: string[];
  expectedMedicationStopped?: string[];
}

const VOICE_ASR_TEST_SUITE: VoiceASRTestCase[] = [
  // 20 English Voice Transcripts
  { id: 'V-EN-01', lang: 'en', transcript: 'I have had severe stomach pain for three weeks and 5 mg amlodipine', expectedSymptom: 'Stomach Pain', expectedDosageOrDuration: 'three weeks' },
  { id: 'V-EN-02', lang: 'en', transcript: 'I have nausea but no vomiting for two days', expectedSymptom: 'Nausea', expectedNegated: ['Vomiting'], expectedDosageOrDuration: 'two days' },
  { id: 'V-EN-03', lang: 'en', transcript: 'I stopped taking amlodipine three months ago', expectedMedicationStopped: ['Amlodipine'] },
  { id: 'V-EN-04', lang: 'en', transcript: 'I had asthma when I was a child but not now', expectedHistorical: ['Fever'] },
  { id: 'V-EN-05', lang: 'en', transcript: 'Severe headache and 10 mg paracetamol for 5 days without fever', expectedSymptom: 'Headache', expectedNegated: ['Fever'] },
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `V-EN-${i + 6}`,
    lang: 'en' as const,
    transcript: i % 2 === 0 ? `I have chest pain for ${i + 1} days` : `No fever, taking metformin 500 mg`,
    expectedSymptom: i % 2 === 0 ? 'Chest Pain' : undefined,
    expectedNegated: i % 2 !== 0 ? ['Fever'] : undefined,
  })),

  // 20 Hindi Voice Transcripts
  { id: 'V-HI-01', lang: 'hi', transcript: 'मुझे 3 हफ़्ते से पेट में दर्द है', expectedSymptom: 'Stomach Pain', expectedDosageOrDuration: '3 हफ़्ते' },
  { id: 'V-HI-02', lang: 'hi', transcript: 'जी मिचला रहा है लेकिन उल्टी नहीं है', expectedSymptom: 'Nausea', expectedNegated: ['Vomiting'] },
  { id: 'V-HI-03', lang: 'hi', transcript: 'मैंने एमलोडिपाइन लेना बंद कर दिया', expectedMedicationStopped: ['Amlodipine'] },
  ...Array.from({ length: 17 }, (_, i) => ({
    id: `V-HI-${i + 4}`,
    lang: 'hi' as const,
    transcript: `सीने में दर्द ${i + 1} दिन से है और बुखार नहीं है`,
    expectedSymptom: 'Chest Pain',
    expectedNegated: ['Fever'],
  })),

  // 20 Tamil Voice Transcripts
  { id: 'V-TA-01', lang: 'ta', transcript: 'எனக்கு 3 வாரங்களாக வயிறு வலி உள்ளது', expectedSymptom: 'Stomach Pain', expectedDosageOrDuration: '3 வாரங்களாக' },
  { id: 'V-TA-02', lang: 'ta', transcript: 'குமட்டல் உள்ளது ஆனால் வாந்தி இல்லை', expectedSymptom: 'Nausea', expectedNegated: ['Vomiting'] },
  { id: 'V-TA-03', lang: 'ta', transcript: 'அம்லோடிபைன் மருந்து நிறுத்தப்பட்டது', expectedMedicationStopped: ['Amlodipine'] },
  ...Array.from({ length: 17 }, (_, i) => ({
    id: `V-TA-${i + 4}`,
    lang: 'ta' as const,
    transcript: `நெஞ்சு வலி ${i + 1} நாட்களாக உள்ளது காய்ச்சல் இல்லை`,
    expectedSymptom: 'Chest Pain',
    expectedNegated: ['Fever'],
  })),
];

export async function runVoiceASRBenchmark() {
  console.log('===========================================================');
  console.log('PHASE 24 BENCHMARK — MULTILINGUAL VOICE / ASR QUALITY SUITE');
  console.log('===========================================================\n');

  let totalCases = VOICE_ASR_TEST_SUITE.length;
  let correctEntities = 0;
  let correctNegations = 0;
  let correctMedicationStatus = 0;

  const startTime = Date.now();
  const initialMem = process.memoryUsage().heapUsed / 1024 / 1024;

  VOICE_ASR_TEST_SUITE.forEach(tc => {
    const res = LocalClinicalNLP.extractFacts(tc.transcript, tc.lang);

    // Entity Preservation
    if (tc.expectedSymptom) {
      if (res.activeSymptoms.includes(tc.expectedSymptom)) correctEntities++;
    } else {
      correctEntities++;
    }

    // Negation Preservation
    if (tc.expectedNegated) {
      if (tc.expectedNegated.every(n => res.negatedSymptoms.includes(n))) correctNegations++;
    } else {
      correctNegations++;
    }

    // Medication Preservation
    if (tc.expectedMedicationStopped) {
      if (tc.expectedMedicationStopped.every(m => res.stoppedMedications.includes(m))) correctMedicationStatus++;
    } else {
      correctMedicationStatus++;
    }
  });

  const durationMs = Date.now() - startTime;
  const finalMem = process.memoryUsage().heapUsed / 1024 / 1024;

  console.log(`Evaluated ${totalCases} synthetic voice transcripts across EN, HI, TA.`);
  console.log(`-----------------------------------------------------------`);
  console.log(`Clinical Entity Preservation Accuracy: ${((correctEntities / totalCases) * 100).toFixed(1)}%`);
  console.log(`Negation Context Preservation Accuracy: ${((correctNegations / totalCases) * 100).toFixed(1)}%`);
  console.log(`Medication Status Preservation Accuracy: ${((correctMedicationStatus / totalCases) * 100).toFixed(1)}%`);
  console.log(`-----------------------------------------------------------`);
  console.log(`Transcript NLP Latency: ${durationMs} ms (${(durationMs / totalCases).toFixed(2)} ms / transcript)`);
  console.log(`Heap Memory Footprint:  ${(finalMem - initialMem).toFixed(2)} MB`);
  console.log('===========================================================');
}

runVoiceASRBenchmark().catch(console.error);
