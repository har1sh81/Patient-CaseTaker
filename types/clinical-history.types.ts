import { z } from 'zod';
import * as schemas from '../schemas/clinical-history.schema';

export type ChiefComplaint = z.infer<typeof schemas.ChiefComplaintSchema>;
export type HistoryOfPresentIllness = z.infer<typeof schemas.HistoryOfPresentIllnessSchema>;
export type MedicalConditionHistory = z.infer<typeof schemas.MedicalConditionHistorySchema>;
export type SurgicalHistoryItem = z.infer<typeof schemas.SurgicalHistoryItemSchema>;
export type Medication = z.infer<typeof schemas.MedicationSchema>;
export type Allergy = z.infer<typeof schemas.AllergySchema>;
export type FamilyHistoryItem = z.infer<typeof schemas.FamilyHistoryItemSchema>;
export type PersonalHistory = z.infer<typeof schemas.PersonalHistorySchema>;
export type SocialHistory = z.infer<typeof schemas.SocialHistorySchema>;
export type ReviewOfSystemItem = z.infer<typeof schemas.ReviewOfSystemItemSchema>;
export type ReviewOfSystems = z.infer<typeof schemas.ReviewOfSystemsSchema>;
export type ClinicalHistory = z.infer<typeof schemas.ClinicalHistorySchema>;
