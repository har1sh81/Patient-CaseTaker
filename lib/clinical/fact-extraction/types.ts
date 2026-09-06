export interface ExtractedSymptom {
  symptomName: string;
  symptomNameNative?: string;
  bodySite?: string;
  severityScore?: number;
  durationText?: string;
  onsetDate?: string;
  characterQuality?: string;
  aggravatingFactors?: string;
  relievingFactors?: string;
}

export interface ExtractedMedication {
  medicationName: string;
  medicationNameNative?: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  status?: 'active' | 'discontinued' | 'completed';
}

export interface ExtractedVital {
  systolicBp?: number;
  diastolicBp?: number;
  heartRateBpm?: number;
  bodyTemperatureC?: number;
  spo2Percentage?: number;
  respiratoryRate?: number;
}

export interface ExtractedAyush {
  prakritiDosha?: string;
  vikritiDosha?: string;
  agniType?: string;
  koshthaType?: string;
  aharaHabits?: Record<string, unknown>;
  dashavidhaPariksha?: Record<string, unknown>;
}

export interface FactExtractionResult {
  symptoms: ExtractedSymptom[];
  medications: ExtractedMedication[];
  vitals: ExtractedVital[];
  ayush?: ExtractedAyush;
}

export interface ExtractionStats {
  answersProcessed: number;
  symptomsExtracted: number;
  medicationsExtracted: number;
  vitalsExtracted: number;
  ayushExtracted: number;
  factsCreated: number;
}

export interface ExtractionResponse {
  success: boolean;
  data?: ExtractionStats;
  error?: string;
}
