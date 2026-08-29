# MediKiosk — Product Requirements Document (PRD)

**Version:** 1.0
**Product Type:** AI-Powered Clinical History and Pre-Consultation Software Platform
**Platform:** Patient Kiosk + Doctor Portal + Triage Portal + Admin/Demo Portal
**Development Approach:** Entire prototype built using Antigravity

---

## 1. Product Overview

### 1.1 Product Name

**MediKiosk**

### 1.2 One-Line Description

**MediKiosk is an AI-powered, multilingual clinical history software platform that enables patients to provide a structured medical history through natural voice conversation and touchscreen interaction, digitize previous medical documents, and generate a physician-ready clinical summary before consultation.**

### 1.3 Product Positioning

MediKiosk is **not an AI doctor**.

It is an **AI-powered pre-consultation clinical information collection and organization platform**.

The system:

* Collects patient information
* Conducts adaptive history-taking conversations
* Organizes medical history
* Digitizes medical documents
* Detects predefined potential red flags
* Structures clinical information
* Generates an AI draft summary
* Routes information to the appropriate healthcare workflow
* Allows doctors to review, edit, accept, or reject AI-generated information

The system does **not**:

* Diagnose patients autonomously
* Prescribe medicines
* Recommend treatment
* Replace doctors
* Make final clinical decisions

---

# 2. Problem Statement

Indian hospitals, especially high-volume public OPDs, face a major clinical history-taking bottleneck.

Doctors have limited time to:

* Understand the patient's main complaint
* Collect the history of the current problem
* Ask about previous illnesses
* Ask about surgeries and procedures
* Review current medicines
* Identify allergies
* Understand family and personal history
* Review previous investigations
* Examine the patient
* Make clinical decisions
* Counsel the patient

At the same time, patients often arrive with multiple unorganized physical medical records such as:

* Handwritten prescriptions
* Laboratory reports
* Blood test reports
* Discharge summaries
* Scan reports
* Surgery records

This creates a fragmented and inefficient consultation workflow.

AYUSH and Ayurvedic OPDs face an additional challenge because they require more extensive structured history-taking and assessment.

There is a need for a patient-facing software platform that collects and structures relevant information **before the patient enters the consultation room**.

---

# 3. Product Vision

Create a digital pre-consultation system that transforms the workflow from:

**Patient arrives → Doctor manually collects everything → Doctor reviews scattered documents → Consultation begins**

into:

**Patient arrives → MediKiosk collects history → Documents are digitized → Information is structured → Potential priority cases are flagged → Doctor receives a draft summary → Doctor verifies → Consultation begins**

---

# 4. Target Users

## 4.1 Primary User — Patient

The system must support:

* First-time patients
* Returning patients
* Elderly patients
* Low-literacy patients
* Rural patients
* Patients unfamiliar with technology
* Patients speaking regional languages
* Patients carrying physical medical documents

### Patient Needs

* Easy interaction
* Minimal typing
* Language choice
* Voice guidance
* Large buttons
* Simple visual interface
* Ability to speak naturally
* Ability to answer by touch
* Easy document upload/scanning

---

## 4.2 Secondary User — Doctor

The doctor needs to:

* Quickly understand the patient's background
* Review the AI-generated draft
* View relevant medical documents
* View a chronological medical timeline
* Review potential attention flags
* Edit incorrect information
* Confirm or reject the generated summary
* Retain complete clinical decision-making authority

---

## 4.3 Triage / Hospital Staff

Staff need to:

* View patient intake status
* Monitor potential priority alerts
* Acknowledge alerts
* Identify patients requiring priority clinical assessment
* Manage patient workflow

---

## 4.4 AYUSH / Ayurvedic Practitioner

The practitioner needs:

* Structured AYUSH history collection
* Dashavidha Pariksha information
* Ahara-Vihara assessment
* Practitioner-ready structured information

---

# 5. Product Goals

## Primary Goals

