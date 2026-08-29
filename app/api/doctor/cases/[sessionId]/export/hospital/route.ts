import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/supabase/db-service';
import { mapToFHIRBundle } from '@/lib/fhir/mapper';
import { getHospitalProvider } from '@/lib/integrations/hospital-provider';
import { randomUUID } from 'crypto';

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { sessionId } = await context.params;
    
    // Check existing records for idempotency
    const existing = await db.getExportRecords(sessionId);
    const existingHospital = existing.find((r: any) => r.exportType === 'fhir_hospital' && r.status === 'sent');
    if (existingHospital) {
      return NextResponse.json({ success: true, record: existingHospital, cached: true });
    }

    const session = await db.getSession(sessionId);
    if (!session || session.status !== 'finalized') {
      return NextResponse.json({ error: 'Export rejected: Session is not finalized.' }, { status: 403 });
    }

    const reportId = session.handoffSnapshotId || sessionId; // simplified for safety
    let report = await db.getReport(reportId);
    if (!report) report = await db.getReportBySession(sessionId);

    if (!report || (report.physicianVerification.status !== 'verified' && report.physicianVerification.status !== 'corrected')) {
      return NextResponse.json({ error: 'Export rejected: Report has not been verified.' }, { status: 403 });
    }

    const fhirBundle = mapToFHIRBundle(session, report);

    const provider = getHospitalProvider();
    
    try {
      const result = await provider.sendClinicalRecord(fhirBundle);
      
      const record = await db.saveExportRecord({
        id: `exp_hosp_${randomUUID()}`,
        sessionId,
        reportId: report.reportId,
        exportType: 'fhir_hospital',
        status: result.success ? 'sent' : 'failed',
        externalReferenceId: result.externalId,
        provider: 'MockHospitalProvider',
        failureReason: result.error,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: result.success, record });
    } catch (err: any) {
      // Create failed record
      const record = await db.saveExportRecord({
        id: `exp_hosp_${randomUUID()}`,
        sessionId,
        reportId: report.reportId,
        exportType: 'fhir_hospital',
        status: 'failed',
        provider: 'MockHospitalProvider',
        failureReason: err.message || 'Unknown network error',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: false, record, error: err.message }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Failed to export to hospital:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
