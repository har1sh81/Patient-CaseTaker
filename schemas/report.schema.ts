import { z } from 'zod';
import { SupportedLanguageSchema } from './common.schema';
import { DepartmentModeSchema, IntakeSessionSchema } from './session.schema';
import { ClinicalSectionSchema } from './conversation.schema';
import {
  ChiefComplaintSchema,
  HistoryOfPresentIllnessSchema,
  MedicalConditionHistorySchema,
  SurgicalHistoryItemSchema,
  MedicationSchema,
  AllergySchema,
  FamilyHistoryItemSchema,
  PersonalHistorySchema,
  SocialHistorySchema,
  ReviewOfSystemsSchema,
  ClinicalHistorySchema,
} from './clinical-history.schema';
import { ConversationAnswerSchema } from './conversation.schema';
import { FusedClinicalRecordSchema } from './timeline.schema';
import {
  MedicalDocumentTypeSchema,
  ExtractedConditionSchema,
  LabResultSchema,
  HospitalAdmissionSchema,
  MedicalTimelineEventSchema,
  DocumentExtractionResultSchema,
} from './document.schema';
import { AttentionFlagSchema } from './flag.schema';
import { DashavidhaParikshaSchema, AyushIntakeSchema } from './ayush.schema';
import { PatientSchema } from './patient.schema';

export const PatientReviewSectionSchema = z.object({
  section: ClinicalSectionSchema,
  title: z.string(),
  summary: z.string(),
  editable: z.boolean(),
  status: z.enum(['complete', 'incomplete', 'confirmed']),
});

export const PatientReviewStateSchema = z.object({
  sessionId: z.string(),
  sections: z.array(PatientReviewSectionSchema),
  status: z.enum(['pending', 'reviewing', 'confirmed']),
});

export const PatientCorrectionSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  fieldPath: z.string(),
  previousValue: z.unknown(),
  correctedValue: z.unknown(),
  correctedBy: z.literal('patient'),
  correctedAt: z.string(),
});

export const PatientReportSectionSchema = z.object({
  fullName: z.string(),
  age: z.number().optional(),
  gender: z.string().optional(),
  hospitalNumber: z.string().optional(),
  abhaReference: z.string().optional(),
});

export const VisitReportSectionSchema = z.object({
  generatedDate: z.string(),
  departmentMode: DepartmentModeSchema,
  intakeLanguage: SupportedLanguageSchema,
  reasonForVisit: z.string().optional(),
});

export const ClinicalHistoryReportSectionSchema = z.object({
  chiefComplaint: ChiefComplaintSchema.optional(),
  historyOfPresentIllness: HistoryOfPresentIllnessSchema.optional(),
  pastMedicalHistory: z.array(MedicalConditionHistorySchema),
  pastSurgicalHistory: z.array(SurgicalHistoryItemSchema),
  medications: z.array(MedicationSchema),
  allergies: z.array(AllergySchema),
  familyHistory: z.array(FamilyHistoryItemSchema),
  personalHistory: PersonalHistorySchema.optional(),
  socialHistory: SocialHistorySchema.optional(),
  reviewOfSystems: ReviewOfSystemsSchema.optional(),
});

export const DocumentSummaryReportSectionSchema = z.object({
  uploadedDocumentCount: z.number(),
  documents: z.array(
    z.object({
      id: z.string(),
      type: MedicalDocumentTypeSchema,
      date: z.string().optional(),
      fileName: z.string(),
    })
  ),
  extractedConditions: z.array(ExtractedConditionSchema),
  laboratoryResults: z.array(LabResultSchema),
  admissions: z.array(HospitalAdmissionSchema),
});

export const AyushReportSectionSchema = z.object({
  prakriti: z.string().optional(),
  vikriti: z.string().optional(),
  agni: z.string().optional(),
  koshtha: z.string().optional(),
  ahara: z.array(z.string()),
  vihara: z.array(z.string()),
  dashavidhaPariksha: DashavidhaParikshaSchema.optional(),
});

export const ReportConfirmationSchema = z.object({
  confirmedByPatient: z.boolean(),
  confirmedAt: z.string().optional(),
  correctionsMade: z.number(),
});

export const PhysicianVerificationSchema = z.object({
  status: z.enum(['pending_physician_review', 'verified', 'corrected']),
  physicianComments: z.string().optional(),
  signatureRequired: z.boolean(),
  signature: z.string().optional(),
  verifiedAt: z.string().optional(),
});

export const ReportReferenceSchema = z.object({
  referenceNumber: z.string(),
  qrPayload: z.string(),
  generatedAt: z.string(),
});

export const ClinicalHistoryReportSchema = z.object({
  reportId: z.string(),
  reportVersion: z.string(),
  generatedAt: z.string(),
  sessionId: z.string(),
  patient: PatientReportSectionSchema,
  visit: VisitReportSectionSchema,
  clinicalHistory: ClinicalHistoryReportSectionSchema,
  documentSummary: DocumentSummaryReportSectionSchema,
  medicalTimeline: z.array(MedicalTimelineEventSchema),
  attentionFlags: z.array(AttentionFlagSchema),
  ayush: AyushReportSectionSchema.optional(),
  patientConfirmation: ReportConfirmationSchema,
  physicianVerification: PhysicianVerificationSchema,
  reference: ReportReferenceSchema,
});

export const ReportValidationIssueSchema = z.object({
  section: z.string(),
  code: z.string(),
  message: z.string(),
});

export const ReportValidationResultSchema = z.object({
  validForPrinting: z.boolean(),
  errors: z.array(ReportValidationIssueSchema),
  warnings: z.array(ReportValidationIssueSchema),
});

export const ReportGenerationRequestSchema = z.object({
  session: IntakeSessionSchema,
  patient: PatientSchema,
  answers: z.array(ConversationAnswerSchema),
  timeline: z.array(FusedClinicalRecordSchema),
  clinicalHistory: ClinicalHistorySchema.optional(), // Make optional since ABDM might not exist
  documents: z.array(DocumentExtractionResultSchema),
  flags: z.array(AttentionFlagSchema),
  ayush: AyushIntakeSchema.optional(),
  patientReview: PatientReviewStateSchema,
});

export const ReportGenerationResponseSchema = z.object({
  report: ClinicalHistoryReportSchema,
  validation: z.object({
    passed: z.boolean(),
    missingRequiredSections: z.array(z.string()),
    warnings: z.array(z.string()),
  }),
});