1. Reduce the history-taking burden before consultation.
2. Enable patients to independently provide structured information.
3. Support multilingual voice and touchscreen interaction.
4. Convert free-form patient narration into structured clinical history.
5. Digitize and organize previous medical documents.
6. Create a chronological medical timeline.
7. Flag predefined potential priority situations for staff attention.
8. Generate a concise physician-ready draft summary.
9. Keep doctors in complete control of clinical decisions.
10. Demonstrate integration readiness with HIS/EMR and ABDM/ABHA workflows.

## Prototype Goal

Build a convincing, functional end-to-end prototype demonstrating the complete patient journey and hospital workflow.

---

# 6. Core User Journey

## Step 1 — Identify

```text
Welcome
   ↓
Language Selection
   ↓
Patient Identification
   ↓
New Registration / Existing Patient
   ↓
Consent
```

Patient identification options:

* ABHA ID
* ABHA QR scan interface
* Aadhaar details interface
* Mobile number
* New patient registration

For the prototype, external authentication may be simulated.

---

## Step 2 — Converse

```text
Chief Complaint
      ↓
Adaptive Questions
      ↓
History of Present Illness
      ↓
Medical History
      ↓
Other Relevant History
      ↓
Information Completeness Check
```

The patient can answer every relevant question through:

* Voice
* Touchscreen
* Multiple-choice options
* Yes/No selections

---

## Step 3 — Scan

```text
Upload / Scan Document
        ↓
Document Classification
        ↓
OCR
        ↓
Clinical Information Extraction
        ↓
Date Detection
        ↓
Medical Timeline
```

Supported prototype documents:

* Prescriptions
* Lab reports
* Blood reports
* Discharge summaries
* Scan reports
* Surgery/procedure records

---

## Step 4 — Summarize & Route

```text
Conversation Data ──┐
Touch Responses ────┤
Document Data ──────┤
Medical Timeline ───┤
Attention Flags ────┘
                    ↓
             AI Draft Summary
                    ↓
             FHIR Data Mapping
                    ↓
          HIS / EMR Routing Demo
                    ↓
        ABHA / Digital Record Demo
```

---

## Step 5 — Consult

```text
Doctor Receives Patient
          ↓
Reviews AI Draft
          ↓
Views Documents and Timeline
          ↓
Edits / Corrects / Rejects
          ↓
Verifies Information
          ↓
Doctor Conducts Consultation
          ↓
Final Clinical Decision by Doctor
```

---

# 7. Functional Requirements

# FR-01 — Welcome and Kiosk Interface

The system shall provide:

* Clear MediKiosk branding
* Start button
* Large accessible controls
* Minimal text
* Visual guidance
* Kiosk-friendly full-screen experience
* Accessibility-focused interface

### Acceptance Criteria

* A first-time user can identify how to start.
* The primary action is clearly visible.
* The interface is usable on a touchscreen.

---

# FR-02 — Language Selection

The system shall initially support:

* English
* Tamil
* Hindi

The architecture shall allow future addition of other Indian languages.

### Acceptance Criteria

* The patient selects a preferred language.
* The selection is stored in the intake session.
* Patient-facing questions follow the selected language.
* Physician-facing output can remain standardized separately.

---

# FR-03 — Patient Identification and Registration

The system shall provide:

* ABHA ID entry
* ABHA QR scan interface
* Aadhaar/mobile identification interface
* Existing patient lookup
* New patient registration

### Prototype Requirement

Real government authentication is not required for the prototype.

The application shall use clearly labelled simulated/mock integration where necessary.

---

# FR-04 — Consent Management

The system shall:

* Explain data collection
* Provide audio-guided consent
* Record consent status
* Require consent before intake begins
* Display data-sharing status
* Provide a consent withdrawal/revocation interface
* Maintain a consent audit record

### Acceptance Criteria

* Intake cannot continue without required consent.
* Consent status is visible.
* Audio guidance is available.

---

# FR-05 — Multimodal Patient Interaction

