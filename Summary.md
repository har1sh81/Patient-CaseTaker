We should implement this in Anti-Gravity as a dedicated report-generation phase, without changing the parts of MediKiosk that are already working.

The important design is:

Interview + Documents + ABDM + AYUSH
                ↓
        Structured patient data
                ↓
       Deterministic Report Builder
                ↓
          Patient Review
                ↓
        Patient CONFIRMS
                ↓
    Generate Clinical Summary PDF
                ↓
      Store PDF securely
                ↓
        Send to Doctor Queue
                ↓
       Doctor Dashboard

The PDF should be a rendered output, not the database/source of truth.

Because you already have the reference PDF, give Anti-Gravity the PDF as a design/reference artifact and tell it to reproduce the structure and visual hierarchy, while making every value dynamic. The reference contains the intended sections and complaint-centric structure.

I would implement it in 4 controlled steps
Step 1 — Report data contract

Create one canonical object such as:

ClinicalConsultationSummary

containing:

patient
visit
currentComplaint
historyOfPresentIllness
attention
relevantPreviousHistory
medications
allergies
investigations
familyHistory
personalHistory
socialHistory
reviewOfSystems
documents
abdmContext
ayush
informationNotReported
conflicts
provenance
patientConfirmation

This is the data that both the dashboard and PDF consume.

Step 2 — Deterministic report composer

Take the existing structured data and decide:

what appears
what does not appear
section order
wording for missing information
source labels
timeline visibility
AYUSH visibility
attention visibility

Gemini should not decide the layout.

Step 3 — PDF renderer

Render that report object into the polished PDF.

The PDF generator should handle:

page size
headers/footers
typography
tables/cards where appropriate
page breaks
source badges
timeline
section spacing
long text wrapping
optional sections
Step 4 — Patient handoff

After confirmation:

Generate report
       ↓
Store PDF privately
       ↓
Create report snapshot/reference
       ↓
Mark session sent_to_doctor
       ↓
Doctor dashboard loads same report

The doctor dashboard should have both:

[View Clinical Summary]
[Open PDF]
Exact Anti-Gravity prompt

Give Anti-Gravity this as a new phase:

# PHASE 21 — CLINICAL CONSULTATION SUMMARY + PDF HANDOFF

## OBJECTIVE

Implement the final patient-facing clinical summary generation workflow.

The existing MediKiosk prototype currently has a patient review page
that displays collected information in a simple text-oriented format.

Replace that concept with a proper:

CLINICAL CONSULTATION SUMMARY

that is generated dynamically for each patient and rendered as a
professional PDF matching the supplied reference design.

IMPORTANT:

The supplied PDF is a DESIGN / FORMAT REFERENCE ONLY.

Do NOT copy its patient details, names, dates, diagnoses, medications,
or medical values.

All clinical values in the generated report must come dynamically from
the current patient's structured session data.

==================================================
CURRENT PRODUCT DECISION
==================================================

For this phase:

PATIENT CONFIRMATION = FINAL HANDOFF AUTHORITY

The current workflow is:

Patient intake
→ structured data
→ report
→ patient review
→ patient confirmation
→ PDF generation
→ doctor dashboard

DO NOT implement:

- physician verification
- physician finalization
- physician editing
- physician sign-off
- final clinical approval

Those are FUTURE IMPLEMENTATION.

Do not add them to this phase.

==================================================
ARCHITECTURAL PRINCIPLE
==================================================

The PDF is NOT the source of truth.

The source of truth is the structured clinical report data.

Architecture:

Interview
+
Documents
+
ABDM
+
AYUSH
+
Attention
+
Timeline
+
Corrections
      ↓
STRUCTURED CLINICAL DATA
      ↓
ClinicalConsultationSummary
      ↓
Patient Review
      ↓
Patient Confirmation
      ↓
PDF RENDERER
      ↓
PDF SNAPSHOT
      ↓
Doctor Dashboard

The same structured report must power:

1. Doctor dashboard
2. PDF
3. Future printing
4. Future FHIR export

Do not maintain separate clinical data structures for PDF and dashboard.

==================================================
STRICT WORKFLOW
==================================================

Follow:

1. INSPECT
2. PLAN
3. STOP
4. WAIT FOR EXPLICIT APPROVAL
5. IMPLEMENT
6. VERIFY
7. REPORT
8. STOP

Do not automatically continue to future phases.

==================================================
STEP 1 — INSPECT EXISTING SYSTEM
==================================================

Inspect:

- current patient review page
- clinical report schema
- clinical history schema
- report generation logic
- patient confirmation flow
- patient correction flow
- session state machine
- sent_to_doctor transition
- doctor dashboard
- doctor patient workspace
- Source Truth
- complaint relevance
- timeline
- attention engine
- AYUSH
- document extraction
- ABDM data
- FHIR mapper

