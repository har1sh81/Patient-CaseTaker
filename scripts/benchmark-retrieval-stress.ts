import { HybridClinicalRetrievalEngine, ClinicalRecordCandidate } from '../lib/ai/hybrid-retrieval-engine';

export interface StressTestCase {
  id: string;
  patientId: string;
  category: 'exact' | 'synonym' | 'paraphrase' | 'indirect' | 'terminology' | 'distractor' | 'temporal' | 'multilingual' | 'cross_language';
  lang: 'en' | 'hi' | 'ta';
  query: string;
  relevantRecords: ClinicalRecordCandidate[];
  irrelevantRecords: ClinicalRecordCandidate[];
  subset: 'dev' | 'val' | 'test';
}

const PATIENT_ID = 'pat_stress_600';

export function generateStressBenchmarkSuite(): StressTestCase[] {
  const cases: StressTestCase[] = [];

  for (let i = 0; i < 600; i++) {
    const subset: 'dev' | 'val' | 'test' = i < 200 ? 'dev' : i < 400 ? 'val' : 'test';
    const typeIdx = i % 9;

    let category: StressTestCase['category'] = 'paraphrase';
    let lang: 'en' | 'hi' | 'ta' = 'en';
    let query = '';
    let relContent = '';
    let distractorContent = '';
    let relCategory: ClinicalRecordCandidate['clinicalCategory'] = 'gastrointestinal';
    let distractorCategory: ClinicalRecordCandidate['clinicalCategory'] = 'musculoskeletal';

    switch (typeIdx) {
      case 0:
        category = 'exact';
        lang = 'en';
        query = 'abdominal pain';
        relContent = 'Patient reports abdominal pain';
        distractorContent = 'Patient reports severe knee pain';
        relCategory = 'gastrointestinal';
        distractorCategory = 'musculoskeletal';
        break;
      case 1:
        category = 'synonym';
        lang = 'en';
        query = 'stomach ache for 2 weeks';
        relContent = 'Abdominal discomfort persisting for 14 days';
        distractorContent = 'Headache persisting for 14 days';
        relCategory = 'gastrointestinal';
        distractorCategory = 'neurological';
        break;
      case 2:
        category = 'paraphrase';
        lang = 'en';
        query = 'burning pain in upper stomach after meals';
        relContent = 'Epigastric post-prandial burning sensation';
        distractorContent = 'Burning sensation on skin rash after soap exposure';
        relCategory = 'gastrointestinal';
        distractorCategory = 'general';
        break;
      case 3:
        category = 'indirect';
        lang = 'en';
        query = 'pain gets much worse whenever I eat food';
        relContent = 'Post-prandial exacerbation of epigastric pain';
        distractorContent = 'Patient eats normal food after ankle surgery';
        relCategory = 'gastrointestinal';
        distractorCategory = 'musculoskeletal';
        break;
      case 4:
        category = 'terminology';
        lang = 'en';
        query = 'trouble breathing when walking upstairs';
        relContent = 'Exertional dyspnea on stair climbing';
        distractorContent = 'Walking trouble due to osteoarthritis of right knee';
        relCategory = 'respiratory';
        distractorCategory = 'musculoskeletal';
        break;
      case 5:
        category = 'distractor';
        lang = 'en';
        query = 'stomach pain';
        relContent = 'Gastritis with upper abdominal pain';
        distractorContent = 'Patient experienced pain during knee surgery recovery';
        relCategory = 'gastrointestinal';
        distractorCategory = 'musculoskeletal';
        break;
      case 6:
        category = 'temporal';
        lang = 'en';
        query = 'current active chest tightness';
        relContent = 'Active chest pressure and angina for 2 hours';
        distractorContent = 'Chest tightness during childhood asthma, fully resolved 10 years ago';
        relCategory = 'cardiovascular';
        distractorCategory = 'respiratory';
        break;
      case 7:
        category = 'multilingual';
        lang = i % 2 === 0 ? 'hi' : 'ta';
        query = lang === 'hi' ? 'खाना खाने के बाद पेट में जलन' : 'சாப்பிட்ட பிறகு வயிறு எரிச்சல்';
        relContent = 'Postprandial epigastric burning pain';
        distractorContent = 'Knee joint pain after walking';
        relCategory = 'gastrointestinal';
        distractorCategory = 'musculoskeletal';
        break;
      case 8:
        category = 'cross_language';
        lang = 'hi';
        query = 'खाना खाने के बाद पेट में बहुत जलन होती है';
        relContent = 'Epigastric burning discomfort following meal consumption';
        distractorContent = 'Patient complains of chronic low back pain';
        relCategory = 'gastrointestinal';
        distractorCategory = 'musculoskeletal';
        break;
    }

    const relRec: ClinicalRecordCandidate = {
      id: `rel_${i}`,
      patientId: PATIENT_ID,
      sessionId: `ses_stress_${i}`,
      sourceType: 'document',
      recordDate: '2025-05-10',
      clinicalCategory: relCategory,
      content: relContent,
      temporalStatus: category === 'temporal' ? 'current' : 'historical',
    };

    const distRec: ClinicalRecordCandidate = {
      id: `dist_${i}`,
      patientId: PATIENT_ID,
      sessionId: `ses_stress_${i}`,
      sourceType: 'patient',
      recordDate: '2023-01-01',
      clinicalCategory: distractorCategory,
      content: distractorContent,
      temporalStatus: 'resolved',
    };

    cases.push({
      id: `STRESS-${i + 1}`,
      patientId: PATIENT_ID,
      category,
      lang,
      query,
      relevantRecords: [relRec],
      irrelevantRecords: [distRec],
      subset,
    });
  }

  return cases;
}