Every appropriate patient question shall support:

### Voice Input

* Microphone interaction
* Speech-to-text
* Retry/re-record
* Transcript confirmation

### Touch Input

* Yes/No
* Multiple-choice answers
* Symptom selection
* Large touch targets

### Voice Output

* Spoken questions
* Spoken instructions
* Spoken consent
* Spoken confirmation

---

# FR-06 — Accessibility and Low-Literacy Support

The patient interface shall provide:

* Large buttons
* Large readable text
* Icon-based navigation
* Audio instructions
* Minimal typing
* Simple language
* Clear progress indication
* Elderly-friendly interaction

---

# FR-07 — Conversational Clinical History Engine

The system shall begin by collecting the patient's main complaint.

Example:

> "What brings you to the hospital today?"

The system shall support free-form answers.

The AI shall convert the response into structured context and determine relevant follow-up questions.

---

# FR-08 — Adaptive Question Engine

The system shall not use only a fixed questionnaire.

It shall:

1. Understand the patient's current response.
2. Identify the relevant clinical context.
3. Determine information already collected.
4. Identify missing information.
5. Select an appropriate next question.
6. Avoid unnecessary repetition.
7. Continue until sufficient information is collected for the prototype workflow.

### Example Flow

```text
Patient: "I have stomach pain."
             ↓
Chief Complaint Identified
             ↓
Relevant Pathway Selected
             ↓
Onset
             ↓
Location
             ↓
Character/Pattern
             ↓
Associated Symptoms
             ↓
Relevant History
```

---

# FR-09 — History of Present Illness Collection

Where appropriate, the system shall collect structured information including:

* Onset
* Duration
* Location
* Character
* Severity
* Timing
* Aggravating factors
* Relieving factors
* Associated symptoms

---

# FR-10 — Standard Clinical History Collection

The system shall collect:

* Chief complaint
* History of Present Illness
* Past medical history
* Past surgical history
* Drug/medication history
* Allergy history
* Family history
* Personal history
* Review of Systems

The system shall track which sections are:

* Complete
* Partially complete
* Not yet collected

---

# FR-11 — Missing Information Detection

Before generating the final draft, the system shall:

```text
Structured History
       ↓
Completeness Check
       ↓
Missing Fields Detected
       ↓
Relevant Follow-up Questions
       ↓
Updated History
```

The patient shall not be asked unnecessary duplicate questions.

---

# FR-12 — Potential Red-Flag Detection

The system shall evaluate patient responses against predefined escalation rules.

### Architecture

```text
Patient Response
       ↓
AI Structures Information
       ↓
Structured Symptoms
       ↓
Red-Flag Rule Engine
       ↓
Potential Priority Alert
       ↓
Triage Staff Notification
```

### Important Safety Requirement

The system must not claim to diagnose the patient.

Alerts shall be framed as:

> Potential priority situation requiring clinical assessment.

---

# FR-13 — Triage and Priority Workflow

When a potential priority alert is triggered:

* An alert shall be created.
* Relevant staff shall see the alert.
* Staff can acknowledge the alert.
* The patient can be marked for priority clinical assessment.
* The alert status shall be tracked.

Alert statuses:

* New
* Acknowledged
* In Assessment
* Resolved

---

# FR-14 — Medical Document Upload

The patient shall be able to:

* Upload images
* Upload PDFs
* Upload multiple documents
* Preview documents
* Delete incorrect uploads
* Rescan/replace documents

Supported document categories:

* Prescription
* Laboratory report
* Blood report
* Discharge summary
* Scan report
* Surgery/procedure record

---

# FR-15 — OCR and Document Intelligence

The document processing pipeline shall:

```text
Document
   ↓
Classification
   ↓
OCR
   ↓
Raw Text
   ↓
Clinical Entity Extraction
   ↓
Structured Medical Data
```

The system shall extract, where available:

