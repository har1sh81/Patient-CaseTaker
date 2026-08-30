import { LocalClinicalNLP } from '../lib/ai/local-nlp';
import { LocalEmbeddingsEngine } from '../lib/ai/local-embeddings';
import { LocalProvider } from '../lib/ai/providers/local-provider';

interface BenchmarkTestCase {
  id: string;
  lang: 'en' | 'hi' | 'ta';
  input: string;
  expectedSymptom?: string;
  expectedDuration?: string;
  expectedNegated?: string[];
}

const BENCHMARK_DATASET: BenchmarkTestCase[] = [
  // English Cases (1-20)
  { id: 'EN-01', lang: 'en', input: 'I have severe chest pain for 3 days', expectedSymptom: 'Chest Pain', expectedDuration: '3 days' },
  { id: 'EN-02', lang: 'en', input: 'No fever or vomiting, but headache for 2 weeks', expectedSymptom: 'Headache', expectedNegated: ['Fever', 'Vomiting'], expectedDuration: '2 weeks' },
  { id: 'EN-03', lang: 'en', input: 'Stomach pain after eating for 5 days without fever', expectedSymptom: 'Stomach Pain', expectedNegated: ['Fever'], expectedDuration: '5 days' },
  { id: 'EN-04', lang: 'en', input: 'Experiencing shortness of breath since 1 month', expectedSymptom: 'Shortness of Breath', expectedDuration: '1 month' },
  { id: 'EN-05', lang: 'en', input: 'High fever and severe chills for 4 days', expectedSymptom: 'Fever', expectedDuration: '4 days' },
  { id: 'EN-06', lang: 'en', input: 'Dizziness and giddiness without any headache', expectedSymptom: 'Dizziness', expectedNegated: ['Headache'] },
  { id: 'EN-07', lang: 'en', input: 'Persistent dry cough for 10 days', expectedSymptom: 'Cough', expectedDuration: '10 days' },
  { id: 'EN-08', lang: 'en', input: 'No chest pain, only mild fever for 1 day', expectedSymptom: 'Fever', expectedNegated: ['Chest Pain'], expectedDuration: '1 day' },

  // Hindi Cases (21-35)
  { id: 'HI-01', lang: 'hi', input: 'मुझे 3 दिन से सीने में दर्द है', expectedSymptom: 'Chest Pain', expectedDuration: '3 दिन' },
  { id: 'HI-02', lang: 'hi', input: 'बुखार नहीं है लेकिन 2 सप्ताह से सिरदर्द है', expectedSymptom: 'Headache', expectedNegated: ['Fever'], expectedDuration: '2 सप्ताह' },
  { id: 'HI-03', lang: 'hi', input: 'पेट दर्द और उल्टी बिना बुखार के 4 दिन से', expectedSymptom: 'Stomach Pain', expectedNegated: ['Fever'], expectedDuration: '4 दिन' },

  // Tamil Cases (36-50)
  { id: 'TA-01', lang: 'ta', input: 'எனக்கு 3 நாட்களாக நெஞ்சு வலி உள்ளது', expectedSymptom: 'Chest Pain', expectedDuration: '3 நாட்களாக' },
  { id: 'TA-02', lang: 'ta', input: 'காய்ச்சல் இல்லை ஆனால் 2 வாரங்களாக தலைவலி', expectedSymptom: 'Headache', expectedNegated: ['Fever'], expectedDuration: '2 வாரங்களாக' },
];

export async function runClinicalNLPBenchmark() {
  console.log('===========================================================');
  console.log('PHASE 22 BENCHMARK — LOCAL CLINICAL NLP & EMBEDDINGS ENGINE');
  console.log('===========================================================\n');

  const initialMem = process.memoryUsage().heapUsed / 1024 / 1024;
  const startTime = Date.now();

  let totalCases = BENCHMARK_DATASET.length;
  let correctSymptomCount = 0;
  let correctDurationCount = 0;
  let correctNegationCount = 0;

  BENCHMARK_DATASET.forEach(tc => {
    const res = LocalClinicalNLP.extractFacts(tc.input, tc.lang);

    if (tc.expectedSymptom && res.activeSymptoms.includes(tc.expectedSymptom)) {
      correctSymptomCount++;
    }
    if (tc.expectedDuration && res.duration && res.duration.toLowerCase().includes(tc.expectedDuration.toLowerCase())) {
      correctDurationCount++;
    }
    if (tc.expectedNegated) {
      const allNegatedMatch = tc.expectedNegated.every(neg => res.negatedSymptoms.includes(neg));
      if (allNegatedMatch) correctNegationCount++;
    } else {
      correctNegationCount++;
    }
  });

  const totalTime = Date.now() - startTime;
  const finalMem = process.memoryUsage().heapUsed / 1024 / 1024;
  const avgLatency = (totalTime / totalCases).toFixed(2);

  console.log(`Dataset Size: ${totalCases} synthetic clinical cases`);
  console.log(`Language Coverage: English (8), Hindi (3), Tamil (2)`);
  console.log(`-----------------------------------------------------------`);
  console.log(`Symptom Extraction Accuracy: ${((correctSymptomCount / totalCases) * 100).toFixed(1)}%`);
  console.log(`Duration Extraction Accuracy: ${((correctDurationCount / totalCases) * 100).toFixed(1)}%`);
  console.log(`Negation Detection Accuracy: ${((correctNegationCount / totalCases) * 100).toFixed(1)}%`);
  console.log(`-----------------------------------------------------------`);
  console.log(`Total Execution Latency: ${totalTime} ms`);
  console.log(`Average Case Latency: ${avgLatency} ms / case`);
  console.log(`Heap Memory Used: ${(finalMem - initialMem).toFixed(2)} MB`);

  // Embeddings Test
  const vec1 = LocalEmbeddingsEngine.generateEmbedding('chest pain radiating to left arm');
  const vec2 = LocalEmbeddingsEngine.generateEmbedding('angina pressure in left chest');
  const vec3 = LocalEmbeddingsEngine.generateEmbedding('knee joint stiffness');
  const simRelated = LocalEmbeddingsEngine.cosineSimilarity(vec1, vec2);
  const simUnrelated = LocalEmbeddingsEngine.cosineSimilarity(vec1, vec3);

  console.log(`\nLocal Embedding Benchmark (384-dim):`);
  console.log(`Related similarity (Chest Pain vs Angina): ${(simRelated * 100).toFixed(1)}%`);
  console.log(`Unrelated similarity (Chest Pain vs Knee): ${(simUnrelated * 100).toFixed(1)}%`);
  console.log('===========================================================');
}

runClinicalNLPBenchmark().catch(console.error);
