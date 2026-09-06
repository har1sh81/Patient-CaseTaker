import { ClinicalQuestion } from '../types';

export const KOSHTHA_QUESTIONS: ClinicalQuestion[] = [
  {
    id: 'AY-KOSHTHA-PATTERN-001',
    version: '1.0',
    mode: 'ayush',
    complaint: 'koshtha',
    section: 'ayush_koshtha',
    category: 'bowel',
    questionText: {
      en: 'How would you describe your bowel movements and stool consistency usually?',
      ta: 'உங்கள் மலம் கழிக்கும் பழக்கம் மற்றும் மலத்தின் தன்மையை எப்படி விவரிப்பீர்கள்?',
      hi: 'आप अपने पेट साफ होने की प्रक्रिया और मल की स्थिति को कैसा महसूस करते हैं?',
    },
    answerType: 'single_choice',
    targetField: 'bowel_koshtha_pattern',
    priority: 90,
    required: true,
    voiceEnabled: true,
    touchEnabled: true,
    sourceType: 'patient_input',
    choices: [
      { value: 'hard_krura', label: { en: 'Hard stool / constipation / pass motion once in 2-3 days', ta: 'மலம் இறுகி மலச்சிக்கல் / 2-3 நாட்களுக்கு ஒருமுறை', hi: 'कड़ा मल / कब्ज / 2-3 दिन में एक बार' } },
      { value: 'soft_mridu', label: { en: 'Soft or loose stool / pass motion 2-3 times daily easily', ta: 'இளகிய மலம் / தினமும் 2-3 முறை இலகுவாக', hi: 'नरम या ढीला मल / दिन में 2-3 बार आसानी से' } },
      { value: 'medium_madhyama', label: { en: 'Normal formed stool once daily', ta: 'தினமும் ஒருமுறை சீரான மலம்', hi: 'सामान्य दिन में एक बार साफ पेट' } },
    ],
  },
  {
    id: 'AY-KOSHTHA-STRAIN-001',
    version: '1.0',
    mode: 'ayush',
    complaint: 'koshtha',
    section: 'ayush_koshtha',
    category: 'bowel',
    questionText: {
      en: 'Do you have to strain heavily or feel incomplete bowel evacuation?',
      ta: 'மலம் கழிக்கும் போது முக்க வேண்டி உள்ளதா அல்லது வயிறு முழுமையாக சுத்தமாகாத உணர்வு உள்ளதா?',
      hi: 'क्या आपको पेट साफ करने के लिए जोर लगाना पड़ता है या अधूरा साफ होने का अहसास रहता है?',
    },
    answerType: 'yes_no',
    targetField: 'straining_incomplete_evacuation',
    priority: 85,
    required: false,
    voiceEnabled: true,
    touchEnabled: true,
    sourceType: 'patient_input',
  },
];
