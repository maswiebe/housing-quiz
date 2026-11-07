import { test, expect } from '@playwright/test';
import { QUESTIONS, QUESTION_COUNT } from '../../src/data/questions';
import { newAttempt, STORAGE_KEY } from '../../src/lib/quiz';

test('native sharing sends only the main result and cancellation does not copy', async ({ page }) => {
  const attempt = newAttempt();
  attempt.answers = Object.fromEntries(QUESTIONS.map(q => [q.id, 'allow_more']));
  await page.goto('./');
  await page.evaluate(({ key, attempt }) => localStorage.setItem(key, JSON.stringify(attempt)), { key: STORAGE_KEY, attempt });
  await page.reload();
  await page.getByRole('button', { name: 'See your results' }).click();
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => { document.body.dataset.shared = JSON.stringify(data); } });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { document.body.dataset.copied = 'yes'; } } });
  });
  await page.getByRole('button', { name: 'Share result' }).click();
  const payload = JSON.parse((await page.locator('body').getAttribute('data-shared'))!);
  expect(payload.text).toBe(`I prioritized housing supply in ${QUESTION_COUNT} of ${QUESTION_COUNT} scenarios (100%).`);
  expect(new URL(payload.url).hash).toBe(`#result=${QUESTION_COUNT}-${QUESTION_COUNT}`);
  expect(Object.keys(payload).sort()).toEqual(['text', 'title', 'url']);
  await expect(page.getByRole('status')).toHaveText('Result shared.');
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('Cancelled', 'AbortError'); } }));
  await page.getByRole('button', { name: 'Share result' }).click();
  await expect(page.getByRole('button', { name: 'Share result' })).toBeEnabled();
  expect(await page.locator('body').getAttribute('data-copied')).toBeNull();
  await expect(page.getByLabel('Your share text')).toHaveCount(0);
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new Error('Unavailable'); } }));
  await page.getByRole('button', { name: 'Share result' }).click();
  await expect(page.getByRole('status')).toHaveText('Result and link copied.');
});

test('opening shared results preserves the recipient’s attempt and rejects invalid links', async ({ page }) => {
  const attempt = newAttempt();
  attempt.answers = { q01: 'allow_more' };
  attempt.currentQuestionId = QUESTIONS[1].id;
  await page.goto('./');
  await page.evaluate(({ key, attempt }) => localStorage.setItem(key, JSON.stringify(attempt)), { key: STORAGE_KEY, attempt });
  await page.reload();
  await page.goto(`./#result=0-${QUESTION_COUNT}`);
  await expect(page.locator('.result-number')).toHaveText('0%');
  await page.evaluate(count => { window.location.hash = `result=${count}-${count}`; }, QUESTION_COUNT);
  await expect(page.locator('.result-number')).toHaveText('100%');
  // The full edition's shared scores retain their original count and percentage.
  await page.goto('./#result=5-20');
  await expect(page.locator('.result-number')).toHaveText('25%');
  await expect(page.locator('.result-main')).toContainText('5 of 20 scenarios');
  await page.goto('./#result=5-10');
  await expect(page.locator('.result-number')).toHaveText('50%');
  await expect(page.locator('.result-main')).toContainText('5 of 10 scenarios');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY)).toEqual(attempt);
  await page.getByRole('button', { name: 'Take the quiz' }).click();
  await page.getByRole('button', { name: 'Continue the quiz' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(QUESTIONS[1].title);
  await page.goto('./#result=999-20');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What would you trade for more homes?');
  await expect(page.getByRole('button', { name: 'Continue the quiz' })).toBeVisible();
});
