/**
 * Local Clinical NLP Engine
 * Supports English, Hindi, and Tamil entity extraction, negation detection, and temporal parsing.
 * 100% Provider-Independent & Cloud-Free.
 */

export interface ExtractedClinicalFact {
  entityType: 'symptom' | 'duration' | 'severity' | 'location' | 'medication' | 'allergy' | 'condition';
  rawText: string;
  normalizedValue: string;
  negated: boolean;
  confidence: number;
  language: 'en' | 'hi' | 'ta';
}

export interface LocalNLPResult {
  facts: ExtractedClinicalFact[];
  primarySymptom?: string;
  duration?: string;
  severity?: string;
  location?: string;
  negatedSymptoms: string[];
  activeSymptoms: string[];
}

const NEGATION_PATTERNS = {
  en: /\b(no|not|denies|without|never|absent|free of)\b/i,
  hi: /(नहीं|ना|मत|बिना|रहित)/,
  ta: /(இல்லை|இல்லாமல்|அல்ல)/,
};

const SYMPTOM_LEXICON = {
  en: [
    { name: 'Fever', keywords: ['fever', 'temperature', 'pyrexia', 'chills'] },
    { name: 'Chest Pain', keywords: ['chest pain', 'angina', 'chest tightness', 'chest pressure'] },
    { name: 'Stomach Pain', keywords: ['stomach pain', 'abdominal pain', 'belly ache', 'stomach ache', 'cramps'] },
    { name: 'Headache', keywords: ['headache', 'migraine', 'head pain'] },
    { name: 'Shortness of Breath', keywords: ['shortness of breath', 'breathlessness', 'dyspnea', 'breathing issue'] },
    { name: 'Vomiting', keywords: ['vomiting', 'nausea', 'throwing up', 'emesis'] },
    { name: 'Cough', keywords: ['cough', 'coughing', 'phlegm'] },
    { name: 'Dizziness', keywords: ['dizziness', 'giddiness', 'vertigo', 'lightheaded'] },
  ],
  hi: [
    { name: 'Fever', keywords: ['बुखार', 'तापमान', 'ठंड'] },
    { name: 'Chest Pain', keywords: ['सीने में दर्द', 'छाती में दर्द'] },
    { name: 'Stomach Pain', keywords: ['पेट में दर्द', 'पेट दर्द', 'मरोड़'] },
    { name: 'Headache', keywords: ['सिरदर्द', 'सिर में दर्द'] },
    { name: 'Vomiting', keywords: ['उल्टी', 'जी मिचलाना'] },
    { name: 'Cough', keywords: ['खांसी', 'कफ'] },
  ],
  ta: [
    { name: 'Fever', keywords: ['காய்ச்சல்', 'ஜூரம்'] },
    { name: 'Chest Pain', keywords: ['நெஞ்சு வலி', 'மார்பு வலி'] },
    { name: 'Stomach Pain', keywords: ['வயிறு வலி', 'வயற்று வலி'] },
    { name: 'Headache', keywords: ['தலைவலி'] },
    { name: 'Vomiting', keywords: ['வாந்தி'] },
    { name: 'Cough', keywords: ['இருமல்'] },
  ],
};

const DURATION_PATTERNS = [
  /(\d+)\s*(days?|day|gün|दिन|दिनों|நாட்கள்|நாள்)/i,
  /(\d+)\s*(weeks?|week|हफ़्ते|सप्ताह|வாரங்கள்|வாரம்)/i,
  /(\d+)\s*(months?|month|महीने|माह|மாதங்கள்|மாதம்)/i,
  /(\d+)\s*(years?|year|साल|वर्ष|ஆண்டுகள்|வருடம்)/i,
];

export class LocalClinicalNLP {
  public static extractFacts(text: string, language: 'en' | 'hi' | 'ta' = 'en'): LocalNLPResult {
    const lowerText = text.toLowerCase();
    const facts: ExtractedClinicalFact[] = [];
    const activeSymptoms: string[] = [];
    const negatedSymptoms: string[] = [];

    // 1. Detect Negation Context
    const isGloballyNegated = NEGATION_PATTERNS[language]?.test(text) || NEGATION_PATTERNS.en.test(text);

    // 2. Extract Symptoms
    const lexicons = SYMPTOM_LEXICON[language] || SYMPTOM_LEXICON.en;
    lexicons.forEach(entry => {
      for (const kw of entry.keywords) {
        const idx = lowerText.indexOf(kw.toLowerCase());
        if (idx !== -1) {
          // Window check for preceding negation (within 25 chars)
          const precedingSnippet = lowerText.substring(Math.max(0, idx - 25), idx);
          const isLocallyNegated = NEGATION_PATTERNS[language]?.test(precedingSnippet) || NEGATION_PATTERNS.en.test(precedingSnippet);
          const negated = isLocallyNegated || (isGloballyNegated && lowerText.includes('no ' + kw));

          facts.push({
            entityType: 'symptom',
            rawText: kw,
            normalizedValue: entry.name,
            negated,
            confidence: 0.92,
            language,
          });

          if (negated) {
            negatedSymptoms.push(entry.name);
          } else {
            activeSymptoms.push(entry.name);
          }
          break;
        }
      }
    });

    // 3. Extract Duration
    let duration: string | undefined;
    for (const pat of DURATION_PATTERNS) {
      const match = text.match(pat);
      if (match) {
        duration = match[0];
        facts.push({
          entityType: 'duration',
          rawText: match[0],
          normalizedValue: match[0],
          negated: false,
          confidence: 0.95,
          language,
        });
        break;
      }
    }

    // 4. Extract Severity
    let severity: string | undefined;
    const severityMatch = text.match(/(\d+)\s*\/\s*10|severe|mild|moderate|गंभीर|हल्का|கடுமையான/i);
    if (severityMatch) {
      severity = severityMatch[0];
      facts.push({
        entityType: 'severity',
        rawText: severityMatch[0],
        normalizedValue: severityMatch[0],
        negated: false,
        confidence: 0.90,
        language,
      });
    }

    return {
      facts,
      primarySymptom: activeSymptoms[0],
      duration,
      severity,
      negatedSymptoms,
      activeSymptoms,
    };
  }
}
