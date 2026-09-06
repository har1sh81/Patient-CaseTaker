/**
 * Task #9 — Adaptive Clinical Interview Engine Domain Models & Types
 * MediKiosk Clinical Architecture
 */

import type { ClinicalQuestion, ComplaintType } from '../questions/types';

export type LanguageCode = 'en' | 'hi' | 'ta';

export type InterviewSessionStatus =
  | 'not_started'
  | 'active'
  | 'paused'
  | 'completed'
  | 'terminated_for_safety';

export type ConsultationMode = 'general_medicine' | 'ayush';

export type AnswerStatus = 'answered' | 'unknown' | 'skipped';

export type InputMethod = 'touch' | 'voice' | 'text';

export interface InterviewState {
  sessionId: string;
  patientId: string;
  encounterId?: string;
  department: string;
  consultationMode: ConsultationMode;
  language: LanguageCode;
  chiefComplaint?: string;
  normalizedComplaint?: ComplaintType;
  currentQuestionId?: string;
  askedQuestionIds: string[];
  answeredQuestionIds: string[];
  skippedQuestionIds: string[];
  collectedFacts: Array<Record<string, unknown>>;
  redFlags: Array<Record<string, unknown>>;
  progress: number;
  status: InterviewSessionStatus;
  startedAt: string;
  completedAt?: string;
  updatedAt: string;
}

export interface StartInterviewOptions {
  patientId: string;
  encounterId?: string;
  department?: string;
  consultationMode?: ConsultationMode;
  language?: LanguageCode;
  chiefComplaint?: string;
}

export interface AnswerInput {
  questionId: string;
  answer: string | number | string[];
  inputMethod: InputMethod;
  answerStatus?: AnswerStatus;
  confidenceScore?: number;
  nativeTranscript?: string;
}

export type GenerationMode = 'llm' | 'library_fallback';

export interface QuestionIntent {
  intentId: string;
  domain: string;
  targetFact: string;
  reason: string;
  answerType: string;
  category?: string;
  section?: string;
  redFlagCandidate?: boolean;
  priority?: number;
  originalQuestion?: ClinicalQuestion;
}

export interface ConversationalQuestion {
  id: string;
  intentId: string;
  text: string;
  generationMode: GenerationMode;
  answerType: string;
  choices?: Array<{ value: string; label: string }>;
  targetField?: string;
}

export interface ConversationTurn {
  role: 'assistant' | 'patient';
  text: string;
  questionId?: string;
  intentId?: string;
}

export interface GenerateQuestionInput {
  consultationMode: ConsultationMode;
  language: LanguageCode;
  chiefComplaint?: string;
  collectedFacts: Array<Record<string, unknown>>;
  recentTurns: ConversationTurn[];
  intent: QuestionIntent;
  libraryFallbackQuestion: ClinicalQuestion;
}

export interface GenerateQuestionResult {
  questionText: string;
  generationMode: GenerationMode;
  provider?: string;
  model?: string;
  reason?: string;
}

export interface ProcessAnswerResult {
  success: boolean;
  status: InterviewSessionStatus;
  factsExtractedCount: number;
  redFlagStatus: 'none' | 'warning' | 'urgent';
  attentionFlag?: Record<string, unknown>;
  nextQuestion?: ConversationalQuestion;
  progress: number;
  message?: string;
  error?: string;
}

export interface InterviewServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: 'CONSENT_DENIED' | 'NOT_FOUND' | 'INVALID_INPUT' | 'EXHAUSTED' | 'SAFETY_TERMINATED' | 'INTERNAL_SERVER_ERROR';
}
