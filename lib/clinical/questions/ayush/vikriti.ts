import { ClinicalQuestion } from '../types';

export const VIKRITI_QUESTIONS: ClinicalQuestion[] = [
  {
    id: 'AY-VIKRITI-DEV-001',
    version: '1.0',
    mode: 'ayush',
    complaint: 'vikriti',
    section: 'ayush_vikriti',
    category: 'progression',
    questionText: {
      en: 'What recent changes or unusual discomforts have you noticed from your normal healthy state?',
      ta: 'உங்கள் இயல்பான ஆரோக்கிய நிலையிலிருந்து சமீபத்தில் என்னென்ன மாற்றங்களை உணர்கிறீர்கள்?',
      hi: 'आपकी सामान्य स्वस्थ स्थिति से हाल में क्या बदलाव महसूस हो रहे हैं?',
    },
    answerType: 'multi_choice',
    targetField: 'vikriti_recent_deviations',
    priority: 80,
    required: false,
    voiceEnabled: true,
    touchEnabled: true,
    sourceType: 'patient_input',
    choices: [
      { value: 'appetite_change', label: { en: 'Recent drop in appetite / digestion', ta: 'சமீபத்திய பசியின்மை / செரிமானக் குறைவு', hi: 'हाल ही में भूख / पाचन कम होना' } },
      { value: 'bowel_change', label: { en: 'Recent change in bowel habits', ta: 'சமீபத்திய மலக் கோளாறு', hi: 'हाल ही में पेट साफ होने में बदलाव' } },
      { value: 'sleep_fatigue_change', label: { en: 'Unusual fatigue or sleep disruption', ta: 'சமீபத்திய தூக்கமின்மை / சோர்வு', hi: 'असामान्य थकान या नींद में खलल' } },
      { value: 'skin_joint_change', label: { en: 'Skin dryness / joint discomfort', ta: 'தோல் வறட்சி / மூட்டு வலி', hi: 'त्वचा में सूखापन / जोड़ों में दर्द' } },
    ],
  },
];