Also inspect the supplied reference PDF:

MediKiosk_Clinical_Consultation_Summary_main.pdf

Treat this PDF as a VISUAL/STRUCTURAL REFERENCE ONLY.

Do NOT hardcode its contents.

==================================================
STEP 2 — DEFINE THE REPORT CONTRACT
==================================================

Create or extend the canonical:

ClinicalConsultationSummary

It should contain structured data for:

1. Patient Information
2. Visit / Intake Information
3. Attention
4. Current Complaint
5. Patient's Own Words
6. History of Present Illness
7. Relevant Previous History
8. Medications
9. Allergies
10. Investigations & Reports
11. Family History
12. Personal History
13. Social History
14. Review of Systems
15. Information Not Reported
16. Complaint-Centric Medical Journey
17. Uploaded Documents
18. ABDM / Digital Health Context
19. AYUSH History where applicable
20. Source / Provenance
21. Patient Confirmation Status

Do not include physician verification fields as required final content.

==================================================
STEP 3 — REPORT COMPOSITION RULES
==================================================

The application must deterministically decide what appears.

Rules:

### Empty section
Do not display empty sections unless clinically useful.

### Missing field
Display:

"Not reported"

or the project's existing equivalent.

Do not treat missing information as negative.

### Current complaint
Always display.

### Attention
Display only when applicable.

### Relevant history
Use Phase 15A complaint-centric relevance output.

### Timeline
Only display when relevance/record count justifies it.

### AYUSH
Only display for AYUSH sessions.

### Documents
Display documents actually associated with the session.

### ABDM
Display only relevant records.

### Conflicts
Display explicitly without automatically resolving them.

==================================================
STEP 4 — REPORT STRUCTURE
==================================================

The final report must follow this hierarchy:

-----------------------------------------
MEDIKIOSK
Clinical Consultation Summary
-----------------------------------------

PATIENT

Name
Age
Sex
Hospital Number
ABHA reference where permitted
Department
Visit Date
Language
Handoff status

-----------------------------------------
ATTENTION
-----------------------------------------

Only when applicable.

Show the existing deterministic attention message.

Do not generate diagnoses.

-----------------------------------------
CURRENT COMPLAINT
-----------------------------------------

Primary complaint
Duration
Severity if explicitly reported
Pattern
Patient's own words

-----------------------------------------
HISTORY OF PRESENT ILLNESS
-----------------------------------------

Onset
Location
Character
Duration
Aggravating factors
Relieving factors
Associated symptoms
Progression

Only show information actually collected.

-----------------------------------------
RELEVANT PREVIOUS HISTORY
-----------------------------------------

Use complaint-centric relevance engine.

Do NOT dump the full patient history.

If none:

"No relevant previous history found for this complaint."

-----------------------------------------
MEDICATIONS
-----------------------------------------

Medication
Dose
Frequency
Status
Sources

Show source badges:

Patient
Document
ABDM

Show conflicts explicitly.

-----------------------------------------
ALLERGIES
-----------------------------------------

Only explicit information.

-----------------------------------------
INVESTIGATIONS & REPORTS
-----------------------------------------

Test
Date
Result
Unit
Source

Do not interpret results beyond available source content.

-----------------------------------------
FAMILY / PERSONAL / SOCIAL HISTORY
-----------------------------------------

Display structured fields.

Do not infer missing information.

-----------------------------------------
REVIEW OF SYSTEMS
-----------------------------------------

Display only available structured information.

-----------------------------------------
INFORMATION NOT REPORTED
-----------------------------------------

Explicitly list relevant missing information.

-----------------------------------------
RELEVANT MEDICAL JOURNEY
-----------------------------------------

Only show when enough related historical information exists.

Use complaint-centric timeline rules.

-----------------------------------------
UPLOADED DOCUMENTS
-----------------------------------------

Document type
Date
Document reference

-----------------------------------------
ABDM / DIGITAL HEALTH CONTEXT
-----------------------------------------

Only relevant retrieved records.

-----------------------------------------
AYUSH HISTORY
-----------------------------------------

Only if departmentMode = ayush.

Clearly label patient-reported information.

No automatic dosha diagnosis.

No treatment recommendation.

-----------------------------------------
SOURCE / VERIFICATION STATUS
-----------------------------------------

Patient confirmed ✓
Ready for physician review ✓

Do not show physician verification as completed.

==================================================
STEP 5 — SOURCE BADGES
==================================================

Use:

🗣 Patient
📄 Document
🏥 ABDM

For multi-source information:

🗣 📄 🏥

The source must remain traceable.