* Diagnoses/conditions
* Medicines
* Dosages
* Frequencies
* Investigation names
* Investigation values
* Reference ranges
* Procedures
* Surgeries
* Dates

---

# FR-16 — Document Classification

The system shall attempt to classify uploaded documents as:

* Prescription
* Lab report
* Discharge summary
* Scan/imaging report
* Other medical document

The prototype may use AI or simulated classification where necessary.

---

# FR-17 — Medical Timeline

The system shall:

1. Extract medical events.
2. Associate events with dates.
3. Normalize dates.
4. Sort events chronologically.
5. Display a visual timeline.

Example:

```text
2023
│
├── Previous Consultation
│
2024
│
├── Procedure
│
2025
│
├── Laboratory Investigation
│
2026
│
└── Current Consultation
```

---

# FR-18 — Abnormal Value Flagging

Where a lab result includes:

* Test name
* Patient value
* Reference range

The system shall compare the value with the provided range and display a potential out-of-range flag for physician review.

The system shall not independently interpret this as a diagnosis.

---

# FR-19 — Potential Drug Interaction Flagging

The system shall:

1. Extract available medication information.
2. Compare medication combinations against the prototype interaction data source.
3. Display potential interactions for physician attention.

All results shall be labelled:

> Requires physician review.

---

# FR-20 — AYUSH / Ayurvedic Mode

The system shall provide a mode for:

* Standard clinical intake
* AYUSH/Ayurvedic intake

The AYUSH module shall collect relevant structured information including:

* Prakriti
* Vikriti
* Sara
* Samhanana
* Pramana
* Satmya
* Sattva
* Ahara Shakti
* Vyayama Shakti
* Vaya
* Ahara-Vihara

The system shall generate a separate practitioner-ready AYUSH assessment summary.

---

# FR-21 — AI Structured Summary Generator

The system shall combine:

* Conversation information
* Touch responses
* Structured clinical history
* Document extraction results
* Medical timeline
* Attention flags

The output shall be a structured AI-generated draft.

---

# FR-22 — Standard Summary Format

The physician summary shall include:

1. Chief Complaint
2. History of Present Illness
3. Past Medical History
4. Past Surgical History
5. Medicines
6. Allergies
7. Family History
8. Personal History
9. Review of Systems
10. Prior Investigations
11. Relevant Medical Timeline
12. Potential Attention Flags

---

# FR-23 — Patient Confirmation

Before completing intake, the patient shall have the opportunity to:

* Review key collected information
* Hear an audio confirmation
* Correct selected information
* Confirm submission

---

# FR-24 — Doctor Dashboard

The doctor dashboard shall provide:

* Patient queue
* Priority indicator
* Intake completion status
* Patient overview
* AI-generated summary
* Original patient responses
* Uploaded documents
* OCR/extracted information
* Medical timeline
* Lab information
* Medicines
* Attention flags

---

# FR-25 — Doctor Verification Layer

The doctor shall be able to:

* Review
* Edit
* Add
* Remove
* Accept
* Reject
* Verify

The system shall clearly display:

> AI-generated draft — requires physician verification.

The system shall preserve:

* Original AI-generated draft
* Doctor-modified version
* Final verification status

---

# FR-26 — Triage Staff Dashboard

The triage portal shall provide:

* Current patient queue
* Intake status
* New priority alerts
* Alert details
* Alert acknowledgement
* Priority routing status

---

# FR-27 — HIS/EMR Integration Layer

The system shall simulate routing of structured patient information to a hospital system.

The routing flow shall display:

```text
AI Summary Generated
        ↓
Clinical Data Structured
        ↓
FHIR Mapping
        ↓
HIS/EMR Routing
        ↓
Consultation Screen Updated
```

Real hospital integration is optional for the prototype.

---

# FR-28 — FHIR Mapping Layer

The system shall map prototype data to FHIR-like resources.

Examples:

* Patient → Patient
* Conditions → Condition
* Lab results → Observation
* Medicines → MedicationStatement
* Allergies → AllergyIntolerance
* Documents → DocumentReference

