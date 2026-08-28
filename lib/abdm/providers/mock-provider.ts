import { HealthRecordProvider } from '../provider-interface';
import { RawHealthRecordPayload } from '../../../types';

export class MockABDMProvider implements HealthRecordProvider {
  async requestConsent(abhaReference: string): Promise<{ transactionId: string; requiresOtp: boolean; message?: string }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate a failure for a specific ABHA for testing purposes
    if (abhaReference === 'ABHA-FAIL') {
      throw new Error('Failed to initiate consent request.');
    }

    return {
      transactionId: `txn_mock_${Math.random().toString(36).substring(2, 9)}`,
      requiresOtp: true,
      message: 'OTP sent to registered mobile number.',
    };
  }

  async verifyConsentAndFetchRecords(transactionId: string, otp: string, abhaReference: string): Promise<RawHealthRecordPayload> {
    // Simulate network delay for fetching records
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (otp === '999999') {
      throw new Error('Provider network timeout.');
    }

    if (otp === '000000') {
      // Empty records scenario
      return {
        patientAbha: abhaReference,
        recordsFetched: 0,
        lastUpdated: new Date().toISOString(),
        conditions: [],
        medications: [],
        procedures: []
      };
    }

    if (otp !== '123456') {
      throw new Error('Invalid OTP / Authorization Denied');
    }

    // Success scenario with synthetic rich records
    return {
      patientAbha: abhaReference,
      recordsFetched: 3,
      lastUpdated: new Date().toISOString(),
      conditions: [
        {
          id: 'cond_001',
          code: 'I10',
          display: 'Essential (primary) hypertension',
          clinicalStatus: 'active',
          dateRecorded: '2021-05-10T10:00:00Z',
          sourceFacility: 'Apollo Hospitals',
        }
      ],
      medications: [
        {
          id: 'med_001',
          drugName: 'Amlodipine 5mg',
          status: 'active',
          dosageInstruction: '1 tablet daily',
          prescribedDate: '2023-11-15T09:30:00Z',
        }
      ],
      procedures: [
        {
          id: 'proc_001',
          procedureName: 'Appendectomy',
          date: '2015-08-20T14:00:00Z',
          performer: 'Dr. Sharma',
        }
      ]
    };
  }
}
