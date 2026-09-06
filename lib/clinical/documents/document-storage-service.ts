/**
 * Task #16 — Medical Document Storage Service
 * MediKiosk Clinical Engine
 * 
 * Manages secure server-side storage, metadata indexing, consent checking,
 * audit logging, signed URL generation, and rollback handling for medical documents.
 */

import { createClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import {
  UploadMedicalDocumentInput,
  MedicalDocumentRecord,
  DocumentStorageResult,
  ListDocumentFilters,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  AllowedMimeType,
} from './document-storage-types';
import crypto from 'crypto';

const BUCKET_NAME = 'medical-documents';

/**
 * Sanitizes user-supplied filenames to prevent path traversal and unsafe characters.
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return 'unnamed_document';
  let sanitized = fileName.replace(/[\0\x00-\x1F\x7F]/g, '').trim();
  // Remove any path leading up to filename (windows or unix path separators)
  sanitized = sanitized.replace(/^.*[\\\/]/, '');
  // Remove double dots
  sanitized = sanitized.replace(/\.\./g, '');
  // Replace non-safe chars with underscore
  sanitized = sanitized.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    sanitized = `document_${Date.now()}`;
  }
  return sanitized;
}

/**
 * Validates document file constraints (MIME type, size, filename).
 */
export function validateDocumentFile(
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
): { valid: boolean; error?: string } {
  if (!fileName || typeof fileName !== 'string') {
    return { valid: false, error: 'File name is required' };
  }

  // Path traversal check
  if (fileName.includes('../') || fileName.includes('..\\') || fileName.startsWith('/') || fileName.startsWith('\\')) {
    return { valid: false, error: 'Filename contains forbidden path traversal sequences' };
  }

  const normalizedMime = mimeType?.toLowerCase() as AllowedMimeType;
  if (!ALLOWED_MIME_TYPES.includes(normalizedMime)) {
    return {
      valid: false,
      error: `Unsupported MIME type: '${mimeType}'. Supported types are PDF, PNG, and JPEG.`,
    };
  }

  // Also check file extension mismatch/executable extensions
  const ext = fileName.split('.').pop()?.toLowerCase();
  const forbiddenExts = ['exe', 'bat', 'cmd', 'sh', 'php', 'js', 'html', 'dll', 'vbs', 'ps1', 'py'];
  if (ext && forbiddenExts.includes(ext)) {
    return { valid: false, error: `Executable or script extension '.${ext}' is prohibited.` };
  }

  if (!fileBuffer || !(fileBuffer instanceof Buffer) || fileBuffer.length === 0) {
    return { valid: false, error: 'File content is empty or invalid' };
  }

  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (fileBuffer.length / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeMb}MB) exceeds maximum limit of 10MB`,
    };
  }

  return { valid: true };
}

/**
 * Writes an entry to public.audit_logs for document actions.
 */
export async function logDocumentAudit(
  action: 'document_uploaded' | 'document_accessed' | 'document_archived',
  patientId: string,
  documentId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from('audit_logs').insert({
      action,
      actor_type: 'patient',
      actor_id: patientId,
      metadata: {
        document_id: documentId,
        ...metadata,
      },
    });
  } catch (err) {
    console.error('[Document Storage Audit] Failed to write audit log:', err);
  }
}

/**
 * Uploads a medical document to Supabase Storage and records metadata in public.medical_documents.
 * Performs patient validation, encounter validation, server-side consent checking,
 * storage upload, DB insertion, and rollback on DB error.
 */
export async function uploadMedicalDocument(
  input: UploadMedicalDocumentInput
): Promise<DocumentStorageResult> {
  const supabase = await createClient();

  // 1. Input & File validation
  const fileCheck = validateDocumentFile(input.fileName, input.fileBuffer, input.mimeType);
  if (!fileCheck.valid) {
    return {
      success: false,
      errorCode: 'INVALID_INPUT',
      error: fileCheck.error,
    };
  }

  if (!input.patientId) {
    return {
      success: false,
      errorCode: 'INVALID_INPUT',
      error: 'patientId is required',
    };
  }

  // 2. Validate Patient exists
  const { data: patient, error: patientErr } = await supabase
    .from('patients')
    .select('id')
    .eq('id', input.patientId)
    .maybeSingle();

  if (patientErr || !patient) {
    return {
      success: false,
      errorCode: 'NOT_FOUND',
      error: `Patient not found: ${input.patientId}`,
    };
  }

  // 3. Validate Encounter if provided
  if (input.encounterId) {
    const { data: encounter, error: encErr } = await supabase
      .from('encounters')
      .select('id, patient_id')
      .eq('id', input.encounterId)
      .maybeSingle();

    if (encErr || !encounter) {
      return {
        success: false,
        errorCode: 'NOT_FOUND',
        error: `Encounter not found: ${input.encounterId}`,
      };
    }

    if (encounter.patient_id !== input.patientId) {
      return {
        success: false,
        errorCode: 'INVALID_INPUT',
        error: `Encounter ${input.encounterId} does not belong to patient ${input.patientId}`,
      };
    }
  }

  // 4. Server-side Consent Check
  const isAyush =
    input.documentType?.toLowerCase().includes('ayush') ||
    input.documentType?.toLowerCase().includes('ayurveda');

  const requiredPermission = isAyush ? 'share_ayush_records' : 'share_health_records';
  const consentGranted = await hasValidConsent(input.patientId, requiredPermission);

  if (!consentGranted) {
    return {
      success: false,
      errorCode: 'CONSENT_DENIED',
      error: `Patient has not granted active consent for '${requiredPermission}'`,
    };
  }

  // 5. Generate unique Document ID and safe storage path
  const documentId = crypto.randomUUID ? crypto.randomUUID() : `d${Date.now()}`;
  const safeFileName = sanitizeFileName(input.fileName);
  const relativeObjectPath = `${input.patientId}/${documentId}_${safeFileName}`;
  const dbStoragePath = `${BUCKET_NAME}/${relativeObjectPath}`;

  // 6. Upload file to Supabase Storage
  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(relativeObjectPath, input.fileBuffer, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (uploadErr || !uploadData) {
    return {
      success: false,
      errorCode: 'STORAGE_ERROR',
      error: `Storage upload failed: ${uploadErr?.message || 'Unknown storage error'}`,
    };
  }

  // 7. Insert metadata into public.medical_documents
  const documentDate = input.documentDate || new Date().toISOString();

  const metadataRow = {
    id: documentId,
    patient_id: input.patientId,
    encounter_id: input.encounterId || null,
    file_name: safeFileName,
    mime_type: input.mimeType,
    storage_path: dbStoragePath,
    document_type: input.documentType,
    upload_status: 'uploaded',
    ocr_status: 'pending', // Task #16 specifies OCR remains pending
    source_id: null,
    uploaded_at: documentDate,
  };

  const { data: insertedDoc, error: insertErr } = await supabase
    .from('medical_documents')
    .insert(metadataRow)
    .select()
    .single();

  // 8. ROLLBACK HANDLING: If DB insert fails, remove object from Storage
  if (insertErr || !insertedDoc) {
    console.error(`[Document Storage] DB insertion failed for document ${documentId}. Initiating Storage rollback.`);
    try {
      const { error: removeErr } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([relativeObjectPath]);
      if (removeErr) {
        console.error(`[Document Storage Rollback Warning] Failed to delete orphaned storage object ${relativeObjectPath}:`, removeErr.message);
      } else {
        console.log(`[Document Storage Rollback] Successfully removed orphaned storage object ${relativeObjectPath}`);
      }
    } catch (cleanupErr) {
      console.error('[Document Storage Rollback Error] Storage cleanup threw exception:', cleanupErr);
    }

    return {
      success: false,
      errorCode: 'DB_ERROR',
      error: `Failed to insert document metadata row: ${insertErr?.message || 'DB insertion error'}`,
    };
  }

  // 9. Write audit log
  await logDocumentAudit('document_uploaded', input.patientId, documentId, {
    file_name: safeFileName,
    mime_type: input.mimeType,
    document_type: input.documentType,
    storage_path: dbStoragePath,
  });

  return {
    success: true,
    document: insertedDoc as MedicalDocumentRecord,
  };
}

/**
 * Retrieves document metadata and generates a short-lived signed URL.
 * Enforces consent and cross-patient access controls.
 */
export async function getMedicalDocumentById(
  documentId: string,
  requestingPatientId?: string,
  expirationSeconds: number = 600
): Promise<DocumentStorageResult> {
  if (!documentId) {
    return { success: false, errorCode: 'INVALID_INPUT', error: 'documentId is required' };
  }

  const supabase = await createClient();

  // 1. Fetch metadata row
  const { data: doc, error: docErr } = await supabase
    .from('medical_documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle();

  if (docErr || !doc) {
    return { success: false, errorCode: 'NOT_FOUND', error: `Medical document not found: ${documentId}` };
  }

  // 2. Cross-patient ownership check
  if (requestingPatientId && doc.patient_id !== requestingPatientId) {
    return {
      success: false,
      errorCode: 'UNAUTHORIZED',
      error: `Cross-patient document access denied. Document belongs to patient ${doc.patient_id}`,
    };
  }

  // 3. Enforce consent
  const isAyush = doc.document_type?.toLowerCase().includes('ayush') || doc.document_type?.toLowerCase().includes('ayurveda');
  const requiredPermission = isAyush ? 'share_ayush_records' : 'share_health_records';
  const consentGranted = await hasValidConsent(doc.patient_id, requiredPermission);

  if (!consentGranted) {
    return {
      success: false,
      errorCode: 'CONSENT_DENIED',
      error: `Patient has not granted active consent for '${requiredPermission}'`,
    };
  }

  // 4. Generate Signed URL
  let objectPath = doc.storage_path;
  if (objectPath.startsWith(`${BUCKET_NAME}/`)) {
    objectPath = objectPath.substring(`${BUCKET_NAME}/`.length);
  }

  const { data: signedData, error: signedErr } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(objectPath, expirationSeconds);

  if (signedErr || !signedData?.signedUrl) {
    return {
      success: false,
      errorCode: 'STORAGE_ERROR',
      error: `Failed to generate signed URL: ${signedErr?.message || 'Storage error'}`,
    };
  }

  // 5. Audit Log
  await logDocumentAudit('document_accessed', doc.patient_id, documentId, {
    access_type: 'signed_url',
  });

  return {
    success: true,
    document: doc as MedicalDocumentRecord,
    signedUrl: signedData.signedUrl,
  };
}

/**
 * Lists documents for a given patient with optional encounter and type filtering.
 * Enforces server-side consent.
 */
export async function listPatientDocuments(
  patientId: string,
  filters?: ListDocumentFilters
): Promise<{ success: boolean; documents?: MedicalDocumentRecord[]; error?: string; errorCode?: string }> {
  if (!patientId) {
    return { success: false, errorCode: 'INVALID_INPUT', error: 'patientId is required' };
  }

  // Enforce consent
  const consentGranted = await hasValidConsent(patientId, 'share_health_records');
  if (!consentGranted) {
    return {
      success: false,
      errorCode: 'CONSENT_DENIED',
      error: 'Patient consent required to list health records',
    };
  }

  const supabase = await createClient();
  let query = supabase
    .from('medical_documents')
    .select('*')
    .eq('patient_id', patientId);

  if (filters?.encounterId) {
    query = query.eq('encounter_id', filters.encounterId);
  }

  if (filters?.documentType) {
    query = query.eq('document_type', filters.documentType);
  }

  if (!filters?.includeArchived) {
    query = query.neq('upload_status', 'archived');
  }

  query = query.order('uploaded_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    return {
      success: false,
      errorCode: 'DB_ERROR',
      error: `Failed to list patient documents: ${error.message}`,
    };
  }

  return {
    success: true,
    documents: (data || []) as MedicalDocumentRecord[],
  };
}

/**
 * Archives a medical document safely without deleting historical files.
 */
export async function archiveMedicalDocument(
  documentId: string,
  requestingPatientId: string
): Promise<DocumentStorageResult> {
  const getRes = await getMedicalDocumentById(documentId, requestingPatientId);
  if (!getRes.success || !getRes.document) {
    return getRes;
  }

  const supabase = await createClient();
  const { data: updatedDoc, error: updateErr } = await supabase
    .from('medical_documents')
    .update({ upload_status: 'archived' })
    .eq('id', documentId)
    .select()
    .single();

  if (updateErr || !updatedDoc) {
    return {
      success: false,
      errorCode: 'DB_ERROR',
      error: `Failed to archive document: ${updateErr?.message}`,
    };
  }

  await logDocumentAudit('document_archived', requestingPatientId, documentId);

  return {
    success: true,
    document: updatedDoc as MedicalDocumentRecord,
  };
}
