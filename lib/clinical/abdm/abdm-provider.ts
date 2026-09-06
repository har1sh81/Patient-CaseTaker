/**
 * Task #33 — ABDM Transport Provider Factory
 * MediKiosk Clinical Architecture
 */

import { getAbdmConfig } from './abdm-config';
import { MockAbdmTransportProvider } from './mock-abdm-provider';
import { HttpAbdmTransportProvider } from './http-abdm-provider';
import type { AbdmTransportProvider, AbdmEnvironment } from './types';

export function getAbdmTransportProvider(overrideEnv?: AbdmEnvironment): AbdmTransportProvider {
  const config = getAbdmConfig();
  const env = overrideEnv || config.environment;

  if (env === 'sandbox' || env === 'production') {
    return new HttpAbdmTransportProvider();
  }

  return new MockAbdmTransportProvider();
}
