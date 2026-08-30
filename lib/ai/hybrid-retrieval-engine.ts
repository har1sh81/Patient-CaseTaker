import { LocalNeuralEmbeddingsEngine } from './local-neural-embeddings';
import { LocalEmbeddingsEngine } from './local-embeddings';
import { LocalClinicalNLP } from './local-nlp';

export interface ClinicalRecordCandidate {
  id: string;
  patientId: string;
  sessionId: string;
  sourceType: 'patient' | 'document' | 'abdm';
  sourceId?: string;
  documentId?: string;
  recordDate: string;
  clinicalCategory: 'gastrointestinal' | 'cardiovascular' | 'respiratory' | 'neurological' | 'musculoskeletal' | 'general' | 'ayush';
  content: string;
  temporalStatus: 'current' | 'historical' | 'resolved';
}

export interface HybridScoredRecord extends ClinicalRecordCandidate {
  semanticScore: number;
  lexicalScore: number;
  categoryScore: number;
  temporalScore: number;
  hybridScore: number;
  relevanceDecision: 'included' | 'excluded';
}

export interface HybridRetrievalResult {
  records: HybridScoredRecord[];
  topCandidatesCount: number;
  finalIncludedCount: number;
  retrievalLatencyMs: number;
  providerType: 'hybrid' | 'neural' | 'feature_hash' | 'lexical';
}

export class HybridClinicalRetrievalEngine {
  public static readonly DEFAULT_WEIGHTS = {
    semantic: 0.35,
    lexical: 0.15,
    category: 0.35,
    temporal: 0.15,
  };

  public static async retrieveRelevantHistory(
    queryText: string,
    patientId: string,
    candidateRecords: ClinicalRecordCandidate[],
    providerType: 'hybrid' | 'neural' | 'feature_hash' | 'lexical' = 'hybrid',
    language: 'en' | 'hi' | 'ta' = 'en'
  ): Promise<HybridRetrievalResult> {
    const startTime = Date.now();

    const scopedRecords = candidateRecords.filter(r => r.patientId === patientId);

    if (scopedRecords.length === 0) {
      return {
        records: [],
        topCandidatesCount: 0,
        finalIncludedCount: 0,
        retrievalLatencyMs: Date.now() - startTime,
        providerType,
      };
    }

    const queryEmbed = await LocalNeuralEmbeddingsEngine.generateEmbedding(queryText);

    const scoredRecords: HybridScoredRecord[] = await Promise.all(
      scopedRecords.map(async record => {
        const recEmbed = await LocalNeuralEmbeddingsEngine.generateEmbedding(record.content);
        const semanticScore = LocalNeuralEmbeddingsEngine.cosineSimilarity(queryEmbed.vector, recEmbed.vector);
        const lexicalScore = this.computeLexicalSimilarity(queryText, record.content, language);
        const categoryScore = this.computeCategoryMatch(queryText, record.clinicalCategory);
        const temporalScore = record.temporalStatus === 'historical' || record.temporalStatus === 'resolved' ? 1.0 : 0.6;

        let hybridScore = 0;
        if (providerType === 'neural') {
          hybridScore = semanticScore * 0.7 + categoryScore * 0.3;
        } else if (providerType === 'feature_hash') {
          const hashVecQ = LocalEmbeddingsEngine.generateEmbedding(queryText);
          const hashVecR = LocalEmbeddingsEngine.generateEmbedding(record.content);
          hybridScore = LocalEmbeddingsEngine.cosineSimilarity(hashVecQ, hashVecR) * 0.7 + categoryScore * 0.3;
        } else if (providerType === 'lexical') {
          hybridScore = lexicalScore * 0.7 + categoryScore * 0.3;
        } else {
          hybridScore =
            this.DEFAULT_WEIGHTS.semantic * semanticScore +
            this.DEFAULT_WEIGHTS.lexical * lexicalScore +
            this.DEFAULT_WEIGHTS.category * categoryScore +
            this.DEFAULT_WEIGHTS.temporal * temporalScore;
        }

        const relevanceDecision = this.applyDeterministicRelevanceFilter(queryText, record.clinicalCategory, hybridScore);

        return {
          ...record,
          semanticScore,
          lexicalScore,
          categoryScore,
          temporalScore,
          hybridScore,
          relevanceDecision,
        };
      })
    );

    scoredRecords.sort((a, b) => b.hybridScore - a.hybridScore);

    const finalRecords = scoredRecords.filter(r => r.relevanceDecision === 'included').slice(0, 5);

    return {
      records: finalRecords,
      topCandidatesCount: scoredRecords.length,
      finalIncludedCount: finalRecords.length,
      retrievalLatencyMs: Date.now() - startTime,
      providerType,
    };
  }

