import { DocumentMetadata } from './document-types';

export async function uploadDocument(fileBuffer: Buffer, fileName: string): Promise<DocumentMetadata> {
  console.log(`[Upload Service] Uploading file of size: ${fileBuffer.length} bytes, name: ${fileName}`);
  return {
    id: `doc_${Math.random().toString(36).substr(2, 9)}`,
    fileName,
    fileType: fileName.split('.').pop() || 'unknown',
    uploadedAt: new Date().toISOString(),
    status: 'PENDING',
  };
}
