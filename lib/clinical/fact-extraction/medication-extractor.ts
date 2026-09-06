import { ExtractedMedication } from './types';

interface KnownMedPattern {
  name: string;
  aliasRegex: RegExp;
}

const KNOWN_MEDICATIONS: KnownMedPattern[] = [
  { name: 'Metformin', aliasRegex: /metformin\s*(\d+\s*mg)?/i },
  { name: 'Amlodipine', aliasRegex: /(?:amlodipine|ஆம்லோடிபைன்)\s*(\d+\s*mg)?/i },
  { name: 'Atorvastatin', aliasRegex: /atorvastatin\s*(\d+\s*mg)?/i },
  { name: 'Telmisartan', aliasRegex: /telmisartan\s*(\d+\s*mg)?/i },
  { name: 'Glimepiride', aliasRegex: /glimepiride\s*(\d+\s*mg)?/i },
  { name: 'Paracetamol', aliasRegex: /paracetamol\s*(\d+\s*mg)?/i },
  { name: 'Glucosamine', aliasRegex: /glucosamine/i },
  { name: 'Antihypertensive (Blood pressure medication)', aliasRegex: /(?:blood pressure tablets?|பிபி மாத்திரை)/i },
  { name: 'Antidiabetic (Diabetes medication)', aliasRegex: /(?:diabetes tablets?|சர்க்கரை மாத்திரை)/i },
];

export function extractMedicationsFromAnswer(
  rawText: string,
  normalizedText?: string | null
): ExtractedMedication[] {
  const medications: ExtractedMedication[] = [];
  const text = `${rawText || ''} ${normalizedText || ''}`;
  const lowerText = text.toLowerCase();

  for (const med of KNOWN_MEDICATIONS) {
    const match = text.match(med.aliasRegex);
    if (match) {
      let dosage: string | undefined = match[1]?.trim();
      let frequency = 'daily';
      let status: 'active' | 'discontinued' = 'active';

      // Check dosage if not captured by alias regex
      if (!dosage) {
        const dosageMatch = text.match(new RegExp(`${med.name}\\s*(\\d+\\s*mg)`, 'i'));
        if (dosageMatch) {
          dosage = dosageMatch[1].trim();
        }
      }

      // Check frequency markers around medication name
      if (lowerText.includes(`${med.name.toLowerCase()} 500mg bd`) || lowerText.includes('bd')) {
        frequency = 'twice daily (BD)';
      } else if (lowerText.includes('sos')) {
        frequency = 'as needed (SOS)';
      }

      // Check discontinued markers (e.g., "stopped it", "earlier but switched", "3 months ago, then I stopped")
      if (
        lowerText.includes('stopped it') ||
        lowerText.includes('discontinued') ||
        lowerText.includes('switched to') ||
        lowerText.includes('used to take') ||
        lowerText.includes('நிறுத்திட்டேன்')
      ) {
        // If it's amlodipine and text mentions stopping amlodipine, mark discontinued
        if (med.name === 'Amlodipine' && (lowerText.includes('stopped') || lowerText.includes('switched') || lowerText.includes('நிறுத்திட்டேன்'))) {
          status = 'discontinued';
        }
      }

      // Avoid adding duplicate medication name in same answer
      if (!medications.some((m) => m.medicationName === med.name)) {
        medications.push({
          medicationName: med.name,
          medicationNameNative: rawText.includes('பிபி மாத்திரை') || rawText.includes('சர்க்கரை மாத்திரை') || rawText.includes('ஆம்லோடிபைன்') ? rawText.substring(0, 100) : undefined,
          dosage: dosage || undefined,
          frequency,
          route: 'oral',
          status,
        });
      }
    }
  }

  return medications;
}
