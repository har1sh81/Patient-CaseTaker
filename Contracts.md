MediKiosk — Complete System Data Contracts & JSON Specifications
1. Contract Architecture Rules

MediKiosk must not allow every component, AI response, database record, and API route to invent its own data shape.

There must be a single canonical data contract system.

Required architecture
src/
├── types/
│   ├── common.types.ts
│   ├── patient.types.ts
│   ├── consent.types.ts
│   ├── session.types.ts
│   ├── conversation.types.ts
│   ├── clinical-history.types.ts
│   ├── document.types.ts
│   ├── lab.types.ts
│   ├── medication.types.ts
│   ├── timeline.types.ts
│   ├── flag.types.ts
│   ├── ayush.types.ts
│   ├── report.types.ts
│   ├── ai.types.ts
│   ├── voice.types.ts
│   ├── print.types.ts
│   ├── demo.types.ts
│   ├── audit.types.ts
│   └── api.types.ts
│
├── schemas/
│   ├── common.schema.ts
│   ├── patient.schema.ts
│   ├── consent.schema.ts
│   ├── session.schema.ts
│   ├── conversation.schema.ts
│   ├── clinical-history.schema.ts
│   ├── document.schema.ts
│   ├── lab.schema.ts
│   ├── medication.schema.ts
│   ├── timeline.schema.ts
│   ├── flag.schema.ts
│   ├── ayush.schema.ts
│   ├── report.schema.ts
│   ├── ai.schema.ts
│   ├── voice.schema.ts
│   ├── print.schema.ts
│   ├── demo.schema.ts
│   ├── audit.schema.ts
│   └── api.schema.ts
│
├── data/
│   ├── questions/
│   │   ├── standard-intake.json
│   │   ├── chief-complaint.json
│   │   ├── hpi.json
│   │   ├── past-history.json
│   │   ├── medications.json
│   │   ├── allergies.json
│   │   ├── family-history.json
│   │   ├── personal-history.json
│   │   ├── review-of-systems.json
│   │   └── ayush-intake.json
│   │
│   ├── red-flags/
│   │   └── deterministic-rules.json
│   │
│   ├── demo/
│   │   ├── standard-patient.json
│   │   ├── attention-case.json
│   │   └── ayush-patient.json
│   │
│   └── config/
│       ├── languages.json
│       └── departments.json
│
├── services/
│   ├── patient.service.ts
│   ├── session.service.ts
│   ├── conversation.service.ts
│   ├── ai.service.ts
│   ├── speech.service.ts
│   ├── document.service.ts
│   ├── ocr.service.ts
│   ├── extraction.service.ts
│   ├── flag.service.ts
│   ├── ayush.service.ts
│   ├── report.service.ts
│   ├── qr.service.ts
│   ├── print.service.ts
│   └── audit.service.ts
│
└── lib/
    ├── ids.ts
    ├── dates.ts
    ├── validation.ts
    └── constants.ts
2. Common Contracts

Every major object should share standard metadata.

export type ISODateString = string;
export type UUID = string;
export type EntityId = string;

export interface BaseEntity {
  id: EntityId;
  createdAt: ISODateString;
  updatedAt?: ISODateString;
}
Processing Status
export type ProcessingStatus =
  | "idle"
  | "pending"
  | "uploading"
  | "processing"
  | "completed"
  | "failed"
  | "requires_review";
Confidence Level
export type ConfidenceLevel =
  | "high"
  | "medium"
  | "low"
  | "unknown";
Source Type

Every piece of clinical information should ideally record where it came from.

export type DataSourceType =
  | "patient_voice"
  | "patient_touch"
  | "patient_text"
  | "uploaded_document"
  | "ocr"
  | "ai_extraction"
  | "system_rule"
  | "demo_data"
  | "physician";
Data Provenance
export interface DataProvenance {
  source: DataSourceType;
  sourceId?: string;
  documentId?: string;
  conversationMessageId?: string;
  extractedAt?: ISODateString;
  confidence?: ConfidenceLevel;
}

This is important because the final report should distinguish between:

Patient said it
        ≠
Information extracted from document
        ≠
Information structured by AI
        ≠
Information entered by physician
3. Patient Contract
export interface Patient {
  id: string;

  identification: {
    hospitalNumber?: string;
    abhaReference?: string;
    mobileNumber?: string;
    externalReference?: string;
  };

  demographics: {
    firstName: string;
    lastName?: string;
    fullName: string;
    dateOfBirth?: string;
    age?: number;
    gender?: "male" | "female" | "other" | "prefer_not_to_say";
  };

  contact?: {
    mobileNumber?: string;
  };

  createdAt: string;
  updatedAt?: string;
}

Example:

