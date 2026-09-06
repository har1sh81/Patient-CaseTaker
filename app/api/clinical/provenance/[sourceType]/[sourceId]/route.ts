/**
 * Task #31 — Provenance Chain Retrieval API Route
 * MediKiosk Clinical API
 * 
 * GET /api/clinical/provenance/[sourceType]/[sourceId]?patientId=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProvenanceChain } from '@/lib/clinical/provenance/provenance-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sourceType: string; sourceId: string }> }
) {
  try {
    const { sourceType, sourceId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json(
        { success: false, errorCode: 'INVALID_INPUT', error: 'Query parameter patientId is required' },
        { status: 400 }
      );
    }

    const result = await getProvenanceChain(patientId, sourceType, sourceId);

    if (!result.success) {
      const status = result.errorCode === 'CONSENT_DENIED' ? 403 : result.errorCode === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json(
        { success: false, errorCode: result.errorCode, error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, errorCode: 'INTERNAL_SERVER_ERROR', error: err.message || 'An error occurred' },
      { status: 500 }
    );
  }
}
