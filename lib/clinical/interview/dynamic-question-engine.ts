import type { InterviewState, ConversationalQuestion } from './types';
import * as crypto from 'crypto';
import { validateConversationalQuestionDetailed } from './conversational-question-validator';
import { getQuestionFingerprint } from './question-fingerprint';

/**
 * Phase 5 — Anti-Repetition & Strong Validation Dynamic Question Engine
 * MediKiosk Clinical Architecture
 *
 * Implements bounded regeneration retries (max 3), defensive JSON parsing,
 * loop detection, and 100% state-derived fallbacks without old question library dependencies.
 */

const MAX_RETRIES = 3;

export async function generateDynamicNextQuestion(
  state: InterviewState
): Promise<ConversationalQuestion> {
  // 0. Defense in Depth Safety Guard: Refuse question generation if safety state is urgent or terminated
  if (
    state.status === 'terminated_for_safety' ||
    state.status === 'urgent_review' ||
    (state.redFlags && state.redFlags.some(f => f.severity === 'red_flag' || f.severity === 'urgent'))
  ) {
    throw new Error('Interview terminated for safety review. Dynamic question generation blocked.');
  }

  // 1. Loop Detection Check
  if (detectConversationalLoop(state)) {
    console.warn('[Dynamic Engine] Conversational loop/stall detected.');
    return buildStalledEngineQuestion(state);
  }

  const apiKey = process.env.INTERVIEW_LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
  const modelName = process.env.INTERVIEW_LLM_MODEL || process.env.GEMINI_MODEL || 'gemini-3.6-flash';

  // Fallback if LLM is unconfigured
  if (!apiKey && process.env.NODE_ENV !== 'test') {
    console.warn('[Dynamic Engine] Missing API Key. Generating state-derived fallback.');
    return buildStateDerivedFallbackQuestion(state);
  }

  // Helper: detect quota/rate-limit errors to fast-fail without retrying
  const isQuotaError = (msg: string): boolean =>
    msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429') ||
    msg.includes('quota') || msg.includes('rate limit') ||
    msg.includes('No endpoints found') || msg.includes('404');


  // 2. Build rich context from InterviewState
  const previousQuestions = (state.conversationTurns || [])
    .filter(t => t.role === 'assistant')
    .map(t => t.text);

  const missingTopics = (state.missingInformation || [])
    .filter(m => m.status === 'missing')
    .map(m => m.topic)
    .join(', ');

  const systemPrompt = `You are an expert clinical history-taking assistant.
Your task is ONLY to ask the single most clinically relevant next history question based on what the patient has said, newly introduced symptoms, explicit negatives, and unresolved information.

STRICT CONVERSATIONAL & SAFETY RULES:
1. SAFETY IS AUTHORITATIVE: The model is NOT the safety authority. Deterministic system safety state is 100% authoritative and CANNOT be overridden, downgraded, or ignored.
2. URGENT STATE TERMINATION: When system state is urgent or terminated, DO NOT generate a normal history question.
3. STRICTLY NO DIAGNOSIS: DO NOT state, suggest, or speculate on any diagnosis (e.g. NEVER say "You are having a heart attack", "You have stroke", "You may have appendicitis").
4. STRICTLY NO TREATMENT: DO NOT prescribe, recommend medication, treatment, or home remedies.
5. DO NOT MINIMIZE SYMPTOMS: Never tell a patient their symptoms are "harmless" or "nothing to worry about".
6. RESPOND TO LATEST STATEMENT: Acknowledge or pivot directly based on what the patient just said.
7. NEW-SYMPTOM REPRIORITIZATION: If the patient introduces a new symptom (e.g. dysuria, fever, dizziness), reprioritize the conversation toward that new symptom.
8. CLARIFY AMBIGUITY: If the patient's latest answer is vague or ambiguous (e.g. "a lot", "sometimes", "a long time ago"), ask an explicit clarification question to quantify or detail it.
9. UNRESOLVED INFORMATION: Prioritize clinically meaningful unresolved information (e.g., pain location, onset, aggravating factors) when no new urgent symptom is introduced.
10. NEVER REPEAT ESTABLISHED INFO: NEVER ask for information that the patient has already provided (e.g., if onset is "yesterday", do NOT ask when it started).
11. RESPECT EXPLICIT NEGATIVES: NEVER ask about symptoms the patient explicitly denied having.
12. EXACTLY ONE QUESTION: Output EXACTLY ONE history-taking question ending with a question mark. No bullet points, lists, or multiple questions.
13. LANGUAGE: Match the requested language (${state.language}).`;


  let lastValidationReason = '';

  // 3. Bounded Regeneration Loop (Max 3 attempts)
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const userPrompt = `EVOLVING CLINICAL STATE:
- Chief Complaint: ${state.chiefComplaint || 'Unspecified'}
- Consultation Mode: ${state.consultationMode}
- Language: ${state.language}

ACTIVE CONVERSATIONAL CONTEXT:
- Active Topic Focus: ${state.activeTopic || 'chief complaint'}
- Confirmed/Known Symptoms: ${JSON.stringify(state.knownSymptoms || [])}
- NEW Symptoms (introduced in latest turn): ${JSON.stringify(state.newSymptoms || [])}
- Explicitly Denied (Negative) Symptoms: ${JSON.stringify(state.explicitNegatives || [])}
- Unresolved Topics: ${JSON.stringify(state.unresolvedTopics || [])}
- Ambiguity Needing Clarification: ${JSON.stringify(state.clarificationsNeeded || [])}
- Missing Information Topics: ${missingTopics || 'None'}

PREVIOUS QUESTIONS ASKED:
${previousQuestions.map((q, i) => `${i + 1}. "${q}"`).join('\n') || 'None'}

LATEST PATIENT ANSWER:
"${state.lastAnswer || 'N/A'}"
${lastValidationReason ? `\nPREVIOUS GENERATION FAILED VALIDATION: ${lastValidationReason}. Please fix this and generate a different, valid question.` : ''}

Please generate the next single history-taking question in JSON format.
Output schema: {"question": "Your single natural history question here?"}`;

    const responseSchema = {
      type: 'object',
      properties: { question: { type: 'string' } },
      required: ['question'],
    };

    try {
      const timeoutMs = 10000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Dynamic Engine Timeout')), timeoutMs)
      );

      // Determine provider: OpenRouter (default) or legacy Gemini
      const provider = process.env.INTERVIEW_LLM_PROVIDER || 'openrouter';
      let rawContent: string | null = null;

      if (provider === 'openrouter' || apiKey?.startsWith('sk-or-')) {
        // ── OpenRouter OpenAI-compatible API ─────────────────────────────────
        const model = modelName || 'google/gemini-flash-1.5';
        const fetchPromise = fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://medikiosk.app',
            'X-Title': 'MediKiosk Clinical Interview',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt + '\n\nRespond ONLY with valid JSON matching this schema: {"question": "<single question here>"}' },
            ],
            temperature: 0.3,
            max_tokens: 150,
            response_format: { type: 'json_object' },
          }),
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);
        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`OpenRouter ${response.status}: ${errBody}`);
        }
        const json = await response.json();
        rawContent = json?.choices?.[0]?.message?.content?.trim() ?? null;
      } else {
        // ── Legacy Gemini SDK fallback (if explicitly configured) ────────────
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: apiKey! });
        const geminiPromise = ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
          config: { responseMimeType: 'application/json', temperature: 0.2 },
        });
        const response = await Promise.race([geminiPromise, timeoutPromise]);
        rawContent = response.text?.trim() ?? null;
      }
      if (!rawContent) {
        lastValidationReason = 'EMPTY response from LLM';
        continue;
      }

      let parsed: { question?: string };
      try {
        parsed = JSON.parse(rawContent);
      } catch (_e) {
        lastValidationReason = 'MALFORMED JSON output';
        continue;
      }

      if (!parsed.question || typeof parsed.question !== 'string') {
        lastValidationReason = 'EMPTY question property in JSON';
        continue;
      }

      const questionText = parsed.question.trim();

      // Run Detailed Validation
      const validation = validateConversationalQuestionDetailed(questionText, state);
      if (!validation.valid) {
        console.warn(`[Dynamic Engine] Attempt ${attempt} failed validation (${validation.reason}): ${validation.detail}`);
        lastValidationReason = `${validation.reason}: ${validation.detail}`;
        continue;
      }

      // Record question fingerprint in state loop history
      const fp = getQuestionFingerprint(questionText);
      state.recentQuestionFingerprints = [...(state.recentQuestionFingerprints || []), fp];

      return {
        id: `dynamic_${crypto.randomUUID().split('-')[0]}`,
        intentId: 'dynamic_llm_intent',
        text: questionText,
        generationMode: 'llm',
        answerType: 'text',
        targetField: 'dynamic_llm_response'
      };

    } catch (err: any) {
      const errStr = err.message || String(err) || '';
      console.warn(`[Dynamic Engine] Attempt ${attempt} exception:`, errStr.substring(0, 200));
      // Fast-fail on quota/rate-limit — no point retrying
      if (isQuotaError(errStr)) {
        console.warn('[Dynamic Engine] Quota exhausted. Skipping retries, using fallback.');
        break;
      }
      lastValidationReason = `EXCEPTION: ${errStr}`;
    }
  }

  // If retries exhausted, return 100% state-derived fallback
  console.warn('[Dynamic Engine] Max retries exhausted. Using state-derived fallback.');
  return buildStateDerivedFallbackQuestion(state);
}

