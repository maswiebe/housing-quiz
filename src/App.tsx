import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, QUESTIONS, type AnswerId } from './data/questions';
import { answerQuestion, answeredCount, isComplete, loadAttempt, newAttempt, resultText, saveAttempt, score, type Attempt, type LoadResult, type Results } from './lib/quiz';
import { Illustration } from './components/Illustration';
import About from './components/About';
import { parseSharedResult, shareResultUrl } from './lib/share';

type Screen = 'home' | 'quiz' | 'results' | 'about' | 'shared';

function Arrow({ back = false }: { back?: boolean }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" style={back ? { transform: 'rotate(180deg)' } : undefined}><path d="M4 12h15m-6-6 6 6-6 6" /></svg>;
}

function Check({ selected }: { selected: boolean }) {
  return <span className={`choice-mark ${selected ? 'checked' : ''}`} aria-hidden="true">
    {selected && <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m4 10 4 4 8-9" /></svg>}
  </span>;
}

function ResultsView({ attempt, results, onEdit, onRestart }: {
  attempt: Attempt; results: Results; onEdit: (id: string) => void; onRestart: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState('');
  const [fallback, setFallback] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shareUrl = shareResultUrl(results.moreCount, window.location.href);
  const shareText = `${resultText(results)}\n\n${shareUrl}`;
  const copyRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (fallback) { copyRef.current?.focus(); copyRef.current?.select(); }
  }, [fallback]);

  async function share() {
    setSharing(true);
    setCopyStatus('');
    setFallback(false);
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title: 'The housing tradeoff', text: resultText(results), url: shareUrl });
          setCopyStatus('Result shared.');
          return;
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;
        }
      }
      try {
        await navigator.clipboard.writeText(shareText);
        setCopyStatus('Result and link copied.');
      } catch {
        setFallback(true);
        setCopyStatus('Select and copy your result and link below.');
      }
    } finally {
      setSharing(false);
    }
  }

  return <div className="results-page">
    <h1 tabIndex={-1}>Your choices</h1>
    <section className="result-main" aria-label="Your overall results">
      <h2 className="result-headline">You support more homes <span>{results.morePercent}% of the time</span></h2>
      <p>You prioritized housing supply in <strong>{results.moreCount} of 20 scenarios</strong>.</p>
    </section>
    <section className="domain-section" aria-labelledby="domain-title">
      <h2 id="domain-title">Housing supply choices by topic</h2>
      <dl className="domain-list">{CATEGORIES.map(category => {
        const s = results.categories[category.id];
        return <div className="domain-row" key={category.id}>
          <dt>{category.label}</dt>
          <dd><strong>{s.moreCount} / {s.denominator}</strong><span>{s.morePercent}%</span></dd>
        </div>;
      })}</dl>
    </section>
    <div className="result-actions">
      <button className="button primary" onClick={share} disabled={sharing}>Share result</button>
      <button className="button secondary" onClick={() => onEdit(QUESTIONS[0].id)}>Edit answers</button>
      <button className="text-button" onClick={onRestart}>Start again</button>
      <span className="copy-status" role="status">{copyStatus}</span>
    </div>
    {fallback && <div className="copy-fallback">
      <label htmlFor="result-copy">Your share text</label>
      <textarea id="result-copy" ref={copyRef} readOnly rows={4} value={shareText} />
      <button className="text-button" onClick={() => { copyRef.current?.focus(); copyRef.current?.select(); }}>Select all text</button>
    </div>}
    <section className="answer-review" aria-labelledby="review-title">
      <h2 id="review-title">Review your answers</h2>
      {CATEGORIES.map(category => <details className="review-group" key={category.id}>
        <summary><span>{category.label}</span><span className="expand-mark" aria-hidden="true">+</span></summary>
        {QUESTIONS.filter(q => q.category === category.id).map(q => {
          const option = q.options[attempt.answers[q.id]!];
          return <div className="review-row" key={q.id}>
            <span className="review-index">{q.ordinal}</span>
            <div><h3>{q.title}</h3><p>{option.action}</p>
              <span className="review-counts">Compared: {q.comparisonMetric === 'bedrooms'
                ? `${q.options.allow_more.totalCompletedHomes} ${q.options.allow_more.bedroomsPerHome}-bedroom homes vs ${q.options.require_feature.totalCompletedHomes} ${q.options.require_feature.bedroomsPerHome}-bedroom homes`
                : `${q.options.allow_more.netAdditionalHomes} vs ${q.options.require_feature.netAdditionalHomes} net additional homes`}{q.existingHomes > 0 ? ` · ${q.options.allow_more.totalCompletedHomes} vs ${q.options.require_feature.totalCompletedHomes} completed homes` : ''}</span>
            </div>
            <button className="text-button" onClick={() => onEdit(q.id)} aria-label={`Edit answer ${q.ordinal}: ${q.title}`}>Edit</button>
          </div>;
        })}
      </details>)}
    </section>
  </div>;
}

