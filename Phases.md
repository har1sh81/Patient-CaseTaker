MEDIKIOSK PHASE EXECUTION RULES

You are building MediKiosk phase by phase.

WORK ON ONLY THE PHASE EXPLICITLY REQUESTED BY THE USER.

For every phase, follow this workflow:

1. INSPECT
   - Inspect the existing codebase.
   - Review existing folders, routes, components, types, services, and dependencies.
   - Identify work completed in previous phases.
   - Do not duplicate existing functionality.

2. PLAN
   Before writing code, state:
   - Current phase number and name.
   - Exact requirements being implemented.
   - Files to create.
   - Files to modify.
   - Existing files/components to reuse.
   - Dependencies required.
   - What is explicitly NOT being implemented because it belongs to a later phase.

3. IMPLEMENT
   - Complete all requirements belonging to the current phase.
   - Implement real functionality for core features.
   - Do not create fake buttons for functionality belonging to the current phase.
   - Implement relevant loading, empty, error, success, and disabled states.
   - Maintain TypeScript type safety.
   - Do not break previously completed phases.

4. VERIFY
   - Run npm run build.
   - Run npm run lint.
   - Check for TypeScript errors.
   - Check relevant routes manually.
   - Test the primary user flow for the current phase.
   - Test important edge cases.
   - Verify previous phases still work.
   - Fix all discovered issues.

5. REPORT AND STOP
   Report:
   - Phase completed.
   - Features implemented.
   - Files created.
   - Files modified.
   - Verification performed.
   - Build result.
   - Lint result.
   - Known limitations.

CRITICAL STOP RULE:

After completing and verifying the current phase:

STOP COMPLETELY.

DO NOT start the next phase.
DO NOT create future-phase features.
DO NOT partially scaffold the next phase.
DO NOT say "while we are here" and add future functionality.

Wait until the user explicitly approves moving forward.

Only proceed when the user explicitly says something such as:

"Proceed to Phase X"
"Start Phase X"
"Continue to the next phase"

Before proceeding, ask:

"Phase X has been completed and verified. Would you like me to proceed to Phase X+1 — [Phase Name]?"
MEDIKIOSK SAFETY RULES

MediKiosk is an AI-assisted clinical information collection
and report generation system.

It is NOT an autonomous doctor.

The system must never:

- Diagnose a patient.
- Recommend treatment.
- Generate prescriptions.
- Make final clinical decisions.
- Claim that an AI finding is medically confirmed.

AI may:

- Understand patient responses.
- Extract information.
- Identify missing information.
- Ask adaptive follow-up questions.
- Structure clinical history.
- Extract information from uploaded documents.
- Generate a draft clinical history report.

Potential findings must be labelled for human review.

Red-flag or priority logic must use deterministic,
explicitly configured rules on structured data.

All final clinical reports must clearly indicate that
the information requires clinician verification.

The printed report must contain:

- Physician review area.
- Correction/comments area.
- Signature area.
- Date/time area.
- Report reference number.

PHASE 0 — Project Foundation & Base Architecture

Status: Completed & Verified

Goal

Create the foundational project architecture for MediKiosk.

Work
Project folder structure.
TypeScript configuration.
Application route structure.
Shared type definitions.
Environment variable configuration.
Supabase client abstraction.
Database provider abstraction.
AI provider abstraction.
Mock/demo provider infrastructure.
API route foundation.
Shared constants.
Error handling foundation.
Application configuration.
Development and production environment handling.
Routes
/
/kiosk
/demo
/api
Definition of Done
Base architecture exists.
Application builds successfully.
Routes are reachable.
TypeScript foundation is established.
Future providers can be swapped without rewriting the UI.
PHASE 1 — Design System & Complete UI Foundation
Goal

Establish one complete and consistent MediKiosk design system before building individual functional screens.

Brand Identity
MediKiosk logo/wordmark treatment.
Brand name styling.
Product tagline styling.
Healthcare + technology visual identity.
Professional clinical appearance.
Friendly public-facing kiosk appearance.
Color System

Primary colors:

Medical Teal.
Deep Teal.
Soft Teal.
Pale Teal.

