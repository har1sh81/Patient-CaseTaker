import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/supabase/db-service';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { PatientCorrection } from '../../../../../types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

const CorrectionsRequestSchema = z.object({
  sessionId: z.string(),
  fieldPath: z.string(),
  previousValue: z.unknown(),
  correctedValue: z.unknown(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = CorrectionsRequestSchema.safeParse(json);

    if (!body.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const { sessionId, fieldPath, previousValue, correctedValue } = body.data;

    const session = await db.getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    }

    if (isSupabaseConfigured() && process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED !== 'true' && process.env.NODE_ENV !== 'development' && process.env.DEMO_ENVIRONMENT !== 'true') {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== session.patientId) {
        return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 403 });
      }
    }


    if (session.status === 'sent_to_doctor') {
      return NextResponse.json({ error: 'Session already sent to doctor, cannot be modified' }, { status: 400 });
    }

    const correction: PatientCorrection = {
      id: `cor_${randomUUID()}`,
      sessionId,
      fieldPath,
      previousValue,
      correctedValue,
      correctedBy: 'patient',
      correctedAt: new Date().toISOString(),
    };

    await db.saveCorrection(correction);

    await db.saveAuditLog({
      id: `adt_${randomUUID()}`,
      sessionId,
      action: 'patient_correction_recorded',
      metadata: { details: `Patient corrected field: ${fieldPath}` },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, correction }, { status: 200 });
  } catch (error: unknown) {
    console.error('Failed to save correction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