/**
 * Loop detection checking if the engine is cycling fingerprints
 */
export function detectConversationalLoop(state: InterviewState): boolean {
  const fingerprints = state.recentQuestionFingerprints || [];
  if (fingerprints.length < 3) return false;

  const len = fingerprints.length;
  const last3 = fingerprints.slice(len - 3);

  // Check direct repetition: e.g. [A, B, A] or [A, A, A]
  if (last3[0] === last3[2] || (last3[0] === last3[1] && last3[1] === last3[2])) {
    return true;
  }

  return false;
}

export function buildStalledEngineQuestion(state: InterviewState): ConversationalQuestion {
  state.isStalled = true;
  const lang = state.language || 'en';
  let text = `Thank you for sharing those details. Is there anything else you would like the doctor to know about your symptoms?`;

  if (lang === 'ta') {
    text = `விவரங்களைப் பகிர்ந்தமைக்கு நன்றி. உங்கள் அறிகுறிகளைப் பற்றி மருத்துவர் தெரிந்து கொள்ள வேறு ஏதேனும் விரும்புகிறீர்களா?`;
  } else if (lang === 'hi') {
    text = `जानकारी साझा करने के लिए धन्यवाद। क्या आप अपने लक्षणों के बारे में डॉक्टर को कुछ और बताना चाहेंगे?`;
  }

  return {
    id: `stalled_${crypto.randomUUID().split('-')[0]}`,
    intentId: 'INTERVIEW_ENGINE_STALLED',
    text,
    generationMode: 'llm',
    answerType: 'text',
    targetField: 'stalled_response'
  };
}

