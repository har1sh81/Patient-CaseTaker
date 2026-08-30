/**
 * Enhanced Local Clinical Rule-Based Lexicon & Context Parser
 * 
 * CLASSIFICATION: Enhanced Rule-Based & Contextual Pattern NLP Engine.
 * 
 * Capabilities:
 * - Multilingual Entity Extraction (EN, HI, TA) for symptoms, medications, severity, duration, body locations
 * - Temporal Context Disambiguation (`current` | `historical` | `resolved`)
 * - Medication Status Tracking (`active` | `stopped` | `discontinued`)
 * - Context Window Negation Detection (Preceding & Succeeding Negation Scopes)
 */

export interface ExtractedClinicalFact {
  entityType: 'symptom' | 'duration' | 'severity' | 'location' | 'medication' | 'allergy' | 'condition' | 'procedure';
  rawText: string;
  normalizedValue: string;
  status: 'active' | 'negated' | 'historical' | 'resolved' | 'stopped';
  negated: boolean;
  temporalContext: 'current' | 'historical' | 'resolved';
  confidence: number;
  language: 'en' | 'hi' | 'ta';
}

export interface LocalNLPResult {
  facts: ExtractedClinicalFact[];
  primarySymptom?: string;
  duration?: string;
  severity?: string;
  painScore?: number;
  location?: string;
  character?: string;
  progression?: string;
  aggravatingFactors?: string;
  relievingFactors?: string;
  associatedSymptoms?: string;
  previousTreatments?: string;
  negatedSymptoms: string[];
  activeSymptoms: string[];
  historicalConditions: string[];
  stoppedMedications: string[];
  activeMedications: string[];
}

const NEGATION_PATTERNS = {
  en: /\b(no|not|don't|haven't|without|never|absent|free of|denies|stopped)\b/i,
  hi: /(नहीं|ना|मत|बिना|रहित|बंद)/,
  ta: /(இல்லை|இல்லாமல்|அல்ல|நிறுத்தப்பட்டது)/,
};

const TEMPORAL_HISTORICAL_PATTERNS = {
  en: /\b(last year|years ago|in the past|used to|had|previously|childhood|former)\b/i,
  hi: /(पिछले साल|पहले|अतीत में|बचपन में)/,
  ta: /(கடந்த ஆண்டு|முன்பு|கடந்த காலத்தில்)/,
};

const MEDICATION_STOPPED_PATTERNS = {
  en: /\b(stopped|discontinued|quit|off)\b/i,
  hi: /(बंद कर दिया|छोड़ दिया)/,
  ta: /(நிறுத்திவிட்டேன்|நிறுத்தப்பட்டது)/,
};

