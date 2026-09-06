import { ExtractedAyush } from './types';

export function extractAyushFromAnswer(
  rawText: string,
  normalizedText?: string | null,
  section?: string
): ExtractedAyush | undefined {
  const text = `${normalizedText || ''} ${rawText || ''}`.toLowerCase();
  
  let agniType: string | undefined = undefined;
  let koshthaType: string | undefined = undefined;
  let vikritiDosha: string | undefined = undefined;
  const aharaHabits: Record<string, unknown> = {};

  // Check Agni (Digestion fire)
  if (
    text.includes('poor appetite') ||
    text.includes('bloating') ||
    text.includes('heavy after eating') ||
    text.includes('வயிறு உப்பசம்') ||
    text.includes('பசியின்மை')
  ) {
    agniType = 'Manda Agni'; // Sluggish / Weak Digestive Fire
  }

  // Check Koshtha (Bowel tendencies)
  if (
    text.includes('constipation') ||
    text.includes('hard stool') ||
    text.includes('every 2 days') ||
    text.includes('மலச்சிக்கல்') ||
    text.includes('மலம் இறுகி')
  ) {
    koshthaType = 'Krura Koshtha'; // Hard / Costive Bowel
  }

  // Check Dosha Imbalance (Vikriti)
  if (text.includes('bloating') || text.includes('gas') || text.includes('joint pain') || text.includes('insomnia')) {
    vikritiDosha = 'Vata Dominant Imbalance';
  }

  // Check Ahara (Dietary patterns)
  if (text.includes('skip breakfast') || text.includes('தடுத்து விடுவேன்')) {
    aharaHabits.meal_regularity = 'Irregular - Frequently skips breakfast';
  }
  if (text.includes('tea heavily') || text.includes('5-6 cups of tea') || text.includes('டீ அதிகம்')) {
    aharaHabits.beverage_intake = 'Excessive Tea / Caffeine';
  }
  if (text.includes('1 liter of water') || text.includes('தண்ணீர் கூட குடிப்பது இல்லை')) {
    aharaHabits.water_intake = 'Low (< 1 Liter per day)';
  }
  if (text.includes('high salt') || text.includes('உப்பு அதிகம்')) {
    aharaHabits.taste_preference = 'High Salt (Lavana)';
  }

  if (agniType || koshthaType || vikritiDosha || Object.keys(aharaHabits).length > 0) {
    return {
      agniType,
      koshthaType,
      vikritiDosha,
      aharaHabits: Object.keys(aharaHabits).length > 0 ? aharaHabits : undefined,
    };
  }

  return undefined;
}
