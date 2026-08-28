import { z } from 'zod';
import { DataProvenanceSchema } from './common.schema';

export const ChiefComplaintSchema = z.object({
  primaryComplaint: z.string(),
  additionalComplaints: z.array(z.string()),
  duration: z.object({
    value: z.number().optional(),
    unit: z.enum(['hours', 'days', 'weeks', 'months', 'years']).optional(),
    rawText: z.string().optional(),
  }).optional(),
  provenance: DataProvenanceSchema,
});

export const HistoryOfPresentIllnessSchema = z.object({
  onset: z.string().optional(),
  duration: z.string().optional(),
  location: z.string().optional(),
  character: z.string().optional(),
  severity: z.object({
    score: z.number().optional(),
    scale: z.enum(['0_10', 'mild_moderate_severe']).optional(),
  }).optional(),
  timing: z.string().optional(),
  progression: z.string().optional(),
  aggravatingFactors: z.array(z.string()).optional(),
  relievingFactors: z.array(z.string()).optional(),
  associatedSymptoms: z.array(z.string()).optional(),
  patientNarrative: z.string().optional(),
  completeness: z.object({
    missingFields: z.array(z.string()),
    completedFields: z.array(z.string()),
  }),
});

export const MedicalConditionHistorySchema = z.object({
  id: z.string(),
  conditionName: z.string(),
  diagnosedDate: z.string().optional(),
  status: z.enum(['active', 'past', 'unknown']),
  notes: z.string().optional(),
  provenance: DataProvenanceSchema,
});

export const SurgicalHistoryItemSchema = z.object({
  id: z.string(),
  procedureName: z.string(),
  date: z.string().optional(),
  hospital: z.string().optional(),
  notes: z.string().optional(),
  provenance: DataProvenanceSchema,
});

export const MedicationSchema = z.object({
  id: z.string(),
  name: z.string(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  route: z.string().optional(),
  startDate: z.string().optional(),
  status: z.enum(['active', 'past', 'unknown']),
  rawText: z.string().optional(),
  provenance: DataProvenanceSchema,
});

export const AllergySchema = z.object({
  id: z.string(),
  allergen: z.string(),
  category: z.enum(['drug', 'food', 'environmental', 'other', 'unknown']),
  reaction: z.string().optional(),
  severity: z.string().optional(),
  provenance: DataProvenanceSchema,
});

export const FamilyHistoryItemSchema = z.object({
  id: z.string(),
  relationship: z.string(),
  condition: z.string(),
  status: z.string().optional(),
  notes: z.string().optional(),
  provenance: DataProvenanceSchema,
});

export const PersonalHistorySchema = z.object({
  diet: z.string().optional(),
  sleep: z.string().optional(),
  bowelHabits: z.string().optional(),
  urinaryHabits: z.string().optional(),
  activityLevel: z.string().optional(),
  otherNotes: z.string().optional(),
  provenance: DataProvenanceSchema.optional(),
});

export const SocialHistorySchema = z.object({
  occupation: z.string().optional(),
  lifestyleNotes: z.string().optional(),
  otherNotes: z.string().optional(),
  provenance: DataProvenanceSchema.optional(),
});

export const ReviewOfSystemItemSchema = z.object({
  system: z.enum([
    'general',
    'cardiovascular',
    'respiratory',
    'gastrointestinal',
    'neurological',
    'musculoskeletal',
    'genitourinary',
    'skin',
    'endocrine',
    'psychiatric',
    'other',
  ]),
  symptoms: z.array(z.string()),
  notes: z.string().optional(),
  completed: z.boolean(),
});

export const ReviewOfSystemsSchema = z.object({
  systems: z.array(ReviewOfSystemItemSchema),
});

export const ClinicalHistorySchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  patientId: z.string(),
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
  sourceSummary: z.object({
    patientInterviewCompleted: z.boolean(),
    documentsProcessed: z.number(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});
