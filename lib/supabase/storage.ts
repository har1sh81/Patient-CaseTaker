import { supabase } from './index';

export interface FilePayload {
  name: string;
  type: string;
  size: number;
  buffer: Buffer;
}

export interface StorageService {
  uploadDocument(
    patientId: string,
    sessionId: string,
    documentId: string,
    file: FilePayload
  ): Promise<string>;

  deleteDocument(storagePath: string): Promise<void>;
  getDocumentUrl(storagePath: string): Promise<string>;
  downloadDocument(storagePath: string): Promise<Buffer>;
  cleanupSessionDocuments(sessionId: string): Promise<void>;
}

export class SupabaseStorage implements StorageService {
  private bucketName = 'medical_documents';

  private validateFile(file: FilePayload) {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type: ${file.type}. Supported types: PDF, PNG, JPG, JPEG.`);
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error(`File size exceeds the 5MB limit: ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
    }
  }

  async uploadDocument(
    patientId: string,
    sessionId: string,
    documentId: string,
    file: FilePayload
  ): Promise<string> {
    this.validateFile(file);
    const extension = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1] || 'jpg';
    const storagePath = `${patientId}/${sessionId}/${documentId}.${extension}`;

    const { error } = await supabase.storage
      .from(this.bucketName)
      .upload(storagePath, file.buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }

    return storagePath;
  }

  async deleteDocument(storagePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(this.bucketName)
      .remove([storagePath]);

    if (error) {
      throw new Error(`Supabase Storage delete failed: ${error.message}`);
    }
  }

  async getDocumentUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .createSignedUrl(storagePath, 3600); // 1 hour expiration

    if (error) {
      throw new Error(`Supabase Storage signed URL failed: ${error.message}`);
    }

    return data.signedUrl;
  }

  async downloadDocument(storagePath: string): Promise<Buffer> {
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .download(storagePath);

    if (error || !data) {
      throw new Error(`Supabase Storage download failed: ${error?.message || 'No data'}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async cleanupSessionDocuments(sessionId: string): Promise<void> {
    // List all files in the bucket, then delete matching session files
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .list('', { limit: 100 });

    if (error) return;

    for (const folder of data) {
      if (folder.name) {
        const { data: subData } = await supabase.storage
          .from(this.bucketName)
          .list(folder.name);
        
        if (subData) {
          const filesToDelete = subData
            .filter((f) => f.name.includes(sessionId))
            .map((f) => `${folder.name}/${f.name}`);
          
          if (filesToDelete.length > 0) {
            await supabase.storage.from(this.bucketName).remove(filesToDelete);
          }
        }
      }
    }
  }
}

export class MockStorage implements StorageService {
  private files = new Map<string, FilePayload>();

  private validateFile(file: FilePayload) {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type: ${file.type}. Supported types: PDF, PNG, JPG, JPEG.`);
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error(`File size exceeds 5MB limit: ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
    }
  }

  async uploadDocument(
    patientId: string,
    sessionId: string,
    documentId: string,
    file: FilePayload
  ): Promise<string> {
    this.validateFile(file);
    const extension = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1] || 'jpg';
    const storagePath = `${patientId}/${sessionId}/${documentId}.${extension}`;
    this.files.set(storagePath, { ...file });
    return storagePath;
  }

  async deleteDocument(storagePath: string): Promise<void> {
    this.files.delete(storagePath);
  }

  async getDocumentUrl(storagePath: string): Promise<string> {
    const exists = this.files.has(storagePath);
    if (!exists) throw new Error(`Document ${storagePath} not found in mock storage.`);
    return `https://mock-storage.local/medical-documents/${storagePath}?signed=true`;
  }

  async downloadDocument(storagePath: string): Promise<Buffer> {
    const file = this.files.get(storagePath);
    if (!file) throw new Error(`Document ${storagePath} not found in mock storage.`);
    return file.buffer;
  }

  async cleanupSessionDocuments(sessionId: string): Promise<void> {
    for (const key of Array.from(this.files.keys())) {
      if (key.includes(sessionId)) {
        this.files.delete(key);
      }
    }
  }
}

const isMockEnabled = process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED !== 'false';

export const storage: StorageService = isMockEnabled
  ? new MockStorage()
  : new SupabaseStorage();

console.log(`[MediKiosk Storage] Initialized file storage client in ${isMockEnabled ? 'MOCK' : 'SUPABASE'} mode.`);
