import test from 'node:test';
import assert from 'node:assert/strict';
import { ANSWER_IDS, CATEGORIES, QUESTIONS, type AnswerId } from '../src/data/questions';
import { parseSharedResult, shareResultUrl } from '../src/lib/share';
import { answerQuestion, answeredCount, loadAttempt, newAttempt, parseAttempt, resultText, saveAttempt, score, type Answers } from '../src/lib/quiz';

const allAnswers = (answer: AnswerId): Answers => Object.fromEntries(QUESTIONS.map(q => [q.id, answer]));

test('dataset has 20 stable IDs, two semantic choices, and categories of 12 / 5 / 3', () => {
  assert.equal(QUESTIONS.length, 20);
  assert.equal(new Set(QUESTIONS.map(q => q.id)).size, 20);
  assert.deepEqual(QUESTIONS.map(q => q.id), Array.from({ length: 20 }, (_, i) => `q${String(i + 1).padStart(2, '0')}`));
  for (const q of QUESTIONS) {
    assert.deepEqual(Object.keys(q.options).sort(), [...ANSWER_IDS].sort());
    if (q.comparisonMetric === 'bedrooms') {
      assert.equal(q.options.allow_more.netAdditionalHomes, q.options.require_feature.netAdditionalHomes);
      assert.ok(q.options.allow_more.bedroomsPerHome! > q.options.require_feature.bedroomsPerHome!);
    } else {
      assert.ok(q.options.allow_more.netAdditionalHomes > q.options.require_feature.netAdditionalHomes);
    }
    for (const option of Object.values(q.options)) {
      assert.ok(option.visualDescription.length > 25);
      assert.equal(option.totalCompletedHomes - q.existingHomes, option.netAdditionalHomes);
    }
  }
  for (const category of CATEGORIES) assert.equal(QUESTIONS.filter(q => q.category === category.id).length, category.denominator);
});
test('completed overall scores include 0%, 100%, and 95%', () => {
  for (const [answers, count, percent] of [
    [allAnswers('allow_more'), 0, 0],
    [allAnswers('require_feature'), 20, 100],
    [{ ...allAnswers('require_feature'), q20: 'allow_more' }, 19, 95],
  ] as [Answers, number, number][]) {
    const result = score(answers)!;
    assert.equal(result.fewerCount, count);
    assert.equal(result.fewerPercent, percent);
    assert.equal(result.moreCount, 20 - count);
    assert.equal(result.morePercent, 100 - percent);
    assert.equal(result.denominator, 20);
  }
});
test('incomplete and invalid answers cannot produce completed results', () => {
  assert.equal(score({}), null);
  assert.equal(score({ ...allAnswers('allow_more'), q13: undefined }), null);
  assert.equal(score({ ...allAnswers('allow_more'), q13: 'left' as AnswerId }), null);
  assert.equal(answeredCount({ bogus: 'require_feature' }), 0);
});
test('category results have independent correct denominators and rounding', () => {
  const answers = { ...allAnswers('require_feature'), q12: 'allow_more', q17: 'allow_more', q20: 'allow_more' } as Answers;
  const result = score(answers)!;
  assert.deepEqual(Object.values(result.categories).map(c => [c.fewerCount, c.denominator, c.fewerPercent]), [[11, 12, 92], [4, 5, 80], [2, 3, 67]]);
  assert.equal(Object.values(result.categories).reduce((n, c) => n + c.fewerCount, 0), result.fewerCount);
});
test('display arrangement never changes the score, and each arrangement persists', () => {
  const left = newAttempt(() => 0.2);
  const right = newAttempt(() => 0.8);
  left.answers = right.answers = allAnswers('require_feature');
  assert.notDeepEqual(left.order, right.order);
  assert.deepEqual(left.order.q20, ['require_feature', 'allow_more']);
  assert.deepEqual(right.order.q20, ['require_feature', 'allow_more']);
  assert.deepEqual(score(left.answers), score(right.answers));
  assert.deepEqual(parseAttempt(JSON.stringify(left)).attempt, left);
  assert.deepEqual(parseAttempt(JSON.stringify(right)).attempt, right);
});
test('editing replaces a vote without mutating the prior attempt or arrangement', () => {
  const original = newAttempt();
  original.answers = allAnswers('require_feature');
  const edited = answerQuestion(original, 'q01', 'allow_more');
  assert.equal(score(edited.answers)!.fewerCount, 19);
  assert.equal(score(original.answers)!.fewerCount, 20);
  assert.equal(answeredCount(edited.answers), 20);
  assert.deepEqual(edited.order, original.order);
  assert.throws(() => answerQuestion(original, 'q99', 'allow_more'));
});
test('townhome comparisons preserve the requested counts and direction', () => {
  for (const [ordinal, more, fewer] of [[1, 6, 3], [2, 10, 6], [4, 20, 14], [5, 5, 2], [6, 4, 2]]) {
    const q = QUESTIONS[ordinal - 1];
    assert.deepEqual([q.options.allow_more.netAdditionalHomes, q.options.require_feature.netAdditionalHomes], [more, fewer]);
  }
});
test('apartment floors explain the totals and stay within the low-rise scale', () => {
  for (const q of QUESTIONS) {
    assert.equal(q.existingHomesByFloor.reduce((sum, n) => sum + n, 0), q.existingHomes);
    for (const answer of ANSWER_IDS) {
      const option = q.options[answer];
      if (!option.homesByFloor) continue;
      assert.ok(option.homesByFloor.length <= 6, q.id);
      assert.ok(option.homesByFloor.every(n => Number.isInteger(n) && n > 0 && n <= 4), q.id);
      if (answer === 'allow_more' && q.id !== 'q20') assert.ok(option.homesByFloor.every(n => n === 4), q.id);
      assert.equal(option.homesByFloor.reduce((sum, n) => sum + n, 0) + (option.retainedHomes ?? 0), option.totalCompletedHomes, q.id);
    }
  }
  const studios = QUESTIONS[14];
  assert.equal(studios.options.allow_more.totalCompletedHomes * 430, 5160);
  assert.equal(studios.options.require_feature.totalCompletedHomes * 645, 5160);
  assert.doesNotMatch(JSON.stringify(QUESTIONS), /m²|square metres|sqm/);
});
test('affordability composition and relocation arithmetic match the revised scenarios', () => {
  const q18 = QUESTIONS[17]; const q19 = QUESTIONS[18]; const q20 = QUESTIONS[19];
  assert.deepEqual([q18.options.allow_more.marketHomes, q18.options.allow_more.restrictedHomes, q18.options.require_feature.marketHomes, q18.options.require_feature.restrictedHomes], [20, 4, 15, 1]);
  assert.deepEqual([q18.options.allow_more.restrictedRentPercent, q18.options.require_feature.restrictedRentPercent], [80, 80]);
  assert.deepEqual([q19.options.allow_more.marketHomes, q19.options.allow_more.restrictedHomes, q19.options.require_feature.marketHomes, q19.options.require_feature.restrictedHomes], [22, 2, 15, 1]);
  assert.deepEqual([q19.options.allow_more.restrictedRentPercent, q19.options.require_feature.restrictedRentPercent], [50, 80]);
  for (const q of [q18, q19]) assert.deepEqual([q.options.allow_more.homesByFloor!.length, q.options.require_feature.homesByFloor!.length], [6, 4]);
  for (const q of [q18, q19]) for (const o of Object.values(q.options)) assert.equal(o.marketHomes! + o.restrictedHomes!, o.totalCompletedHomes);
  for (const q of [q18, q19]) assert.ok(q.options.allow_more.restrictedHomes! > q.options.require_feature.restrictedHomes!);
  assert.equal(q20.existingHomes, 2);
  assert.deepEqual([q20.options.allow_more.netAdditionalHomes, q20.options.require_feature.netAdditionalHomes], [6, 2]);
  assert.deepEqual([q20.options.allow_more.totalCompletedHomes, q20.options.require_feature.totalCompletedHomes], [8, 4]);
});
test('the stair comparison keeps 12 homes in both designs and scores added bedroom capacity once', () => {
  const q17 = QUESTIONS[16];
  assert.equal(q17.comparisonMetric, 'bedrooms');
  assert.deepEqual(ANSWER_IDS.map(answer => q17.options[answer].totalCompletedHomes), [12, 12]);
  assert.deepEqual(ANSWER_IDS.map(answer => q17.options[answer].bedroomsPerHome), [2, 1]);
  assert.deepEqual(ANSWER_IDS.map(answer => q17.options[answer].homesByFloor), [[4, 4, 4], [4, 4, 4]]);
  assert.deepEqual(ANSWER_IDS.map(answer => q17.options[answer].totalCompletedHomes * q17.options[answer].bedroomsPerHome!), [24, 12]);
  assert.doesNotMatch(q17.policyQuestion, /more homes/);
  const result = score({ ...allAnswers('require_feature'), q17: 'allow_more' })!;
  assert.equal(result.moreCount, 1);
  assert.equal(result.morePercent, 5);
  assert.equal(result.categories.housing_standards.moreCount, 1);
});
test('malformed or incompatible storage is handled without silently mixing questionnaires', () => {
  assert.deepEqual(parseAttempt(null), { attempt: null, notice: null });
  for (const raw of ['{broken', 'null', '[]', '{}']) assert.equal(parseAttempt(raw).notice, 'malformed');
  assert.equal(parseAttempt(JSON.stringify({ ...newAttempt(), questionnaireVersion: 'v0' })).notice, 'updated');
  assert.equal(parseAttempt(JSON.stringify({ ...newAttempt(), questionnaireVersion: 'v1-draft-2026-10-24', answers: allAnswers('require_feature') })).notice, 'updated');
  assert.equal(parseAttempt(JSON.stringify({ ...newAttempt(), questionnaireVersion: 'v2-draft-2026-10-26', answers: allAnswers('require_feature') })).notice, 'updated');
  assert.equal(parseAttempt(JSON.stringify({ ...newAttempt(), questionnaireVersion: 'v3-draft-2026-10-28', answers: allAnswers('require_feature') })).notice, 'updated');
  assert.equal(parseAttempt(JSON.stringify({ ...newAttempt(), questionnaireVersion: 'v4-draft-2026-10-29', answers: allAnswers('require_feature') })).notice, 'updated');
  assert.equal(parseAttempt(JSON.stringify({ ...newAttempt(), answers: { q01: 'left' } })).notice, 'malformed');
  assert.equal(parseAttempt(JSON.stringify({ ...newAttempt(), answers: { q99: 'allow_more' } })).notice, 'malformed');
  assert.equal(parseAttempt(JSON.stringify({ ...newAttempt(), order: { q01: ['allow_more', 'allow_more'] } })).notice, 'malformed');
  assert.equal(parseAttempt(JSON.stringify({ ...newAttempt(), currentQuestionId: 'q99' })).notice, 'malformed');
});
test('unavailable storage still permits an in-memory quiz', () => {
  assert.equal(loadAttempt({ getItem() { throw new Error('blocked'); } }).notice, 'unavailable');
  assert.equal(saveAttempt(newAttempt(), { setItem() { throw new Error('full'); } }), false);
  let raw = '';
  const a = answerQuestion(newAttempt(), 'q01', 'require_feature');
  assert.equal(saveAttempt(a, { setItem(_key, value) { raw = value; } }), true);
  assert.deepEqual(loadAttempt({ getItem() { return raw; } }).attempt, a);
});
test('share text contains only the overall housing supply result', () => {
  const results = score({ ...allAnswers('require_feature'), q01: 'allow_more' })!;
  assert.equal(resultText(results), resultText(results));
  assert.equal(resultText(results), 'I prioritized housing supply in 1 of 20 scenarios (5%).');
});
test('share links round-trip every overall result and omit private data', () => {
  for (let n = 0; n <= 20; n++) {
    const link = new URL(shareResultUrl(n, 'https://example.org/quiz/?private=value#old'));
    assert.equal(link.pathname, '/quiz/');
    assert.equal(link.search, '');
    assert.equal(link.hash, `#result=${n}-20`);
    assert.deepEqual(parseSharedResult(link.hash), { moreCount: n, denominator: 20, morePercent: n * 5 });
  }
  for (const hash of ['', '#main', '#result=-1-20', '#result=21-20', '#result=1.5-20', '#result=01-20', '#result=NaN-20', '#result=5-0', '#result=5-20&answers=q01']) assert.equal(parseSharedResult(hash), null);
  for (const n of [-1, 21, NaN, Infinity, 2.5]) assert.throws(() => shareResultUrl(n, 'https://example.org'));
});
