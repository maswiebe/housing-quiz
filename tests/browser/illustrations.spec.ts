import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QUESTION_BANK, ANSWER_IDS } from '../../src/data/question-bank';
import { Illustration } from '../../src/components/Illustration';

// Review artifacts, not pixel-baseline tests. Inspect every pair after SVG changes.
test('all 40 illustrations at the actual desktop and mobile card widths', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile';
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1100, height: 1000 });
  const css = readFileSync('src/styles.css', 'utf8');
  for (let offset = 0; offset < 20; offset += 4) {
    const rows = QUESTION_BANK.slice(offset, offset + 4).map(q => `
      <section class="gallery-row">
        <h2>${q.ordinal}. ${q.title}</h2>
        <div class="gallery-pair">${(q.id === 'q20' ? [...ANSWER_IDS].reverse() : ANSWER_IDS).map(answer => `
          <div class="gallery-option">
            <h3>${q.options[answer].netAdditionalHomes} homes · ${q.options[answer].headline}</h3>
            ${renderToStaticMarkup(createElement(Illustration, { question: q, answer }), { identifierPrefix: `${q.id}-${answer}` })}
          </div>`).join('')}
        </div>
      </section>`).join('');
    await page.setContent(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1" /><style>${css}
      body { padding: ${mobile ? 18 : 50}px; }
      .gallery-row { margin-bottom: 22px; }
      .gallery-row h2 { font-size: 16px; margin-bottom: 8px; }
      .gallery-pair { display: grid; grid-template-columns: ${mobile ? '1fr' : '1fr 1fr'}; gap: ${mobile ? 10 : 24}px; }
      .gallery-option h3 { padding: 8px 12px; background: white; font-size: 12px; font-weight: 500; }
    </style></head><body>${rows}</body></html>`);
    await expect(page.getByRole('img')).toHaveCount(8);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`illustrations-${offset + 1}-${offset + 4}.png`), fullPage: true, animations: 'disabled' });
  }
});
