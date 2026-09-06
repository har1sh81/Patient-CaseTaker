/**
 * Phase 5 — Question Fingerprinting & Semantic Similarity
 * MediKiosk Clinical Architecture
 * 
 * Generates lightweight normalized fingerprints of questions to detect
 * exact duplicates, semantic paraphrases, and conversational cycles.
 */

const FILLER_PHRASES: RegExp[] = [
  /^\s*(can|could|would)\s+(you\s+)?(please\s+)?(tell\s+me|describe|explain|share)\s+/i,
  /^\s*(do|are)\s+you\s+(know|have|feel|experience)\s+/i,
  /^\s*please\s+(tell\s+me|describe|explain)\s+/i,
  /^\s*is\s+there\s+any\s+/i,
  /^\s*how\s+about\s+/i,
  /\bwhere\s+exactly\b/i,
  /\bwhere\s+in\s+your\s+(abdomen|stomach|body)\b/i,
];

const SYNONYM_MAP: Array<[RegExp, string]> = [
  [/\b(stomach|belly|abdomen|abdominal)\b/g, 'abdomen'],
  [/\b(pain|ache|hurts?|discomfort|soreness)\b/g, 'pain'],
  [/\b(where|location|located|site|place)\b/g, 'location'],
  [/\b(when|start|started|begin|began|duration|since|long)\b/g, 'onset'],
  [/\b(severe|severity|intense|intensity|bad|scale)\b/g, 'severity'],
  [/\b(fever|temperature|chills|feverish)\b/g, 'fever'],
  [/\b(vomit|vomiting|puking|throw\s+up)\b/g, 'vomiting'],
  [/\b(urinate|urinating|urine|pee|dysuria)\b/g, 'urination'],
];

export function getQuestionFingerprint(questionText: string): string {
  if (!questionText || typeof questionText !== 'string') return '';

  let normalized = questionText.toLowerCase();

  // 1. Strip punctuation & special characters
  normalized = normalized.replace(/[?.!,"':;`~@#$%^&*()_+\-=[\]{}|\\/<>]/g, ' ');

  // 2. Strip conversational filler prefixes
  for (const filler of FILLER_PHRASES) {
    normalized = normalized.replace(filler, ' ');
  }

  // 3. Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // 4. Map clinical synonyms
  for (const [regex, replacement] of SYNONYM_MAP) {
    normalized = normalized.replace(regex, replacement);
  }

  // Sort remaining meaningful words alphabetically for position-invariant matching
  const words = normalized.split(' ').filter(w => w.length > 2);
  words.sort();

  return words.join(' ');
}

export function areQuestionsSemanticallySimilar(q1: string, q2: string): boolean {
  if (!q1 || !q2) return false;

  const fp1 = getQuestionFingerprint(q1);
  const fp2 = getQuestionFingerprint(q2);

  if (fp1 === fp2 && fp1.length > 0) return true;

  // Key clinical intent check (if both questions share core clinical target e.g. location + pain)
  const coreIntents = ['location', 'onset', 'severity', 'fever', 'vomiting', 'urination'];
  for (const intent of coreIntents) {
    if (fp1.includes(intent) && fp2.includes(intent)) {
      // Check overlap of non-intent words
      const words1 = new Set(fp1.split(' '));
      const words2 = new Set(fp2.split(' '));
      const intersection = [...words1].filter(w => words2.has(w));
      if (intersection.length >= 2) return true;
    }
  }

  return false;
}
