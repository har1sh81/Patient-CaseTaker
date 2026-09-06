/**
 * Task #27 — Clinical Relevance Retrieval API Route Handler
 * POST /api/patients/[patientId]/relevance
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRelevantClinicalEvidence } from '@/lib/clinical/relevance';
import type { TimelineEventType } from '@/lib/clinical/timeline/types';

const ALLOWED_EVENT_TYPES: TimelineEventType[] = [
  'encounter',
  'symptom',
  'vital',
  'medication',
  'lab',
  'diagnosis',
  'procedure',
  'document',
  'ayush_assessment',
  'attention_flag',
  'conversation',
];

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
      // Body may be empty for broad patient relevance query
      body = {};
    }

    const {
      encounterId,
      department,
      consultationMode,
      chiefComplaint,
      symptoms,
      clinicalFacts,
      questionContext,
      eventTypes,
      fromDate,
      toDate,
      limit,
    } = body;

    // Validate eventTypes if provided
    let requestedEventTypes: TimelineEventType[] | undefined;
    if (eventTypes !== undefined && eventTypes !== null) {
      if (!Array.isArray(eventTypes)) {
        return NextResponse.json(
          { success: false, errorCode: 'INVALID_INPUT', error: "'eventTypes' must be an array" },
          { status: 400 }
        );
      }
      for (const et of eventTypes) {
        if (!ALLOWED_EVENT_TYPES.includes(et as TimelineEventType)) {
          return NextResponse.json(
            { success: false, errorCode: 'INVALID_INPUT', error: `Invalid eventType: '${et}'` },
            { status: 400 }
          );
        }
      }
      requestedEventTypes = eventTypes as TimelineEventType[];
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

    const result = await getRelevantClinicalEvidence({
      patientId,
      encounterId,
      department,
      consultationMode,
      chiefComplaint,
      symptoms: Array.isArray(symptoms) ? symptoms : undefined,
      clinicalFacts: Array.isArray(clinicalFacts) ? clinicalFacts : undefined,
      questionContext,
      requestedEventTypes,
      fromDate,
      toDate,
      limit: parsedLimit,
    });

    if (!result.success) {
      if (result.errorCode === 'NOT_FOUND') {
        return NextResponse.json(result, { status: 404 });
      }
      if (result.errorCode === 'CONSENT_DENIED') {
        return NextResponse.json(result, { status: 403 });
      }
      if (result.errorCode === 'INVALID_INPUT') {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        errorCode: 'INTERNAL_ERROR',
        error: err?.message || 'Failed to process clinical relevance retrieval request',
      },
      { status: 500 }
    );
  }
}
