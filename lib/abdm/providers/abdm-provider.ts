/* eslint-disable @typescript-eslint/no-unused-vars */
import { HealthRecordProvider } from '../provider-interface';
import { RawHealthRecordPayload } from '../../../types';

export class ABDMProvider implements HealthRecordProvider {
  constructor(private gatewayUrl: string, private clientId: string, private clientSecret: string) {}

  async requestConsent(_abhaReference: string): Promise<{ transactionId: string; requiresOtp: boolean; message?: string }> {
    // Architectural stub for real ABDM M3 Gateway integration
    // 1. Authenticate with ABDM Gateway using client credentials
    // 2. Call /v0.5/consent-requests/init
    // 3. Return the transaction ID

    throw new Error('Real ABDM integration is not yet configured with valid credentials.');
  }

  async verifyConsentAndFetchRecords(_transactionId: string, _otp: string, _abhaReference: string): Promise<RawHealthRecordPayload> {
    // Architectural stub for real ABDM M3 Gateway integration
    // 1. Call /v0.5/consents/confirm with OTP
    // 2. Await consent artifact
    // 3. Request health information (FIU flow)
    // 4. Decrypt FHIR bundles
    // 5. Map FHIR resources to RawHealthRecordPayload

    throw new Error('Real ABDM integration is not yet configured with valid credentials.');
  }

  async publishRecord(_fhirBundle: any): Promise<{ success: boolean; externalId?: string; error?: string }> {
    // Architectural stub for real ABDM M3 Gateway integration
    // 1. Authenticate with ABDM Gateway using client credentials
    // 2. Call /v0.5/health-information/notify (HIP flow)
    // 3. Encrypt and push FHIR bundles

    throw new Error('Real ABDM export integration is not yet configured with valid credentials.');
  }
}
