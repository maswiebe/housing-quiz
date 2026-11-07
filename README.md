# The housing tradeoff

A responsive, illustrated housing tradeoff quiz. Ten hypothetical choices ask what a city should permit or require, followed by a neutral overall result. Click “Review your answers” to expand or collapse the list of answers and edit any choice.

Selecting an answer saves it immediately, shows a checkmark and a green selected state for 450 ms, then advances to the next question. The final answer opens the results after the same confirmation. Choices are briefly disabled to prevent duplicate clicks; leaving the question cancels the pending advance. Back returns to earlier questions; Next remains available when reviewing an already answered question.

## Run locally

Requires Node.js 20.19+ (or 22.12+) and npm.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite, normally http://127.0.0.1:5173. Progress is saved in this browser on this device. The quiz also works in memory if storage is blocked. There are no accounts, analytics, backend, or runtime AI services.

```sh
npm test         # scoring, dataset, and persistence tests
npm run build   # TypeScript checks and production build to dist/
npm run preview # serve the production build locally
npm run test:e2e # full desktop/mobile browser flows
```

The production preview is at `http://127.0.0.1:4173/housing-quiz/`. Development stays at the root URL; production assets use `/housing-quiz/` to match GitHub Pages.

After building, run `PLAYWRIGHT_PREVIEW=1 npm run test:e2e` to check the built website at its production subdirectory, including shared-result links, on desktop and mobile.

