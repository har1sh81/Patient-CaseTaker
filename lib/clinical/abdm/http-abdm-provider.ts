/**
 * Task #33 — HTTP / Sandbox ABDM Transport Provider
 * MediKiosk Clinical Architecture
 * 
 * Configurable HTTPS transport provider for ABDM Sandbox / Production gateway exchange.
 * Never logs secrets or private credentials.
 */

import { getAbdmConfig } from './abdm-config';
import type { AbdmTransportProvider, AbdmHealthRecordRequest, AbdmTransportResult, AbdmTransportStatusResult, AbdmEnvironment } from './types';
import type { FhirBundle } from '../fhir/types';

export class HttpAbdmTransportProvider implements AbdmTransportProvider {
  async sendHealthRecord(
    request: AbdmHealthRecordRequest,
    bundle: FhirBundle
  ): Promise<AbdmTransportResult> {
    const config = getAbdmConfig();
    const env = request.environment || config.environment;
    const timestamp = new Date().toISOString();

    if (!config.baseUrl) {
      return {
        success: false,
        status: 'failed',
        environment: env,
        message: `ABDM ${env.toUpperCase()} error: ABDM_BASE_URL is not configured in environment variables`,
        timestamp,
        error: 'MISSING_BASE_URL',
      };
    }

    try {
      const endpoint = `${config.baseUrl.replace(/\/$/, '')}/v0.5/health-information/transfer`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.requestTimeoutMs);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-CM-ID': 'sbx',
      };

      if (config.clientId) {
        headers['X-HIU-ID'] = config.hiuId || config.clientId;
      }

      const payload = {
        requestId: `ABDM-HTTP-${Date.now()}`,
        timestamp,
        transactionId: `TXN-${request.patientId.substring(0, 8)}-${Date.now()}`,
        purpose: request.purpose,
        patient: {
          id: request.abhaAddress || request.patientId,
        },
        fhirBundle: bundle,
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          success: false,
          status: 'failed',
          environment: env,
          message: `ABDM gateway returned HTTP status ${res.status}`,
          timestamp,
          error: `HTTP_${res.status}`,
        };
      }

      const resData = await res.json().catch(() => ({}));
      const requestId = resData.requestId || payload.requestId;

      return {
        success: true,
        requestId,
        status: 'submitted',
        environment: env,
        message: `Health record payload successfully submitted to ABDM ${env} gateway`,
        timestamp,
        responseMetadata: {
          httpStatus: res.status,
          providerMode: 'HttpAbdmTransportProvider',
        },
      };
    } catch (err: any) {
      const isTimeout = err.name === 'AbortError';
      return {
        success: false,
        status: 'failed',
        environment: env,
        message: isTimeout
          ? `ABDM transport timed out after ${config.requestTimeoutMs}ms`
          : `ABDM HTTP transport failed: ${err.message || 'Network error'}`,
        timestamp,
        error: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      };
    }
  }

  async getHealthRecordStatus(
    requestId: string,
    environment: AbdmEnvironment
  ): Promise<AbdmTransportStatusResult> {
    const config = getAbdmConfig();
    const timestamp = new Date().toISOString();

    if (!config.baseUrl) {
      return {
        requestId,
        environment,
        status: 'failed',
        lastUpdated: timestamp,
        message: 'ABDM_BASE_URL is not configured',
      };
    }

    try {
      const endpoint = `${config.baseUrl.replace(/\/$/, '')}/v0.5/health-information/status/${requestId}`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-HIU-ID': config.hiuId || config.clientId || 'medikiosk',
        },
      });

      if (!res.ok) {
        return {
          requestId,
          environment,
          status: 'failed',
          lastUpdated: timestamp,
          message: `Status lookup failed with HTTP ${res.status}`,
        };
      }

      const data = await res.json().catch(() => ({}));
      return {
        requestId,
        environment,
        status: data.status || 'processing',
        lastUpdated: timestamp,
        message: data.message || 'Status retrieved from ABDM gateway',
        metadata: data,
      };
    } catch (err: any) {
      return {
        requestId,
        environment,
        status: 'failed',
        lastUpdated: timestamp,
        message: err.message || 'Failed to query ABDM status endpoint',
      };
    }
  }
}
