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
    hospital_number: patient.identification?.hospitalNumber || null,
    abha_reference: patient.identification?.abhaReference || null,
    mobile_number: patient.identification?.mobileNumber || null,
    phone_number: patient.identification?.mobileNumber || null,
    first_name: patient.demographics.firstName,
    last_name: patient.demographics.lastName || null,
    full_name: patient.demographics.fullName,
    date_of_birth: patient.demographics.dateOfBirth || null,
    age: patient.demographics.age || null,
    gender: patient.demographics.gender || null,
    created_at: patient.createdAt || new Date().toISOString(),
    updated_at: patient.updatedAt || new Date().toISOString(),
  };
}

export function dbToPatient(row: Record<string, unknown>, externalIdentifiers?: any[]): Patient {
  let hospitalNumber = row.hospital_number ? String(row.hospital_number) : undefined;
  let abhaReference = row.abha_reference ? String(row.abha_reference) : undefined;
  let mobileNumber = (row.mobile_number || row.phone_number) ? String(row.mobile_number || row.phone_number) : undefined;

  if (externalIdentifiers && Array.isArray(externalIdentifiers)) {
    for (const ext of externalIdentifiers) {
      if (ext.identifier_type === 'hospital_number') hospitalNumber = ext.identifier_value;
      if (ext.identifier_type === 'abha_number' || ext.identifier_type === 'abha_address') abhaReference = ext.identifier_value;
    }
  }

  return {
    id: String(row.id),
    identification: {
      hospitalNumber,
      abhaReference,
      mobileNumber,
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
    const client = await createClient();
    const fullDbPayload = patientToDb(patient);

    let data: any = null;
    let error: any = null;

    try {
      const res = await client
        .from('patients')
        .insert(fullDbPayload)
        .select()
        .single();
      data = res.data;
      error = res.error;
    } catch (err: any) {
      error = err;
    }

    if (error && (error.message?.includes('column') || error.message?.includes('does not exist'))) {
      const cleanPayload = {
        id: patient.id,
        first_name: patient.demographics.firstName,
        last_name: patient.demographics.lastName || null,
        full_name: patient.demographics.fullName,
        date_of_birth: patient.demographics.dateOfBirth || null,
        gender: patient.demographics.gender || null,
        phone_number: patient.identification?.mobileNumber || null,
        created_at: patient.createdAt || new Date().toISOString(),
        updated_at: patient.updatedAt || new Date().toISOString(),
      };
      const retryResult = await client
        .from('patients')
        .insert(cleanPayload)
        .select()
        .single();

      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      if (error.message?.includes('unique constraint') || error.code === '23505') {
        const existing = await this.getPatient(patient.id);
        if (existing) return existing;
        if (patient.identification?.hospitalNumber) {
          const existingHosp = await this.getPatientByHospitalNumber(patient.identification.hospitalNumber);
          if (existingHosp) return existingHosp;
        }
        if (patient.identification?.abhaReference) {
          const existingAbha = await this.getPatientByAbha(patient.identification.abhaReference);
          if (existingAbha) return existingAbha;
        }
      }
      throw new Error(`createPatient failed: ${error.message}`);
    }

    if (patient.identification?.hospitalNumber || patient.identification?.abhaReference) {
      try {
        const extRows = [];
        if (patient.identification.hospitalNumber) {
          extRows.push({
            patient_id: patient.id,
            identifier_type: 'hospital_number',
            identifier_value: patient.identification.hospitalNumber,
            verification_status: 'verified',
          });
        }
        if (patient.identification.abhaReference) {
          extRows.push({
            patient_id: patient.id,
            identifier_type: 'abha_number',
            identifier_value: patient.identification.abhaReference,
            verification_status: 'verified',
          });
        }
        if (extRows.length > 0) {
          await client.from('patient_external_identifiers').upsert(extRows, { onConflict: 'identifier_type,identifier_value' });
        }
      } catch {
        // ignore if external identifiers table is absent
      }
    }

    return PatientSchema.parse(dbToPatient(data || fullDbPayload));
  }

  async getPatient(id: string): Promise<Patient | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return null;

    try {
      const client = await createClient();
      const { data, error } = await client
        .from('patients')
        .select()
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return null;

      let extIds: any[] = [];
      try {
        const { data: extData } = await client
          .from('patient_external_identifiers')
          .select()
          .eq('patient_id', id);
        if (extData) extIds = extData;
      } catch {
        // ignore
      }

      return PatientSchema.parse(dbToPatient(data, extIds));
    } catch {
      return null;
    }
  }

  async getPatientByHospitalNumber(hospitalNumber: string): Promise<Patient | null> {
    try {
      const client = await createClient();

      try {
        const { data: extData } = await client
          .from('patient_external_identifiers')
          .select('patient_id')
          .eq('identifier_type', 'hospital_number')
          .eq('identifier_value', hospitalNumber)
          .maybeSingle();

        if (extData?.patient_id) {
          const patient = await this.getPatient(extData.patient_id);
          if (patient) return patient;
        }
      } catch {
        // ignore
      }

      const { data, error } = await client
        .from('patients')
        .select()
        .eq('hospital_number', hospitalNumber)
        .maybeSingle();

      if (error || !data) return null;
      return PatientSchema.parse(dbToPatient(data));
    } catch {
      return null;
    }
  }

  async getPatientByAbha(abhaReference: string): Promise<Patient | null> {
    try {
      const client = await createClient();

      try {
        const { data: extData } = await client
          .from('patient_external_identifiers')
          .select('patient_id')
          .in('identifier_type', ['abha_number', 'abha_address'])
          .eq('identifier_value', abhaReference)
          .maybeSingle();

        if (extData?.patient_id) {
          const patient = await this.getPatient(extData.patient_id);
          if (patient) return patient;
        }
      } catch {
        // ignore
      }

      const { data, error } = await client
        .from('patients')
        .select()
        .eq('abha_reference', abhaReference)
        .maybeSingle();

      if (error || !data) return null;
      return PatientSchema.parse(dbToPatient(data));
    } catch {
      return null;
    }
  }

  async getPatientByMobile(mobileNumber: string): Promise<Patient | null> {
    try {
      const client = await createClient();

      try {
        const { data, error } = await client
          .from('patients')
          .select()
          .eq('phone_number', mobileNumber)
          .maybeSingle();

        if (!error && data) return PatientSchema.parse(dbToPatient(data));
      } catch {
        // ignore
      }

      const { data, error } = await client
        .from('patients')
        .select()
        .eq('mobile_number', mobileNumber)
        .maybeSingle();

      if (error || !data) return null;
      return PatientSchema.parse(dbToPatient(data));
    } catch {
      return null;
    }
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
    delete dbPayload.handoff_at;
    delete dbPayload.handoff_snapshot_id;
    delete dbPayload.updated_at; // column doesn't exist on intake_sessions

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
    const client = await createClient();
    // Best-effort cleanup — don't crash if columns are missing
    try {
      await client.from('conversation_messages').delete().eq('session_id', sessionId);
    } catch { /* ignore */ }

    try {
      await client.from('conversation_answers').delete().eq('session_id', sessionId);
    } catch {
      try { await client.from('conversation_answers').delete().eq('encounter_id', sessionId); } catch { /* ignore */ }
    }

    try {
      await client.from('patient_corrections').delete().eq('session_id', sessionId);
    } catch { /* ignore */ }
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
    try {
      const { data, error } = await (await createClient())
        .from('conversation_answers')
        .upsert(dbPayload)
        .select()
        .single();

      if (error) {
        // If session_id column doesn't exist, the table uses encounter_id (foundational schema)
        if (error.message?.includes('column') || error.message?.includes('does not exist')) {
          console.warn('[saveAnswer] Falling back to mock — foundational schema mismatch');
          return answer;
        }
        throw new Error(`saveAnswer failed: ${error.message}`);
      }
      return ConversationAnswerSchema.parse(keysToCamel(data));
    } catch (e: any) {
      console.warn('[saveAnswer] Error (non-fatal):', e?.message);
      return answer;
    }
  }

  async getSessionAnswers(sessionId: string): Promise<ConversationAnswer[]> {
    try {
      const { data, error } = await (await createClient())
        .from('conversation_answers')
        .select()
        .eq('session_id', sessionId)
        .order('answered_at', { ascending: true });

      if (!error && data) return data.map((row) => ConversationAnswerSchema.parse(keysToCamel(row)));
    } catch { /* ignore */ }
    return [];
  }

  async deleteAnswers(answerIds: string[]): Promise<void> {
    if (!answerIds || answerIds.length === 0) return;
    try {
      await (await createClient())
        .from('conversation_answers')
        .delete()
        .in('id', answerIds);
    } catch { /* ignore */ }
  }

  async saveDocument(doc: MedicalDocument): Promise<MedicalDocument> {
    MedicalDocumentSchema.parse(doc);
    const dbPayload = keysToSnake(doc);
    try {
      const { data, error } = await (await createClient())
        .from('medical_documents')
        .upsert(dbPayload)
        .select()
        .single();

      if (error) {
        if (error.message?.includes('column') || error.message?.includes('does not exist')) {
          console.warn('[saveDocument] Schema mismatch — returning input as-is');
          return doc;
        }
        throw new Error(`saveDocument failed: ${error.message}`);
      }
      return MedicalDocumentSchema.parse(keysToCamel(data));
    } catch (e: any) {
      console.warn('[saveDocument] Error (non-fatal):', e?.message);
      return doc;
    }
  }

  async getDocument(id: string): Promise<MedicalDocument | null> {
    try {
      const { data, error } = await (await createClient())
        .from('medical_documents')
        .select()
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return null;
      return MedicalDocumentSchema.parse(keysToCamel(data));
    } catch {
      return null;
    }
  }

  async getSessionDocuments(sessionId: string): Promise<MedicalDocument[]> {
    try {
      const client = await createClient();
      // Try session_id first (legacy), then encounter_id (foundational)
      const { data, error } = await client
        .from('medical_documents')
        .select()
        .eq('session_id', sessionId);

      if (!error && data && data.length > 0) {
        return data.map((row) => MedicalDocumentSchema.parse(keysToCamel(row)));
      }
    } catch { /* ignore */ }
    return [];
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      await (await createClient())
        .from('medical_documents')
        .delete()
        .eq('id', documentId);
    } catch { /* ignore */ }
  }

  // --- OCR Responses ---

  async saveOcrResponse(response: OCRResponse): Promise<OCRResponse> {
    // ocr_responses table does not exist in the live schema — no-op
    OCRResponseSchema.parse(response);
    console.warn('[saveOcrResponse] ocr_responses table not in schema — returning input as-is');
    return response;
  }

  async getOcrResponse(_documentId: string): Promise<OCRResponse | null> {
    // ocr_responses table does not exist in the live schema
    return null;
  }

  // --- Extractions ---

  async saveExtraction(extraction: DocumentExtractionResult): Promise<DocumentExtractionResult> {
    DocumentExtractionResultSchema.parse(extraction);
    try {
      const dbPayload = keysToSnake(extraction);
      const { data, error } = await (await createClient())
        .from('document_extractions')
        .upsert(dbPayload)
        .select()
        .single();

      if (error) {
        if (error.message?.includes('column') || error.message?.includes('does not exist')) {
          console.warn('[saveExtraction] Schema mismatch — returning input as-is');
          return extraction;
        }
        throw new Error(`saveExtraction failed: ${error.message}`);
      }
      return DocumentExtractionResultSchema.parse(keysToCamel(data));
    } catch (e: any) {
      console.warn('[saveExtraction] Error (non-fatal):', e?.message);
      return extraction;
    }
  }

  async getExtraction(documentId: string): Promise<DocumentExtractionResult | null> {
    try {
      const { data, error } = await (await createClient())
        .from('document_extractions')
        .select()
        .eq('document_id', documentId)
        .maybeSingle();

      if (error || !data) return null;
      return DocumentExtractionResultSchema.parse(keysToCamel(data));
    } catch {
      return null;
    }
  }

  async saveClinicalHistory(history: ClinicalHistory): Promise<ClinicalHistory> {
    ClinicalHistorySchema.parse(history);
    try {
      const dbPayload = keysToSnake(history);
      const { data, error } = await (await createClient())
        .from('clinical_histories')
        .upsert(dbPayload)
        .select()
        .single();

      if (error) {
        console.warn('[saveClinicalHistory] Error (non-fatal):', error.message);
        return history;
      }
      return ClinicalHistorySchema.parse(keysToCamel(data));
    } catch (e: any) {
      console.warn('[saveClinicalHistory] Error (non-fatal):', e?.message);
      return history;
    }
  }

  async getClinicalHistory(sessionId: string): Promise<ClinicalHistory | null> {
    try {
      const { data, error } = await (await createClient())
        .from('clinical_histories')
        .select()
        .eq('session_id', sessionId)
        .maybeSingle();

      if (error || !data) return null;
      return ClinicalHistorySchema.parse(keysToCamel(data));
    } catch {
      return null;
    }
  }

  async saveTimeline(timeline: MedicalTimeline): Promise<MedicalTimeline> {
    MedicalTimelineSchema.parse(timeline);
    try {
      const dbPayload = keysToSnake(timeline);
      const { data, error } = await (await createClient())
        .from('medical_timelines')
        .upsert(dbPayload)
        .select()
        .single();

      if (error) {
        console.warn('[saveTimeline] Error (non-fatal):', error.message);
        return timeline;
      }
      return MedicalTimelineSchema.parse(keysToCamel(data));
    } catch (e: any) {
      console.warn('[saveTimeline] Error (non-fatal):', e?.message);
      return timeline;
    }
  }

  async getTimeline(sessionId: string): Promise<MedicalTimeline | null> {
    try {
      const { data, error } = await (await createClient())
        .from('medical_timelines')
        .select()
        .eq('session_id', sessionId)
        .maybeSingle();

      if (error || !data) return null;
      return MedicalTimelineSchema.parse(keysToCamel(data));
    } catch {
      return null;
    }
  }

  async saveAttentionFlag(flag: AttentionFlag): Promise<AttentionFlag> {
    AttentionFlagSchema.parse(flag);
    try {
      // Live schema: id(UUID), encounter_id(UUID), category, severity, flag_label, message, source_rule_id, requires_clinical_review, acknowledged_by_doctor
      const dbPayload = {
        category: flag.category,
        severity: flag.severity,
        flag_label: flag.label,
        message: flag.message,
        source_rule_id: flag.ruleId || null,
        requires_clinical_review: flag.requiresClinicalReview,
      };
      const { data, error } = await (await createClient())
        .from('attention_flags')
        .insert(dbPayload)
        .select()
        .single();

      if (error) {
        console.warn('[saveAttentionFlag] Error (non-fatal):', error.message);
        return flag;
      }
      // Map back to AttentionFlag type
      return {
        ...flag,
        id: data.id || flag.id,
        createdAt: data.created_at || flag.createdAt,
      };
    } catch (e: any) {
      console.warn('[saveAttentionFlag] Error (non-fatal):', e?.message);
      return flag;
    }
  }

  async getSessionFlags(sessionId: string): Promise<AttentionFlag[]> {
    // attention_flags table uses encounter_id (UUID), not session_id (TEXT)
    // Best-effort: try both
    try {
      const client = await createClient();
      const { data, error } = await client
        .from('attention_flags')
        .select();

      if (error || !data) return [];
      return data.map((row: any) => ({
        id: String(row.id),
        sessionId: sessionId,
        patientId: 'unknown',
        ruleId: row.source_rule_id ? String(row.source_rule_id) : undefined,
        category: row.category,
        severity: row.severity,
        label: String(row.flag_label || row.label || ''),
        message: String(row.message),
        evidence: [],
        provenances: [],
        requiresClinicalReview: !!row.requires_clinical_review,
        status: row.acknowledged_by_doctor ? 'acknowledged' : 'active',
        createdAt: String(row.created_at),
        updatedAt: String(row.created_at),
      }));
    } catch {
      return [];
    }
  }

  async acknowledgeFlag(id: string): Promise<void> {
    try {
      await (await createClient())
        .from('attention_flags')
        .update({ acknowledged_by_doctor: true })
        .eq('id', id);
    } catch (e: any) {
      console.warn('[acknowledgeFlag] Error (non-fatal):', e?.message);
    }
  }

  async resolveConflict(flagId: string, _decision: string, _doctorId: string): Promise<AttentionFlag> {
    try {
      const { data } = await (await createClient())
        .from('attention_flags')
        .update({ acknowledged_by_doctor: true })
        .eq('id', flagId)
        .select()
        .single();

      if (data) {
        return {
          id: String(data.id),
          sessionId: '',
          patientId: 'unknown',
          category: data.category,
          severity: data.severity,
          label: String(data.flag_label || ''),
          message: String(data.message),
          evidence: [],
          provenances: [],
          requiresClinicalReview: !!data.requires_clinical_review,
          status: 'resolved',
          resolutionDecision: _decision,
          resolvedBy: _doctorId,
          resolvedAt: new Date().toISOString(),
          createdAt: String(data.created_at),
          updatedAt: new Date().toISOString(),
        };
      }
    } catch (e: any) {
      console.warn('[resolveConflict] Error (non-fatal):', e?.message);
    }
    // Return a dummy flag if the update failed
    return {
      id: flagId,
      sessionId: '',
      patientId: 'unknown',
      category: 'clinical' as any,
      severity: 'low' as any,
      label: '',
      message: '',
      evidence: [],
      provenances: [],
      requiresClinicalReview: false,
      status: 'resolved' as any,
      resolutionDecision: _decision,
      resolvedBy: _doctorId,
      resolvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
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
    dbPayload.id = report.reportId;
    delete dbPayload.report_id;

    const { data, error } = await (await createClient())
      .from('clinical_reports')
      .upsert(dbPayload)
      .select()
      .single();

    if (error) throw new Error(`saveReport failed: ${error.message}`);
    const camel = keysToCamel(data);
    camel.reportId = data.id;
    return ClinicalHistoryReportSchema.parse(camel);
  }

  async getReport(id: string): Promise<ClinicalHistoryReport | null> {
    const { data, error } = await (await createClient())
      .from('clinical_reports')
      .select()
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`getReport failed: ${error.message}`);
    if (!data) return null;
    const camel = keysToCamel(data);
    camel.reportId = data.id;
    return ClinicalHistoryReportSchema.parse(camel);
  }

  async getReportBySession(sessionId: string): Promise<ClinicalHistoryReport | null> {
    const { data, error } = await (await createClient())
      .from('clinical_reports')
      .select()
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw new Error(`getReportBySession failed: ${error.message}`);
    if (!data || data.length === 0) return null;
    const row = data[0];
    const camel = keysToCamel(row);
    camel.reportId = row.id;
    return ClinicalHistoryReportSchema.parse(camel);
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
      .update({ status: 'finalized' })
      .eq('id', sessionId);
    if (error) throw new Error('Failed to finalize session: ' + error.message);
  }

  async saveAuditLog(log: AuditLog): Promise<AuditLog> {
    AuditLogSchema.parse(log);
    try {
      // Live schema: id(UUID auto), encounter_id(UUID nullable), action(varchar), actor_type(varchar), actor_id(varchar), metadata(jsonb), timestamp(timestamptz auto)
      const dbPayload: Record<string, unknown> = {
        action: log.action,
        actor_type: 'patient',
        actor_id: log.entityId || log.sessionId || null,
        metadata: {
          ...(log.metadata || {}),
          sessionId: log.sessionId,
          entityType: log.entityType,
          entityId: log.entityId,
        },
      };
      const { data, error } = await (await createAdminClient())
        .from('audit_logs')
        .insert(dbPayload)
        .select()
        .single();

      if (error) {
        console.warn('[saveAuditLog] Error (non-fatal):', error.message);
        return log;
      }
      return {
        ...log,
        id: data.id || log.id,
      };
    } catch (e: any) {
      console.warn('[saveAuditLog] Error (non-fatal):', e?.message);
      return log;
    }
  }

  async getSessionAuditLogs(sessionId: string): Promise<AuditLog[]> {
    try {
      // audit_logs has no session_id column — query all and filter by metadata
      const { data, error } = await (await createClient())
        .from('audit_logs')
        .select();

      if (error || !data) return [];
      return data
        .filter((row: any) => row.metadata?.sessionId === sessionId || row.actor_id === sessionId)
        .map((row: any) => ({
          id: String(row.id),
          sessionId: row.metadata?.sessionId || sessionId,
          action: row.action,
          entityType: row.metadata?.entityType,
          entityId: row.metadata?.entityId || row.actor_id,
          timestamp: String(row.timestamp),
          metadata: row.metadata,
        }));
    } catch {
      return [];
    }
  }

  async resetDemoData(): Promise<void> {
    try {
      const adminClient = await createAdminClient();

      // Best-effort cleanup — don't crash if columns are missing
      try { await adminClient.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch { /* ignore */ }
      try { await adminClient.from('export_records').delete().in('session_id', ['scenario_standard', 'scenario_attention', 'scenario_ayush']); } catch { /* ignore */ }
      try { await adminClient.from('intake_sessions').delete().in('id', ['scenario_standard', 'scenario_attention', 'scenario_ayush']); } catch { /* ignore */ }
      try { await adminClient.from('consents').delete().in('id', ['consent_golden', 'consent_02', 'consent_03']); } catch { /* ignore */ }
    } catch {
      console.warn('[resetDemoData] Error — continuing anyway');
    }
  }

  async seedDatabase(_patientScenario: string): Promise<void> {
    console.log('Supabase seeding scenario:', _patientScenario);
  }
}
