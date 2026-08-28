# MediKiosk — Exact Technology Stack and System Architecture

## 1. Printable Report-Focused System Architecture

MediKiosk is designed as a patient-facing touchscreen kiosk that collects voice-and-touch inputs, extracts information from scanned medical records, performs safety rule checking, and outputs a printed physical clinical history report for the doctor.

```text
                               PATIENT
                                  │
                                  ▼
                        ┌───────────────────┐
                        │  MEDIKIOSK KIOSK  │
                        │    Touchscreen    │
                        └─────────┬─────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐      ┌──────────────────┐
│  VOICE + TOUCH   │    │  DOCUMENT UPLOAD │      │  PATIENT INFO    │
│  Intake Engine   │    │   OCR Pipeline   │      │  Identification  │
└────────┬─────────┘    └────────┬─────────┘      └────────┬─────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                                  ▼
                        ┌───────────────────┐
                        │   AI CORE LAYER   │
                        │ Combine & Schema  │
                        └─────────┬─────────┘
                                  │
                                  ▼
                        ┌───────────────────┐
                        │  SAFETY ENGINE    │
                        │  Red Flags Rules  │
                        └─────────┬─────────┘
                                  │
                                  ▼
                        ┌───────────────────┐
                        │  REPORT GENERATOR │
                        │  Print Optimization│
                        └─────────┬─────────┘
                                  │
                                  ▼
                        ┌───────────────────┐
                        │ PHYSICAL PRINTOUT │
                        │ (Physician Ready) │
                        └───────────────────┘
```

---

## 2. Exact Technology Stack

### Frontend

* **Next.js + TypeScript**: The main framework hosting the touchscreen kiosk and the printable report views.
* **Tailwind CSS**: Core utility classes for high-fidelity kiosk styling and print stylesheets (`print:` utilities).
* **shadcn/ui**: Accessible components (buttons, input fields, alerts, cards) for the patient interface.
* **Framer Motion**: Meaningful visual cues for recording state, upload indicators, and screen transitions.

### Backend & Database (Supabase)

* **Next.js Route Handlers**: Simple serverless endpoints hosting AI extraction, OCR pipelines, and print log audits.
* **Supabase Database (PostgreSQL)**: Stores session states, consent records, audit logs, and extracted structured metadata.
* **Supabase Storage**: Temporarily stores scanned prescriptions and reports for OCR processing.

### AI & OCR Integration

* **LLM API (e.g., Gemini)**: Orchestrates the adaptive clinical conversation and translates/structures unstructured symptoms and OCR texts into valid medical JSON schemas.
* **Speech-to-Text (STT) & Text-to-Speech (TTS)**: Web Speech API for multilingual voice intake (English, Hindi, Tamil) and question playback.
* **OCR Service Abstraction**: Converts scanned report images or PDFs into plain text before structuring.

---

## 3. Printable Intake Workflow

```text
PATIENT
   │
   ▼
MediKiosk Touchscreen (Selects English, Hindi, or Tamil)
   │
   ▼
Patient Identification & Consent Confirmation
   │
   ▼
Voice + Touch Interview (Adaptive clinical questions driven by AI)
   │
   ▼
Previous Medical Documents Scanned/Uploaded
   │
   ▼
OCR + AI Clinical Entity Extraction
   │
   ▼
Patient Review & Confirmation (Correct on-screen errors)
   │
   ▼
Information Combination & Red-Flag Checks
   │
   ▼
Print Physical Clinical History Report
   │
   ▼
Patient takes paper report to Doctor for Consultation
```

---

## 4. Database Core Entities

* **patients**: Patient identification profile (simulated ABHA IDs, mobile numbers).
* **intake_sessions**: Unique intake session ID, selected language, and consent confirmation status.
* **conversation_messages**: Text transcription of patient speech responses and generated questions.
* **medical_documents**: Metadata and GCS/Supabase path to uploaded lab files or prescriptions.
* **clinical_histories**: Unified structured clinical findings (chief complaint, HPI, medications, allergies, AYUSH metrics, and red flags).
* **audit_logs**: Session logs tracking consent signatures, printing time, and session teardowns.
