/**
 * Task #9 — Interview Start API Route
 * MediKiosk Clinical Architecture
 * 
 * POST /api/interview/start
 */

import { NextResponse } from 'next/server';
import { startInterviewSession } from '@/lib/clinical/interview/interview-service';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      patientId,
      encounterId,
      department = 'General Medicine',
      consultationMode = 'general_medicine',
      language = 'en',
      chiefComplaint,
    } = body;

    const result = await startInterviewSession({
      patientId,
      encounterId,
      department,
      consultationMode,
      language,
      chiefComplaint,
    });

    if (!result.success) {
      const status = result.errorCode === 'CONSENT_DENIED' ? 403 : result.errorCode === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ success: false, error: result.error, errorCode: result.errorCode }, { status });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (err: any) {
    console.error('[API Interview Start] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
