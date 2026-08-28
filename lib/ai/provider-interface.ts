import { AdaptiveQuestionRequest, AdaptiveQuestionResponse, ReportGenerationRequest, ReportGenerationResponse } from '../../types';

export interface AIProvider {
  /**
   * Analyzes a patient's answer in the context of the interview and returns a structured response
   * containing extracted facts and the next recommended action.
   */
  /**
   * Analyzes a patient's answer in the context of the interview and returns a structured response
   * containing extracted facts and the next recommended action.
   */
  analyzeAnswer(request: AdaptiveQuestionRequest): Promise<AdaptiveQuestionResponse>;

  /**
   * Generates a structured clinical history draft for physician review
   * using the collected inputs from the kiosk.
   */
  generateClinicalHistoryDraft(request: ReportGenerationRequest): Promise<ReportGenerationResponse>;
}
