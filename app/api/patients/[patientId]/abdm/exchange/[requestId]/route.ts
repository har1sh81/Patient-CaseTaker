/**
 * Task #33 — ABDM Exchange Status API Route
 * MediKiosk Clinical Architecture
 * 
 * GET /api/patients/[patientId]/abdm/exchange/[requestId]
 */

import { NextResponse } from 'next/server';
import { getAbdmExchangeStatus } from '@/lib/clinical/abdm/abdm-status-service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ patientId: string; requestId: string }> }
) {
  try {
    const { patientId, requestId } = await params;
    if (!patientId || !requestId) {
      return NextResponse.json({ success: false, error: 'Patient ID and Request ID are required' }, { status: 400 });
    }

    const result = await getAbdmExchangeStatus(patientId, requestId);

    if (!result.success) {
      const status = result.errorCode === 'NOT_FOUND' ? 404 : result.errorCode === 'CONSENT_DENIED' ? 403 : 400;
      return NextResponse.json({ success: false, error: result.error, errorCode: result.errorCode }, { status });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (err: any) {
    console.error('[API ABDM Status] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
