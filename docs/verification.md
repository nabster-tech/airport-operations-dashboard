# Verification record

Verified on 19 September 2026 on Windows with Node 24 and Chromium.

- TypeScript compilation, ESLint, Prettier, and the production Vite build passed.
- Vitest: 15 active-application tests passed, covering the exact 71-KPI inventory, category counts, finite calculations, rate reconciliation, filter semantics, cancellation, filter-document validation, layout isolation, migration, currency conversion, and timezone date rollover. Seventeen tests for the unused legacy application were removed rather than counted as product coverage.
- Playwright: all 15 Chromium browser scenarios passed collectively.
- All 11 category routes, membership counts, reload behavior, browser history, and unknown-route recovery passed.
- All 71 focus views opened with calculation/source content and returned active resize observations to baseline after repeated use.
- Pointer drag, menu height sizing, and edge/corner resize changed coordinates and survived reload; layouts remained independent between categories.
- Complete category filter selections remained isolated and survived reload.
- Keyboard KPI search, focused/category CSV content, responsive navigation, corrupt storage, and blocked storage recovery passed.
- Twenty animation frames at each of 390, 768, 1440, and 1920 pixels had no horizontal page overflow; settled mobile cards remained inside the viewport and top-bar controls were at least 44 pixels high.
- Automated axe WCAG 2 A/AA and 2.1 AA checks found no violations on category overview and focus views.
- Before and after mobile evidence is stored in `screenshots/review-before-mobile.png` and `screenshots/review-after-mobile.png`.
- The largest production chart chunk is approximately 387 kB before gzip and 110 kB after gzip.

Run commands are documented in the README. The complete review and remaining gates are in `docs/PROJECT_REVIEW_FINDINGS.md`. These results cover the static PoC. Firefox, Safari, manual screen-reader review, live data integration, production load, and streaming soak tests remain part of production acceptance. Automated accessibility checks do not replace a complete accessibility audit.
