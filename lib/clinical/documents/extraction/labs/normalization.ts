/**
 * Task #23 — Laboratory Test Name Normalization & Safety Dictionary
 * MediKiosk Clinical Engine
 */

export interface TestNormalizationResult {
  canonicalTestName: string;
  rawTestName: string;
  testNameNative?: string;
  isUncertain: boolean;
  needsReview: boolean;
  confidence: number;
  uncertaintyReason?: string;
}

/**
 * Standard mapping dictionary for common laboratory test names.
 * Explicitly conservative: Maps unambiguous synonyms to canonical names.
 */
const CANONICAL_LAB_DICTIONARY: Record<string, string> = {
  // Glycemic Markers
  hba1c: 'HbA1c',
  'hb a1c': 'HbA1c',
  'hb-a1c': 'HbA1c',
  'glycated hemoglobin': 'HbA1c',
  glycohemoglobin: 'HbA1c',
  
  fbs: 'Fasting Glucose',
  'fasting blood sugar': 'Fasting Glucose',
  'fasting glucose': 'Fasting Glucose',
  'fasting plasma glucose': 'Fasting Glucose',

  ppbs: 'Postprandial Glucose',
  'postprandial glucose': 'Postprandial Glucose',
  'post prandial blood sugar': 'Postprandial Glucose',
  'post-prandial blood sugar': 'Postprandial Glucose',

  rbs: 'Random Glucose',
  'random blood sugar': 'Random Glucose',
  'random glucose': 'Random Glucose',

  // Renal & Electrolytes
  creatinine: 'Serum Creatinine',
  'serum creatinine': 'Serum Creatinine',
  's. creatinine': 'Serum Creatinine',
  's creatinine': 'Serum Creatinine',
  
  urea: 'Blood Urea',
  'blood urea': 'Blood Urea',
  's. urea': 'Blood Urea',
  'blood urea nitrogen': 'BUN',
  bun: 'BUN',

  // Lipid Profile
  'total cholesterol': 'Total Cholesterol',
  's. cholesterol': 'Total Cholesterol',
  'serum cholesterol': 'Total Cholesterol',
  cholesterol: 'Total Cholesterol',

  triglycerides: 'Triglycerides',
  's. triglycerides': 'Triglycerides',
  tgl: 'Triglycerides',

  hdl: 'HDL Cholesterol',
  'hdl cholesterol': 'HDL Cholesterol',
  's. hdl': 'HDL Cholesterol',

  ldl: 'LDL Cholesterol',
  'ldl cholesterol': 'LDL Cholesterol',
  's. ldl': 'LDL Cholesterol',

  // Liver Enzymes
  sgpt: 'SGPT/ALT',
  alt: 'SGPT/ALT',
  'sgpt/alt': 'SGPT/ALT',
  'sgpt (alt)': 'SGPT/ALT',
  'serum glutamic pyruvic transaminase': 'SGPT/ALT',

  sgot: 'SGOT/AST',
  ast: 'SGOT/AST',
  'sgot/ast': 'SGOT/AST',
  'sgot (ast)': 'SGOT/AST',
  'serum glutamic oxaloacetic transaminase': 'SGOT/AST',

  'total bilirubin': 'Total Bilirubin',
  's. bilirubin': 'Total Bilirubin',
  'serum bilirubin': 'Total Bilirubin',

  // Hematology
  hemoglobin: 'Hemoglobin',
  hb: 'Hemoglobin',
  hgb: 'Hemoglobin',

  wbc: 'WBC Count',
  'wbc count': 'WBC Count',
  'total leukocyte count': 'WBC Count',
  tlc: 'WBC Count',
  leukocytes: 'WBC Count',

  platelets: 'Platelet Count',
  'platelet count': 'Platelet Count',
  plt: 'Platelet Count',
};

/**
 * Multilingual native script dictionary (Tamil & Hindi).
 */
const NATIVE_SCRIPT_LAB_MAP: Record<string, { canonical: string; language: 'ta' | 'hi' }> = {
  // Tamil
  'ஹூமோகுளோபின்': { canonical: 'Hemoglobin', language: 'ta' },
  'இரத்த சர்க்கரை': { canonical: 'Fasting Glucose', language: 'ta' },
  'கிளிகேட்டட் ஹீமோகுளோபின்': { canonical: 'HbA1c', language: 'ta' },
  'கொலஸ்ட்ரால்': { canonical: 'Total Cholesterol', language: 'ta' },

  // Hindi
  'हीमोग्लोबिन': { canonical: 'Hemoglobin', language: 'hi' },
  'ग्लूकोज': { canonical: 'Fasting Glucose', language: 'hi' },
  'ब्लड शुगर': { canonical: 'Fasting Glucose', language: 'hi' },
  'कोलेस्ट्रॉल': { canonical: 'Total Cholesterol', language: 'hi' },
};

/**
 * Normalizes lab test name conservatively.
 */
export function normalizeTestName(rawInput: string): TestNormalizationResult {
  const cleanInput = rawInput.trim();
  const lowerInput = cleanInput.toLowerCase().replace(/\s+/g, ' ');

  // 1. Truncated stem or ambiguous OCR artifact check (e.g., "1.2?", "Hb...", "Lab...")
  if (cleanInput.endsWith('...') || cleanInput.includes('?') || cleanInput.length <= 2) {
    return {
      canonicalTestName: cleanInput,
      rawTestName: cleanInput,
      isUncertain: true,
      needsReview: true,
      confidence: 0.4,
      uncertaintyReason: `Test name contains ambiguous characters or trailing truncation ('${cleanInput}')`,
    };
  }

  // 2. Multilingual native script matching
  for (const [nativeText, mapping] of Object.entries(NATIVE_SCRIPT_LAB_MAP)) {
    if (cleanInput.includes(nativeText) || lowerInput.includes(nativeText.toLowerCase())) {
      return {
        canonicalTestName: mapping.canonical,
        rawTestName: cleanInput,
        testNameNative: nativeText,
        isUncertain: false,
        needsReview: false,
        confidence: 0.95,
      };
    }
  }

  // 3. Exact or clean match in canonical dictionary
  if (CANONICAL_LAB_DICTIONARY[lowerInput]) {
    return {
      canonicalTestName: CANONICAL_LAB_DICTIONARY[lowerInput],
      rawTestName: cleanInput,
      isUncertain: false,
      needsReview: false,
      confidence: 0.98,
    };
  }

  // 4. Partial dictionary lookup for compound names (e.g. "HbA1c (Glycated Hb)")
  for (const [key, canonical] of Object.entries(CANONICAL_LAB_DICTIONARY)) {
    if (key.length > 3 && lowerInput.includes(key)) {
      return {
        canonicalTestName: canonical,
        rawTestName: cleanInput,
        isUncertain: false,
        needsReview: false,
        confidence: 0.90,
      };
    }
  }

  // 5. Preserved fallback for unmapped but legible lab test names
  return {
    canonicalTestName: cleanInput,
    rawTestName: cleanInput,
    isUncertain: false,
    needsReview: false,
    confidence: 0.85,
  };
}
