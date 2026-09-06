/**
 * Task #22 — Medication Normalization Dictionary & Utilities
 * MediKiosk Clinical Engine
 */

export interface NormalizedFrequency {
  original: string;
  normalized: string;
}

export const FREQUENCY_DICTIONARY: Record<string, string> = {
  od: 'once daily',
  bd: 'twice daily',
  tds: 'three times daily',
  tid: 'three times daily',
  qid: 'four times daily',
  hs: 'at bedtime',
  sos: 'as needed',
  ac: 'before meals',
  pc: 'after meals',
  stat: 'immediately',
  '1-0-1': 'twice daily',
  '1-0-0': 'once daily',
  '0-0-1': 'once daily (night)',
  '0-1-0': 'once daily (afternoon)',
  '1-1-1': 'three times daily',
  // Tamil mappings
  'காலை / இரவு': 'twice daily',
  'உணவுக்கு பின்': 'after meals',
  'உணவுக்கு முன்': 'before meals',
  // Hindi mappings
  'दिन में दो बार': 'twice daily',
  'भोजन के बाद': 'after meals',
};

/**
 * Normalizes prescription frequency abbreviations transparently.
 */
export function normalizeFrequency(rawFrequency?: string): NormalizedFrequency | undefined {
  if (!rawFrequency) return undefined;
  const clean = rawFrequency.trim();
  const lower = clean.toLowerCase();

  for (const [key, val] of Object.entries(FREQUENCY_DICTIONARY)) {
    if (lower === key || lower.includes(key)) {
      return {
        original: clean,
        normalized: val,
      };
    }
  }

  return {
    original: clean,
    normalized: clean,
  };
}

/**
 * Conservative medication name normalizer.
 * Returns raw name + normalized name + uncertainty flag.
 * Refuses to guess truncated/ambiguous names like "Metf..." or "Amox...".
 */
export function normalizeMedicationName(rawName: string): {
  normalizedName: string;
  isUncertain: boolean;
  needsReview: boolean;
  uncertaintyReason?: string;
} {
  const clean = rawName.trim();

  // 1. Detect truncated or ambiguous drug names ending in dots or fewer than 4 chars
  if (clean.endsWith('...') || clean.endsWith('..') || clean.endsWith('.')) {
    const base = clean.replace(/\.+$/, '').trim();
    if (base.length <= 5) {
      return {
        normalizedName: clean,
        isUncertain: true,
        needsReview: true,
        uncertaintyReason: `Truncated or ambiguous drug abbreviation '${clean}'. Requires clinician review.`,
      };
    }
  }

  const lower = clean.toLowerCase();

  // Conservative mappings
  if (lower === 'metformin sr' || lower === 'metformin sustained release') {
    return { normalizedName: 'Metformin SR', isUncertain: false, needsReview: false };
  }
  if (lower === 'metformin er' || lower === 'metformin extended release') {
    return { normalizedName: 'Metformin ER', isUncertain: false, needsReview: false };
  }
  if (lower === 'paracetamol' || lower === 'pcm') {
    return { normalizedName: 'Paracetamol', isUncertain: false, needsReview: false };
  }
  if (lower === 'telmisartan') {
    return { normalizedName: 'Telmisartan', isUncertain: false, needsReview: false };
  }
  if (lower === 'atorvastatin') {
    return { normalizedName: 'Atorvastatin', isUncertain: false, needsReview: false };
  }
  if (lower === 'amlodipine') {
    return { normalizedName: 'Amlodipine', isUncertain: false, needsReview: false };
  }

  return {
    normalizedName: clean,
    isUncertain: false,
    needsReview: false,
  };
}

/**
 * Route normalization (oral, IV, IM, SC, topical, inhaled).
 * Returns undefined if no explicit route is documented.
 */
export function normalizeRoute(rawText: string): string | undefined {
  const lower = rawText.toLowerCase();
  if (lower.includes('po') || lower.includes('oral') || lower.includes('orally') || lower.includes('by mouth')) {
    return 'oral';
  }
  if (lower.includes('iv') || lower.includes('intravenous')) {
    return 'intravenous';
  }
  if (lower.includes('im') || lower.includes('intramuscular')) {
    return 'intramuscular';
  }
  if (lower.includes('sc') || lower.includes('subcutaneous')) {
    return 'subcutaneous';
  }
  if (lower.includes('topical') || lower.includes('cream') || lower.includes('ointment')) {
    return 'topical';
  }
  if (lower.includes('inhaled') || lower.includes('inhaler')) {
    return 'inhaled';
  }
  return undefined;
}

/**
 * Dosage form recognition (tablet, capsule, syrup, injection, cream, ointment, drops, inhaler).
 */
export function recognizeDosageForm(rawText: string): string | undefined {
  const lower = rawText.toLowerCase();
  if (lower.includes('tab.') || lower.includes('tab ') || lower.includes('tablet') || lower.includes('மாத்திரை') || lower.includes('गोली')) {
    return 'tablet';
  }
  if (lower.includes('cap.') || lower.includes('cap ') || lower.includes('capsule')) {
    return 'capsule';
  }
  if (lower.includes('syr.') || lower.includes('syr ') || lower.includes('syrup')) {
    return 'syrup';
  }
  if (lower.includes('inj.') || lower.includes('inj ') || lower.includes('injection')) {
    return 'injection';
  }
  if (lower.includes('cream') || lower.includes('ointment')) {
    return 'topical';
  }
  if (lower.includes('drops')) {
    return 'drops';
  }
  if (lower.includes('inhaler')) {
    return 'inhaler';
  }
  return undefined;
}
