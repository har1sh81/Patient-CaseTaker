import { DatabaseService } from './repository';
import {
  Patient,
  Consent,
  IntakeSession,
  ConversationMessage,
  ConversationAnswer,
  MedicalDocument,
  DocumentExtractionResult,
  ClinicalHistory,
  AttentionFlag,
  PatientCorrection,
  ClinicalHistoryReport,
  AuditLog,
  OCRResponse,
  MedicalTimeline,
  ExportRecord
} from '../../types';
import {
  PatientSchema,
  ConsentSchema,
  IntakeSessionSchema,
  ConversationMessageSchema,
  ConversationAnswerSchema,
  MedicalDocumentSchema,
  DocumentExtractionResultSchema,
  ClinicalHistorySchema,
  AttentionFlagSchema,
  PatientCorrectionSchema,
  ClinicalHistoryReportSchema,
  AuditLogSchema,
  OCRResponseSchema,
  MedicalTimelineSchema
} from '../../schemas';
import { loadAndSeedScenario } from './seed-data';

export class MockRepository implements DatabaseService {
  private patients = new Map<string, Patient>();
  private consents = new Map<string, Consent>();
  private sessions = new Map<string, IntakeSession>();
  private messages = new Map<string, ConversationMessage>();
  private answers = new Map<string, ConversationAnswer>();
  private documents = new Map<string, MedicalDocument>();
  private extractions = new Map<string, DocumentExtractionResult>();
  private histories = new Map<string, ClinicalHistory>();
  private flags = new Map<string, AttentionFlag>();
  private corrections = new Map<string, PatientCorrection>();
  private reports = new Map<string, ClinicalHistoryReport>();
  private auditLogs = new Map<string, AuditLog>();
  private exportRecords = new Map<string, ExportRecord>();
  private ocrResponses = new Map<string, OCRResponse>();
  private timelines = new Map<string, MedicalTimeline>();

  // Patients
  async createPatient(patient: Patient): Promise<Patient> {
    PatientSchema.parse(patient);
    this.patients.set(patient.id, { ...patient });
    return PatientSchema.parse(this.patients.get(patient.id));
  }

  async getPatient(id: string): Promise<Patient | null> {
    let data = this.patients.get(id);
    if (!data && (id.startsWith('pat_') || id.startsWith('ses_'))) {
      const pId = id.startsWith('pat_') ? id : `pat_${id.substring(4)}`;
      data = {
        id: pId,
        identification: {},
        demographics: {
          firstName: 'Kiosk',
          fullName: 'Kiosk Patient',
          age: 35,
          gender: 'other',
        },
        createdAt: new Date().toISOString(),
      };
      this.patients.set(pId, data);
    }
    if (!data) return null;
    return PatientSchema.parse({ ...data });
  }

  async getPatientByHospitalNumber(hospitalNumber: string): Promise<Patient | null> {
    const list = Array.from(this.patients.values());
    const match = list.find((p) => p.identification?.hospitalNumber === hospitalNumber);
    if (!match) return null;
    return PatientSchema.parse({ ...match });
  }

  async getPatientByAbha(abhaReference: string): Promise<Patient | null> {
    const list = Array.from(this.patients.values());
    const match = list.find((p) => p.identification?.abhaReference === abhaReference);
    if (!match) return null;
    return PatientSchema.parse({ ...match });
  }

  async getPatientByMobile(mobileNumber: string): Promise<Patient | null> {
    const list = Array.from(this.patients.values());
    const match = list.find(
      (p) =>
        p.identification?.mobileNumber === mobileNumber ||
        p.contact?.mobileNumber === mobileNumber
    );
    if (!match) return null;
    return PatientSchema.parse({ ...match });
  }

  // Consents
  async saveConsent(consent: Consent): Promise<Consent> {
    ConsentSchema.parse(consent);
    this.consents.set(consent.id, { ...consent });
    return ConsentSchema.parse(this.consents.get(consent.id));
  }

