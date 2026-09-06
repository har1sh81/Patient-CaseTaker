/**
 * Task #33 — ABDM Exchange History API Route
 * MediKiosk Clinical Architecture
 * 
 * GET /api/patients/[patientId]/abdm/exchanges
 */

import { NextResponse } from 'next/server';
import { getPatientAbdmExchanges } from '@/lib/clinical/abdm/abdm-status-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    if (!patientId) {
      return NextResponse.json({ success: false, error: 'Patient ID is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const encounterId = searchParams.get('encounterId') || undefined;
    const status = searchParams.get('status') || undefined;
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

    const result = await getPatientAbdmExchanges(patientId, {
      encounterId,
      status,
      fromDate,
      toDate,
      limit,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error, errorCode: result.errorCode }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (err: any) {
    console.error('[API ABDM History] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
