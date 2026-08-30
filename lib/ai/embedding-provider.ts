import { LocalNeuralEmbeddingsEngine, EmbeddingResult } from './local-neural-embeddings';
import { LocalEmbeddingsEngine } from './local-embeddings';

export interface IEmbeddingProvider {
  embed(text: string): Promise<EmbeddingResult>;
  embedBatch(texts: string[]): Promise<EmbeddingResult[]>;
  similarity(vecA: number[], vecB: number[]): number;
}

export class NeuralEmbeddingProvider implements IEmbeddingProvider {
  async embed(text: string): Promise<EmbeddingResult> {
    return LocalNeuralEmbeddingsEngine.generateEmbedding(text);
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    return LocalNeuralEmbeddingsEngine.generateBatchEmbeddings(texts);
  }

  similarity(vecA: number[], vecB: number[]): number {
    return LocalNeuralEmbeddingsEngine.cosineSimilarity(vecA, vecB);
  }
}

export class FeatureHashEmbeddingProvider implements IEmbeddingProvider {
  async embed(text: string): Promise<EmbeddingResult> {
    const startTime = Date.now();
    const vector = LocalEmbeddingsEngine.generateEmbedding(text);
    return {
      vector,
      dimensions: 384,
      modelIdentifier: 'feature-hashing-v1',
      version: 'v1',
      inferenceTimeMs: Date.now() - startTime,
    };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    return Promise.all(texts.map(t => this.embed(t)));
  }

  similarity(vecA: number[], vecB: number[]): number {
    return LocalEmbeddingsEngine.cosineSimilarity(vecA, vecB);
  }
}

export function getEmbeddingProvider(): IEmbeddingProvider {
  const providerType = (process.env.EMBEDDING_PROVIDER || 'neural').toLowerCase();

  if (providerType === 'feature_hash') {
    return new FeatureHashEmbeddingProvider();
  }

  return new NeuralEmbeddingProvider();
}
