import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  routePoints, emptyGame, deriveState, canApply, colorStats, loadGame, saveGame,
  PLAYER_COLORS, WAGONS, STATIONS,
} from '../js/logic.js';

const ROUTES = [
  { id: 'r1', a: 'paris', b: 'wien', len: 3 },
  { id: 'r2', a: 'wien', b: 'berlin', len: 6 },
  { id: 'r3', a: 'berlin', b: 'essen', len: 8 },
  { id: 'r4', a: 'essen', b: 'paris', len: 8 },
  { id: 'r5', a: 'essen', b: 'wien', len: 8 },
  { id: 'r6', a: 'essen', b: 'riga', len: 8 },
  { id: 'r7', a: 'riga', b: 'wien', len: 6 },
];

test('constants', () => {
  assert.deepEqual(PLAYER_COLORS, ['red', 'blue', 'green', 'yellow', 'black']);
  assert.equal(WAGONS, 45);
  assert.equal(STATIONS, 3);
});

test('routePoints maps lengths', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 8].map(routePoints), [1, 2, 4, 7, 10, 15, 21]);
});

test('claim then unclaim', () => {
  const claim = { type: 'claim', route: 'r1', color: 'red' };
  assert.equal(deriveState([claim]).claims.get('r1'), 'red');
  const s = deriveState([claim, { type: 'unclaim', route: 'r1', prevColor: 'red' }]);
  assert.equal(s.claims.has('r1'), false);
});

test('unclaim stores previous color and undo restores it', () => {
  const actions = [
    { type: 'claim', route: 'r1', color: 'blue' },
    { type: 'unclaim', route: 'r1', prevColor: 'blue' },
  ];
  assert.equal(deriveState(actions.slice(0, -1)).claims.get('r1'), 'blue');
});

test('stations and tickets are derived', () => {
  const s = deriveState([
    { type: 'station', city: 'paris', color: 'red' },
    { type: 'addTicket', ticket: { id: 't1', a: 'paris', b: 'wien', points: 8, color: 'red', hue: '#f0a' } },
    { type: 'markTicket', id: 't1', manual: true },
    { type: 'addTicket', ticket: { id: 't2', a: 'paris', b: 'riga', points: 9, color: 'red', hue: '#0cf' } },
    { type: 'delTicket', id: 't2' },
    { type: 'station', city: 'wien', color: 'red' },
    { type: 'unstation', city: 'wien', prevColor: 'red' },
  ]);
  assert.equal(s.stations.get('paris'), 'red');
  assert.equal(s.stations.has('wien'), false);
  assert.equal(s.tickets.get('t1').manual, true);
  assert.equal(s.tickets.get('t1').points, 8);
  assert.equal(s.tickets.has('t2'), false);
});

test('canApply refuses double claim', () => {
  const s = deriveState([{ type: 'claim', route: 'r1', color: 'red' }]);
  const r = canApply(s, { type: 'claim', route: 'r1', color: 'blue' });
  assert.equal(r.ok, false);
  assert.ok(r.reason);
});

test('canApply refuses 4th station for a color', () => {
  const s = deriveState(['a', 'b', 'c'].map((city) => ({ type: 'station', city, color: 'blue' })));
  const r = canApply(s, { type: 'station', city: 'd', color: 'blue' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'Blue has no stations left');
  assert.equal(canApply(s, { type: 'station', city: 'd', color: 'red' }).ok, true);
});

test('canApply refuses second station in a city', () => {
  const s = deriveState([{ type: 'station', city: 'paris', color: 'red' }]);
  const r = canApply(s, { type: 'station', city: 'paris', color: 'blue' }, { paris: 'Paris' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'Paris already has a station');
});

test('canApply refuses same-city ticket', () => {
  const r = canApply(deriveState([]), { type: 'addTicket', ticket: { id: 't', a: 'paris', b: 'paris', points: 5, color: 'red' } });
  assert.equal(r.ok, false);
  assert.ok(r.reason);
});

test('canApply allows a normal claim', () => {
  assert.deepEqual(canApply(deriveState([]), { type: 'claim', route: 'r1', color: 'red' }), { ok: true });
});

test('colorStats sums wagons and points', () => {
  const s = deriveState([
    { type: 'claim', route: 'r1', color: 'red' },
    { type: 'claim', route: 'r2', color: 'red' },
    { type: 'claim', route: 'r3', color: 'blue' },
    { type: 'station', city: 'paris', color: 'red' },
  ]);
  assert.deepEqual(colorStats(s, ROUTES, 'red'), { routePts: 19, wagonsUsed: 9, wagonsLeft: 36, stationsUsed: 1 });
});

test('wagonsLeft can go negative', () => {
  const s = deriveState(['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7']
    .map((route) => ({ type: 'claim', route, color: 'red' })));
  // 3 + 6 + 8 + 8 + 8 + 8 + 6 = 47
  assert.equal(colorStats(s, ROUTES, 'red').wagonsLeft, -2);
});

function memStorage(initial = null) {
  let value = initial;
  return { getItem: () => value, setItem: (_k, v) => { value = v; } };
}

test('loadGame returns empty game on bad JSON', () => {
  assert.deepEqual(loadGame(memStorage('{oops')), emptyGame());
});

test('loadGame returns empty game on wrong shape', () => {
  assert.deepEqual(loadGame(memStorage('{"actions": 5}')), emptyGame());
  assert.deepEqual(loadGame(memStorage(null)), emptyGame());
});

test('saveGame/loadGame round-trip', () => {
  const st = memStorage();
  const game = { actions: [{ type: 'claim', route: 'r1', color: 'red' }], activeColor: 'blue' };
  saveGame(st, game);
  assert.deepEqual(loadGame(st), game);
});
