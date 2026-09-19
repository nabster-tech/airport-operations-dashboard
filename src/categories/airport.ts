export const airport = {
  id: 'meridian',
  code: 'MDI',
  name: 'Meridian International',
  operationsLabel: 'Airport operations center',
  timeZone: 'Asia/Kolkata',
  timeZoneAbbreviation: 'IST',
  baseCurrency: 'INR',
  snapshotInstant: '2026-09-17T14:00:00+05:30',
  fixtureLocalMidnightInstant: '2026-09-17T00:00:00+05:30',
  fixtureVersion: 'category-demo-v2',
} as const;

export const storageKeys = {
  layouts: `airside.categories.${airport.id}.v2`,
  legacyLayouts: `airside.workspace.${airport.id}.v1`,
  filters: `airside.filters.${airport.id}.v1`,
  presentation: `airside.presentation.${airport.id}.v1`,
} as const;