{
  "id": "patient_demo_001",
  "identification": {
    "hospitalNumber": "HSP-100245",
    "abhaReference": "ABHA-DEMO-001"
  },
  "demographics": {
    "firstName": "Arun",
    "fullName": "Arun Kumar",
    "age": 45,
    "gender": "male"
  },
  "createdAt": "2026-08-26T10:30:00Z"
}
4. Consent Contract

Consent must be explicit and session-specific.

export interface Consent {
  id: string;
  patientId: string;
  sessionId: string;

  consentVersion: string;

  permissions: {
    intakeCollection: boolean;
    voiceProcessing: boolean;
    documentProcessing: boolean;
    aiAssistedStructuring: boolean;
    reportGeneration: boolean;
  };

  accepted: boolean;
  acceptedAt?: string;

  language: SupportedLanguage;
  source: "touchscreen" | "demo";

  withdrawnAt?: string;
}
5. Language Contract
export type SupportedLanguage =
  | "en"
  | "hi"
  | "ta";

Language configuration:

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  enabled: boolean;
}

Example:

[
  {
    "code": "en",
    "name": "English",
    "nativeName": "English",
    "enabled": true
  },
  {
    "code": "hi",
    "name": "Hindi",
    "nativeName": "हिन्दी",
    "enabled": true
  },
  {
    "code": "ta",
    "name": "Tamil",
    "nativeName": "தமிழ்",
    "enabled": true
  }
]
6. Intake Session Contract

This is one of the most important objects in the whole system.

export type IntakeSessionStatus =
  | "created"
  | "identifying_patient"
  | "awaiting_consent"
  | "active"
  | "review"
  | "report_ready"
  | "printing"
  | "completed"
  | "cancelled"
  | "expired";

export interface IntakeSession {
  id: string;

  patientId?: string;

  status: IntakeSessionStatus;

  language: SupportedLanguage;

  departmentMode: DepartmentMode;

  consentId?: string;

  startedAt: string;
  expiresAt?: string;
  completedAt?: string;

  currentStep: string;

  progress: {
    completedSections: string[];
    pendingSections: string[];
    percentage: number;
  };

  cleanupStatus: {
    temporaryDataDeleted: boolean;
    cleanedAt?: string;
  };
}
7. Department Mode Contract
export type DepartmentMode =
  | "standard"
  | "ayush";

Later this can expand without changing the entire application:

export interface Department {
  id: string;
  name: string;
  mode: DepartmentMode;
  enabled: boolean;
}
8. Conversation Question Contract

All questions should follow one standard structure.

export type QuestionInputType =
  | "voice"
  | "text"
  | "yes_no"
  | "single_choice"
  | "multiple_choice"
  | "number"
  | "date"
  | "scale";

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
}

export interface Question {
  id: string;

  section: ClinicalSection;

  question: {
    en: string;
    hi?: string;
    ta?: string;
  };

  inputType: QuestionInputType;

  options?: QuestionOption[];

  required: boolean;

  allowVoice: boolean;
  allowTouch: boolean;

  followUpRules?: FollowUpRule[];

  helpText?: {
    en?: string;
    hi?: string;
    ta?: string;
  };

  displayOrder: number;
}
9. Follow-up Routing Contract
export interface FollowUpRule {
  condition: {
    fieldId: string;
    operator:
      | "equals"
      | "not_equals"
      | "contains"
      | "exists"
      | "greater_than"
      | "less_than";
    value?: string | number | boolean;
  };

  nextQuestionId: string;
}

Example:

{
  "id": "allergy_question",
  "section": "allergies",
  "question": {
    "en": "Do you have any known allergies?"
  },
  "inputType": "yes_no",
  "required": true,
  "allowVoice": true,
  "allowTouch": true,
  "followUpRules": [
    {
      "condition": {
        "fieldId": "allergy_question",
        "operator": "equals",
        "value": true
      },
      "nextQuestionId": "allergy_details"
    }
  ],
  "displayOrder": 1
}
10. Answer Contract
export interface ConversationAnswer {
  id: string;

  sessionId: string;
  questionId: string;

  section: ClinicalSection;

  rawValue: unknown;

  normalizedValue?: unknown;

  inputMethod:
    | "voice"
    | "touch"
    | "keyboard"
    | "demo";

  transcript?: string;

  provenance: DataProvenance;

  answeredAt: string;

  editedByPatient: boolean;
}
11. Conversation Message Contract

For voice conversations:

export type ConversationSpeaker =
  | "system"
  | "patient"
  | "ai";

export interface ConversationMessage {
  id: string;

  sessionId: string;

  speaker: ConversationSpeaker;

  content: string;

  language: SupportedLanguage;

  timestamp: string;

  linkedQuestionId?: string;

  speechMetadata?: {
    durationMs?: number;
    confidence?: number;
  };
}
12. Speech-to-Text Contract

The speech provider must be replaceable.

