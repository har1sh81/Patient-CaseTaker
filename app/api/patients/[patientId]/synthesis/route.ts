/**
 * Task #29 — Clinical Synthesis API Route Handlers
 * POST /api/patients/[patientId]/synthesis
 * GET  /api/patients/[patientId]/synthesis
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateClinicalSynthesis, getClinicalSynthesis } from '@/lib/clinical/synthesis';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const resolvedParams = await params;
    const patientId = resolvedParams.patientId;

    if (!patientId || patientId.trim() === '') {
      return NextResponse.json(
        { success: false, errorCode: 'INVALID_INPUT', error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const {
      encounterId,
      department,
      consultationMode,
      chiefComplaint,
      symptoms,
      clinicalFacts,
      requestedEventTypes,
      fromDate,
      toDate,
      limit,
    } = body;

    if (symptoms !== undefined && symptoms !== null && !Array.isArray(symptoms)) {
      return NextResponse.json(
        { success: false, errorCode: 'INVALID_INPUT', error: "'symptoms' must be an array" },
        { status: 400 }
      );
    }

    let parsedLimit = 20;
    if (limit !== undefined && limit !== null) {
      const numLimit = Number(limit);
      if (isNaN(numLimit) || numLimit < 1) {
        return NextResponse.json(
          { success: false, errorCode: 'INVALID_INPUT', error: "'limit' must be a positive integer" },
          { status: 400 }
        );
      }
      parsedLimit = Math.min(50, Math.floor(numLimit));
    }

    const result = await generateClinicalSynthesis({
      patientId,
      encounterId,
      department,
      consultationMode,
      chiefComplaint,
      symptoms,
      clinicalFacts,
      requestedEventTypes,
      fromDate,
      toDate,
      limit: parsedLimit,
    });

    if (!result.success) {
      if (result.errorCode === 'NOT_FOUND') return NextResponse.json(result, { status: 404 });
      if (result.errorCode === 'CONSENT_DENIED') return NextResponse.json(result, { status: 403 });
      if (result.errorCode === 'INVALID_INPUT') return NextResponse.json(result, { status: 400 });
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        errorCode: 'INTERNAL_ERROR',
        error: err?.message || 'Failed to process clinical synthesis request',
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const resolvedParams = await params;
    const patientId = resolvedParams.patientId;

    if (!patientId || patientId.trim() === '') {
      return NextResponse.json(
        { success: false, errorCode: 'INVALID_INPUT', error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const encounterId = searchParams.get('encounterId') || undefined;

    const result = await getClinicalSynthesis(patientId, encounterId);

    if (!result.success) {
      if (result.errorCode === 'NOT_FOUND') return NextResponse.json(result, { status: 404 });
      if (result.errorCode === 'CONSENT_DENIED') return NextResponse.json(result, { status: 403 });
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        errorCode: 'INTERNAL_ERROR',
        error: err?.message || 'Failed to retrieve clinical synthesis',
      },
      { status: 500 }
    );
  }
}
