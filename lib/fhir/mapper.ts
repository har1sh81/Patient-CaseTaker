import { ClinicalHistoryReport, IntakeSession } from '../../types';

export function mapToFHIRBundle(session: IntakeSession, report: any): any {
  const bundle = {
    resourceType: 'Bundle',
    type: 'collection',
    entry: [] as any[],
  };

  // 1. Patient
  const patientResource = {
    resourceType: 'Patient',
    id: report.patient.abhaReference || report.patient.hospitalNumber || report.sessionId,
    name: [{
      use: 'official',
      text: report.patient.fullName,
    }],
    gender: report.patient.gender === 'male' || report.patient.gender === 'female' ? report.patient.gender : 'unknown',
  };
  bundle.entry.push({ resource: patientResource });

  // 2. Encounter
  const encounterResource = {
    resourceType: 'Encounter',
    id: report.sessionId,
    status: 'finished',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
      display: 'ambulatory',
    },
    subject: { reference: `Patient/${patientResource.id}` },
    reasonCode: report.visit.reasonForVisit ? [{
      text: report.visit.reasonForVisit,
    }] : undefined,
    period: {
      start: session.startedAt,
      end: session.completedAt || new Date().toISOString(),
    },
  };
  bundle.entry.push({ resource: encounterResource });

  // Resolve fields safely across ClinicalHistoryReport and ClinicalConsultationSummary
  const primaryCc = report.clinicalHistory?.chiefComplaint?.primaryComplaint || report.chiefComplaint?.primaryComplaint;
  const pastMedical = Array.isArray(report.clinicalHistory?.pastMedicalHistory) ? report.clinicalHistory.pastMedicalHistory : Array.isArray(report.relevantPreviousHistory) ? report.relevantPreviousHistory : [];
  const meds = Array.isArray(report.clinicalHistory?.medications) ? report.clinicalHistory.medications : Array.isArray(report.medications) ? report.medications : [];
  const algs = Array.isArray(report.clinicalHistory?.allergies) ? report.clinicalHistory.allergies : Array.isArray(report.allergies) ? report.allergies : [];
  const surgs = Array.isArray(report.clinicalHistory?.pastSurgicalHistory) ? report.clinicalHistory.pastSurgicalHistory : [];
  const labs = Array.isArray(report.documentSummary?.laboratoryResults) ? report.documentSummary.laboratoryResults : Array.isArray(report.investigations) ? report.investigations : [];
  const extConds = Array.isArray(report.documentSummary?.extractedConditions) ? report.documentSummary.extractedConditions : [];
  const docs = Array.isArray(report.documentSummary?.documents) ? report.documentSummary.documents : Array.isArray(report.uploadedDocuments) ? report.uploadedDocuments : [];

  // 3. Chief Complaint (Condition)
  if (primaryCc) {
    bundle.entry.push({
      resource: {
        resourceType: 'Condition',
        id: `cc-${report.sessionId}`,
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }],
        },
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'encounter-diagnosis' }],
        }],
        code: { text: primaryCc },
        subject: { reference: `Patient/${patientResource.id}` },
        encounter: { reference: `Encounter/${encounterResource.id}` },
      }
    });
  }

  // 4. Past Medical History (Condition)
  pastMedical.forEach((cond: any) => {
    const name = cond.conditionName || cond.condition || cond.name;
    if (!name) return;
    bundle.entry.push({
      resource: {
        resourceType: 'Condition',
        id: cond.id || `pmh-${Math.random().toString(36).substring(7)}`,
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: cond.status === 'active' ? 'active' : 'resolved' }],
        },
        code: { text: name },
        subject: { reference: `Patient/${patientResource.id}` },
        onsetDateTime: cond.diagnosedDate || cond.date,
      }
    });
  });

  // 5. Medications (MedicationStatement)
  meds.forEach((med: any) => {
    const name = med.name || med.drugName || med.medicationName;
    if (!name) return;
    bundle.entry.push({
      resource: {
        resourceType: 'MedicationStatement',
        id: med.id || `med-${Math.random().toString(36).substring(7)}`,
        status: med.status === 'active' ? 'active' : med.status === 'past' ? 'completed' : 'unknown',
        medicationCodeableConcept: { text: name },
        subject: { reference: `Patient/${patientResource.id}` },
        dosage: [{ text: `${med.dosage || ''} ${med.frequency || ''} ${med.route || ''}`.trim() }],
      }
    });
  });

  // 6. Allergies (AllergyIntolerance)
  algs.forEach((alg: any) => {
    const allergen = alg.allergen || alg.allergy;
    if (!allergen) return;
    bundle.entry.push({
      resource: {
        resourceType: 'AllergyIntolerance',
        id: alg.id || `alg-${Math.random().toString(36).substring(7)}`,
        category: [alg.category === 'drug' ? 'medication' : alg.category === 'food' ? 'food' : alg.category === 'environmental' ? 'environment' : 'biologic'],
        code: { text: allergen },
        patient: { reference: `Patient/${patientResource.id}` },
        reaction: alg.reaction ? [{ manifestation: [{ text: alg.reaction }] }] : undefined,
      }
    });
  });

  // 7. Surgeries (Procedure)
  surgs.forEach((surg: any) => {
    const procName = surg.procedureName || surg.name;
    if (!procName) return;
    bundle.entry.push({
      resource: {
        resourceType: 'Procedure',
        id: surg.id || `surg-${Math.random().toString(36).substring(7)}`,
        status: 'completed',
        code: { text: procName },
        subject: { reference: `Patient/${patientResource.id}` },
        performedDateTime: surg.date,
      }
    });
  });

  // 8. Labs (Observation)
  labs.forEach((lab: any) => {
    const testName = lab.testName || lab.test || lab.title;
    if (!testName) return;
    bundle.entry.push({
      resource: {
        resourceType: 'Observation',
        id: lab.id || `lab-${Math.random().toString(36).substring(7)}`,
        status: 'final',
        code: { text: testName },
        subject: { reference: `Patient/${patientResource.id}` },
        valueString: lab.valueRaw || lab.value || lab.result,
        referenceRange: lab.referenceRangeRaw ? [{ text: lab.referenceRangeRaw }] : undefined,
        effectiveDateTime: lab.testDate || lab.date,
      }
    });
  });

  // 9. Extracted Conditions (Condition)
  extConds.forEach((cond: any) => {
    const name = cond.name || cond.conditionName;
    if (!name) return;
    bundle.entry.push({
      resource: {
        resourceType: 'Condition',
        id: `ext-cond-${Math.random().toString(36).substring(7)}`,
        code: { text: name },
        subject: { reference: `Patient/${patientResource.id}` },
      }
    });
  });

  // 10. Documents (DocumentReference)
  docs.forEach((doc: any) => {
    const title = doc.fileName || doc.title || doc.name;
    if (!title) return;
    bundle.entry.push({
      resource: {
        resourceType: 'DocumentReference',
        id: doc.id || `doc-${Math.random().toString(36).substring(7)}`,
        status: 'current',
        type: { text: doc.type || 'Medical Document' },
        subject: { reference: `Patient/${patientResource.id}` },
        content: [{
          attachment: {
            title,
          }
        }]
      }
    });
  });

  return bundle;
}