export default function App() {
  const [initial] = useState(loadAttempt);
  const [attempt, setAttempt] = useState<Attempt | null>(initial.attempt);
  const [notice, setNotice] = useState<LoadResult['notice']>(initial.notice);
  const [sharedResult, setSharedResult] = useState(() => parseSharedResult(window.location.hash));
  const [screen, setScreen] = useState<Screen>(sharedResult ? 'shared' : 'home');
  const [returnScreen, setReturnScreen] = useState<Screen>('home');
  const [restartOpen, setRestartOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const didMount = useRef(false);
  const index = Math.max(0, QUESTIONS.findIndex(q => q.id === attempt?.currentQuestionId));
  const q = QUESTIONS[index];
  const count = attempt ? answeredCount(attempt.answers) : 0;
  const completed = attempt ? isComplete(attempt.answers) : false;
  const results = attempt ? score(attempt.answers) : null;

  useEffect(() => { if (attempt && !saveAttempt(attempt)) setNotice('unavailable'); }, [attempt]);
  useEffect(() => {
    function onHashChange() {
      const shared = parseSharedResult(window.location.hash);
      setSharedResult(shared);
      setScreen(current => shared ? 'shared' : current === 'shared' ? 'home' : current);
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  useEffect(() => {
    document.title = screen === 'quiz' ? `${index + 1}/20 · ${q.title} — The housing tradeoff` : screen === 'results' ? 'Your results — The housing tradeoff' : screen === 'shared' ? 'Shared result — The housing tradeoff' : screen === 'about' ? 'About the quiz — The housing tradeoff' : 'The housing tradeoff';
    if (didMount.current) {
      mainRef.current?.querySelector<HTMLElement>('h1')?.focus();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    didMount.current = true;
  }, [screen, index, q.title]);
  useEffect(() => {
    if (restartOpen) dialogRef.current?.showModal(); else dialogRef.current?.close();
  }, [restartOpen]);

  function start() {
    setAttempt(newAttempt());
    setScreen('quiz');
    setRestartOpen(false);
    setNotice(n => n === 'unavailable' ? n : null);
  }
  function home() {
    if (window.location.hash.startsWith('#result=')) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setSharedResult(null);
    setScreen('home');
  }
  function edit(id: string) {
    setAttempt(a => a ? { ...a, currentQuestionId: id } : a);
    setScreen('quiz');
  }
  function select(answer: AnswerId) {
    setAttempt(a => a ? answerQuestion(a, q.id, answer) : a);
  }
  function next() {
    if (!attempt?.answers[q.id]) return;
    if (index < QUESTIONS.length - 1) edit(QUESTIONS[index + 1].id);
    else if (completed) setScreen('results');
    else edit(QUESTIONS.find(item => !attempt.answers[item.id])!.id);
  }
  function showAbout() {
    if (screen !== 'about') setReturnScreen(screen);
    setScreen('about');
  }
  const noticeText = notice === 'updated'
    ? 'The quiz has been updated. Your earlier answers belong to a different version. Start a fresh attempt below.'
    : notice === 'malformed' ? 'Your saved attempt could not be read. Start a fresh attempt below.'
    : notice === 'unavailable' ? 'Browser storage is unavailable. You can still take the quiz, but your progress will only last while this page stays open.' : '';

  return <>
    <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); mainRef.current?.querySelector<HTMLElement>('h1')?.focus(); }}>Skip to content</a>
    <header className="site-header">
      <button className="brand" onClick={home} aria-label="The housing tradeoff — home">The housing tradeoff</button>
      <nav aria-label="Main navigation">{screen === 'about'
        ? <button className="text-button" onClick={() => setScreen(returnScreen)}><Arrow back /> Back to {returnScreen === 'quiz' ? 'quiz' : returnScreen === 'results' ? 'results' : returnScreen === 'shared' ? 'shared result' : 'home'}</button>
        : <button className="text-button" onClick={showAbout}>About the quiz</button>}
      </nav>
    </header>
    <main id="main" ref={mainRef}>
      {noticeText && screen !== 'shared' && <div className="notice" role="status">{noticeText}</div>}
      {screen === 'shared' && sharedResult && <div className="results-page shared-result">
        <h1 tabIndex={-1}>Shared result</h1>
        <section className="result-main" aria-label="Shared overall result">
          <div className="result-number">{sharedResult.morePercent}<span>%</span></div>
          <p>This person prioritized housing supply in <strong>{sharedResult.moreCount} of {sharedResult.denominator} scenarios</strong>.</p>
        </section>
        <div className="result-actions"><button className="button primary" onClick={home}>Take the quiz <Arrow /></button></div>
      </div>}
      {screen === 'home' && <section className="landing">
        <h1 tabIndex={-1}>What would you trade for more homes?</h1>
        <p className="landing-intro">20 illustrated choices about housing and the conditions we put on new homes.</p>
        <p>Each owner proposes more homes or more bedrooms. Decide whether the city should allow the proposal or require the alternative.</p>
        {count > 0 && <p className="save-note">{count} of 20 answered · {notice === 'unavailable' ? 'Progress in this tab only' : 'Saved on this device'}</p>}
        <div className="landing-actions">
          <button className="button primary" onClick={() => completed ? setScreen('results') : attempt && count > 0 ? setScreen('quiz') : start()}>
            {completed ? 'See your results' : count > 0 ? 'Continue the quiz' : 'Start the quiz'} <Arrow />
          </button>
          {count > 0 && <button className="text-button" onClick={() => setRestartOpen(true)}>Start again</button>}
        </div>
      </section>}
      {screen === 'quiz' && attempt && <div className="quiz-page">
        <div className="quiz-progress">
          <span>Question {index + 1} of 20</span>
          <div className="progress-track" role="progressbar" aria-label="Answered questions" aria-valuenow={count} aria-valuemin={0} aria-valuemax={20}>
            <span style={{ width: `${count * 5}%` }} />
          </div>
        </div>
        <div className="question-heading">
          <h1 tabIndex={-1}>{q.title}</h1>
          <p className="question-context">{q.context}</p>
          <p className="policy-question" id="policy-question">{q.policyQuestion}</p>
        </div>
        <div className="options-grid" role="group" aria-labelledby="policy-question">
          {attempt.order[q.id].map(answer => {
            const option = q.options[answer];
            const selected = attempt.answers[q.id] === answer;
            return <article key={`${q.id}-${answer}`} className={`option-card ${selected ? 'selected' : ''}`} data-answer={answer}>
              <div className="homes-count"><strong>{option.netAdditionalHomes}</strong><span>{option.bedroomsPerHome ? `${option.bedroomsPerHome}-bedroom homes` : q.existingHomes ? 'net additional homes' : 'new homes'}</span></div>
              <Illustration question={q} answer={answer} />
              <div className="option-body">
                <p className="option-description">{option.details.join(' ')}</p>
                <button className="choice-button" aria-label={option.action} aria-pressed={selected} onClick={() => select(answer)}>
                  <Check selected={selected} /><span>{answer === 'allow_more' ? 'Allow this proposal' : 'Require this alternative'}</span>
                  {selected && <span className="sr-only">Selected</span>}
                </button>
              </div>
            </article>;
          })}
        </div>
        <div className="question-navigation">
          <button className="text-button" onClick={() => index === 0 ? setScreen('home') : edit(QUESTIONS[index - 1].id)}><Arrow back />{index === 0 ? 'Introduction' : 'Back'}</button>
          <div className="next-actions">
            {completed && index < 19 && <button className="text-button" onClick={() => setScreen('results')}>Return to results</button>}
            <button className="button primary" disabled={!attempt.answers[q.id]} onClick={next}>{index === 19 ? 'See your results' : 'Next question'}<Arrow /></button>
          </div>
        </div>
      </div>}
      {screen === 'results' && attempt && results && <ResultsView attempt={attempt} results={results} onEdit={edit} onRestart={() => setRestartOpen(true)} />}
      {screen === 'about' && <About />}
    </main>
    <dialog ref={dialogRef} className="restart-dialog" onCancel={() => setRestartOpen(false)} aria-labelledby="restart-title" aria-describedby="restart-description">
      <h2 id="restart-title">Start again?</h2>
      <p id="restart-description">This replaces your saved answers and starts a new set of 20 choices.</p>
      <div><button className="button secondary" autoFocus onClick={() => setRestartOpen(false)}>Keep my answers</button><button className="button primary" onClick={start}>Start again</button></div>
    </dialog>
  </>;
}
