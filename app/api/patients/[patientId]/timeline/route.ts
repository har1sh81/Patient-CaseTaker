/**
 * Task #26 — Patient Clinical Timeline API Endpoint
 * GET /api/patients/[patientId]/timeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPatientTimeline, VALID_EVENT_TYPES } from '@/lib/clinical/timeline/timeline-service';
import { TimelineEventType } from '@/lib/clinical/timeline/types';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await context.params;

    if (!patientId || typeof patientId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'patientId is required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department') || undefined;
    const encounterId = searchParams.get('encounterId') || undefined;
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;
    const descendingParam = searchParams.get('descending');
    const descending = descendingParam === 'false' ? false : true;

    // Parse eventTypes comma-separated list
    const rawEventTypes = searchParams.get('eventTypes');
    let eventTypes: TimelineEventType[] | undefined;
    if (rawEventTypes) {
      const parsedTypes = rawEventTypes.split(',').map((t) => t.trim() as TimelineEventType);
      for (const t of parsedTypes) {
        if (!VALID_EVENT_TYPES.includes(t)) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'INVALID_INPUT',
              error: `Invalid eventType parameter: '${t}'`,
            },
            { status: 400 }
          );
        }
      }
      eventTypes = parsedTypes;
    }

    const result = await getPatientTimeline({
      patientId,
      department,
      encounterId,
      fromDate,
      toDate,
      eventTypes,
      descending,
    });

    if (!result.success) {
      if (result.errorCode === 'CONSENT_DENIED') {
        return NextResponse.json(
          { success: false, errorCode: result.errorCode, error: result.error },
          { status: 403 }
        );
      }
      if (result.errorCode === 'UNAUTHORIZED') {
        return NextResponse.json(
          { success: false, errorCode: result.errorCode, error: result.error },
          { status: 403 }
        );
      }
      if (result.errorCode === 'NOT_FOUND') {
        return NextResponse.json(
          { success: false, errorCode: result.errorCode, error: result.error },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, errorCode: result.errorCode || 'INVALID_INPUT', error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        errorCode: 'INTERNAL_ERROR',
        error: err?.message || 'An unexpected error occurred while fetching timeline',
      },
      { status: 500 }
    );
  }
}