Secondary colors:

Clinical Blue.
Deep Blue.
Light Blue.

Neutral colors:

Clinical White.
Surface White.
Soft Gray.
Border Gray.
Deep Slate.
Secondary Slate.
Muted Slate.

Status colors:

Success.
Information.
Warning.
Potential Priority.
Error.

AYUSH accent:

Subtle Ayurvedic green accent.
AYUSH light background.

Create semantic design tokens such as:

primary
primary-hover
primary-light
secondary
background
surface
border
text-primary
text-secondary
text-muted
success
warning
priority
error
ayush
Typography System

Define typography for:

Kiosk page title.
Screen title.
Section title.
Card title.
Body text.
Helper text.
Form labels.
Large touchscreen text.
Button text.
Status text.
Report headings.
Printable report body text.
Fine-print/disclaimer text.

Typography must remain readable for:

Elderly users.
Users with limited digital familiarity.
Large touchscreen usage.
Spacing System

Define consistent spacing tokens for:

Micro spacing.
Small spacing.
Medium spacing.
Large spacing.
Section spacing.
Page spacing.
Kiosk safe-area padding.
Component Foundation

Create reusable components for:

Buttons
Primary button.
Secondary button.
Outline button.
Ghost button.
Danger button.
Large kiosk button.
Icon button.
Loading button.
Disabled button.
Cards
Standard card.
Information card.
Selection card.
Interactive card.
Summary card.
Alert card.
Upload card.
Form Components
Text input.
Large kiosk input.
Number input.
Phone input.
Textarea.
Select.
Radio group.
Checkbox.
Switch.
Yes/No selector.
Multi-select selector.
Search input.
Feedback Components
Alert banner.
Inline validation.
Error message.
Success state.
Warning state.
Information state.
Toast notification.
Confirmation notification.
Status Components
Status badge.
Session badge.
Upload status.
Processing status.
Attention flag.
Completion status.
Progress Components
Linear progress bar.
Step progress indicator.
Circular progress indicator.
Processing progress state.
Modal/Dialog Components
Confirmation dialog.
Cancel confirmation.
Session timeout dialog.
Privacy dialog.
Error dialog.
Success dialog.
Global States

Create reusable designs for:

Initial state.
Loading state.
Skeleton loading.
Empty state.
Error state.
Retry state.
Offline/demo state.
Success state.
Disabled state.
Layout Foundation

Create:

Full-screen kiosk layout.
Kiosk header.
Kiosk content area.
Kiosk footer/navigation area.
Back button pattern.
Continue button pattern.
Exit/cancel pattern.
Session indicator.
Step/progress display.
Responsive Behavior

Support:

Large kiosk display.
Desktop.
Laptop.
Tablet.
Mobile demo view.

Prioritize kiosk display first.

Accessibility

Implement:

Visible focus states.
Sufficient color contrast.
Keyboard navigation.
Large touch targets.
Clear error messaging.
Screen-reader-friendly labels.
Reduced motion support where practical.
Animation

Create subtle reusable:

Page transitions.
Card transitions.
Modal transitions.
Loading animations.
Success animations.

No excessive animation.

Print Foundation

Create:

Print-specific stylesheet.
@media print rules.
A4 page foundation.
Print margins.
Print typography.
Print-safe colors.
Page-break utility classes.
break-inside: avoid patterns.
Hide non-report UI during printing.
Explicitly Do NOT Build Yet
Patient registration.
Consent flow.
Voice recording.
AI integration.
Clinical interview.
Document upload.
OCR.
Report generation logic.
Printing functionality.
PHASE 2 — Data Models & Database Foundation
Goal

Define the complete structured data model required by the prototype.

Core Entities
Patients
Patient ID.
Name.
Age/date of birth.
Gender.
Mobile number.
ABHA reference.
Hospital/reference number.
Consents
Consent ID.
Patient/session ID.
Consent type.
Consent status.
Timestamp.
Language used.
Intake Sessions
Session ID.
Patient ID.
Status.
Selected language.
Selected intake mode.
Start time.
Last activity.
Completion time.
Conversation Messages
Message ID.
Session ID.
Question.
Answer.
Input method.
Timestamp.
Extracted structured fields.
Medical Documents
Document ID.
Session ID.
File metadata.
Document type.
Upload status.
OCR status.
Processing status.
Clinical Histories

