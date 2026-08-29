import { ClinicalHistoryReport, IntakeSession } from '../../types';

export function mapToFHIRBundle(session: IntakeSession, report: ClinicalHistoryReport): any {
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

  // 3. Chief Complaint (Condition)
  if (report.clinicalHistory.chiefComplaint) {
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
        code: { text: report.clinicalHistory.chiefComplaint.primaryComplaint },
        subject: { reference: `Patient/${patientResource.id}` },
        encounter: { reference: `Encounter/${encounterResource.id}` },
      }
    });
  }

  // 4. Past Medical History (Condition)
  report.clinicalHistory.pastMedicalHistory.forEach((cond) => {
    bundle.entry.push({
      resource: {
        resourceType: 'Condition',
        id: cond.id,
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: cond.status === 'active' ? 'active' : 'resolved' }],
        },
        code: { text: cond.conditionName },
        subject: { reference: `Patient/${patientResource.id}` },
        onsetDateTime: cond.diagnosedDate,
      }
    });
  });

  // 5. Medications (MedicationStatement)
  report.clinicalHistory.medications.forEach((med) => {
    bundle.entry.push({
      resource: {
        resourceType: 'MedicationStatement',
        id: med.id,
        status: med.status === 'active' ? 'active' : med.status === 'past' ? 'completed' : 'unknown',
        medicationCodeableConcept: { text: med.name },
        subject: { reference: `Patient/${patientResource.id}` },
        dosage: [{ text: `${med.dosage || ''} ${med.frequency || ''} ${med.route || ''}`.trim() }],
      }
    });
  });

  // 6. Allergies (AllergyIntolerance)
  report.clinicalHistory.allergies.forEach((alg) => {
    bundle.entry.push({
      resource: {
        resourceType: 'AllergyIntolerance',
        id: alg.id,
        category: [alg.category === 'drug' ? 'medication' : alg.category === 'food' ? 'food' : alg.category === 'environmental' ? 'environment' : 'biologic'],
        code: { text: alg.allergen },
        patient: { reference: `Patient/${patientResource.id}` },
        reaction: alg.reaction ? [{ manifestation: [{ text: alg.reaction }] }] : undefined,
      }
    });
  });

  // 7. Surgeries (Procedure)
  report.clinicalHistory.pastSurgicalHistory.forEach((surg) => {
    bundle.entry.push({
      resource: {
        resourceType: 'Procedure',
        id: surg.id,
        status: 'completed',
        code: { text: surg.procedureName },
        subject: { reference: `Patient/${patientResource.id}` },
        performedDateTime: surg.date,
      }
    });
  });

  // 8. Labs (Observation)
  report.documentSummary.laboratoryResults.forEach((lab) => {
    bundle.entry.push({
      resource: {
        resourceType: 'Observation',
        id: lab.id,
        status: 'final',
        code: { text: lab.testName },
        subject: { reference: `Patient/${patientResource.id}` },
        valueString: lab.valueRaw,
        referenceRange: lab.referenceRangeRaw ? [{ text: lab.referenceRangeRaw }] : undefined,
        effectiveDateTime: lab.testDate,
      }
    });
  });

  // 9. Extracted Conditions (Condition)
  report.documentSummary.extractedConditions.forEach((cond) => {
    bundle.entry.push({
      resource: {
        resourceType: 'Condition',
        id: `ext-cond-${Math.random().toString(36).substring(7)}`,
        code: { text: cond.name },
        subject: { reference: `Patient/${patientResource.id}` },
      }
    });
  });

  // 10. Documents (DocumentReference)
  report.documentSummary.documents.forEach((doc) => {
    bundle.entry.push({
      resource: {
        resourceType: 'DocumentReference',
        id: doc.id,
        status: 'current',
        type: { text: doc.type },
        subject: { reference: `Patient/${patientResource.id}` },
        content: [{
          attachment: {
            title: doc.fileName,
          }
        }]
      }
    });
  });

  return bundle;
}
