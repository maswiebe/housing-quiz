import { GENERAL_ASSUMPTION, HAS_BEDROOM_COMPARISON, QUESTIONS, QUESTION_COUNT, QUESTIONNAIRE_VERSION } from '../data/questions';

export default function About() {
  const bedroomQuestion = QUESTIONS.find(q => q.comparisonMetric === 'bedrooms');
  const existingHomesQuestion = QUESTIONS.find(q => q.existingHomes > 0);
  return <div className="about-content">
    <h1 tabIndex={-1}>About this quiz</h1>
    <p className="lead">Housing decisions often involve more than a simple yes or no. This quiz makes some of those tradeoffs visible.</p>
    <section><h2>What are you choosing?</h2><p>Each scenario asks what the city should permit or require on a hypothetical site. The owner proposes the design with {HAS_BEDROOM_COMPARISON ? 'more homes or more bedrooms' : 'more homes'}. You can choose to allow that proposal or require the alternative shown.</p><p>There are no right or wrong answers. Liking the appearance of one building does not necessarily mean you would prohibit another.</p></section>
    <section><h2>How the results work</h2><p>Each of the {QUESTION_COUNT} questions counts once. Your result is the number of times you prioritize housing supply, divided by {QUESTION_COUNT}.</p>{bedroomQuestion && <p>In question {bedroomQuestion.ordinal}, both designs provide 12 homes. Choosing two-bedroom homes counts toward housing supply because it adds bedroom capacity.</p>}<p>We do not weight answers by home counts or infer your motives. This is a record of stated choices in these scenarios, not a validated personality measure, representative public-opinion survey, or prediction of your future decisions.</p></section>
    <section><h2>Illustrations, not development proposals</h2><p>{GENERAL_ASSUMPTION}</p><p>The scenarios use townhomes and low-rise apartments. Full apartment floors have four homes; setbacks, larger homes, and other layout changes can reduce that number. Floor counts appear with the illustrations.</p><p>All quantities are illustrative premises. They have not been verified against architectural plans, financial models, local regulations, or solar simulations. Windows in building drawings do not represent individual homes. Exact counts appear in the accompanying text.</p><p>Counts mean net additional homes.{existingHomesQuestion && ` Question ${existingHomesQuestion.ordinal} has existing homes and also shows the completed totals.`}</p></section>
    <section><h2>Your answers stay with you</h2><p>No account, email address, analytics, or response collection. Your progress is saved in this browser on this device when browser storage is available. Starting again replaces the saved attempt. Clearing your browser’s site data removes it. If you share a result, the link includes only your overall score, never your individual answers.</p></section>
    <section><h2>Further reading</h2><p>These studies inform the design. They do not validate this questionnaire or its hypothetical home counts.</p>
      <ul className="reading-list">
        {bedroomQuestion && <li><a href="https://www.huduser.gov/portal/periodicals/cityscape/vol26num1/article25.html" target="_blank" rel="noreferrer">Point Access Block Building Design <span aria-hidden="true">↗</span></a><span>Smith &amp; Mendoza, 2024 · Single-stair apartments and international building patterns</span></li>}
        <li><a href="https://doi.org/10.1177/10780874251398034" target="_blank" rel="noreferrer">Political Architecture: Contextual Development and Opposition to Housing <span aria-hidden="true">↗</span></a><span>Pietrzak &amp; Mendelberg · Architectural context and housing opposition</span></li>
        <li><a href="https://www.aeaweb.org/articles?id=10.1257/jep.20241428" target="_blank" rel="noreferrer">The Folk Economics of Housing <span aria-hidden="true">↗</span></a><span>Elmendorf, Nall &amp; Oklobdzija, 2025 · Beliefs about housing supply</span></li>
        <li><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC9499520/" target="_blank" rel="noreferrer">Planning instruments enhance the acceptance of urban densification <span aria-hidden="true">↗</span></a><span>Wicki, Hofer &amp; Kaufmann, 2022 · Development attributes and acceptance</span></li>
      </ul>
    </section>
    <p className="version">Questionnaire {QUESTIONNAIRE_VERSION}</p>
  </div>;
}

