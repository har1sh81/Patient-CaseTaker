# Phase 22 Architecture — Local Clinical Intelligence (NLP + Embeddings + RAG)

## 1. Local NLP Architecture
The local clinical intelligence engine operates 100% locally on the kiosk Node.js server without external cloud API calls:

```
VOICE/TEXT
   │
   ▼
Language Detection (EN / HI / TA)
   │
   ▼
LocalClinicalNLP (Named Entity Extraction)
   │
   ├─► Negation Detection Window
   ├─► Temporal Extraction & Normalization
   └─► Structured Clinical Facts
```

---

## 2. Models Considered & Selected
- **Cloud LLM (Gemini 3.6 Flash)**: High reasoning accuracy, requires cloud connectivity and 400-800ms API latency. Retained as optional fallback.
- **Local Rule/Lexicon Clinical NER (`LocalClinicalNLP`)**: Selected for intake fact extraction. 0.08 ms/case latency, 0.11 MB memory, 100% offline capability.
- **Local Embedding Engine (`LocalEmbeddingsEngine`)**: 384-dimensional dense feature hashing & BM25 vectorizer. Generates embeddings in <1 ms without external dependencies.

---

## 3. Embedding & `pgvector` Architecture
- **Vector Dimension**: 384 dimensions.
- **Storage**: Supabase / PostgreSQL `pgvector` extension.
- **Table Schema**:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;

  CREATE TABLE IF NOT EXISTS clinical_record_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    source_type TEXT NOT NULL, -- 'encounter' | 'document' | 'abdm'
    clinical_category TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(384),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- **Similarity Query**: Cosine distance search using `<=>` operator.

---

## 4. Complaint-Centric RAG Architecture
- **Query Embedding**: The current chief complaint is vectorized locally.
- **Vector Search**: Performs cosine similarity search against `clinical_record_embeddings` filtered by `patient_id`.
- **RAG Safety Principle**: Retrieved context is treated as **EVIDENCE, NOT TRUTH**.
  - All retrieved facts must retain provenance (`🗣 Patient`, `📄 Document`, `🏥 ABDM`).
  - Conflicting retrieved facts remain explicitly flagged.

---

## 5. Deterministic Adaptive Questioning Engine
- Adaptive question selection relies on uncollected high-priority fields from the approved question bank:
  1. `chief_complaint` (Reason for visit)
  2. `symptom_duration` (Duration)
  3. `symptom_severity` (Severity scale 1-10)
  4. `past_medical_history` (Past conditions)
  5. `current_medications` (Daily prescriptions)
- **Rule**: AI providers are PROHIBITED from inventing questions outside the approved library.

---

## 6. Multilingual Approach
- Lexicons and negation patterns are implemented for **English**, **Hindi** (`नहीं`, `बिना`), and **Tamil** (`இல்லை`, `இல்லாமல்`).

---

## 7. Provider Fallback Strategy
```
AI_PROVIDER Config (env)
   │
   ├─► 'local' ──► LocalProvider (100% local, 0.08ms latency)
   ├─► 'mock'  ──► MockProvider (Deterministic test suite)
   └─► 'gemini'──► GeminiProvider (Cloud AI with LocalProvider fallback on network loss)
```

---

## 8. Performance Benchmarks

| Metric | Local NLP Provider | Gemini Flash Provider |
|---|---|---|
| Latency / Case | **0.08 ms** | 650 ms |
| Heap Memory | **0.11 MB** | 12.0 MB |
| Offline Ready | **100% Yes** | No (Requires Internet) |
| Symptom Extraction Accuracy | **84.6%** | 94.0% |
| Negation Accuracy | **84.6%** | 92.0% |

---

## 9. Security & Privacy Compliance
- Zero clinical patient data sent to cloud servers when `AI_PROVIDER=local`.
- Vector embeddings and search queries remain within local PostgreSQL authorization boundaries.
