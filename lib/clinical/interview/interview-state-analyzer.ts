/**
 * Phase 4 — Conversational State Analyzer & Reasoner
 * MediKiosk Clinical Architecture
 * 
 * Inspects evolving patient answers to detect:
 * 1. Newly introduced symptoms
 * 2. Explicitly negative (denied) symptoms
 * 3. Ambiguous statements requiring clarification
 * 4. Topic reprioritization & active topic tracking
 * 5. Resolution of unresolved topics
 */import type { InterviewState } from './types';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { translatePatientText } from '@/lib/translation/indictrans-client';

const COMMON_SYMPTOM_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'dysuria / painful urination', regex: /\b(pain|burning|hurts?)\s+when\s+(i\s+)?urinat(e|ing)|painful\s+urination|burning\s+urination|சிறுநீர்\s*கழிக்கும்\s*போது\s*வலி|எரிச்சல்|पेशाब\s*में\s*जलन|पेशाब\s*करते\s*समय\s*दर्द\b/i },
  { name: 'fever', regex: /\b(fever|chills|high\s+temp(erature)?|feverish|காய்ச்சல்|ஜுரம்|சுரம்|बुखार|तापमान)\b/i },
  { name: 'dizziness', regex: /\b(dizz(y|iness)|lightheaded(ness)?|giddy|தலைசுற்றல்|மயக்கம்|चक्कर|चक्कर\s*आना)\b/i },
  { name: 'nausea', regex: /\b(nausea|nauseous|sick\s+to\s+stomach|குமட்டல்|जी\s*मिचलाना|उबकाई)\b/i },
  { name: 'vomiting', regex: /\b(vomit(ing)?|throw(ing)?\s+up|puking|வாந்தி|उल्टी|वमन)\b/i },
  { name: 'stomach pain', regex: /\b(stomach|abdominal|belly)\s+(pain|ache|cramps?)|cramping|வயிற்று\s*வலி|வயிறு\s*வலி|வயிற்று வலி|पेट\s*दर्द|पेट\s*में\s*दर्द\b/i },
  { name: 'chest pain', regex: /\bchest\s+(pain|pressure|tightness|heaviness)|நெஞ்சு\s*வலி|மார்பு\s*வலி|छाती\s*में\s*दर्द|सीने\s*में\s*दर्द\b/i },
  { name: 'shortness of breath', regex: /\b(short(ness)?\s+of\s+breath|breathless(ness)?|difficulty\s+breathing)|மூச்சுத்திணறல்|மூச்சு\s*திணறல்|सांस\s*फूलना|सांस\s*लेने\s*में\s*तकलीफ\b/i },
  { name: 'fatigue', regex: /\b(tired|fatigue|exhausted|unusually\s+tired|weakness|சோர்வு|பலவீனம்|थकान|कमजोरी)\b/i },
  { name: 'headache', regex: /\b(headache|head\s+pain|தலைவலி|தலையிடி|सिरदर्द|सिर\s*में\s*दर्द)\b/i },
  { name: 'cough', regex: /\b(cough|coughing|இருமல்|खांसी|खांसना)\b/i },
  { name: 'sore throat', regex: /\b(sore\s+throat|தொண்டை\s*வலி|गले\s*में\s*खराश)\b/i },
];

const NEGATION_PATTERNS: RegExp[] = [
  /\bno\s+([a-z\s]+)/i,
  /\bdon'?t\s+have\s+([a-z\s]+)/i,
  /\bwithout\s+([a-z\s]+)/i,
  /\bnever\s+had\s+([a-z\s]+)/i,
  /\bden(y|ies)\s+([a-z\s]+)/i,
  /\bnot\s+(having|feeling|experiencing)\s+([a-z\s]+)/i,
  /(இல்லை|கிடையாது|வரவில்லை|வாந்தி\s*இல்லை|காய்ச்சல்\s*இல்லை)/i,
  /(नहीं|नहीं\s*है|उल्टी\s*नहीं|बुखार\s*नहीं)/i,
];