export interface SpeechToTextRequest {
  audio: Blob | File;
  language: SupportedLanguage;
  sessionId: string;
}

export interface SpeechToTextResponse {
  transcript: string;

  confidence?: number;

  language: SupportedLanguage;

  status: ProcessingStatus;

  error?: string;
}
13. Text-to-Speech Contract
export interface TextToSpeechRequest {
  text: string;
  language: SupportedLanguage;
  rate?: number;
}

export interface TextToSpeechResponse {
  status: ProcessingStatus;
  error?: string;
}
14. Clinical Section Contract
export type ClinicalSection =
  | "chief_complaint"
  | "hpi"
  | "past_medical_history"
  | "past_surgical_history"
  | "medications"
  | "allergies"
  | "family_history"
  | "personal_history"
  | "social_history"
  | "review_of_systems"
  | "documents"
  | "ayush";
15. Chief Complaint Contract
export interface ChiefComplaint {
  primaryComplaint: string;

  additionalComplaints: string[];

  duration?: {
    value?: number;
    unit?: "hours" | "days" | "weeks" | "months" | "years";
    rawText?: string;
  };

  provenance: DataProvenance;
}
16. History of Present Illness Contract
export interface HistoryOfPresentIllness {
  onset?: string;

  duration?: string;

  location?: string;

  character?: string;

  severity?: {
    score?: number;
    scale?: "0_10" | "mild_moderate_severe";
  };

  timing?: string;

  progression?: string;

  aggravatingFactors?: string[];

  relievingFactors?: string[];

  associatedSymptoms?: string[];

  patientNarrative?: string;

  completeness: {
    missingFields: string[];
    completedFields: string[];
  };
}
17. Past Medical History Contract
export interface MedicalConditionHistory {
  id: string;

  conditionName: string;

  diagnosedDate?: string;

  status:
    | "active"
    | "past"
    | "unknown";

  notes?: string;

  provenance: DataProvenance;
}
18. Surgical History Contract
export interface SurgicalHistoryItem {
  id: string;

  procedureName: string;

  date?: string;

  hospital?: string;

  notes?: string;

  provenance: DataProvenance;
}
19. Medication Contract

This must support both patient-entered and document-extracted medicines.

export interface Medication {
  id: string;

  name: string;

  dosage?: string;

  frequency?: string;

  route?: string;

  startDate?: string;

  status:
    | "active"
    | "past"
    | "unknown";

  rawText?: string;

  provenance: DataProvenance;
}
20. Allergy Contract
export interface Allergy {
  id: string;

  allergen: string;

  category:
    | "drug"
    | "food"
    | "environmental"
    | "other"
    | "unknown";

  reaction?: string;

  severity?: string;

  provenance: DataProvenance;
}
21. Family History Contract
export interface FamilyHistoryItem {
  id: string;

  relationship: string;

  condition: string;

  status?: string;

  notes?: string;

  provenance: DataProvenance;
}
22. Personal and Social History Contract
export interface PersonalHistory {
  diet?: string;

  sleep?: string;

  bowelHabits?: string;

  urinaryHabits?: string;

  activityLevel?: string;

  otherNotes?: string;

  provenance?: DataProvenance;
}

export interface SocialHistory {
  occupation?: string;

  lifestyleNotes?: string;

  otherNotes?: string;

  provenance?: DataProvenance;
}
23. Review of Systems Contract
export interface ReviewOfSystemItem {
  system:
    | "general"
    | "cardiovascular"
    | "respiratory"
    | "gastrointestinal"
    | "neurological"
    | "musculoskeletal"
    | "genitourinary"
    | "skin"
    | "endocrine"
    | "psychiatric"
    | "other";

  symptoms: string[];

  notes?: string;

  completed: boolean;
}

export interface ReviewOfSystems {
  systems: ReviewOfSystemItem[];
}
24. Complete Clinical History Contract

This becomes the main structured clinical record.

export interface ClinicalHistory {
  id: string;

  sessionId: string;
  patientId: string;

  chiefComplaint?: ChiefComplaint;

  historyOfPresentIllness?: HistoryOfPresentIllness;

  pastMedicalHistory: MedicalConditionHistory[];

  pastSurgicalHistory: SurgicalHistoryItem[];

  medications: Medication[];

  allergies: Allergy[];

  familyHistory: FamilyHistoryItem[];

  personalHistory?: PersonalHistory;

  socialHistory?: SocialHistory;

  reviewOfSystems?: ReviewOfSystems;

  sourceSummary: {
    patientInterviewCompleted: boolean;
    documentsProcessed: number;
  };

  createdAt: string;
  updatedAt: string;
}
25. Adaptive AI Request Contract

The AI should not receive unrestricted responsibility.

export interface AdaptiveQuestionRequest {
  sessionId: string;

  language: SupportedLanguage;

