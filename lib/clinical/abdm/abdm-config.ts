/**
 * Task #33 — ABDM Configuration Manager
 * MediKiosk Clinical Architecture
 * 
 * Safely parses environment configuration without leaking secrets.
 */

import type { AbdmEnvironment } from './types';

export interface AbdmConfig {
  environment: AbdmEnvironment;
  baseUrl?: string;
  clientId?: string;
  clientSecret?: string;
  facilityId?: string;
  hiuId?: string;
  hipId?: string;
  requestTimeoutMs: number;
}

export function getAbdmConfig(): AbdmConfig {
  const envRaw = (process.env.ABDM_ENVIRONMENT || 'mock').toLowerCase();
  let environment: AbdmEnvironment = 'mock';
  if (envRaw === 'sandbox') environment = 'sandbox';
  else if (envRaw === 'production') environment = 'production';

  const timeoutParsed = parseInt(process.env.ABDM_REQUEST_TIMEOUT_MS || '10000', 10);

  return {
    environment,
    baseUrl: process.env.ABDM_BASE_URL,
    clientId: process.env.ABDM_CLIENT_ID,
    clientSecret: process.env.ABDM_CLIENT_SECRET,
    facilityId: process.env.ABDM_FACILITY_ID,
    hiuId: process.env.ABDM_HIU_ID,
    hipId: process.env.ABDM_HIP_ID,
    requestTimeoutMs: Number.isNaN(timeoutParsed) ? 10000 : timeoutParsed,
  };
}

export function isMockEnvironment(env?: AbdmEnvironment): boolean {
  const currentEnv = env || getAbdmConfig().environment;
  return currentEnv === 'mock';
}
