/**
 * Task #30 — AI Clinical Summary API Route
 * MediKiosk Clinical API
 * 
 * POST /api/patients/[patientId]/ai-summary — Generates AI draft summary
 * GET  /api/patients/[patientId]/ai-summary — Retrieves latest AI draft summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAiClinicalSummary, getLatestAiClinicalSummary } from '@/lib/clinical/ai-summary/summary-service';
import type { SummaryLanguage } from '@/lib/clinical/ai-summary/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    const body = await req.json().catch(() => ({}));
    const { encounterId, summaryLanguage, forceRegenerate } = body;

    const result = await generateAiClinicalSummary({
      patientId,
      encounterId,
      summaryLanguage: summaryLanguage as SummaryLanguage,
      forceRegenerate: Boolean(forceRegenerate),
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const encounterId = searchParams.get('encounterId') || undefined;

    const result = await getLatestAiClinicalSummary(patientId, encounterId);

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
