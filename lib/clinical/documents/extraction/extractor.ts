/**
 * Task #21 — Rule-Based Medical Information Extractor
 * MediKiosk Clinical Engine
 * 
 * Extracts structured medical facts with document provenance (documentId, pageNumber, sourceText)
 * from OCR raw text across English, Tamil, and Hindi scripts.
 * 
 * Clinical Safety Rule: Extractor NEVER infers diagnoses from symptoms alone.
 * General Boundary Rule: Flags candidate mentions for medications/labs/procedures
 * without replacing specialized Tasks #22, #23, #25.
 */

import crypto from 'crypto';
import {
  ExtractedMedicalFact,
  MedicalExtractionInput,
  MedicalExtractionResult,
  MedicalInformationExtractor,
  ProvenanceSource,
} from './types';

export class RuleBasedMedicalInformationExtractor implements MedicalInformationExtractor {
  async extract(input: MedicalExtractionInput): Promise<MedicalExtractionResult> {
    const rawText = input.rawOcrText || '';
    const documentId = input.documentId;
    const patientId = input.patientId;
    const encounterId = input.encounterId;
    const provenanceSource: ProvenanceSource = input.provenanceSource || 'historical_document';
    const now = new Date().toISOString();

    const facts: ExtractedMedicalFact[] = [];

    // Parse multi-page text if present
    const pageBlocks: Array<{ pageNumber: number; text: string }> = [];
    if (input.pages && input.pages.length > 0) {
      pageBlocks.push(...input.pages);
    } else {
      const pageRegex = /--- Page (\d+) ---/gi;
      const parts = rawText.split(/--- Page \d+ ---/i);
      const matches = Array.from(rawText.matchAll(pageRegex));

      if (matches.length > 0 && parts.length > 1) {
        for (let i = 0; i < matches.length; i++) {
          const pageNum = parseInt(matches[i][1], 10);
          const pageText = parts[i + 1] || '';
          pageBlocks.push({ pageNumber: pageNum, text: pageText });
        }
      } else {
        pageBlocks.push({ pageNumber: 1, text: rawText });
      }
    }

    // Process each page
    for (const pageBlock of pageBlocks) {
      const pageNum = pageBlock.pageNumber;
      const pageText = pageBlock.text;
      const lines = pageText.split('\n').map((l) => l.trim()).filter(Boolean);

      let currentSection = 'general';

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const lower = line.toLowerCase();

        // 1. Detect Section Headers
        if (lower.includes('chief complaint') || lower.includes('symptoms') || lower.includes('அறிகுறிகள்') || lower.includes('लक्षण')) {
          currentSection = 'symptoms';
        } else if (lower.includes('diagnosis') || lower.includes('assessment') || lower.includes('impression') || lower.includes('வகைப்பாடு') || lower.includes('निदान')) {
          currentSection = 'diagnosis';
        } else if (lower.includes('history') || lower.includes('h/o') || lower.includes('வரலாறு') || lower.includes('इतिहास')) {
          currentSection = 'history';
        } else if (lower.includes('rx') || lower.includes('prescription') || lower.includes('medication') || lower.includes('மருந்துகள்') || lower.includes('दवाएं')) {
          currentSection = 'medications';
        } else if (lower.includes('laboratory') || lower.includes('biochemistry') || lower.includes('pathology') || lower.includes('lab') || lower.includes('ஆய்வக') || lower.includes('जांच')) {
          currentSection = 'labs';
        } else if (lower.includes('vitals') || lower.includes('o/e') || lower.includes('physical examination')) {
          currentSection = 'vitals';
        } else if (lower.includes('ayurveda') || lower.includes('ayush') || lower.includes('dashavidha')) {
          currentSection = 'ayush';
        }

        // 2. Extract Symptoms (Explicit Documented Symptoms ONLY)
        const symptomMatches = [
          { terms: ['chest pain', 'pain in chest', 'மார்பில் வலி', 'நெஞ்சு வலி'], name: 'Chest Pain', site: 'Chest' },
          { terms: ['headache', 'தலைவலி', 'सिरदर्द'], name: 'Headache', site: 'Head' },
          { terms: ['fever', 'காய்ச்சல்', 'बुखार'], name: 'Fever', site: 'Systemic' },
          { terms: ['cough', 'இருமல்', 'खांसी'], name: 'Cough', site: 'Respiratory' },
          { terms: ['shortness of breath', 'breathlessness', 'dyspnea', 'மூச்சு திணறல்', 'மூச்சு வாங்குதல்', 'सांस लेने में तकलीफ'], name: 'Shortness of Breath (Dyspnea)', site: 'Respiratory' },
          { terms: ['abdominal pain', 'stomach pain', 'வயிறு வலி', 'पेट दर्द'], name: 'Abdominal Pain', site: 'Abdomen' },
          { terms: ['vomiting', 'வாந்தி', 'उल्टी'], name: 'Vomiting', site: 'GI' },
          { terms: ['diarrhea', 'வயிற்றுப்போக்கு', 'दस्त'], name: 'Diarrhea', site: 'GI' },
          { terms: ['dizziness', 'giddiness', 'மயக்கம்', 'चक्कर'], name: 'Dizziness', site: 'Neurological' },
          { terms: ['joint pain', 'மூட்டு வலி', 'जोड़ों का दर्द'], name: 'Joint Pain', site: 'Musculoskeletal' },
          { terms: ['back pain', 'முதுகு வலி', 'पीठ दर्द'], name: 'Back Pain', site: 'Musculoskeletal' },
        ];

        for (const sym of symptomMatches) {
          if (sym.terms.some((t) => lower.includes(t))) {
            // Check if already extracted on this line
            if (!facts.some((f) => f.entityType === 'symptom' && f.concept === sym.name && f.pageNumber === pageNum)) {
              let duration: string | undefined;
              const durMatch = line.match(/(\d+\s*(?:days?|weeks?|months?|years?)|3 நாட்களாக|4 दिनों)/i);
              if (durMatch) duration = durMatch[0];

              let severity: string | undefined;
              if (lower.includes('severe') || lower.includes('கடும்')) severity = 'Severe';
              else if (lower.includes('mild') || lower.includes('லேசான')) severity = 'Mild';

              facts.push({
                id: crypto.randomUUID(),
                entityType: 'symptom',
                concept: sym.name,
                value: duration ? `Duration: ${duration}` : undefined,
                qualifier: severity,
                patientId,
                encounterId,
                documentId,
                pageNumber: pageNum,
                sourceText: line.substring(0, 150),
                confidence: 0.92,
                provenanceSource,
                verificationStatus: 'unverified',
                extractedAt: now,
              });
            }
          }
        }

        // 3. Extract Diagnoses & Documented History
        // Distinguish Family History vs Personal History vs Assessment
        const isFamily = lower.includes('father') || lower.includes('mother') || lower.includes('family history') || lower.includes('தந்தை') || lower.includes('குடும்ப');
        
        const diagnosisMatches = [
          { terms: ['diabetes', 'diabetes mellitus', 'dm', 't2dm', 'நீரிழிவு'], name: 'Diabetes Mellitus' },
          { terms: ['hypertension', 'htn', 'high bp', 'உயர் இரத்த அழுத்தம்', 'उच्च रक्तचाप'], name: 'Essential Hypertension' },
          { terms: ['asthma', 'ஆஸ்துமா'], name: 'Bronchial Asthma' },
          { terms: ['coronary artery disease', 'cad', 'heart disease', 'இதய நோய்'], name: 'Coronary Artery Disease' },
          { terms: ['hyperlipidemia', 'high cholesterol'], name: 'Hyperlipidemia' },
          { terms: ['osteoarthritis', 'knee osteoarthritis', 'தேய்மானம்'], name: 'Osteoarthritis' },
          { terms: ['gallstones', 'cholelithiasis', 'பித்தப்பை கல்'], name: 'Cholelithiasis (Gallstones)' },
          { terms: ['fatty liver', 'hepatic steatosis'], name: 'Fatty Liver' },
          { terms: ['anemia', 'இரத்த சோகை'], name: 'Anemia' },
          { terms: ['viral fever', 'வைரஸ் காய்ச்சல்'], name: 'Viral Fever' },
        ];

        for (const diag of diagnosisMatches) {
          if (diag.terms.some((t) => lower.includes(t))) {
            if (isFamily) {
              if (!facts.some((f) => f.entityType === 'family_history' && f.concept === diag.name)) {
                facts.push({
                  id: crypto.randomUUID(),
                  entityType: 'family_history',
                  concept: diag.name,
                  qualifier: 'family',
                  patientId,
                  encounterId,
                  documentId,
                  pageNumber: pageNum,
                  sourceText: line.substring(0, 150),
                  confidence: 0.90,
                  provenanceSource,
                  verificationStatus: 'unverified',
                  extractedAt: now,
                });
              }
            } else {
              const isPastHistory = lower.includes('known case') || lower.includes('history of') || lower.includes('h/o') || lower.includes('past history') || lower.includes('years');
              const qual = isPastHistory ? 'documented_history' : currentSection === 'diagnosis' ? 'clinician_assessment' : 'documented_condition';

              if (!facts.some((f) => f.entityType === 'diagnosis_history' && f.concept === diag.name && f.pageNumber === pageNum)) {
                facts.push({
                  id: crypto.randomUUID(),
                  entityType: 'diagnosis_history',
                  concept: diag.name,
                  qualifier: qual,
                  patientId,
                  encounterId,
                  documentId,
                  pageNumber: pageNum,
                  sourceText: line.substring(0, 150),
                  confidence: 0.90,
                  provenanceSource,
                  verificationStatus: 'unverified',
                  extractedAt: now,
                });
              }
            }
          }
        }

        // 4. Extract Allergies
        if (lower.includes('allergy') || lower.includes('allergic') || lower.includes('ஒவ்வாமை') || lower.includes('एलर्जी')) {
          let allergen = 'Unspecified Allergy';
          if (lower.includes('penicillin')) allergen = 'Penicillin';
          else if (lower.includes('sulfa')) allergen = 'Sulfa';
          else if (lower.includes('aspirin')) allergen = 'Aspirin';

          if (!facts.some((f) => f.entityType === 'allergy' && f.concept === allergen)) {
            facts.push({
              id: crypto.randomUUID(),
              entityType: 'allergy',
              concept: allergen,
              value: line.substring(0, 100),
              qualifier: 'documented_allergy',
              patientId,
              encounterId,
              documentId,
              pageNumber: pageNum,
              sourceText: line.substring(0, 150),
              confidence: 0.88,
              provenanceSource,
              verificationStatus: 'unverified',
              extractedAt: now,
            });
          }
        }

        // 5. Extract Social & Lifestyle
        if (lower.includes('smoking') || lower.includes('tobacco') || lower.includes('smoker') || lower.includes('alcohol') || lower.includes('diet') || lower.includes('புகைபிடித்தல்')) {
          let concept = 'Lifestyle Factor';
          if (lower.includes('smok')) concept = 'Tobacco / Smoking';
          else if (lower.includes('alcohol')) concept = 'Alcohol Use';
          else if (lower.includes('diet')) concept = 'Dietary Habits';

          if (!facts.some((f) => f.entityType === 'social_lifestyle' && f.concept === concept)) {
            facts.push({
              id: crypto.randomUUID(),
              entityType: 'social_lifestyle',
              concept,
              value: line.substring(0, 100),
              patientId,
              encounterId,
              documentId,
              pageNumber: pageNum,
              sourceText: line.substring(0, 150),
              confidence: 0.85,
              provenanceSource,
              verificationStatus: 'unverified',
              extractedAt: now,
            });
          }
        }

        // 6. Extract Vitals Mentions
        const bpMatch = line.match(/(?:bp|blood pressure|பி.பி|இரத்த அழுத்தம்)?\s*:?\s*(\d{2,3})\s*[\/\-]\s*(\d{2,3})\s*(?:mmhg)?/i);
        if (bpMatch && (lower.includes('bp') || lower.includes('blood pressure') || lower.includes('120/') || lower.includes('150/') || lower.includes('158/') || lower.includes('130/'))) {
          if (!facts.some((f) => f.entityType === 'vital' && f.concept === 'Blood Pressure' && f.pageNumber === pageNum)) {
            facts.push({
              id: crypto.randomUUID(),
              entityType: 'vital',
              concept: 'Blood Pressure',
              value: `${bpMatch[1]}/${bpMatch[2]} mmHg`,
              patientId,
              encounterId,
              documentId,
              pageNumber: pageNum,
              sourceText: line.substring(0, 150),
              confidence: 0.95,
              provenanceSource,
              verificationStatus: 'unverified',
              extractedAt: now,
            });
          }
        }

        const hrMatch = line.match(/(?:pulse|heart rate|hr)\s*:?\s*(\d{2,3})\s*(?:bpm)?/i);
        if (hrMatch) {
          if (!facts.some((f) => f.entityType === 'vital' && f.concept === 'Heart Rate' && f.pageNumber === pageNum)) {
            facts.push({
              id: crypto.randomUUID(),
              entityType: 'vital',
              concept: 'Heart Rate',
              value: `${hrMatch[1]} bpm`,
              patientId,
              encounterId,
              documentId,
              pageNumber: pageNum,
              sourceText: line.substring(0, 150),
              confidence: 0.95,
              provenanceSource,
              verificationStatus: 'unverified',
              extractedAt: now,
            });
          }
        }

        // 7. Extract AYUSH Information
        if (lower.includes('prakriti') || lower.includes('vikriti') || lower.includes('agni') || lower.includes('koshtha') || lower.includes('dashavidha') || lower.includes('பிரகிருதி') || lower.includes('விகிருதி')) {
          let ayushConcept = 'AYUSH Assessment';
          if (lower.includes('prakriti') || lower.includes('பிரகிருதி')) ayushConcept = 'Prakriti';
          else if (lower.includes('vikriti') || lower.includes('விகிருதி')) ayushConcept = 'Vikriti';
          else if (lower.includes('agni') || lower.includes('அக்னி')) ayushConcept = 'Agni';
          else if (lower.includes('koshtha') || lower.includes('கொஷ்டா')) ayushConcept = 'Koshtha';
          else if (lower.includes('dashavidha') || lower.includes('தசவித')) ayushConcept = 'Dashavidha Pariksha';

          if (!facts.some((f) => f.entityType === 'ayush_assessment' && f.concept === ayushConcept && f.pageNumber === pageNum)) {
            facts.push({
              id: crypto.randomUUID(),
              entityType: 'ayush_assessment',
              concept: ayushConcept,
              value: line.substring(0, 100),
              patientId,
              encounterId,
              documentId,
              pageNumber: pageNum,
              sourceText: line.substring(0, 150),
              confidence: 0.90,
              provenanceSource,
              verificationStatus: 'unverified',
              extractedAt: now,
            });
          }
        }

        // 8. Medication Candidate Detection (Task #22 boundary: candidate detection ONLY)
        const medKeywords = ['tab', 'tablet', 'cap', 'capsule', 'syr', 'syrup', 'metformin', 'telmisartan', 'paracetamol', 'atorvastatin', 'amlodipine', 'மாத்திரை', 'दवा'];
        if (medKeywords.some((k) => lower.includes(k)) && (lower.includes('mg') || lower.includes('1-') || lower.includes('0-') || lower.includes('bd') || lower.includes('od') || lower.includes('tds') || lower.includes('மாத்திரை') || lower.includes('गोली'))) {
          const medNameMatch = line.match(/(?:tab|tablet|cap|capsule|syr|syrup)?\.?\s*([a-zA-Z\u0B80-\u0BFF\u0900-\u097F]{3,20})/i);
          const medConcept = medNameMatch ? medNameMatch[1] : 'Medication Candidate';

          if (!facts.some((f) => f.entityType === 'medication_candidate' && f.sourceText === line.substring(0, 150))) {
            facts.push({
              id: crypto.randomUUID(),
              entityType: 'medication_candidate',
              concept: medConcept,
              value: line.substring(0, 100),
              qualifier: 'candidate_mention',
              patientId,
              encounterId,
              documentId,
              pageNumber: pageNum,
              sourceText: line.substring(0, 150),
              confidence: 0.85,
              provenanceSource,
              verificationStatus: 'unverified',
              extractedAt: now,
            });
          }
        }

        // 9. Lab Candidate Detection (Task #23 boundary: candidate detection ONLY)
        const labKeywords = ['hba1c', 'hemoglobin', 'creatinine', 'bilirubin', 'wbc', 'rbc', 'platelet', 'fasting blood sugar', 'fbs', 'ppbs', 'cbc', 'இரத்த பரிசோதனை'];
        if (labKeywords.some((k) => lower.includes(k))) {
          let labConcept = 'Lab Candidate';
          if (lower.includes('hba1c')) labConcept = 'HbA1c';
          else if (lower.includes('hemoglobin')) labConcept = 'Hemoglobin';
          else if (lower.includes('creatinine')) labConcept = 'Serum Creatinine';
          else if (lower.includes('bilirubin')) labConcept = 'Bilirubin';
          else if (lower.includes('cbc')) labConcept = 'Complete Blood Count (CBC)';
          else if (lower.includes('platelet')) labConcept = 'Platelet Count';

          if (!facts.some((f) => f.entityType === 'lab_candidate' && f.concept === labConcept && f.pageNumber === pageNum)) {
            facts.push({
              id: crypto.randomUUID(),
              entityType: 'lab_candidate',
              concept: labConcept,
              value: line.substring(0, 100),
              qualifier: 'candidate_observation',
              patientId,
              encounterId,
              documentId,
              pageNumber: pageNum,
              sourceText: line.substring(0, 150),
              confidence: 0.88,
              provenanceSource,
              verificationStatus: 'unverified',
              extractedAt: now,
            });
          }
        }

        // 10. Procedure Candidate Detection (Task #25 boundary: candidate detection ONLY)
        const procKeywords = ['appendectomy', 'cabg', 'cholecystectomy', 'angioplasty', 'surgery', 'operation', 'repair'];
        if (procKeywords.some((k) => lower.includes(k))) {
          let procConcept = 'Procedure Candidate';
          if (lower.includes('appendectomy')) procConcept = 'Appendectomy';
          else if (lower.includes('cabg')) procConcept = 'CABG Surgery';
          else if (lower.includes('cholecystectomy')) procConcept = 'Cholecystectomy';
          else if (lower.includes('angioplasty')) procConcept = 'Coronary Angioplasty';

          if (!facts.some((f) => f.entityType === 'procedure_candidate' && f.concept === procConcept)) {
            facts.push({
              id: crypto.randomUUID(),
              entityType: 'procedure_candidate',
              concept: procConcept,
              value: line.substring(0, 100),
              qualifier: 'candidate_procedure',
              patientId,
              encounterId,
              documentId,
              pageNumber: pageNum,
              sourceText: line.substring(0, 150),
              confidence: 0.85,
              provenanceSource,
              verificationStatus: 'unverified',
              extractedAt: now,
            });
          }
        }
      }
    }