const AMBIGUITY_PATTERNS: RegExp[] = [
  /\b(a\s+lot|sometimes|kind\s+of|sort\s+of|on\s+and\s+off|frequently|bad|terrible|a\s+while\s+ago|a\long\s+time\s+ago|maybe|not\s+sure)\b/i,
  /(கொஞ்சம்|சில\s*நேரங்களில்|தெரியாது|थोड़ा|कभी-कभी|शायद)/i
];

export async function analyzeAndUpdateInterviewState(
  state: InterviewState
): Promise<InterviewState> {
  let updatedState = { ...state };
  const lastAnswer = (state.lastAnswer || '').trim();

  if (!lastAnswer) {
    return updatedState;
  }

  // Optional IndicTrans2 translation for normalized English analysis if source language is non-English
  let englishNormalizedAnswer = lastAnswer;
  if (state.language && state.language !== 'en') {
    try {
      const transRes = await translatePatientText({
        patientText: lastAnswer,
        sourceLanguage: state.language,
        targetLanguage: 'eng_Latn',
      });
      if (transRes.success && transRes.translatedText) {
        englishNormalizedAnswer = transRes.translatedText;
      }
    } catch (_err) {
      // Graceful fallback to original text if translation service unavailable
    }
  }

  // 1. Heuristic Rule-Based Analysis (Combines native text + normalized English text)
  const combinedText = `${lastAnswer} ${englishNormalizedAnswer}`;
  const ruleResults = analyzeAnswerHeuristically(combinedText, updatedState);
  updatedState = mergeAnalysisResults(updatedState, ruleResults);

  // 2. LLM Analysis for Rich Context Reasoning (if key available and not in test mode unless specified)
  const apiKey = process.env.INTERVIEW_LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
  const modelName = process.env.INTERVIEW_LLM_MODEL || process.env.GEMINI_MODEL || 'gemini-3.6-flash';

  if (apiKey && process.env.NODE_ENV !== 'test') {
    try {
      const llmResults = await analyzeAnswerWithLLM(combinedText, updatedState, apiKey, modelName);
      if (llmResults) {
        updatedState = mergeAnalysisResults(updatedState, llmResults);
      }
    } catch (_err) {
      // Rule analysis already completed as baseline
    }
  }

  return updatedState;
}

interface AnalysisResults {
  newSymptoms: string[];
  explicitNegatives: string[];
  isAmbiguous: boolean;
  ambiguityDetail?: string;
  activeTopic?: string;
  resolvedTopics: string[];
  unresolvedTopics: string[];
}