---

# FR-29 — ABHA/ABDM Integration Demonstration

The prototype shall demonstrate:

* ABHA-linked patient identification
* Consent status
* Health record linkage
* Structured record routing

Where live integration is unavailable, the UI shall explicitly show:

> Prototype Integration Simulation

---

# FR-30 — Privacy and Session Handling

The system shall provide prototype-level privacy features:

* Role-based access
* Consent check before access
* Session timeout
* Session completion state
* Temporary data cleanup simulation
* Protected patient routes
* Audit logging

---

# FR-31 — Audit Trail

The system shall record important actions:

* Patient identified
* Consent granted
* Consent revoked
* Intake started
* Document uploaded
* Alert generated
* Summary generated
* Doctor edited summary
* Doctor verified information

---

# 8. User Roles

| Role         | Primary Access                       |
| ------------ | ------------------------------------ |
| Patient      | Kiosk intake and document upload     |
| Doctor       | Summary review and verification      |
| Triage Staff | Priority alerts and routing          |
| Admin/Demo   | Demo scenarios and system monitoring |

---

# 9. System Architecture

```text
                        MEDIKIOSK
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
     PATIENT KIOSK     DOCTOR PORTAL     TRIAGE PORTAL
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                            ▼
                      APPLICATION API
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
       ▼                    ▼                    ▼
CONVERSATION AI        DOCUMENT AI         RED-FLAG ENGINE
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                            ▼
                     CLINICAL DATA LAYER
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
         DATABASE         STORAGE      AUDIT LOGS
                            │
                            ▼
                    INTEGRATION LAYER
                  FHIR / HIS / ABHA MOCK
```

---

# 10. Technical Requirements

## Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* Lucide React
* Framer Motion

## Backend

* Next.js Route Handlers

## Database

* Supabase PostgreSQL

## Authentication

* Supabase Auth
* Mock patient identification flow for prototype

## Storage

* Supabase Storage

## AI

Provider-abstracted AI layer for:

* Conversation
* Adaptive questioning
* Information structuring
* Document extraction
* Summary generation

## Voice

Abstraction layer for:

* Speech-to-text
* Text-to-speech

## Document Processing

OCR abstraction layer supporting:

* Images
* PDFs
* Printed documents
* Prototype handwritten documents

## Safety

* Deterministic red-flag rule engine
* Human verification workflow
* No autonomous diagnosis

## Integration

* FHIR mapping layer
* Mock HIS/EMR integration
* Mock ABHA/ABDM integration

---

# 11. Non-Functional Requirements

## Usability

* Minimal typing
* Large touch targets
* Simple navigation
* Clear progress
* Accessible to low-literacy users

## Performance

For prototype/demo mode:

* Clear loading indicators
* AI fallback responses
* Demo data fallback
* Graceful API error handling

## Reliability

The demo must work even if external AI services fail.

Provide:

* Predefined demo scenarios
* Cached/sample responses
* Sample patient records
* Sample documents

## Maintainability

The codebase must be modular.

Antigravity must extend existing modules rather than repeatedly rewriting the application.

---

# 12. Demo Scenarios

## Scenario 1 — Standard Patient

```text
Identify
   ↓
Consent
   ↓
Voice/Touch Conversation
   ↓
Adaptive Questions
   ↓
Document Upload
   ↓
OCR + Timeline
   ↓
AI Summary
   ↓
Doctor Verification
```

---

## Scenario 2 — Priority Triage

```text
Patient Intake
      ↓
Structured Symptom Information
      ↓
Potential Red-Flag Rule Triggered
      ↓
Triage Alert
      ↓
Staff Acknowledgement
      ↓
Priority Clinical Assessment
```

---

## Scenario 3 — AYUSH Patient

```text
AYUSH Mode
     ↓
Dashavidha Assessment
     ↓
Ahara-Vihara Collection
     ↓
Structured AYUSH Summary
     ↓
Practitioner Review
```

