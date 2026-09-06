import { ClinicalQuestion } from '../types';

export const NIDRA_QUESTIONS: ClinicalQuestion[] = [
  {
    id: 'AY-NIDRA-DUR-001',
    version: '1.0',
    mode: 'ayush',
    complaint: 'nidra',
    section: 'ayush_nidra',
    category: 'sleep',
    questionText: {
      en: 'About how many hours of sleep do you get per night on average?',
      ta: 'இரவில் சராசரியாக எத்தனை மணி நேரம் தூங்குகிறீர்கள்?',
      hi: 'औसतन आप रात में कितने घंटे सोते हैं?',
    },
    answerType: 'numeric',
    targetField: 'sleep_duration_hours',
    priority: 85,
    required: true,
    voiceEnabled: true,
    touchEnabled: true,
    sourceType: 'patient_input',
  },
  {
    id: 'AY-NIDRA-QUALITY-001',
    version: '1.0',
    mode: 'ayush',
    complaint: 'nidra',
    section: 'ayush_nidra',
    category: 'sleep',
    questionText: {
      en: 'Do you face difficulty falling asleep or wake up frequently during the night?',
      ta: 'உங்களுக்கு இரவில் தூக்கம் வர தாமதமாகிறதா அல்லது அடிக்கடி விழிப்பு வருகிறதா?',
      hi: 'क्या आपको रात में नींद आने में परेशानी होती है या बार-बार नींद खुलती है?',
    },
    answerType: 'single_choice',
    targetField: 'sleep_disturbance_type',
    priority: 80,
    required: false,
    voiceEnabled: true,
    touchEnabled: true,
    sourceType: 'patient_input',
    choices: [
      { value: 'initial_insomnia', label: { en: 'Difficulty falling asleep', ta: 'தூக்கம் வர தாமதமாவது', hi: 'नींद आने में समय लगना' } },
      { value: 'frequent_awakenings', label: { en: 'Waking up frequently in night', ta: 'அடிக்கடி விழிப்பு வருவது', hi: 'बार-बार नींद टूटना' } },
      { value: 'sound_sleep', label: { en: 'Sound unbroken sleep', ta: 'ஆழ்ந்த நல்ல தூக்கம்', hi: 'गहरी और अच्छी नींद' } },
    ],
  },
];
