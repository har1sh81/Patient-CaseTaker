# MediKiosk — Clinical Consultation Summary Architecture

## 1. Report Purpose & Objective
The **Clinical Consultation Summary** serves as the canonical output of the MediKiosk intake system. It consolidates patient-reported intake answers, processed medical documents, digital health context (ABDM), attention safety flags, and AYUSH data into a single, source-grounded, deterministic clinical document.

The summary object (`ClinicalConsultationSummary`) is designed to power both the interactive Doctor Dashboard (`/doctor/patient/[sessionId]`) and server-side PDF generation.

---

## 2. Report Lifecycle & Status Gates

```
       DRAFT
         │
         ▼
  PATIENT REVIEW  <── [Patient Corrections Allowed]
         │
         ▼
PATIENT CONFIRMED (Handoff Authority)
         │
         ▼
  READY FOR DOCTOR (PDF Snapshot + Doctor Dashboard Queue)
```

- **DRAFT**: Created dynamically during intake interview & document processing.
- **PATIENT REVIEW**: Presented to the patient on the kiosk screen for verification & correction.
- **PATIENT CONFIRMED**: Explicit patient confirmation gate. Freezes intake state and triggers handoff.
- **READY FOR DOCTOR**: Session status transitions to `sent_to_doctor`. Available on Doctor Dashboard and downloadable as PDF.

*Note: Physician verification, editing, and EMR export are explicitly deferred to future releases.*

---

## 3. Data Sources & Source Precedence Policy

### Data Sources
1. **🗣 Patient**: Direct voice, touch, or text responses during kiosk intake interview.
2. **📄 Document**: OCR and structured extractions from uploaded lab reports, prescriptions, or discharge summaries.
3. **🏥 ABDM**: Retreived health records from the Ayushman Bharat Digital Mission catalog.

### Precedence Policy for Report Composition
When displaying facts across multiple sources, MediKiosk enforces the following display precedence:
1. **Patient-Confirmed Correction**: Patient explicit edits made during kiosk review.
2. **Patient-Reported Current Information**: Latest interview answers provided in current visit.
3. **Document-Derived Information**: OCR extractions from validated patient uploads.
4. **ABDM Historical Records**: Federated digital health records.
5. **AI-Organized Draft Representation**: Upstream structured fact extraction.

*Rule: Precedence determines display ordering and default values. It NEVER silently overwrites conflicting sources — all conflicting values remain explicitly visible.*

---

## 4. Section-by-Section Data Contract (`ClinicalConsultationSummary`)

| Section ID | Name | Source | Required | AI Assistance | Deterministic | Missing Data Behavior | Provenance Badge |
|---|---|---|---|---|---|---|---|
| `patient` | Patient Info | Patient DB | Yes | No | Yes | "Not reported" | System / Patient |
| `visit` | Intake & Visit | Session DB | Yes | No | Yes | "Not reported" | Kiosk |
| `attentionFlags` | Attention Flags | Attention Engine | No | No | Yes | Omit section | System Rule |
| `chiefComplaint` | Current Complaint | Kiosk Interview | Yes | Extraction | Yes | "Not reported" | 🗣 Patient |
| `hpi` | History of Present Illness | Kiosk Interview | Yes | Extraction | Yes | Field = "Not reported" | 🗣 Patient |
| `relevantPreviousHistory`| Relevant Previous History| Relevance Engine | No | No | Yes | "No relevant history found" | 🗣 📄 🏥 |
| `medications` | Current Medications | Intake + ABDM | No | Extraction | Yes | "No regular meds reported" | 🗣 📄 🏥 |
| `allergies` | Allergies | Intake + ABDM | No | Extraction | Yes | "No known allergies" | 🗣 📄 🏥 |
| `investigations` | Lab Reports | Documents | No | OCR / Extract | Yes | Omit section | 📄 Document |
| `familyHistory` | Family History | Kiosk Interview | No | No | Yes | Omit section | 🗣 Patient |
| `personalHistory` | Personal History | Kiosk Interview | No | No | Yes | Omit section | 🗣 Patient |
| `socialHistory` | Social History | Kiosk Interview | No | No | Yes | Omit section | 🗣 Patient |
| `reviewOfSystems` | Review of Systems | Kiosk Interview | No | No | Yes | Field = "Not reported" | 🗣 Patient |
| `informationNotReported`| Missing Information | Composer | Yes | No | Yes | List missing fields | System |
| `medicalJourney` | Complaint Timeline | Timeline Fusion | No | No | Yes | Omit timeline | 🗣 📄 🏥 |
| `uploadedDocuments` | Uploaded Documents | Storage DB | Yes | OCR | Yes | "No documents uploaded" | 📄 Document |
| `abdmContext` | ABDM Context | ABDM Provider | No | No | Yes | "No relevant ABDM records" | 🏥 ABDM |
| `ayush` | AYUSH Assessment | Kiosk Intake | Conditional | No | Yes | Omit if not AYUSH | 🗣 Patient |
| `patientConfirmation` | Handoff Status | Kiosk Review | Yes | No | Yes | Require Confirmation | Kiosk Gate |