Structured sections for:

Chief complaint.
HPI.
Past medical history.
Surgical history.
Medications.
Allergies.
Family history.
Personal/social history.
Review of systems.
Document-derived history.
Timeline.
Attention flags.
AYUSH data.
Audit Logs

Track:

Session created.
Consent given.
Question answered.
Document uploaded.
Information edited.
Report generated.
Print completed.
Session reset.
Data Services

Create:

Patient service.
Session service.
Consent service.
Conversation service.
Document service.
Clinical history service.
Audit service.
Database Modes

Support:

Supabase mode.
Mock/demo mode.
Local development fallback.
Demo Seed Data

Create structured seed data for:

Standard patient.
Priority-attention patient.
AYUSH patient.
Explicitly Do NOT Build Yet
Full intake UI.
AI questioning.
OCR.
Printing.
PHASE 3 — Patient Kiosk Entry Flow
Goal

Create the complete patient entry experience.

Welcome Screen

Include:

MediKiosk branding.
Clear explanation.
Start button.
Language selection access.
Accessibility-friendly design.
Language Selection

Support:

English.
Tamil.
Hindi.

Store selected language in session state.

Patient Identification

Support prototype flows for:

ABHA ID input UI.
Mobile number input.
Hospital/reference number.
QR scan simulation.
New patient flow.

Clearly label simulated integrations.

Patient Information

Collect:

Name.
Age/date of birth.
Gender.
Identification reference.
Consent

Explain:

Voice information collection.
Medical information processing.
Document processing.
AI-assisted information structuring.
Printed report purpose.

Require:

Consent acceptance.
Clear decline/cancel path.
Navigation

Support:

Back.
Continue.
Cancel.
Restart.
Explicitly Do NOT Build Yet
Actual interview.
AI.
OCR.
Report generation.
PHASE 4 — Session, Consent & Privacy Layer
Goal

Manage the patient intake session safely throughout the kiosk workflow.

Session Management

Implement:

Session creation.
Active session tracking.
Last activity tracking.
Session expiration.
Session cancellation.
Session completion.
Session reset.
Timeout Handling

Implement:

Inactivity timer.
Warning before timeout.
Continue session option.
Automatic session closure after timeout.
Privacy Protection

Ensure:

Previous patient information disappears after reset.
Browser/kiosk UI does not show previous session data.
New sessions start clean.
Sensitive data is not displayed unnecessarily.
Consent Tracking

Track:

Consent granted.
Consent timestamp.
Consent language.
Session association.
Cleanup Behavior

After successful completion or cancellation:

Clear active kiosk session state.
Reset UI for next patient.
Retain only permitted demo/prototype data.
Prevent next patient from accessing prior active session data.
Audit Logging

Record major actions.

Explicitly Do NOT Build Yet
Full interview.
AI.
Documents.
Printing.
PHASE 5 — Voice & Touch Interaction Foundation
Goal

Build the reusable interaction layer for the patient interview.

Voice Interface

Create:

Microphone button.
Listening state.
Processing state.
Transcript display.
Stop recording.
Retry recording.
Manual text fallback.
Speech-to-Text Architecture

Create abstraction for:

Browser speech recognition.
Future external STT provider.
Mock transcript provider.

Support language configuration.

Text-to-Speech

Create:

Question auto-read.
Replay question.
Stop speech.
Speech enabled/disabled setting.
Language-aware configuration.
Touch Inputs

Create:

Yes/No buttons.
Single choice.
Multiple choice.
Severity scale.
Numeric scale.
Text input.
Large answer cards.
On-screen-friendly controls.
Input States

Support:

Recording.
Processing.
Recognized.
Failed.
Retry.
Manual fallback.
Explicitly Do NOT Build Yet
Adaptive AI logic.
Complete clinical question set.
Document processing.
PHASE 6 — Conversation Engine Foundation
Goal

Create the underlying system that controls question flow.

Question Schema

Each question should support:

