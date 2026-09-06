import { z } from 'zod';
import {
  PatientReportSectionSchema,
  VisitReportSectionSchema,
  DocumentSummaryReportSectionSchema,
  AyushReportSectionSchema,
  ReportReferenceSchema,
} from '../schemas/report.schema';
import { MedicalTimelineEventSchema } from '../schemas/document.schema';
import { AttentionFlagSchema } from '../schemas/flag.schema';

export const SummarySourceBadgeSchema = z.enum(['patient', 'document', 'abdm', 'multiple']);
export type SummarySourceBadge = z.infer<typeof SummarySourceBadgeSchema>;

export const SummaryChiefComplaintSchema = z.object({
  primaryComplaint: z.string(),
  duration: z.string().optional(),
  severity: z.string().optional(),
  pattern: z.string().optional(),
  patientWords: z.string().optional(),
});
export type SummaryChiefComplaint = z.infer<typeof SummaryChiefComplaintSchema>;

export const SummaryHPISchema = z.object({
  onset: z.string().optional(),
  location: z.string().optional(),
  character: z.string().optional(),
  duration: z.string().optional(),
  aggravatingFactors: z.string().optional(),
  relievingFactors: z.string().optional(),
  aggravatingRelieving: z.string().optional(),
  previousTreatments: z.string().optional(),
  associatedSymptoms: z.string().optional(),
  progression: z.string().optional(),
});
export type SummaryHPI = z.infer<typeof SummaryHPISchema>;

export const SummaryHistoryItemSchema = z.object({
  conditionName: z.string(),
  status: z.string().optional(),
  source: SummarySourceBadgeSchema,
  notes: z.string().optional(),
});
export type SummaryHistoryItem = z.infer<typeof SummaryHistoryItemSchema>;

export const SummaryMedicationItemSchema = z.object({
  medicationName: z.string(),
  dose: z.string().optional(),
  frequency: z.string().optional(),
  status: z.string().optional(),
  source: SummarySourceBadgeSchema,
  hasConflict: z.boolean().optional(),
  conflictMessage: z.string().optional(),
});
export type SummaryMedicationItem = z.infer<typeof SummaryMedicationItemSchema>;

export const SummaryAllergyItemSchema = z.object({
  allergen: z.string(),
  reaction: z.string().optional(),
  severity: z.string().optional(),
});
export type SummaryAllergyItem = z.infer<typeof SummaryAllergyItemSchema>;

export const SummaryLabItemSchema = z.object({
  testName: z.string(),
  value: z.string(),
  unit: z.string().optional(),
  referenceRange: z.string().optional(),
  date: z.string().optional(),
  source: SummarySourceBadgeSchema,
});
export type SummaryLabItem = z.infer<typeof SummaryLabItemSchema>;

export const SummarySocialHistorySchema = z.object({
  occupation: z.string().optional(),
  diet: z.string().optional(),
  smoking: z.string().optional(),
  alcohol: z.string().optional(),
  exercise: z.string().optional(),
});
export type SummarySocialHistory = z.infer<typeof SummarySocialHistorySchema>;

export const SummaryConfirmationStatusSchema = z.object({
  confirmedByPatient: z.boolean(),
  confirmedAt: z.string(),
  badgeText: z.literal('PATIENT CONFIRMED ✓'),
  statusText: z.literal('STATUS: Ready for Physician Review'),
});
export type SummaryConfirmationStatus = z.infer<typeof SummaryConfirmationStatusSchema>;

export const SummaryVitalsSchema = z.object({
  bloodPressure: z.string().optional(),
  heartRate: z.string().optional(),
  temperature: z.string().optional(),
  spo2: z.string().optional(),
  respiratoryRate: z.string().optional(),
  status: z.string().optional(),
});
export type SummaryVitals = z.infer<typeof SummaryVitalsSchema>;

export const SummaryClinicalFactSchema = z.object({
  category: z.string(),
  fact: z.string(),
  source: z.string().optional(),
});
export type SummaryClinicalFact = z.infer<typeof SummaryClinicalFactSchema>;

export const SummaryInterviewItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
  section: z.string().optional(),
});
export type SummaryInterviewItem = z.infer<typeof SummaryInterviewItemSchema>;

export const SummaryDoctorReviewSchema = z.object({
  doctorNotes: z.string().optional(),
  corrections: z.string().optional(),
  confirmationStatus: z.string().optional(),
  finalAssessment: z.string().optional(),
  verifiedAt: z.string().optional(),
  doctorName: z.string().optional(),
});
export type SummaryDoctorReview = z.infer<typeof SummaryDoctorReviewSchema>;

export const ClinicalConsultationSummarySchema = z.object({
  reportId: z.string(),
  sessionId: z.string(),
  generatedAt: z.string(),
  pdfUrl: z.string().optional(),
  patient: PatientReportSectionSchema,
  visit: VisitReportSectionSchema,
  attentionFlags: z.array(AttentionFlagSchema),
  chiefComplaint: SummaryChiefComplaintSchema,
  hpi: SummaryHPISchema,
  relevantPreviousHistory: z.array(SummaryHistoryItemSchema),
  medications: z.array(SummaryMedicationItemSchema),
  allergies: z.array(SummaryAllergyItemSchema),
  investigations: z.array(SummaryLabItemSchema),
  familyHistory: z.array(z.string()),
  personalHistory: z.array(z.string()),
  socialHistory: SummarySocialHistorySchema.optional(),
  reviewOfSystems: z.record(z.string(), z.string()).optional(),
  vitals: SummaryVitalsSchema.optional(),
  clinicalFacts: z.array(SummaryClinicalFactSchema).optional(),
  interviewSummary: z.array(SummaryInterviewItemSchema).optional(),
  doctorReview: SummaryDoctorReviewSchema.optional(),
  informationNotReported: z.array(z.string()),
  medicalJourney: z.array(MedicalTimelineEventSchema),
  uploadedDocuments: DocumentSummaryReportSectionSchema,
  abdmContext: z.array(z.string()),
  ayush: AyushReportSectionSchema.optional(),
  patientConfirmation: SummaryConfirmationStatusSchema,
  reference: ReportReferenceSchema,
});

export type ClinicalConsultationSummary = z.infer<typeof ClinicalConsultationSummarySchema>;

