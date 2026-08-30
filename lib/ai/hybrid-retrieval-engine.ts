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
    semantic: 0.45,
    lexical: 0.25,
    category: 0.15,
    temporal: 0.15,
  };

  /**
   * Executes multi-stage hybrid clinical retrieval with patient scoping, category filtering, and reranking.
   */
  public static async retrieveRelevantHistory(
    queryText: string,
    patientId: string,
    candidateRecords: ClinicalRecordCandidate[],
    providerType: 'hybrid' | 'neural' | 'feature_hash' | 'lexical' = 'hybrid',
    language: 'en' | 'hi' | 'ta' = 'en'
  ): Promise<HybridRetrievalResult> {
    const startTime = Date.now();

    // 1. Strict Patient Authorization Isolation Pre-filter
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

    // 2. Local Clinical NLP Concept Extraction
    const queryFacts = LocalClinicalNLP.extractFacts(queryText, language);
    const primarySymptom = queryFacts.primarySymptom || queryText;

    // 3. Query Embedding Generation
    const queryEmbed = await LocalNeuralEmbeddingsEngine.generateEmbedding(queryText);

    // 4. Candidate Scoring & Reranking
    const scoredRecords: HybridScoredRecord[] = await Promise.all(
      scopedRecords.map(async record => {
        // A. Semantic Distance
        const recEmbed = await LocalNeuralEmbeddingsEngine.generateEmbedding(record.content);
        const semanticScore = LocalNeuralEmbeddingsEngine.cosineSimilarity(queryEmbed.vector, recEmbed.vector);

        // B. Lexical Match
        const lexicalScore = this.computeLexicalSimilarity(queryText, record.content, language);

        // C. Category Match
        const categoryScore = this.computeCategoryMatch(primarySymptom, record.clinicalCategory);

        // D. Temporal Score
        const temporalScore = record.temporalStatus === 'historical' || record.temporalStatus === 'resolved' ? 1.0 : 0.6;

        // E. Hybrid Weight Calculation
        let hybridScore = 0;
        if (providerType === 'neural') {
          hybridScore = semanticScore;
        } else if (providerType === 'feature_hash') {
          const hashVecQ = LocalEmbeddingsEngine.generateEmbedding(queryText);
          const hashVecR = LocalEmbeddingsEngine.generateEmbedding(record.content);
          hybridScore = LocalEmbeddingsEngine.cosineSimilarity(hashVecQ, hashVecR);
        } else if (providerType === 'lexical') {
          hybridScore = lexicalScore;
        } else {
          // Full Hybrid
          hybridScore =
            this.DEFAULT_WEIGHTS.semantic * semanticScore +
            this.DEFAULT_WEIGHTS.lexical * lexicalScore +
            this.DEFAULT_WEIGHTS.category * categoryScore +
            this.DEFAULT_WEIGHTS.temporal * temporalScore;
        }

        // F. Deterministic Relevance Filter
        const relevanceDecision = this.applyDeterministicRelevanceFilter(primarySymptom, record.clinicalCategory, hybridScore, providerType);

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

    // 5. Rerank Candidates by Hybrid Score
    scoredRecords.sort((a, b) => b.hybridScore - a.hybridScore);

    // 6. Filter by Deterministic Inclusion Rules (Top 5 included)
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

    // Direct overlap check
    const wordsA = new Set(normA.split(/\s+/).filter(w => w.length > 2));
    const wordsB = new Set(normB.split(/\s+/).filter(w => w.length > 2));

    let overlap = 0;
    wordsA.forEach(w => {
      if (wordsB.has(w) || normB.includes(w)) overlap++;
    });

    // Medical Concept Synonyms
    if (
      (normA.includes('stomach') || normA.includes('pet') || normA.includes('पेट') || normA.includes('வயிறு')) &&
      (normB.includes('gastritis') || normB.includes('epigastric') || normB.includes('gi') || normB.includes('stomach'))
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

  private static computeCategoryMatch(symptom: string, category: string): number {
    const sLower = symptom.toLowerCase();
    if (sLower.includes('stomach') || sLower.includes('abdominal') || sLower.includes('vomiting') || sLower.includes('nausea') || sLower.includes('gastric')) {
      return category === 'gastrointestinal' ? 1.0 : 0.1;
    }
    if (sLower.includes('chest') || sLower.includes('heart') || sLower.includes('angina')) {
      return category === 'cardiovascular' ? 1.0 : 0.1;
    }
    if (sLower.includes('breath') || sLower.includes('cough') || sLower.includes('asthma')) {
      return category === 'respiratory' ? 1.0 : 0.1;
    }
    if (sLower.includes('headache') || sLower.includes('dizziness')) {
      return category === 'neurological' ? 1.0 : 0.1;
    }
    return 0.5;
  }

  private static applyDeterministicRelevanceFilter(
    symptom: string,
    category: string,
    score: number,
    providerType: string
  ): 'included' | 'excluded' {
    const categoryMatchScore = this.computeCategoryMatch(symptom, category);
    
    // Explicit exclusion if category mismatch is severe
    if (categoryMatchScore < 0.2 && score < 0.4) {
      return 'excluded';
    }

    const threshold = providerType === 'hybrid' ? 0.25 : providerType === 'neural' ? 0.15 : providerType === 'feature_hash' ? 0.15 : 0.10;
    return score >= threshold ? 'included' : 'excluded';
  }
}