  currentSection: ClinicalSection;

  latestAnswer: ConversationAnswer;

  structuredHistory: Partial<ClinicalHistory>;

  allowedQuestionIds: string[];

  questionBankContext: Question[];

  maxQuestionsForSection?: number;
}
26. Adaptive AI Response Contract

The AI must return JSON matching this contract.

export interface AdaptiveQuestionResponse {
  extractedFacts: ExtractedClinicalFact[];

  missingInformation: MissingInformationItem[];

  nextAction:
    | "ask_question"
    | "continue_section"
    | "complete_section";

  nextQuestion?: AdaptiveQuestion;

  confidence: ConfidenceLevel;

  reasoningSummary?: string;
}

The internal model should not expose hidden chain-of-thought. reasoningSummary must only be a short structured explanation suitable for logs, not private reasoning.

export interface ExtractedClinicalFact {
  field: string;
  value: string | number | boolean | string[];

  confidence: ConfidenceLevel;

  sourceMessageId?: string;
}

export interface MissingInformationItem {
  field: string;

  importance:
    | "required"
    | "recommended"
    | "optional";
}

export interface AdaptiveQuestion {
  id: string;

  section: ClinicalSection;

  question: string;

  purpose: string;

  inputType: QuestionInputType;

  options?: QuestionOption[];
}
27. AI Safety Contract

Every AI service should return:

export interface AIResponseMetadata {
  provider: string;

  model: string;

  timestamp: string;

  validationPassed: boolean;

  fallbackUsed: boolean;

  safetyConstraintsApplied: string[];
}

Required constraints:

NO DIAGNOSIS
NO TREATMENT RECOMMENDATION
NO PRESCRIPTION
NO CLAIM OF CLINICAL CERTAINTY
NO AUTONOMOUS TRIAGE DECISION
28. Medical Document Contract
export type MedicalDocumentType =
  | "prescription"
  | "laboratory_report"
  | "discharge_summary"
  | "scan"
  | "medical_note"
  | "other"
  | "unknown";

export interface MedicalDocument {
  id: string;

  sessionId: string;
  patientId: string;

  fileName: string;

  mimeType: string;

  storagePath?: string;

  documentType: MedicalDocumentType;

  documentDate?: string;

  uploadStatus: ProcessingStatus;

  uploadedAt: string;

  provenance: DataProvenance;
}
29. OCR Contract
export interface OCRRequest {
  documentId: string;

  storagePath?: string;

  languageHints?: SupportedLanguage[];
}

export interface OCRResponse {
  documentId: string;

  rawText: string;

  pages: OCRPage[];

  confidence: ConfidenceLevel;

  status: ProcessingStatus;

  error?: string;
}

export interface OCRPage {
  pageNumber: number;

  text: string;

  confidence?: number;
}
30. Document Intelligence Contract

After OCR, the document intelligence pipeline returns structured information.

export interface DocumentExtractionResult {
  documentId: string;

  documentType: MedicalDocumentType;

  documentDate?: string;

  extractionStatus: ProcessingStatus;

  diagnosesMentioned: ExtractedCondition[];

  medications: Medication[];

  procedures: ExtractedProcedure[];

  laboratoryResults: LabResult[];

  admissions: HospitalAdmission[];

  timelineEvents: MedicalTimelineEvent[];

  unstructuredSummary?: string;

  confidence: ConfidenceLevel;
}

Important: diagnosesMentioned means diagnoses mentioned in an uploaded record, not new diagnoses made by MediKiosk.

31. Extracted Condition Contract
export interface ExtractedCondition {
  name: string;

  status:
    | "mentioned"
    | "historical"
    | "active_if_document_indicates"
    | "unknown";

  sourceText?: string;

  provenance: DataProvenance;
}
32. Procedure Contract
export interface ExtractedProcedure {
  name: string;

  date?: string;

  notes?: string;

  provenance: DataProvenance;
}
33. Hospital Admission Contract
export interface HospitalAdmission {
  admissionDate?: string;

  dischargeDate?: string;

  hospital?: string;

  reason?: string;

  summary?: string;

  provenance: DataProvenance;
}
34. Laboratory Result Contract
export interface LabResult {
  id: string;

  testName: string;

  valueRaw: string;

  numericValue?: number;

  unit?: string;

  referenceRangeRaw?: string;

  referenceRange?: {
    lower?: number;
    upper?: number;
  };

  documentProvidedRange: boolean;

  testDate?: string;

  sourceDocumentId: string;

  provenance: DataProvenance;
}

Important: the system should prefer the reference range actually provided by the uploaded laboratory report.

35. Medical Timeline Contract
export type MedicalTimelineEventType =
  | "symptom"
  | "diagnosis_mentioned"
  | "medication"
  | "procedure"
  | "laboratory_test"
  | "hospital_admission"
  | "hospital_discharge"
  | "document"
  | "other";

