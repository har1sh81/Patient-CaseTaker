import { RawHealthRecordPayload } from '../../types';

export interface HealthRecordProvider {
  /** Initiate a consent request for the patient's ABHA (e.g., triggers OTP to mobile) */
  requestConsent(abhaReference: string): Promise<{ transactionId: string; requiresOtp: boolean; message?: string }>;
  
  /** Verify the OTP and fetch the authorized digital health records */
  verifyConsentAndFetchRecords(transactionId: string, otp: string, abhaReference: string): Promise<RawHealthRecordPayload>;
}
