import { ClinicalQuestion } from '../types';

export const PRAKRITI_QUESTIONS: ClinicalQuestion[] = [
  {
    id: 'AY-PRAKRITI-BUILD-001',
    version: '1.0',
    mode: 'ayush',
    complaint: 'prakriti',
    section: 'ayush_prakriti',
    category: 'constitutional_feature',
    questionText: {
      en: 'How would you describe your natural body build and lifetime weight tendency?',
      ta: 'உங்கள் இயல்பான உடல்வாகு மற்றும் உடல் எடையை எப்படி விவரிப்பீர்கள்?',
      hi: 'आप अपनी स्वाभाविक शारीरिक बनावट और वजन की प्रवृत्ति को कैसा बताएंगे?',
    },
    answerType: 'single_choice',
    targetField: 'prakriti_body_build',
    priority: 75,
    required: false,
    voiceEnabled: true,
    touchEnabled: true,
    sourceType: 'patient_input',
    choices: [
      { value: 'lean_thin', label: { en: 'Naturally thin / difficulty gaining weight', ta: 'இயல்பிலேயே மெலிந்த உடல் / எடை கூட்டுவது கடினம்', hi: 'दुबला-पतला / वजन बढ़ना मुश्किल' } },
      { value: 'medium_athletic', label: { en: 'Medium build / stable weight', ta: 'மிதமான உடல்வாகு / சீரான எடை', hi: 'मध्यम बनावट / स्थिर वजन' } },
      { value: 'heavy_broad', label: { en: 'Large frame / easily gains weight', ta: 'பருமனான உடல் / சுலபமாக எடை கூடும்', hi: 'भारी शरीर / आसानी से वजन बढ़ना' } },
    ],
  },
  {
    id: 'AY-PRAKRITI-TEMP-001',
    version: '1.0',
    mode: 'ayush',
    complaint: 'prakriti',
    section: 'ayush_prakriti',
    category: 'constitutional_feature',
    questionText: {
      en: 'Which weather or temperature do you tolerate poorest?',
      ta: 'எந்த சீதோஷ்ண நிலை உங்களுக்கு அதிகமாக ஒத்துக்கொள்வதில்லை?',
      hi: 'आपको कौन सा मौसम या तापमान सबसे कम सहन होता है?',
    },
    answerType: 'single_choice',
    targetField: 'prakriti_temp_sensitivity',
    priority: 75,
    required: false,
    voiceEnabled: true,
    touchEnabled: true,
    sourceType: 'patient_input',
    choices: [
      { value: 'intolerant_cold', label: { en: 'Intolerant to cold weather / cold water', ta: 'குளிர் காலம் / குளிர்ந்த நீர் ஒத்துக்கொள்ளாது', hi: 'ठंड का मौसम / ठंडा पानी सहन न होना' } },
      { value: 'intolerant_heat', label: { en: 'Intolerant to hot summer / heat', ta: 'வெயில் / அதிக வெப்பம் ஒத்துக்கொள்ளாது', hi: 'गर्मी का मौसम / धूप सहन न होना' } },
      { value: 'intolerant_damp', label: { en: 'Intolerant to damp / humid weather', ta: 'ஈரப்பதம் / மழைக்காலம் ஒத்துக்கொள்ளாது', hi: 'नमी / उमस वाला मौसम सहन न होना' } },
    ],
  },
];
