# Verification record

Verified on 18 September 2026 on Windows with Node 24 and Chromium.

- TypeScript compilation, ESLint, Prettier, and the production Vite build passed.
- Vitest: 30 tests passed, covering the exact 71-KPI inventory, category counts, finite calculations, rate reconciliation, filter semantics, cancellation, layout isolation, storage recovery, and migration.
- Playwright: all 9 browser scenarios passed collectively.
- All 11 category routes, membership counts, reload behavior, browser history, and unknown-route recovery passed.
- All 71 focus views opened with calculation/source content and returned active resize observations to baseline after repeated use.
- Pointer drag and edge/corner resize changed coordinates and survived reload; layouts remained independent between categories.
- KPI search, focused/category CSV exports, responsive navigation, corrupt storage, and blocked storage recovery passed.
- Viewports at 390, 768, 1440, and 1920 pixels had no horizontal page overflow and contained measurable charts.
- Automated axe WCAG 2 A/AA and 2.1 AA checks found no violations on category overview and focus views.
- Desktop and mobile screenshots were generated and the desktop category composition was visually reviewed.
- The largest production chart chunk is approximately 387 kB before gzip and 110 kB after gzip.

Run commands are documented in the README. These results cover the static PoC. Firefox, Safari, manual screen-reader review, live data integration, production load, and streaming soak tests remain part of production acceptance. Automated accessibility checks do not replace a complete accessibility audit.
