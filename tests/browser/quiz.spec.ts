import { test, expect, type Page } from '@playwright/test';
import { CATEGORIES, HAS_BEDROOM_COMPARISON, QUESTIONS, QUESTION_COUNT, QUESTIONNAIRES, QUESTIONNAIRE_VERSION } from '../../src/data/questions';
import { newAttempt, STORAGE_KEY } from '../../src/lib/quiz';

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test('complete quiz: select, back, edit, refresh, resume, results, copy, and restart', async ({ page, browser }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('What would you');
  await expect(page.locator('.landing-intro')).toContainText(`${QUESTION_COUNT} illustrated choices`);
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('landing.png'), fullPage: true });
  await page.getByRole('button', { name: 'Start the quiz' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Next question' })).toBeDisabled();
  const initialOrder = await page.locator('.option-card').evaluateAll(cards => cards.map(c => c.getAttribute('data-answer')));
  await page.screenshot({ path: testInfo.outputPath('question-tree.png'), fullPage: true });
  const choice = page.locator('[data-answer="allow_more"] button');
  await page.keyboard.press('Tab');
  if (!await choice.evaluate(el => el === document.activeElement)) await page.keyboard.press('Tab');
  await expect(choice).toBeFocused();
  expect(await choice.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  // Keyboard focus must remain visible, including on a narrow viewport.
  expect(await choice.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const target = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return target !== null && el.contains(target);
  })).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(QUESTIONS[1].title);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(choice).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-answer="require_feature"] button').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(QUESTIONS[1].title);
  await page.reload();
  await expect(page.getByText(`1 of ${QUESTION_COUNT} answered`)).toBeVisible();
  await page.getByRole('button', { name: 'Continue the quiz' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(QUESTIONS[1].title);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  expect(await page.locator('.option-card').evaluateAll(cards => cards.map(c => c.getAttribute('data-answer')))).toEqual(initialOrder);
  await expect(page.locator('[data-answer="require_feature"] button')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-answer="allow_more"] button')).toHaveAttribute('aria-pressed', 'false');
  // Previously answered questions can still be reviewed without changing the answer.
  await page.getByRole('button', { name: 'Next question' }).click();
  for (let i = 1; i < QUESTION_COUNT; i++) {
    await expect(page.getByRole('heading', { level: 1 })).toContainText(QUESTIONS[i].title);
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(i));
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', String(QUESTION_COUNT));
    await expect(page.locator('.quiz-progress')).toContainText(`Question ${i + 1} of ${QUESTION_COUNT}`);
    await expect(page).toHaveTitle(`${i + 1}/${QUESTION_COUNT} · ${QUESTIONS[i].title} — The housing tradeoff`);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page.locator('.illustration svg')).toHaveCount(2);
    for (const option of ['allow_more', 'require_feature'] as const) {
      await expect(page.locator(`[data-answer="${option}"] .homes-count strong`)).toHaveText(String(QUESTIONS[i].options[option].netAdditionalHomes));
      if (QUESTIONS[i].comparisonMetric === 'bedrooms') {
        const bedrooms = option === 'allow_more' ? 2 : 1;
        const card = page.locator(`[data-answer="${option}"]`);
        await expect(card.locator('.homes-count span')).toHaveText(`${bedrooms}-bedroom homes`);
        await expect(card.locator('.illustration svg [data-bedroom]')).toHaveCount(4 * bedrooms);
        await expect(page.locator('.policy-question')).toContainText('two-bedroom homes');
        await expect(page.locator('.policy-question')).not.toContainText('more homes');
      }
      if (QUESTIONS[i].visualKind.startsWith('affordable-')) {
        const data = QUESTIONS[i].options[option];
        const card = page.locator(`[data-answer="${option}"]`);
        await expect(card.locator('.illustration svg rect')).toHaveCount(data.totalCompletedHomes);
        await expect(card.locator('.composition-legend')).toContainText(`${data.marketHomes} market-rate`);
        await expect(card.locator('.composition-legend')).toContainText(`${data.restrictedHomes} income-restricted`);
        await expect(card.locator('.option-description')).toContainText(`${data.restrictedRentPercent}%`);
      }
    }
    if (QUESTIONS[i].id === 'q20') expect(await page.locator('.option-card').evaluateAll(cards => cards.map(c => c.getAttribute('data-answer')))).toEqual(['require_feature', 'allow_more']);
    await noOverflow(page);
    if ([6, 7, 10, 14, 16, 17, 18, 19].includes(i)) await page.screenshot({ path: testInfo.outputPath(`question-${i + 1}.png`), fullPage: true });
    await page.locator(`[data-answer="${i === QUESTION_COUNT - 1 ? 'allow_more' : 'require_feature'}"] button`).click();
  }
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your choices');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(page.locator('.result-main')).toContainText(`You prioritized housing supply in 1 of ${QUESTION_COUNT} scenarios.`);
  await expect(page.locator('.result-headline')).toHaveText(`You support more homes ${100 / QUESTION_COUNT}% of the time`);
  await expect(page.locator('.review-row')).toHaveCount(QUESTION_COUNT);
  await expect(page.locator('.domain-row')).toHaveCount(CATEGORIES.length);
  for (const [i, q] of QUESTIONS.entries()) {
    const row = page.locator('.review-row').nth(i);
    await expect(row.locator('.review-index')).toHaveText(String(i + 1));
    if (q.comparisonMetric === 'bedrooms') await expect(row).toContainText('12 2-bedroom homes vs 12 1-bedroom homes');
    else await expect(row).toContainText(`${q.options.allow_more.netAdditionalHomes} vs ${q.options.require_feature.netAdditionalHomes} net additional homes`);
    if (q.existingHomes) await expect(row).toContainText('8 vs 4 completed homes');
  }
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('results.png'), fullPage: true });
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }));
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { document.body.dataset.copiedResult = text; } } }));
  await page.getByRole('button', { name: 'Share result' }).click();
  await expect(page.getByRole('status')).toHaveText('Result and link copied.');
  expect(await page.locator('body').getAttribute('data-copied-result')).toContain(`1 of ${QUESTION_COUNT} scenarios (${100 / QUESTION_COUNT}%)`);
  const copied = (await page.locator('body').getAttribute('data-copied-result'))!;
  expect(copied).not.toMatch(/q01|neighborhood|fewer-homes/i);
  const shareUrl = copied.split('\n').at(-1)!;
  const recipientContext = await browser.newContext({ viewport: page.viewportSize()! });
  try {
    const recipient = await recipientContext.newPage();
    await recipient.goto(shareUrl);
    await expect(recipient.getByRole('heading', { level: 1 })).toHaveText('Shared result');
    await expect(recipient.locator('.result-main')).toContainText(`1 of ${QUESTION_COUNT} scenarios`);
    await expect(recipient.locator('.result-number')).toHaveText(`${100 / QUESTION_COUNT}%`);
    await expect(recipient.locator('.answer-review, .domain-section')).toHaveCount(0);
    expect(await recipient.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
    await recipient.screenshot({ path: testInfo.outputPath('shared-result.png'), fullPage: true });
    await recipient.reload();
    await expect(recipient.locator('.result-main')).toContainText(`1 of ${QUESTION_COUNT} scenarios`);
    await recipient.getByRole('button', { name: 'Take the quiz' }).click();
    await recipient.getByRole('button', { name: 'Start the quiz' }).click();
    await expect(recipient.getByRole('heading', { level: 1 })).toHaveText('A mature tree');
  } finally {
    await recipientContext.close();
  }
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('Denied')) } }));
  await page.getByRole('button', { name: 'Share result' }).click();
  await expect(page.getByLabel('Your share text')).toBeVisible();
  expect(await page.getByLabel('Your share text').inputValue()).toContain(`1 of ${QUESTION_COUNT} scenarios (${100 / QUESTION_COUNT}%)`);
  await expect(page.locator('.review-group').first()).not.toHaveAttribute('open');
  await page.locator('.review-group').first().locator('summary').click();
  await page.getByRole('button', { name: 'Edit answer 1: A mature tree', exact: true }).click();
  await page.locator('[data-answer="allow_more"] button').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(QUESTIONS[1].title);
  await page.getByRole('button', { name: 'Return to results' }).click();
  await expect(page.locator('.result-main')).toContainText(`2 of ${QUESTION_COUNT} scenarios`);
  await page.locator('.review-group').last().locator('summary').click();
  await page.getByRole('button', { name: `Edit answer ${QUESTION_COUNT}: ${QUESTIONS.at(-1)!.title}`, exact: true }).click();
  await page.locator('[data-answer="require_feature"] button').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your choices');
  await expect(page.locator('.result-main')).toContainText(`1 of ${QUESTION_COUNT} scenarios`);
  await page.getByRole('button', { name: 'Start again', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Keep my answers' }).click();
  await expect(page.locator('.result-main')).toContainText(`1 of ${QUESTION_COUNT} scenarios`);
  await page.getByRole('button', { name: 'Start again', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start again' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('A mature tree');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByRole('button', { name: 'Next question' })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('answer confirmation stays visible before advancing and cancels when leaving the question', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-11-05T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-05T12:00:01Z'));
  await page.goto('./');
  await page.getByRole('button', { name: 'Start the quiz' }).click();
  const choice = page.locator('[data-answer="allow_more"] button');
  await choice.click();
  await expect(choice).toHaveAttribute('aria-pressed', 'true');
  await expect(choice.locator('.choice-status')).toHaveText('Selected');
  await expect(choice.locator('.choice-mark svg')).toBeVisible();
  await expect(choice).toBeDisabled();
  await expect(page.locator('[data-answer="require_feature"] button')).toBeDisabled();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A mature tree');
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('answer-selected.png'), fullPage: true, animations: 'disabled' });
  await page.clock.runFor(300);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A mature tree');
  await page.clock.runFor(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(QUESTIONS[1].title);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(choice).toBeEnabled();

  await page.locator('[data-answer="require_feature"] button').click();
  await page.getByRole('button', { name: 'About the quiz' }).click();
  await page.clock.runFor(1000);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('About this quiz');
  await page.getByRole('button', { name: 'Back to quiz' }).click();
  await page.clock.runFor(1000);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(QUESTIONS[1].title);
  await expect(page.locator('[data-answer="require_feature"] button')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Next question' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(QUESTIONS[2].title);

  // Refreshing during confirmation keeps the answer even though the timer is gone.
  await choice.click();
  await page.reload();
  await expect(page.getByText(`3 of ${QUESTION_COUNT} answered`)).toBeVisible();
  await page.getByRole('button', { name: 'Continue the quiz' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(QUESTIONS[2].title);
  await expect(choice).toHaveAttribute('aria-pressed', 'true');
  await expect(choice).toBeEnabled();
});

test('methodology can be read without losing the active question', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Start the quiz' }).click();
  await page.locator('[data-answer="allow_more"] button').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(QUESTIONS[1].title);
  await page.getByRole('button', { name: 'About the quiz' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('About this quiz');
  await expect(page.locator('.reading-list a')).toHaveCount(HAS_BEDROOM_COMPARISON ? 4 : 3);
  await expect(page.locator('.about-content')).toContainText(`Each of the ${QUESTION_COUNT} questions counts once.`);
  if (!HAS_BEDROOM_COMPARISON) await expect(page.locator('.about-content')).not.toContainText('In question 17');
  await noOverflow(page);
  await expect(page.getByRole('button', { name: 'Methodology & privacy' })).toHaveCount(0);
  await expect(page.locator('footer')).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to quiz' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(QUESTIONS[1].title);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await expect(page.getByText('Scenario assumptions', { exact: true })).toHaveCount(0);
});

test('storage failures and questionnaire upgrades remain usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage unavailable'); } });
  });
  await page.goto('./');
  await expect(page.getByText('Browser storage is unavailable.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Start the quiz' }).click();
  await page.locator('[data-answer="allow_more"] button').click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(QUESTIONS[1].title);
});

test('old and malformed saves get a clear fresh-start path', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(({ key, attempt }) => localStorage.setItem(key, JSON.stringify(attempt)), { key: STORAGE_KEY, attempt: { ...newAttempt(), questionnaireVersion: QUESTIONNAIRE_VERSION === QUESTIONNAIRES.short.version ? QUESTIONNAIRES.full.version : QUESTIONNAIRES.short.version } });
  await page.reload();
  await expect(page.getByText('The quiz has been updated.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Start the quiz' }).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).questionnaireVersion, STORAGE_KEY)).toBe(QUESTIONNAIRE_VERSION);
  await page.evaluate(key => localStorage.setItem(key, '{broken'), STORAGE_KEY);
  await page.reload();
  await expect(page.getByText('Your saved attempt could not be read.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Start the quiz' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('A mature tree');
});
