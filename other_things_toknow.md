That's an important distinction: Antigravity does not automatically "make AI models." It can build your application and connect it to AI services/models.

For MediKiosk, you should use different AI components for different jobs, not try to train one giant model.

How the architecture should work
                         MEDIKIOSK
                             │
         ┌───────────────────┼────────────────────┐
         │                   │                    │
         ▼                   ▼                    ▼
   PATIENT VOICE        MEDICAL DOCUMENT       DOCTOR PORTAL
         │                   │                    │
         ▼                   ▼                    ▼
   Speech-to-Text          OCR Engine        AI Summary
         │                   │                    │
         └──────────────┐    │    ┌──────────────┘
                        ▼    ▼    ▼
                     AI SERVICES
                        │
          ┌─────────────┼──────────────┐
          ▼             ▼              ▼
    Conversation     Extraction     Structuring
       AI              AI              AI
          │             │              │
          └─────────────┴──────────────┘
                        │
                        ▼
              Structured Clinical Data
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
        Rule Engine          AI Summary
       (Red Flags)          (Draft Only)
What Antigravity actually does

You tell Antigravity:

"Create an AI provider layer that can call an LLM API. Do not hard-code a specific provider."

Then it builds something like:

lib/
└── ai/
    ├── provider.ts
    ├── conversation.ts
    ├── clinical-history.ts
    ├── document-extraction.ts
    └── summary.ts

Your app then calls an AI model through an API.

Example
Patient says:
"I've had a headache for two days."
        ↓
Speech-to-Text
        ↓
Text sent to LLM API
        ↓
AI returns structured data:
{
  "chiefComplaint": "headache",
  "duration": "2 days",
  "missingInformation": [
    "severity",
    "associatedSymptoms"
  ],
  "nextQuestion": "How severe is the headache?"
}
        ↓
MediKiosk asks the next question

The LLM is the intelligence. Antigravity writes the application code that uses that intelligence.

Exact AI technologies MediKiosk needs
1. Main LLM — Conversation + Understanding

Used for:

Understanding what the patient says
Extracting the chief complaint
Structuring answers
Selecting the next relevant question
Detecting missing information
Generating the draft summary
Extracting structured information from OCR text
You do not train this model.

You use an existing LLM through an API.

Architecture:

MediKiosk
    ↓
AI Provider Layer
    ↓
LLM API
    ↓
Structured JSON Response

Possible providers/models can be swapped later. Antigravity should build this as a configurable provider layer.

2. Speech-to-Text AI

Used for:

Patient speaks Tamil
        ↓
Speech Recognition
        ↓
Tamil Text
        ↓
Conversation AI

This is a separate model/service from the main LLM.

Antigravity can implement the microphone UI and integration.

3. Text-to-Speech AI

Used for:

AI generates question
        ↓
Text-to-Speech
        ↓
Patient hears question

Again, Antigravity integrates the service; it doesn't need to train a voice model.

4. OCR AI

Used for:

Prescription / Lab Report
          ↓
OCR Service
          ↓
Extracted Text
          ↓
LLM Clinical Extraction
          ↓
Structured Data

This is how document processing works.

The most important part: don't let the AI return random text

Antigravity should make the AI return validated structured JSON.

For example, the conversation engine can require:

{
  "understood_answer": "Patient reports headache for two days",
  "extracted_information": {
    "chiefComplaint": "Headache",
    "duration": "2 days"
  },
  "missing_fields": [
    "severity",
    "location",
    "associatedSymptoms"
  ],
  "next_question": {
    "id": "hpi_severity",
    "question": "How severe is the headache?",
    "input_type": "scale"
  }
}

Then your app validates it:

AI Response
    ↓
JSON Validation
    ↓
Valid?
 ┌───────┴────────┐
 YES              NO
 ↓                 ↓
Continue      Retry / Fallback

This is much better than simply giving an AI chatbot free control.

How we build this phase by phase
Phase 5 — Voice infrastructure

Antigravity builds:

Microphone
Speech-to-Text abstraction
Text-to-Speech abstraction
Language settings
Phase 6 — Conversation infrastructure