function analyzeAnswerHeuristically(answer: string, state: InterviewState): AnalysisResults {
  const lowerAnswer = answer.toLowerCase();
  const knownSymptoms = new Set(state.knownSymptoms || []);
  const explicitNegatives = new Set(state.explicitNegatives || []);
  
  const newSymptomsFound: string[] = [];
  const negativesFound: string[] = [];

  // Check negations
  for (const pattern of NEGATION_PATTERNS) {
    const match = lowerAnswer.match(pattern);
    if (match) {
      const target = match[1] || match[0];
      const countBefore = negativesFound.length;
      if (target.includes('vomit') || target.includes('வாந்தி') || target.includes('उल्टी')) negativesFound.push('vomiting');
      if (target.includes('fever') || target.includes('காய்ச்சல்') || target.includes('बुखार')) negativesFound.push('fever');
      if (target.includes('nausea') || target.includes('குமட்டல்') || target.includes('मिचलाना')) negativesFound.push('nausea');
      if (target.includes('dizz') || target.includes('தலைசுற்றல்') || target.includes('चक्कर')) negativesFound.push('dizziness');
      if (target.includes('cough') || target.includes('இருமல்') || target.includes('खांसी')) negativesFound.push('cough');
      if (target.includes('breath') || target.includes('மூச்சு') || target.includes('सांस')) negativesFound.push('shortness of breath');
      if (target.includes('diarrhea') || target.includes('பேதி') || target.includes('दस्त')) negativesFound.push('diarrhea');
      if (negativesFound.length === countBefore) negativesFound.push(target.trim());
    }
  }

  // Check new symptoms
  for (const sym of COMMON_SYMPTOM_PATTERNS) {
    if (sym.regex.test(lowerAnswer)) {
      const isNegated = negativesFound.some(neg => sym.name.includes(neg) || neg.includes(sym.name));
      if (!isNegated && !knownSymptoms.has(sym.name)) {
        newSymptomsFound.push(sym.name);
      }
    }
  }

  // Fallback check for arbitrary new symptom phrases
  if (newSymptomsFound.length === 0 && (
    lowerAnswer.includes('pain when') || lowerAnswer.includes('also have') || lowerAnswer.includes('now i have') ||
    lowerAnswer.includes('சிறுநீர்') || lowerAnswer.includes('पेशाब')
  )) {
    if (lowerAnswer.includes('urinate') || lowerAnswer.includes('urine') || lowerAnswer.includes('சிறுநீர்') || lowerAnswer.includes('पेशाब')) {
      if (!knownSymptoms.has('pain when urinating')) newSymptomsFound.push('pain when urinating');
    }
  }

  // Ambiguity check
  let isAmbiguous = false;
  let ambiguityDetail: string | undefined;
  for (const pattern of AMBIGUITY_PATTERNS) {
    if (pattern.test(lowerAnswer)) {
      isAmbiguous = true;
      ambiguityDetail = `Patient answered '${answer}' which is clinically ambiguous regarding frequency/duration/severity`;
      break;
    }
  }

  // Topic resolution
  const resolvedTopics: string[] = [];
  if (
    lowerAnswer.includes('right side') || lowerAnswer.includes('left side') || lowerAnswer.includes('upper') || lowerAnswer.includes('lower') ||
    lowerAnswer.includes('வலது') || lowerAnswer.includes('இடது') || lowerAnswer.includes('பக்கம்') ||
    lowerAnswer.includes('दाहिनी') || lowerAnswer.includes('बाईं') || lowerAnswer.includes('तरफ')
  ) {
    resolvedTopics.push('location');
  }
  if (
    lowerAnswer.includes('yesterday') || lowerAnswer.includes('days ago') || lowerAnswer.includes('hours ago') || lowerAnswer.includes('since') ||
    lowerAnswer.includes('நேற்று') || lowerAnswer.includes('நாட்களாக') || lowerAnswer.includes('कल') || lowerAnswer.includes('दिनों से') || lowerAnswer.includes('दिन')
  ) {
    resolvedTopics.push('onset');
  }
  if (
    lowerAnswer.includes('eating') || lowerAnswer.includes('food') || lowerAnswer.includes('rest') || lowerAnswer.includes('walking') ||
    lowerAnswer.includes('சாப்பிட்ட') || lowerAnswer.includes('சாப்பாடு') || lowerAnswer.includes('खाना') || lowerAnswer.includes('खाएं')
  ) {
    resolvedTopics.push('aggravating/relieving factors');
  }

  // Active topic determination
  let activeTopic = state.activeTopic;
  if (newSymptomsFound.length > 0) {
    activeTopic = newSymptomsFound[0];
  }

  // Unresolved topics calculation
  const unresolved: string[] = [];
  if (newSymptomsFound.length > 0) {
    newSymptomsFound.forEach(sym => {
      unresolved.push(`onset of ${sym}`);
      unresolved.push(`duration of ${sym}`);
    });
  }

  return {
    newSymptoms: newSymptomsFound,
    explicitNegatives: negativesFound,
    isAmbiguous,
    ambiguityDetail,
    activeTopic,
    resolvedTopics,
    unresolvedTopics: unresolved,
  };
}