Browser tests use Google Chrome at `/usr/bin/google-chrome` when available. Otherwise install Playwright Chromium with `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing compatible browser. Playwright starts and stops its own development server unless one is already running on port 5173. Screenshots and failure traces are written to ignored `test-results/`. The illustration-gallery test renders all 40 options in five review sheets per viewport. Review these sheets alongside the full-page screenshots when changing drawings; functional tests alone cannot assess illustration quality.

## Editing

- `src/data/questions.ts`: active questionnaire selection, visible question numbering, category totals, and version.
- `src/data/question-bank.ts`: all 20 original questions, semantic answer IDs, home counts, assumptions, categories, and illustration descriptions. Unused questions and their SVG illustrations remain intact.
- `src/components/Illustration.tsx`: matched, replaceable SVG site plans, elevations, floor plans, view comparisons, and composition diagrams. Exterior buildings have closed roof surfaces; stepped floors share a fixed rear wall.
- `src/lib/quiz.ts`: pure scoring, answer updates, randomized persistent card order, and defensive browser storage.
- `src/App.tsx`: introduction, compact quiz cards, results, expandable answer review, native sharing, and clipboard/manual-copy fallback.
- `src/lib/share.ts`: aggregate-only share links and strict parsing; opening a shared result does not replace the viewer’s saved attempt.
- `src/components/About.tsx`: methodology, privacy explanation, and research links.
- `src/styles.css`: responsive layout, focus states, reduced-motion support, and print styles.

React + TypeScript + Vite; ordinary CSS, locally rendered SVGs, and system fonts. The npm lockfile records exact dependency versions. The original brief remains in `housing_quiz_codex_handoff.md`; `feedback.md` supersedes its initial counts and scale. The current dataset is the source of truth.

## Ten-question selection and restoring the full quiz

The active quiz uses the original Q1, Q3, Q4, Q6, Q7, Q8, Q9, Q11, Q12, and Q18, in that order, displayed as questions 1–10. Original IDs remain stable; the complete 20-question bank and all 40 illustrations are preserved.

To restore the 20-question version, change this line in `src/data/questions.ts`:

```ts
export const ACTIVE_QUESTIONNAIRE = QUESTIONNAIRES.full;
```

Then rebuild and deploy. The introduction, progress, scoring, answer review, About page, and sharing all follow the active selection. Set it back to `QUESTIONNAIRES.short` for ten questions. The short and full editions use different questionnaire versions, so incompatible saved attempts prompt a fresh start instead of mixing answers. Existing shared results from either edition remain readable.

## Interpretation and assumptions

Active questionnaire version: `v6-short-2026-11-06`. Each choice has one vote. A complete result requires all 10 active answers; housing supply percentages are calculated from semantic IDs, never card positions or home-count differences. Topic metadata remains in the data and scoring code for future use, but topic breakdowns are not shown on the results page. Internal topic denominators are 9 for neighborhood choices and 1 for affordability. The full version uses denominators of 12, 5, and 3; its Q17 holds home counts equal and counts the two-bedroom option toward housing supply because it adds bedroom capacity. Card order is randomized once per question per attempt and survives edits and refreshes. The preserved Q20 keeps the 2 → 4 option on the left and the 2 → 8 option on the right, as requested.

Across the full question bank, all home counts and diagrams are illustrative premises, not verified development, financial, solar, or safety analyses. Counts mean net additions; q20 separately shows the existing 2 homes and completed totals of 8 versus 4 (6 versus 2 net additions). Q18 compares 24 homes (20 market-rate, 4 restricted) with 16 (15 market-rate, 1 restricted), all restricted rents at 80% of the benchmark. Q19 compares 24 homes (22 market-rate, 2 restricted at 50%) with 16 (15 market-rate, 1 restricted at 80%). Restricted homes are included in every total. The stair scenario compares 12 two-bedroom homes around one central stair with 12 one-bedroom homes along a double-loaded corridor, with a stair at each end. Both designs have three storeys and four homes per floor; the floor plans draw two bedrooms or one bedroom in every apartment. The international context is sourced to [Smith & Mendoza, 2024, in HUD’s Cityscape](https://www.huduser.gov/portal/periodicals/cityscape/vol26num1/article25.html). These are schematic drawings, not compliance or safety findings. Supporting assumptions remain in the dataset; the expandable assumptions section and footer links were removed at the user’s request. Townhome scenarios use individual roof outlines for homes, with q2 spanning two parcels. Apartment proposals use four homes per full floor, up to six storeys; reduced floors are recorded explicitly in `homesByFloor` and shown in the captions. Drawn windows are not individual home counts; affordability composition squares each represent exactly one home, with four homes per row/floor. The studio comparison preserves 5,160 sq ft of apartment interiors (12 × 430 sq ft versus 8 × 645 sq ft).

The result records stated choices in these scenarios. It is not a validated survey, inferred motive, personality score, prediction, or claim about housing actually prevented. Individual answers are never transmitted or collected. Sharing explicitly sends only the aggregate result and its link through the user’s chosen share target. Browser storage uses `room-for-more.attempt`; starting again replaces that attempt. Malformed or incompatible saves prompt a fresh attempt without combining versions.

## GitHub Pages

The deployment target is `maswiebe/housing-quiz`, served at `https://michaelwiebe.com/housing-quiz/`. The `maswiebe.github.io` user site already owns the custom domain, so the quiz inherits it as a project site. Keep the quiz repository's custom-domain field empty and do not add a `CNAME` file.

Create the public `housing-quiz` repository under `maswiebe`, then select **Settings → Pages → Build and deployment → Source: GitHub Actions**. Upload the source, lockfile, configuration, and `.github/workflows/deploy.yml` to the `main` branch. The workflow installs dependencies, runs the core checks, builds `dist/`, and publishes it. Subsequent pushes to `main` publish updates; the workflow can also be run manually from Actions.

The production site is static. Only `dist/` is published; local feedback, source files, and tests are not part of the hosted website. Quiz answers remain in visitors' browsers.

## Sharing

“Share result” uses the device share dialog when supported, otherwise copies the main result and a link. If clipboard access is blocked, a selectable text field is shown. Links use a URL fragment such as `#result=8-10`; they contain only the overall count and denominator. The recipient sees that score and a button to take the quiz, with no per-question answers or topic breakdowns. Scores are user-shareable summaries, not authenticated records.

Links use the site's current address and preserve its subdirectory. On the production site, shared links use `https://michaelwiebe.com/housing-quiz/#result=N-10`. Legacy `#result=N-20` links still show their original score out of 20. A localhost link works only on the same computer.
