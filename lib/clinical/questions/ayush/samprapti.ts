import { ClinicalQuestion } from '../types';

export const SAMPRAPTI_QUESTIONS: ClinicalQuestion[] = [
  {
    id: 'AY-SAMPRAPTI-SEQUENCE-001',
    version: '1.0',
    mode: 'ayush',
    complaint: 'samprapti',
    section: 'ayush_samprapti',
    category: 'symptom_progression',
    questionText: {
      en: 'Which symptom started first, and how did your trouble spread or change step by step?',
      ta: 'எந்த அறிகுறி முதலில் தொடங்கியது, அது படிப்படியாக எவ்வாறு மாறியது அல்லது பரவியது?',
      hi: 'सबसे पहले कौन सी तकलीफ शुरू हुई, और समय के साथ यह कैसे बढ़ी या बदली?',
    },
    answerType: 'free_text',
    targetField: 'symptom_chronological_progression',
    priority: 85,
    required: false,
    voiceEnabled: true,
    touchEnabled: true,
    sourceType: 'patient_input',
  },
  {
    id: 'AY-SAMPRAPTI-ASSOCIATED-001',
    version: '1.0',
    mode: 'ayush',
    complaint: 'samprapti',
    section: 'ayush_samprapti',
    category: 'associated_symptoms',
    questionText: {
      en: 'What other discomforts (like weakness, feverish feeling, body aching, or mood changes) appeared later along with your main problem?',
      ta: 'முக்கிய பிரச்சனையுடன் பின்னர் பலவீனம், காய்ச்சல் உணர்வு, உடல் வலி போன்ற என்ன அறிகுறிகள் இணைந்தன?',
      hi: 'मुख्य समस्या के साथ बाद में और कौन सी तकलीफें (जैसे कमजोरी, बुखार जैसा लगना, शरीर दर्द) जुड़ गईं?',
    },
    answerType: 'free_text',
    targetField: 'associated_symptoms_timeline',
    priority: 75,
    required: false,
    voiceEnabled: true,
    touchEnabled: true,
    sourceType: 'patient_input',
  },
];
