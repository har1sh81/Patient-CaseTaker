/**
 * Task #20 — Document Classification Rule Definitions
 * MediKiosk Clinical Engine
 * 
 * Provides evidence keywords, section titles, filename tokens, and multi-script indicators
 * (English, Tamil, Hindi) for medical document classification.
 */

import { DocumentCategory } from '../types';

export interface KeywordRule {
  term: string;
  weight: number;
  description?: string;
}

export interface CategoryRuleSet {
  category: DocumentCategory;
  filenameKeywords: KeywordRule[];
  textKeywords: KeywordRule[];
  titleKeywords: KeywordRule[];
}

export const CATEGORY_RULES: CategoryRuleSet[] = [
  // 1. OPD Prescription
  {
    category: 'opd_prescription',
    filenameKeywords: [
      { term: 'prescription', weight: 4.0 },
      { term: 'rx', weight: 4.0 },
      { term: 'opd_rx', weight: 4.0 },
      { term: 'handwritten_prescription', weight: 4.5 },
    ],
    titleKeywords: [
      { term: 'prescription', weight: 3.5 },
      { term: 'opd prescription', weight: 4.0 },
      { term: 'medical prescription', weight: 4.0 },
      { term: 'rx', weight: 3.5 },
      { term: 'மருந்து சீட்டு', weight: 4.0 },
      { term: 'दवा पर्ची', weight: 4.0 },
    ],
    textKeywords: [
      // English Rx indicators
      { term: 'rx', weight: 3.0 },
      { term: 'tab.', weight: 2.5 },
      { term: 'tab ', weight: 2.0 },
      { term: 'tablet', weight: 2.5 },
      { term: 'cap.', weight: 2.5 },
      { term: 'capsule', weight: 2.5 },
      { term: 'syr.', weight: 2.5 },
      { term: 'syrup', weight: 2.5 },
      { term: 'dosage', weight: 2.0 },
      { term: '1-0-1', weight: 2.5 },
      { term: '0-1-0', weight: 2.5 },
      { term: '1-1-1', weight: 2.5 },
      { term: '1-0-0', weight: 2.5 },
      { term: '0-0-1', weight: 2.5 },
      { term: 'bd', weight: 1.5 },
      { term: 'tds', weight: 1.5 },
      { term: 'od', weight: 1.5 },
      { term: 'hs', weight: 1.5 },
      { term: 'after food', weight: 2.0 },
      { term: 'before food', weight: 2.0 },
      { term: 'metformin', weight: 1.5 },
      { term: 'telmisartan', weight: 1.5 },
      { term: 'paracetamol', weight: 1.5 },
      { term: 'atorvastatin', weight: 1.5 },
      { term: 'amlodipine', weight: 1.5 },
      // Tamil indicators
      { term: 'மருந்து', weight: 3.0 },
      { term: 'மாத்திரை', weight: 3.0 },
      { term: 'பரிந்துரை', weight: 3.0 },
      { term: 'உணவுக்கு பின்', weight: 2.5 },
      { term: 'காலை', weight: 1.5 },
      { term: 'இரவு', weight: 1.5 },
      // Hindi indicators
      { term: 'दवा', weight: 3.0 },
      { term: 'पर्ची', weight: 3.0 },
      { term: 'गोली', weight: 2.5 },
      { term: 'भोजन के बाद', weight: 2.5 },
      { term: 'दिन में दो बार', weight: 2.5 },
    ],
  },

  // 2. Laboratory Report
  {
    category: 'laboratory_report',
    filenameKeywords: [
      { term: 'lab', weight: 3.5 },
      { term: 'laboratory', weight: 4.0 },
      { term: 'hba1c', weight: 4.0 },
      { term: 'cbc', weight: 4.0 },
      { term: 'blood', weight: 3.0 },
      { term: 'panel', weight: 3.0 },
      { term: 'pathology', weight: 4.0 },
    ],
    titleKeywords: [
      { term: 'laboratory report', weight: 4.5 },
      { term: 'lab report', weight: 4.0 },
      { term: 'pathology report', weight: 4.5 },
      { term: 'biochemistry report', weight: 4.5 },
      { term: 'blood report', weight: 3.5 },
      { term: 'ஆய்வக அறிக்கை', weight: 4.0 },
      { term: 'प्रयोगशाला रिपोर्ट', weight: 4.0 },
    ],
    textKeywords: [
      // English Lab indicators
      { term: 'hba1c', weight: 3.5 },
      { term: 'hemoglobin', weight: 3.0 },
      { term: 'creatinine', weight: 3.0 },
      { term: 'bilirubin', weight: 3.0 },
      { term: 'platelet', weight: 2.5 },
      { term: 'wbc', weight: 2.5 },
      { term: 'rbc', weight: 2.5 },
      { term: 'reference range', weight: 3.5 },
      { term: 'normal range', weight: 3.0 },
      { term: 'specimen date', weight: 3.0 },
      { term: 'sample collected', weight: 2.5 },
      { term: 'biological reference', weight: 3.0 },
      { term: 'fasting blood sugar', weight: 3.0 },
      { term: 'post prandial', weight: 2.5 },
      { term: 'mg/dl', weight: 2.5 },
      { term: 'g/dl', weight: 2.5 },
      { term: 'mmol/l', weight: 2.5 },
      { term: 'uiuml', weight: 2.5 },
      { term: 'pathology', weight: 2.5 },
      // Tamil Lab indicators
      { term: 'இரத்த பரிசோதனை', weight: 3.5 },
      { term: 'ஆய்வக', weight: 3.0 },
      { term: 'அறிக்கை', weight: 2.0 },
      // Hindi Lab indicators
      { term: 'प्रयोगशाला', weight: 3.5 },
      { term: 'रक्त जांच', weight: 3.5 },
      { term: 'नमूना', weight: 2.5 },
    ],
  },

  // 3. Discharge Summary
  {
    category: 'discharge_summary',
    filenameKeywords: [
      { term: 'discharge', weight: 4.0 },
      { term: 'summary', weight: 2.0 },
      { term: 'admission', weight: 2.5 },
      { term: 'ipd', weight: 3.0 },
    ],
    titleKeywords: [
      { term: 'discharge summary', weight: 5.0 },
      { term: 'inpatient discharge', weight: 4.5 },
      { term: 'hospital discharge', weight: 4.5 },
      { term: 'விடுவிப்பு சுருக்கம்', weight: 4.5 },
      { term: 'डिस्चार्ज सारांश', weight: 4.5 },
    ],
    textKeywords: [
      { term: 'date of admission', weight: 3.5 },
      { term: 'date of discharge', weight: 3.5 },
      { term: 'hospital stay', weight: 3.0 },
      { term: 'brief history', weight: 2.5 },
      { term: 'course in hospital', weight: 3.5 },
      { term: 'condition at discharge', weight: 3.5 },
      { term: 'discharge advice', weight: 3.5 },
      { term: 'discharge medications', weight: 3.0 },
      { term: 'ipd no', weight: 3.0 },
      { term: 'admitted on', weight: 2.5 },
      { term: 'discharged on', weight: 2.5 },
      { term: 'மருத்துவமனை சேர்க்கை', weight: 3.0 },
      { term: 'அஸ்பதால்', weight: 2.5 },
      { term: 'अस्पताल भर्ती', weight: 3.0 },
    ],
  },

  // 4. Imaging Report
  {
    category: 'imaging_report',
    filenameKeywords: [
      { term: 'imaging', weight: 4.0 },
      { term: 'ecg', weight: 4.5 },
      { term: 'xray', weight: 4.5 },
      { term: 'usg', weight: 4.5 },
      { term: 'ultrasound', weight: 4.5 },
      { term: 'ct', weight: 3.5 },
      { term: 'mri', weight: 3.5 },
      { term: 'cardiac', weight: 2.5 },
      { term: 'radiology', weight: 4.0 },
      { term: 'scan', weight: 3.0 },
    ],
    titleKeywords: [
      { term: 'imaging report', weight: 4.5 },
      { term: 'ecg report', weight: 4.5 },
      { term: 'electrocardiogram', weight: 4.5 },
      { term: 'ultrasound report', weight: 4.5 },
      { term: 'radiology report', weight: 4.5 },
      { term: 'x-ray report', weight: 4.5 },
      { term: 'ஸ்கேன் அறிக்கை', weight: 4.0 },
      { term: 'स्कैन रिपोर्ट', weight: 4.0 },
    ],
    textKeywords: [
      { term: 'impression', weight: 3.0 },
      { term: 'findings', weight: 2.5 },
      { term: 'radiology', weight: 3.0 },
      { term: 'ultrasound', weight: 3.5 },
      { term: 'usg', weight: 3.5 },
      { term: 'x-ray', weight: 3.5 },
      { term: 'ecg', weight: 3.5 },
      { term: 'electrocardiogram', weight: 3.5 },
      { term: 'sinus rhythm', weight: 3.5 },
      { term: 'normal axis', weight: 3.0 },
      { term: 'gallbladder', weight: 2.5 },
      { term: 'fatty liver', weight: 2.5 },
      { term: 'cholelithiasis', weight: 3.0 },
      { term: 'interpretation', weight: 2.0 },
      { term: 'எக்ஸ்ரே', weight: 3.0 },
      { term: 'இதய பரிசோதனை', weight: 3.0 },
      { term: 'अल्ट्रासाउंड', weight: 3.0 },
      { term: 'ईसीजी', weight: 3.0 },
    ],
  },

  // 5. Consultation Note
  {
    category: 'consultation_note',
    filenameKeywords: [
      { term: 'consultation', weight: 4.0 },
      { term: 'opd_note', weight: 4.0 },
      { term: 'ortho_note', weight: 4.0 },
      { term: 'clinical_note', weight: 4.0 },
      { term: 'note', weight: 2.0 },
    ],
    titleKeywords: [
      { term: 'consultation note', weight: 4.5 },
      { term: 'clinical note', weight: 4.5 },
      { term: 'opd consultation note', weight: 4.5 },
      { term: 'outpatient note', weight: 4.0 },
      { term: 'ஆலோசனை குறிப்பு', weight: 4.0 },
      { term: 'परामर्श नोट', weight: 4.0 },
    ],
    textKeywords: [
      { term: 'chief complaint', weight: 3.5 },
      { term: 'history of present illness', weight: 3.5 },
      { term: 'h/o', weight: 2.5 },
      { term: 'o/e', weight: 2.5 },
      { term: 'assessment & plan', weight: 3.5 },
      { term: 'assessment', weight: 2.0 },
      { term: 'follow-up in', weight: 2.5 },
      { term: 'physical examination', weight: 2.5 },
      { term: 'clinical impression', weight: 3.0 },
      { term: 'doctor note', weight: 3.0 },
      { term: 'ஆலோசனை', weight: 2.5 },
      { term: 'தலைவலி', weight: 2.0 },
      { term: 'परामर्श', weight: 2.5 },
      { term: 'सिरदर्द', weight: 2.0 },
    ],
  },

  // 6. AYUSH Record
  {
    category: 'ayush_record',
    filenameKeywords: [
      { term: 'ayurveda', weight: 4.5 },
      { term: 'ayush', weight: 4.5 },
      { term: 'dashavidha', weight: 4.5 },
      { term: 'prakriti', weight: 4.0 },
      { term: 'siddha', weight: 4.0 },
      { term: 'unani', weight: 4.0 },
    ],
    titleKeywords: [
      { term: 'ayurveda consultation', weight: 5.0 },
      { term: 'ayush record', weight: 5.0 },
      { term: 'dashavidha pariksha', weight: 5.0 },
      { term: 'ashtavidha pariksha', weight: 5.0 },
      { term: 'ஆயுர்வேத சிகிச்சை', weight: 5.0 },
      { term: 'आयुर्वेद परामर्श', weight: 5.0 },
    ],
    textKeywords: [
      { term: 'prakriti', weight: 4.0 },
      { term: 'vikriti', weight: 4.0 },
      { term: 'agni', weight: 3.5 },
      { term: 'koshtha', weight: 3.5 },
      { term: 'dashavidha', weight: 4.0 },
      { term: 'pariksha', weight: 3.5 },
      { term: 'ayurveda', weight: 4.0 },
      { term: 'ayush', weight: 4.0 },
      { term: 'ahara', weight: 3.0 },
      { term: 'vihara', weight: 3.0 },
      { term: 'nidra', weight: 3.0 },
      { term: 'sara', weight: 2.5 },
      { term: 'samhanana', weight: 3.0 },
      { term: 'vata', weight: 3.0 },
      { term: 'pitta', weight: 3.0 },
      { term: 'kapha', weight: 3.0 },
      { term: 'vaidya', weight: 3.5 },
      { term: 'பிரகிருதி', weight: 4.0 },
      { term: 'விகிருதி', weight: 4.0 },
      { term: 'அக்னி', weight: 3.5 },
      { term: 'கொஷ்டா', weight: 3.5 },
      { term: 'प्रकृति', weight: 4.0 },
      { term: 'विकृति', weight: 4.0 },
      { term: 'अग्नि', weight: 3.5 },
      { term: 'कोष्ठ', weight: 3.5 },
    ],
  },

  // 7. Referral Note
  {
    category: 'referral_note',
    filenameKeywords: [
      { term: 'referral', weight: 4.5 },
      { term: 'referred', weight: 4.0 },
      { term: 'gastro_referral', weight: 4.5 },
    ],
    titleKeywords: [
      { term: 'referral note', weight: 5.0 },
      { term: 'referral letter', weight: 5.0 },
      { term: 'patient referral', weight: 4.5 },
      { term: 'பரிந்துரை கடிதம்', weight: 4.5 },
      { term: 'रेफरल पत्र', weight: 4.5 },
    ],
    textKeywords: [
      { term: 'referred to', weight: 4.0 },
      { term: 'referral note', weight: 4.0 },
      { term: 'referred department', weight: 3.5 },
      { term: 'specialist evaluation', weight: 3.5 },
      { term: 'reason for referral', weight: 4.0 },
      { term: 'thank you for seeing', weight: 3.5 },
      { term: 'kind attn', weight: 3.0 },
      { term: 'referring doctor', weight: 3.5 },
      { term: 'பரிந்துரைக்கப்படுகிறார்', weight: 4.0 },
      { term: 'संदर्भित किया जाता है', weight: 4.0 },
    ],
  },

  // 8. Pediatric Record
  {
    category: 'pediatric_record',
    filenameKeywords: [
      { term: 'pediatric', weight: 4.5 },
      { term: 'growth_card', weight: 4.5 },
      { term: 'immunization', weight: 4.0 },
      { term: 'vaccination', weight: 4.0 },
    ],
    titleKeywords: [
      { term: 'pediatric growth card', weight: 5.0 },
      { term: 'pediatric record', weight: 5.0 },
      { term: 'child health card', weight: 4.5 },
      { term: 'குழந்தை வளர்ச்சி அட்டை', weight: 4.5 },
      { term: 'बाल स्वास्थ्य कार्ड', weight: 4.5 },
    ],
    textKeywords: [
      { term: 'pediatric', weight: 4.0 },
      { term: 'growth card', weight: 4.0 },
      { term: 'weight percentile', weight: 4.0 },
      { term: 'height percentile', weight: 4.0 },
      { term: 'immunization record', weight: 4.0 },
      { term: 'vaccination', weight: 3.5 },
      { term: 'child health', weight: 3.5 },
      { term: 'pediatrician', weight: 3.5 },
      { term: 'head circumference', weight: 3.5 },
      { term: 'குழந்தை வளர்ச்சி', weight: 4.0 },
      { term: 'टीकाकरण', weight: 4.0 },
      { term: 'बाल रोग', weight: 4.0 },
    ],
  },
];
