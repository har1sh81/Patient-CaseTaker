import { HealthRecordProvider } from './provider-interface';
import { MockABDMProvider } from './providers/mock-provider';
import { ABDMProvider } from './providers/abdm-provider';

export function getHealthRecordProvider(): HealthRecordProvider {
  const isMock = process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED === 'true' || process.env.HEALTH_RECORD_PROVIDER === 'mock';
  
  if (isMock) {
    return new MockABDMProvider();
  }

  const clientId = process.env.ABDM_CLIENT_ID;
  const clientSecret = process.env.ABDM_CLIENT_SECRET;
  const gatewayUrl = process.env.ABDM_GATEWAY_URL;

  if (!clientId || !clientSecret || !gatewayUrl) {
    console.warn('ABDM credentials missing. Falling back to MockABDMProvider.');
    return new MockABDMProvider();
  }

  return new ABDMProvider(gatewayUrl, clientId, clientSecret);
}
