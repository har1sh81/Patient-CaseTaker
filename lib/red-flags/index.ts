/**
 * Red Flag assessment rules engine
 */

export interface RedFlagAlert {
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  matchedRule: string;
}

export function evaluateRedFlags(complaints: string, vitals: { heartRate?: number; systolicBP?: number; temperature?: number }): RedFlagAlert[] {
  const alerts: RedFlagAlert[] = [];
  const normalizedComplaints = complaints.toLowerCase();
  
  // Rule: Chest Pain
  if (normalizedComplaints.includes('chest pain') || normalizedComplaints.includes('angina')) {
    alerts.push({
      severity: 'CRITICAL',
      message: 'Patient reports chest pain or pressure. Immediate ECG recommended.',
      matchedRule: 'CARDIAC_CHEST_PAIN',
    });
  }

  // Rule: Severe Shortness of Breath
  if (normalizedComplaints.includes('shortness of breath') || normalizedComplaints.includes('difficulty breathing') || normalizedComplaints.includes('dyspnea')) {
    alerts.push({
      severity: 'CRITICAL',
      message: 'Severe dyspnea reported. Assess oxygen saturation immediately.',
      matchedRule: 'RESPIRATORY_DISTRESS',
    });
  }

  // Rule: Hypertensive Crisis
  if (vitals.systolicBP && vitals.systolicBP >= 180) {
    alerts.push({
      severity: 'CRITICAL',
      message: `Hypertensive urgency/crisis alert: Blood pressure is ${vitals.systolicBP} mmHg.`,
      matchedRule: 'SEVERE_HYPERTENSION',
    });
  }

  return alerts;
}
