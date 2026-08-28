import { Question } from '../../types';

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export function validateAnswer(question: Question, rawValue: unknown): ValidationResult {
  // Handle empty checks
  if (
    rawValue === undefined ||
    rawValue === null ||
    (typeof rawValue === 'string' && rawValue.trim() === '') ||
    (Array.isArray(rawValue) && rawValue.length === 0)
  ) {
    if (question.required) {
      return { isValid: false, errorMessage: 'Please provide an answer to continue.' };
    }
    return { isValid: true };
  }

  // Type-specific checks
  switch (question.inputType) {
    case 'yes_no':
      if (rawValue !== 'yes' && rawValue !== 'no') {
        return { isValid: false, errorMessage: 'Please select Yes or No.' };
      }
      break;

    case 'single_choice':
      if (typeof rawValue !== 'string') {
        return { isValid: false, errorMessage: 'Please select an option.' };
      }
      if (question.options && !question.options.some((opt) => opt.value === rawValue)) {
        return { isValid: false, errorMessage: 'Invalid option selected.' };
      }
      break;

    case 'multiple_choice':
      if (!Array.isArray(rawValue)) {
        return { isValid: false, errorMessage: 'Please select at least one option.' };
      }
      if (question.options) {
        const validValues = new Set(question.options.map((opt) => opt.value));
        const invalidSelection = rawValue.some((val) => typeof val !== 'string' || !validValues.has(val));
        if (invalidSelection) {
          return { isValid: false, errorMessage: 'One or more selected options are invalid.' };
        }
      }
      break;

    case 'number':
    case 'scale':
      if (typeof rawValue !== 'number' || isNaN(rawValue)) {
        return { isValid: false, errorMessage: 'Please enter a valid number.' };
      }
      break;

    case 'text':
      if (typeof rawValue !== 'string') {
        return { isValid: false, errorMessage: 'Please enter valid text.' };
      }
      break;

    case 'date':
      if (typeof rawValue !== 'string' || isNaN(Date.parse(rawValue))) {
        return { isValid: false, errorMessage: 'Please enter a valid date.' };
      }
      break;
  }

  return { isValid: true };
}