export interface MedicalTimelineEvent {
  id: string;

  date?: string;

  eventType: MedicalTimelineEventType;

  title: string;

  description?: string;

  sourceDocumentId?: string;

  provenance: DataProvenance;
}
36. Deterministic Attention Rule Contract

Rules must be configuration-driven.

export type AttentionRuleCategory =
  | "red_flag"
  | "lab_attention"
  | "missing_information"
  | "medication_attention"
  | "document_attention";

export interface AttentionRule {
  id: string;

  category: AttentionRuleCategory;

  enabled: boolean;

  appliesTo: string;

  conditions: RuleCondition[];

  result: {
    severity:
      | "information"
      | "review"
      | "priority";

    label: string;

    message: string;

    requiresClinicalReview: boolean;
  };
}
Rule Condition
export interface RuleCondition {
  field: string;

  operator:
    | "equals"
    | "not_equals"
    | "exists"
    | "greater_than"
    | "less_than"
    | "outside_range"
    | "contains";

  value?: string | number | boolean;
}
37. Attention Flag Contract
export type FlagSeverity =
  | "information"
  | "review"
  | "priority";

export interface AttentionFlag {
  id: string;

  sessionId: string;

  category: AttentionRuleCategory;

  severity: FlagSeverity;

  label: string;

  message: string;

  sourceRuleId?: string;

  sourceData: {
    field?: string;
    documentId?: string;
    clinicalHistoryId?: string;
  };

  requiresClinicalReview: boolean;

  generatedAt: string;

  acknowledgedByPatient?: boolean;
}
38. Medication Attention Contract

For the prototype, keep this conservative.

export interface MedicationAttentionFinding {
  id: string;

  medicationsInvolved: string[];

  label: string;

  message: string;

  source: "demo_rule" | "configured_dataset";

  requiresPhysicianReview: true;
}

Never output:

"Stop taking this medicine"
"Take this instead"
"You have a dangerous interaction"

Use:

Potential Medication Finding — Requires Physician Review
39. AYUSH Intake Contract
export interface AyushIntake {
  enabled: boolean;

  prakriti?: AyushAssessmentItem;

  vikriti?: AyushAssessmentItem;

  agni?: AyushAssessmentItem;

  koshtha?: AyushAssessmentItem;

  ahara?: string[];

  vihara?: string[];

  dashavidhaPariksha?: DashavidhaPariksha;

  patientNotes?: string[];
}
AYUSH Assessment Item
export interface AyushAssessmentItem {
  value: string;

  method:
    | "patient_questionnaire"
    | "patient_reported";

  notes?: string;
}
40. Dashavidha Pariksha Contract
export interface DashavidhaPariksha {
  prakriti?: string;

  vikriti?: string;

  sara?: string;

  samhanana?: string;

  pramana?: string;

  satmya?: string;

  satva?: string;

  aharaShakti?: string;

  vyayamaShakti?: string;

  vaya?: string;
}

For the prototype, these are structured questionnaire fields, not an autonomous Ayurvedic diagnosis.

41. Patient Review Contract

Before generating the final report, the patient gets a reviewable version.

export interface PatientReviewState {
  sessionId: string;

  sections: PatientReviewSection[];

  status:
    | "pending"
    | "reviewing"
    | "confirmed";
}
export interface PatientReviewSection {
  section: ClinicalSection;

  title: string;

  summary: string;

  editable: boolean;

  status:
    | "complete"
    | "incomplete"
    | "confirmed";
}
42. Patient Correction Contract
export interface PatientCorrection {
  id: string;

  sessionId: string;

  fieldPath: string;

  previousValue: unknown;

  correctedValue: unknown;

  correctedBy: "patient";

  correctedAt: string;
}
43. Final Report Contract

This is the most important contract in MediKiosk.

Everything eventually flows into this object.

export interface ClinicalHistoryReport {
  reportId: string;

  reportVersion: string;

  generatedAt: string;

  sessionId: string;

  patient: PatientReportSection;

  visit: VisitReportSection;

  clinicalHistory: ClinicalHistoryReportSection;

  documentSummary: DocumentSummaryReportSection;

  medicalTimeline: MedicalTimelineEvent[];

  attentionFlags: AttentionFlag[];

  ayush?: AyushReportSection;

  patientConfirmation: ReportConfirmation;

  physicianVerification: PhysicianVerification;

  reference: ReportReference;
}
Patient Report Section
export interface PatientReportSection {
  fullName: string;

  age?: number;

  gender?: string;

  hospitalNumber?: string;

  abhaReference?: string;
}
Visit Report Section
export interface VisitReportSection {
  generatedDate: string;

  departmentMode: DepartmentMode;

  intakeLanguage: SupportedLanguage;

