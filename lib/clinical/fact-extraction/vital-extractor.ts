import { ExtractedVital } from './types';

export function extractVitalsFromAnswer(
  rawText: string,
  normalizedText?: string | null
): ExtractedVital[] {
  const vitals: ExtractedVital[] = [];
  const text = `${normalizedText || ''} ${rawText || ''}`;

  // Extract BP (e.g. 150/90 or 120/80)
  const bpMatch = text.match(/\b(\d{2,3})\s*[\/\-]\s*(\d{2,3})\b/);
  if (bpMatch) {
    const sys = parseInt(bpMatch[1], 10);
    const dia = parseInt(bpMatch[2], 10);
    if (sys >= 70 && sys <= 250 && dia >= 40 && dia <= 150) {
      vitals.push({
        systolicBp: sys,
        diastolicBp: dia,
      });
    }
  }

  // Extract Heart Rate / Pulse (e.g. "pulse 82 bpm" or "heart rate 78")
  const hrMatch = text.match(/(?:heart rate|pulse|hr)\s*(?:is|of|=|:)?\s*(\d{2,3})/i);
  if (hrMatch) {
    const hr = parseInt(hrMatch[1], 10);
    if (hr >= 40 && hr <= 200) {
      if (vitals.length > 0) {
        vitals[0].heartRateBpm = hr;
      } else {
        vitals.push({ heartRateBpm: hr });
      }
    }
  }

  // Extract Temperature (e.g. "fever 101 F" or "temp 38.5 C")
  const tempMatch = text.match(/(?:temp|temperature|fever)\s*(?:is|of|=|:)?\s*(\d{2,3}(?:\.\d)?)\s*(°?[CF])?/i);
  if (tempMatch) {
    let val = parseFloat(tempMatch[1]);
    const unit = tempMatch[2]?.toUpperCase();
    if (unit?.includes('F') || val > 50) {
      // Convert F to C
      val = (val - 32) * (5 / 9);
    }
    if (val >= 35 && val <= 43) {
      const cel = Math.round(val * 10) / 10;
      if (vitals.length > 0) {
        vitals[0].bodyTemperatureC = cel;
      } else {
        vitals.push({ bodyTemperatureC: cel });
      }
    }
  }

  return vitals;
}
