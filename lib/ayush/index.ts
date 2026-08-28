/**
 * AYUSH (Ayurveda, Yoga, Unani, Siddha, Homeopathy) clinical intake helpers
 */

export interface AyushConstitution {
  prakriti?: 'Vata' | 'Pitta' | 'Kapha' | 'Vata-Pitta' | 'Pitta-Kapha' | 'Vata-Kapha' | 'Tridosha';
  ayurvedicVitals?: {
    nadi?: string;     // Pulse reading
    jihva?: string;    // Tongue assessment
    shabda?: string;   // Voice / Sound assessment
  };
}

export function evaluatePrakriti(answers: Record<string, string>): AyushConstitution {
  // Simple scoring schema for Ayurvedic Prakriti
  let vata = 0, pitta = 0, kapha = 0;
  
  Object.entries(answers).forEach(([, val]) => {
    if (val === 'vata') vata++;
    if (val === 'pitta') pitta++;
    if (val === 'kapha') kapha++;
  });
  
  let prakriti: AyushConstitution['prakriti'] = 'Tridosha';
  if (vata > pitta && vata > kapha) prakriti = 'Vata';
  else if (pitta > vata && pitta > kapha) prakriti = 'Pitta';
  else if (kapha > vata && kapha > pitta) prakriti = 'Kapha';

  return {
    prakriti,
    ayurvedicVitals: {
      nadi: 'Normal',
      jihva: 'Coating absent',
      shabda: 'Clear'
    }
  };
}
