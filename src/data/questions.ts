import { CATEGORY_DEFINITIONS, FULL_QUESTIONNAIRE_VERSION, QUESTION_BANK } from './question-bank';
export { ANSWER_IDS, GENERAL_ASSUMPTION } from './question-bank';
export type { AnswerId, CategoryId, VisualKind, Option, Question } from './question-bank';

export const QUESTIONNAIRES = {
  short: {
    version: 'v6-short-2026-11-06',
    questionIds: ['q01', 'q03', 'q04', 'q06', 'q07', 'q08', 'q09', 'q11', 'q12', 'q18'],
  },
  full: {
    version: FULL_QUESTIONNAIRE_VERSION,
    questionIds: QUESTION_BANK.map(q => q.id),
  },
};

// Change .short to .full to restore the original 20-question quiz.
export const ACTIVE_QUESTIONNAIRE = QUESTIONNAIRES.short;
export const QUESTIONNAIRE_VERSION = ACTIVE_QUESTIONNAIRE.version;
export const QUESTIONS = ACTIVE_QUESTIONNAIRE.questionIds.map((id, index) => {
  const question = QUESTION_BANK.find(q => q.id === id);
  if (!question) throw new Error(`Unknown question: ${id}`);
  // Keep stable IDs for answers and illustrations; number the active quiz sequentially.
  return { ...question, ordinal: index + 1 };
});
export const QUESTION_COUNT = QUESTIONS.length;
export const HAS_BEDROOM_COMPARISON = QUESTIONS.some(q => q.comparisonMetric === 'bedrooms');
export const CATEGORIES = CATEGORY_DEFINITIONS.map(category => ({
  ...category,
  label: category.id === 'affordability' && !QUESTIONS.some(q => q.existingHomes > 0)
    ? 'Affordability' : category.label,
  denominator: QUESTIONS.filter(q => q.category === category.id).length,
})).filter(category => category.denominator > 0);
