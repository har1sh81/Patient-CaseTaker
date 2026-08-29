/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, createAdminClient } from './server';
import {
  Patient,
  Consent,
  IntakeSession,
  ConversationMessage,
  ConversationAnswer,
  MedicalDocument,
  DocumentExtractionResult,
  OCRResponse,
  ClinicalHistory,
  AttentionFlag,
  PatientCorrection,
  ClinicalHistoryReport,
  AuditLog,
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
  OCRResponseSchema,
  ClinicalHistorySchema,
  AttentionFlagSchema,
  PatientCorrectionSchema,
  ClinicalHistoryReportSchema,
  AuditLogSchema,
  MedicalTimelineSchema,
  ExportRecordSchema
} from '../../schemas';

// Case translation helpers
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toCamelCase(str: string): string {
  return str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function keysToSnake(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => keysToSnake(v));
  } else if (obj !== null && obj !== undefined && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      acc[toSnakeCase(key)] = keysToSnake(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

export function keysToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => keysToCamel(v));
  } else if (obj !== null && obj !== undefined && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const val = obj[key];
      acc[toCamelCase(key)] = val === null ? undefined : keysToCamel(val);
      return acc;
    }, {} as any);
  }
  return obj;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function patientToDb(patient: Patient): Record<string, unknown> {
  return {
    id: patient.id,
    hospital_number: patient.identification.hospitalNumber || null,
    abha_reference: patient.identification.abhaReference || null,
    mobile_number: patient.identification.mobileNumber || null,
    first_name: patient.demographics.firstName,
    last_name: patient.demographics.lastName || null,
    full_name: patient.demographics.fullName,
    date_of_birth: patient.demographics.dateOfBirth || null,
    age: patient.demographics.age || null,
    gender: patient.demographics.gender || null,
    created_at: patient.createdAt,
    updated_at: patient.updatedAt || new Date().toISOString(),
  };
}