  reasonForVisit?: string;
}
Clinical History Report Section
export interface ClinicalHistoryReportSection {
  chiefComplaint?: ChiefComplaint;

  historyOfPresentIllness?: HistoryOfPresentIllness;

  pastMedicalHistory: MedicalConditionHistory[];

  pastSurgicalHistory: SurgicalHistoryItem[];

  medications: Medication[];

  allergies: Allergy[];

  familyHistory: FamilyHistoryItem[];

  personalHistory?: PersonalHistory;

  socialHistory?: SocialHistory;

  reviewOfSystems?: ReviewOfSystems;
}
44. Document Summary Report Contract
export interface DocumentSummaryReportSection {
  uploadedDocumentCount: number;

  documents: {
    id: string;
    type: MedicalDocumentType;
    date?: string;
    fileName: string;
  }[];

  extractedConditions: ExtractedCondition[];

  laboratoryResults: LabResult[];

  admissions: HospitalAdmission[];
}
45. AYUSH Report Contract
export interface AyushReportSection {
  prakriti?: string;

  vikriti?: string;

  agni?: string;

  koshtha?: string;

  ahara: string[];

  vihara: string[];

  dashavidhaPariksha?: DashavidhaPariksha;
}
46. Report Confirmation Contract
export interface ReportConfirmation {
  confirmedByPatient: boolean;

  confirmedAt?: string;

  correctionsMade: number;
}
47. Physician Verification Contract

The kiosk does not complete physician verification.

The paper report provides this area.

export interface PhysicianVerification {
  status:
    | "pending_physician_review"
    | "verified"
    | "corrected";

  physicianComments?: string;

  signatureRequired: boolean;

  signature?: string;

  verifiedAt?: string;
}
48. Report Reference Contract
export interface ReportReference {
  referenceNumber: string;

  qrPayload: string;

  generatedAt: string;
}

The QR code should contain a reference or safe lookup identifier, not raw medical information directly in the QR payload.

49. Print Job Contract
export interface PrintJob {
  id: string;

  reportId: string;

  status:
    | "ready"
    | "printing"
    | "print_dialog_opened"
    | "completed"
    | "failed";

  initiatedAt?: string;

  completedAt?: string;

  pageCount?: number;
}
50. Print Configuration Contract
export interface PrintConfiguration {
  paperSize: "A4";

  orientation: "portrait";

  targetPageCount: {
    min: 1;
    max: 2;
  };

  includeQrCode: boolean;

  includeColor: boolean;

  grayscaleCompatible: boolean;

  showPhysicianSignatureArea: boolean;
}
51. QR Contract
export interface QRCodeData {
  reportId: string;

  referenceNumber: string;

  generatedAt: string;

  version: string;
}

Example payload:

{
  "reportId": "MK-RPT-000001",
  "referenceNumber": "MK2026-000001",
  "version": "1"
}
52. Audit Log Contract
export type AuditAction =
  | "session_started"
  | "patient_identified"
  | "consent_accepted"
  | "question_answered"
  | "answer_edited"
  | "document_uploaded"
  | "document_processed"
  | "report_generated"
  | "print_started"
  | "print_completed"
  | "session_expired"
  | "session_cleaned"
  | "session_cancelled";

export interface AuditLog {
  id: string;

  sessionId?: string;

  action: AuditAction;

  entityType?: string;

  entityId?: string;

  timestamp: string;

  metadata?: Record<string, unknown>;
}

Do not store unnecessary sensitive raw data in audit metadata.

53. AI Provider Contract

This makes Gemini replaceable later.

export interface AIProvider {
  name: string;

  isConfigured(): Promise<boolean>;

  generateAdaptiveQuestion(
    request: AdaptiveQuestionRequest
  ): Promise<AdaptiveQuestionResponse>;

  structureDocument(
    request: DocumentIntelligenceRequest
  ): Promise<DocumentExtractionResult>;
}
54. Document Intelligence AI Request
export interface DocumentIntelligenceRequest {
  document: MedicalDocument;

  ocrText: string;

  patientId: string;

  outputSchemaVersion: string;
}
55. OCR Provider Contract
export interface OCRProvider {
  name: string;

  extractText(
    request: OCRRequest
  ): Promise<OCRResponse>;
}
56. Speech Provider Contract
export interface SpeechProvider {
  transcribe(
    request: SpeechToTextRequest
  ): Promise<SpeechToTextResponse>;

  speak(
    request: TextToSpeechRequest
  ): Promise<TextToSpeechResponse>;
}
57. Database Service Contract
export interface DatabaseService {
  createPatient(patient: Patient): Promise<Patient>;

  getPatient(id: string): Promise<Patient | null>;

  createSession(
    session: IntakeSession
  ): Promise<IntakeSession>;

