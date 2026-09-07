import { POST } from '../app/api/patients/identify/route';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

interface TestCase {
  name: string;
  body: any;
  expectedStatus: number;
  expectedCode?: string;
  expectedPatientId?: string;
  expectedPatientName?: string;
  expectedVerified?: boolean;
}

const TEST_CASES: TestCase[] = [
  {
    name: '1. Valid ABHA Number (Ramesh Kumar)',
    body: {
      identifierType: 'abha_number',
      identifierValue: 'ABHA-001',
    },
    expectedStatus: 200,
    expectedPatientId: 'a1111111-1111-4111-8111-000000000001',
    expectedPatientName: 'Ramesh Kumar',
    expectedVerified: true,
  },
  {
    name: '2. Valid ABHA Address (Ramesh Kumar)',
    body: {
      identifierType: 'abha_address',
      identifierValue: 'ramesh.k@abdm.demo',
    },
    expectedStatus: 200,
    expectedPatientId: 'a1111111-1111-4111-8111-000000000001',
    expectedPatientName: 'Ramesh Kumar',
    expectedVerified: true,
  },
  {
    name: '3. Valid Hospital Number (Ramesh Kumar)',
    body: {
      identifierType: 'hospital_number',
      identifierValue: 'HOSP-OPD-2026-0101',
    },
    expectedStatus: 200,
    expectedPatientId: 'a1111111-1111-4111-8111-000000000001',
    expectedPatientName: 'Ramesh Kumar',
    expectedVerified: true,
  },
  {
    name: '4. Unverified ABHA Number (Rajesh Kumar Sharma)',
    body: {
      identifierType: 'abha_number',
      identifierValue: 'DEMO-ABHA-918273645003',
    },
    expectedStatus: 200,
    expectedPatientId: 'a1111111-1111-4111-8111-000000000003',
    expectedPatientName: 'Rajesh Kumar Sharma',
    expectedVerified: false,
  },
  {
    name: '5. Unknown Identifier (404 Not Found)',
    body: {
      identifierType: 'abha_number',
      identifierValue: 'DEMO-ABHA-999999999999',
    },
    expectedStatus: 404,
    expectedCode: 'PATIENT_NOT_FOUND',
  },
  {
    name: '6. Missing identifierType (400 Bad Request)',
    body: {
      identifierValue: 'ABHA-001',
    },
    expectedStatus: 400,
    expectedCode: 'INVALID_REQUEST',
  },
  {
    name: '7. Missing identifierValue (400 Bad Request)',
    body: {
      identifierType: 'abha_number',
    },
    expectedStatus: 400,
    expectedCode: 'INVALID_REQUEST',
  },
  {
    name: '8. Empty/Whitespace identifierValue (400 Bad Request)',
    body: {
      identifierType: 'abha_number',
      identifierValue: '    ',
    },
    expectedStatus: 400,
    expectedCode: 'INVALID_REQUEST',
  },
  {
    name: '9. Unsupported identifierType (400 Bad Request)',
    body: {
      identifierType: 'passport_number',
      identifierValue: 'A1234567',
    },
    expectedStatus: 400,
    expectedCode: 'UNSUPPORTED_IDENTIFIER_TYPE',
  },
];

async function runTests() {
  console.log('Starting Patient Identification API Verification Tests...\n');
  let passed = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    const req = new Request('http://localhost:3000/api/patients/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tc.body),
    });

    try {
      const res = await POST(req);
      const resBody = await res.json();

      let isSuccess = res.status === tc.expectedStatus;

      if (tc.expectedCode && resBody.error?.code !== tc.expectedCode) {
        isSuccess = false;
      }

      if (tc.expectedPatientId && resBody.patient?.id !== tc.expectedPatientId) {
        isSuccess = false;
      }

      if (tc.expectedPatientName && resBody.patient?.name !== tc.expectedPatientName) {
        isSuccess = false;
      }

      if (tc.expectedVerified !== undefined && resBody.matchedIdentifier?.verified !== tc.expectedVerified) {
        isSuccess = false;
      }

      if (isSuccess) {
        console.log(`[PASS] ${tc.name}`);
        console.log(`       HTTP Status: ${res.status}`);
        if (resBody.patient) {
          console.log(`       Patient ID: ${resBody.patient.id} (${resBody.patient.name})`);
          console.log(`       Matched: ${resBody.matchedIdentifier.type} = ${resBody.matchedIdentifier.value} (Verified: ${resBody.matchedIdentifier.verified})`);
        } else {
          console.log(`       Error Code: ${resBody.error?.code} - ${resBody.error?.message}`);
        }
        passed++;
      } else {
        console.error(`[FAIL] ${tc.name}`);
        console.error(`       Expected HTTP Status: ${tc.expectedStatus}, Got: ${res.status}`);
        console.error(`       Response Body:`, JSON.stringify(resBody, null, 2));
        failed++;
      }
    } catch (err) {
      console.error(`[ERROR] ${tc.name}:`, err);
      failed++;
    }
    console.log('----------------------------------------------------');
  }

  console.log(`\nTest Summary: ${passed} Passed, ${failed} Failed out of ${TEST_CASES.length} Test Cases.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
