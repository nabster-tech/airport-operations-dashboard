import { airport, terminals } from './config';
import type { Fixture, Flight, Movement, Terminal, GateStatus } from './types';
const quarter = 15 * 60_000;
const end = Date.parse(airport.asOf);
const terminalIds = Object.keys(terminals) as Terminal[];
const movements: Movement[] = ['arrivals', 'departures'];
const iso = (ms: number) => new Date(ms).toISOString();

// This fixed recipe produces the same bundled fixture on every visit. It never reads the system clock.
export function createMockData(): Fixture {
  const fixture: Fixture = {
    asOf: airport.asOf,
    revision: 'meridian-2026-09-17-v1',
    flows: [],
    security: [],
    commerce: [],
    cargo: [],
    flights: [],
    queues: [],
    parking: [],
    gates: [],
    occupancy: [],
  };
  for (let i = 0; i < 96; i++) {
    const stamp = end - (95 - i) * quarter;
    const time = iso(stamp);
    const wave = 1 + 0.38 * Math.sin(i / 7) + 0.16 * Math.cos(i / 3);
    terminalIds.forEach((terminal, t) => {
      movements.forEach((movement, m) => {
        const forecast = Math.round((145 + t * 22 + m * 30) * wave);
        const passengers = Math.round(forecast * (0.92 + ((i + t * 3 + m) % 9) / 60));
        fixture.flows.push({
          time,
          terminal,
          movement,
          passengers,
          forecast,
          incidents: (i + t + m) % 19 === 0 ? 2 : (i * 3 + t + m) % 13 === 0 ? 1 : 0,
        });
      });
      for (let c = 0; c < 2; c++) {
        const base = t === 1 ? (c === 0 ? 22.4 : 17.8) : t === 2 ? 11.2 + c : 6.8 + c;
        const wait = Number(
          (base + 1.8 * Math.sin(i / 6 + c) + (i > 88 && t === 1 ? 2 : 0)).toFixed(1),
        );
        fixture.security.push({
          time,
          terminal,
          checkpoint:
            terminal === 'international'
              ? 'INT ' + (c + 1)
              : 'T' + (t + 1) + ' · ' + (c === 0 ? 'North' : 'South'),
          wait,
          samples: 18 + ((i + t + c) % 30),
          p95: Number((wait * 1.38).toFixed(1)),
        });
      }
      fixture.commerce.push({
        time,
        terminal,
        retail: Math.round((2450 + t * 880) * wave),
        dining: Math.round((1650 + t * 470) * wave),
      });
    });
    movements.forEach((movement, m) =>
      ['General', 'Express', 'Perishables'].forEach((category, c) => {
        fixture.cargo.push({
          time,
          movement,
          category,
          tonnes: Number(((1.8 + c * 0.65 + m * 0.2) * wave).toFixed(2)),
          target: 3.2 + c * 0.8,
        });
      }),
    );
    for (let r = 0; r < 2; r++) {
      const start = stamp - quarter + 45_000 + r * 12_000;
      const duration = (4.2 + ((i * 5 + r * 3) % 7)) * 60_000;
      fixture.occupancy.push({
        runway: r === 0 ? '09L / 27R' : '09R / 27L',
        start: iso(start),
        end: iso(start + duration),
      });
    }
  }
  terminalIds.forEach((terminal, t) => {
    for (let i = 0; i < 96; i++) {
      const movement: Movement = i % 2 === 0 ? 'arrivals' : 'departures';
      const scheduled = end - (95 - i) * quarter - (t * 3 + 2) * 60_000;
      const cancelled = (i + t * 11) % 37 === 0;
      const missing = (i + t * 7) % 43 === 0;
      const delay = (i + t) % 6 === 0 ? 24 + (i % 12) : (i + t) % 9 === 0 ? 17 : ((i + t) % 10) - 4;
      const actual = cancelled || missing ? null : iso(scheduled + delay * 60_000);
      const actualMs = actual ? Date.parse(actual) : 0;
      const bagDuration = 12 + ((i + t * 3) % 12) + (t === 1 ? 5 : 0);
      const flight: Flight = {
        id: ['MR', 'AX', 'SI'][t] + ' ' + (110 + i),
        airline: ['Meridian Air', 'Aero Express', 'Sky International'][(i + t) % 3],
        aircraft: i % 3 === 0 ? 'B737' : 'A320',
        terminal,
        movement,
        scheduled: iso(scheduled),
        actual,
        predictedDelay: missing ? null : delay,
        cancelled,
        onBlock:
          movement === 'departures' && actual
            ? iso(actualMs - (32 + (i % 16) + (t === 1 ? 9 : 0)) * 60_000)
            : null,
        firstBag: movement === 'arrivals' && actual ? iso(actualMs + 7 * 60_000) : null,
        lastBag:
          movement === 'arrivals' && actual ? iso(actualMs + (7 + bagDuration) * 60_000) : null,
        belt: 'T' + (t + 1) + ' · Belt ' + ((Math.floor(i / 2) % 2) + 1),
      };
      fixture.flights.push(flight);
    }
    fixture.queues.push({
      terminal,
      label: terminals[terminal],
      count: [37, 91, 48][t],
      capacity: [100, 110, 90][t],
      desks: [12, 14, 10][t],
    });
    fixture.parking.push({
      terminal,
      label: ['T1 · North garage', 'T2 · East garage', 'INT · West garage'][t],
      occupied: [486, 672, 352][t],
      capacity: [720, 800, 560][t],
    });
    for (let g = 0; g < 16; g++) {
      const n = g + t * 16;
      const status: GateStatus =
        n % 11 === 0 ? 'unavailable' : n % 7 === 0 ? 'reserved' : n % 3 === 0 ? 'free' : 'occupied';
      fixture.gates.push({
        id: ['A', 'B', 'C'][t] + String(g + 1).padStart(2, '0'),
        terminal,
        status,
        assignment:
          status === 'occupied'
            ? ['MR', 'AX', 'SI'][t] + ' ' + (170 + g)
            : status === 'reserved'
              ? 'Next movement reserved'
              : 'No assignment',
      });
    }
  });
  return fixture;
}
export const mockData = createMockData();