---

## 5. Missing-Data Policy
- **Rule**: Missing information MUST be explicitly rendered as `"Not reported"` (or `"No regular medications reported"`).
- **Negative Inferences Prohibited**: Unanswered questions must NEVER be converted into negative clinical findings. (e.g. Unanswered smoking question = `"Smoking: Not reported"`, NOT `"Smoking: No"`).

---

## 6. Conflict Representation Policy
- Conflicting medication doses or condition statuses across sources (e.g. Patient: 5mg vs ABDM: 10mg) are flagged as `CONFLICTING INFORMATION`.
- Displayed side-by-side with explicit source provenance (`🗣 Patient: 5mg` vs `🏥 ABDM: 10mg`).
- The composer performs **NO automatic clinical resolution**. Resolution is deferred to physician workspace.

---

## 7. Complaint-Centric Relevance Rules (Phase 15A Integration)
- Previous medical conditions, hospital admissions, and timeline events are filtered using the complaint-relevance engine.
- Only historical records matching the current chief complaint category (e.g., cardiac history for chest pain) are displayed under `Relevant Previous History`.
- Full patient history is available in the detailed timeline drawer without cluttering the summary.

---

## 8. Deterministic Attention Engine Rules
- Attention flags (e.g., severe chest pain, high fever) are evaluated deterministically by the rule engine.
- Renders severity (`high`, `critical`) and safe warning copy.
- **AI Prohibited**: The report composer does NOT reinterpret or alter attention flags, and NEVER generates diagnoses or treatment prescriptions.

---

## 9. AYUSH Section Rules
- Only rendered when `session.departmentMode === 'ayush'`.
- Displays patient-reported Prakriti, Agni, and Koshtha responses.
- Explicitly labeled: `"Patient-reported — Requires practitioner assessment"`.
- Prohibits automatic dosha diagnosis or herbal treatment recommendations.

---

## 10. Provenance & Source Badges
- Every clinical fact displays compact visual badges:
  - 🗣 **Patient** (Patient-reported in interview)
  - 📄 **Document** (Extracted from uploaded medical document)
  - 🏥 **ABDM** (Retrieved from Ayushman Bharat Digital Mission)
- Full evidence text and confidence scores remain inspectable via the Doctor Dashboard `SourceTruthPanel`.

---

## 11. AI Independence & Fallback Guarantee
- Upstream AI (Gemini) is used strictly for fact extraction and adaptive questioning.
- The `ClinicalReportComposer` is 100% deterministic TypeScript code.
- **Fallback Guarantee**: If Gemini/AI is offline or `AI_PROVIDER=mock`, the composer successfully generates the complete, valid `ClinicalConsultationSummary` from raw structured answers, OCR results, and ABDM data alone.

---

## 12. Dashboard & PDF Consumption Architecture

```
                  ClinicalConsultationSummary
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       Doctor Dashboard                  PDF Renderer
 (Interactive Level 1 & 2 View)      (Downloadable / Printable)
               │                               │
               ▼                               ▼
      SourceTruthPanel &               Hospital Archive &
     Conflict Resolution                EMR Print Copy
```

- A single `ClinicalConsultationSummary` object feeds both the interactive dashboard and the server-side PDF generator.
- Ensures 100% consistency between screen and printed PDF.

---

## 13. FHIR Compatibility
- The `ClinicalConsultationSummary` maps directly to FHIR R4 resources:
  - `Patient` ➡️ `Patient`
  - `chiefComplaint` / `hpi` ➡️ `Condition` (encounter-diagnosis)
  - `medications` ➡️ `MedicationStatement`
  - `investigations` ➡️ `Observation`
  - `uploadedDocuments` ➡️ `DocumentReference`
