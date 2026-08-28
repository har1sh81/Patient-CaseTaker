/**
 * AI Service integrations (e.g. Gemini, OpenAI)
 */

export interface AIServiceResponse {
  text: string;
  tokensUsed?: number;
  model: string;
}

export interface SummaryConfig {
  maxLength?: number;
  format?: 'bullet' | 'paragraph' | 'soap';
}

export async function generateClinicalSummary(
  transcript: string, 
  config?: SummaryConfig
): Promise<AIServiceResponse> {
  // Skeleton implementation of clinical intake summarization
  const format = config?.format || 'soap';
  return {
    text: `[Clinical Intake Summary (${format.toUpperCase()})]\nPatient Transcript Summary: ${transcript.substring(0, 200)}...`,
    model: 'gemini-2.5-flash',
  };
}