---

# 13. Out of Scope for Prototype

The first prototype does not need:

* Autonomous diagnosis
* Treatment recommendation
* Prescription generation
* Real Aadhaar authentication
* Production-grade ABHA authentication
* Production deployment in a hospital
* Fully validated medical decision support
* Real emergency dispatch
* Full production-grade handwritten OCR accuracy

These can be represented through realistic architecture and clearly labelled simulations.

---

# 14. Success Criteria

The prototype is successful if a judge can complete the following journey:

1. Start at MediKiosk.
2. Select a language.
3. Identify/register a patient.
4. Provide consent.
5. Speak or tap responses.
6. Experience adaptive questioning.
7. Complete structured history-taking.
8. Upload medical documents.
9. See OCR and extracted information.
10. View a chronological medical timeline.
11. See potential priority alerts when the demo scenario requires them.
12. Generate an AI clinical draft summary.
13. Route the information to a simulated HIS/EMR/FHIR workflow.
14. Open the doctor portal.
15. Review, edit, and verify the AI-generated information.

At the end of the demonstration, the judge should clearly understand:

> **MediKiosk moves structured clinical history-taking and medical record organization before the consultation, allowing the physician to spend more of the consultation on examination, clinical reasoning, and patient care.**

---

# 15. Product Development Phases

## Phase 0 — Foundation

* Project setup
* Architecture
* Database schema
* Routing
* UI design system
* Demo data foundation

## Phase 1 — Patient Entry

* Welcome
* Identification
* Registration
* Language
* Consent
* Session

## Phase 2 — Voice and Touch

* Speech-to-text
* Text-to-speech
* Touch responses
* Accessibility

## Phase 3 — Clinical History Engine

* Chief complaint
* Adaptive questions
* HPI
* Full history
* Missing information detection

## Phase 4 — Priority Triage

* Rule engine
* Alerts
* Staff workflow

## Phase 5 — Document Upload

* Scan/upload
* Preview
* Document management

## Phase 6 — Document Intelligence

* OCR
* Extraction
* Timeline
* Potential attention flags

## Phase 7 — AYUSH

* AYUSH mode
* Dashavidha
* Ahara-Vihara
* AYUSH summary

## Phase 8 — AI Summary

* Data synthesis
* Structured summary
* Patient confirmation

## Phase 9 — Doctor Portal

* Queue
* Patient view
* Review
* Edit
* Verification

## Phase 10 — Triage Portal

* Priority queue
* Alert handling
* Routing

## Phase 11 — Integration

* FHIR mapping
* HIS/EMR simulation
* ABHA/ABDM simulation

## Phase 12 — Privacy and Audit

* Access control
* Consent
* Session handling
* Audit trail

## Phase 13 — Demo Mode

* Standard scenario
* Priority scenario
* AYUSH scenario
* Fallback data

## Phase 14 — Final Polish

* Kiosk mode
* Animations
* Loading states
* Error handling
* Responsive design
* Final demo readiness

---

# 16. Antigravity Development Rules

For every development phase, Antigravity must:

1. Inspect the existing codebase before making changes.
2. Preserve working functionality.
3. Follow the existing folder structure.
4. Reuse existing components where possible.
5. Create reusable modules.
6. Maintain strict TypeScript types.
7. Keep AI services provider-independent.
8. Use mock/demo data when an external service is unavailable.
9. Clearly label simulated integrations.
10. Add loading, success, empty, and error states.
11. Test the relevant workflow before finishing.
12. Avoid rewriting unrelated parts of the application.

---

# Final Product Definition

**MediKiosk is a multilingual, AI-powered clinical history software platform that conducts adaptive patient history-taking through voice and touch, digitizes and structures prior medical documents, organizes information into a medical timeline, flags predefined potential priority situations, and generates a physician-ready draft summary before consultation. The physician remains the final authority for reviewing information and making all clinical decisions.**