/**
 * Generates a dynamic, state-derived fallback question directly from the
 * patient's active topic, new symptoms, clarifications, or unresolved topics.
 * Does NOT use any static or deterministic question library!
 */
export function buildStateDerivedFallbackQuestion(state: InterviewState): ConversationalQuestion {
  const lang = state.language || 'en';
  let fallbackText = '';

  // 0. Opening question: No conversation yet, or chief complaint is a generic placeholder
  const genericComplaints = ['general checkup', 'general check up', 'checkup', 'check up', 'general', ''];
  const hasRealComplaint = state.chiefComplaint &&
    !genericComplaints.includes(state.chiefComplaint.toLowerCase().trim());
  const isFirstQuestion = !state.conversationTurns || state.conversationTurns.filter(t => t.role === 'patient').length === 0;

  if (isFirstQuestion && !hasRealComplaint) {
    // Opening: ask what brings the patient in
    if (lang === 'ta') fallbackText = `இன்று உங்களை கிளினிக்கிற்கு என்ன கொண்டு வந்தது?`;
    else if (lang === 'hi') fallbackText = `आज आप क्लिनिक में क्यों आए हैं? कृपया अपनी मुख्य समस्या बताएं।`;
    else fallbackText = `What brings you to the clinic today?`;
  }
  // 1. Clarification fallback
  else if (state.clarificationsNeeded && state.clarificationsNeeded.length > 0) {
    if (lang === 'ta') fallbackText = `இது எப்போது அல்லது எவ்வளவு கடுமையாக இருக்கிறது என்பதைப் பற்றி மேலும் கொஞ்சம் விவரிக்க முடியுமா?`;
    else if (lang === 'hi') fallbackText = `क्या आप अधिक विशेष रूप से बता सकते हैं कि आपको यह कितनी बार या कितना गंभीर अनुभव होता है?`;
    else fallbackText = `Could you describe a bit more specifically how often or how severely you experience that?`;
  }
  // 2. New symptom fallback (only if it's a real symptom, not a generic placeholder)
  else if (state.newSymptoms && state.newSymptoms.length > 0 &&
    !genericComplaints.includes((state.newSymptoms[0] || '').toLowerCase().trim())) {
    const latestSym = state.newSymptoms[0];
    if (lang === 'ta') fallbackText = `இந்த ${latestSym} எப்போது தொடங்கியது?`;
    else if (lang === 'hi') fallbackText = `यह ${latestSym} कब शुरू हुआ?`;
    else fallbackText = `When did the ${latestSym} begin?`;
  }
  // 3. Unresolved topics fallback
  else if (state.unresolvedTopics && state.unresolvedTopics.length > 0) {
    const topic = state.unresolvedTopics[0];
    if (lang === 'ta') fallbackText = `உங்கள் ${topic} பற்றி மேலும் விவரமாகக் கூற முடியுமா?`;
    else if (lang === 'hi') fallbackText = `क्या आप अपने ${topic} के बारे में और बता सकते हैं?`;
    else fallbackText = `Could you tell me more about the ${topic}?`;
  }
  // 4. Active topic fallback
  else if (state.activeTopic && state.activeTopic !== 'general' &&
    !genericComplaints.includes(state.activeTopic.toLowerCase().trim())) {
    if (lang === 'ta') fallbackText = `உங்கள் ${state.activeTopic} இப்போது எப்படி இருக்கிறது என்று விவரிக்க முடியுமா?`;
    else if (lang === 'hi') fallbackText = `आप अभी अपने ${state.activeTopic} का वर्णन कैसे करेंगे?`;
    else fallbackText = `How would you describe your ${state.activeTopic} right now?`;
  }
  // 5. Default history question
  else {
    if (lang === 'ta') fallbackText = `இந்த அறிகுறிகள் எவ்வளவு காலமாக இருக்கின்றன என்று கூற முடியுமா?`;
    else if (lang === 'hi') fallbackText = `आप कितने समय से इन लक्षणों का अनुभव कर रहे हैं?`;
    else fallbackText = `Could you describe how long you have been feeling these symptoms?`;
  }

  return {
    id: `dynamic_state_${crypto.randomUUID().split('-')[0]}`,
    intentId: 'dynamic_state_derived',
    text: fallbackText,
    generationMode: 'llm',
    answerType: 'text',
    targetField: 'dynamic_state_response'
  };
}
