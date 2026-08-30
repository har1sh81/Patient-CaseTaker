# MediKiosk — SIH Presentation Technical Facts & Claims

## 1. Verified System Classifications

> [!IMPORTANT]
> **Strict System Boundaries:**
> - **LOCAL INTELLIGENCE (`LOCAL`)**: Local Clinical NLP (`LocalClinicalNLP`), Local Neural Semantic Embeddings (`all-MiniLM-L6-v2`), Multi-Stage Hybrid Retrieval Engine (`HybridClinicalRetrievalEngine`), Deterministic Report Composer, Server-Side WinAnsi PDF Generator.
> - **BROWSER-MANAGED (`BROWSER`)**: Multilingual Speech Recognition & TTS (Chromium Web Speech API in browser memory; zero raw audio saved).
> - **CLOUD DATABASE (`CLOUD`)**: Hosted Supabase PostgreSQL & pgvector (`*.supabase.co`).
> - **DEMO / MOCK INTEGRATIONS (`MOCK`)**: ABDM M1/M2 Gateway & Hospital Information System (HIS) Export.

---

## 2. Empirical Benchmark Metrics

| Benchmark Component | Test Suite Size | Metric | Result | Classification |
|---|---|---|---|---|
| **Local Clinical NLP** | 150 Synthetic Cases | Combined F1 Score (EN, HI, TA) | **99.2% F1** | Prototype Benchmark |
| **Multilingual Voice ASR** | 60 Synthetic Transcripts | Entity & Status Preservation | **96.7% Accuracy** | Prototype Benchmark |
| **Hybrid Retrieval Stress** | 600 Synthetic Cases | Precision@1 | **100.0% P@1 (MRR 1.000)** | Prototype Benchmark |
| **Browser E2E Suite** | 7 Playwright Tests | Success Rate | **7 / 7 PASSED (8.3s)** | Automated E2E |
| **Local Integration** | 50 E2E Journeys | Journey Completion Rate | **50 / 50 PASSED (0 Gemini Calls)** | Automated Integration |
| **Report Integrity** | Full Audit | Schema & Snapshot Equivalence | **0 Discrepancies** | Automated Audit |
| **Security Audit** | 5 Attack Scenarios | Attack Rejection Rate | **5 / 5 PASSED** | Security Audit |
| **FHIR Interoperability** | 5 Export Scenarios | Bundle Validation & Handoff | **5 / 5 PASSED** | Interoperability Test |

---

## 3. Approved Presentation Phrases

### DO SAY:
- *"MediKiosk executes clinical NLP, neural vector embeddings, hybrid RAG retrieval, report composition, and PDF generation 100% locally in Node.js/browser memory."*
- *"Speech recognition is managed natively by the client browser via Web Speech API with zero raw audio stored on any server."*
- *"Historical medical record retrieval combines neural semantic vectors (`all-MiniLM-L6-v2`), lexical keyword matching, clinical category filtering, and temporal status scoring."*
- *"Interoperability is demonstrated via a HL7 FHIR R4 Collection Bundle validator connected to mock ABDM and Hospital EMR endpoints."*

### DO NOT SAY:
- ❌ *"The application is 100% offline"* (False: Database queries persist to cloud-hosted Supabase PostgreSQL).
- ❌ *"We have live production ABDM integration"* (False: ABDM and Hospital EMR connectors are explicitly DEMO / MOCK stubs).
- ❌ *"Hybrid retrieval is 100% clinically certified"* (False: Results reflect synthetic prototype benchmark evaluation).
