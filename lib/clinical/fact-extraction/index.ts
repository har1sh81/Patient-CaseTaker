import { createClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import { extractSymptomsFromAnswer } from './symptom-extractor';
import { extractMedicationsFromAnswer } from './medication-extractor';
import { extractVitalsFromAnswer } from './vital-extractor';
import { extractAyushFromAnswer } from './ayush-extractor';
import { ExtractionResponse, ExtractionStats, ExtractedSymptom, ExtractedMedication, ExtractedVital, ExtractedAyush } from './types';

export * from './types';

/**
 * Server-side service to extract structured clinical facts from conversation answers
 * for a specific encounter.
 * 
 * Performance Optimized & High Safety:
 * 1. Pre-fetches existing encounter facts to minimize remote HTTP round-trips.
 * 2. EXTRACTION ONLY — Never infers or creates diagnoses in clinical_diagnoses.
 * 3. All patient-reported facts remain provenance_source = 'patient_reported' & verification_status = 'unverified'.
 * 4. Idempotent — Re-running extraction will not duplicate facts.
 * 5. Respects patient consent permissions.
 */
export async function extractClinicalFactsForEncounter(
  encounterId: string
): Promise<ExtractionResponse> {
  try {
    const supabase = await createClient();

    // 1. Fetch encounter details to resolve patient_id
    const { data: encounter, error: encounterErr } = await supabase
      .from('encounters')
      .select('id, patient_id')
      .eq('id', encounterId)
      .limit(1);

    if (encounterErr || !encounter || encounter.length === 0) {
      return { success: false, error: 'Encounter not found' };
    }

    const patientId = encounter[0].patient_id;
    if (!patientId) {
      return { success: false, error: 'Encounter has no associated patient' };
    }

    // 2. Validate patient consent for health records access
    const healthRecordsConsent = await hasValidConsent(patientId, 'share_health_records');
    if (!healthRecordsConsent) {
      return {
        success: false,
        error: 'Patient consent for share_health_records is missing or revoked',
      };
    }

    // Check optional AYUSH consent
    const ayushConsent = await hasValidConsent(patientId, 'share_ayush_records');

    // 3. Fetch conversation answers for encounter
    const { data: answers, error: answersErr } = await supabase
      .from('conversation_answers')
      .select('*')
      .eq('encounter_id', encounterId)
      .order('created_at', { ascending: true });

    if (answersErr || !answers) {
      return { success: false, error: `Failed to fetch conversation answers: ${answersErr?.message}` };
    }

    // 4. Pre-fetch existing facts & sources for encounter to ensure fast idempotency checks
    const [sourcesRes, symptomsRes, medsRes, vitalsRes, ayushRes] = await Promise.all([
      supabase.from('clinical_sources').select('id, source_entity_id').eq('encounter_id', encounterId),
      supabase.from('clinical_symptoms').select('symptom_name').eq('encounter_id', encounterId),
      supabase.from('clinical_medications').select('medication_name').eq('encounter_id', encounterId),
      supabase.from('clinical_vitals').select('id').eq('encounter_id', encounterId),
      supabase.from('clinical_ayush_assessments').select('id').eq('encounter_id', encounterId),
    ]);

    const sourceMap = new Map<string, string>();
    (sourcesRes.data || []).forEach((s) => {
      if (s.source_entity_id) sourceMap.set(s.source_entity_id, s.id);
    });

    const existingSymptomNames = new Set((symptomsRes.data || []).map((s) => s.symptom_name.toLowerCase()));
    const existingMedNames = new Set((medsRes.data || []).map((m) => m.medication_name.toLowerCase()));
    const hasVitals = (vitalsRes.data || []).length > 0;
    const hasAyush = (ayushRes.data || []).length > 0;

    const newSymptomsToInsert: any[] = [];
    const newMedsToInsert: any[] = [];
    const newVitalsToInsert: any[] = [];
    let newAyushToInsert: any = null;

    let totalSymptoms = 0;
    let totalMedications = 0;
    let totalVitals = 0;
    let totalAyush = 0;

    for (const answer of answers) {
      // Resolve source_id from map or create one
      let sourceId = answer.source_id || sourceMap.get(answer.id);
      if (!sourceId) {
        const { data: newSource } = await supabase
          .from('clinical_sources')
          .insert({
            encounter_id: encounterId,
            source_type: 'patient_reported',
            source_entity: 'conversation_answers',
            source_entity_id: answer.id,
            confidence_level: 'high',
            description: `Extracted facts from conversation answer (${answer.question_id})`,
          })
          .select('id')
          .single();

        if (newSource) {
          sourceId = newSource.id;
          sourceMap.set(answer.id, sourceId);
        }
      }

      // A. Symptoms
      const symptoms = extractSymptomsFromAnswer(
        answer.raw_text,
        answer.normalized_english_text,
        answer.section,
        answer.question_id,
        answer.source_language
      );

      for (const symptom of symptoms) {
        totalSymptoms++;
        const symKey = symptom.symptomName.toLowerCase();
        if (!existingSymptomNames.has(symKey)) {
          existingSymptomNames.add(symKey);
          newSymptomsToInsert.push({
            encounter_id: encounterId,
            patient_id: patientId,
            symptom_name: symptom.symptomName,
            symptom_name_native: symptom.symptomNameNative,
            body_site: symptom.bodySite,
            severity_score: symptom.severityScore,
            duration_text: symptom.durationText,
            character_quality: symptom.characterQuality,
            aggravating_factors: symptom.aggravatingFactors,
            relieving_factors: symptom.relievingFactors,
            source_id: sourceId,
            provenance_source: 'patient_reported',
            verification_status: 'unverified',
          });
        }
      }

      // B. Medications
      const medications = extractMedicationsFromAnswer(
        answer.raw_text,
        answer.normalized_english_text
      );

      for (const med of medications) {
        totalMedications++;
        const medKey = med.medicationName.toLowerCase();
        if (!existingMedNames.has(medKey)) {
          existingMedNames.add(medKey);
          newMedsToInsert.push({
            encounter_id: encounterId,
            patient_id: patientId,
            medication_name: med.medicationName,
            medication_name_native: med.medicationNameNative,
            dosage: med.dosage,
            frequency: med.frequency,
            route: med.route || 'oral',
            status: med.status || 'active',
            source_id: sourceId,
            provenance_source: 'patient_reported',
            verification_status: 'unverified',
          });
        }
      }

      // C. Vitals
      const vitals = extractVitalsFromAnswer(
        answer.raw_text,
        answer.normalized_english_text
      );

      for (const vital of vitals) {
        totalVitals++;
        if (!hasVitals && newVitalsToInsert.length === 0) {
          newVitalsToInsert.push({
            encounter_id: encounterId,
            patient_id: patientId,
            systolic_bp: vital.systolicBp,
            diastolic_bp: vital.diastolicBp,
            heart_rate_bpm: vital.heartRateBpm,
            body_temperature_c: vital.bodyTemperatureC,
            spo2_percentage: vital.spo2Percentage,
            source_id: sourceId,
            provenance_source: 'patient_reported',
            verification_status: 'unverified',
          });
        }
      }

      // D. AYUSH
      if (ayushConsent && !hasAyush && !newAyushToInsert) {
        const ayushFact = extractAyushFromAnswer(
          answer.raw_text,
          answer.normalized_english_text,
          answer.section
        );

        if (ayushFact) {
          totalAyush++;
          newAyushToInsert = {
            encounter_id: encounterId,
            patient_id: patientId,
            agni_type: ayushFact.agniType,
            koshtha_type: ayushFact.koshthaType,
            vikriti_dosha: ayushFact.vikritiDosha,
            ahara_habits: ayushFact.aharaHabits || {},
            source_id: sourceId,
            provenance_source: 'patient_reported',
            verification_status: 'unverified',
          };
        }
      }
    }

    // Execute bulk insertions
    let factsCreated = 0;

    if (newSymptomsToInsert.length > 0) {
      const { error: symErr } = await supabase.from('clinical_symptoms').insert(newSymptomsToInsert);
      if (!symErr) factsCreated += newSymptomsToInsert.length;
    }

    if (newMedsToInsert.length > 0) {
      const { error: medErr } = await supabase.from('clinical_medications').insert(newMedsToInsert);
      if (!medErr) factsCreated += newMedsToInsert.length;
    }

    if (newVitalsToInsert.length > 0) {
      const { error: vitErr } = await supabase.from('clinical_vitals').insert(newVitalsToInsert);
      if (!vitErr) factsCreated += newVitalsToInsert.length;
    }

    if (newAyushToInsert) {
      const { error: ayuErr } = await supabase.from('clinical_ayush_assessments').insert(newAyushToInsert);
      if (!ayuErr) factsCreated += 1;
    }

    const stats: ExtractionStats = {
      answersProcessed: answers.length,
      symptomsExtracted: totalSymptoms,
      medicationsExtracted: totalMedications,
      vitalsExtracted: totalVitals,
      ayushExtracted: totalAyush,
      factsCreated,
    };

    return {
      success: true,
      data: stats,
    };
  } catch (err: any) {
    console.error('[Fact Extraction Service] Error:', err);
    return { success: false, error: err.message || 'Internal extraction failure' };
  }
}

/**
 * Convenience wrapper to extract facts for a single answer ID's encounter
 */
export async function extractClinicalFactsFromConversation(
  answerId: string
): Promise<ExtractionResponse> {
  try {
    const supabase = await createClient();

    const { data: answer, error } = await supabase
      .from('conversation_answers')
      .select('encounter_id')
      .eq('id', answerId)
      .limit(1);

    if (error || !answer || answer.length === 0) {
      return { success: false, error: 'Conversation answer not found or missing encounter ID' };
    }

    return extractClinicalFactsForEncounter(answer[0].encounter_id);
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch conversation answer' };
  }
}
