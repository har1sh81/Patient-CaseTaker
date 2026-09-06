import * as zlib from 'zlib';
import { OcrPage, OcrProviderResult } from './ocr-types';

/**
 * Direct text extractor for text-based PDFs.
 * Decodes FlateDecode streams and parses PDF text operators (Tj, TJ, ', ")
 * to extract clean page text without altering or interpreting content.
 */
export function extractTextFromPdfBuffer(pdfBuffer: Buffer): OcrProviderResult {
  const pdfString = pdfBuffer.toString('latin1');
  const pagesText: string[] = [];

  // Match all stream ... endstream blocks in PDF
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(pdfString)) !== null) {
    const rawStreamData = match[1];
    let decompressedText = '';

    try {
      const streamBuf = Buffer.from(rawStreamData, 'latin1');
      decompressedText = zlib.inflateSync(streamBuf).toString('utf8');
    } catch {
      // Stream might not be FlateDecode compressed
      decompressedText = rawStreamData;
    }

    if (decompressedText.includes('BT') || decompressedText.includes('Tj') || decompressedText.includes('TJ')) {
      const extractedStreamLines = parsePdfTextStream(decompressedText);
      if (extractedStreamLines.trim()) {
        pagesText.push(extractedStreamLines.trim());
      }
    }
  }

  // Fallback: If streams didn't contain BT/ET tags, search raw string for uncompressed text blocks
  if (pagesText.length === 0) {
    const fallbackText = parsePdfTextStream(pdfString);
    if (fallbackText.trim()) {
      pagesText.push(fallbackText.trim());
    }
  }

  const structuredPages: OcrPage[] = pagesText.map((text, idx) => ({
    pageNumber: idx + 1,
    text,
  }));

  const fullText = structuredPages
    .map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`)
    .join('\n\n');

  return {
    text: fullText,
    pages: structuredPages,
    provider: 'pdf_text_extractor',
    extractionMethod: 'text_extraction',
    confidence: structuredPages.length > 0 ? 0.98 : undefined,
  };
}

/**
 * Parses decompressed PDF stream content for text operators (Tj, TJ, ', ").
 * Converts hex strings (<4150...>) and literal strings ((Text)) to UTF-8 text.
 */
function parsePdfTextStream(streamContent: string): string {
  const lines: string[] = [];

  // Match hex strings <4150... Tj> or literal strings (Text) Tj or TJ array [(Hex/Literal)] TJ
  const tjRegex = /(?:<([0-9a-fA-F]+)>|\((.*?)\))\s*(?:Tj|'|")/g;
  const arrayTjRegex = /\[\s*((?:<[0-9a-fA-F]+>|\(.*?\)|-?\d+\s*)+)\s*\]\s*TJ/g;

  // 1. Process array TJ operators: [(Text) -10 (More)] TJ
  let arrMatch: RegExpExecArray | null;
  while ((arrMatch = arrayTjRegex.exec(streamContent)) !== null) {
    const arrayBody = arrMatch[1];
    const itemRegex = /<([0-9a-fA-F]+)>|\((.*?)\)/g;
    let item: RegExpExecArray | null;
    let segmentText = '';

    while ((item = itemRegex.exec(arrayBody)) !== null) {
      if (item[1]) {
        segmentText += decodeHexPdfString(item[1]);
      } else if (item[2] !== undefined) {
        segmentText += item[2];
      }
    }

    if (segmentText.trim()) {
      lines.push(segmentText.trim());
    }
  }

  // 2. Process individual Tj operators: <4150...> Tj or (Text) Tj
  let tjMatch: RegExpExecArray | null;
  while ((tjMatch = tjRegex.exec(streamContent)) !== null) {
    let text = '';
    if (tjMatch[1]) {
      text = decodeHexPdfString(tjMatch[1]);
    } else if (tjMatch[2] !== undefined) {
      text = tjMatch[2];
    }

    if (text.trim()) {
      lines.push(text.trim());
    }
  }

  return lines.join('\n');
}

/**
 * Decodes PDF hex-encoded strings (e.g., '41504F4C4C4F' -> 'APOLLO')
 */
function decodeHexPdfString(hexStr: string): string {
  try {
    const cleanHex = hexStr.replace(/[^0-9a-fA-F]/g, '');
    const buf = Buffer.from(cleanHex, 'hex');
    // Check if UTF-16 BE BOM (starts with FEFF)
    if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
      const swapped = Buffer.alloc(buf.length - 2);
      for (let i = 2; i < buf.length; i += 2) {
        if (i + 1 < buf.length) {
          swapped[i - 2] = buf[i + 1];
          swapped[i - 1] = buf[i];
        }
      }
      return swapped.toString('utf16le');
    }
    return buf.toString('utf8');
  } catch {
    return hexStr;
  }
}
