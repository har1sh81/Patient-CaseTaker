import { NeuralEmbeddingProvider, FeatureHashEmbeddingProvider } from '../lib/ai/embedding-provider';

interface MedicalRecordPair {
  id: string;
  query: string; // Current complaint
  relevantRecord: string; // Semantically related history
  irrelevantRecord: string; // Unrelated history
  lang: 'en' | 'hi' | 'ta';
}

const TEST_PAIRS: MedicalRecordPair[] = [
  // Paraphrase & Synonym Matches
  { id: 'R-01', lang: 'en', query: 'burning pain after meals', relevantRecord: 'Epigastric discomfort following food intake for 3 months', irrelevantRecord: 'Knee joint pain after morning walk' },
  { id: 'R-02', lang: 'en', query: 'shortness of breath when climbing stairs', relevantRecord: 'Exertional dyspnea while walking uphill', irrelevantRecord: 'Skin rash on arm after soap contact' },
  { id: 'R-03', lang: 'en', query: 'severe throbbing headache on left side', relevantRecord: 'Left-sided migraine with photophobia', irrelevantRecord: 'Sprained ankle during soccer' },
  { id: 'R-04', lang: 'en', query: 'high blood sugar levels', relevantRecord: 'Type 2 Diabetes Mellitus with HbA1c 8.2%', irrelevantRecord: 'Lumbar backache' },
  { id: 'R-05', lang: 'en', query: 'chest tightness radiating to jaw', relevantRecord: 'Acute coronary syndrome with angina', irrelevantRecord: 'Fungal toe infection' },

  // Hindi Multilingual Matches
  { id: 'R-06', lang: 'hi', query: 'खाना खाने के बाद पेट में जलन', relevantRecord: 'Epigastric burning pain after meals', irrelevantRecord: 'Knee joint injury' },
  { id: 'R-07', lang: 'hi', query: 'सीने में भारीपन और सांस फूलना', relevantRecord: 'Chest pressure and exertional breathlessness', irrelevantRecord: 'Eye infection' },

  // Tamil Multilingual Matches
  { id: 'R-08', lang: 'ta', query: 'சாப்பிட்ட பிறகு வயிறு எரிச்சல்', relevantRecord: 'Postprandial epigastric burning sensation', irrelevantRecord: 'Finger cut' },
  { id: 'R-09', lang: 'ta', query: 'நெஞ்சு பாரம் மற்றும் மூச்சுத்திணறல்', relevantRecord: 'Chest tightness with acute dyspnea', irrelevantRecord: 'Tooth pain' },
];

export async function runRetrievalBenchmark() {
  console.log('===========================================================');
  console.log('PHASE 22B BENCHMARK — NEURAL EMBEDDINGS vs FEATURE HASHING');
  console.log('===========================================================\n');

  const neural = new NeuralEmbeddingProvider();
  const hash = new FeatureHashEmbeddingProvider();

  let neuralHits = 0;
  let hashHits = 0;
  let totalQueries = TEST_PAIRS.length;

  const initialMem = process.memoryUsage().heapUsed / 1024 / 1024;
  const startTime = Date.now();

  for (const pair of TEST_PAIRS) {
    // 1. Neural Embeddings
    const qEmbedN = await neural.embed(pair.query);
    const relEmbedN = await neural.embed(pair.relevantRecord);
    const irrelEmbedN = await neural.embed(pair.irrelevantRecord);

    const simRelN = neural.similarity(qEmbedN.vector, relEmbedN.vector);
    const simIrrelN = neural.similarity(qEmbedN.vector, irrelEmbedN.vector);

    if (simRelN > simIrrelN) {
      neuralHits++;
    }

    // 2. Feature Hashing
    const qEmbedH = await hash.embed(pair.query);
    const relEmbedH = await hash.embed(pair.relevantRecord);
    const irrelEmbedH = await hash.embed(pair.irrelevantRecord);

    const simRelH = hash.similarity(qEmbedH.vector, relEmbedH.vector);
    const simIrrelH = hash.similarity(qEmbedH.vector, irrelEmbedH.vector);

    if (simRelH > simIrrelH) {
      hashHits++;
    }
  }

  const durationMs = Date.now() - startTime;
  const finalMem = process.memoryUsage().heapUsed / 1024 / 1024;

  const neuralPrecision1 = ((neuralHits / totalQueries) * 100).toFixed(1);
  const hashPrecision1 = ((hashHits / totalQueries) * 100).toFixed(1);

  console.log(`Evaluated ${totalQueries} synthetic medical query-record pairs.`);
  console.log(`-----------------------------------------------------------`);
  console.log(`Feature Hashing Vectorizer Precision@1: ${hashPrecision1}%`);
  console.log(`Local Neural Embedding (MiniLM) Precision@1: ${neuralPrecision1}%`);
  console.log(`-----------------------------------------------------------`);
  console.log(`Total Execution Latency: ${durationMs} ms (${(durationMs / totalQueries).toFixed(2)} ms / query)`);
  console.log(`Heap Memory Used: ${(finalMem - initialMem).toFixed(2)} MB`);

  // Paraphrase Semantic Demonstration
  const exQuery = 'burning pain after meals';
  const exMatch = 'Epigastric discomfort following food intake';
  const eQ = await neural.embed(exQuery);
  const eM = await neural.embed(exMatch);
  const eH_Q = await hash.embed(exQuery);
  const eH_M = await hash.embed(exMatch);

  console.log(`\nSemantic Paraphrase Demo:`);
  console.log(`Query: "${exQuery}"`);
  console.log(`Target: "${exMatch}"`);
  console.log(`Feature Hashing Similarity: ${(hash.similarity(eH_Q.vector, eH_M.vector) * 100).toFixed(1)}%`);
  console.log(`Neural Embedding Similarity: ${(neural.similarity(eQ.vector, eM.vector) * 100).toFixed(1)}%`);
  console.log('===========================================================');
}

runRetrievalBenchmark().catch(console.error);