Antigravity builds:

Question state
Answer storage
Conversation state
Question pathways

No advanced AI yet.

Phase 7 — AI integration

This is where Antigravity actually connects the application to an LLM:

AI Provider
     ↓
API Key from .env
     ↓
LLM API Call
     ↓
Structured JSON
     ↓
Validation
     ↓
Conversation Engine
Phase 13 — OCR integration
Document
   ↓
OCR API/service
   ↓
Raw text
Phase 14 — AI document intelligence
Raw OCR text
      ↓
LLM
      ↓
Diagnoses
Medicines
Dates
Tests
Procedures
Phase 18 — AI summary
All structured data
       ↓
LLM
       ↓
Physician-ready draft
       ↓
Doctor verification
The key point

Your project is not:

Antigravity → magically creates one MediKiosk AI model.

It is:

Antigravity → builds the complete software → connects specialized AI services → validates their outputs → combines them into one workflow.

For your prototype, you should not train your own medical AI model. That would be unnecessarily difficult and risky for a hackathon prototype. Build a strong system around existing AI models, structured outputs, deterministic safety rules, and human verification.

------
What is still missing / needs to be confirmed
1. Exact tech stack

Lock this down explicitly:

Frontend: Next.js + TypeScript
Styling: Tailwind CSS
UI Components: shadcn/ui
Validation: Zod
State Management: Zustand
Backend/API: Next.js Route Handlers
Database: Supabase PostgreSQL
Authentication: Prototype kiosk session-based flow
Storage: Supabase Storage
AI: Gemini API behind an AIProvider abstraction
OCR: Provider abstraction + mock fallback
Speech-to-Text: Provider abstraction + browser/demo fallback
Text-to-Speech: Browser Speech Synthesis API initially
QR Code: qrcode library
Printing: Browser window.print() + dedicated print CSS
Icons: Lucide React
Testing: Vitest + basic component/integration tests
Deployment: Vercel

The important part is that Antigravity must not randomly change technologies halfway through development.

2. Real prototype vs demo fallback behavior

This is very important for a hackathon.

Every external dependency should have:

REAL MODE
    ↓
Supabase / Gemini / OCR / Speech API

IF UNAVAILABLE
    ↓
MOCK / DEMO FALLBACK
    ↓
PROJECT MUST STILL WORK

For example:

AI Provider unavailable
        ↓
Use deterministic question routing

OCR unavailable
        ↓
Use demo OCR text / manual extraction simulation

Supabase unavailable
        ↓
Use local mock repository

Speech unavailable
        ↓
Allow touch/text input

The prototype must never completely break because an API key or internet service fails.

3. Environment variable contract

You should define this before implementation:

NEXT_PUBLIC_APP_ENV

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY

GEMINI_API_KEY

AI_PROVIDER
OCR_PROVIDER
STORAGE_PROVIDER

DEMO_MODE_ENABLED
MOCK_SERVICES_ENABLED

And require:

Never expose server-side API keys to the browser.
Never hardcode secrets.
Provide .env.example.
4. Database schema and migration contract

You have data contracts, but you also need the actual mapping:

Zod Contract
      ↓
TypeScript Type
      ↓
Supabase Table
      ↓
Repository
      ↓
Service

For example:

patients
consents
intake_sessions
conversation_messages
conversation_answers
medical_documents
document_extractions
clinical_histories
attention_flags
patient_corrections
clinical_reports
audit_logs

Add:

SQL migrations
Foreign keys
Indexes
Row Level Security strategy
Storage bucket configuration
5. API endpoint request/response contracts

You listed routes, but Antigravity should create explicit contracts for:

Request Schema
Response Schema
Error Schema
Authentication / session requirements
Validation
Fallback behavior

For example:

POST /api/sessions

Request:
{
  patientId,
  language,
  departmentMode
}

Response:
{
  success,
  data: IntakeSession
}

Every route should have this clearly defined.

6. State persistence and recovery

What happens if the kiosk browser refreshes halfway through?

Define:

Page refresh
    ↓
Restore active session

