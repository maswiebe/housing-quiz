export interface SharedResult {
  moreCount: number;
  denominator: number;
  morePercent: number;
}

// The link carries only the aggregate score. It never includes answers or an attempt ID.
export function shareResultUrl(moreCount: number, baseUrl: string): string {
  if (!Number.isInteger(moreCount) || moreCount < 0 || moreCount > 20) throw new Error('Invalid result');
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = `result=${moreCount}-20`;
  return url.toString();
}

export function parseSharedResult(hash: string): SharedResult | null {
  const match = /^#result=(0|[1-9]|1[0-9]|20)-20$/.exec(hash);
  if (!match) return null;
  const moreCount = Number(match[1]);
  return { moreCount, denominator: 20, morePercent: moreCount * 5 };
}
