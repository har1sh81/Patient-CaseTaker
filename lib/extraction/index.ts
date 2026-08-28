import { ClinicalExtractionProvider } from './provider';
import { MockClinicalExtractionProvider } from './mock-provider';
import { RealClinicalExtractionProvider } from './real-provider';

// Configure based on environment variable
const isMockEnabled = process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED !== 'false';

let providerInstance: ClinicalExtractionProvider | null = null;

export function getExtractionProvider(): ClinicalExtractionProvider {
  if (!providerInstance) {
    if (isMockEnabled) {
      console.log('[MediKiosk] Initializing MOCK Clinical Extraction Provider');
      providerInstance = new MockClinicalExtractionProvider();
    } else {
      console.log('[MediKiosk] Initializing REAL Clinical Extraction Provider');
      providerInstance = new RealClinicalExtractionProvider();
    }
  }
  return providerInstance;
}

export * from './provider';
