import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/supabase/db-service';
import { getHealthRecordProvider } from '../../../../../lib/abdm/factory';
import { ClinicalHistory } from '../../../../../types';

export async function POST(request: Request) {
  try {
    const { transactionId, otp, abhaReference, patientId, sessionId } = await request.json();

    if (!transactionId || !otp || !abhaReference || !patientId || !sessionId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const provider = getHealthRecordProvider();
    const rawRecords = await provider.verifyConsentAndFetchRecords(transactionId, otp, abhaReference);

    if (rawRecords.recordsFetched === 0) {
      return NextResponse.json({ success: true, message: 'No records found', data: rawRecords });
    }

    // Normalization logic: Map provider specific records to our canonical ClinicalHistorySchema
    const clinicalHistory: ClinicalHistory = {
      id: `ch_${Math.random().toString(36).substring(2, 11)}`,
      sessionId,
      patientId,
      pastMedicalHistory: (rawRecords.conditions || []).map(cond => ({
        id: cond.id,
        conditionName: cond.display,
        diagnosedDate: cond.dateRecorded,
        status: cond.clinicalStatus === 'active' ? 'active' : 'past',
        provenance: { source: 'abdm', timestamp: new Date().toISOString() }
      })),
      pastSurgicalHistory: (rawRecords.procedures || []).map(proc => ({
        id: proc.id,
        procedureName: proc.procedureName,
        date: proc.date,
        hospital: proc.performer,
        provenance: { source: 'abdm', timestamp: new Date().toISOString() }
      })),
      medications: (rawRecords.medications || []).map(med => ({
        id: med.id,
        name: med.drugName,
        status: med.status === 'active' ? 'active' : 'past',
        dosage: med.dosageInstruction,
        startDate: med.prescribedDate,
        provenance: { source: 'abdm', timestamp: new Date().toISOString() }
      })),
      allergies: [],
      familyHistory: [],
      sourceSummary: {
        patientInterviewCompleted: false,
        documentsProcessed: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to the database
    await db.saveClinicalHistory(clinicalHistory);

    return NextResponse.json({ success: true, data: clinicalHistory });
  } catch (error) {
    console.error('ABDM Records Fetch Error:', error);
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
