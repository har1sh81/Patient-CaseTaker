import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/supabase/db-service';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { ClinicalHistoryReport } from '../../../../../types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { getAIProvider } from '@/lib/ai/factory';

const ConfirmRequestSchema = z.object({
  sessionId: z.string(),
  patientConfirmed: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = ConfirmRequestSchema.safeParse(json);

    if (!body.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const { sessionId, patientConfirmed } = body.data;

    if (!patientConfirmed) {
      return NextResponse.json({ error: 'Patient confirmation required' }, { status: 400 });
    }

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
      return NextResponse.json({ success: true, message: 'Already sent to doctor' }, { status: 200 });
    }

    // if (session.status !== 'patient_review' && session.status !== 'report_ready') {
    //   return NextResponse.json({ error: 'Session not in review state' }, { status: 400 });
    // }

    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 403 });
    }

    let report = await db.getReportBySession(sessionId);
    if (!report) {
      const patient = await db.getPatient(session.patientId!);
      const answers = await db.getSessionAnswers(sessionId);
      const timeline = await db.getTimeline(sessionId);
      const flags = await db.getSessionFlags(sessionId);
      const provider = getAIProvider();
      const docs = await db.getSessionDocuments(sessionId);
      const extractions = [];
      for (const d of docs) {
        const ext = await db.getExtraction(d.id);
        if (ext) extractions.push(ext);
      }

      const genResponse = await provider.generateClinicalHistoryDraft({
        session,
        patient: patient || {
          id: session.patientId!,
          demographics: { firstName: 'Patient', fullName: 'Kiosk Patient', age: 35, gender: 'other' },
          identification: {},
          createdAt: new Date().toISOString(),
        },
        answers,
        timeline: timeline ? timeline.records : [],
        documents: extractions,
        flags,
        patientReview: { sessionId, sections: [], status: 'pending' },
      });
      report = genResponse.report;
    }

    // Freeze the snapshot
    const snapshotId = `snp_${randomUUID()}`;
    const frozenReport: ClinicalHistoryReport = {
      ...report,
      reportId: snapshotId,
      patientConfirmation: {
        confirmedByPatient: true,
        correctionsMade: (await db.getSessionCorrections(sessionId)).length,
      },
    };

    // Save frozen report (the mock DB handles upsert, but we give it a new ID)
    await db.saveReport(frozenReport);

    await db.updateSession(sessionId, {
      status: 'sent_to_doctor',
      handoffSnapshotId: snapshotId,
      handoffAt: new Date().toISOString(),
    });

    await db.saveAuditLog({
      id: `adt_${randomUUID()}`,
      sessionId,
      action: 'patient_confirmation_completed',
      metadata: { details: 'Patient confirmed the clinical history and sent to doctor' },
      timestamp: new Date().toISOString(),
    });

    // Determine assigned doctor based on chief complaint / department mode
    const complaintText = (report?.clinicalHistory?.chiefComplaint?.primaryComplaint || '').toLowerCase();
    
    let doctorAssignment = {
      doctorName: 'Dr. Rajesh Sharma, MD',
      specialty: 'General Medicine & Internal Care',
      roomNumber: 'Room 204',
      floor: '2nd Floor, Wing B',
      tokenNumber: `MK-${Math.floor(100 + Math.random() * 900)}`
    };

    if (complaintText.includes('heart') || complaintText.includes('chest') || complaintText.includes('palpitation')) {
      doctorAssignment = {
        doctorName: 'Dr. Ananya Roy, MD',
        specialty: 'Cardiology & Critical Care',
        roomNumber: 'Room 108',
        floor: '1st Floor, OPD Block A',
        tokenNumber: `MK-${Math.floor(100 + Math.random() * 900)}`
      };
    } else if (complaintText.includes('bone') || complaintText.includes('joint') || complaintText.includes('knee') || complaintText.includes('back') || complaintText.includes('fracture')) {
      doctorAssignment = {
        doctorName: 'Dr. Vikram Patel, MS',
        specialty: 'Orthopedics & Joint Care',
        roomNumber: 'Room 312',
        floor: '3rd Floor, Wing C',
        tokenNumber: `MK-${Math.floor(100 + Math.random() * 900)}`
      };
    } else if (session.departmentMode === 'ayush' || complaintText.includes('ayush') || complaintText.includes('prakriti')) {
      doctorAssignment = {
        doctorName: 'Dr. Meera Vaidya, BAMS',
        specialty: 'Ayurveda & Panchakarma',
        roomNumber: 'Room 102',
        floor: 'Ground Floor, AYUSH OPD',
        tokenNumber: `MK-${Math.floor(100 + Math.random() * 900)}`
      };
    }

    return NextResponse.json({ 
      success: true, 
      snapshotId,
      doctorAssignment 
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Failed to confirm session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
