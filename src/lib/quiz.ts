import { ANSWER_IDS, CATEGORIES, QUESTIONS, QUESTIONNAIRE_VERSION, type AnswerId, type CategoryId } from '../data/questions';

export type Answers = Partial<Record<string, AnswerId>>;
export interface Attempt {
  questionnaireVersion: string;
  id: string;
  currentQuestionId: string;
  answers: Answers;
  order: Record<string, [AnswerId, AnswerId]>;
}
export const STORAGE_KEY = 'room-for-more.attempt';
export interface Score { fewerCount: number; moreCount: number; denominator: number; fewerPercent: number; morePercent: number }
export type Results = Score & { categories: Partial<Record<CategoryId, Score>> };
export type LoadResult = { attempt: Attempt | null; notice: 'updated' | 'malformed' | 'unavailable' | null };

export function newAttempt(random: () => number = Math.random): Attempt {
  return {
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    id: globalThis.crypto?.randomUUID?.() ?? `attempt-${Date.now()}-${random()}`,
    currentQuestionId: QUESTIONS[0].id,
    answers: {},
    order: Object.fromEntries(QUESTIONS.map(q => [q.id, q.id === 'q20' || random() >= 0.5 ? ['require_feature', 'allow_more'] : ['allow_more', 'require_feature']])),
  };
}

export function answerQuestion(attempt: Attempt, id: string, answer: AnswerId): Attempt {
  if (!QUESTIONS.some(q => q.id === id) || !ANSWER_IDS.includes(answer)) throw new Error('Invalid question or answer');
  return { ...attempt, answers: { ...attempt.answers, [id]: answer } };
}
export function answeredCount(answers: Answers): number {
  return QUESTIONS.filter(q => ANSWER_IDS.includes(answers[q.id] as AnswerId)).length;
}
export function isComplete(answers: Answers): boolean { return answeredCount(answers) === QUESTIONS.length; }

function scoreGroup(ids: string[], answers: Answers): Score {
  const fewerCount = ids.filter(id => answers[id] === 'require_feature').length;
  const moreCount = ids.length - fewerCount;
  return { fewerCount, moreCount, denominator: ids.length, fewerPercent: Math.round(100 * fewerCount / ids.length), morePercent: Math.round(100 * moreCount / ids.length) };
}
export function score(answers: Answers): Results | null {
  if (!isComplete(answers)) return null;
  return {
    ...scoreGroup(QUESTIONS.map(q => q.id), answers),
    categories: Object.fromEntries(CATEGORIES.map(c => [c.id, scoreGroup(QUESTIONS.filter(q => q.category === c.id).map(q => q.id), answers)])),
  };
}
export function resultText(results: Results): string {
  return `I prioritized housing supply in ${results.moreCount} of ${results.denominator} scenarios (${results.morePercent}%).`;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
export function parseAttempt(raw: string | null): LoadResult {
  if (!raw) return { attempt: null, notice: null };
  try {
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data)) throw new Error('Invalid stored data');
    if (typeof data.questionnaireVersion === 'string' && data.questionnaireVersion !== QUESTIONNAIRE_VERSION) return { attempt: null, notice: 'updated' };
    if (data.questionnaireVersion !== QUESTIONNAIRE_VERSION || typeof data.id !== 'string' || !isRecord(data.answers) || !isRecord(data.order) || !QUESTIONS.some(q => q.id === data.currentQuestionId)) throw new Error('Invalid attempt');
    const answers = data.answers;
    const order = data.order;
    if (Object.entries(answers).some(([id, value]) => !QUESTIONS.some(q => q.id === id) || !ANSWER_IDS.includes(value as AnswerId))) throw new Error('Invalid answers');
    if (Object.keys(order).length !== QUESTIONS.length || QUESTIONS.some(q => {
      const arrangement = order[q.id];
      return !Array.isArray(arrangement) || arrangement.length !== 2 || !ANSWER_IDS.every(a => arrangement.includes(a));
    })) throw new Error('Invalid arrangement');
    return { attempt: data as unknown as Attempt, notice: null };
  } catch { return { attempt: null, notice: 'malformed' }; }
}
export function loadAttempt(storage?: Pick<Storage, 'getItem'>): LoadResult {
  try { return parseAttempt((storage ?? window.localStorage).getItem(STORAGE_KEY)); }
  catch { return { attempt: null, notice: 'unavailable' }; }
}
export function saveAttempt(attempt: Attempt, storage?: Pick<Storage, 'setItem'>): boolean {
  try { (storage ?? window.localStorage).setItem(STORAGE_KEY, JSON.stringify(attempt)); return true; }
  catch { return false; }
}