The PDF may use compact source labels,
while the doctor dashboard retains full SourceTruthPanel functionality.

==================================================
STEP 6 — PATIENT REVIEW EXPERIENCE
==================================================

The existing patient review page must be improved.

Instead of showing a loose collection of text fields:

show a clean patient-readable preview of the structured clinical summary.

The patient should be able to:

- review sections
- correct permitted information
- confirm the report

The patient must NOT:

- change source records
- change ABDM records
- change document OCR
- change security state
- mark the medical information as physician-verified

==================================================
STEP 7 — CONFIRMATION GATE
==================================================

Require explicit confirmation.

Example:

"I have reviewed the information above and confirm that it
accurately represents the information I provided."

[ CONFIRM & SEND TO DOCTOR ]

Do not allow sending without confirmation.

Prevent duplicate submission.

The server must be authoritative.

Do not rely only on frontend button state.

==================================================
STEP 8 — PDF GENERATION
==================================================

Create a server-side PDF rendering service.

Preferred architecture:

ClinicalConsultationSummary
        ↓
PDF Renderer
        ↓
PDF Buffer / Blob
        ↓
Private Supabase Storage
        ↓
PDF reference

The PDF must be generated server-side.

Do not expose server credentials.

Do not use browser-only rendering as the source of the persisted PDF.

==================================================
STEP 9 — PDF DESIGN
==================================================

Use the supplied PDF as the visual reference.

Target:

- professional hospital document appearance
- clean typography
- strong section hierarchy
- restrained visual styling
- excellent whitespace
- readable tables
- compact source indicators
- consistent footer
- page numbers
- report title
- patient identification header

Do not copy exact visual assets that are not project-owned.

Recreate the layout using the application's own design system.

==================================================
STEP 10 — PAGE STRUCTURE
==================================================

Use approximately:

PAGE 1

Patient
Attention
Current Complaint
Patient's Own Words
HPI
Medications
Allergies

PAGE 2

Structured Clinical History
Relevant Previous History
Investigations
Family / Personal / Social
Review of Systems
Information Not Reported

PAGE 3

Relevant Medical Journey
Documents
ABDM Context
AYUSH if applicable
Source / Handoff Status

However:

Do NOT force exactly 3 pages.

The renderer must adapt naturally based on content length.

A short report may be 1–2 pages.

A complex report may require additional pages.

==================================================
STEP 11 — PAGE BREAK LOGIC
==================================================

Prevent:

- headings at bottom of page
- orphaned rows
- split critical tables
- overlapping content
- clipped text

Use appropriate page-break rules.

Long patient statements must wrap safely.

Long medication lists must continue on the next page cleanly.

==================================================
STEP 12 — PDF SNAPSHOT
==================================================

After patient confirmation:

1. Load authoritative structured report data.
2. Apply patient corrections.
3. Validate the final report schema.
4. Generate PDF.
5. Store PDF securely.
6. Create a report/PDF snapshot reference.
7. Update session state to `sent_to_doctor`.
8. Create appropriate audit event.

The PDF must correspond exactly to the confirmed patient state.

Do NOT regenerate a different report when the doctor opens the case.

==================================================
STEP 13 — DATABASE / STORAGE
==================================================

Inspect the existing:

clinical_reports

architecture.

Prefer extending the current model if appropriate.

If adding PDF metadata, support fields such as:

reportId
reportVersion
sessionId
storagePath
generatedAt
patientConfirmedAt

Do not store the full binary PDF inside PostgreSQL.

Store the file in private Supabase Storage.

Do not expose a public permanent URL.

==================================================
STEP 14 — DOCTOR DASHBOARD
==================================================

Update:

/doctor/patient/[sessionId]

to provide:

### Clinical Consultation Summary

A readable interactive representation.

And:

[Open PDF]
[Download PDF]

The dashboard and PDF must come from the same
ClinicalConsultationSummary object.

Do NOT separately reconstruct the report in the dashboard.

==================================================
STEP 15 — DOCTOR ACCESS
==================================================

Respect the existing security architecture.

The doctor must only access the report after:

session.status = sent_to_doctor

or another explicitly authorized state already implemented.

Do not change RLS/security architecture for convenience.

==================================================
STEP 16 — PDF DOWNLOAD SECURITY
==================================================

When doctor requests PDF:

- authenticate doctor
- authorize case
- verify handoff state
- verify PDF belongs to the session
- generate a short-lived signed URL or securely stream the PDF

Do not expose public storage URLs.

==================================================
STEP 17 — REPORT VERSIONING
==================================================

At minimum track:

Draft
Patient-confirmed handoff report

Physician verification is future functionality.

If the current system already has report versioning,
reuse it rather than creating a competing version system.