export async function runStressBenchmarkSuite() {
  console.log('===========================================================');
  console.log('PHASE 26B BENCHMARK — 600-CASE CLINICAL RETRIEVAL STRESS SUITE');
  console.log('===========================================================\n');

  const suite = generateStressBenchmarkSuite();
  const testSet = suite.filter(c => c.subset === 'test');
  const providers = ['feature_hash', 'neural', 'lexical', 'hybrid'] as const;

  for (const prov of providers) {
    let p1Hits = 0;
    let p3Hits = 0;
    let totalMRR = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    const categoryStats: Record<string, { total: number; p1: number }> = {};

    const startTime = Date.now();
    const initialMem = process.memoryUsage().heapUsed / 1024 / 1024;

    for (const testCase of testSet) {
      if (!categoryStats[testCase.category]) {
        categoryStats[testCase.category] = { total: 0, p1: 0 };
      }
      categoryStats[testCase.category].total++;

      const candidates = [...testCase.relevantRecords, ...testCase.irrelevantRecords];
      const result = await HybridClinicalRetrievalEngine.retrieveRelevantHistory(
        testCase.query,
        testCase.patientId,
        candidates,
        prov,
        testCase.lang
      );

      const returnedIds = result.records.map(r => r.id);
      const relIds = new Set(testCase.relevantRecords.map(r => r.id));

      if (returnedIds.length > 0) {
        if (relIds.has(returnedIds[0])) {
          p1Hits++;
          categoryStats[testCase.category].p1++;
        } else {
          falsePositives++;
        }
      } else {
        falseNegatives++;
      }

      if (returnedIds.slice(0, 3).some(id => relIds.has(id))) {
        p3Hits++;
      }

      const rank = returnedIds.findIndex(id => relIds.has(id));
      if (rank !== -1) {
        totalMRR += 1.0 / (rank + 1);
      }
    }

    const durationMs = Date.now() - startTime;
    const finalMem = process.memoryUsage().heapUsed / 1024 / 1024;
    const totalCount = testSet.length;

    console.log(`Provider: [${prov.toUpperCase()}] (Held-Out Test Set: ${totalCount} cases)`);
    console.log(`  - Precision@1: ${((p1Hits / totalCount) * 100).toFixed(1)}%`);
    console.log(`  - Precision@3: ${((p3Hits / totalCount) * 100).toFixed(1)}%`);
    console.log(`  - Mean Reciprocal Rank (MRR): ${(totalMRR / totalCount).toFixed(3)}`);
    console.log(`  - False Positive Rate: ${((falsePositives / totalCount) * 100).toFixed(1)}%`);
    console.log(`  - False Negative Rate: ${((falseNegatives / totalCount) * 100).toFixed(1)}%`);
    console.log(`  - Latency: ${durationMs} ms (${(durationMs / totalCount).toFixed(2)} ms / query)`);
    console.log(`  - Heap Memory Footprint: ${(finalMem - initialMem).toFixed(2)} MB`);
    
    console.log(`  - Category Breakdown (P@1):`);
    Object.keys(categoryStats).forEach(cat => {
      const cData = categoryStats[cat];
      console.log(`      * ${cat}: ${((cData.p1 / cData.total) * 100).toFixed(1)}% (${cData.p1}/${cData.total})`);
    });

    console.log(`-----------------------------------------------------------`);
  }

  console.log('===========================================================');
}

runStressBenchmarkSuite().catch(console.error);
