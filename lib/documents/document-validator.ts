import { DocumentMetadata } from './document-types';

export function validateDocument(document: DocumentMetadata): boolean {
  if (!document.id || !document.fileName || !document.fileType) {
    return false;
  }
  return true;
}