  async getConsent(id: string): Promise<Consent | null> {
    const data = this.consents.get(id);
    if (!data) return null;
    return ConsentSchema.parse({ ...data });
  }

  // Sessions
  async createSession(session: IntakeSession): Promise<IntakeSession> {
    IntakeSessionSchema.parse(session);
    this.sessions.set(session.id, { ...session });
    return IntakeSessionSchema.parse(this.sessions.get(session.id));
  }

  async getSession(id: string): Promise<IntakeSession | null> {
    let data = this.sessions.get(id);
    if (!data && id.startsWith('ses_')) {
      const patientId = `pat_${id.substring(4)}`;
      await this.getPatient(patientId);

      data = {
        id,
        patientId,
        status: 'active',
        language: 'en',
        departmentMode: 'standard',
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60000).toISOString(),
        currentStep: 'documents',
        progress: {
          completedSections: ['consent', 'interview'],
          pendingSections: ['documents', 'review'],
          percentage: 40,
        },
        cleanupStatus: { temporaryDataDeleted: false },
      };
      this.sessions.set(id, data);
    }
    if (!data) return null;
    return IntakeSessionSchema.parse({ ...data });
  }

  async getSessionsByStatus(status: string): Promise<IntakeSession[]> {
    const list = Array.from(this.sessions.values());
    const matches = list.filter(s => s.status === status);
    return matches.map(m => IntakeSessionSchema.parse({ ...m }));
  }

  async updateSession(id: string, updates: Partial<IntakeSession>): Promise<IntakeSession> {
    let existing = this.sessions.get(id);
    if (!existing) {
      existing = (await this.getSession(id)) || undefined;
    }
    if (!existing) throw new Error(`Session ${id} not found in mock store`);
    
    const merged = { ...existing, ...updates };
    IntakeSessionSchema.parse(merged);
    this.sessions.set(id, merged);
    return IntakeSessionSchema.parse(this.sessions.get(id));
  }

  async cleanupSession(sessionId: string): Promise<void> {
    // Clear conversation logs
    for (const key of Array.from(this.messages.keys())) {
      if (this.messages.get(key)?.sessionId === sessionId) {
        this.messages.delete(key);
      }
    }
    // Clear answers
    for (const key of Array.from(this.answers.keys())) {
      if (this.answers.get(key)?.sessionId === sessionId) {
        this.answers.delete(key);
      }
    }
    // Clear corrections
    for (const key of Array.from(this.corrections.keys())) {
      if (this.corrections.get(key)?.sessionId === sessionId) {
        this.corrections.delete(key);
      }
    }
  }

  // Conversation
  async saveMessage(message: ConversationMessage): Promise<ConversationMessage> {
    ConversationMessageSchema.parse(message);
    this.messages.set(message.id, { ...message });
    return ConversationMessageSchema.parse(this.messages.get(message.id));
  }

  async getSessionMessages(sessionId: string): Promise<ConversationMessage[]> {
    const list = Array.from(this.messages.values());
    const matched = list.filter((m) => m.sessionId === sessionId);
    matched.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return matched.map((m) => ConversationMessageSchema.parse({ ...m }));
  }

  async saveAnswer(answer: ConversationAnswer): Promise<ConversationAnswer> {
    ConversationAnswerSchema.parse(answer);
    this.answers.set(answer.id, { ...answer });
    return ConversationAnswerSchema.parse(this.answers.get(answer.id));
  }

  async deleteAnswers(answerIds: string[]): Promise<void> {
    for (const id of answerIds) {
      this.answers.delete(id);
    }
  }

  async getSessionAnswers(sessionId: string): Promise<ConversationAnswer[]> {
    const list = Array.from(this.answers.values());
    const matched = list.filter((a) => a.sessionId === sessionId);
    matched.sort((a, b) => new Date(a.answeredAt).getTime() - new Date(b.answeredAt).getTime());
    return matched.map((a) => ConversationAnswerSchema.parse({ ...a }));
  }

  // Documents
  async saveDocument(doc: MedicalDocument): Promise<MedicalDocument> {
    MedicalDocumentSchema.parse(doc);
    this.documents.set(doc.id, { ...doc });
    return MedicalDocumentSchema.parse(this.documents.get(doc.id));
  }

  async getDocument(id: string): Promise<MedicalDocument | null> {
    const data = this.documents.get(id);
    if (!data) return null;
    return MedicalDocumentSchema.parse({ ...data });
  }

  async getSessionDocuments(sessionId: string): Promise<MedicalDocument[]> {
    return Array.from(this.documents.values()).filter(
      (doc) => doc.sessionId === sessionId
    );
  }

  async deleteDocument(documentId: string): Promise<void> {
    this.documents.delete(documentId);
  }

  // --- OCR Responses ---
  async saveOcrResponse(response: OCRResponse): Promise<OCRResponse> {
    OCRResponseSchema.parse(response);
    this.ocrResponses.set(response.documentId, { ...response });
    return OCRResponseSchema.parse(this.ocrResponses.get(response.documentId));
  }

  async getOcrResponse(documentId: string): Promise<OCRResponse | null> {
    const data = this.ocrResponses.get(documentId);
    if (!data) return null;
    return OCRResponseSchema.parse({ ...data });
  }

  async saveExtraction(extraction: DocumentExtractionResult): Promise<DocumentExtractionResult> {
    DocumentExtractionResultSchema.parse(extraction);
    this.extractions.set(extraction.documentId, { ...extraction });
    return DocumentExtractionResultSchema.parse(this.extractions.get(extraction.documentId));
  }

  async getExtraction(documentId: string): Promise<DocumentExtractionResult | null> {
    const list = Array.from(this.extractions.values());
    const match = list.find((e) => e.documentId === documentId);
    if (!match) return null;
    return DocumentExtractionResultSchema.parse({ ...match });
  }

  // Clinical Histories
  async saveClinicalHistory(history: ClinicalHistory): Promise<ClinicalHistory> {
    ClinicalHistorySchema.parse(history);
    this.histories.set(history.id, { ...history });
    return ClinicalHistorySchema.parse(this.histories.get(history.id));
  }

  async getClinicalHistory(sessionId: string): Promise<ClinicalHistory | null> {
    const list = Array.from(this.histories.values());
    const match = list.find((h) => h.sessionId === sessionId);
    if (!match) return null;
    return ClinicalHistorySchema.parse({ ...match });
  }

  // Medical Timeline
  async saveTimeline(timeline: MedicalTimeline): Promise<MedicalTimeline> {
    MedicalTimelineSchema.parse(timeline);
    this.timelines.set(timeline.sessionId, { ...timeline });
    return MedicalTimelineSchema.parse(this.timelines.get(timeline.sessionId));
  }

  async getTimeline(sessionId: string): Promise<MedicalTimeline | null> {
    const data = this.timelines.get(sessionId);
    if (!data) return null;
    return MedicalTimelineSchema.parse({ ...data });
  }

  // Attention Flags
  async saveAttentionFlag(flag: AttentionFlag): Promise<AttentionFlag> {
    AttentionFlagSchema.parse(flag);
    this.flags.set(flag.id, { ...flag });
    return AttentionFlagSchema.parse(this.flags.get(flag.id));
  }

  async getSessionFlags(sessionId: string): Promise<AttentionFlag[]> {
    const list = Array.from(this.flags.values());
    const matched = list.filter((f) => f.sessionId === sessionId);
    return matched.map((f) => AttentionFlagSchema.parse({ ...f }));
  }

  async acknowledgeFlag(id: string): Promise<void> {
    const flag = this.flags.get(id);
    if (!flag) throw new Error('Flag not found');
    flag.status = 'acknowledged';
    this.flags.set(id, flag);
  }

  async resolveConflict(flagId: string, decision: string, doctorId: string): Promise<import('../../types').AttentionFlag> {
    const flag = this.flags.get(flagId);
    if (!flag) throw new Error('Flag not found');
    flag.status = 'resolved';
    flag.resolutionDecision = decision;
    flag.resolvedBy = doctorId;
    flag.resolvedAt = new Date().toISOString();
    this.flags.set(flagId, flag);
    return flag;
  }

  // Corrections
  async saveCorrection(correction: PatientCorrection): Promise<PatientCorrection> {
    PatientCorrectionSchema.parse(correction);
    this.corrections.set(correction.id, { ...correction });
    return PatientCorrectionSchema.parse(this.corrections.get(correction.id));
  }

  async getSessionCorrections(sessionId: string): Promise<PatientCorrection[]> {
    const list = Array.from(this.corrections.values());
    const matched = list.filter((c) => c.sessionId === sessionId);
    return matched.map((c) => PatientCorrectionSchema.parse({ ...c }));
  }

  // Exports
  async saveExportRecord(record: ExportRecord): Promise<ExportRecord> {
    this.exportRecords.set(record.id, record);
    return record;
  }

  async getExportRecords(sessionId: string): Promise<ExportRecord[]> {
    return Array.from(this.exportRecords.values()).filter((r) => r.sessionId === sessionId);
  }

  // Clinical Reports
  async saveReport(report: ClinicalHistoryReport): Promise<ClinicalHistoryReport> {
    ClinicalHistoryReportSchema.parse(report);
    this.reports.set(report.reportId, { ...report });
    return ClinicalHistoryReportSchema.parse(this.reports.get(report.reportId));
  }

  async getReport(id: string): Promise<ClinicalHistoryReport | null> {
    const data = this.reports.get(id);
    if (!data) return null;
    return ClinicalHistoryReportSchema.parse({ ...data });
  }

  async getReportBySession(sessionId: string): Promise<ClinicalHistoryReport | null> {
    const list = Array.from(this.reports.values());
    const match = list.find((r) => r.sessionId === sessionId);
    if (!match) return null;
    return ClinicalHistoryReportSchema.parse({ ...match });
  }

  // Audit Logs

  async updateClinicalReport(sessionId: string, data: Partial<import('../../types').ClinicalHistoryReport>): Promise<import('../../types').ClinicalHistoryReport> {
    const report = Array.from(this.reports.values()).find(r => r.sessionId === sessionId);
    if (!report) throw new Error('Report not found');
    const updated = { ...report, ...data } as import('../../types').ClinicalHistoryReport;
    this.reports.set(updated.reportId, updated);
    return updated;
  }

  async finalizeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    session.status = 'finalized';
    this.sessions.set(sessionId, session);
  }

  async saveAuditLog(log: AuditLog): Promise<AuditLog> {
    AuditLogSchema.parse(log);
    this.auditLogs.set(log.id, { ...log });
    return AuditLogSchema.parse(this.auditLogs.get(log.id));
  }

  async getSessionAuditLogs(sessionId: string): Promise<AuditLog[]> {
    const list = Array.from(this.auditLogs.values());
    const matched = list.filter((l) => l.sessionId === sessionId);
    return matched.map((l) => AuditLogSchema.parse({ ...l }));
  }

  async resetDemoData(): Promise<void> {
    this.patients.clear();
    this.consents.clear();
    this.sessions.clear();
    this.messages.clear();
    this.answers.clear();
    this.documents.clear();
    this.extractions.clear();
    this.histories.clear();
    this.flags.clear();
    this.corrections.clear();
    this.reports.clear();
    this.auditLogs.clear();
  }

  async seedDatabase(_patientScenario: string): Promise<void> {
    console.log('Mock seeding scenario:', _patientScenario);
  }
}

export const mockDb = new MockRepository();

// Preload mock data immediately
if (typeof window === 'undefined') {
  Promise.all([
    loadAndSeedScenario('standard', mockDb),
    loadAndSeedScenario('attention', mockDb),
    loadAndSeedScenario('ayush', mockDb)
  ]).then(() => {
    console.log('[MediKiosk DB Client] Mock database seeded with demo scenarios.');
  }).catch(console.error);
}