  updateSession(
    id: string,
    update: Partial<IntakeSession>
  ): Promise<IntakeSession>;

  saveClinicalHistory(
    history: ClinicalHistory
  ): Promise<ClinicalHistory>;

  saveDocument(
    document: MedicalDocument
  ): Promise<MedicalDocument>;

  saveAuditLog(
    auditLog: AuditLog
  ): Promise<void>;
}
58. Mock Database Contract

Because the prototype must work even when cloud services fail:

export interface DataRepository {
  mode:
    | "supabase"
    | "mock";

  patient: DatabaseService;
}

The UI must not care whether the data came from:

Supabase
or
Mock Data
59. API Response Contract

All APIs should return a consistent response shape.

export interface ApiSuccess<T> {
  success: true;

  data: T;

  meta?: {
    requestId?: string;
    timestamp: string;
  };
}

export interface ApiError {
  success: false;

  error: {
    code: string;

    message: string;

    details?: unknown;
  };

  meta?: {
    requestId?: string;
    timestamp: string;
  };
}

export type ApiResponse<T> =
  | ApiSuccess<T>
  | ApiError;
60. API Route Contracts
Patient
POST /api/patients
GET  /api/patients/:id
Consent
POST /api/consents
Session
POST /api/sessions
PATCH /api/sessions/:id
POST /api/sessions/:id/complete
POST /api/sessions/:id/cleanup
Conversation
POST /api/conversation/answer
POST /api/conversation/next-question
Voice
POST /api/speech/transcribe
POST /api/speech/synthesize
Documents
POST /api/documents/upload
POST /api/documents/:id/ocr
POST /api/documents/:id/extract
Report
POST /api/reports/generate
GET  /api/reports/:id
Print
POST /api/reports/:id/print
61. Demo Scenario Contract
export interface DemoScenario {
  id: string;

  name: string;

  description: string;

  mode: DepartmentMode;

  estimatedDemoDurationMinutes: number;

  patient: Patient;

  consent: Partial<Consent>;

  session: Partial<IntakeSession>;

  conversation: DemoConversationStep[];

  documents: DemoDocument[];

  expectedClinicalHistory: Partial<ClinicalHistory>;

  expectedFlags: string[];

  expectedReportSummary: string;
}
Demo Conversation Step
export interface DemoConversationStep {
  questionId: string;

  patientResponse: string;

  transcript?: string;

  inputMethod:
    | "voice"
    | "touch";

  delayMs?: number;
}
62. Demo Document Contract
export interface DemoDocument {
  documentId: string;

  fileName: string;

  documentType: MedicalDocumentType;

  mockOcrText: string;

  expectedExtraction: Partial<DocumentExtractionResult>;
}
63. Application UI State Contract

The frontend needs one predictable state model.

export interface MediKioskAppState {
  activeSession: IntakeSession | null;

  patient: Patient | null;

  consent: Consent | null;

  clinicalHistory: Partial<ClinicalHistory>;

  documents: MedicalDocument[];

  flags: AttentionFlag[];

  patientReview: PatientReviewState | null;

  report: ClinicalHistoryReport | null;

  printJob: PrintJob | null;
}
64. Loading and Error State Contract
export interface AsyncState<T> {
  data: T | null;

  status:
    | "idle"
    | "loading"
    | "success"
    | "error";

  error?: {
    code?: string;
    message: string;
  };
}
65. Notification Contract
export type NotificationType =
  | "success"
  | "information"
  | "warning"
  | "error";

export interface Notification {
  id: string;

  type: NotificationType;

  title: string;

  message?: string;

  duration?: number;
}
66. Session Cleanup Contract
export interface SessionCleanupResult {
  sessionId: string;

  status:
    | "completed"
    | "partial"
    | "failed";

  deletedTemporaryItems: string[];

  retainedItems: string[];

  cleanedAt: string;
}
67. Report Generation Input Contract
export interface ReportGenerationRequest {
  session: IntakeSession;

  patient: Patient;

  clinicalHistory: ClinicalHistory;

  documents: DocumentExtractionResult[];

  flags: AttentionFlag[];

  ayush?: AyushIntake;

  patientReview: PatientReviewState;
}
68. Report Generation Result Contract
export interface ReportGenerationResponse {
  report: ClinicalHistoryReport;

  validation: {
    passed: boolean;

    missingRequiredSections: string[];

    warnings: string[];
  };
}
69. Report Validation Contract

Before printing:

export interface ReportValidationResult {
  validForPrinting: boolean;

  errors: ReportValidationIssue[];

  warnings: ReportValidationIssue[];
}

export interface ReportValidationIssue {
  section: string;

  code: string;

  message: string;
}
70. Complete End-to-End Data Flow

This is the exact architecture Antigravity should follow:

PATIENT IDENTIFICATION
        ↓
Patient Contract
        ↓
