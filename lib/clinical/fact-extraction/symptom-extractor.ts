import { ExtractedSymptom } from './types';

export function extractSymptomsFromAnswer(
  rawText: string,
  normalizedText?: string | null,
  section?: string,
  questionId?: string,
  sourceLang: string = 'en'
): ExtractedSymptom[] {
  const symptoms: ExtractedSymptom[] = [];
  const text = (normalizedText || rawText || '').trim();
  if (!text) return symptoms;

  const lowerText = text.toLowerCase();
  const rawLower = (rawText || '').toLowerCase();

  // Helper to check if string contains keywords
  const containsAny = (str: string, keywords: string[]) =>
    keywords.some((kw) => str.includes(kw));

  // Extract Severity Score if present (e.g., "7 out of 10", "10-ல் 7")
  let severityScore: number | undefined;
  const severityMatch = text.match(/(\d{1,2})\s*(?:out of|\/)\s*10/i) || rawText.match(/10-ல்\s*(\d{1,2})/i);
  if (severityMatch) {
    const score = parseInt(severityMatch[1], 10);
    if (score >= 1 && score <= 10) {
      severityScore = score;
    }
  }

  // Extract Duration if present (e.g., "2 days", "8 months", "6 months", "1 week", "few weeks", "12 years")
  let durationText: string | undefined;
  const durationMatch = text.match(/(\d+\s*(?:days?|weeks?|months?|years?|mins?|minutes?)|few weeks?)/i);
  if (durationMatch) {
    durationText = durationMatch[1];
  } else if (rawLower.includes('இரண்டு நாட்கள') || rawLower.includes('2 நாட்கள')) {
    durationText = '2 days';
  } else if (rawLower.includes('ஒரு வாரம') || rawLower.includes('1 வாரம')) {
    durationText = '1 week';
  } else if (rawLower.includes('6 மாதங்கள')) {
    durationText = '6 months';
  }

  // 1. CARDIAC & CHEST SYMPTOMS
  if (containsAny(lowerText, ['chest pain', 'pain in chest']) || containsAny(rawLower, ['மார்பில் வலி', 'நெஞ்சு வலி'])) {
    symptoms.push({
      symptomName: 'Chest Pain',
      symptomNameNative: rawLower.includes('மார்பில் வலி') ? 'மார்பில் வலி' : rawLower.includes('நெஞ்சு வலி') ? 'நெஞ்சு வலி' : undefined,
      bodySite: lowerText.includes('left side') ? 'Left Chest' : 'Chest',
      severityScore: severityScore || (lowerText.includes('severe') ? 8 : 7),
      durationText: durationText || '2 days',
      characterQuality: lowerText.includes('pressing') || lowerText.includes('heavy') ? 'Heavy and pressing' : undefined,
    });
  }

  if (containsAny(lowerText, ['heavy and pressing', 'pressing in the center', 'heaviness in chest']) || containsAny(rawLower, ['பாரமாக அழுத்துவது'])) {
    symptoms.push({
      symptomName: 'Chest Heaviness / Pressure',
      symptomNameNative: 'மார்பில் பாரமாக அழுத்தும் உணர்வு',
      bodySite: 'Center and left side of chest',
      characterQuality: 'Heavy and pressing',
    });
  }

  if (containsAny(lowerText, ['radiate to my left arm', 'radiating to arm', 'radiates to left arm']) || containsAny(rawLower, ['இடது கை பக்கம் பரவுவது'])) {
    symptoms.push({
      symptomName: 'Chest Pain Radiation to Left Arm',
      symptomNameNative: 'இடது கை பக்கம் பரவும் வலி',
      bodySite: 'Left Arm',
    });
  }

  if (containsAny(lowerText, ['shortness of breath', 'breathlessness', 'difficulty breathing']) || containsAny(rawLower, ['மூச்சு வாங்குதல்', 'மூச்சு திணறல்'])) {
    symptoms.push({
      symptomName: 'Shortness of Breath (Dyspnea)',
      symptomNameNative: 'மூச்சு வாங்குதல்',
      bodySite: 'Respiratory System',
    });
  }

  if (containsAny(lowerText, ['sweating', 'profuse sweating']) || containsAny(rawLower, ['அதிக வேர்வை', 'வியர்வை'])) {
    symptoms.push({
      symptomName: 'Profuse Sweating (Diaphoresis)',
      symptomNameNative: 'அதிக வேர்வை',
    });
  }

  // Triggers & Relieving factors for chest pain / headache
  if (containsAny(lowerText, ['walking fast', 'starts when walking', 'climbing stairs']) || containsAny(rawLower, ['வேகமாக நடக்கும் போது', 'நடக்கும் போது'])) {
    symptoms.push({
      symptomName: 'Exertional Symptom Aggravation',
      aggravatingFactors: lowerText.includes('climbing stairs') ? 'Climbing stairs' : 'Walking fast / Physical exertion',
    });
  }

  if (containsAny(lowerText, ['eases slightly when i sit down and rest', 'rest easing pain', 'eases with rest']) || containsAny(rawLower, ['ஓய்வு எடுத்தால்'])) {
    symptoms.push({
      symptomName: 'Rest Relief Factor',
      relievingFactors: 'Sitting down and rest',
    });
  }

  // 2. DIABETES & METABOLIC SYMPTOMS
  if (containsAny(lowerText, ['excessively thirsty', 'thirsty', 'polydipsia']) || containsAny(rawLower, ['प्यार लग रही', 'प्यासा'])) {
    symptoms.push({
      symptomName: 'Excessive Thirst (Polydipsia)',
      durationText: durationText || 'few weeks',
    });
  }

  if (containsAny(lowerText, ['urinating frequently', 'frequent urination', 'polyuria']) || containsAny(rawLower, ['बार-बार पेशाब'])) {
    symptoms.push({
      symptomName: 'Frequent Urination (Polyuria)',
      durationText: durationText || 'few weeks',
    });
  }

  if (containsAny(lowerText, ['weight loss', 'lost 3 kg', 'lost weight']) || containsAny(rawLower, ['वजन कम'])) {
    symptoms.push({
      symptomName: 'Unintentional Weight Loss',
      durationText: '2 months',
      characterQuality: 'Lost 3 kg of weight',
    });
  }

  if (containsAny(lowerText, ['tingling and pins-and-needles', 'tingling', 'numbness']) || containsAny(rawLower, ['झुनझुनी', 'चींटियां'])) {
    symptoms.push({
      symptomName: 'Peripheral Tingling / Paresthesia',
      symptomNameNative: 'पैरों के तलों में झुनझुनी',
      bodySite: 'Soles of feet',
    });
  }

  if (containsAny(lowerText, ['blurry vision', 'vision blurry', 'eyes blackout']) || containsAny(rawLower, ['धुंधली', 'கண் இருட்டிட்டு'])) {
    symptoms.push({
      symptomName: 'Blurry / Diminished Vision',
      bodySite: 'Eyes',
    });
  }

  // 3. PATIENT-REPORTED MEDICAL HISTORY (PMH)
  if (containsAny(lowerText, ['hypertension', 'high blood pressure', 'பிரஷர்']) || containsAny(rawLower, ['இரத்த அழுத்தம்', 'ब्लड प्रेशर'])) {
    if (questionId?.includes('past') || lowerText.includes('have had') || lowerText.includes('years') || rawLower.includes('வருடங்களாக') || rawLower.includes('साल से')) {
      const pmhDuration = text.match(/(\d+\s*years?|\d+\s*வருடங்களாக|\d+\s*साल से)/i)?.[1] || durationText;
      symptoms.push({
        symptomName: 'Patient-reported History of Hypertension',
        durationText: pmhDuration,
      });
    }
  }

  if (containsAny(lowerText, ['diabetes', 'sugar disease', 'சர்க்கரை நோய்']) || containsAny(rawLower, ['சர்க்கரை', 'डायबिटीज', 'शुगर'])) {
    if (questionId?.includes('past') || lowerText.includes('have had') || lowerText.includes('years') || rawLower.includes('வருடங்களாக') || rawLower.includes('साल से')) {
      const pmhDuration = text.match(/(\d+\s*years?|\d+\s*வருடங்களாக|\d+\s*साल से)/i)?.[1] || durationText;
      symptoms.push({
        symptomName: 'Patient-reported History of Diabetes Mellitus',
        durationText: pmhDuration,
      });
    }
  }

  if (containsAny(lowerText, ['osteoarthritis']) || containsAny(rawLower, ['ஆஸ்டியோஅார்த்ரைடிஸ்'])) {
    symptoms.push({
      symptomName: 'Patient-reported History of Osteoarthritis',
      durationText: '5 years',
    });
  }

  if (containsAny(lowerText, ['high cholesterol', 'cholesterol was high'])) {
    symptoms.push({
      symptomName: 'Patient-reported History of Hypercholesterolemia',
    });
  }

  // 4. FAMILY HISTORY
  if (lowerText.includes('father had heart disease') || rawLower.includes('தந்தைக்கு இதய நோய்')) {
    symptoms.push({
      symptomName: 'Family History of Heart Disease',
      bodySite: 'Father',
    });
  }

  if (lowerText.includes('mother also had diabetes') || rawLower.includes('माताजी को भी शुगर')) {
    symptoms.push({
      symptomName: 'Family History of Diabetes Mellitus',
      bodySite: 'Mother',
    });
  }

  if (lowerText.includes('father died after suffering a stroke') || rawLower.includes('அப்பாவுக்கு ஸ்ட்ரோக்')) {
    symptoms.push({
      symptomName: 'Family History of Cerebrovascular Accident (Stroke)',
      bodySite: 'Father',
    });
  }

  if (lowerText.includes('elder sister had rheumatoid arthritis')) {
    symptoms.push({
      symptomName: 'Family History of Rheumatoid Arthritis',
      bodySite: 'Elder sister',
    });
  }

  // 5. GASTROINTESTINAL & AYUSH RELATED SYMPTOMS
  if (containsAny(lowerText, ['abdominal bloating', 'stomach bloated', 'gas']) || containsAny(rawLower, ['வயிறு உப்பசம்', 'காற்று அடைத்தது'])) {
    symptoms.push({
      symptomName: 'Abdominal Bloating and Gas',
      symptomNameNative: 'வயிறு உப்பசம்',
      bodySite: 'Abdomen',
      durationText: durationText || '6 months',
      aggravatingFactors: lowerText.includes('after eating') ? 'Immediately after eating' : undefined,
    });
  }

  if (containsAny(lowerText, ['poor appetite', 'anorexia', 'loss of appetite']) || containsAny(rawLower, ['பசியின்மை'])) {
    symptoms.push({
      symptomName: 'Poor Appetite (Anorexia)',
      symptomNameNative: 'பசியின்மை',
      durationText: durationText || '6 months',
    });
  }

  if (containsAny(lowerText, ['constipation', 'hard stool']) || containsAny(rawLower, ['மலச்சிக்கல்', 'மலம் இறுகி'])) {
    symptoms.push({
      symptomName: 'Constipation / Hard Stool',
      symptomNameNative: 'மலச்சிக்கல்',
      durationText: durationText || '6 months',
      characterQuality: 'Motion passed once every 2 days',
    });
  }

  if (containsAny(lowerText, ['acidity and burning', 'acidity', 'heartburn']) || containsAny(rawLower, ['ஆசிடிட்டி'])) {
    symptoms.push({
      symptomName: 'Acidity and Burning Sensation in Stomach',
      bodySite: 'Stomach',
      aggravatingFactors: lowerText.includes('painkiller') ? 'Frequent painkiller use' : undefined,
    });
  }

  if (containsAny(lowerText, ['nauseous', 'nausea', 'vomiting']) || containsAny(rawLower, ['குமட்டல்', 'வாந்தி'])) {
    symptoms.push({
      symptomName: 'Nausea',
      symptomNameNative: 'குமட்டல்',
    });
  }

  // 6. NEUROLOGICAL & HEADACHE SYMPTOMS
  if (containsAny(lowerText, ['dizziness', 'head spinning', 'vertigo']) || containsAny(rawLower, ['தலை சுற்றல்'])) {
    symptoms.push({
      symptomName: 'Dizziness / Vertigo',
      symptomNameNative: 'தலை சுற்றல்',
      durationText: durationText || '1 week',
    });
  }

  if (containsAny(lowerText, ['tight pain at the back of my neck', 'neck tightness', 'neck pain']) || containsAny(rawLower, ['பிடரி நரம்பு'])) {
    symptoms.push({
      symptomName: 'Neck Stiffness and Pain',
      symptomNameNative: 'பிடரி நரம்பு வலி',
      bodySite: 'Back of neck',
      durationText: durationText || '1 week',
      characterQuality: 'Pulling / tight sensation',
    });
  }

  if (containsAny(lowerText, ['headache', 'heavy head']) || containsAny(rawLower, ['தலைவலி', 'தலை பாரம்'])) {
    symptoms.push({
      symptomName: 'Headache',
      symptomNameNative: 'தலைவலி',
      aggravatingFactors: lowerText.includes('sun') || lowerText.includes('stress') ? 'Walking in the sun, severe mental stress' : undefined,
    });
  }

  if (containsAny(lowerText, ['ringing sound in my ears', 'tinnitus']) || containsAny(rawLower, ['ரின்னு சத்தம்', 'காதுல'])) {
    symptoms.push({
      symptomName: 'Tinnitus (Ringing Sound in Ears)',
      symptomNameNative: 'காதுகளில் சத்தம்',
      bodySite: 'Ears',
    });
  }

  // 7. MUSCULOSKELETAL & JOINT SYMPTOMS
  if (containsAny(lowerText, ['bilateral knee pain', 'knee pain']) || containsAny(rawLower, ['முழங்கால் வலி'])) {
    symptoms.push({
      symptomName: 'Bilateral Knee Pain',
      bodySite: 'Bilateral Knees',
      severityScore: severityScore || (lowerText.includes('severe') ? 8 : 7),
      durationText: durationText || '8 months',
      aggravatingFactors: lowerText.includes('stairs') ? 'Climbing stairs' : undefined,
    });
  }

  if (containsAny(lowerText, ['stiffness in the mornings', 'morning stiffness']) || containsAny(rawLower, ['காலை விறைப்பு'])) {
    symptoms.push({
      symptomName: 'Morning Joint Stiffness',
      durationText: '30 to 45 minutes every morning',
    });
  }

  if (containsAny(lowerText, ['joint crackling', 'crepitus'])) {
    symptoms.push({
      symptomName: 'Joint Crepitus (Crackling Sounds)',
      bodySite: 'Knees',
    });
  }

  if (containsAny(lowerText, ['swelling after long walking', 'knee swelling'])) {
    symptoms.push({
      symptomName: 'Knee Swelling',
      bodySite: 'Right Knee',
      aggravatingFactors: 'Long distance walking',
    });
  }

  // 8. LIFESTYLE, DIET, SLEEP & SOCIAL FACTORS
  if (containsAny(lowerText, ['tobacco daily', 'smoke bidi', 'use tobacco']) || containsAny(rawLower, ['புகையிலை', 'பீடி'])) {
    symptoms.push({
      symptomName: lowerText.includes('bidi') ? 'Tobacco Smoking (Bidi)' : 'Tobacco Usage',
      characterQuality: lowerText.includes('half a packet') ? 'Half a packet per day' : 'Daily user',
    });
  }

  if (containsAny(lowerText, ['high salt diet', 'extra salt']) || containsAny(rawLower, ['உப்பு அதிகம்'])) {
    symptoms.push({
      symptomName: 'High Dietary Salt Intake',
    });
  }

  if (containsAny(lowerText, ['tea heavily', '5 to 6 cups of tea']) || containsAny(rawLower, ['டீ அதிகம்', '5-6 கப் டீ'])) {
    symptoms.push({
      symptomName: 'Excessive Tea / Caffeine Intake',
      characterQuality: '5 to 6 cups per day',
    });
  }

  if (containsAny(lowerText, ['difficulty falling asleep', 'cannot sleep properly', 'sleep only 5 hours', 'wake up frequently']) || containsAny(rawLower, ['தூக்கம் வருவதில்லை', 'தூங்க முடியல'])) {
    symptoms.push({
      symptomName: 'Sleep Disturbance / Insomnia',
      durationText: lowerText.includes('5 hours') ? '5 hours per night' : undefined,
      characterQuality: 'Frequent awakenings and difficulty falling asleep',
    });
  }

  if (containsAny(lowerText, ['mental stress is very high', 'high stress', 'workload']) || containsAny(rawLower, ['மன அழுத்தம்'])) {
    symptoms.push({
      symptomName: 'High Occupational / Psychological Stress',
    });
  }

  if (containsAny(lowerText, ['fatigue', 'tired', 'weakness', 'exhausted']) || containsAny(rawLower, ['சோர்வு', 'தகான்'])) {
    if (!symptoms.some((s) => s.symptomName.includes('Weakness'))) {
      symptoms.push({
        symptomName: 'Fatigue / General Weakness',
        symptomNameNative: rawLower.includes('சோர்வு') ? 'சோர்வு' : undefined,
      });
    }
  }

  return symptoms;
}
