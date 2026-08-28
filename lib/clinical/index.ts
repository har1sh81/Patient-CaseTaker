/**
 * Clinical processing, vitals parsing, and chief complaint extraction
 */

export interface Vitals {
  heartRate?: number;
  systolicBP?: number;
  diastolicBP?: number;
  temperature?: number;
  oxygenSaturation?: number;
}

export interface ClinicalIntakeSummary {
  chiefComplaint: string;
  historyOfPresentIllness: string;
  vitals: Vitals;
  allergies: string[];
}

export function parseClinicalVitals(rawText: string): Vitals {
  const vitals: Vitals = {};
  
  // Basic regex parser helper
  const hrMatch = rawText.match(/(?:hr|pulse|heart rate)\D*(\d+)/i);
  if (hrMatch) vitals.heartRate = parseInt(hrMatch[1], 10);
  
  const bpMatch = rawText.match(/(?:bp|blood pressure)\D*(\d+)\/(\d+)/i);
  if (bpMatch) {
    vitals.systolicBP = parseInt(bpMatch[1], 10);
    vitals.diastolicBP = parseInt(bpMatch[2], 10);
  }
  
  const tempMatch = rawText.match(/(?:temp|temperature)\D*(\d+(?:\.\d+)?)/i);
  if (tempMatch) vitals.temperature = parseFloat(tempMatch[1]);
  
  const spo2Match = rawText.match(/(?:spo2|pulse ox|oxygen)\D*(\d+)/i);
  if (spo2Match) vitals.oxygenSaturation = parseInt(spo2Match[1], 10);

  return vitals;
}
