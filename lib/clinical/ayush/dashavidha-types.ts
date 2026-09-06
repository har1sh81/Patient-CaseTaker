/**
 * Dashavidha Pariksha Domain Model & Types
 * Represents the 10 Ayurvedic examination components cleanly and deterministically.
 */

export type DashavidhaDomainName =
  | 'prakriti'
  | 'vikriti'
  | 'sara'
  | 'samhanana'
  | 'pramana'
  | 'satmya'
  | 'sattva'
  | 'aharaShakti'
  | 'vyayamaShakti'
  | 'vaya';

export type DashavidhaSourceType = 'patient_input' | 'clinician_assessment' | 'measurement_required';

export type DashavidhaVerificationStatus = 'unverified' | 'doctor_verified' | 'rejected';

export interface DashavidhaDomainObservation<T = Record<string, any>> {
  domainName: DashavidhaDomainName;
  sourceType: DashavidhaSourceType;
  provenanceSource: string; // e.g., 'patient_reported', 'clinician_entered', 'historical_document'
  verificationStatus: DashavidhaVerificationStatus;
  collectedAt?: string;
  clinicianNotes?: string;
  data: T;
}

export interface PrakritiObservationData {
  bodyBuild?: string;
  skinType?: string;
  hairType?: string;
  appetitePattern?: string;
  digestionTendency?: string;
  sleepPattern?: string;
  temperaturePreference?: string;
  activityLevel?: string;
  stressResponse?: string;
  bowelTendency?: string;
  notes?: string;
}

export interface VikritiObservationData {
  appetiteChange?: string;
  bowelChange?: string;
  sleepChange?: string;
  fatigueChange?: string;
  discomfortChange?: string;
  routineDisruption?: string;
  seasonalChange?: string;
  currentSymptoms?: string[];
  notes?: string;
}

export interface SaraObservationData {
  tissueEssenceGrade?: 'pravara_excellent' | 'madhyama_moderate' | 'avara_poor' | 'pending';
  skinLuster?: string;
  boneStrength?: string;
  muscleTonedness?: string;
  bloodVigor?: string;
  notes?: string;
}

export interface SamhananaObservationData {
  compactnessGrade?: 'su_samhanana' | 'madhyama_samhanana' | 'heena_samhanana' | 'pending';
  bodySymmetry?: string;
  jointFirmness?: string;
  notes?: string;
}

export interface PramanaObservationData {
  heightCm?: number;
  weightKg?: number;
  bmiCalculated?: number;
  bodyProportions?: string;
  notes?: string;
}

export interface SatmyaObservationData {
  toleratedFoods?: string[];
  intoleratedFoods?: string[];
  dietaryAdaptations?: string;
  habitualRoutine?: string;
  notes?: string;
}

export interface SattvaObservationData {
  mentalStrengthGrade?: 'pravara_high' | 'madhyama_moderate' | 'avara_sensitive' | 'pending';
  stressCopingAbility?: string;
  emotionalResilience?: string;
  concentrationLevel?: string;
  notes?: string;
}

export interface AharaShaktiObservationData {
  capacityGrade?: 'pravara_good' | 'madhyama_moderate' | 'avara_poor' | 'pending';
  eatingQuantity?: string;
  digestionSpeed?: string;
  postMealHeaviness?: boolean;
  notes?: string;
}

export interface VyayamaShaktiObservationData {
  enduranceGrade?: 'high_endurance' | 'moderate_endurance' | 'low_endurance' | 'pending';
  dailyActivityLevel?: string;
  exerciseHabits?: string;
  fatigueThreshold?: string;
  recoverySpeed?: string;
  notes?: string;
}

export interface VayaObservationData {
  dateOfBirth?: string;
  ageYears?: number;
  lifeStage?: 'bala_childhood' | 'madhyama_middle' | 'vriddha_elderly';
  derivationMethod?: 'derived_from_dob';
  notes?: string;
}

export interface DashavidhaParikshaPayload {
  schemaVersion: '1.0';
  lastUpdated: string;
  encounterId: string;
  patientId: string;
  domains: {
    prakriti?: DashavidhaDomainObservation<PrakritiObservationData>;
    vikriti?: DashavidhaDomainObservation<VikritiObservationData>;
    sara?: DashavidhaDomainObservation<SaraObservationData>;
    samhanana?: DashavidhaDomainObservation<SamhananaObservationData>;
    pramana?: DashavidhaDomainObservation<PramanaObservationData>;
    satmya?: DashavidhaDomainObservation<SatmyaObservationData>;
    sattva?: DashavidhaDomainObservation<SattvaObservationData>;
    aharaShakti?: DashavidhaDomainObservation<AharaShaktiObservationData>;
    vyayamaShakti?: DashavidhaDomainObservation<VyayamaShaktiObservationData>;
    vaya?: DashavidhaDomainObservation<VayaObservationData>;
  };
}

export interface SaveDashavidhaRequest {
  patientId: string;
  encounterId: string;
  domains: Partial<{
    prakriti: DashavidhaDomainObservation<PrakritiObservationData>;
    vikriti: DashavidhaDomainObservation<VikritiObservationData>;
    sara: DashavidhaDomainObservation<SaraObservationData>;
    samhanana: DashavidhaDomainObservation<SamhananaObservationData>;
    pramana: DashavidhaDomainObservation<PramanaObservationData>;
    satmya: DashavidhaDomainObservation<SatmyaObservationData>;
    sattva: DashavidhaDomainObservation<SattvaObservationData>;
    aharaShakti: DashavidhaDomainObservation<AharaShaktiObservationData>;
    vyayamaShakti: DashavidhaDomainObservation<VyayamaShaktiObservationData>;
    vaya: DashavidhaDomainObservation<VayaObservationData>;
  }>;
}

export interface DashavidhaServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}
