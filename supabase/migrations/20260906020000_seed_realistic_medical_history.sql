-- Migration: 20260906020000_seed_realistic_medical_history.sql
-- Description: Task #3 — Synthetic Medical History & Clinical Data Seed for MediKiosk
-- Features: 20 Encounters total, ~125 Multilingual Conversation Answers (ta/hi/en), 48 Clinical Symptoms,
--          18 Vitals, 34 Medications, 36 Lab Results, 12 Doctor-Verified Diagnoses, 4 AYUSH Assessments,
--          and Clinical Provenance registry records. All synthetic demo data.

-- ============================================================================
-- 1. ADDITIONAL LONGITUDINAL & BASE DEMO ENCOUNTERS
-- ============================================================================
INSERT INTO public.encounters (
  id, patient_id, status, intake_mode, language_code, department_mode, current_step, progress_metadata, started_at, completed_at
) VALUES
  -- Base encounters for Patient 11 & 12
  ('c1111111-1111-4111-8111-000000000011', 'a1111111-1111-4111-8111-000000000011', 'completed', 'kiosk_voice_touch', 'hi', 'ayush', 'summary', '{"step_index": 5}'::jsonb, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour' + INTERVAL '15 minutes'),
  ('c1111111-1111-4111-8111-000000000012', 'a1111111-1111-4111-8111-000000000012', 'completed', 'kiosk_voice_touch', 'en', 'standard', 'summary', '{"step_index": 5}'::jsonb, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours' + INTERVAL '20 minutes'),

  -- Ramesh Kumar (Patient 1) - Longitudinal encounters
  ('c1111111-1111-4111-8111-000000000101', 'a1111111-1111-4111-8111-000000000001', 'completed', 'kiosk_voice_touch', 'ta', 'standard', 'summary', '{"step_index": 5}'::jsonb, NOW() - INTERVAL '6 months', NOW() - INTERVAL '6 months' + INTERVAL '20 minutes'),
  ('c1111111-1111-4111-8111-000000000102', 'a1111111-1111-4111-8111-000000000001', 'completed', 'kiosk_voice_touch', 'ta', 'standard', 'summary', '{"step_index": 5}'::jsonb, NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year' + INTERVAL '25 minutes'),

  -- Rajesh Kumar Sharma (Patient 3) - Longitudinal encounters
  ('c1111111-1111-4111-8111-000000000301', 'a1111111-1111-4111-8111-000000000003', 'completed', 'kiosk_voice_touch', 'hi', 'standard', 'summary', '{"step_index": 5}'::jsonb, NOW() - INTERVAL '6 months', NOW() - INTERVAL '6 months' + INTERVAL '30 minutes'),
  ('c1111111-1111-4111-8111-000000000302', 'a1111111-1111-4111-8111-000000000003', 'completed', 'kiosk_voice_touch', 'hi', 'standard', 'summary', '{"step_index": 5}'::jsonb, NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year' + INTERVAL '20 minutes'),

  -- Vikramaditya Singh (Patient 8) - Longitudinal encounter
  ('c1111111-1111-4111-8111-000000000801', 'a1111111-1111-4111-8111-000000000008', 'completed', 'kiosk_voice_touch', 'en', 'ayush', 'summary', '{"step_index": 5}'::jsonb, NOW() - INTERVAL '8 months', NOW() - INTERVAL '8 months' + INTERVAL '35 minutes'),

  -- Sunita Devi Patel (Patient 7) - Longitudinal encounter
  ('c1111111-1111-4111-8111-000000000701', 'a1111111-1111-4111-8111-000000000007', 'completed', 'kiosk_voice_touch', 'hi', 'standard', 'summary', '{"step_index": 5}'::jsonb, NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months' + INTERVAL '20 minutes'),

  -- Robert D'Souza (Patient 12) - Additional encounter
  ('c1111111-1111-4111-8111-000000000121', 'a1111111-1111-4111-8111-000000000012', 'completed', 'kiosk_voice_touch', 'en', 'standard', 'summary', '{"step_index": 5}'::jsonb, NOW() - INTERVAL '4 months', NOW() - INTERVAL '4 months' + INTERVAL '15 minutes'),

  -- Kavita R. Gupta (Patient 11) - Additional encounter
  ('c1111111-1111-4111-8111-000000000111', 'a1111111-1111-4111-8111-000000000011', 'completed', 'kiosk_voice_touch', 'hi', 'ayush', 'summary', '{"step_index": 5}'::jsonb, NOW() - INTERVAL '5 months', NOW() - INTERVAL '5 months' + INTERVAL '25 minutes')
ON CONFLICT (id) DO UPDATE SET
  patient_id = EXCLUDED.patient_id,
  status = EXCLUDED.status,
  updated_at = NOW();


-- ============================================================================
-- 2. CLINICAL SOURCES (PROVENANCE REGISTRY)
-- ============================================================================
INSERT INTO public.clinical_sources (
  id, encounter_id, source_type, source_entity, source_entity_id, confidence_level, description
) VALUES
  ('e1111111-3333-4111-8111-000000000001', 'c1111111-1111-4111-8111-000000000001', 'patient_reported', 'conversation_answers', 'q_cardiac_01', 'high', 'Patient speech intake in Tamil regarding chest pain and shortness of breath'),
  ('e1111111-3333-4111-8111-000000000002', 'c1111111-1111-4111-8111-000000000002', 'patient_reported', 'conversation_answers', 'q_ayush_01', 'high', 'Patient reported digestive and sleep issues in Tamil'),
  ('e1111111-3333-4111-8111-000000000003', 'c1111111-1111-4111-8111-000000000003', 'abdm_imported', 'abdm_records', 'abdm_rec_918273645003', 'high', 'Historical ABDM health record import for diabetes and hypertension'),
  ('e1111111-3333-4111-8111-000000000006', 'c1111111-1111-4111-8111-000000000006', 'patient_reported', 'conversation_answers', 'q_suresh_01', 'high', 'Detailed Tamil conversational interview'),
  ('e1111111-3333-4111-8111-000000000008', 'c1111111-1111-4111-8111-000000000008', 'patient_reported', 'conversation_answers', 'q_geriatric_01', 'high', 'Elderly patient self-reported joint pain and polypharmacy')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description;


-- ============================================================================
-- 3. CONVERSATION ANSWERS (124 Multilingual Kiosk Responses)
-- ============================================================================
INSERT INTO public.conversation_answers (
  id, encounter_id, question_id, section, source_language, raw_text, normalized_english_text, input_method
) VALUES
  -- FLAGSHIP CASE 1: Ramesh Kumar (Encounter c1111111-1111-4111-8111-000000000001 - Tamil, 15 answers)
  ('f1111111-1111-4111-8111-000000000001', 'c1111111-1111-4111-8111-000000000001', 'q_chief_complaint', 'chief_complaint', 'ta', 'எனக்கு இரண்டு நாட்களாக மார்பில் வலி இருக்கிறது.', 'I have had chest pain for two days.', 'voice'),
  ('f1111111-1111-4111-8111-000000000002', 'c1111111-1111-4111-8111-000000000001', 'q_location', 'symptom_characteristics', 'ta', 'நெஞ்சின் நடுவிலும் இடது பக்கத்திலும் பாரமாக அழுத்துவது போல் இருக்கிறது.', 'It feels heavy and pressing in the center and left side of my chest.', 'voice'),
  ('f1111111-1111-4111-8111-000000000003', 'c1111111-1111-4111-8111-000000000001', 'q_severity', 'symptom_characteristics', 'ta', 'வலி 10-ல் 7 அளவு கடுமையானதாக இருக்கிறது.', 'The pain severity is about 7 out of 10.', 'touch'),
  ('f1111111-1111-4111-8111-000000000004', 'c1111111-1111-4111-8111-000000000001', 'q_onset_trigger', 'onset', 'ta', 'வேகமாக நடக்கும் போது வலி ஆரம்பிக்கிறது. 10 முதல் 15 நிமிடங்கள் நீடிக்கிறது.', 'The pain starts when walking fast. It lasts for 10 to 15 minutes.', 'voice'),
  ('f1111111-1111-4111-8111-000000000005', 'c1111111-1111-4111-8111-000000000001', 'q_relieving_factors', 'symptom_characteristics', 'ta', 'அமர்ந்து ஓய்வு எடுத்தால் வலி கொஞ்சம் குறைகிறது.', 'The pain eases slightly when I sit down and rest.', 'voice'),
  ('f1111111-1111-4111-8111-000000000006', 'c1111111-1111-4111-8111-000000000001', 'q_assoc_symptoms', 'associated_symptoms', 'ta', 'மூச்சு வாங்குதலும் அதிக வேர்வையும் ஏற்படுகிறது. சோர்வாக உள்ளது.', 'I have shortness of breath and profuse sweating. I feel very tired.', 'voice'),
  ('f1111111-1111-4111-8111-000000000007', 'c1111111-1111-4111-8111-000000000001', 'q_trauma_fever', 'associated_symptoms', 'ta', 'காயமோ காய்ச்சலோ எதுவும் இல்லை.', 'There is no injury or fever.', 'voice'),
  ('f1111111-1111-4111-8111-000000000008', 'c1111111-1111-4111-8111-000000000001', 'q_past_history', 'past_medical_history', 'ta', 'எனக்கு 8 வருடங்களாக உயர் இரத்த அழுத்தமும் 5 வருடங்களாக சர்க்கரை நோயும் உள்ளது.', 'I have had hypertension for 8 years and diabetes for 5 years.', 'voice'),
  ('f1111111-1111-4111-8111-000000000009', 'c1111111-1111-4111-8111-000000000001', 'q_family_history', 'family_history', 'ta', 'என் தந்தைக்கு இதய நோய் இருந்தது.', 'My father had heart disease.', 'voice'),
  ('f1111111-1111-4111-8111-000000000010', 'c1111111-1111-4111-8111-000000000001', 'q_lifestyle_tobacco', 'lifestyle', 'ta', 'உடற்பயிற்சி எதுவும் இல்லை. உணவில் உப்பு அதிகம் சேர்க்கிறேன். தினமும் புகையிலை உபயோகிக்கிறேன்.', 'No exercise. High salt diet. I use tobacco daily.', 'voice'),
  ('f1111111-1111-4111-8111-000000000011', 'c1111111-1111-4111-8111-000000000001', 'q_medication_current', 'medication_history', 'ta', 'பிபி மாத்திரையும் சர்க்கரை மாத்திரையும் தினமும் சாப்பிடுகிறேன்.', 'I take blood pressure and diabetes tablets daily.', 'voice'),
  ('f1111111-1111-4111-8111-000000000012', 'c1111111-1111-4111-8111-000000000001', 'q_radiation', 'symptom_characteristics', 'ta', 'வலி சில சமயம் இடது கை பக்கம் பரவுவது போல தெரிகிறது.', 'Sometimes the pain seems to radiate to my left arm.', 'voice'),
  ('f1111111-1111-4111-8111-000000000013', 'c1111111-1111-4111-8111-000000000001', 'q_duration_episodes', 'duration', 'ta', 'ஒரு நாளைக்கு 3 முதல் 4 முறை இந்த மாதிரி வலி வந்து போகிறது.', 'This pain comes and goes about 3 to 4 times a day.', 'voice'),
  ('f1111111-1111-4111-8111-000000000014', 'c1111111-1111-4111-8111-000000000001', 'q_allergies', 'past_medical_history', 'ta', 'எனக்கு எந்த மருந்து அலர்ஜியும் இல்லை.', 'I have no known drug allergies.', 'touch'),
  ('f1111111-1111-4111-8111-000000000015', 'c1111111-1111-4111-8111-000000000001', 'q_sleep_night', 'sleep', 'ta', 'வலி காரணமாக இரவில் பயமாக இருக்கிறது, சரியா தூங்க முடியல.', 'Because of the pain I feel anxious at night and cannot sleep properly.', 'voice'),

  -- FLAGSHIP CASE 2: Rajesh Kumar Sharma (Encounter c1111111-1111-4111-8111-000000000003 - Hindi, 12 answers)
  ('f1111111-1111-4111-8111-000000000021', 'c1111111-1111-4111-8111-000000000003', 'q_chief_complaint', 'chief_complaint', 'hi', 'मुझे पिछले कुछ हफ्तों से बहुत ज्यादा प्यास लग रही है और बार-बार पेशाब आता है।', 'I have been feeling excessively thirsty and urinating frequently for the past few weeks.', 'voice'),
  ('f1111111-1111-4111-8111-000000000022', 'c1111111-1111-4111-8111-000000000003', 'q_fatigue', 'associated_symptoms', 'hi', 'शरीर में बहुत कमजोरी और थकान महसूस होती है। आंखें भी धुंधली दिखती हैं।', 'I feel severe weakness and fatigue in my body. My vision also feels blurry.', 'voice'),
  ('f1111111-1111-4111-8111-000000000023', 'c1111111-1111-4111-8111-000000000003', 'q_past_history', 'past_medical_history', 'hi', 'मुझे 12 साल से डायबिटीज और 10 साल से हाई ब्लड प्रेशर है। कोलेस्ट्रॉल भी बढ़ा हुआ था।', 'I have had diabetes for 12 years and high blood pressure for 10 years. My cholesterol was also high.', 'voice'),
  ('f1111111-1111-4111-8111-000000000024', 'c1111111-1111-4111-8111-000000000003', 'q_medication_history', 'medication_history', 'hi', 'मैं रोजाना मेटफॉर्मिन 1000mg, एम्लोडिपिन 5mg और एटोरवास्टैटिन 20mg दवाइयां लेता हूं।', 'I take Metformin 1000mg, Amlodipine 5mg, and Atorvastatin 20mg daily.', 'voice'),
  ('f1111111-1111-4111-8111-000000000025', 'c1111111-1111-4111-8111-000000000003', 'q_diet_lifestyle', 'lifestyle', 'hi', 'खान-पान में परहेज नहीं हो पा रहा है। मीठा खाने का मन करता है।', 'I am unable to follow diet restrictions. I crave sweets.', 'voice'),
  ('f1111111-1111-4111-8111-000000000026', 'c1111111-1111-4111-8111-000000000003', 'q_weight_change', 'associated_symptoms', 'hi', 'पिछले 2 महीनों में 3 किलो वजन कम हो गया है।', 'I have lost 3 kg of weight in the last 2 months.', 'voice'),
  ('f1111111-1111-4111-8111-000000000027', 'c1111111-1111-4111-8111-000000000003', 'q_feet_numbness', 'associated_symptoms', 'hi', 'पैरों के तलों में झुनझुनी और चींटियां चलने जैसा महसूस होता है।', 'I feel tingling and pins-and-needles sensation in the soles of my feet.', 'voice'),
  ('f1111111-1111-4111-8111-000000000028', 'c1111111-1111-4111-8111-000000000003', 'q_night_urination', 'symptom_characteristics', 'hi', 'रात को 4 से 5 बार पेशाब के लिए उठना पड़ता है।', 'I have to get up 4 to 5 times at night for urination.', 'touch'),
  ('f1111111-1111-4111-8111-000000000029', 'c1111111-1111-4111-8111-000000000003', 'q_exercise', 'lifestyle', 'hi', 'दुकान पर बैठे रहने का काम है, कोई कसरत नहीं कर पाता।', 'I sit at my shop all day, I cannot do any exercise.', 'voice'),
  ('f1111111-1111-4111-8111-000000000030', 'c1111111-1111-4111-8111-000000000003', 'q_family_dm', 'family_history', 'hi', 'मेरी माताजी को भी शुगर की बीमारी थी।', 'My mother also had diabetes.', 'voice'),
  ('f1111111-1111-4111-8111-000000000031', 'c1111111-1111-4111-8111-000000000003', 'q_bp_check', 'past_medical_history', 'hi', 'घर पर बीपी नापने पर 150/90 आता है।', 'When I measure BP at home it comes around 150/90.', 'voice'),
  ('f1111111-1111-4111-8111-000000000032', 'c1111111-1111-4111-8111-000000000003', 'q_last_hba1c', 'past_medical_history', 'hi', '6 महीने पहले लैब टेस्ट में HbA1c 8.4 आया था।', 'In lab tests 6 months ago HbA1c was 8.4%.', 'keyboard'),

  -- FLAGSHIP CASE 3: Meena Sundaram (Encounter c1111111-1111-4111-8111-000000000002 - Tamil AYUSH, 10 answers)
  ('f1111111-1111-4111-8111-000000000041', 'c1111111-1111-4111-8111-000000000002', 'q_ayush_chief', 'chief_complaint', 'ta', 'கடந்த 6 மாதங்களாக வயிறு உப்பசம், பசியின்மை மற்றும் மலச்சிக்கல் தொந்தரவு உள்ளது.', 'I have had abdominal bloating, poor appetite, and constipation for the past 6 months.', 'voice'),
  ('f1111111-1111-4111-8111-000000000042', 'c1111111-1111-4111-8111-000000000002', 'q_ayush_diet', 'diet', 'ta', 'காலை உணவை தடுத்து விடுவேன். சரியான நேரத்திற்கு சாப்பிடுவதில்லை. டீ அதிகம் குடிப்பேன்.', 'I skip breakfast frequently. I do not eat meals on time. I drink tea heavily.', 'voice'),
  ('f1111111-1111-4111-8111-000000000043', 'c1111111-1111-4111-8111-000000000002', 'q_ayush_bowels', 'bowel_history', 'ta', 'மலம் இறுகி 2 நாட்களுக்கு ஒருமுறை தான் கழிவறைகு போக முடிகிறது.', 'Stool is hard and I can pass motion only once every 2 days.', 'voice'),
  ('f1111111-1111-4111-8111-000000000044', 'c1111111-1111-4111-8111-000000000002', 'q_ayush_sleep', 'sleep', 'ta', 'இரவில் தூக்கம் வருவதில்லை. 5 மணி நேரம் தான் தூங்குகிறேன். பகலில் சோர்வாக இருக்கிறது.', 'I have difficulty falling asleep at night. I sleep only 5 hours. I feel exhausted during the day.', 'voice'),
  ('f1111111-1111-4111-8111-000000000045', 'c1111111-1111-4111-8111-000000000002', 'q_ayush_lifestyle', 'lifestyle', 'ta', 'கணினி வேலை என்பதால் 9 மணி நேரம் ஒரே இடத்தில் அமர்ந்து பணியாற்றுகிறேன்.', 'Since I work on a computer, I sit in one place for 9 hours.', 'touch'),
  ('f1111111-1111-4111-8111-000000000046', 'c1111111-1111-4111-8111-000000000002', 'q_ayush_water', 'diet', 'ta', 'ஒரு நாளைக்கு 1 லிட்டர் தண்ணீர் கூட குடிப்பது இல்லை.', 'I do not drink even 1 liter of water per day.', 'voice'),
  ('f1111111-1111-4111-8111-000000000047', 'c1111111-1111-4111-8111-000000000002', 'q_ayush_digestion', 'symptom_characteristics', 'ta', 'சாப்பிட்டவுடன் வயிறு கனமாகி காற்று அடைத்தது போல இருக்கும்.', 'Immediately after eating my stomach feels heavy and bloated with gas.', 'voice'),
  ('f1111111-1111-4111-8111-000000000048', 'c1111111-1111-4111-8111-000000000002', 'q_ayush_screen', 'lifestyle', 'ta', 'இரவு தூங்கும் முன் 2 மணி நேரம் மொபைல் போன் பார்க்கிறேன்.', 'Before sleeping at night I use my mobile phone for 2 hours.', 'voice'),
  ('f1111111-1111-4111-8111-000000000049', 'c1111111-1111-4111-8111-000000000002', 'q_ayush_past_meds', 'medication_history', 'ta', 'நாட்டு மருந்து எதுவும் இதுவரை எடுக்கவில்லை.', 'I have not taken any traditional native medicine so far.', 'touch'),
  ('f1111111-1111-4111-8111-000000000050', 'c1111111-1111-4111-8111-000000000002', 'q_ayush_stress', 'lifestyle', 'ta', 'வேலை பளு காரணமாக மன அழுத்தம் அதிகமாக உள்ளது.', 'Due to workload, mental stress is very high.', 'voice'),

  -- FLAGSHIP CASE 4: Suresh Velu (Encounter c1111111-1111-4111-8111-000000000006 - Deep Tamil Speech Integration, 18 answers)
  ('f1111111-1111-4111-8111-000000000061', 'c1111111-1111-4111-8111-000000000006', 'q01_complaint', 'chief_complaint', 'ta', 'எனக்கு ஒரு வாரமா தலை சுற்றலும், பிடரி நரம்பு இழுத்து பிடிச்ச மாதிரியும் வலிக்குதுப்பா.', 'For one week I have had dizziness and a pulling/tight pain at the back of my neck.', 'voice'),
  ('f1111111-1111-4111-8111-000000000062', 'c1111111-1111-4111-8111-000000000006', 'q02_duration', 'duration', 'ta', 'மாலையில 4 மணிக்கு மேல வலி அதிகமாயிடும். வேலை முடிஞ்சு வரும்போது ரொம்ப கஷ்டமா இருக்கும்.', 'The pain increases after 4 PM in the evening. It is very hard when returning from work.', 'voice'),
  ('f1111111-1111-4111-8111-000000000063', 'c1111111-1111-4111-8111-000000000006', 'q03_trigger', 'symptom_characteristics', 'ta', 'வெயிலில் நடந்தாலோ அல்லது மன அழுத்தம் அதிகமானாலோ தலைவலி ஜாஸ்தியாகுது.', 'If I walk in the sun or under severe mental stress, the headache worsens.', 'voice'),
  ('f1111111-1111-4111-8111-000000000064', 'c1111111-1111-4111-8111-000000000006', 'q04_past', 'past_medical_history', 'ta', 'முன்னாடி பிரஷர் இருக்குனு டாக்டர் சொன்னாங்க, ஆனா மாத்திரை சரியா சாப்பிடல.', 'Doctor told me earlier that I have high blood pressure, but I did not take medications properly.', 'voice'),
  ('f1111111-1111-4111-8111-000000000065', 'c1111111-1111-4111-8111-000000000006', 'q05_meds', 'medication_history', 'ta', 'கடைசியா 3 மாசத்துக்கு முன்னாடி ஆம்லோடிபைன் சாப்பிட்டேன், அப்புறம் நிறுத்திட்டேன்.', 'I took Amlodipine 3 months ago, then I stopped it.', 'voice'),
  ('f1111111-1111-4111-8111-000000000066', 'c1111111-1111-4111-8111-000000000006', 'q06_sleep', 'sleep', 'ta', 'இரவில் 6 மணி நேரம் தூங்குவேன், ஆனா அடிக்கடி முழிப்பு வரும்.', 'I sleep about 6 hours at night, but wake up frequently.', 'voice'),
  ('f1111111-1111-4111-8111-000000000067', 'c1111111-1111-4111-8111-000000000006', 'q07_vision', 'associated_symptoms', 'ta', 'தலை சுற்றும்போது கண் இருட்டிட்டு வர மாதிரி இருக்கும்.', 'When dizziness occurs it feels like my eyes are blacking out.', 'voice'),
  ('f1111111-1111-4111-8111-000000000068', 'c1111111-1111-4111-8111-000000000006', 'q08_work', 'lifestyle', 'ta', 'சைட் லேபர் வேலை. ரொம்ப நேரம் வெயிலில் நிற்க வேண்டியிருக்கும்.', 'Construction site labor work. Have to stand in the sun for long hours.', 'voice'),
  ('f1111111-1111-4111-8111-000000000069', 'c1111111-1111-4111-8111-000000000006', 'q09_tea_coffee', 'diet', 'ta', 'நாளைக்கு 5-6 கப் டீ குடிப்பேன்.', 'I drink 5 to 6 cups of tea a day.', 'voice'),
  ('f1111111-1111-4111-8111-000000000070', 'c1111111-1111-4111-8111-000000000006', 'q10_chest_pain', 'associated_symptoms', 'ta', 'நெஞ்சு வலி எதுவும் இல்லை, தலை பாரம் தான் மெயின்.', 'There is no chest pain, heavy head is the main issue.', 'voice'),
  ('f1111111-1111-4111-8111-000000000071', 'c1111111-1111-4111-8111-000000000006', 'q11_nausea', 'associated_symptoms', 'ta', 'வாந்தி வர்ற மாதிரி குமட்டல் இருக்கும்.', 'I feel nauseous as if about to vomit.', 'voice'),
  ('f1111111-1111-4111-8111-000000000072', 'c1111111-1111-4111-8111-000000000006', 'q12_salt', 'diet', 'ta', 'உப்பு அதிகம் சேர்த்து சாப்பிடும் பழக்கம் உண்டு.', 'I have the habit of eating food with extra salt.', 'voice'),
  ('f1111111-1111-4111-8111-000000000073', 'c1111111-1111-4111-8111-000000000006', 'q13_smoking', 'lifestyle', 'ta', 'பீடி குடிப்பேன், ஒரு நாளைக்கு அரை பாக்கெட்.', 'I smoke bidi, about half a packet per day.', 'voice'),
  ('f1111111-1111-4111-8111-000000000074', 'c1111111-1111-4111-8111-000000000006', 'q14_ear_sound', 'associated_symptoms', 'ta', 'காதுல சில நேரம் ரின்னு சத்தம் கேட்கும்.', 'Sometimes I hear a ringing sound in my ears.', 'voice'),
  ('f1111111-1111-4111-8111-000000000075', 'c1111111-1111-4111-8111-000000000006', 'q15_family', 'family_history', 'ta', 'அப்பாவுக்கு ஸ்ட்ரோக் பக்கவாதம் வந்து இறந்துட்டாங்க.', 'Father died after suffering a stroke.', 'voice'),
  ('f1111111-1111-4111-8111-000000000076', 'c1111111-1111-4111-8111-000000000006', 'q16_water', 'diet', 'ta', 'வேலை நேரத்துல தண்ணீர் குடிக்க மறந்திடுவேன்.', 'I forget to drink water during work hours.', 'voice'),
  ('f1111111-1111-4111-8111-000000000077', 'c1111111-1111-4111-8111-000000000006', 'q17_painkiller', 'medication_history', 'ta', 'தலைவலி தாங்க முடியாம மெடிக்கல் ஷாப்ல தைலம் வாங்கி தேய்ப்பேன்.', 'Unable to bear the headache, I buy balm from medical shop and apply it.', 'voice'),
  ('f1111111-1111-4111-8111-000000000078', 'c1111111-1111-4111-8111-000000000006', 'q18_goal', 'chief_complaint', 'ta', 'பிபி செக் பண்ணி நல்ல மருந்து எழுதி தரணும் சார்.', 'Sir, please check my BP and prescribe good medicine.', 'voice'),

  -- FLAGSHIP CASE 5: Vikramaditya Singh (Encounter c1111111-1111-4111-8111-000000000008 - Elderly Polypharmacy, 12 answers)
  ('f1111111-1111-4111-8111-000000000081', 'c1111111-1111-4111-8111-000000000008', 'q_chief', 'chief_complaint', 'en', 'I am experiencing severe bilateral knee pain and stiffness in the mornings for 8 months.', 'I am experiencing severe bilateral knee pain and stiffness in the mornings for 8 months.', 'voice'),
  ('f1111111-1111-4111-8111-000000000082', 'c1111111-1111-4111-8111-000000000008', 'q_mobility', 'symptom_characteristics', 'en', 'Climbing stairs is extremely painful. Joint crackling sounds are present.', 'Climbing stairs is extremely painful. Joint crackling sounds are present.', 'voice'),
  ('f1111111-1111-4111-8111-000000000083', 'c1111111-1111-4111-8111-000000000008', 'q_past_meds', 'medication_history', 'en', 'I currently take Telmisartan 40mg, Metformin 500mg BD, Glimepiride 1mg, Paracetamol SOS, and Glucosamine supplements.', 'I currently take Telmisartan 40mg, Metformin 500mg BD, Glimepiride 1mg, Paracetamol SOS, and Glucosamine supplements.', 'keyboard'),
  ('f1111111-1111-4111-8111-000000000084', 'c1111111-1111-4111-8111-000000000008', 'q_duration_stiffness', 'symptom_characteristics', 'en', 'Morning stiffness lasts around 30 to 45 minutes every day.', 'Morning stiffness lasts around 30 to 45 minutes every day.', 'voice'),
  ('f1111111-1111-4111-8111-000000000085', 'c1111111-1111-4111-8111-000000000008', 'q_past_htn_dm', 'past_medical_history', 'en', 'I have hypertension for 15 years and osteoarthritis for 5 years.', 'I have hypertension for 15 years and osteoarthritis for 5 years.', 'voice'),
  ('f1111111-1111-4111-8111-000000000086', 'c1111111-1111-4111-8111-000000000008', 'q_previous_bp_med', 'medication_history', 'en', 'I used to take Amlodipine 5mg earlier but switched to Telmisartan 8 months ago.', 'I used to take Amlodipine 5mg earlier but switched to Telmisartan 8 months ago.', 'voice'),
  ('f1111111-1111-4111-8111-000000000087', 'c1111111-1111-4111-8111-000000000008', 'q_gi_distress', 'associated_symptoms', 'en', 'Frequent painkiller use causes mild acidity and burning in stomach.', 'Frequent painkiller use causes mild acidity and burning in stomach.', 'voice'),
  ('f1111111-1111-4111-8111-000000000088', 'c1111111-1111-4111-8111-000000000008', 'q_swelling', 'symptom_characteristics', 'en', 'Right knee has mild swelling after long walking.', 'Right knee has mild swelling after long walking.', 'voice'),
  ('f1111111-1111-4111-8111-000000000089', 'c1111111-1111-4111-8111-000000000008', 'q_walking_limit', 'lifestyle', 'en', 'I can walk only 200 meters before needing rest.', 'I can walk only 200 meters before needing rest.', 'voice'),
  ('f1111111-1111-4111-8111-000000000090', 'c1111111-1111-4111-8111-000000000008', 'q_sleep_pain', 'sleep', 'en', 'Pain wakes me up at night if I turn over suddenly.', 'Pain wakes me up at night if I turn over suddenly.', 'voice'),
  ('f1111111-1111-4111-8111-000000000091', 'c1111111-1111-4111-8111-000000000008', 'q_ayush_interest', 'ayush_assessment', 'en', 'I want Ayurvedic Janu Basti or oil therapies for long term knee relief.', 'I want Ayurvedic Janu Basti or oil therapies for long term knee relief.', 'voice'),
  ('f1111111-1111-4111-8111-000000000092', 'c1111111-1111-4111-8111-000000000008', 'q_family_arthritis', 'family_history', 'en', 'Elder sister had rheumatoid arthritis.', 'Elder sister had rheumatoid arthritis.', 'touch'),

  -- PATIENT 4: Priya Ramanathan (Encounter c1111111-1111-4111-8111-000000000004 - Tamil Pediatric, 8 answers)
  ('f1111111-1111-4111-8111-000000000101', 'c1111111-1111-4111-8111-000000000004', 'q_peds_fever', 'chief_complaint', 'ta', 'பாப்பாவுக்கு 3 நாட்களாக காய்ச்சலும் சளியும் இருமலும் உள்ளது.', 'The child has had fever, runny nose, and cough for 3 days.', 'voice'),
  ('f1111111-1111-4111-8111-000000000102', 'c1111111-1111-4111-8111-000000000004', 'q_peds_intake', 'associated_symptoms', 'ta', 'சாப்பாடு சரியாக சாப்பிடவில்லை, பால் மட்டும் குடிக்கிறாள்.', 'She is not eating food properly, drinking only milk.', 'voice'),
  ('f1111111-1111-4111-8111-000000000103', 'c1111111-1111-4111-8111-000000000004', 'q_peds_temp', 'symptom_characteristics', 'ta', 'நேற்று இரவு காய்ச்சல் 101 டிகிரி இருந்தது.', 'Yesterday night fever was 101 degrees F.', 'voice'),
  ('f1111111-1111-4111-8111-000000000104', 'c1111111-1111-4111-8111-000000000004', 'q_peds_playful', 'associated_symptoms', 'ta', 'மருந்து கொடுத்தால் காய்ச்சல் குறையுது, ஆனா குழந்தை சோர்வா படுத்துக்கிறாள்.', 'Fever drops after giving syrup, but child stays tired and lying down.', 'voice'),
  ('f1111111-1111-4111-8111-000000000105', 'c1111111-1111-4111-8111-000000000004', 'q_peds_cough_type', 'symptom_characteristics', 'ta', 'தூங்கும் போது இருமல் அதிகமா வருது.', 'Cough increases while sleeping.', 'voice'),
  ('f1111111-1111-4111-8111-000000000106', 'c1111111-1111-4111-8111-000000000004', 'q_peds_urination', 'associated_symptoms', 'ta', 'பாயி 4-5 முறை போகிறாள், சிறுநீர் நன்னா போறா.', 'Urination is normal, passes urine 4-5 times.', 'voice'),
  ('f1111111-1111-4111-8111-000000000107', 'c1111111-1111-4111-8111-000000000004', 'q_peds_meds', 'medication_history', 'ta', 'பாரசிட்டமால் சிரப் 5ml கொடுத்தேன்.', 'Given Paracetamol syrup 5ml.', 'voice'),
  ('f1111111-1111-4111-8111-000000000108', 'c1111111-1111-4111-8111-000000000004', 'q_peds_vaccine', 'past_medical_history', 'ta', 'தடுப்பூசி எல்லாம் கரெக்டா போட்டாச்சு.', 'All vaccinations are up to date.', 'touch'),

  -- PATIENT 5: Ananya S. Iyer (Encounter c1111111-1111-4111-8111-000000000005 - AYUSH Musculoskeletal, 7 answers)
  ('f1111111-1111-4111-8111-000000000111', 'c1111111-1111-4111-8111-000000000005', 'q_cervical_chief', 'chief_complaint', 'en', 'Persistent neck stiffness and shoulder soreness for 2 months due to IT work.', 'Persistent neck stiffness and shoulder soreness for 2 months due to IT work.', 'voice'),
  ('f1111111-1111-4111-8111-000000000112', 'c1111111-1111-4111-8111-000000000005', 'q_posture', 'lifestyle', 'en', 'Working 10 hours daily on laptop with forward head posture.', 'Working 10 hours daily on laptop with forward head posture.', 'voice'),
  ('f1111111-1111-4111-8111-000000000113', 'c1111111-1111-4111-8111-000000000005', 'q_radiation_arm', 'associated_symptoms', 'en', 'No tingling or radiation down the arms.', 'No tingling or radiation down the arms.', 'touch'),
  ('f1111111-1111-4111-8111-000000000114', 'c1111111-1111-4111-8111-000000000005', 'q_relief_heat', 'symptom_characteristics', 'en', 'Hot water bag gives temporary muscle relaxation.', 'Hot water bag gives temporary muscle relaxation.', 'voice'),
  ('f1111111-1111-4111-8111-000000000115', 'c1111111-1111-4111-8111-000000000005', 'q_ayush_pref', 'ayush_assessment', 'en', 'Prefer Ayurvedic oil massage (Greeva Basti) and Yoga stretches.', 'Prefer Ayurvedic oil massage (Greeva Basti) and Yoga stretches.', 'voice'),
  ('f1111111-1111-4111-8111-000000000116', 'c1111111-1111-4111-8111-000000000005', 'q_sleep_cervical', 'sleep', 'en', 'Sleep is comfortable on ergonomic contour pillow.', 'Sleep is comfortable on ergonomic contour pillow.', 'voice'),
  ('f1111111-1111-4111-8111-000000000117', 'c1111111-1111-4111-8111-000000000005', 'q_stress_neck', 'lifestyle', 'en', 'High deadline pressure causes muscle tightness.', 'High deadline pressure causes muscle tightness.', 'voice'),

  -- PATIENT 7: Sunita Devi Patel (Encounter c1111111-1111-4111-8111-000000000007 - Hindi RUQ Abdominal Pain, 8 answers)
  ('f1111111-1111-4111-8111-000000000121', 'c1111111-1111-4111-8111-000000000007', 'q_abdo_pain', 'chief_complaint', 'hi', 'पेट के ऊपरी दाहिने हिस्से में खाने के बाद तेज दर्द होता है और जी मिचलाता है।', 'I have upper right abdominal pain after eating and nausea.', 'voice'),
  ('f1111111-1111-4111-8111-000000000122', 'c1111111-1111-4111-8111-000000000007', 'q_abdo_diet', 'symptom_characteristics', 'hi', 'तला हुआ या मसालेदार खाना खाने पर दर्द बढ़ जाता है।', 'Pain increases after consuming fried or spicy food.', 'voice'),
  ('f1111111-1111-4111-8111-000000000123', 'c1111111-1111-4111-8111-000000000007', 'q_abdo_back', 'symptom_characteristics', 'hi', 'दर्द कभी-कभी पीठ की तरफ दाहिने कंधे तक जाता है।', 'Pain sometimes radiates towards the right shoulder in the back.', 'voice'),
  ('f1111111-1111-4111-8111-000000000124', 'c1111111-1111-4111-8111-000000000007', 'q_abdo_duration', 'duration', 'hi', 'दर्द 1-2 घंटे तक रहता है फिर धीरे-धीरे कम होता है।', 'Pain lasts for 1-2 hours then gradually subsides.', 'voice'),
  ('f1111111-1111-4111-8111-000000000125', 'c1111111-1111-4111-8111-000000000007', 'q_abdo_vomit', 'associated_symptoms', 'hi', 'उल्टी नहीं हुई लेकिन बहुत खट्टी डकारें आती हैं।', 'No vomiting occurred but severe sour burping is present.', 'voice'),
  ('f1111111-1111-4111-8111-000000000126', 'c1111111-1111-4111-8111-000000000007', 'q_abdo_usg', 'past_medical_history', 'hi', 'एक साल पहले सोनोग्राफी में पित्त की थैली में पथरी बताई थी।', 'Ultrasound one year ago showed gallstones in gallbladder.', 'keyboard'),
  ('f1111111-1111-4111-8111-000000000127', 'c1111111-1111-4111-8111-000000000007', 'q_abdo_meds', 'medication_history', 'hi', 'पेंटोप्राजोल एंटासिड लेती हूं।', 'I take Pantoprazole antacid.', 'voice'),
  ('f1111111-1111-4111-8111-000000000128', 'c1111111-1111-4111-8111-000000000007', 'q_abdo_fever', 'associated_symptoms', 'hi', 'बुखार या पीलिया नहीं है।', 'There is no fever or jaundice.', 'touch'),

  -- PATIENT 9: Lakshmi Narasimhan (Encounter c1111111-1111-4111-8111-000000000009 - Tamil Tension Headache, 7 answers)
  ('f1111111-1111-4111-8111-000000000141', 'c1111111-1111-4111-8111-000000000009', 'q_headache', 'chief_complaint', 'ta', 'தலைபகுதி முழுவதும் பட்டை போல் இறுக்கி பிடிக்கும் தலைவலி 4 நாட்களாக உள்ளது.', 'I have had a tight band-like headache across my entire head for 4 days.', 'voice'),
  ('f1111111-1111-4111-8111-000000000142', 'c1111111-1111-4111-8111-000000000009', 'q_headache_time', 'symptom_characteristics', 'ta', 'மாலை நேரத்தில் மன அழுத்தம் அதிகமாகும்போது தலைவலி அதிகரிக்கும்.', 'Headache worsens in the evening hours when stress increases.', 'voice'),
  ('f1111111-1111-4111-8111-000000000143', 'c1111111-1111-4111-8111-000000000009', 'q_headache_photo', 'associated_symptoms', 'ta', 'அதிக வெளிச்சமும் சத்தமும் பிடிக்கவில்லை.', 'Do not like bright light and loud noise.', 'voice'),
  ('f1111111-1111-4111-8111-000000000144', 'c1111111-1111-4111-8111-000000000009', 'q_headache_past', 'past_medical_history', 'ta', '2 வருடங்களாக மன அழுத்த தலைவலி வந்து போகும்.', 'Stress headache comes and goes for 2 years.', 'voice'),
  ('f1111111-1111-4111-8111-000000000145', 'c1111111-1111-4111-8111-000000000009', 'q_headache_bp', 'past_medical_history', 'ta', 'இரத்த அழுத்தம் செக் பண்ணினால் 150/90 இருக்கிறது.', 'When blood pressure is checked it is 150/90.', 'voice'),
  ('f1111111-1111-4111-8111-000000000146', 'c1111111-1111-4111-8111-000000000009', 'q_headache_sleep', 'sleep', 'ta', 'தூக்கம் சரியாக வரவில்லை, 5 மணி நேரம் தான்.', 'Sleep is inadequate, only 5 hours.', 'voice'),
  ('f1111111-1111-4111-8111-000000000147', 'c1111111-1111-4111-8111-000000000009', 'q_headache_balm', 'medication_history', 'ta', 'தைலம் தடவினால் கொஞ்சம் நிம்மதியா இருக்கும்.', 'Applying balm gives temporary relief.', 'touch'),

  -- PATIENT 10: Karthik Subburaj (Encounter c1111111-1111-4111-8111-000000000010 - GERD & Gastritis, 8 answers)
  ('f1111111-1111-4111-8111-000000000161', 'c1111111-1111-4111-8111-000000000010', 'q_gerd', 'chief_complaint', 'ta', 'நெஞ்செரிச்சலும் வாயில் புளிப்பு நீரும் வருகிறது. சாப்பிட்ட பின் அதிகமாகிறது.', 'I have heartburn and sour regurgitation in my mouth. It worsens after eating.', 'voice'),
  ('f1111111-1111-4111-8111-000000000162', 'c1111111-1111-4111-8111-000000000010', 'q_gerd_night', 'symptom_characteristics', 'ta', 'இரவில் படுக்கும் போது தொண்டையில் அமிலம் வருவது போல் எரிச்சல் இருக்கும்.', 'While lying down at night there is burning sensation as acid comes up throat.', 'voice'),
  ('f1111111-1111-4111-8111-000000000163', 'c1111111-1111-4111-8111-000000000010', 'q_gerd_spicy', 'diet', 'ta', 'காரமான உணவு மற்றும் இரவு தாமதமாக சாப்பிடுவது பழக்கம்.', 'Habit of eating spicy food and late night dinners.', 'voice'),
  ('f1111111-1111-4111-8111-000000000164', 'c1111111-1111-4111-8111-000000000010', 'q_gerd_duration', 'duration', 'ta', '3 வாரங்களாக இந்த தொந்தரவு அதிகமாக உள்ளது.', 'This problem has been severe for 3 weeks.', 'voice'),
  ('f1111111-1111-4111-8111-000000000165', 'c1111111-1111-4111-8111-000000000010', 'q_gerd_coffee', 'diet', 'ta', 'வேலையில் 4 கப் காபி குடிப்பேன்.', 'I drink 4 cups of coffee at work.', 'voice'),
  ('f1111111-1111-4111-8111-000000000166', 'c1111111-1111-4111-8111-000000000010', 'q_gerd_meds', 'medication_history', 'ta', 'ரபேபிரசோல் டொம்பெரிடோன் மாத்திரை சாப்பிடுகிறேன்.', 'I take Rabeprazole Domperidone tablet.', 'touch'),
  ('f1111111-1111-4111-8111-000000000167', 'c1111111-1111-4111-8111-000000000010', 'q_gerd_weight', 'associated_symptoms', 'ta', 'எடை எதுவும் குறையவில்லை.', 'No weight loss.', 'voice'),
  ('f1111111-1111-4111-8111-000000000168', 'c1111111-1111-4111-8111-000000000010', 'q_gerd_swallow', 'associated_symptoms', 'ta', 'விழுங்குவதில் சிரமம் எதுவும் இல்லை.', 'No difficulty swallowing.', 'touch'),

  -- PATIENT 11: Kavita R. Gupta (Encounter c1111111-1111-4111-8111-000000000011 - Hindi AYUSH Rhinitis, 9 answers)
  ('f1111111-1111-4111-8111-000000000181', 'c1111111-1111-4111-8111-000000000011', 'q_rhinitis_chief', 'chief_complaint', 'hi', 'सुबह उठते ही लगातार 15-20 छींकें आती हैं और नाक से पानी बहता है।', 'Constantly sneeze 15-20 times every morning upon waking up with watery nasal discharge.', 'voice'),
  ('f1111111-1111-4111-8111-000000000182', 'c1111111-1111-4111-8111-000000000011', 'q_rhinitis_dust', 'symptom_characteristics', 'hi', 'धूल-मिट्टी और ठंडी हवा से छींकें बढ़ जाती हैं।', 'Dust and cold air aggravate sneezing.', 'voice'),
  ('f1111111-1111-4111-8111-000000000183', 'c1111111-1111-4111-8111-000000000011', 'q_rhinitis_itch', 'associated_symptoms', 'hi', 'आंखों और गले में खुजली महसूस होती है।', 'Itching sensation in eyes and throat.', 'voice'),
  ('f1111111-1111-4111-8111-000000000184', 'c1111111-1111-4111-8111-000000000011', 'q_rhinitis_duration', 'duration', 'hi', '5 महीनों से मौसम बदलने पर बहुत परेशानी होती है।', 'Suffering for 5 months, especially during weather changes.', 'voice'),
  ('f1111111-1111-4111-8111-000000000185', 'c1111111-1111-4111-8111-000000000011', 'q_ayush_nasya', 'ayush_assessment', 'hi', 'आयुर्वेदिक नस्य चिकित्सा और अनु तेल के बारे में सलाह चाहिए।', 'Seek advice on Ayurvedic Nasya therapy and Anu Taila.', 'voice'),
  ('f1111111-1111-4111-8111-000000000186', 'c1111111-1111-4111-8111-000000000011', 'q_cold_drinks', 'diet', 'hi', 'ठंडा पानी या फ्रिज की चीजें खाने पर तुरंत छींकें शुरू होती हैं।', 'Drinking cold water or refrigerated food triggers instant sneezing.', 'voice'),
  ('f1111111-1111-4111-8111-000000000187', 'c1111111-1111-4111-8111-000000000011', 'q_cetirizine', 'medication_history', 'hi', 'सिटीरिज़िन गोली लेने से आराम मिलता है पर नींद आती है।', 'Taking Cetirizine tablet gives relief but causes drowsiness.', 'keyboard'),
  ('f1111111-1111-4111-8111-000000000188', 'c1111111-1111-4111-8111-000000000011', 'q_head_heaviness', 'associated_symptoms', 'hi', 'माथे में भारीपन रहता है।', 'Heaviness in forehead is present.', 'voice'),
  ('f1111111-1111-4111-8111-000000000189', 'c1111111-1111-4111-8111-000000000011', 'q_steam', 'lifestyle', 'hi', 'रोज शाम को भाप (steam) लेती हूं।', 'Take steam inhalation every evening.', 'touch'),

  -- PATIENT 12: Robert D'Souza (Encounter c1111111-1111-4111-8111-000000000012 - Routine Fatty Liver OPD, 8 answers)
  ('f1111111-1111-4111-8111-000000000201', 'c1111111-1111-4111-8111-000000000012', 'q_fatty_chief', 'chief_complaint', 'en', 'Vague right upper abdominal heaviness and fatigue for 1 month.', 'Vague right upper abdominal heaviness and fatigue for 1 month.', 'voice'),
  ('f1111111-1111-4111-8111-000000000202', 'c1111111-1111-4111-8111-000000000012', 'q_fatty_usg', 'past_medical_history', 'en', 'Ultrasound reported Grade 1 Fatty Liver (hepatic steatosis) 6 months ago.', 'Ultrasound reported Grade 1 Fatty Liver (hepatic steatosis) 6 months ago.', 'keyboard'),
  ('f1111111-1111-4111-8111-000000000203', 'c1111111-1111-4111-8111-000000000012', 'q_fatty_lipids', 'past_medical_history', 'en', 'Triglycerides were 245 mg/dL on previous health checkup.', 'Triglycerides were 245 mg/dL on previous health checkup.', 'keyboard'),
  ('f1111111-1111-4111-8111-000000000204', 'c1111111-1111-4111-8111-000000000012', 'q_fatty_meds', 'medication_history', 'en', 'Taking Rosuvastatin 10mg daily at bedtime.', 'Taking Rosuvastatin 10mg daily at bedtime.', 'voice'),
  ('f1111111-1111-4111-8111-000000000205', 'c1111111-1111-4111-8111-000000000012', 'q_fatty_alcohol', 'lifestyle', 'en', 'Social drinker, 2 drinks per week. Fast food twice a week.', 'Social drinker, 2 drinks per week. Fast food twice a week.', 'voice'),
  ('f1111111-1111-4111-8111-000000000206', 'c1111111-1111-4111-8111-000000000012', 'q_fatty_bmi', 'lifestyle', 'en', 'Overweight, BMI is 28.4.', 'Overweight, BMI is 28.4.', 'touch'),
  ('f1111111-1111-4111-8111-000000000207', 'c1111111-1111-4111-8111-000000000012', 'q_fatty_jaundice', 'associated_symptoms', 'en', 'No eye yellowing, no dark urine, no fever.', 'No eye yellowing, no dark urine, no fever.', 'voice'),
  ('f1111111-1111-4111-8111-000000000208', 'c1111111-1111-4111-8111-000000000012', 'q_fatty_goal', 'chief_complaint', 'en', 'Routine OPD follow-up for liver enzymes check.', 'Routine OPD follow-up for liver enzymes check.', 'touch')
ON CONFLICT (id) DO UPDATE SET
  raw_text = EXCLUDED.raw_text,
  normalized_english_text = EXCLUDED.normalized_english_text;


-- ============================================================================
-- 4. CLINICAL SYMPTOMS (48 Structured Symptom Facts)
-- ============================================================================
INSERT INTO public.clinical_symptoms (
  id, encounter_id, patient_id, symptom_name, symptom_name_native, body_site, severity_score, duration_text, onset_date, character_quality, aggravating_factors, relieving_factors, source_id, provenance_source, verification_status
) VALUES
  -- Ramesh Kumar (Flagship Case 1)
  ('f3333333-1111-4111-8111-000000000001', 'c1111111-1111-4111-8111-000000000001', 'a1111111-1111-4111-8111-000000000001', 'Chest Pain', 'மார்பு வலி', 'Chest - Substernal/Left', 7, '2 days', CURRENT_DATE - 2, 'Pressure / Heavy heaviness', 'Exertion, walking fast', 'Rest, sitting down', 'e1111111-3333-4111-8111-000000000001', 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000002', 'c1111111-1111-4111-8111-000000000001', 'a1111111-1111-4111-8111-000000000001', 'Shortness of Breath', 'மூச்சுத் திணறல்', 'Respiratory / Chest', 6, '2 days', CURRENT_DATE - 2, 'Exertional dyspnea', 'Walking, climbing stairs', 'Rest', 'e1111111-3333-4111-8111-000000000001', 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000003', 'c1111111-1111-4111-8111-000000000001', 'a1111111-1111-4111-8111-000000000001', 'Diaphoresis / Sweating', 'அதிக வேர்வை', 'Full Body', 5, '2 days', CURRENT_DATE - 2, 'Profuse cold sweating', 'Chest pain episodes', 'Rest', 'e1111111-3333-4111-8111-000000000001', 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000004', 'c1111111-1111-4111-8111-000000000001', 'a1111111-1111-4111-8111-000000000001', 'General Fatigue', 'சோர்வு', 'Full Body', 5, '1 week', CURRENT_DATE - 7, 'Generalized weakness', 'Physical effort', 'Sleep', 'e1111111-3333-4111-8111-000000000001', 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000005', 'c1111111-1111-4111-8111-000000000001', 'a1111111-1111-4111-8111-000000000001', 'Left Arm Radiation', 'இடது கை பரவு வலி', 'Left Upper Extremity', 5, '2 days', CURRENT_DATE - 2, 'Dull achy radiation', 'Walking', 'Rest', 'e1111111-3333-4111-8111-000000000001', 'patient_reported', 'unverified'),

  -- Rajesh Kumar Sharma (Flagship Case 2)
  ('f3333333-1111-4111-8111-000000000021', 'c1111111-1111-4111-8111-000000000003', 'a1111111-1111-4111-8111-000000000003', 'Polydipsia (Excessive Thirst)', 'अत्यधिक प्यास', 'Systemic', 6, '3 weeks', CURRENT_DATE - 21, 'Constant dry mouth and thirst', 'Sweet food consumption', 'Frequent water intake', 'e1111111-3333-4111-8111-000000000003', 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000022', 'c1111111-1111-4111-8111-000000000003', 'a1111111-1111-4111-8111-000000000003', 'Polyuria (Frequent Urination)', 'बार-बार पेशाब आना', 'Urinary tract', 6, '3 weeks', CURRENT_DATE - 21, 'Nocturia 4-5 times', 'High fluid intake', 'None', 'e1111111-3333-4111-8111-000000000003', 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000023', 'c1111111-1111-4111-8111-000000000003', 'a1111111-1111-4111-8111-000000000003', 'Blurry Vision', 'धुंधली दृष्टि', 'Eyes', 4, '2 weeks', CURRENT_DATE - 14, 'Intermittent visual blurring', 'High glucose levels', 'Resting eyes', 'e1111111-3333-4111-8111-000000000003', 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000024', 'c1111111-1111-4111-8111-000000000003', 'a1111111-1111-4111-8111-000000000003', 'Peripheral Paresthesia', 'पैरों में झुनझुनी', 'Feet / Bilateral Soles', 5, '1 month', CURRENT_DATE - 30, 'Tingling and pins-and-needles', 'Long standing', 'Elevation of feet', 'e1111111-3333-4111-8111-000000000003', 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000025', 'c1111111-1111-4111-8111-000000000003', 'a1111111-1111-4111-8111-000000000003', 'Unintentional Weight Loss', 'वजन कम होना', 'Systemic', 5, '2 months', CURRENT_DATE - 60, '3 kg loss over 2 months', 'Uncontrolled diabetes', 'Insulin/Metformin adjustment', 'e1111111-3333-4111-8111-000000000003', 'patient_reported', 'unverified'),

  -- Meena Sundaram (Flagship Case 3)
  ('f3333333-1111-4111-8111-000000000041', 'c1111111-1111-4111-8111-000000000002', 'a1111111-1111-4111-8111-000000000002', 'Abdominal Bloating (Anaha)', 'வயிறு உப்பசம்', 'Abdomen', 6, '6 months', CURRENT_DATE - 180, 'Post-prandial fullness and gas', 'Heavy meals, tea', 'Warm water', 'e1111111-3333-4111-8111-000000000002', 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000042', 'c1111111-1111-4111-8111-000000000002', 'a1111111-1111-4111-8111-000000000002', 'Constipation (Vibandha)', 'மலச்சிக்கல்', 'Gastrointestinal', 6, '6 months', CURRENT_DATE - 180, 'Hard bowel movements once in 2 days', 'Low fluid, tea', 'None', 'e1111111-3333-4111-8111-000000000002', 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000043', 'c1111111-1111-4111-8111-000000000002', 'a1111111-1111-4111-8111-000000000002', 'Initial Insomnia (Anidra)', 'தூக்கமின்மை', 'Nervous system / Mind', 5, '4 months', CURRENT_DATE - 120, 'Difficulty falling asleep', 'Screen time, late tea', 'Quiet room', 'e1111111-3333-4111-8111-000000000002', 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000044', 'c1111111-1111-4111-8111-000000000002', 'a1111111-1111-4111-8111-000000000002', 'Irregular Appetite (Vishamagni)', 'பசியின்மை', 'Gastrointestinal', 5, '6 months', CURRENT_DATE - 180, 'Fluctuating hunger, skipping breakfast', 'Irregular meal timings', 'Light soups', 'e1111111-3333-4111-8111-000000000002', 'patient_reported', 'unverified'),

  -- Suresh Velu (Flagship Case 4)
  ('f3333333-1111-4111-8111-000000000061', 'c1111111-1111-4111-8111-000000000006', 'a1111111-1111-4111-8111-000000000006', 'Occipital Headache', 'பிடரி தலைவலி', 'Head - Occipital / Neck', 7, '1 week', CURRENT_DATE - 7, 'Throbbing, band-like tightness', 'Stress, sun exposure, evening hours', 'Rest in dark room', 'e1111111-3333-4111-8111-000000000006', 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000062', 'c1111111-1111-4111-8111-000000000006', 'a1111111-1111-4111-8111-000000000006', 'Dizziness / Lightheadedness', 'தலைசுற்றல்', 'Head', 5, '1 week', CURRENT_DATE - 7, 'Postural imbalance', 'Sudden standing', 'Sitting down', 'e1111111-3333-4111-8111-000000000006', 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000063', 'c1111111-1111-4111-8111-000000000006', 'a1111111-1111-4111-8111-000000000006', 'Tinnitus (Ringing Ears)', 'காது சத்தம்', 'Ears', 4, '1 week', CURRENT_DATE - 7, 'Intermittent ringing sound', 'High blood pressure spikes', 'Rest', 'e1111111-3333-4111-8111-000000000006', 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000064', 'c1111111-1111-4111-8111-000000000006', 'a1111111-1111-4111-8111-000000000006', 'Nausea', 'குமட்டல்', 'Gastrointestinal', 4, '3 days', CURRENT_DATE - 3, 'Mild morning nausea', 'Headache intensity', 'Sipping water', 'e1111111-3333-4111-8111-000000000006', 'patient_reported', 'unverified'),

  -- Vikramaditya Singh (Flagship Case 5)
  ('f3333333-1111-4111-8111-000000000081', 'c1111111-1111-4111-8111-000000000008', 'a1111111-1111-4111-8111-000000000008', 'Bilateral Knee Joint Pain (Janu Shoola)', 'Knee Pain', 'Musculoskeletal - Knees', 7, '8 months', CURRENT_DATE - 240, 'Deep aching stiffness with crepitus', 'Stair climbing, cold weather', 'Analgesic cream, hot press', 'e1111111-3333-4111-8111-000000000008', 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000082', 'c1111111-1111-4111-8111-000000000008', 'a1111111-1111-4111-8111-000000000008', 'Morning Joint Stiffness', 'Morning Stiffness', 'Knee Joints', 6, '8 months', CURRENT_DATE - 240, 'Stiffness lasting 30-45 minutes', 'Inactivity during sleep', 'Gentle movement', 'e1111111-3333-4111-8111-000000000008', 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000083', 'c1111111-1111-4111-8111-000000000008', 'a1111111-1111-4111-8111-000000000008', 'Epigastric Burning / Acidity', 'Stomach Burning', 'Epigastrium', 5, '3 months', CURRENT_DATE - 90, 'Burning sensation post analgesics', 'NSAIDs / Paracetamol', 'Antacids, milk', 'e1111111-3333-4111-8111-000000000008', 'patient_reported', 'unverified'),

  -- Remaining Patients 4, 5, 7, 9, 10, 11, 12
  ('f3333333-1111-4111-8111-000000000101', 'c1111111-1111-4111-8111-000000000004', 'a1111111-1111-4111-8111-000000000004', 'Fever', 'காய்ச்சல்', 'Full Body', 6, '3 days', CURRENT_DATE - 3, 'High grade remittent fever', 'Night time', 'Paracetamol syrup', NULL, 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000102', 'c1111111-1111-4111-8111-000000000004', 'a1111111-1111-4111-8111-000000000004', 'Cough & Rhinorrhea', 'இருமல் சளி', 'Respiratory - Upper', 5, '3 days', CURRENT_DATE - 3, 'Clear nasal discharge, dry cough', 'Cold water', 'Warm fluids', NULL, 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000103', 'c1111111-1111-4111-8111-000000000004', 'a1111111-1111-4111-8111-000000000004', 'Loss of Appetite (Child)', 'பசியின்மை', 'Gastrointestinal', 5, '3 days', CURRENT_DATE - 3, 'Refusal of solid foods', 'Fever spikes', 'Milk intake', NULL, 'patient_reported', 'unverified'),

  ('f3333333-1111-4111-8111-000000000121', 'c1111111-1111-4111-8111-000000000005', 'a1111111-1111-4111-8111-000000000005', 'Neck Stiffness (Greeva Stambha)', 'Neck Stiffness', 'Cervical Spine', 6, '2 months', CURRENT_DATE - 60, 'Muscle spasm at nape of neck', 'Computer posture', 'Ergonomic pillow, neck stretch', NULL, 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000122', 'c1111111-1111-4111-8111-000000000005', 'a1111111-1111-4111-8111-000000000005', 'Bilateral Shoulder Soreness', 'Shoulder Stiffness', 'Shoulders', 5, '1 month', CURRENT_DATE - 30, 'Dull muscle aching', 'Long typing sessions', 'Hot shower', NULL, 'patient_reported', 'unverified'),

  ('f3333333-1111-4111-8111-000000000141', 'c1111111-1111-4111-8111-000000000007', 'a1111111-1111-4111-8111-000000000007', 'Right Upper Quadrant Abdominal Pain', 'पेट दर्द', 'Abdomen - RUQ', 7, '2 weeks', CURRENT_DATE - 14, 'Colicky pain radiating to back', 'Fatty/fried food', 'Antacids', NULL, 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000142', 'c1111111-1111-4111-8111-000000000007', 'a1111111-1111-4111-8111-000000000007', 'Nausea & Heartburn', 'जी मिचलाना', 'Gastrointestinal', 5, '2 weeks', CURRENT_DATE - 14, 'Post-meal nausea', 'Oily food', 'Sipping water', NULL, 'patient_reported', 'unverified'),

  ('f3333333-1111-4111-8111-000000000161', 'c1111111-1111-4111-8111-000000000009', 'a1111111-1111-4111-8111-000000000009', 'Tension Headache', 'தலைவலி', 'Bilateral Head', 6, '4 days', CURRENT_DATE - 4, 'Tight band-like ache', 'Noise, lack of sleep', 'Sleep', NULL, 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000162', 'c1111111-1111-4111-8111-000000000009', 'a1111111-1111-4111-8111-000000000009', 'Photophobia', 'வெளிச்சக் கூச்சம்', 'Eyes', 4, '4 days', CURRENT_DATE - 4, 'Sensitivity to bright light', 'Sunlight', 'Dark room', NULL, 'patient_reported', 'unverified'),

  ('f3333333-1111-4111-8111-000000000181', 'c1111111-1111-4111-8111-000000000010', 'a1111111-1111-4111-8111-000000000010', 'Heartburn / Retrosternal Burning', 'நெஞ்செரிச்சல்', 'Esophagus / Chest', 6, '3 weeks', CURRENT_DATE - 21, 'Burning sensation behind breastbone', 'Spicy foods, lying down', 'Antacid gel', NULL, 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000182', 'c1111111-1111-4111-8111-000000000010', 'a1111111-1111-4111-8111-000000000010', 'Acid Regurgitation', 'புளிப்பு நீர்', 'Throat', 5, '3 weeks', CURRENT_DATE - 21, 'Sour fluid tasting in throat', 'Bending forward, lying flat', 'Sitting upright', NULL, 'patient_reported', 'unverified'),

  ('f3333333-1111-4111-8111-000000000201', 'c1111111-1111-4111-8111-000000000011', 'a1111111-1111-4111-8111-000000000011', 'Allergic Sneezing & Nasal Congestion', 'छींक आना', 'Nasal Cavity / Sinuses', 6, '5 months', CURRENT_DATE - 150, 'Paroxysmal morning sneezing (10-15 bursts)', 'Dust, pollen, cold morning air', 'Steam inhalation', NULL, 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000202', 'c1111111-1111-4111-8111-000000000011', 'a1111111-1111-4111-8111-000000000011', 'Ocular Pruritus (Eye Itching)', 'आंखों में खुजली', 'Eyes', 4, '5 months', CURRENT_DATE - 150, 'Watery itching eyes', 'Dust exposure', 'Cold wash', NULL, 'patient_reported', 'unverified'),

  ('f3333333-1111-4111-8111-000000000221', 'c1111111-1111-4111-8111-000000000012', 'a1111111-1111-4111-8111-000000000012', 'Right Upper Abdominal Discomfort', 'Abdominal Discomfort', 'Liver / RUQ', 4, '1 month', CURRENT_DATE - 30, 'Vague heaviness after heavy meals', 'Alcohol, fast food', 'Rest', NULL, 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000222', 'c1111111-1111-4111-8111-000000000012', 'a1111111-1111-4111-8111-000000000012', 'Fatigue / Lethargy', 'Fatigue', 'Systemic', 4, '1 month', CURRENT_DATE - 30, 'Post-meal fatigue and slothfulness', 'Heavy lunch', 'Light walking', NULL, 'patient_reported', 'unverified'),

  -- Additional Longitudinal Symptoms for Ramesh & Rajesh (Encounter 101, 102, 301, 302)
  ('f3333333-1111-4111-8111-000000000301', 'c1111111-1111-4111-8111-000000000101', 'a1111111-1111-4111-8111-000000000001', 'Mild Exertional Breathlessness', 'மூச்சு வாங்குதல்', 'Chest', 4, '6 months ago', CURRENT_DATE - 180, 'Breathlessness only on steep climbing', 'Stairs', 'Rest', NULL, 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000302', 'c1111111-1111-4111-8111-000000000102', 'a1111111-1111-4111-8111-000000000001', 'Occasional Palpitations', 'படபடப்பு', 'Heart / Chest', 4, '1 year ago', CURRENT_DATE - 365, 'Sensation of fast heartbeat', 'Tea / Coffee', 'Deep breathing', NULL, 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000303', 'c1111111-1111-4111-8111-000000000301', 'a1111111-1111-4111-8111-000000000003', 'Mild Dry Mouth', 'सूखा मुंह', 'Mouth', 3, '6 months ago', CURRENT_DATE - 180, 'Dryness after waking up', 'Inadequate water intake', 'Water intake', NULL, 'patient_reported', 'unverified'),
  ('f3333333-1111-4111-8111-000000000304', 'c1111111-1111-4111-8111-000000000302', 'a1111111-1111-4111-8111-000000000003', 'Post-meal Drowsiness', 'सुस्ती', 'Systemic', 4, '1 year ago', CURRENT_DATE - 365, 'Drowsiness after heavy carbohydrate lunch', 'Rice meal', 'Short nap', NULL, 'patient_reported', 'unverified')
ON CONFLICT (id) DO UPDATE SET
  symptom_name = EXCLUDED.symptom_name,
  severity_score = EXCLUDED.severity_score;


-- ============================================================================
-- 5. CLINICAL VITALS (18 Plausible Records)
-- ============================================================================
INSERT INTO public.clinical_vitals (
  id, encounter_id, patient_id, systolic_bp, diastolic_bp, heart_rate_bpm, body_temperature_c, spo2_percentage, respiratory_rate, measured_at, source_id, provenance_source, verification_status
) VALUES
  ('f4444444-1111-4111-8111-000000000001', 'c1111111-1111-4111-8111-000000000001', 'a1111111-1111-4111-8111-000000000001', 158, 96, 102, 36.8, 96, 22, NOW() - INTERVAL '2 hours', 'e1111111-3333-4111-8111-000000000001', 'patient_reported', 'unverified'),
  ('f4444444-1111-4111-8111-000000000101', 'c1111111-1111-4111-8111-000000000101', 'a1111111-1111-4111-8111-000000000001', 142, 88, 84, 36.6, 98, 16, NOW() - INTERVAL '6 months', NULL, 'abdm_imported', 'reviewed'),
  ('f4444444-1111-4111-8111-000000000102', 'c1111111-1111-4111-8111-000000000102', 'a1111111-1111-4111-8111-000000000001', 138, 84, 78, 36.5, 98, 16, NOW() - INTERVAL '1 year', NULL, 'abdm_imported', 'reviewed'),
  ('f4444444-1111-4111-8111-000000000002', 'c1111111-1111-4111-8111-000000000002', 'a1111111-1111-4111-8111-000000000002', 112, 74, 72, 36.5, 99, 14, NOW() - INTERVAL '15 minutes', 'e1111111-3333-4111-8111-000000000002', 'patient_reported', 'unverified'),
  ('f4444444-1111-4111-8111-000000000003', 'c1111111-1111-4111-8111-000000000003', 'a1111111-1111-4111-8111-000000000003', 148, 92, 88, 36.7, 97, 18, NOW() - INTERVAL '1 day', 'e1111111-3333-4111-8111-000000000003', 'abdm_imported', 'reviewed'),
  ('f4444444-1111-4111-8111-000000000301', 'c1111111-1111-4111-8111-000000000301', 'a1111111-1111-4111-8111-000000000003', 138, 86, 80, 36.6, 98, 16, NOW() - INTERVAL '6 months', NULL, 'abdm_imported', 'reviewed'),
  ('f4444444-1111-4111-8111-000000000302', 'c1111111-1111-4111-8111-000000000302', 'a1111111-1111-4111-8111-000000000003', 134, 82, 76, 36.5, 99, 15, NOW() - INTERVAL '1 year', NULL, 'abdm_imported', 'reviewed'),
  ('f4444444-1111-4111-8111-000000000004', 'c1111111-1111-4111-8111-000000000004', 'a1111111-1111-4111-8111-000000000004', 102, 66, 110, 38.4, 98, 24, NOW() - INTERVAL '5 minutes', NULL, 'patient_reported', 'unverified'),
  ('f4444444-1111-4111-8111-000000000005', 'c1111111-1111-4111-8111-000000000005', 'a1111111-1111-4111-8111-000000000005', 118, 76, 74, 36.6, 99, 15, NOW() - INTERVAL '3 hours', NULL, 'patient_reported', 'unverified'),
  ('f4444444-1111-4111-8111-000000000006', 'c1111111-1111-4111-8111-000000000006', 'a1111111-1111-4111-8111-000000000006', 164, 102, 94, 36.7, 97, 20, NOW() - INTERVAL '10 minutes', 'e1111111-3333-4111-8111-000000000006', 'patient_reported', 'unverified'),
  ('f4444444-1111-4111-8111-000000000007', 'c1111111-1111-4111-8111-000000000007', 'a1111111-1111-4111-8111-000000000007', 132, 84, 82, 37.1, 98, 16, NOW() - INTERVAL '4 hours', NULL, 'patient_reported', 'unverified'),
  ('f4444444-1111-4111-8111-000000000701', 'c1111111-1111-4111-8111-000000000701', 'a1111111-1111-4111-8111-000000000007', 128, 80, 76, 36.6, 98, 16, NOW() - INTERVAL '3 months', NULL, 'abdm_imported', 'reviewed'),
  ('f4444444-1111-4111-8111-000000000008', 'c1111111-1111-4111-8111-000000000008', 'a1111111-1111-4111-8111-000000000008', 136, 82, 76, 36.5, 96, 17, NOW() - INTERVAL '8 minutes', 'e1111111-3333-4111-8111-000000000008', 'patient_reported', 'unverified'),
  ('f4444444-1111-4111-8111-000000000801', 'c1111111-1111-4111-8111-000000000801', 'a1111111-1111-4111-8111-000000000008', 144, 88, 80, 36.6, 97, 18, NOW() - INTERVAL '8 months', NULL, 'abdm_imported', 'reviewed'),
  ('f4444444-1111-4111-8111-000000000009', 'c1111111-1111-4111-8111-000000000009', 'a1111111-1111-4111-8111-000000000009', 150, 90, 80, 36.6, 98, 16, NOW() - INTERVAL '5 hours', NULL, 'patient_reported', 'unverified'),
  ('f4444444-1111-4111-8111-000000000010', 'c1111111-1111-4111-8111-000000000010', 'a1111111-1111-4111-8111-000000000010', 124, 78, 76, 36.6, 99, 14, NOW() - INTERVAL '12 minutes', NULL, 'patient_reported', 'unverified'),
  ('f4444444-1111-4111-8111-000000000011', 'c1111111-1111-4111-8111-000000000011', 'a1111111-1111-4111-8111-000000000011', 116, 74, 72, 36.6, 99, 14, NOW() - INTERVAL '1 hour', NULL, 'patient_reported', 'unverified'),
  ('f4444444-1111-4111-8111-000000000012', 'c1111111-1111-4111-8111-000000000012', 'a1111111-1111-4111-8111-000000000012', 130, 82, 74, 36.6, 98, 15, NOW() - INTERVAL '2 hours', NULL, 'patient_reported', 'unverified')
ON CONFLICT (id) DO UPDATE SET
  systolic_bp = EXCLUDED.systolic_bp,
  diastolic_bp = EXCLUDED.diastolic_bp;


-- ============================================================================
-- 6. CLINICAL MEDICATIONS (34 Realistic Medication Records)
-- ============================================================================
INSERT INTO public.clinical_medications (
  id, encounter_id, patient_id, medication_name, medication_name_native, dosage, frequency, route, status, source_id, provenance_source, verification_status, verified_by, verified_at
) VALUES
  ('f5555555-1111-4111-8111-000000000001', 'c1111111-1111-4111-8111-000000000001', 'a1111111-1111-4111-8111-000000000001', 'Amlodipine', 'ஆம்லோடிபைன்', '5 mg', 'Once daily (OD)', 'Oral', 'active', 'e1111111-3333-4111-8111-000000000001', 'patient_reported', 'unverified', NULL, NULL),
  ('f5555555-1111-4111-8111-000000000002', 'c1111111-1111-4111-8111-000000000001', 'a1111111-1111-4111-8111-000000000001', 'Metformin', 'மெட்ஃபார்மின்', '500 mg', 'Twice daily after meals (BD)', 'Oral', 'active', 'e1111111-3333-4111-8111-000000000001', 'patient_reported', 'unverified', NULL, NULL),
  ('f5555555-1111-4111-8111-000000000003', 'c1111111-1111-4111-8111-000000000001', 'a1111111-1111-4111-8111-000000000001', 'Aspirin', 'ஆஸ்பிரின்', '75 mg', 'Once daily (OD)', 'Oral', 'discontinued', 'e1111111-3333-4111-8111-000000000001', 'patient_reported', 'unverified', NULL, NULL),

  ('f5555555-1111-4111-8111-000000000021', 'c1111111-1111-4111-8111-000000000003', 'a1111111-1111-4111-8111-000000000003', 'Metformin SR', 'मेटफॉर्मिन', '1000 mg', 'Twice daily (BD)', 'Oral', 'active', 'e1111111-3333-4111-8111-000000000003', 'abdm_imported', 'doctor_verified', 'Dr. V. K. Gupta, MD', NOW() - INTERVAL '1 month'),
  ('f5555555-1111-4111-8111-000000000022', 'c1111111-1111-4111-8111-000000000003', 'a1111111-1111-4111-8111-000000000003', 'Amlodipine', 'एम्लोडिपिन', '5 mg', 'Once daily morning (OD)', 'Oral', 'active', 'e1111111-3333-4111-8111-000000000003', 'abdm_imported', 'doctor_verified', 'Dr. V. K. Gupta, MD', NOW() - INTERVAL '1 month'),
  ('f5555555-1111-4111-8111-000000000023', 'c1111111-1111-4111-8111-000000000003', 'a1111111-1111-4111-8111-000000000003', 'Atorvastatin', 'एटोरवास्टैटिन', '20 mg', 'Once daily night (HS)', 'Oral', 'active', 'e1111111-3333-4111-8111-000000000003', 'abdm_imported', 'doctor_verified', 'Dr. V. K. Gupta, MD', NOW() - INTERVAL '1 month'),
  ('f5555555-1111-4111-8111-000000000024', 'c1111111-1111-4111-8111-000000000003', 'a1111111-1111-4111-8111-000000000003', 'Glimepiride', 'ग्लेमीपिराइड', '2 mg', 'Once daily before breakfast', 'Oral', 'active', 'e1111111-3333-4111-8111-000000000003', 'patient_reported', 'unverified', NULL, NULL),

  ('f5555555-1111-4111-8111-000000000081', 'c1111111-1111-4111-8111-000000000008', 'a1111111-1111-4111-8111-000000000008', 'Telmisartan', 'Telmisartan', '40 mg', 'Once daily (OD)', 'Oral', 'active', 'e1111111-3333-4111-8111-000000000008', 'patient_reported', 'unverified', NULL, NULL),
  ('f5555555-1111-4111-8111-000000000082', 'c1111111-1111-4111-8111-000000000008', 'a1111111-1111-4111-8111-000000000008', 'Metformin', 'Metformin', '500 mg', 'Twice daily (BD)', 'Oral', 'active', 'e1111111-3333-4111-8111-000000000008', 'patient_reported', 'unverified', NULL, NULL),
  ('f5555555-1111-4111-8111-000000000083', 'c1111111-1111-4111-8111-000000000008', 'a1111111-1111-4111-8111-000000000008', 'Glimepiride', 'Glimepiride', '1 mg', 'Once daily (OD)', 'Oral', 'active', 'e1111111-3333-4111-8111-000000000008', 'patient_reported', 'unverified', NULL, NULL),
  ('f5555555-1111-4111-8111-000000000084', 'c1111111-1111-4111-8111-000000000008', 'a1111111-1111-4111-8111-000000000008', 'Paracetamol', 'Paracetamol', '650 mg', 'As needed for joint pain (SOS)', 'Oral', 'active', 'e1111111-3333-4111-8111-000000000008', 'patient_reported', 'unverified', NULL, NULL),
  ('f5555555-1111-4111-8111-000000000085', 'c1111111-1111-4111-8111-000000000008', 'a1111111-1111-4111-8111-000000000008', 'Glucosamine Sulfate', 'Glucosamine', '500 mg', 'Once daily (OD)', 'Oral', 'active', 'e1111111-3333-4111-8111-000000000008', 'patient_reported', 'unverified', NULL, NULL),
  ('f5555555-1111-4111-8111-000000000801', 'c1111111-1111-4111-8111-000000000801', 'a1111111-1111-4111-8111-000000000008', 'Amlodipine', 'Amlodipine', '5 mg', 'Once daily', 'Oral', 'discontinued', NULL, 'abdm_imported', 'doctor_verified', 'Dr. P. N. Rao, MD', NOW() - INTERVAL '8 months'),

  ('f5555555-1111-4111-8111-000000000101', 'c1111111-1111-4111-8111-000000000004', 'a1111111-1111-4111-8111-000000000004', 'Paracetamol Syrup', 'பாரசிட்டமால் சிரப்', '250mg / 5ml', '5 ml thrice daily (TDS)', 'Oral', 'active', NULL, 'patient_reported', 'unverified', NULL, NULL),
  ('f5555555-1111-4111-8111-000000000121', 'c1111111-1111-4111-8111-000000000006', 'a1111111-1111-4111-8111-000000000006', 'Amlodipine', 'ஆம்பிலோடிபைன்', '5 mg', 'Once daily', 'Oral', 'discontinued', 'e1111111-3333-4111-8111-000000000006', 'patient_reported', 'unverified', NULL, NULL),
  ('f5555555-1111-4111-8111-000000000141', 'c1111111-1111-4111-8111-000000000007', 'a1111111-1111-4111-8111-000000000007', 'Pantoprazole', 'पेन्टोप्राजोल', '40 mg', 'Once daily before food (OD)', 'Oral', 'active', NULL, 'patient_reported', 'unverified', NULL, NULL),
  ('f5555555-1111-4111-8111-000000000161', 'c1111111-1111-4111-8111-000000000010', 'a1111111-1111-4111-8111-000000000010', 'Rabeprazole + Domperidone', 'ரேபிபிரசோல்', '20mg/30mg', 'Once daily before breakfast', 'Oral', 'active', NULL, 'patient_reported', 'unverified', NULL, NULL),
  ('f5555555-1111-4111-8111-000000000181', 'c1111111-1111-4111-8111-000000000012', 'a1111111-1111-4111-8111-000000000012', 'Rosuvastatin', 'Rosuvastatin', '10 mg', 'Once daily night (HS)', 'Oral', 'active', NULL, 'patient_reported', 'unverified', NULL, NULL),

  -- Additional Medications for Other Patients (Patient 2, 9, 11)
  ('f5555555-1111-4111-8111-000000000201', 'c1111111-1111-4111-8111-000000000002', 'a1111111-1111-4111-8111-000000000002', 'Triphala Churna', 'திரிபலா சூரணம்', '5 g', 'Once daily at bedtime with warm water', 'Oral', 'active', NULL, 'patient_reported', 'unverified', NULL, NULL),
  ('f5555555-1111-4111-8111-000000000202', 'c1111111-1111-4111-8111-000000000002', 'a1111111-1111-4111-8111-000000000002', 'Hingwashtak Churna', 'ஹிங்வாஷ்டக சூரணம்', '3 g', 'Twice daily before food', 'Oral', 'active', NULL, 'patient_reported', 'unverified', NULL, NULL),
  ('f5555555-1111-4111-8111-000000000221', 'c1111111-1111-4111-8111-000000000009', 'a1111111-1111-4111-8111-000000000009', 'Naproxen', 'நாப்ராக்சன்', '250 mg', 'As needed for headache (SOS)', 'Oral', 'active', NULL, 'patient_reported', 'unverified', NULL, NULL),
  ('f5555555-1111-4111-8111-000000000241', 'c1111111-1111-4111-8111-000000000011', 'a1111111-1111-4111-8111-000000000011', 'Cetirizine', 'सिटीरिज़िन', '10 mg', 'Once daily at night (HS)', 'Oral', 'active', NULL, 'patient_reported', 'unverified', NULL, NULL),
  ('f5555555-1111-4111-8111-000000000242', 'c1111111-1111-4111-8111-000000000011', 'a1111111-1111-4111-8111-000000000011', 'Anu Taila Nasya Drop', 'अनु तेल', '2 drops', 'Twice daily each nostril', 'Nasal', 'active', NULL, 'patient_reported', 'unverified', NULL, NULL),

  -- Longitudinal Historical Meds for Rajesh (301, 302) & Ramesh (101, 102)
  ('f5555555-1111-4111-8111-000000000301', 'c1111111-1111-4111-8111-000000000301', 'a1111111-1111-4111-8111-000000000003', 'Metformin', 'मेटफॉर्मिन', '500 mg', 'Twice daily', 'Oral', 'discontinued', NULL, 'abdm_imported', 'doctor_verified', 'Dr. V. K. Gupta, MD', NOW() - INTERVAL '6 months'),
  ('f5555555-1111-4111-8111-000000000302', 'c1111111-1111-4111-8111-000000000302', 'a1111111-1111-4111-8111-000000000003', 'Glibenclamide', 'ग्लीबेन्क्लामाइड', '5 mg', 'Once daily', 'Oral', 'discontinued', NULL, 'abdm_imported', 'doctor_verified', 'Dr. V. K. Gupta, MD', NOW() - INTERVAL '1 year'),
  ('f5555555-1111-4111-8111-000000000311', 'c1111111-1111-4111-8111-000000000101', 'a1111111-1111-4111-8111-000000000001', 'Amlodipine', 'ஆம்லோடிபைன்', '5 mg', 'Once daily', 'Oral', 'active', NULL, 'abdm_imported', 'doctor_verified', 'Dr. R. Swaminathan, MD', NOW() - INTERVAL '6 months'),
  ('f5555555-1111-4111-8111-000000000312', 'c1111111-1111-4111-8111-000000000102', 'a1111111-1111-4111-8111-000000000001', 'Enalapril', 'எனலாப்ரில்', '5 mg', 'Once daily', 'Oral', 'discontinued', NULL, 'abdm_imported', 'doctor_verified', 'Dr. R. Swaminathan, MD', NOW() - INTERVAL '1 year'),
  ('f5555555-1111-4111-8111-000000000321', 'c1111111-1111-4111-8111-000000000701', 'a1111111-1111-4111-8111-000000000007', 'Ursodeoxycholic Acid', 'Ursodeoxycholic Acid', '300 mg', 'Twice daily', 'Oral', 'completed', NULL, 'abdm_imported', 'doctor_verified', 'Dr. S. K. Rastogi, MS Surg', NOW() - INTERVAL '3 months'),
  ('f5555555-1111-4111-8111-000000000322', 'c1111111-1111-4111-8111-000000000111', 'a1111111-1111-4111-8111-000000000011', 'Shadbindu Taila', 'षड्बिन्दु तेल', '2 drops', 'Nasal drop', 'Nasal', 'active', NULL, 'patient_reported', 'unverified', NULL, NULL),
  ('f5555555-1111-4111-8111-000000000323', 'c1111111-1111-4111-8111-000000000121', 'a1111111-1111-4111-8111-000000000012', 'Vitamin E Supplement', 'Vitamin E', '400 IU', 'Once daily', 'Oral', 'active', NULL, 'patient_reported', 'unverified', NULL, NULL),
  ('f5555555-1111-4111-8111-000000000324', 'c1111111-1111-4111-8111-000000000005', 'a1111111-1111-4111-8111-000000000005', 'Mahanarayana Taila', 'மகாநாராயண தைலம்', '10 ml', 'External application for neck massage', 'Topical', 'active', NULL, 'patient_reported', 'unverified', NULL, NULL),
  ('f5555555-1111-4111-8111-000000000325', 'c1111111-1111-4111-8111-000000000005', 'a1111111-1111-4111-8111-000000000005', 'Yogaraja Guggulu', 'யோகராஜ குக்குலு', '2 tablets', 'Twice daily post meals', 'Oral', 'active', NULL, 'patient_reported', 'unverified', NULL, NULL),
  ('f5555555-1111-4111-8111-000000000326', 'c1111111-1111-4111-8111-000000000004', 'a1111111-1111-4111-8111-000000000004', 'Ambroxol Syrup', 'அம்ப்ராக்சால் சிரப்', '2.5 ml', 'Twice daily', 'Oral', 'active', NULL, 'patient_reported', 'unverified', NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  medication_name = EXCLUDED.medication_name,
  dosage = EXCLUDED.dosage;


-- ============================================================================
-- 7. CLINICAL LAB RESULTS (36 Plausible Lab Observations)
-- ============================================================================
INSERT INTO public.clinical_lab_results (
  id, encounter_id, patient_id, test_name, result_value, unit, reference_range, abnormal_flag, specimen_date, source_id, provenance_source, verification_status
) VALUES
  -- Rajesh Kumar Sharma (Flagship Case 2 - Longitudinal Lab Trends)
  ('f6666666-1111-4111-8111-000000000001', 'c1111111-1111-4111-8111-000000000003', 'a1111111-1111-4111-8111-000000000003', 'Fasting Blood Glucose', '168', 'mg/dL', '70 - 99', true, CURRENT_DATE - 1, 'e1111111-3333-4111-8111-000000000003', 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000002', 'c1111111-1111-4111-8111-000000000003', 'a1111111-1111-4111-8111-000000000003', 'HbA1c', '8.9', '%', '< 5.7', true, CURRENT_DATE - 1, 'e1111111-3333-4111-8111-000000000003', 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000003', 'c1111111-1111-4111-8111-000000000003', 'a1111111-1111-4111-8111-000000000003', 'Serum Creatinine', '1.1', 'mg/dL', '0.7 - 1.3', false, CURRENT_DATE - 1, 'e1111111-3333-4111-8111-000000000003', 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000004', 'c1111111-1111-4111-8111-000000000003', 'a1111111-1111-4111-8111-000000000003', 'Total Cholesterol', '215', 'mg/dL', '< 200', true, CURRENT_DATE - 1, 'e1111111-3333-4111-8111-000000000003', 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000005', 'c1111111-1111-4111-8111-000000000003', 'a1111111-1111-4111-8111-000000000003', 'Postprandial Glucose', '242', 'mg/dL', '< 140', true, CURRENT_DATE - 1, 'e1111111-3333-4111-8111-000000000003', 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000006', 'c1111111-1111-4111-8111-000000000003', 'a1111111-1111-4111-8111-000000000003', 'Urine Microalbumin', '45', 'mg/L', '< 30', true, CURRENT_DATE - 1, 'e1111111-3333-4111-8111-000000000003', 'abdm_imported', 'reviewed'),

  ('f6666666-1111-4111-8111-000000000301', 'c1111111-1111-4111-8111-000000000301', 'a1111111-1111-4111-8111-000000000003', 'HbA1c', '8.4', '%', '< 5.7', true, CURRENT_DATE - 180, NULL, 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000302', 'c1111111-1111-4111-8111-000000000301', 'a1111111-1111-4111-8111-000000000003', 'Fasting Blood Glucose', '152', 'mg/dL', '70 - 99', true, CURRENT_DATE - 180, NULL, 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000303', 'c1111111-1111-4111-8111-000000000302', 'a1111111-1111-4111-8111-000000000003', 'HbA1c', '7.2', '%', '< 5.7', true, CURRENT_DATE - 365, NULL, 'abdm_imported', 'reviewed'),

  -- Ramesh Kumar (Flagship Case 1)
  ('f6666666-1111-4111-8111-000000000101', 'c1111111-1111-4111-8111-000000000001', 'a1111111-1111-4111-8111-000000000001', 'Random Blood Sugar', '184', 'mg/dL', '< 140', true, CURRENT_DATE - 2, 'e1111111-3333-4111-8111-000000000001', 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000102', 'c1111111-1111-4111-8111-000000000001', 'a1111111-1111-4111-8111-000000000001', 'Hemoglobin', '13.8', 'g/dL', '13.0 - 17.0', false, CURRENT_DATE - 2, 'e1111111-3333-4111-8111-000000000001', 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000103', 'c1111111-1111-4111-8111-000000000001', 'a1111111-1111-4111-8111-000000000001', 'Serum Urea', '34', 'mg/dL', '15 - 45', false, CURRENT_DATE - 2, 'e1111111-3333-4111-8111-000000000001', 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000104', 'c1111111-1111-4111-8111-000000000001', 'a1111111-1111-4111-8111-000000000001', 'Serum Creatinine', '1.0', 'mg/dL', '0.7 - 1.3', false, CURRENT_DATE - 2, 'e1111111-3333-4111-8111-000000000001', 'abdm_imported', 'reviewed'),

  -- Vikramaditya Singh (Flagship Case 5)
  ('f6666666-1111-4111-8111-000000000081', 'c1111111-1111-4111-8111-000000000008', 'a1111111-1111-4111-8111-000000000008', 'Uric Acid', '6.8', 'mg/dL', '3.5 - 7.2', false, CURRENT_DATE - 5, 'e1111111-3333-4111-8111-000000000008', 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000082', 'c1111111-1111-4111-8111-000000000008', 'a1111111-1111-4111-8111-000000000008', 'ESR (Erythrocyte Sedimentation Rate)', '28', 'mm/hr', '0 - 20', true, CURRENT_DATE - 5, 'e1111111-3333-4111-8111-000000000008', 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000083', 'c1111111-1111-4111-8111-000000000008', 'a1111111-1111-4111-8111-000000000008', 'Rheumatoid Factor (RF)', '12', 'IU/mL', '< 14', false, CURRENT_DATE - 5, 'e1111111-3333-4111-8111-000000000008', 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000084', 'c1111111-1111-4111-8111-000000000008', 'a1111111-1111-4111-8111-000000000008', 'HbA1c', '6.8', '%', '< 5.7', true, CURRENT_DATE - 5, 'e1111111-3333-4111-8111-000000000008', 'abdm_imported', 'reviewed'),

  -- Robert D'Souza (Patient 12)
  ('f6666666-1111-4111-8111-000000000121', 'c1111111-1111-4111-8111-000000000012', 'a1111111-1111-4111-8111-000000000012', 'Serum Triglycerides', '245', 'mg/dL', '< 150', true, CURRENT_DATE - 10, NULL, 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000122', 'c1111111-1111-4111-8111-000000000012', 'a1111111-1111-4111-8111-000000000012', 'SGPT / ALT', '58', 'U/L', '< 45', true, CURRENT_DATE - 10, NULL, 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000123', 'c1111111-1111-4111-8111-000000000012', 'a1111111-1111-4111-8111-000000000012', 'SGOT / AST', '42', 'U/L', '< 35', true, CURRENT_DATE - 10, NULL, 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000124', 'c1111111-1111-4111-8111-000000000012', 'a1111111-1111-4111-8111-000000000012', 'HDL Cholesterol', '38', 'mg/dL', '> 40', true, CURRENT_DATE - 10, NULL, 'abdm_imported', 'reviewed'),

  -- Other Patients (Priya 4, Sunita 7, Suresh 6, Lakshmi 9, Kavita 11)
  ('f6666666-1111-4111-8111-000000000141', 'c1111111-1111-4111-8111-000000000004', 'a1111111-1111-4111-8111-000000000004', 'Complete Blood Count (WBC)', '11.8', 'x10^3/uL', '4.0 - 11.0', true, CURRENT_DATE - 3, NULL, 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000142', 'c1111111-1111-4111-8111-000000000004', 'a1111111-1111-4111-8111-000000000004', 'Dengue NS1 Antigen', 'Negative', 'qualitative', 'Negative', false, CURRENT_DATE - 3, NULL, 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000161', 'c1111111-1111-4111-8111-000000000007', 'a1111111-1111-4111-8111-000000000007', 'Serum Bilirubin Total', '1.1', 'mg/dL', '0.3 - 1.2', false, CURRENT_DATE - 14, NULL, 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000162', 'c1111111-1111-4111-8111-000000000007', 'a1111111-1111-4111-8111-000000000007', 'Serum Alkaline Phosphatase', '145', 'U/L', '44 - 147', false, CURRENT_DATE - 14, NULL, 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000181', 'c1111111-1111-4111-8111-000000000006', 'a1111111-1111-4111-8111-000000000006', 'Serum Electrolytes (Sodium)', '141', 'mEq/L', '135 - 145', false, CURRENT_DATE - 7, NULL, 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000182', 'c1111111-1111-4111-8111-000000000006', 'a1111111-1111-4111-8111-000000000006', 'Serum Electrolytes (Potassium)', '4.2', 'mEq/L', '3.5 - 5.1', false, CURRENT_DATE - 7, NULL, 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000201', 'c1111111-1111-4111-8111-000000000009', 'a1111111-1111-4111-8111-000000000009', 'Serum TSH', '2.8', 'uIU/mL', '0.45 - 4.5', false, CURRENT_DATE - 30, NULL, 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000221', 'c1111111-1111-4111-8111-000000000011', 'a1111111-1111-4111-8111-000000000011', 'Absolute Eosinophil Count (AEC)', '520', 'cells/cu.mm', '40 - 440', true, CURRENT_DATE - 15, NULL, 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000222', 'c1111111-1111-4111-8111-000000000011', 'a1111111-1111-4111-8111-000000000011', 'Total IgE Level', '310', 'IU/mL', '< 100', true, CURRENT_DATE - 15, NULL, 'abdm_imported', 'reviewed'),

  -- Extra Longitudinal Lab Records for Ramesh 101, 102
  ('f6666666-1111-4111-8111-000000000311', 'c1111111-1111-4111-8111-000000000101', 'a1111111-1111-4111-8111-000000000001', 'HbA1c', '7.4', '%', '< 5.7', true, CURRENT_DATE - 180, NULL, 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000312', 'c1111111-1111-4111-8111-000000000102', 'a1111111-1111-4111-8111-000000000001', 'Fasting Blood Glucose', '142', 'mg/dL', '70 - 99', true, CURRENT_DATE - 365, NULL, 'abdm_imported', 'reviewed'),
  ('f6666666-1111-4111-8111-000000000321', 'c1111111-1111-4111-8111-000000000111', 'a1111111-1111-4111-8111-000000000011', 'Hemoglobin', '12.4', 'g/dL', '12.0 - 15.5', false, CURRENT_DATE - 150, NULL, 'abdm_imported', 'reviewed')
ON CONFLICT (id) DO UPDATE SET
  test_name = EXCLUDED.test_name,
  result_value = EXCLUDED.result_value;


-- ============================================================================
-- 8. CLINICAL DIAGNOSES (12 Historical Clinician-Verified Diagnoses)
-- ============================================================================
INSERT INTO public.clinical_diagnoses (
  id, encounter_id, patient_id, condition_name, icd10_code, clinical_status, verification_status, diagnosed_by, diagnosed_at, source_id, provenance_source, notes
) VALUES
  ('d1111111-2222-4111-8111-000000000001', 'c1111111-1111-4111-8111-000000000102', 'a1111111-1111-4111-8111-000000000001', 'Essential Primary Hypertension', 'I10', 'active', 'doctor_verified', 'Dr. R. Swaminathan, MD', NOW() - INTERVAL '8 years', NULL, 'abdm_imported', 'Patient diagnosed 8 years ago at General Hospital Chennai.'),
  ('d1111111-2222-4111-8111-000000000002', 'c1111111-1111-4111-8111-000000000101', 'a1111111-1111-4111-8111-000000000001', 'Type 2 Diabetes Mellitus without complications', 'E11.9', 'active', 'doctor_verified', 'Dr. R. Swaminathan, MD', NOW() - INTERVAL '5 years', NULL, 'abdm_imported', 'Diagnosed 5 years ago during routine health screening.'),
  ('d1111111-2222-4111-8111-000000000003', 'c1111111-1111-4111-8111-000000000302', 'a1111111-1111-4111-8111-000000000003', 'Type 2 Diabetes Mellitus', 'E11.9', 'active', 'doctor_verified', 'Dr. V. K. Gupta, MD', NOW() - INTERVAL '12 years', NULL, 'abdm_imported', 'Managed with Metformin and Glimepiride.'),
  ('d1111111-2222-4111-8111-000000000004', 'c1111111-1111-4111-8111-000000000302', 'a1111111-1111-4111-8111-000000000003', 'Essential Hypertension', 'I10', 'active', 'doctor_verified', 'Dr. V. K. Gupta, MD', NOW() - INTERVAL '10 years', NULL, 'abdm_imported', 'Managed with Amlodipine.'),
  ('d1111111-2222-4111-8111-000000000005', 'c1111111-1111-4111-8111-000000000301', 'a1111111-1111-4111-8111-000000000003', 'Pure Hypercholesterolemia', 'E78.0', 'active', 'doctor_verified', 'Dr. V. K. Gupta, MD', NOW() - INTERVAL '4 years', NULL, 'abdm_imported', 'Managed with Atorvastatin.'),
  ('d1111111-2222-4111-8111-000000000008', 'c1111111-1111-4111-8111-000000000801', 'a1111111-1111-4111-8111-000000000008', 'Osteoarthritis of Both Knees', 'M17.0', 'active', 'doctor_verified', 'Dr. A. K. Mehta, MS Ortho', NOW() - INTERVAL '5 years', NULL, 'abdm_imported', 'Bilateral knee joint degenerative arthritis.'),
  ('d1111111-2222-4111-8111-000000000009', 'c1111111-1111-4111-8111-000000000801', 'a1111111-1111-4111-8111-000000000008', 'Essential Hypertension', 'I10', 'active', 'doctor_verified', 'Dr. P. N. Rao, MD', NOW() - INTERVAL '15 years', NULL, 'abdm_imported', 'Long-standing hypertension.'),
  ('d1111111-2222-4111-8111-000000000007', 'c1111111-1111-4111-8111-000000000701', 'a1111111-1111-4111-8111-000000000007', 'Calculus of Gallbladder without Cholecystitis', 'K80.20', 'active', 'doctor_verified', 'Dr. S. K. Rastogi, MS Surg', NOW() - INTERVAL '1 year', NULL, 'abdm_imported', 'Asymptomatic gallstones documented on ultrasound.'),
  ('d1111111-2222-4111-8111-000000000010', 'c1111111-1111-4111-8111-000000000009', 'a1111111-1111-4111-8111-000000000009', 'Tension-type Headache', 'G44.2', 'active', 'doctor_verified', 'Dr. N. K. Pillai, MD', NOW() - INTERVAL '2 years', NULL, 'abdm_imported', 'Stress-related tension headache.'),
  ('d1111111-2222-4111-8111-000000000012', 'c1111111-1111-4111-8111-000000000121', 'a1111111-1111-4111-8111-000000000012', 'Non-alcoholic Fatty Liver Disease (Grade 1)', 'K76.0', 'active', 'doctor_verified', 'Dr. C. Fernandes, MD', NOW() - INTERVAL '6 months', NULL, 'abdm_imported', 'Ultrasound evidence of mild hepatic steatosis.'),
  ('d1111111-2222-4111-8111-000000000013', 'c1111111-1111-4111-8111-000000000111', 'a1111111-1111-4111-8111-000000000011', 'Allergic Rhinitis (Seasonal)', 'J30.2', 'active', 'doctor_verified', 'Dr. M. K. Sharma, MD ENT', NOW() - INTERVAL '1 year', NULL, 'abdm_imported', 'Allergic rhinitis with high IgE.'),
  ('d1111111-2222-4111-8111-000000000014', 'c1111111-1111-4111-8111-000000000801', 'a1111111-1111-4111-8111-000000000008', 'Type 2 Diabetes Mellitus', 'E11.9', 'active', 'doctor_verified', 'Dr. P. N. Rao, MD', NOW() - INTERVAL '6 years', NULL, 'abdm_imported', 'Elderly diabetic patient.')
ON CONFLICT (id) DO UPDATE SET
  condition_name = EXCLUDED.condition_name,
  diagnosed_by = EXCLUDED.diagnosed_by;


-- ============================================================================
-- 9. CLINICAL AYUSH ASSESSMENTS (4 Detailed Assessments)
-- ============================================================================
INSERT INTO public.clinical_ayush_assessments (
  id, encounter_id, patient_id, prakriti_dosha, vikriti_dosha, agni_type, koshtha_type, ahara_habits, dashavidha_pariksha, trividha_pariksha, ashtavidha_pariksha, source_id, provenance_source, verification_status
) VALUES
  -- Meena Sundaram (Flagship Case 3)
  ('a1111111-3333-4111-8111-000000000002', 'c1111111-1111-4111-8111-000000000002', 'a1111111-1111-4111-8111-000000000002', 'Vata-Pitta', 'Vata-Pradhana', 'Vishamagni', 'Krura Koshtha',
  '{"meal_regularity": "Irregular", "breakfast": "Frequently Skipped", "tea_consumption": "4 cups/day", "water_intake": "1.2 Liters/day", "taste_preference": "Katu & Lavana (Spicy/Salt)"}'::jsonb,
  '{"sara": "Madhyama Sara", "samhanana": "Madhyama", "pramana": "Madhyama", "satmya": "Eka-rasa satmya", "sattva": "Avara Sattva", "ahara_shakti": "Manda", "vyayama_shakti": "Avara", "vaya": "Yuvavastha (30 yrs)"}'::jsonb,
  '{"darshana": "Dry skin, pale complexion", "sparshana": "Rooksha & Sheeta Sparsha (Dry and cool skin)", "prashna": "History of irregular appetite, bloating, constipation, poor sleep"}'::jsonb,
  '{"nadi": "Vata-Pitta Nadi (Sarpadi gati)", "jihva": "Saama Jihva (White coated tongue)", "mutra": "Pita varna", "mala": "Baddha / Vibandha (Hard stool)", "shabda": "Spashta", "drik": "Rooksha", "akriti": "Krisha"}'::jsonb,
  'e1111111-3333-4111-8111-000000000002', 'patient_reported', 'unverified'),

  -- Ananya S. Iyer (Patient 5)
  ('a1111111-3333-4111-8111-000000000005', 'c1111111-1111-4111-8111-000000000005', 'a1111111-1111-4111-8111-000000000005', 'Pitta-Kapha', 'Vata-Kapha', 'Sama Agni', 'Madhyama Koshtha',
  '{"meal_regularity": "Regular", "diet_type": "Vegetarian", "water_intake": "2.5 Liters/day"}'::jsonb,
  '{"sara": "Mamsa-Asthi Sara", "samhanana": "Uttama", "pramana": "Madhyama", "satmya": "Sarva-rasa", "sattva": "Pravara Sattva", "ahara_shakti": "Uttama", "vyayama_shakti": "Madhyama", "vaya": "Yuvavastha (25 yrs)"}'::jsonb,
  '{"darshana": "Good posture, neck muscle contraction", "sparshana": "Stambha (Stiffness) at neck", "prashna": "History of desk work posture and neck pain"}'::jsonb,
  '{"nadi": "Vata-Kapha Nadi", "jihva": "Nirama (Clean tongue)", "mutra": "Normal", "mala": "Normal", "shabda": "Spashta", "drik": "Normal", "akriti": "Madhyama"}'::jsonb,
  NULL, 'patient_reported', 'unverified'),

  -- Kavita R. Gupta (Patient 11)
  ('a1111111-3333-4111-8111-000000000011', 'c1111111-1111-4111-8111-000000000011', 'a1111111-1111-4111-8111-000000000011', 'Kapha-Vata', 'Kapha-Pradhana', 'Manda Agni', 'Mridu Koshtha',
  '{"meal_regularity": "Regular", "cold_water_aggravation": "Yes", "dairy_intake": "High"}'::jsonb,
  '{"sara": "Rasa-Meda Sara", "samhanana": "Madhyama", "pramana": "Madhyama", "satmya": "Ushna Satmya", "sattva": "Madhyama", "ahara_shakti": "Madhyama", "vyayama_shakti": "Avara", "vaya": "Yuvavastha (31 yrs)"}'::jsonb,
  '{"darshana": "Edematous nasal mucosa", "sparshana": "Sheeta sparsha", "prashna": "Paroxysmal morning sneezing, watery nasal discharge"}'::jsonb,
  '{"nadi": "Kapha-Vata Nadi (Hamsadi gati)", "jihva": "Slightly coated", "mutra": "Normal", "mala": "Soft", "shabda": "Nasal tone", "drik": "Watery eyes", "akriti": "Madhyama"}'::jsonb,
  NULL, 'patient_reported', 'unverified'),

  -- Vikramaditya Singh (Patient 8 - Additional AYUSH Assessment for Joint Health)
  ('a1111111-3333-4111-8111-000000000008', 'c1111111-1111-4111-8111-000000000008', 'a1111111-1111-4111-8111-000000000008', 'Vata-Kapha', 'Vata-Pradhana (Sandhigata Vata)', 'Vishamagni', 'Krura Koshtha',
  '{"meal_regularity": "Irregular", "dry_food": "High", "water_intake": "1.5 Liters/day"}'::jsonb,
  '{"sara": "Asthi Sara", "samhanana": "Madhyama", "pramana": "Madhyama", "satmya": "Madhura-Snigdha Satmya", "sattva": "Pravara Sattva", "ahara_shakti": "Madhyama", "vyayama_shakti": "Avara", "vaya": "Vriddhavastha (68 yrs)"}'::jsonb,
  '{"darshana": "Knee joint swelling and deformation", "sparshana": "Crepitus / Atopa on movement", "prashna": "Long standing knee pain worsening in cold weather"}'::jsonb,
  '{"nadi": "Vata Nadi (Sarpadi gati)", "jihva": "Saama Jihva", "mutra": "Normal", "mala": "Kastena mala", "shabda": "Joint crackling", "drik": "Normal", "akriti": "Sthula"}'::jsonb,
  NULL, 'patient_reported', 'unverified')
ON CONFLICT (id) DO UPDATE SET
  prakriti_dosha = EXCLUDED.prakriti_dosha,
  vikriti_dosha = EXCLUDED.vikriti_dosha;
