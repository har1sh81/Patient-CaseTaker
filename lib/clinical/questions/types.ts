export type QuestionMode = 'general_medicine' | 'ayush';

export type QuestionSourceType = 'patient_input' | 'clinician_assessment' | 'measurement_required';

export type ComplaintType =
  | 'chest_pain'
  | 'abdominal_pain'
  | 'headache'
  | 'fever'
  | 'cough'
  | 'breathlessness'
  | 'vomiting'
  | 'diarrhea'
  | 'dizziness'
  | 'back_pain'
  | 'joint_pain'
  | 'urinary'
  | 'fatigue'
  | 'common_history'
  // AYUSH Assessment Groups
  | 'ayush_general_history'
  | 'ahara'
  | 'vihara'
  | 'agni'
  | 'koshtha'
  | 'nidra'
  | 'prakriti'
  | 'vikriti'
  | 'nidana'
  | 'samprapti'
  | 'dashavidha'
  | 'trividha'
  | 'ashtavidha'
  | 'dashavidha_pariksha'
  | 'trividha_pariksha'
  | 'ashtavidha_pariksha';

export type QuestionSection =
  | 'chief_complaint'
  | 'history_of_present_illness'
  | 'past_medical_history'
  | 'medication_history'
  | 'allergy_history'
  | 'family_history'
  | 'social_history'
  | 'lifestyle'
  | 'review_of_systems'
  // AYUSH Sections
  | 'ayush_history'
  | 'ayush_ahara'
  | 'ayush_vihara'
  | 'ayush_agni'
  | 'ayush_koshtha'
  | 'ayush_nidra'
  | 'ayush_prakriti'
  | 'ayush_vikriti'
  | 'ayush_nidana'
  | 'ayush_samprapti'
  | 'ayush_dashavidha'
  | 'ayush_trividha'
  | 'ayush_ashtavidha'
  | 'dashavidha_pariksha'
  | 'trividha_pariksha'
  | 'ashtavidha_pariksha';

export type QuestionCategory =
  | 'onset'
  | 'duration'
  | 'location'
  | 'laterality'
  | 'character'
  | 'severity'
  | 'frequency'
  | 'timing'
  | 'progression'
  | 'aggravating_factors'
  | 'relieving_factors'
  | 'associated_symptoms'
  | 'red_flag_screening'
  | 'previous_episode'
  | 'past_medical_history'
  | 'medication_history'
  | 'allergy_history'
  | 'family_history'
  | 'social_history'
  | 'occupation'
  | 'tobacco'
  | 'alcohol'
  | 'diet'
  | 'sleep'
  | 'bowel'
  | 'bladder'
  | 'reproductive_history'
  | 'relevant_system_review'
  // AYUSH Categories
  | 'appetite'
  | 'digestion'
  | 'meal_habit'
  | 'daily_routine'
  | 'physical_activity'
  | 'stress_coping'
  | 'constitutional_feature'
  | 'tissue_nourishment'
  | 'body_build'
  | 'exercise_capacity'
  | 'examination_observation'
  | 'prakriti'
  | 'vikriti'
  | 'sara'
  | 'samhanana'
  | 'pramana'
  | 'satmya'
  | 'sattva'
  | 'ahara_shakti'
  | 'vyayama_shakti'
  | 'vaya'
  | 'darshana'
  | 'sparshana'
  | 'prashna'
  | 'nadi'
  | 'jihva'
  | 'mala'
  | 'mutra'
  | 'shabda'
  | 'drik'
  | 'akriti'
  | 'dietary_triggers'
  | 'lifestyle_triggers'
  | 'symptom_progression';

export type AnswerType =
  | 'free_text'
  | 'yes_no'
  | 'single_choice'
  | 'multi_choice'
  | 'numeric'
  | 'numeric_scale'
  | 'duration'
  | 'date'
  | 'time'
  | 'body_site';

export interface LanguageText {
  en: string;
  ta: string;
  hi: string;
}

export interface QuestionChoice {
  value: string;
  label: LanguageText;
}

export interface ClinicalQuestion {
  id: string; // Stable identifier e.g., 'GM-CP-ONSET-001' or 'AY-AGNI-APPETITE-001'
  version: string; // Versioning e.g., '1.0'
  mode: QuestionMode; // 'general_medicine' | 'ayush'
  complaint: ComplaintType;
  section: QuestionSection;
  category: QuestionCategory;
  questionText: LanguageText;
  answerType: AnswerType;
  targetField: string; // Neutral clinical target attribute name
  priority: number; // Higher number indicates higher default clinical priority (e.g. 1-100)
  required: boolean;
  voiceEnabled: boolean;
  touchEnabled: boolean;
  sourceType?: QuestionSourceType; // Default 'patient_input'
  ayushDomain?: string; // Optional domain e.g., 'dashavidha_sara', 'ashtavidha_nadi'
  redFlagCandidate?: boolean;
  choices?: QuestionChoice[];
  examples?: LanguageText;
}
