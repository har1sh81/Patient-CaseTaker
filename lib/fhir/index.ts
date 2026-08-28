/**
 * FHIR (Fast Healthcare Interoperability Resources) data models and converters
 */

export interface FhirPatient {
  resourceType: 'Patient';
  id?: string;
  name: Array<{
    use?: string;
    family: string;
    given: string[];
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  telecom?: Array<{
    system: 'phone' | 'email';
    value: string;
  }>;
}

export function convertToFHIRPatient(patient: {
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  phone?: string;
}): FhirPatient {
  return {
    resourceType: 'Patient',
    name: [
      {
        use: 'official',
        family: patient.lastName,
        given: [patient.firstName]
      }
    ],
    gender: patient.gender === 'male' ? 'male' : patient.gender === 'female' ? 'female' : 'unknown',
    birthDate: patient.dob,
    telecom: patient.phone ? [{ system: 'phone', value: patient.phone }] : []
  };
}
