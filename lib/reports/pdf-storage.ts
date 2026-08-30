import { storage } from '@/lib/supabase/storage';

const pdfMemoryCache = new Map<string, Buffer>();

export async function storeClinicalSummaryPDF(sessionId: string, pdfBuffer: Buffer): Promise<string> {
  const fileName = `pdf_${sessionId}.pdf`;
  pdfMemoryCache.set(sessionId, pdfBuffer);

  try {
    const filePayload = {
      name: fileName,
      type: 'application/pdf',
      size: pdfBuffer.length,
      buffer: pdfBuffer,
    };
    const path = await storage.uploadDocument('system', sessionId, `pdf_${sessionId}`, filePayload);
    return path;
  } catch (err) {
    console.warn('[PDF Storage] Storage fallback active:', err);
    return `memory://${sessionId}/${fileName}`;
  }
}

export async function getClinicalSummaryPDF(sessionId: string): Promise<Buffer | null> {
  if (pdfMemoryCache.has(sessionId)) {
    return pdfMemoryCache.get(sessionId)!;
  }

  try {
    const path = `system/${sessionId}/pdf_${sessionId}.pdf`;
    const buffer = await storage.downloadDocument(path);
    pdfMemoryCache.set(sessionId, buffer);
    return buffer;
  } catch {
    return null;
  }
}