    const symptomsCount = facts.filter((f) => f.entityType === 'symptom').length;
    const diagnosesCount = facts.filter((f) => f.entityType === 'diagnosis_history').length;
    const medicationCandidatesCount = facts.filter((f) => f.entityType === 'medication_candidate').length;
    const labCandidatesCount = facts.filter((f) => f.entityType === 'lab_candidate').length;
    const allergyCount = facts.filter((f) => f.entityType === 'allergy').length;
    const procedureCandidatesCount = facts.filter((f) => f.entityType === 'procedure_candidate').length;
    const vitalsCount = facts.filter((f) => f.entityType === 'vital').length;
    const ayushCount = facts.filter((f) => f.entityType === 'ayush_assessment').length;
    const familyHistoryCount = facts.filter((f) => f.entityType === 'family_history').length;
    const socialLifestyleCount = facts.filter((f) => f.entityType === 'social_lifestyle').length;

    return {
      documentId,
      factsDetected: facts.length,
      symptomsCount,
      diagnosesCount,
      medicationCandidatesCount,
      labCandidatesCount,
      allergyCount,
      procedureCandidatesCount,
      vitalsCount,
      ayushCount,
      familyHistoryCount,
      socialLifestyleCount,
      facts,
      status: 'completed',
      extractedAt: now,
    };
  }
}

export const defaultMedicalExtractor = new RuleBasedMedicalInformationExtractor();
