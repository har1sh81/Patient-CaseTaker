/**
 * Task #31 — Provenance Chain Validation API Route
 * MediKiosk Clinical API
 * 
 * POST /api/clinical/provenance/validate
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateProvenance } from '@/lib/clinical/provenance/provenance-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { patientId, sourceType, sourceId } = body;

    if (!patientId || !sourceType || !sourceId) {
      return NextResponse.json(
        { success: false, errorCode: 'INVALID_INPUT', error: 'patientId, sourceType, and sourceId are required' },
        { status: 400 }
      );
    }

    const result = await validateProvenance(patientId, sourceType, sourceId);

    if (!result.success) {
      const status = result.errorCode === 'CONSENT_DENIED' ? 403 : 400;
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
