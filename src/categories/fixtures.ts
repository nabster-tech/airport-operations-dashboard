import { options } from './models';
export const flights = Array.from({ length: 168 }, (_, i) => {
  const scheduled = i * 5;
  const delay = i % 29 === 0 ? 72 : i % 7 === 0 ? 23 : (i % 13) - 4;
  const actual = scheduled + delay;
  const terminal = options.terminal[i % 3],
    carrier = options.carrier[i % 3],
    runway = options.runway[i % 2];
  const turn = 36 + (i % 23),
    onBlock = actual - turn;
  return {
    id: 'MD' + String(100 + i),
    terminal,
    carrier,
    runway,
    movement: i % 2 ? 'departures' : 'arrivals',
    scheduled,
    actual,
    cancelled: i % 41 === 0,
    completed: actual <= 840,
    base: carrier === 'Meridian Air',
    turn,
    onBlock,
    plannedTurn: 45,
    tobt: scheduled + (i % 4),
    tsat: scheduled - 4,
    startApproval: scheduled - 3 + (i % 7),
    firstBag: actual + 8 + (i % 7),
    lastBag: actual + 22 + (i % 13),
    taxiIn: 5 + (i % 8),
    taxiOut: 8 + (i % 12),
    runwaySeconds: 42 + (i % 25),
    stand: 'S' + String((i % 18) + 1).padStart(2, '0'),
    milestoneOffsets: [(i % 9) - 2, (i % 13) - 3, (i % 7) - 1],
    reallocated: i % 11 === 0,
    vdgs: i % 17 !== 0,
  };
});
export const intervals = Array.from({ length: 56 }, (_, i) => ({
  start: i * 15,
  end: (i + 1) * 15,
}));
export const resources = options.terminal.flatMap((terminal, t) =>
  options.resource.flatMap((resource, r) =>
    Array.from({ length: 2 }, (_, j) => ({
      id: resource + '-' + (t * 2 + j + 1),
      terminal,
      resource,
      intervals: intervals.map(({ start, end }, i) => ({
        start,
        end,
        available: i % 19 !== 0,
        used: 5 + ((i + t + r + j) % 10),
        requested: 2 + ((i + j) % 3),
        fulfilled: 2 + ((i + j) % 3) - (i % 13 === 0 ? 1 : 0),
        response: 3 + ((i + t + j) % 9),
        apu: resource === 'GPU' ? (i + t + j) % 8 : 0,
      })),
    })),
  ),
);
export const stands = Array.from({ length: 18 }, (_, i) => ({
  id: 'S' + String(i + 1).padStart(2, '0'),
  terminal: options.terminal[i % 3],
  apron: 'Apron ' + (Math.floor(i / 6) + 1),
  intervals: intervals.map(({ start, end }, n) => ({
    start,
    end,
    available: n % 27 !== 0,
    used: 7 + ((i + n) % 9),
    conflict: (i * 7 + n) % 97 === 0,
    queue: (i + n) % 5,
  })),
}));
export const safetyEvents = [
  {
    id: 'EV001',
    minute: 85,
    kind: 'incursion',
    severity: 'Major',
    response: 7,
    onset: 80,
    phase: 'runway',
  },
  {
    id: 'EV002',
    minute: 135,
    kind: 'vehicle',
    severity: 'Moderate',
    response: 5,
    onset: null,
    phase: 'apron',
  },
  {
    id: 'EV003',
    minute: 230,
    kind: 'proximity',
    severity: 'Moderate',
    response: 4,
    onset: 227,
    phase: 'taxi',
  },
  {
    id: 'EV004',
    minute: 410,
    kind: 'fod',
    severity: 'Minor',
    response: 8,
    onset: 407,
    phase: 'runway',
  },
  {
    id: 'EV005',
    minute: 510,
    kind: 'wildlife-event',
    severity: 'Minor',
    response: 6,
    onset: null,
    phase: 'runway',
  },
  {
    id: 'EV006',
    minute: 555,
    kind: 'proximity',
    severity: 'Moderate',
    response: 3,
    onset: 552,
    phase: 'apron',
  },
  {
    id: 'EV007',
    minute: 620,
    kind: 'obstacle',
    severity: 'Moderate',
    response: 9,
    onset: 614,
    phase: 'apron',
  },
  {
    id: 'EV008',
    minute: 725,
    kind: 'wildlife-strike',
    severity: 'Major',
    response: 10,
    onset: 725,
    phase: 'runway',
  },
  {
    id: 'EV009',
    minute: 795,
    kind: 'proximity',
    severity: 'Minor',
    response: 4,
    onset: 792,
    phase: 'taxi',
  },
  {
    id: 'EV010',
    minute: 805,
    kind: 'fod',
    severity: 'Minor',
    response: 5,
    onset: null,
    phase: 'apron',
  },
].map((e, i) => ({ ...e, terminal: options.terminal[i % 3], runway: options.runway[i % 2] }));
export const weatherEpisodes = [
  { id: 'LVP01', start: 75, end: 120, activated: 78, deactivated: 123, recovered: 135 },
  { id: 'LVP02', start: 480, end: 535, activated: 486, deactivated: 539, recovered: 551 },
  { id: 'LVP03', start: 775, end: 815, activated: 778, deactivated: 818, recovered: 830 },
];
export const terminalSamples = intervals.flatMap(({ start, end }, i) =>
  options.terminal.map((terminal, t) => {
    const passengers = 180 + Math.round(60 * Math.sin(i / 5 + t)) + t * 35;
    const capacity = terminal === 'T2' ? 260 : 300;
    return {
      id: 'P' + i + '-' + t,
      terminal,
      start,
      end,
      passengers,
      capacity,
      forecast: passengers + Math.round(18 * Math.cos(i / 6 + t)),
      counterUsed: 30 + ((i + t) % 20),
      counterAvailable: 60,
      bags: passengers * 2,
      correctBags: passengers * 2 - (i % 13 === 0 ? 2 : 0),
      boarding: 2 + ((i + t) % 5) / 3,
      immigration: 3 + ((i + 2 * t) % 7) / 2,
      checkinWait: 6 + ((i + t) % 14),
      securityWait: 5 + ((i + 3 * t) % 20),
      immigrationWait: 7 + ((i + t) % 18),
      responses: 12 + ((i + t) % 8),
      satisfaction: 68 + ((i + 3 * t) % 25),
    };
  }),
);
export const reports = intervals.map(({ start, end }, i) => ({
  id: 'MET' + i,
  start,
  end,
  received: i % 17 !== 0,
  issued: start + (i % 11 === 0 ? 7 : 2),
  rvrValid: i % 23 !== 0,
  feedFailures: i % 17 === 0 ? 1 : 0,
  expectedFeeds: 4,
}));
export const drills = [
  { id: 'DR01', minute: 120, label: 'Airfield response', completed: true },
  { id: 'DR02', minute: 430, label: 'Evacuation exercise', completed: true },
  { id: 'DR03', minute: 790, label: 'Equipment readiness', completed: false },
];
