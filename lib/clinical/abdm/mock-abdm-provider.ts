/**
 * Task #33 — Mock ABDM Transport Provider
 * MediKiosk Clinical Architecture
 * 
 * Realistic, deterministic mock implementation for SIH / demo testing.
 * Explicitly marks all responses as DEMO / MOCK.
 */

import * as crypto from 'crypto';
import type { AbdmTransportProvider, AbdmHealthRecordRequest, AbdmTransportResult, AbdmTransportStatusResult, AbdmEnvironment } from './types';
import type { FhirBundle } from '../fhir/types';

export class MockAbdmTransportProvider implements AbdmTransportProvider {
  async sendHealthRecord(
    request: AbdmHealthRecordRequest,
    bundle: FhirBundle
  ): Promise<AbdmTransportResult> {
    const timestamp = new Date().toISOString();
    const seed = `${request.patientId}:${request.purpose}:${timestamp}`;
    const hashHex = crypto.createHash('sha256').update(seed).digest('hex').substring(0, 8).toUpperCase();
    const requestId = `ABDM-MOCK-${hashHex}`;

    return {
      success: true,
      requestId,
      status: 'submitted',
      environment: 'mock',
      message: 'DEMO / MOCK ABDM EXCHANGE — Mock ABDM health record payload submitted successfully',
      timestamp,
      responseMetadata: {
        providerMode: 'MockAbdmTransportProvider',
        demoMode: true,
        resourceCount: bundle.entry ? bundle.entry.length : 0,
        fhirVersion: '4.0.1',
        disclaimer: 'This is a simulated ABDM exchange for demonstration purposes.',
      },
    };
  }

  async getHealthRecordStatus(
    requestId: string,
    environment: AbdmEnvironment
  ): Promise<AbdmTransportStatusResult> {
    return {
      requestId,
      environment: 'mock',
      status: 'completed',
      lastUpdated: new Date().toISOString(),
      message: 'DEMO / MOCK ABDM EXCHANGE — Simulated transaction processing completed',
      metadata: {
        providerMode: 'MockAbdmTransportProvider',
        ackStatus: 'ACKNOWLEDGED',
        hipResponseStatus: 'DELIVERED',
      },
    };
  }
}
