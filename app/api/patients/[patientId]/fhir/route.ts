/**
 * Task #32 — FHIR R4 Bundle Export API Route
 * MediKiosk Clinical API
 * 
 * GET /api/patients/[patientId]/fhir?encounterId=...&includeDocuments=true&includeProvenance=true
 */

import { NextRequest, NextResponse } from 'next/server';
import { exportPatientFhirBundle } from '@/lib/clinical/fhir/fhir-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    const searchParams = req.nextUrl.searchParams;

    const encounterId = searchParams.get('encounterId') || undefined;
    const includeDocuments = searchParams.get('includeDocuments') !== 'false';
    const includeProvenance = searchParams.get('includeProvenance') === 'true';

    const result = await exportPatientFhirBundle({
      patientId,
      encounterId,
      includeDocuments,
      includeProvenance,
    });

    if (!result.success) {
      const status = result.errorCode === 'CONSENT_DENIED' ? 403 : result.errorCode === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ success: false, errorCode: result.errorCode, error: result.error }, { status });
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