CONSENT
        ↓
Consent Contract
        ↓
SESSION CREATED
        ↓
IntakeSession Contract
        ↓
VOICE / TOUCH
        ↓
ConversationMessage
+
ConversationAnswer
        ↓
STATIC QUESTION ENGINE
        ↓
ADAPTIVE AI CONTRACT
        ↓
STRUCTURED CLINICAL HISTORY
        ↓
ClinicalHistory Contract
        ↓
DOCUMENT UPLOAD
        ↓
MedicalDocument Contract
        ↓
OCR
        ↓
OCRResponse
        ↓
DOCUMENT INTELLIGENCE
        ↓
DocumentExtractionResult
        ↓
MEDICAL TIMELINE
+
LAB RESULTS
+
MEDICATIONS
        ↓
DETERMINISTIC ATTENTION RULES
        ↓
AttentionFlag[]
        ↓
AYUSH DATA IF ENABLED
        ↓
AyushIntake
        ↓
PATIENT REVIEW
        ↓
PatientReviewState
        ↓
REPORT GENERATOR
        ↓
ClinicalHistoryReport
        ↓
REPORT VALIDATION
        ↓
QR REFERENCE
        ↓
PRINT JOB
        ↓
🖨️ PHYSICAL A4 PAPER REPORT
        ↓
SESSION CLEANUP
71. Mandatory Validation Rules

Antigravity must enforce these rules:

1. Every external API response must be validated.

2. Every AI response must pass Zod validation.

3. Invalid AI JSON must never directly enter the clinical history.

4. AI must never directly generate a final diagnosis field.

5. Attention flags must originate from deterministic rules.

6. Document-extracted information must retain provenance.

7. Patient corrections must overwrite or explicitly supersede previous patient-entered values.

8. The final report must be generated from the canonical report contract only.

9. The print component must not reconstruct clinical information independently.

10. The QR code must not expose raw sensitive clinical history.

11. Every phase must reuse these contracts rather than creating duplicate data shapes.

12. Demo mode must use exactly the same contracts as real mode.
72. Antigravity Implementation Rule

Use this architecture:

Zod Schema
    ↓ infer
TypeScript Type
    ↓
API Validation
    ↓
Service
    ↓
Database
    ↓
UI

Example:

export const PatientSchema = z.object({
  id: z.string(),
  demographics: z.object({
    fullName: z.string(),
    age: z.number().optional()
  })
});

export type Patient = z.infer<typeof PatientSchema>;

Do not manually maintain separate TypeScript interfaces and Zod schemas containing duplicated definitions wherever possible. Prefer z.infer so the schema is the canonical contract.

73. What Should Be Added to the Roadmap

Before Phase 1, add this:

PHASE 0.1 — Complete Data Contracts & Validation Foundation
Goal

Establish the canonical data contracts for the entire MediKiosk system so all future phases use consistent validated data.

Work
Common/base contracts
Patient contract
Identification contract
Consent contract
Session contract
Language contract
Department mode contract
Question contract
Follow-up rule contract
Answer contract
Conversation contract
Voice/STT contract
TTS contract
Clinical history contract
Chief complaint contract
HPI contract
Medical history contract
Surgical history contract
Medication contract
Allergy contract
Family history contract
Personal/social history contract
ROS contract
AI request contract
AI response contract
AI safety metadata contract
Document contract
OCR contract
Document intelligence contract
Extracted condition contract
Procedure contract
Hospital admission contract
Lab result contract
Timeline contract
Deterministic rule contract
Attention flag contract
AYUSH contract
Patient review contract
Patient correction contract
Final report contract
Physician verification contract
QR/reference contract
Print job contract
Audit log contract
Database service contract
Mock repository contract
API response contract
API route contracts
Demo scenario contract
Global application state contract
Async state contract
Notification contract
Session cleanup contract
Report validation contract
Verification
npm run build
npm run lint

Also verify:

All Zod schemas compile.

All TypeScript types are inferred from canonical schemas where possible.

AI response parsing rejects invalid JSON.

Demo data validates successfully.

Question JSON validates successfully.

Report generation input validates successfully.

Final report JSON validates successfully.
STOP RULE
After completing Phase 0.1:

DO NOT START PHASE 1.

Present:
1. Files created
2. Contracts implemented
3. Validation results
4. Demo validation results
5. Build results
6. Lint results

Then STOP and wait for my explicit approval.
Final recommendation

Yes, this fills the major missing architecture layer. Your project now has:

PRD
↓
Architecture
↓
Development Phases
↓
Design System
↓
Color Palette
↓
Safety Rules
↓
Strict Phase Workflow
↓
Data Contracts
↓
JSON Validation
↓
AI Contracts
↓
Database Contracts
↓
API Contracts
↓
Report Contract
↓
Physical Print Output