# Adaptive Questioning Architecture (Phase 33)

## Overview
MediKiosk implements a **Hybrid Adaptive Questioning Architecture** that decouples clinical fact extraction from question selection reasoning:

1. **Clinical Fact Extraction**: Performed 100% locally by `LocalClinicalNLP`. Clinical facts (symptoms, duration, severity, location, character, aggravating/relieving factors, negated symptoms, medications) are extracted locally without cloud dependence.
2. **9-Domain Coverage Engine**: Evaluates current problem completeness across 9 mandatory domains (`chief_complaint`, `onset_duration`, `location`, `character_quality`, `severity`, `progression`, `aggravating_relieving`, `associated_symptoms`, `previous_treatments`).
3. **Question Selection Reasoning**: Handled via `QUESTION_SELECTION_PROVIDER`:
   - `local` (Default): Uses 100% deterministic domain-priority logic. 0 external cloud calls.
   - `gemini` (Optional): Receives structured facts, missing domains, and an approved candidate list. Returns ONLY an approved `questionId`.
4. **Approved Question Library**: All patient-facing text comes from `lib/conversation/question-library.ts` (`PHASE6_DEMO_QUESTIONS` or `PHASE13_AYUSH_QUESTIONS`) in supported languages (`en`, `hi`, `ta`).

---

## Configuration

```env
# Fact Extraction is always local
FACT_EXTRACTION_PROVIDER=local

# Question Selection provider: 'local' (0 cloud calls) or 'gemini'
QUESTION_SELECTION_PROVIDER=local

# Neural embeddings & hybrid retrieval
EMBEDDING_PROVIDER=neural
RETRIEVAL_PROVIDER=hybrid
```

---

## Data Flow Diagram

```
                 PATIENT
                    │
              Voice / Text
                    │
               Local ASR*
                    │
             LOCAL CLINICAL NLP
                    │
          Structured Clinical Facts
                    │
           9-Domain Coverage Engine
                    │
         ┌──────────┴──────────┐
         │                     │
   Facts complete         Facts missing
         │                     │
         │             Gemini (optional)
         │                     │
         │              Next Question ID
         │                     │
         │             Approved Question
         │                     │
         └──────────────┬──────┘
                        │
                  Patient response
                        │
                 Local NLP again
                        │
            Local Embeddings + Hybrid RAG
                        │
             Deterministic Safety
                        │
          Clinical Consultation Summary
                        │
                 Patient Review
                        │
                  Patient Confirm
                        │
                       PDF
                        │
                Doctor Dashboard
```

---

## Security, Privacy & Guardrails
- **No Cloud Fact Storage**: Gemini does NOT store, alter, or synthesize patient clinical records.
- **Privacy Minimum Footprint**: When Gemini mode is enabled, only minimal structured fact fields and missing domain keys are sent (0 PII, 0 raw database dumps).
- **Allowlist Enforcement**: Gemini responses are strictly schema-validated and checked against local candidate lists. If Gemini returns an invalid ID or fails, the engine falls back to deterministic local selection.
- **Zero Free-Form Text Generation**: Gemini cannot render text to the patient. All wording is loaded from the localized `question-library.ts`.
