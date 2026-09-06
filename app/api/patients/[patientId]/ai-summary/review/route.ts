/**
 * Task #30 — Physician Review API Route
 * MediKiosk Clinical API
 * 
 * POST /api/patients/[patientId]/ai-summary/review — Accepts or edits AI draft summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { reviewAiClinicalSummary } from '@/lib/clinical/ai-summary/summary-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    const body = await req.json().catch(() => ({}));
    const { encounterId, action, editedText, reviewedBy } = body;

    if (!action || (action !== 'accept' && action !== 'edit')) {
      return NextResponse.json(
        { success: false, errorCode: 'INVALID_INPUT', error: "Action must be 'accept' or 'edit'" },
        { status: 400 }
      );
    }

    const result = await reviewAiClinicalSummary(patientId, {
      encounterId,
      action,
      editedText,
      reviewedBy,
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
