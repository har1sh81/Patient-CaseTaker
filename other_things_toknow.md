# Essential AI & Integration Details (Print-Focused)

The core purpose of the AI components in MediKiosk is not to act as an autonomous doctor, but to act as a **clinical summarizer and information organizer** that transforms speech, touch, and scanned paper inputs into a high-fidelity physical printed report.

## How the AI Pipeline Works

```text
                        MEDIKIOSK SCREEN
                               │
         ┌─────────────────────┴─────────────────────┐
         ▼                                           ▼
   PATIENT VOICE                              MEDICAL DOCUMENT
         │                                           │
         ▼                                           ▼
   Speech-to-Text                              OCR Scan Text
         │                                           │
         └─────────────┐                       ┌─────┘
                       ▼                       ▼
                    ┌─────────────────────────────┐
                    │      AI SERVICE LAYER       │
                    │   Parse, Translate, Align   │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │   STRUCTURED MEDICAL JSON   │
                    │  HPI, Meds, Timeline, Flags │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │    PRINTED REPORT ENGINE    │
                    │   Standardized Physical Doc │
                    └─────────────────────────────┘
```

## AI Responsibilities in the Pipeline

### 1. Conversation & Context Collector
- When the patient speaks, the Speech-to-Text engine produces transcripts.
- These transcripts are sent to the LLM.
- The LLM parses the text, extracts symptoms, and identifies missing clinical parameters (such as severity or onset).
- The LLM returns a structured JSON outlining the next question to read aloud to the patient.

### 2. Document Entity Extractor
- Extracted raw text from document OCR is fed into the LLM.
- The LLM identifies:
  - Prescribed drugs (names, dosages, frequency).
  - Diagnostic values (blood panels, glucose levels) and out-of-range indicators.
  - Previous diagnoses and procedures to map to the chronological timeline.

### 3. Report Compiler
- Combines the structured conversation history and structured document timeline into a single, clean print-optimized template.
- Generates a PDF/web-print layout ready for clinician consultation.

---

## Safety: Predefined Rule Validation

The LLM structures information but does **not** evaluate risk scores. Structured variables are run against a deterministic rule engine:
- If `symptom` contains `"chest pain"`, a critical alert banner is immediately appended to the header of the printed report.
- If `diastolic_blood_pressure` >= `110`, an emergency warning is flagged in the vitals section of the report.

This ensures safety-critical escalations are based on predictable medical guidelines rather than generative AI probabilities.
