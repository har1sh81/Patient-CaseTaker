/**
 * Vitals Data Processing & Normalization Types
 */

export interface VitalInput {
  systolicBp?: number | string;
  diastolicBp?: number | string;
  bloodPressureText?: string; // e.g. "158/96" or "120/80"
  heartRateBpm?: number | string;
  bodyTemperature?: number | string;
  temperatureUnit?: 'C' | 'F' | 'celsius' | 'fahrenheit';
  spo2Percentage?: number | string;
  respiratoryRate?: number | string;
  measuredAt?: string; // ISO timestamp string
  provenanceSource?: 'patient_reported' | 'clinician_measured' | 'device_measured' | 'historical_document';
  verificationStatus?: 'unverified' | 'doctor_verified' | 'rejected';
  sourceId?: string;
}

export interface NormalizedVitalRecord {
  id?: string;
  patientId: string;
  encounterId: string;
  systolicBp?: number;
  diastolicBp?: number;
  heartRateBpm?: number;
  bodyTemperatureC?: number;
  spo2Percentage?: number;
  respiratoryRate?: number;
  measuredAt: string;
  provenanceSource: string;
  verificationStatus: string;
  sourceId?: string;
  createdAt?: string;
}

export interface VitalValidationResult {
  valid: boolean;
  errors: string[];
  normalized?: {
    systolicBp?: number;
    diastolicBp?: number;
    heartRateBpm?: number;
    bodyTemperatureC?: number;
    spo2Percentage?: number;
    respiratoryRate?: number;
    measuredAt: string;
    provenanceSource: string;
    verificationStatus: string;
  };
}

export interface VitalsServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}