const SYMPTOM_LEXICON = {
  en: [
    { name: 'Fever', keywords: ['fever', 'temperature', 'pyrexia', 'chills'] },
    { name: 'Chest Pain', keywords: ['chest pain', 'angina', 'chest tightness', 'chest pressure'] },
    { name: 'Stomach Pain', keywords: ['stomach pain', 'abdominal pain', 'belly ache', 'stomach ache', 'epigastric pain', 'cramps'] },
    { name: 'Headache', keywords: ['headache', 'migraine', 'head pain'] },
    { name: 'Shortness of Breath', keywords: ['shortness of breath', 'breathlessness', 'dyspnea', 'breathing issue'] },
    { name: 'Vomiting', keywords: ['vomiting', 'throwing up', 'emesis'] },
    { name: 'Nausea', keywords: ['nausea', 'sick feeling', 'queasy'] },
    { name: 'Cough', keywords: ['cough', 'coughing', 'phlegm'] },
    { name: 'Dizziness', keywords: ['dizziness', 'giddiness', 'vertigo', 'lightheaded'] },
  ],
  hi: [
    { name: 'Fever', keywords: ['बुखार', 'तापमान', 'ठंड'] },
    { name: 'Chest Pain', keywords: ['सीने में दर्द', 'छाती में दर्द'] },
    { name: 'Stomach Pain', keywords: ['पेट में दर्द', 'पेट दर्द', 'मरोड़'] },
    { name: 'Headache', keywords: ['सिरदर्द', 'सिर में दर्द'] },
    { name: 'Vomiting', keywords: ['उल्टी'] },
    { name: 'Nausea', keywords: ['जी मिचलाना'] },
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

const MEDICATION_LEXICON = [
  { name: 'Amlodipine', keywords: ['amlodipine', 'norvasc'] },
  { name: 'Metformin', keywords: ['metformin', 'glucophage'] },
  { name: 'Paracetamol', keywords: ['paracetamol', 'acetaminophen', 'crocin', 'dolo'] },
  { name: 'Aspirin', keywords: ['aspirin', 'ecosprin'] },
  { name: 'Atorvastatin', keywords: ['atorvastatin', 'lipitor'] },
];

const DURATION_PATTERNS = [
  /(\d+)\s*(days?|day|gün|दिन|दिनों|நாட்கள்|நாள்)/i,
  /(\d+)\s*(weeks?|week|हफ़्ते|सप्ताह|வாரங்கள்|வாரம்)/i,
  /(\d+)\s*(months?|month|महीने|माह|மாதங்கள்|மாதம்)/i,
  /(\d+)\s*(years?|year|साल|वर्ष|ஆண்டுகள்|வருடம்)/i,
];

const LOCATION_PATTERNS = [
  /upper stomach|epigastric|lower abdomen|chest|head|back|left arm|throat|right side|left side|stomach|belly/i,
  /सीने|पेट|सिर|गर्दन|पीठ/i,
  /மார்பு|வயிறு|தலை|கழுத்து|முதுகு/i,
];

const CHARACTER_PATTERNS = [
  /burning|sharp|dull|throbbing|cramping|stabbing|pressure|tightness|aching|squeezing/i,
  /जलन|तेज|मीठा|धड़कने वाला|मरोड़|दबाव/i,
  /எரிச்சல்|கடுமையான|மந்தமான|துடிக்கும்|பிடிப்பு/i,
];

const PROGRESSION_PATTERNS = [
  /getting worse|worsening|getting better|improving|staying the same|constant|intermittent|comes and goes/i,
  /बढ़ रहा|सुधार|वैसा ही|लगातार|आता जाता/i,
  /மோசமாகிறது|குணமாகிறது|மாற்றமில்லை|தொடர்ச்சியான/i,
];

const AGGRAVATING_PATTERNS = [
  /after eating|after meals|with food|when bending|with movement|on exertion|when walking|after lying down/i,
  /खाने के बाद|भोजन के बाद|चलने पर/i,
  /சாப்பிட்ட பிறகு|உணவுக்கு பின்/i,
];

const RELIEVING_PATTERNS = [
  /antacids|with rest|after resting|taking medicine|drinking water|lying down/i,
  /एंटासिड|आराम करने पर/i,
  /ஓய்வெடுத்த பிறகு/i,
];

const PREVIOUS_TREATMENT_PATTERNS = [
  /took paracetamol|took antacid|home remedy|tried painkillers|visited clinic|consulted doctor/i,
  /दवा ली|पेरासिटामोल ली/i,
  /மருந்து எடுத்தேன்/i,
];

export class LocalClinicalNLP {
  public static extractFacts(text: string, language: 'en' | 'hi' | 'ta' = 'en'): LocalNLPResult {
    const cleanInput = text.replace(/<[^>]*>/g, '').trim();
    const lowerText = cleanInput.toLowerCase();
    const facts: ExtractedClinicalFact[] = [];
    const activeSymptoms: string[] = [];
    const negatedSymptoms: string[] = [];
    const historicalConditions: string[] = [];
    const activeMedications: string[] = [];
    const stoppedMedications: string[] = [];

    // 1. Extract Symptoms & Temporal Context
    const lexicons = SYMPTOM_LEXICON[language] || SYMPTOM_LEXICON.en;
    lexicons.forEach(entry => {
      for (const kw of entry.keywords) {
        const idx = lowerText.indexOf(kw.toLowerCase());
        if (idx !== -1) {
          const window25 = lowerText.substring(Math.max(0, idx - 25), Math.min(lowerText.length, idx + kw.length + 20));
          
          const isNegated = NEGATION_PATTERNS[language]?.test(window25) || NEGATION_PATTERNS.en.test(window25);
          const isHistorical = TEMPORAL_HISTORICAL_PATTERNS[language]?.test(window25) || TEMPORAL_HISTORICAL_PATTERNS.en.test(window25);
          const isResolved = lowerText.includes('gone') || lowerText.includes('stopped') || lowerText.includes('cured');

          let temporalContext: 'current' | 'historical' | 'resolved' = 'current';
          let status: 'active' | 'negated' | 'historical' | 'resolved' | 'stopped' = 'active';

          if (isNegated) {
            status = 'negated';
            negatedSymptoms.push(entry.name);
          } else if (isHistorical || isResolved) {
            temporalContext = isHistorical ? 'historical' : 'resolved';
            status = isHistorical ? 'historical' : 'resolved';
            historicalConditions.push(entry.name);
          } else {
            activeSymptoms.push(entry.name);
          }

          facts.push({
            entityType: 'symptom',
            rawText: kw,
            normalizedValue: entry.name,
            status,
            negated: isNegated,
            temporalContext,
            confidence: 0.94,
            language,
          });
          break;
        }
      }
    });

    // 2. Extract Medications & Status
    MEDICATION_LEXICON.forEach(med => {
      for (const kw of med.keywords) {
        const idx = lowerText.indexOf(kw.toLowerCase());
        if (idx !== -1) {
          const window30 = lowerText.substring(Math.max(0, idx - 30), Math.min(lowerText.length, idx + kw.length + 25));
          const isStopped = MEDICATION_STOPPED_PATTERNS[language]?.test(window30) || MEDICATION_STOPPED_PATTERNS.en.test(window30);
          
          if (isStopped) {
            stoppedMedications.push(med.name);
          } else {
            activeMedications.push(med.name);
          }

          facts.push({
            entityType: 'medication',
            rawText: kw,
            normalizedValue: med.name,
            status: isStopped ? 'stopped' : 'active',
            negated: isStopped,
            temporalContext: isStopped ? 'historical' : 'current',
            confidence: 0.95,
            language,
          });
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
          status: 'active',
          negated: false,
          temporalContext: 'current',
          confidence: 0.95,
          language,
        });
        break;
      }
    }

    // 4. Extract Severity & Pain Score (1-10)
    let severity: string | undefined;
    let painScore: number | undefined;
    const numericMatch = text.match(/(\d{1,2})\s*(?:\/|\s*out of\s*)\s*10|scale\s*(?:of\s*)?(\d{1,2})|score\s*(\d{1,2})/i);
    if (numericMatch) {
      const valStr = numericMatch[1] || numericMatch[2] || numericMatch[3];
      const parsed = parseInt(valStr, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
        painScore = parsed;
        severity = `${parsed}/10`;
      }
    }
    if (!severity) {
      const severityMatch = text.match(/severe|mild|moderate|गंभीर|हल्का|கடுமையான/i);
      if (severityMatch) {
        severity = severityMatch[0];
      }
    }
    if (severity) {
      facts.push({
        entityType: 'severity',
        rawText: severity,
        normalizedValue: severity,
        status: 'active',
        negated: false,
        temporalContext: 'current',
        confidence: 0.92,
        language,
      });
    }

    // 5. Extract Location
    let location: string | undefined;
    for (const pat of LOCATION_PATTERNS) {
      const match = text.match(pat);
      if (match) {
        location = match[0];
        facts.push({
          entityType: 'location',
          rawText: match[0],
          normalizedValue: match[0],
          status: 'active',
          negated: false,
          temporalContext: 'current',
          confidence: 0.90,
          language,
        });
        break;
      }
    }

    // 6. Extract Character
    let character: string | undefined;
    for (const pat of CHARACTER_PATTERNS) {
      const match = text.match(pat);
      if (match) {
        character = match[0];
        break;
      }
    }

    // 7. Extract Progression
    let progression: string | undefined;
    for (const pat of PROGRESSION_PATTERNS) {
      const match = text.match(pat);
      if (match) {
        progression = match[0];
        break;
      }
    }

    // 8. Extract Aggravating & Relieving Factors
    let aggravatingFactors: string | undefined;
    for (const pat of AGGRAVATING_PATTERNS) {
      const match = text.match(pat);
      if (match) {
        aggravatingFactors = match[0];
        break;
      }
    }

    let relievingFactors: string | undefined;
    for (const pat of RELIEVING_PATTERNS) {
      const match = text.match(pat);
      if (match) {
        relievingFactors = match[0];
        break;
      }
    }

    // 9. Extract Previous Treatments
    let previousTreatments: string | undefined;
    for (const pat of PREVIOUS_TREATMENT_PATTERNS) {
      const match = text.match(pat);
      if (match) {
        previousTreatments = match[0];
        break;
      }
    }

    return {
      facts,
      primarySymptom: activeSymptoms[0],
      duration,
      severity,
      painScore,
      location,
      character,
      progression,
      aggravatingFactors,
      relievingFactors,
      previousTreatments,
      negatedSymptoms,
      activeSymptoms,
      historicalConditions,
      activeMedications,
      stoppedMedications,
    };
  }
}
