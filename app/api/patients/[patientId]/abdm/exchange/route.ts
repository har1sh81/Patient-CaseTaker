/**
 * Task #33 — ABDM Exchange Submission API Route
 * MediKiosk Clinical Architecture
 * 
 * POST /api/patients/[patientId]/abdm/exchange
 */

import { NextResponse } from 'next/server';
import { submitAbdmExchange } from '@/lib/clinical/abdm/abdm-service';
import type { AbdmPurpose, AbdmEnvironment } from '@/lib/clinical/abdm/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    if (!patientId) {
      return NextResponse.json({ success: false, error: 'Patient ID is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      encounterId,
      purpose = 'consultation',
      consentId,
      environment = 'mock',
      includeDocuments = false,
      eventTypes = ['encounter', 'lab', 'medication', 'procedure'],
      forceResubmit = false,
    } = body;

    const result = await submitAbdmExchange({
      patientId,
      encounterId,
      purpose: purpose as AbdmPurpose,
      consentId,
      environment: environment as AbdmEnvironment,
      includeDocuments,
      eventTypes,
      forceResubmit,
    });

    if (!result.success) {
      const status = result.errorCode === 'CONSENT_DENIED' ? 403 : result.errorCode === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ success: false, error: result.error, errorCode: result.errorCode }, { status });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (err: any) {
    console.error('[API ABDM Exchange] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
