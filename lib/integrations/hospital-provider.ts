export interface HospitalIntegrationProvider {
  sendClinicalRecord(fhirBundle: any): Promise<{ success: boolean; externalId?: string; error?: string }>;
}

export class MockHospitalProvider implements HospitalIntegrationProvider {
  async sendClinicalRecord(fhirBundle: any): Promise<{ success: boolean; externalId?: string; error?: string }> {
    console.log('[MockHospitalProvider] Sending FHIR bundle to hospital EMR...');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate successful hospital export
    return {
      success: true,
      externalId: `HOSP-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000000)}`,
    };
  }
}

export function getHospitalProvider(): HospitalIntegrationProvider {
  // Always use Mock for now unless configured
  return new MockHospitalProvider();
}
