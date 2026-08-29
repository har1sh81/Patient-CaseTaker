import { RawHealthRecordPayload } from '../../types';

export interface HealthRecordProvider {
  /** Initiate a consent request for the patient's ABHA (e.g., triggers OTP to mobile) */
  requestConsent(abhaReference: string): Promise<{ transactionId: string; requiresOtp: boolean; message?: string }>;
  
  /** Verify the OTP and fetch the authorized digital health records */
  verifyConsentAndFetchRecords(transactionId: string, otp: string, abhaReference: string): Promise<RawHealthRecordPayload>;

  /** Export the finalized clinical record to ABDM as FHIR */
  publishRecord(fhirBundle: any): Promise<{ success: boolean; externalId?: string; error?: string }>;
}
