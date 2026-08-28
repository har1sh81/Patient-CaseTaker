import { OCRProvider } from './provider';
import { MockOCRProvider } from './mock-provider';
import { RealOCRProvider } from './real-provider';

let ocrProviderInstance: OCRProvider | null = null;

export function getOCRProvider(): OCRProvider {
  if (ocrProviderInstance) {
    return ocrProviderInstance;
  }

  const isMockEnabled = process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED !== 'false';
  
  if (isMockEnabled) {
    console.log('[OCR] Initializing MockOCRProvider');
    ocrProviderInstance = new MockOCRProvider();
  } else {
    console.log('[OCR] Initializing RealOCRProvider');
    ocrProviderInstance = new RealOCRProvider();
  }

  return ocrProviderInstance;
}

export * from './provider';
export * from './mock-provider';
export * from './real-provider';