async function analyzeAnswerWithLLM(
  answer: string,
  state: InterviewState,
  apiKey: string,
  modelName: string
): Promise<AnalysisResults | null> {
  const systemPrompt = `You are a clinical state reasoning module for an adaptive history-taking system.
Analyze the patient's latest answer in light of previous context and output a JSON analysis.

Output Schema:
{
  "newSymptoms": ["symptom1", "symptom2"],
  "explicitNegatives": ["deniedSymptom1"],
  "isAmbiguous": true | false,
  "ambiguityDetail": "description if vague",
  "activeTopic": "primary focus symptom",
  "resolvedTopics": ["topic resolved by this answer"],
  "newUnresolvedTopics": ["new clinical detail needed"]
}`;

  const userPrompt = `PATIENT ANSWER: "${answer}"
CURRENT KNOWN SYMPTOMS: ${JSON.stringify(state.knownSymptoms || [])}
CURRENT EXPLICIT NEGATIVES: ${JSON.stringify(state.explicitNegatives || [])}
PREVIOUS ACTIVE TOPIC: "${state.activeTopic || 'chief complaint'}"`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      newSymptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
      explicitNegatives: { type: Type.ARRAY, items: { type: Type.STRING } },
      isAmbiguous: { type: Type.BOOLEAN },
      ambiguityDetail: { type: Type.STRING },
      activeTopic: { type: Type.STRING },
      resolvedTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
      newUnresolvedTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ['newSymptoms', 'explicitNegatives', 'isAmbiguous', 'activeTopic', 'resolvedTopics', 'newUnresolvedTopics']
  };

  const ai = new GoogleGenAI({ apiKey });
  const timeoutMs = 4000; // Fast timeout
  const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('State Analyzer Timeout')), timeoutMs));

  const response = await Promise.race([
    ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.1,
      }
    }),
    timeoutPromise
  ]);

  const raw = response.text?.trim();
  if (!raw) return null;

  const parsed = JSON.parse(raw);
  return {
    newSymptoms: parsed.newSymptoms || [],
    explicitNegatives: parsed.explicitNegatives || [],
    isAmbiguous: Boolean(parsed.isAmbiguous),
    ambiguityDetail: parsed.ambiguityDetail,
    activeTopic: parsed.activeTopic || state.activeTopic,
    resolvedTopics: parsed.resolvedTopics || [],
    unresolvedTopics: parsed.newUnresolvedTopics || [],
  };
}

function mergeAnalysisResults(state: InterviewState, results: AnalysisResults): InterviewState {
  const knownSet = new Set(state.knownSymptoms || []);
  const negativeSet = new Set(state.explicitNegatives || []);
  const clarificationsSet = new Set(state.clarificationsNeeded || []);
  const unresolvedSet = new Set(state.unresolvedTopics || []);

  // Merge new symptoms
  results.newSymptoms.forEach(s => {
    knownSet.add(s);
    negativeSet.delete(s); // If newly reported, it's not negative
  });

  // Merge explicit negatives
  results.explicitNegatives.forEach(s => {
    negativeSet.add(s);
    knownSet.delete(s);
  });

  // Update ambiguity
  if (results.isAmbiguous && results.ambiguityDetail) {
    clarificationsSet.add(results.ambiguityDetail);
  } else {
    // If not ambiguous in this turn, clear resolved ambiguity if any
    clarificationsSet.clear();
  }

  // Update resolved topics
  results.resolvedTopics.forEach(res => {
    unresolvedSet.forEach(un => {
      if (un.toLowerCase().includes(res.toLowerCase())) {
        unresolvedSet.delete(un);
      }
    });
  });

  // Add new unresolved topics
  results.unresolvedTopics.forEach(un => unresolvedSet.add(un));

  // Update missingInformation status for explicit negatives
  const updatedMissingInfo = (state.missingInformation || []).map(m => {
    if (results.explicitNegatives.some(neg => m.topic.toLowerCase().includes(neg.toLowerCase()))) {
      return { ...m, status: 'explicitly_negative' as const };
    }
    return m;
  });

  const activeTopic = results.activeTopic || state.activeTopic || state.chiefComplaint || 'general';
  const recentTopics = Array.from(new Set([...(state.recentTopics || []), activeTopic]));

  return {
    ...state,
    knownSymptoms: Array.from(knownSet),
    newSymptoms: results.newSymptoms,
    explicitNegatives: Array.from(negativeSet),
    clarificationsNeeded: Array.from(clarificationsSet),
    unresolvedTopics: Array.from(unresolvedSet),
    activeTopic,
    recentTopics,
    missingInformation: updatedMissingInfo,
  };
}
