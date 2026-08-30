import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/supabase/db-service';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { ClinicalHistoryReport } from '../../../../../types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { getAIProvider } from '@/lib/ai/factory';
import { composeClinicalConsultationSummary } from '@/lib/reports/report-composer';
import { generateClinicalSummaryPDFBuffer } from '@/lib/reports/pdf-generator';
import { storeClinicalSummaryPDF } from '@/lib/reports/pdf-storage';

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

    const isMockOrDemo = process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED === 'true' || process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.DEMO_ENVIRONMENT === 'true';
    if (isSupabaseConfigured() && !isMockOrDemo) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== session.patientId) {
        return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 403 });
      }
    }


    if (session.status === 'sent_to_doctor') {
      const existingReport = await db.getReportBySession(sessionId);
      const snapshotId = session.handoffSnapshotId || existingReport?.reportId || `snp_${sessionId}`;
      
      const complaintText = (existingReport?.clinicalHistory?.chiefComplaint?.primaryComplaint || '').toLowerCase();
      let doctorAssignment = {
        doctorName: 'Dr. Rajesh Sharma, MD',
        specialty: 'General Medicine & Internal Care',
        roomNumber: 'Room 204',
        floor: '2nd Floor, Wing B',
        tokenNumber: `MK-305`
      };

      if (complaintText.includes('heart') || complaintText.includes('chest') || complaintText.includes('palpitation')) {
        doctorAssignment = {
          doctorName: 'Dr. Ananya Roy, MD',
          specialty: 'Cardiology & Critical Care',
          roomNumber: 'Room 108',
          floor: '1st Floor, OPD Block A',
          tokenNumber: `MK-108`
        };
      } else if (complaintText.includes('bone') || complaintText.includes('joint') || complaintText.includes('knee') || complaintText.includes('back') || complaintText.includes('fracture')) {
        doctorAssignment = {
          doctorName: 'Dr. Vikram Patel, MS',
          specialty: 'Orthopedics & Joint Care',
          roomNumber: 'Room 312',
          floor: '3rd Floor, Wing C',
          tokenNumber: `MK-312`
        };
      } else if (session.departmentMode === 'ayush' || complaintText.includes('ayush') || complaintText.includes('prakriti')) {
        doctorAssignment = {
          doctorName: 'Dr. Meera Vaidya, BAMS',
          specialty: 'Ayurveda & Panchakarma',
          roomNumber: 'Room 102',
          floor: 'Ground Floor, AYUSH OPD',
          tokenNumber: `MK-102`
        };
      }

      return NextResponse.json({ 
        success: true, 
        snapshotId,
        doctorAssignment,
        message: 'Already sent to doctor' 
      }, { status: 200 });
    }

    // if (session.status !== 'patient_review' && session.status !== 'report_ready') {
    //   return NextResponse.json({ error: 'Session not in review state' }, { status: 400 });
    // }

    if (session.expiresAt && new Date(session.expiresAt) < new Date() && !isMockOrDemo) {
      return NextResponse.json({ error: 'Session expired' }, { status: 403 });
    }

    const patient = (await db.getPatient(session.patientId!)) || {
      id: session.patientId || 'pat_demo',
      demographics: { firstName: 'Patient', fullName: 'Kiosk Patient', age: 35, gender: 'other' },
      identification: {},
      createdAt: new Date().toISOString(),
    };
    const answers = await db.getSessionAnswers(sessionId);
    const timeline = await db.getTimeline(sessionId);
    const flags = await db.getSessionFlags(sessionId);
    const docs = await db.getSessionDocuments(sessionId);
    const extractions = [];
    for (const d of docs) {
      const ext = await db.getExtraction(d.id);
      if (ext) extractions.push(ext);
    }

    // 1. Compose canonical ClinicalConsultationSummary
    const summary = composeClinicalConsultationSummary({
      session,
      patient,
      answers,
      flags,
      timelineEvents: [],
      documents: extractions,
    });

    // 2. Render server-side PDF snapshot
    const pdfBuffer = await generateClinicalSummaryPDFBuffer(summary);
    const pdfPath = await storeClinicalSummaryPDF(sessionId, pdfBuffer);
    summary.pdfUrl = `/api/doctor/cases/${sessionId}/pdf`;

    // Freeze the snapshot
    const snapshotId = `snp_${randomUUID()}`;
    const frozenReport: ClinicalHistoryReport = {
      reportId: snapshotId,
      reportVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      sessionId,
      patient: {
        fullName: patient.demographics?.fullName || 'Kiosk Patient',
        age: patient.demographics?.age,
        gender: patient.demographics?.gender,
        hospitalNumber: patient.identification?.hospitalNumber,
        abhaReference: patient.identification?.abhaReference,
      },
      visit: {
        generatedDate: new Date().toISOString().split('T')[0],
        departmentMode: session.departmentMode,
        intakeLanguage: session.language || (session as any).preferredLanguage || 'en',
        reasonForVisit: summary.chiefComplaint.primaryComplaint,
      },
      clinicalHistory: {
        chiefComplaint: {
          primaryComplaint: summary.chiefComplaint.primaryComplaint,
          additionalComplaints: [],
          provenance: { source: 'patient_voice' },
        },
        historyOfPresentIllness: {
          patientNarrative: summary.chiefComplaint.patientWords || summary.chiefComplaint.primaryComplaint,
          completeness: { missingFields: summary.informationNotReported, completedFields: ['primaryComplaint'] },
        },
        pastMedicalHistory: summary.relevantPreviousHistory.map((h: any, idx: number) => ({
          id: `pmh_${idx}`,
          conditionName: h.conditionName,
          status: 'active' as const,
          provenance: { source: 'patient_voice' },
        })),
        pastSurgicalHistory: [],
        medications: summary.medications.map((m: any, idx: number) => ({
          id: `med_${idx}`,
          name: m.medicationName,
          status: 'active' as const,
          provenance: { source: 'patient_voice' },
        })),
        allergies: [],
        familyHistory: [],
      },
      documentSummary: {
        uploadedDocumentCount: extractions.length,
        documents: extractions.map((d: any) => ({ id: d.documentId, type: d.documentType, fileName: d.documentId })),
        extractedConditions: extractions.flatMap((d: any) => d.extractedConditions || []),
        laboratoryResults: [],
        admissions: [],
      },
      medicalTimeline: [],
      attentionFlags: flags,
      patientConfirmation: {
        confirmedByPatient: true,
        confirmedAt: new Date().toISOString(),
        correctionsMade: (await db.getSessionCorrections(sessionId)).length,
      },
      physicianVerification: {
        status: 'pending_physician_review',
        signatureRequired: false,
      },
      reference: {
        referenceNumber: summary.reference.referenceNumber,
        qrPayload: summary.reference.qrPayload,
        generatedAt: summary.reference.generatedAt,
      },
    };

    // Save frozen report
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
    const complaintText = (summary?.chiefComplaint?.primaryComplaint || '').toLowerCase();
    
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
