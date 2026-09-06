/**
 * Task #28 — Clinical Conflict Resolution API Route Handlers
 * POST /api/patients/[patientId]/conflicts
 * GET  /api/patients/[patientId]/conflicts
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzePatientConflicts, getPatientConflicts } from '@/lib/clinical/conflicts';
import type { ConflictSeverity, ConflictType } from '@/lib/clinical/conflicts/types';

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

    const { encounterId, eventTypes, fromDate, toDate, includeResolved, limit } = body;

    // Validate eventTypes if provided
    if (eventTypes !== undefined && eventTypes !== null && !Array.isArray(eventTypes)) {
      return NextResponse.json(
        { success: false, errorCode: 'INVALID_INPUT', error: "'eventTypes' must be an array" },
        { status: 400 }
      );
    }

    // Validate limit if provided
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

    const result = await analyzePatientConflicts({
      patientId,
      encounterId,
      eventTypes,
      fromDate,
      toDate,
      includeResolved: includeResolved ?? true,
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
        error: err?.message || 'Failed to process clinical conflict analysis request',
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
    const conflictType = (searchParams.get('conflictType') as ConflictType) || undefined;
    const severity = (searchParams.get('severity') as ConflictSeverity) || undefined;
    const includeResolvedParam = searchParams.get('includeResolved');
    const includeResolved = includeResolvedParam !== null ? includeResolvedParam === 'true' : true;
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;

    const limitParam = searchParams.get('limit');
    let parsedLimit = 20;
    if (limitParam) {
      const numLimit = Number(limitParam);
      if (isNaN(numLimit) || numLimit < 1) {
        return NextResponse.json(
          { success: false, errorCode: 'INVALID_INPUT', error: "'limit' must be a positive integer" },
          { status: 400 }
        );
      }
      parsedLimit = Math.min(50, Math.floor(numLimit));
    }

    const result = await getPatientConflicts({
      patientId,
      encounterId,
      conflictType,
      severity,
      includeResolved,
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
        error: err?.message || 'Failed to retrieve clinical conflicts',
      },
      { status: 500 }
    );
  }
}
