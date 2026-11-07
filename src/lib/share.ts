import { QUESTION_COUNT } from '../data/questions';

export interface SharedResult {
  moreCount: number;
  denominator: number;
  morePercent: number;
}

// The link carries only the aggregate score. It never includes answers or an attempt ID.
export function shareResultUrl(moreCount: number, baseUrl: string, denominator = QUESTION_COUNT): string {
  if (![10, 20].includes(denominator) || !Number.isInteger(moreCount) || moreCount < 0 || moreCount > denominator) throw new Error('Invalid result');
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = `result=${moreCount}-${denominator}`;
  return url.toString();
}

export function parseSharedResult(hash: string): SharedResult | null {
  // Keep previously shared 20-question results readable after switching editions.
  const match = /^#result=(0|[1-9]|1[0-9]|20)-(10|20)$/.exec(hash);
  if (!match) return null;
  const moreCount = Number(match[1]);
  const denominator = Number(match[2]);
  if (moreCount > denominator) return null;
  return { moreCount, denominator, morePercent: Math.round(100 * moreCount / denominator) };
}