Question ID.
Section.
Question text.
Language text.
Input type.
Required/optional.
Validation.
Follow-up rules.
Help text.
Answer Storage

Store:

Question ID.
Answer.
Input method.
Timestamp.
Confidence if available.
Routing

Implement:

Start interview.
Next question.
Previous question.
Skip optional question.
Resume session.
Section completion.
Interview completion.
Static Flow

Implement initial linear flow for:

Chief complaint.
Basic symptom information.
Simple medical history.
Explicitly Do NOT Build Yet
LLM-driven question selection.
OCR.
Full report.
PHASE 7 — Adaptive Clinical History AI Engine
Goal

Add AI-assisted adaptive questioning.

AI Responsibilities

The AI may:

Parse patient responses.
Extract structured information.
Identify missing fields.
Determine relevant follow-up questions.
Return structured output.

The AI must not:

Diagnose.
Prescribe.
Recommend treatment.
Make final clinical decisions.
AI Provider

Implement:

Provider abstraction.
Gemini/API integration.
Environment-based API key configuration.
Mock AI fallback.
Error handling.
Timeout handling.
Structured Output

Validate AI responses against strict schemas.

Example conceptual outputs:

Extracted symptoms.
Duration.
Severity.
Associated symptoms.
Missing information.
Next question ID/type.
Safety

The AI only selects from approved question categories.

Do not allow unrestricted chatbot behavior.

Fallback

If AI fails:

Use deterministic/static questions.
Do not terminate intake.
PHASE 8 — Document Capture + Upload

Goal
Enable the kiosk to digitize physical medical documents via camera/scanner/upload (PDF, JPG, PNG, printed, handwritten, multilingual).

PHASE 9 — OCR + Document Extraction

Goal
Extract raw text from uploaded/scanned medical documents.

PHASE 10 — Clinical Information Extraction

Goal
Extract structured clinical entities (Diagnoses/conditions, Medicines, Dose/frequency, Allergies, Surgeries, Lab tests, Values, Reference ranges, Dates) from OCR text.

PHASE 11 — Medical Timeline + Record Fusion

Goal
Automatically organize patient history chronologically (e.g., 2022 -> hospital visit, 2024 -> admission, 2026 -> current symptoms). Combine ABDM records, old documents, and current interview. Identify inconsistencies, highlight abnormal lab values, and flag possible medication conflicts.

PHASE 12 — Red-Flag / Attention Engine

Goal
Identify predefined urgent symptom combinations and generate priority/attention flags to alert appropriate hospital/triage staff. (Never presented as an AI diagnosis).

PHASE 13 — AYUSH / Dashavidha Engine

Goal
Implement the AYUSH mode covering Prakriti, Vikriti, Agni, Koshtha, Diet/lifestyle, Trividha Pariksha, Ashtavidha Pariksha, and Dashavidha Pariksha.

PHASE 14 — Final Clinical History Generator

Goal
Generate the comprehensive structured summary containing: Chief Complaint, History of Present Illness, Past Medical History, Past Surgical History, Medications, Allergies, Family History, Personal History, Review of Systems, Previous Investigations, Relevant ABDM Records, Relevant Documents, and Attention Flags.

PHASE 15 — Doctor Dashboard + Review

Goal
Provide a dashboard for the doctor to see the patient, current complaint, structured history, previous records, document images, extracted info, timeline, and attention flags. Allow the doctor to edit the AI-generated summary and confirm/reject information.

PHASE 16 — Patient Verification + Report

Goal
Allow the patient to review important answers, correct mistakes, and confirm the summary before final submission.

PHASE 17 — Printing

Goal
Implement the physical printable report generation.

PHASE 18 — Hospital / ABDM / FHIR Integration

Goal
Implement hospital-side access, session association, patient association, clinical history transfer, and eventually EMR integration. Move from MockABDMProvider to Real ABDM/FHIR Provider.

PHASE 19 — Security + Privacy + Audit Hardening

Goal
Harden the system security, privacy compliance, and audit trails.

PHASE 20 — End-to-End Testing + Demo Hardening

Goal
Final system-wide testing and preparation of robust demo scenarios.
