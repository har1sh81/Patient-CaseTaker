/**
 * Task #25 — Procedure Name Normalization & Safety Dictionary
 * MediKiosk Clinical Engine
 */

import { ProcedureCategory } from './types';

export interface ProcedureNormalizationResult {
  procedureName: string;
  rawProcedureName: string;
  normalizedProcedureName?: string;
  procedureNameNative?: string;
  category: ProcedureCategory;
  isUncertain: boolean;
  needsReview: boolean;
  confidence: number;
  uncertaintyReason?: string;
}

const CANONICAL_PROCEDURE_MAP: Record<string, { canonical: string; category: ProcedureCategory }> = {
  appendectomy: { canonical: 'Appendectomy', category: 'surgery' },
  appendicectomy: { canonical: 'Appendectomy', category: 'surgery' },

  'cataract surgery': { canonical: 'Cataract Surgery', category: 'surgery' },
  'cataract extraction': { canonical: 'Cataract Surgery', category: 'surgery' },

  'cesarean section': { canonical: 'Cesarean Section', category: 'surgery' },
  'c-section': { canonical: 'Cesarean Section', category: 'surgery' },
  lscs: { canonical: 'Cesarean Section', category: 'surgery' },

  cabg: { canonical: 'Coronary Artery Bypass Graft', category: 'surgery' },
  'coronary artery bypass graft': { canonical: 'Coronary Artery Bypass Graft', category: 'surgery' },

  pci: { canonical: 'Percutaneous Coronary Intervention', category: 'intervention' },
  'percutaneous coronary intervention': { canonical: 'Percutaneous Coronary Intervention', category: 'intervention' },

  angioplasty: { canonical: 'Coronary Angioplasty', category: 'intervention' },
  'coronary angioplasty': { canonical: 'Coronary Angioplasty', category: 'intervention' },

  'upper gi endoscopy': { canonical: 'Upper GI Endoscopy', category: 'diagnostic' },
  'ugi endoscopy': { canonical: 'Upper GI Endoscopy', category: 'diagnostic' },
  endoscopy: { canonical: 'Upper GI Endoscopy', category: 'diagnostic' },
  gastroscopy: { canonical: 'Upper GI Endoscopy', category: 'diagnostic' },

  colonoscopy: { canonical: 'Colonoscopy', category: 'diagnostic' },
  biopsy: { canonical: 'Biopsy', category: 'diagnostic' },

  physiotherapy: { canonical: 'Physiotherapy', category: 'rehabilitation' },
  'physical therapy': { canonical: 'Physiotherapy', category: 'rehabilitation' },

  dialysis: { canonical: 'Dialysis', category: 'therapeutic' },
  hemodialysis: { canonical: 'Dialysis', category: 'therapeutic' },

  'dental extraction': { canonical: 'Dental Extraction', category: 'surgery' },
  'tooth extraction': { canonical: 'Dental Extraction', category: 'surgery' },

  arthroscopy: { canonical: 'Arthroscopy', category: 'surgery' },
  'knee arthroscopy': { canonical: 'Knee Arthroscopy', category: 'surgery' },

  // AYUSH Therapies & Procedures
  panchakarma: { canonical: 'Panchakarma', category: 'therapeutic' },
  abhyanga: { canonical: 'Abhyanga', category: 'therapeutic' },
  shirodhara: { canonical: 'Shirodhara', category: 'therapeutic' },
  swedana: { canonical: 'Swedana', category: 'therapeutic' },
  basti: { canonical: 'Basti', category: 'therapeutic' },
};

const NATIVE_SCRIPT_PROCEDURE_MAP: Record<string, { canonical: string; category: ProcedureCategory; language: 'ta' | 'hi' }> = {
  // Tamil
  'கண்புரை அறுவை சிகிச்சை': { canonical: 'Cataract Surgery', category: 'surgery', language: 'ta' },
  'அப்பெண்டிக்ஸ் அறுவை சிகிச்சை': { canonical: 'Appendectomy', category: 'surgery', language: 'ta' },
  'பயோப்சி': { canonical: 'Biopsy', category: 'diagnostic', language: 'ta' },
  'பிசியோதெரபி': { canonical: 'Physiotherapy', category: 'rehabilitation', language: 'ta' },

  // Hindi
  'मोतीबिंदु की सर्जरी': { canonical: 'Cataract Surgery', category: 'surgery', language: 'hi' },
  'अपेंडिक्स की सर्जरी': { canonical: 'Appendectomy', category: 'surgery', language: 'hi' },
  'बायोप्सी': { canonical: 'Biopsy', category: 'diagnostic', language: 'hi' },
  'फिजियोथेरेपी': { canonical: 'Physiotherapy', category: 'rehabilitation', language: 'hi' },
};

/**
 * Normalizes procedure name conservatively.
 */
export function normalizeProcedureName(rawInput: string): ProcedureNormalizationResult {
  const cleanInput = rawInput.trim();
  const lowerInput = cleanInput.toLowerCase().replace(/\s+/g, ' ');

  // 1. OCR ambiguity / stem truncation check (e.g., "Laparo... append...", "cataract surg?")
  if (cleanInput.endsWith('...') || cleanInput.includes('?') || cleanInput.length <= 3) {
    return {
      procedureName: cleanInput,
      rawProcedureName: cleanInput,
      category: 'other',
      isUncertain: true,
      needsReview: true,
      confidence: 0.4,
      uncertaintyReason: `Procedure text contains ambiguous trailing dots or question mark ('${cleanInput}')`,
    };
  }

  // 2. Multilingual native script matching
  for (const [nativeText, mapping] of Object.entries(NATIVE_SCRIPT_PROCEDURE_MAP)) {
    if (cleanInput.includes(nativeText) || lowerInput.includes(nativeText.toLowerCase())) {
      return {
        procedureName: mapping.canonical,
        rawProcedureName: cleanInput,
        normalizedProcedureName: mapping.canonical,
        procedureNameNative: nativeText,
        category: mapping.category,
        isUncertain: false,
        needsReview: false,
        confidence: 0.95,
      };
    }
  }

  // 3. Exact dictionary match
  if (CANONICAL_PROCEDURE_MAP[lowerInput]) {
    const entry = CANONICAL_PROCEDURE_MAP[lowerInput];
    return {
      procedureName: entry.canonical,
      rawProcedureName: cleanInput,
      normalizedProcedureName: entry.canonical,
      category: entry.category,
      isUncertain: false,
      needsReview: false,
      confidence: 0.98,
    };
  }

  // 4. Substring dictionary lookup for compound strings (e.g., "underwent cataract surgery")
  for (const [key, entry] of Object.entries(CANONICAL_PROCEDURE_MAP)) {
    if (key.length >= 4 && lowerInput.includes(key)) {
      return {
        procedureName: entry.canonical,
        rawProcedureName: cleanInput,
        normalizedProcedureName: entry.canonical,
        category: entry.category,
        isUncertain: false,
        needsReview: false,
        confidence: 0.92,
      };
    }
  }

  // 5. Preserved fallback for unmapped custom/specific procedures (e.g. "Ultrasound-guided procedure")
  return {
    procedureName: cleanInput,
    rawProcedureName: cleanInput,
    normalizedProcedureName: undefined,
    category: 'other',
    isUncertain: false,
    needsReview: false,
    confidence: 0.80,
  };
}
