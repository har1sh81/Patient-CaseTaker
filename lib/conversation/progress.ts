import { Question, ConversationAnswer } from '../../types';
import { getValidRoute } from './routing';

export interface ProgressResult {
  completedQuestions: number;
  totalQuestions: number;
  percentage: number;
  currentSection: string | null;
}

/**
 * Calculates progress based on the valid route of questions given current answers.
 */
export function calculateProgress(
  currentQuestionId: string | undefined,
  answers: Record<string, ConversationAnswer>,
  questions: Question[]
): ProgressResult {
  if (questions.length === 0) {
    return { completedQuestions: 0, totalQuestions: 0, percentage: 0, currentSection: null };
  }

  // Calculate the path we will take through the questions based on current answers
  const validRouteIds = getValidRoute(answers, questions);
  const totalQuestions = validRouteIds.length;

  // The completed questions are all the questions in the valid route that appear BEFORE the current question.
  // If currentQuestionId is not provided (e.g., done), we assume all are completed.
  let completedQuestions = 0;
  let currentSection: string | null = null;

  if (currentQuestionId) {
    const currentIndex = validRouteIds.indexOf(currentQuestionId);
    completedQuestions = currentIndex >= 0 ? currentIndex : 0;
    
    const currentQ = questions.find(q => q.id === currentQuestionId);
    currentSection = currentQ ? currentQ.section : null;
  } else {
    completedQuestions = totalQuestions;
  }

  const percentage = totalQuestions > 0 ? Math.round((completedQuestions / totalQuestions) * 100) : 0;

  return {
    completedQuestions,
    totalQuestions,
    percentage: Math.min(percentage, 100),
    currentSection,
  };
}