==================================================
STEP 18 — AI ROLE
==================================================

Gemini or any other AI provider must NOT determine:

- section structure
- page structure
- formatting
- which report fields are required
- patient confirmation
- handoff state

AI may assist upstream in:

- language understanding
- explicit fact extraction
- adaptive questioning
- draft wording

The final PDF structure must be deterministic.

==================================================
STEP 19 — RAG / NLP COMPATIBILITY
==================================================

The report architecture must remain compatible with future:

- local NLP
- clinical NER
- embeddings
- vector search
- RAG
- local LLM

Do not couple the report renderer to Gemini.

Any compliant:

Structured Clinical Facts

object should be able to feed the report composer.

==================================================
STEP 20 — NO PHYSICIAN VERIFICATION
==================================================

Do NOT implement:

- Physician verification
- Physician approval
- Physician sign-off
- Final physician status
- Physician editing in this phase

These are explicitly FUTURE IMPLEMENTATION.

==================================================
STEP 21 — SECURITY
==================================================

Ensure:

- no secrets in client code
- no service-role key in browser
- no Gemini secret in browser
- no public medical PDF URLs
- no report content in QR tokens
- no report content in query strings
- no unnecessary medical data in logs

==================================================
STEP 22 — TEST SCENARIOS
==================================================

Create/test:

### A. Short normal report
→ compact PDF

### B. Complex report
→ multi-page PDF without layout breaks

### C. AYUSH report
→ AYUSH section appears

### D. General medicine
→ AYUSH section absent

### E. No relevant history
→ no unnecessary timeline

### F. Multiple historical records
→ complaint-centric timeline

### G. Multi-source fact
→ patient/document/ABDM badges

### H. Conflict
→ conflict clearly shown

### I. Missing information
→ "Not reported"

### J. Patient correction
→ corrected value appears in confirmed report

### K. Confirmation
→ PDF generated only after confirmation

### L. Duplicate confirmation
→ no duplicate handoff/PDF

### M. Unauthorized doctor
→ PDF inaccessible

### N. Unfinished patient
→ PDF inaccessible to doctor

### O. PDF download authorization
→ unauthorized download rejected

==================================================
STEP 23 — REGRESSION
==================================================

Verify that this implementation does not break:

- adaptive interview
- voice
- touch
- multilingual input
- documents
- OCR
- ABDM
- complaint relevance
- timeline
- attention engine
- AYUSH
- Source Truth
- patient corrections
- patient confirmation
- doctor queue
- FHIR architecture
- Supabase Auth
- RLS
- existing mock mode
- existing real mode

==================================================
STEP 24 — BUILD
==================================================

Run:

npm run lint
npx tsc --noEmit
npm run build

Do not disable rules to hide issues.

Do not use `any` to bypass typing.

==================================================
STEP 25 — FINAL REPORT
==================================================

Report:

1. ClinicalConsultationSummary schema
2. Report composition logic
3. Patient review changes
4. PDF renderer
5. PDF storage
6. PDF snapshot lifecycle
7. Confirmation gate
8. Doctor dashboard integration
9. Download security
10. Source/provenance handling
11. Complaint-centric timeline
12. AYUSH behavior
13. Conflict behavior
14. Missing information behavior
15. Report versioning
16. AI role
17. RAG/NLP compatibility
18. Tests
19. Regression tests
20. Security checks
21. Lint
22. TypeScript
23. Build
24. Known limitations

Explicitly state:

- what is implemented
- what remains prototype-level
- what remains future implementation
- whether PDF generation is deterministic
- whether Gemini is required for PDF generation

IMPORTANT:

The final answer/report must clearly state:

"PDF generation does not require Gemini."

The report composer must be able to generate the final PDF from
structured clinical data alone.

STOP after the final report.

DO NOT begin physician verification or printing automatically.
One architectural change I strongly recommend

Your doctor dashboard should not simply receive a PDF.

It should receive:

ClinicalConsultationSummary
        ├── Interactive dashboard
        └── PDF renderer

That gives you:

                    Clinical Report
                         │
               ┌─────────┴─────────┐
               ↓                   ↓
       Doctor Dashboard            PDF
               ↓                   ↓
        Source Truth            Download
        Conflicts               Print later
        Timeline
        Documents

So if you later add your local NLP/RAG architecture, nothing changes in the PDF system. Only the structured facts entering the report composer change.

The reference you've provided already gives us a very good model for the final hierarchy: patient → attention → complaint/HPI → medications/allergies → structured history → relevant history → investigations → ROS/missing information → complaint-centric medical journey → documents → ABDM context.

That should now become the canonical MediKiosk report format, with all medical content dynamically populated from each patient's data.