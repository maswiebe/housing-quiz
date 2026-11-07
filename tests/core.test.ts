import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVE_QUESTIONNAIRE, ANSWER_IDS, CATEGORIES, QUESTIONS, QUESTION_COUNT, QUESTIONNAIRES, QUESTIONNAIRE_VERSION, type AnswerId } from '../src/data/questions';
import { CATEGORY_DEFINITIONS, QUESTION_BANK } from '../src/data/question-bank';
import { parseSharedResult, shareResultUrl } from '../src/lib/share';
import { answerQuestion, answeredCount, loadAttempt, newAttempt, parseAttempt, resultText, saveAttempt, score, type Answers } from '../src/lib/quiz';

const allAnswers = (answer: AnswerId): Answers => Object.fromEntries(QUESTIONS.map(q => [q.id, answer]));

test('the complete bank preserves all 20 original questions and semantic choices', () => {
  assert.equal(QUESTION_BANK.length, 20);
  assert.equal(new Set(QUESTION_BANK.map(q => q.id)).size, 20);
  assert.deepEqual(QUESTION_BANK.map(q => q.id), Array.from({ length: 20 }, (_, i) => `q${String(i + 1).padStart(2, '0')}`));
  for (const q of QUESTION_BANK) {
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
  for (const category of CATEGORY_DEFINITIONS) assert.equal(QUESTION_BANK.filter(q => q.category === category.id).length, category.denominator);
});
test('the short selection matches feedback and active questions have sequential display numbers', () => {
  assert.deepEqual(QUESTIONNAIRES.short.questionIds, ['q01', 'q03', 'q04', 'q06', 'q07', 'q08', 'q09', 'q11', 'q12', 'q18']);
  assert.deepEqual(QUESTIONNAIRES.full.questionIds, QUESTION_BANK.map(q => q.id));
  assert.notEqual(QUESTIONNAIRES.short.version, QUESTIONNAIRES.full.version);
  assert.deepEqual(QUESTIONS.map(q => q.id), ACTIVE_QUESTIONNAIRE.questionIds);
  assert.deepEqual(QUESTIONS.map(q => q.ordinal), Array.from({ length: QUESTION_COUNT }, (_, i) => i + 1));
  for (const q of QUESTIONS) {
    const original = QUESTION_BANK.find(item => item.id === q.id)!;
    assert.deepEqual({ ...q, ordinal: original.ordinal }, original);
  }
  if (ACTIVE_QUESTIONNAIRE === QUESTIONNAIRES.short) {
    assert.deepEqual(CATEGORIES.map(c => [c.id, c.denominator]), [['neighborhood', 9], ['affordability', 1]]);
    const omitted = QUESTION_BANK.filter(q => !ACTIVE_QUESTIONNAIRE.questionIds.includes(q.id));
    assert.equal(omitted.length, 10);
    assert.throws(() => answerQuestion(newAttempt(), omitted[0].id, 'allow_more'));
    assert.equal(answeredCount(Object.fromEntries(omitted.map(q => [q.id, 'allow_more']))), 0);
  }
});
test('completed overall scores use the active questionnaire denominator', () => {
  for (const [answers, count, percent] of [
    [allAnswers('allow_more'), 0, 0],
    [allAnswers('require_feature'), QUESTION_COUNT, 100],
    [{ ...allAnswers('require_feature'), [QUESTIONS.at(-1)!.id]: 'allow_more' }, QUESTION_COUNT - 1, 100 - 100 / QUESTION_COUNT],
  ] as [Answers, number, number][]) {
    const result = score(answers)!;
    assert.equal(result.fewerCount, count);
    assert.equal(result.fewerPercent, percent);
    assert.equal(result.moreCount, QUESTION_COUNT - count);
    assert.equal(result.morePercent, 100 - percent);
    assert.equal(result.denominator, QUESTION_COUNT);
  }
});
test('incomplete and invalid answers cannot produce completed results', () => {
  assert.equal(score({}), null);
  assert.equal(score({ ...allAnswers('allow_more'), [QUESTIONS[1].id]: undefined }), null);
  assert.equal(score({ ...allAnswers('allow_more'), [QUESTIONS[1].id]: 'left' as AnswerId }), null);
  assert.equal(answeredCount({ bogus: 'require_feature' }), 0);
});
test('category results have independent correct denominators and rounding', () => {
  const answers = allAnswers('require_feature');
  for (const category of CATEGORIES) answers[QUESTIONS.find(q => q.category === category.id)!.id] = 'allow_more';
  const result = score(answers)!;
  assert.deepEqual(Object.keys(result.categories), CATEGORIES.map(c => c.id));
  for (const category of CATEGORIES) {
    const group = result.categories[category.id]!;
    assert.equal(group.moreCount, 1);
    assert.equal(group.denominator, category.denominator);
    assert.equal(group.morePercent, Math.round(100 / category.denominator));
    assert.equal(group.fewerPercent, Math.round(100 * (category.denominator - 1) / category.denominator));
  }
  assert.equal(Object.values(result.categories).reduce((n, c) => n + c.fewerCount, 0), result.fewerCount);
});
test('display arrangement never changes the score, and each arrangement persists', () => {
  const left = newAttempt(() => 0.2);
  const right = newAttempt(() => 0.8);
  left.answers = right.answers = allAnswers('require_feature');
  assert.notDeepEqual(left.order, right.order);
  if (QUESTIONS.some(q => q.id === 'q20')) {
    assert.deepEqual(left.order.q20, ['require_feature', 'allow_more']);
    assert.deepEqual(right.order.q20, ['require_feature', 'allow_more']);
  }
  assert.deepEqual(score(left.answers), score(right.answers));
  assert.deepEqual(parseAttempt(JSON.stringify(left)).attempt, left);
  assert.deepEqual(parseAttempt(JSON.stringify(right)).attempt, right);
});
test('editing replaces a vote without mutating the prior attempt or arrangement', () => {
  const original = newAttempt();
  original.answers = allAnswers('require_feature');
  const edited = answerQuestion(original, 'q01', 'allow_more');
  assert.equal(score(edited.answers)!.fewerCount, QUESTION_COUNT - 1);
  assert.equal(score(original.answers)!.fewerCount, QUESTION_COUNT);
  assert.equal(answeredCount(edited.answers), QUESTION_COUNT);
  assert.deepEqual(edited.order, original.order);
  assert.throws(() => answerQuestion(original, 'q99', 'allow_more'));
});
test('townhome comparisons preserve the requested counts and direction', () => {
  for (const [ordinal, more, fewer] of [[1, 6, 3], [2, 10, 6], [4, 20, 14], [5, 5, 2], [6, 4, 2]]) {
    const q = QUESTION_BANK[ordinal - 1];
    assert.deepEqual([q.options.allow_more.netAdditionalHomes, q.options.require_feature.netAdditionalHomes], [more, fewer]);
  }
});
test('apartment floors explain the totals and stay within the low-rise scale', () => {
  for (const q of QUESTION_BANK) {
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
  const studios = QUESTION_BANK[14];
  assert.equal(studios.options.allow_more.totalCompletedHomes * 430, 5160);
  assert.equal(studios.options.require_feature.totalCompletedHomes * 645, 5160);
  assert.doesNotMatch(JSON.stringify(QUESTION_BANK), /m²|square metres|sqm/);
});
test('affordability composition and relocation arithmetic match the revised scenarios', () => {
  const q18 = QUESTION_BANK[17]; const q19 = QUESTION_BANK[18]; const q20 = QUESTION_BANK[19];
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
  const q17 = QUESTION_BANK[16];
  assert.equal(q17.comparisonMetric, 'bedrooms');
  assert.deepEqual(ANSWER_IDS.map(answer => q17.options[answer].totalCompletedHomes), [12, 12]);
  assert.deepEqual(ANSWER_IDS.map(answer => q17.options[answer].bedroomsPerHome), [2, 1]);
  assert.deepEqual(ANSWER_IDS.map(answer => q17.options[answer].homesByFloor), [[4, 4, 4], [4, 4, 4]]);
  assert.deepEqual(ANSWER_IDS.map(answer => q17.options[answer].totalCompletedHomes * q17.options[answer].bedroomsPerHome!), [24, 12]);
  assert.doesNotMatch(q17.policyQuestion, /more homes/);
  if (!QUESTIONS.some(q => q.id === q17.id)) return;
  const result = score({ ...allAnswers('require_feature'), q17: 'allow_more' })!;
  assert.equal(result.moreCount, 1);
  assert.equal(result.morePercent, 100 / QUESTION_COUNT);
  assert.equal(result.categories.housing_standards!.moreCount, 1);
});
test('malformed or incompatible storage is handled without silently mixing questionnaires', () => {
  assert.deepEqual(parseAttempt(null), { attempt: null, notice: null });
  for (const raw of ['{broken', 'null', '[]', '{}']) assert.equal(parseAttempt(raw).notice, 'malformed');
  assert.equal(parseAttempt(JSON.stringify({ ...newAttempt(), questionnaireVersion: 'v0' })).notice, 'updated');
  assert.equal(parseAttempt(JSON.stringify({ ...newAttempt(), questionnaireVersion: 'v1-draft-2026-10-24', answers: allAnswers('require_feature') })).notice, 'updated');
  assert.equal(parseAttempt(JSON.stringify({ ...newAttempt(), questionnaireVersion: 'v2-draft-2026-10-26', answers: allAnswers('require_feature') })).notice, 'updated');
  assert.equal(parseAttempt(JSON.stringify({ ...newAttempt(), questionnaireVersion: 'v3-draft-2026-10-28', answers: allAnswers('require_feature') })).notice, 'updated');
  assert.equal(parseAttempt(JSON.stringify({ ...newAttempt(), questionnaireVersion: 'v4-draft-2026-10-29', answers: allAnswers('require_feature') })).notice, 'updated');
  for (const profile of Object.values(QUESTIONNAIRES)) {
    if (profile.version !== QUESTIONNAIRE_VERSION) assert.equal(parseAttempt(JSON.stringify({ ...newAttempt(), questionnaireVersion: profile.version })).notice, 'updated');
  }
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
  assert.equal(resultText(results), `I prioritized housing supply in 1 of ${QUESTION_COUNT} scenarios (${100 / QUESTION_COUNT}%).`);
});
test('share links round-trip the active edition and legacy 20-question results', () => {
  assert.equal(new URL(shareResultUrl(1, 'https://example.org/quiz/')).hash, `#result=1-${QUESTION_COUNT}`);
  for (const denominator of [10, 20]) for (let n = 0; n <= denominator; n++) {
    const link = new URL(shareResultUrl(n, 'https://example.org/quiz/?private=value#old', denominator));
    assert.equal(link.pathname, '/quiz/');
    assert.equal(link.search, '');
    assert.equal(link.hash, `#result=${n}-${denominator}`);
    assert.deepEqual(parseSharedResult(link.hash), { moreCount: n, denominator, morePercent: 100 * n / denominator });
  }
  for (const hash of ['', '#main', '#result=-1-20', '#result=21-20', '#result=11-10', '#result=20-10', '#result=1.5-10', '#result=01-10', '#result=NaN-20', '#result=5-0', '#result=5-15', '#result=5-010', '#result=5-10&answers=q01']) assert.equal(parseSharedResult(hash), null);
  for (const n of [-1, QUESTION_COUNT + 1, NaN, Infinity, 2.5]) assert.throws(() => shareResultUrl(n, 'https://example.org'));
  for (const denominator of [0, 15, 10.5, NaN]) assert.throws(() => shareResultUrl(0, 'https://example.org', denominator));
});