export function dbToPatient(row: Record<string, unknown>): Patient {
  return {
    id: String(row.id),
    identification: {
      hospitalNumber: row.hospital_number ? String(row.hospital_number) : undefined,
      abhaReference: row.abha_reference ? String(row.abha_reference) : undefined,
      mobileNumber: row.mobile_number ? String(row.mobile_number) : undefined,
    },
    demographics: {
      firstName: String(row.first_name),
      lastName: row.last_name ? String(row.last_name) : undefined,
      fullName: String(row.full_name),
      dateOfBirth: row.date_of_birth ? String(row.date_of_birth) : undefined,
      age: typeof row.age === 'number' ? row.age : undefined,
      gender: row.gender ? (String(row.gender) as 'male' | 'female' | 'other' | 'prefer_not_to_say') : undefined,
    },
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export function flagToDb(flag: AttentionFlag): Record<string, unknown> {
  return {
    id: flag.id,
    session_id: flag.sessionId,
    category: flag.category,
    severity: flag.severity,
    label: flag.label,
    message: flag.message,
    source_rule_id: flag.ruleId || null,
    requires_clinical_review: flag.requiresClinicalReview,
    status: flag.status,
    resolution_decision: flag.resolutionDecision || null,
    resolved_by: flag.resolvedBy || null,
    resolved_at: flag.resolvedAt || null,
    generated_at: flag.createdAt || new Date().toISOString(),
    created_at: flag.createdAt || new Date().toISOString(),
    source_data: {
      patientId: flag.patientId,
      evidence: flag.evidence,
      provenances: flag.provenances,
    },
  };
}

export function dbToFlag(row: Record<string, any>): AttentionFlag {
  const sourceData = row.source_data || {};
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    patientId: sourceData.patientId ? String(sourceData.patientId) : 'mock_patient',
    ruleId: row.source_rule_id ? String(row.source_rule_id) : undefined,
    category: row.category as any,
    severity: row.severity as any,
    label: String(row.label),
    message: String(row.message),
    evidence: Array.isArray(sourceData.evidence) ? sourceData.evidence : [],
    provenances: Array.isArray(sourceData.provenances) ? sourceData.provenances : [],
    requiresClinicalReview: !!row.requires_clinical_review,
    status: (row.status || 'active') as any,
    resolutionDecision: row.resolution_decision ? String(row.resolution_decision) : undefined,
    resolvedBy: row.resolved_by ? String(row.resolved_by) : undefined,
    resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
    createdAt: String(row.created_at || row.generated_at),
    updatedAt: String(row.created_at || row.generated_at),
  };
}


export interface DatabaseService {
  // Patients
  createPatient(patient: Patient): Promise<Patient>;
  getPatient(id: string): Promise<Patient | null>;
  getPatientByHospitalNumber(hospitalNumber: string): Promise<Patient | null>;
  getPatientByAbha(abhaReference: string): Promise<Patient | null>;
  getPatientByMobile(mobileNumber: string): Promise<Patient | null>;

  // Consents
  saveConsent(consent: Consent): Promise<Consent>;
  getConsent(id: string): Promise<Consent | null>;

  // Sessions
  createSession(session: IntakeSession): Promise<IntakeSession>;
  getSession(id: string): Promise<IntakeSession | null>;
  getSessionsByStatus(status: string): Promise<IntakeSession[]>;
  updateSession(id: string, updates: Partial<IntakeSession>): Promise<IntakeSession>;
  cleanupSession(sessionId: string): Promise<void>;

  // Conversation
  saveMessage(message: ConversationMessage): Promise<ConversationMessage>;
  getSessionMessages(sessionId: string): Promise<ConversationMessage[]>;
  saveAnswer(answer: ConversationAnswer): Promise<ConversationAnswer>;
  deleteAnswers(answerIds: string[]): Promise<void>;
  getSessionAnswers(sessionId: string): Promise<ConversationAnswer[]>;

  // Documents
  saveDocument(doc: MedicalDocument): Promise<MedicalDocument>;
  getDocument(id: string): Promise<MedicalDocument | null>;
  getSessionDocuments(sessionId: string): Promise<MedicalDocument[]>;
  deleteDocument(documentId: string): Promise<void>;
  
  // OCR
  saveOcrResponse(response: OCRResponse): Promise<OCRResponse>;
  getOcrResponse(documentId: string): Promise<OCRResponse | null>;

  // Extractions
  saveExtraction(extraction: DocumentExtractionResult): Promise<DocumentExtractionResult>;
  getExtraction(documentId: string): Promise<DocumentExtractionResult | null>;

  // Clinical Histories
  saveClinicalHistory(history: ClinicalHistory): Promise<ClinicalHistory>;
  getClinicalHistory(sessionId: string): Promise<ClinicalHistory | null>;

  // Medical Timeline
  saveTimeline(timeline: MedicalTimeline): Promise<MedicalTimeline>;
  getTimeline(sessionId: string): Promise<MedicalTimeline | null>;

  // Attention Flags
  saveAttentionFlag(flag: AttentionFlag): Promise<AttentionFlag>;
  getSessionFlags(sessionId: string): Promise<AttentionFlag[]>;
  acknowledgeFlag(id: string): Promise<void>;
  resolveConflict(flagId: string, decision: string, doctorId: string): Promise<AttentionFlag>;

  // Corrections
  saveCorrection(correction: PatientCorrection): Promise<PatientCorrection>;
  getSessionCorrections(sessionId: string): Promise<PatientCorrection[]>;

  // Exports
  saveExportRecord(record: ExportRecord): Promise<ExportRecord>;
  getExportRecords(sessionId: string): Promise<ExportRecord[]>;

  // Clinical Reports
  saveReport(report: ClinicalHistoryReport): Promise<ClinicalHistoryReport>;
  getReport(id: string): Promise<ClinicalHistoryReport | null>;
  getReportBySession(sessionId: string): Promise<ClinicalHistoryReport | null>;
  updateClinicalReport(sessionId: string, data: Partial<ClinicalHistoryReport>): Promise<ClinicalHistoryReport>;
  finalizeSession(sessionId: string): Promise<void>;

  // Audit Logs
  saveAuditLog(log: AuditLog): Promise<AuditLog>;
  getSessionAuditLogs(sessionId: string): Promise<AuditLog[]>;

  // Reset & Seed utilities
  resetDemoData(): Promise<void>;
  seedDatabase(patientScenario: string): Promise<void>;
}

export class SupabaseRepository implements DatabaseService {
  async createPatient(patient: Patient): Promise<Patient> {
    PatientSchema.parse(patient);
    const dbPayload = patientToDb(patient);
    const { data, error } = await (await createClient())
      .from('patients')
      .insert(dbPayload)
      .select()
      .single();

    if (error) throw new Error(`createPatient failed: ${error.message}`);
    return PatientSchema.parse(dbToPatient(data));
  }

  async getPatient(id: string): Promise<Patient | null> {
    const { data, error } = await (await createClient())
      .from('patients')
      .select()
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`getPatient failed: ${error.message}`);
    if (!data) return null;
    return PatientSchema.parse(dbToPatient(data));
  }

  async getPatientByHospitalNumber(hospitalNumber: string): Promise<Patient | null> {
    const { data, error } = await (await createClient())
      .from('patients')
      .select()
      .eq('hospital_number', hospitalNumber)
      .maybeSingle();

    if (error) throw new Error(`getPatientByHospitalNumber failed: ${error.message}`);
    if (!data) return null;
    return PatientSchema.parse(dbToPatient(data));
  }

  async getPatientByAbha(abhaReference: string): Promise<Patient | null> {
    const { data, error } = await (await createClient())
      .from('patients')
      .select()
      .eq('abha_reference', abhaReference)
      .maybeSingle();

    if (error) throw new Error(`getPatientByAbha failed: ${error.message}`);
    if (!data) return null;
    return PatientSchema.parse(dbToPatient(data));
  }

  async getPatientByMobile(mobileNumber: string): Promise<Patient | null> {
    const { data, error } = await (await createClient())
      .from('patients')
      .select()
      .eq('mobile_number', mobileNumber)
      .maybeSingle();

    if (error) throw new Error(`getPatientByMobile failed: ${error.message}`);
    if (!data) return null;
    return PatientSchema.parse(dbToPatient(data));
  }

  async saveConsent(consent: Consent): Promise<Consent> {
    ConsentSchema.parse(consent);
    const dbPayload = keysToSnake(consent);
    const { data, error } = await (await createClient())
      .from('consents')
      .upsert(dbPayload)
      .select()
      .single();

    if (error) throw new Error(`saveConsent failed: ${error.message}`);
    return ConsentSchema.parse(keysToCamel(data));
  }

  async getConsent(id: string): Promise<Consent | null> {
    const { data, error } = await (await createClient())
      .from('consents')
      .select()
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`getConsent failed: ${error.message}`);
    if (!data) return null;
    return ConsentSchema.parse(keysToCamel(data));
  }

  async createSession(session: IntakeSession): Promise<IntakeSession> {
    IntakeSessionSchema.parse(session);
    const dbPayload = keysToSnake(session);
    const { data, error } = await (await createClient())
      .from('intake_sessions')
      .insert(dbPayload)
      .select()
      .single();

    if (error) throw new Error(`createSession failed: ${error.message}`);
    return IntakeSessionSchema.parse(keysToCamel(data));
  }

  async getSession(id: string): Promise<IntakeSession | null> {
    const { data, error } = await (await createClient())
      .from('intake_sessions')
      .select()
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`getSession failed: ${error.message}`);
    if (!data) return null;
    return IntakeSessionSchema.parse(keysToCamel(data));
  }

  async getSessionsByStatus(status: string): Promise<IntakeSession[]> {
    const { data, error } = await (await createClient())
      .from('intake_sessions')
      .select()
      .eq('status', status);

    if (error) throw new Error(`getSessionsByStatus failed: ${error.message}`);
    if (!data) return [];
    return data.map((row: unknown) => IntakeSessionSchema.parse(keysToCamel(row)));
  }

  async updateSession(id: string, updates: Partial<IntakeSession>): Promise<IntakeSession> {
    const dbPayload = keysToSnake(updates);
    const { data, error } = await (await createClient())
      .from('intake_sessions')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`updateSession failed: ${error.message}`);
    return IntakeSessionSchema.parse(keysToCamel(data));
  }

  async cleanupSession(sessionId: string): Promise<void> {
    // Audit log deletion prior to clearing
    const { error: err1 } = await (await createClient())
      .from('conversation_messages')
      .delete()
      .eq('session_id', sessionId);
    if (err1) throw new Error(`cleanupSession message failed: ${err1.message}`);

    const { error: err2 } = await (await createClient())
      .from('conversation_answers')
      .delete()
      .eq('session_id', sessionId);
    if (err2) throw new Error(`cleanupSession answers failed: ${err2.message}`);

    const { error: err3 } = await (await createClient())
      .from('patient_corrections')
      .delete()
      .eq('session_id', sessionId);
    if (err3) throw new Error(`cleanupSession corrections failed: ${err3.message}`);
  }

  async saveMessage(message: ConversationMessage): Promise<ConversationMessage> {
    ConversationMessageSchema.parse(message);
    const dbPayload = keysToSnake(message);
    const { data, error } = await (await createClient())
      .from('conversation_messages')
      .upsert(dbPayload)
      .select()
      .single();

    if (error) throw new Error(`saveMessage failed: ${error.message}`);
    return ConversationMessageSchema.parse(keysToCamel(data));
  }

  async getSessionMessages(sessionId: string): Promise<ConversationMessage[]> {
    const { data, error } = await (await createClient())
      .from('conversation_messages')
      .select()
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (error) throw new Error(`getSessionMessages failed: ${error.message}`);
    return (data || []).map((row) => ConversationMessageSchema.parse(keysToCamel(row)));
  }

  async saveAnswer(answer: ConversationAnswer): Promise<ConversationAnswer> {
    ConversationAnswerSchema.parse(answer);
    const dbPayload = keysToSnake(answer);
    const { data, error } = await (await createClient())
      .from('conversation_answers')
      .upsert(dbPayload)
      .select()
      .single();

    if (error) throw new Error(`saveAnswer failed: ${error.message}`);
    return ConversationAnswerSchema.parse(keysToCamel(data));
  }

  async getSessionAnswers(sessionId: string): Promise<ConversationAnswer[]> {
    const { data, error } = await (await createClient())
      .from('conversation_answers')
      .select()
      .eq('session_id', sessionId)
      .order('answered_at', { ascending: true });

    if (error) throw new Error(`getSessionAnswers failed: ${error.message}`);
    return (data || []).map((row) => ConversationAnswerSchema.parse(keysToCamel(row)));
  }

  async deleteAnswers(answerIds: string[]): Promise<void> {
    if (!answerIds || answerIds.length === 0) return;
    const { error } = await (await createClient())
      .from('conversation_answers')
      .delete()
      .in('id', answerIds);
      
    if (error) throw new Error(`deleteAnswers failed: ${error.message}`);
  }

  async saveDocument(doc: MedicalDocument): Promise<MedicalDocument> {
    MedicalDocumentSchema.parse(doc);
    const dbPayload = keysToSnake(doc);
    const { data, error } = await (await createClient())
      .from('medical_documents')
      .upsert(dbPayload)
      .select()
      .single();

    if (error) throw new Error(`saveDocument failed: ${error.message}`);
    return MedicalDocumentSchema.parse(keysToCamel(data));
  }

  async getDocument(id: string): Promise<MedicalDocument | null> {
    const { data, error } = await (await createClient())
      .from('medical_documents')
      .select()
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`getDocument failed: ${error.message}`);
    if (!data) return null;
    return MedicalDocumentSchema.parse(keysToCamel(data));
  }

  async getSessionDocuments(sessionId: string): Promise<MedicalDocument[]> {
    const { data, error } = await (await createClient())
      .from('medical_documents')
      .select()
      .eq('session_id', sessionId);

    if (error) throw new Error(`getSessionDocuments failed: ${error.message}`);
    return (data || []).map((row) => MedicalDocumentSchema.parse(keysToCamel(row)));
  }

  async deleteDocument(documentId: string): Promise<void> {
    const { error } = await (await createClient())
      .from('medical_documents')
      .delete()
      .eq('id', documentId);

    if (error) throw new Error(`deleteDocument failed: ${error.message}`);
  }

  // --- OCR Responses ---

  async saveOcrResponse(response: OCRResponse): Promise<OCRResponse> {
    OCRResponseSchema.parse(response);
    const dbPayload = keysToSnake(response);

    const { data, error } = await (await createClient())
      .from('ocr_responses')
      .upsert(dbPayload, { onConflict: 'document_id' })
      .select()
      .single();

    if (error) {
      console.error('saveOcrResponse error:', error);
      throw error;
    }
    return OCRResponseSchema.parse(keysToCamel(data));
  }

  async getOcrResponse(documentId: string): Promise<OCRResponse | null> {
    const { data, error } = await (await createClient())
      .from('ocr_responses')
      .select('*')
      .eq('document_id', documentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // not found
      throw error;
    }
    return OCRResponseSchema.parse(keysToCamel(data));
  }

  // --- Extractions ---

  async saveExtraction(extraction: DocumentExtractionResult): Promise<DocumentExtractionResult> {
    DocumentExtractionResultSchema.parse(extraction);
    const dbPayload = keysToSnake(extraction);
    const { data, error } = await (await createClient())
      .from('document_extractions')
      .upsert(dbPayload)
      .select()
      .single();

    if (error) throw new Error(`saveExtraction failed: ${error.message}`);
    return DocumentExtractionResultSchema.parse(keysToCamel(data));
  }

  async getExtraction(documentId: string): Promise<DocumentExtractionResult | null> {
    const { data, error } = await (await createClient())
      .from('document_extractions')
      .select()
      .eq('document_id', documentId)
      .maybeSingle();

    if (error) throw new Error(`getExtraction failed: ${error.message}`);
    if (!data) return null;
    return DocumentExtractionResultSchema.parse(keysToCamel(data));
  }

  async saveClinicalHistory(history: ClinicalHistory): Promise<ClinicalHistory> {
    ClinicalHistorySchema.parse(history);
    const dbPayload = keysToSnake(history);
    const { data, error } = await (await createClient())
      .from('clinical_histories')
      .upsert(dbPayload)
      .select()
      .single();

    if (error) throw new Error(`saveClinicalHistory failed: ${error.message}`);
    return ClinicalHistorySchema.parse(keysToCamel(data));
  }

  async getClinicalHistory(sessionId: string): Promise<ClinicalHistory | null> {
    const { data, error } = await (await createClient())
      .from('clinical_histories')
      .select()
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error) throw new Error(`getClinicalHistory failed: ${error.message}`);
    if (!data) return null;
    return ClinicalHistorySchema.parse(keysToCamel(data));
  }

  async saveTimeline(timeline: MedicalTimeline): Promise<MedicalTimeline> {
    MedicalTimelineSchema.parse(timeline);
    const dbPayload = keysToSnake(timeline);
    const { data, error } = await (await createClient())
      .from('medical_timelines')
      .upsert(dbPayload)
      .select()
      .single();

    if (error) throw new Error(`saveTimeline failed: ${error.message}`);
    return MedicalTimelineSchema.parse(keysToCamel(data));
  }

  async getTimeline(sessionId: string): Promise<MedicalTimeline | null> {
    const { data, error } = await (await createClient())
      .from('medical_timelines')
      .select()
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error) throw new Error(`getTimeline failed: ${error.message}`);
    if (!data) return null;
    return MedicalTimelineSchema.parse(keysToCamel(data));
  }

  async saveAttentionFlag(flag: AttentionFlag): Promise<AttentionFlag> {
    AttentionFlagSchema.parse(flag);
    const dbPayload = flagToDb(flag);
    const { data, error } = await (await createClient())
      .from('attention_flags')
      .upsert(dbPayload)
      .select()
      .single();

    if (error) throw new Error(`saveAttentionFlag failed: ${error.message}`);
    return AttentionFlagSchema.parse(dbToFlag(data));
  }

  async getSessionFlags(sessionId: string): Promise<AttentionFlag[]> {
    const { data, error } = await (await createClient())
      .from('attention_flags')
      .select()
      .eq('session_id', sessionId);

    if (error) throw new Error(`getSessionFlags failed: ${error.message}`);
    return (data || []).map((row) => AttentionFlagSchema.parse(dbToFlag(row)));
  }

  async acknowledgeFlag(id: string): Promise<void> {
    const { error } = await (await createClient())
      .from('attention_flags')
      .update({ status: 'acknowledged' })
      .eq('id', id);

    if (error) throw new Error(`acknowledgeFlag failed: ${error.message}`);
  }

  async resolveConflict(flagId: string, decision: string, doctorId: string): Promise<AttentionFlag> {
    const { data, error } = await (await createClient())
      .from('attention_flags')
      .update({
        status: 'resolved',
        resolution_decision: decision,
        resolved_by: doctorId,
        resolved_at: new Date().toISOString()
      })
      .eq('id', flagId)
      .select()
      .single();

    if (error) throw new Error(`resolveConflict failed: ${error.message}`);
    return AttentionFlagSchema.parse(dbToFlag(data));
  }

  async saveCorrection(correction: PatientCorrection): Promise<PatientCorrection> {
    PatientCorrectionSchema.parse(correction);
    const dbPayload = keysToSnake(correction);
    const { data, error } = await (await createClient())
      .from('patient_corrections')
      .upsert(dbPayload)
      .select()
      .single();

    if (error) throw new Error(`saveCorrection failed: ${error.message}`);
    return PatientCorrectionSchema.parse(keysToCamel(data));
  }

  async getSessionCorrections(sessionId: string): Promise<PatientCorrection[]> {
    const { data, error } = await (await createClient())
      .from('patient_corrections')
      .select()
      .eq('session_id', sessionId);

    if (error) throw new Error(`getSessionCorrections failed: ${error.message}`);
    return (data || []).map((row) => PatientCorrectionSchema.parse(keysToCamel(row)));
  }

  async saveExportRecord(record: ExportRecord): Promise<ExportRecord> {
    ExportRecordSchema.parse(record);
    const dbPayload = keysToSnake(record);
    const { data, error } = await (await createClient())
      .from('export_records')
      .upsert(dbPayload)
      .select()
      .single();

    if (error) throw new Error(`saveExportRecord failed: ${error.message}`);
    return ExportRecordSchema.parse(keysToCamel(data));
  }

  async getExportRecords(sessionId: string): Promise<ExportRecord[]> {
    const { data, error } = await (await createClient())
      .from('export_records')
      .select()
      .eq('session_id', sessionId);

    if (error) throw new Error(`getExportRecords failed: ${error.message}`);
    return (data || []).map((row) => ExportRecordSchema.parse(keysToCamel(row)));
  }

  async saveReport(report: ClinicalHistoryReport): Promise<ClinicalHistoryReport> {
    ClinicalHistoryReportSchema.parse(report);
    const dbPayload = keysToSnake(report);
    const { data, error } = await (await createClient())
      .from('clinical_reports')
      .upsert(dbPayload)
      .select()
      .single();

    if (error) throw new Error(`saveReport failed: ${error.message}`);
    return ClinicalHistoryReportSchema.parse(keysToCamel(data));
  }

  async getReport(id: string): Promise<ClinicalHistoryReport | null> {
    const { data, error } = await (await createClient())
      .from('clinical_reports')
      .select()
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`getReport failed: ${error.message}`);
    if (!data) return null;
    return ClinicalHistoryReportSchema.parse(keysToCamel(data));
  }

  async getReportBySession(sessionId: string): Promise<ClinicalHistoryReport | null> {
    const { data, error } = await (await createClient())
      .from('clinical_reports')
      .select()
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error) throw new Error(`getReportBySession failed: ${error.message}`);
    if (!data) return null;
    return ClinicalHistoryReportSchema.parse(keysToCamel(data));
  }

  async updateClinicalReport(sessionId: string, data: Partial<ClinicalHistoryReport>): Promise<ClinicalHistoryReport> {
    const dbPayload = keysToSnake(data);
    const { data: result, error } = await (await createClient())
      .from('clinical_reports')
      .update(dbPayload)
      .eq('session_id', sessionId)
      .select()
      .single();
      
    if (error) throw new Error('Failed to update report: ' + error.message);
    return ClinicalHistoryReportSchema.parse(keysToCamel(result));
  }

  async finalizeSession(sessionId: string): Promise<void> {
    const { error } = await (await createClient())
      .from('intake_sessions')
      .update({ status: 'finalized', updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    if (error) throw new Error('Failed to finalize session: ' + error.message);
  }

  async saveAuditLog(log: AuditLog): Promise<AuditLog> {
    AuditLogSchema.parse(log);
    const dbPayload = keysToSnake(log);
    const { data, error } = await (await createAdminClient())
      .from('audit_logs')
      .insert(dbPayload)
      .select()
      .single();

    if (error) throw new Error(`saveAuditLog failed: ${error.message}`);
    return AuditLogSchema.parse(keysToCamel(data));
  }

  async getSessionAuditLogs(sessionId: string): Promise<AuditLog[]> {
    const { data, error } = await (await createClient())
      .from('audit_logs')
      .select()
      .eq('session_id', sessionId);

    if (error) throw new Error(`getSessionAuditLogs failed: ${error.message}`);
    return (data || []).map((row) => AuditLogSchema.parse(keysToCamel(row)));
  }

  async resetDemoData(): Promise<void> {
    const adminClient = await createAdminClient();
    const demoPatientIds = ['pat_golden', 'pat_02', 'pat_03', 'mock_patient'];
    const demoSessionIds = ['scenario_standard', 'scenario_attention', 'scenario_ayush'];

    // 1. Delete audit logs for demo sessions manually because FK is ON DELETE SET NULL
    await adminClient.from('audit_logs').delete().in('session_id', demoSessionIds);
    await adminClient.from('audit_logs').delete().in('entity_id', demoPatientIds);

    // 2. Delete export records for demo sessions
    await adminClient.from('export_records').delete().in('session_id', demoSessionIds);

    // 3. Delete sessions explicitly because the patient FK is ON DELETE SET NULL
    await adminClient.from('intake_sessions').delete().in('id', demoSessionIds);

    // 4. Delete patients (this cascades to clinical_histories, attention_flags, conversation_messages, answers, documents, extractions)
    await adminClient.from('patients').delete().in('id', demoPatientIds);

    // 5. Delete orphaned consents (assuming demo consents have IDs matching pat_golden, etc. or we can just wipe known demo consent IDs if they were fixed)
    await adminClient.from('consents').delete().in('id', ['consent_golden', 'consent_02', 'consent_03']);
  }

  async seedDatabase(_patientScenario: string): Promise<void> {
    console.log('Supabase seeding scenario:', _patientScenario);
  }
}