Temporary network failure
    ↓
Queue locally and retry

AI request failure
    ↓
Retry → fallback to static question engine

User exits
    ↓
Confirm cancellation → cleanup session

This should be added as a proper requirement.

7. Exact report layout specification

Since the physical paper is the main output, this deserves its own specification.

Define exactly:

Page 1
Hospital / MediKiosk Header
Report Reference Number
QR Code

Patient Identification

Chief Complaint

History of Present Illness

Important Alerts / Attention Flags
Page 2
Past Medical History
Past Surgical History
Medications
Allergies
Family History
Personal / Social History
Review of Systems
Previous Investigations
Medical Timeline
AYUSH Section if applicable

Physician Corrections / Notes

Physician Signature
Date / Time
Final Confirmation

And:

Target: A4
Orientation: Portrait
Target length: 1–2 pages
Print-safe margins
Grayscale-safe
No background-dependent information
No clipped text
No horizontal overflow
8. Error and failure matrix

Add a single table/JSON configuration defining:

Situation                  System Behavior

No internet                Continue demo/mock mode
AI fails                   Use static question routing
OCR fails                  Mark document for review
Speech recognition fails   Use touch/text input
Print dialog cancelled     Return to print preview
Session timeout            Confirm/end session and cleanup
Invalid AI JSON            Reject response and fallback
Database fails             Use mock/local repository

This is especially useful for the demo.

9. Demo script contract

You have demo scenarios, but also define the exact 5-minute demonstration flow:

0:00 — Start MediKiosk
0:20 — Select language
0:40 — Patient identification
1:00 — Consent
1:20 — Voice-based adaptive questioning
2:20 — Upload previous document
2:50 — OCR/document extraction
3:20 — Attention flag shown
3:40 — Patient review/correction
4:10 — Report generation
4:30 — QR generation
4:40 — Print preview
5:00 — Physical report output

This ensures your prototype demonstrates the innovation instead of spending 5 minutes filling forms.

My recommendation: send this final message to Antigravity
Before beginning implementation, do not start Phase 0.1 yet.

First, review the complete MediKiosk project specification and confirm the following implementation decisions.

1. Use one fixed technology stack throughout the project. Do not substitute frameworks or libraries without asking for approval.

2. Every external dependency must have a fallback so the prototype remains functional during a hackathon demo:
   - Supabase → mock/local repository fallback
   - AI provider → deterministic question engine fallback
   - OCR provider → mock/demo extraction fallback
   - Speech recognition → touch/text fallback
   - Printing failure/cancellation → return safely to print preview

3. Create an .env.example and never expose secret API keys in client-side code.

4. Create an explicit database-to-contract mapping including SQL migrations, relationships, foreign keys, indexes, storage configuration, and appropriate security rules.

5. Define request and response Zod contracts for every API endpoint. Every API response must use the standard ApiResponse<T> format.

6. Implement session persistence and recovery for page refreshes and temporary failures. Define safe behavior for session timeout, cancellation, retries, and cleanup.

7. Treat the physical A4 printed clinical history report as the primary product output. Create a dedicated report layout specification and print validation rules:
   - A4 portrait
   - Target 1–2 pages
   - Print-safe margins
   - Grayscale compatible
   - No clipping or horizontal overflow
   - QR/reference identifier
   - Physician notes area
   - Physician signature area
   - Physician verification statement

8. Create a centralized error and fallback behavior matrix for all critical failure scenarios.

9. Create an exact demo execution contract for the standard, priority/attention-flag, and AYUSH scenarios so each can reliably demonstrate the complete workflow.

10. The architecture must follow this hierarchy:

   Zod Schema
      ↓
   Inferred TypeScript Type
      ↓
   API Request/Response Validation
      ↓
   Repository
      ↓
   Service
      ↓
   UI
      ↓
   Final ClinicalHistoryReport
      ↓
   A4 Physical Print Output

After reviewing and confirming these requirements, present the final implementation readiness checklist.

DO NOT START ANY IMPLEMENTATION.

DO NOT CREATE OR MODIFY FILES.

STOP and wait for my approval.