  private static computeLexicalSimilarity(textA: string, textB: string, language: 'en' | 'hi' | 'ta' = 'en'): number {
    const normA = textA.toLowerCase();
    const normB = textB.toLowerCase();

    const wordsA = new Set(normA.split(/\s+/).filter(w => w.length > 2));
    const wordsB = new Set(normB.split(/\s+/).filter(w => w.length > 2));

    let overlap = 0;
    wordsA.forEach(w => {
      if (wordsB.has(w) || normB.includes(w)) overlap++;
    });

    if (
      (normA.includes('stomach') || normA.includes('pet') || normA.includes('पेट') || normA.includes('வயிறு') || normA.includes('abdominal') || /\beat\b/.test(normA) || /\bfood\b/.test(normA)) &&
      (normB.includes('gastritis') || normB.includes('epigastric') || normB.includes('gi') || normB.includes('stomach') || normB.includes('abdominal') || normB.includes('post-prandial') || normB.includes('postprandial'))
    ) {
      overlap += 2;
    }

    if (
      (normA.includes('breath') || normA.includes('breathing')) &&
      (normB.includes('dyspnea') || normB.includes('respiratory') || normB.includes('breath'))
    ) {
      overlap += 2;
    }

    if (
      (normA.includes('chest') || normA.includes('சீனை') || normA.includes('सीने')) &&
      (normB.includes('angina') || normB.includes('coronary') || normB.includes('chest'))
    ) {
      overlap += 2;
    }

    return Math.min(1.0, overlap / Math.max(1, wordsA.size));
  }

  private static computeCategoryMatch(text: string, category: string): number {
    const sLower = text.toLowerCase();
    if (sLower.includes('stomach') || sLower.includes('abdominal') || sLower.includes('vomiting') || sLower.includes('nausea') || sLower.includes('gastric') || /\beat\b/.test(sLower) || /\bfood\b/.test(sLower) || sLower.includes('पेट') || sLower.includes('வயிறு')) {
      return category === 'gastrointestinal' ? 1.0 : 0.1;
    }
    if (sLower.includes('chest') || sLower.includes('heart') || sLower.includes('angina') || sLower.includes('सीने') || sLower.includes('மார்பு')) {
      return category === 'cardiovascular' ? 1.0 : 0.1;
    }
    if (sLower.includes('breath') || sLower.includes('cough') || sLower.includes('asthma') || sLower.includes('dyspnea') || sLower.includes('खांसी') || sLower.includes('இருமல்')) {
      return category === 'respiratory' ? 1.0 : 0.1;
    }
    if (sLower.includes('headache') || sLower.includes('dizziness') || sLower.includes('सिरदर्द') || sLower.includes('தலைவலி')) {
      return category === 'neurological' ? 1.0 : 0.1;
    }
    return 0.5;
  }

  private static applyDeterministicRelevanceFilter(
    queryText: string,
    category: string,
    score: number
  ): 'included' | 'excluded' {
    const categoryMatchScore = this.computeCategoryMatch(queryText, category);
    
    if (categoryMatchScore <= 0.1) {
      return 'excluded';
    }

    return score > 0.01 ? 'included' : 'excluded';
  }
}
