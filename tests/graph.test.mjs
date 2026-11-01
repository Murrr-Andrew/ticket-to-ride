import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isConnected, longestRoute, ticketStatus, ticketScore } from '../js/graph.js';
import { deriveState } from '../js/logic.js';

const ROUTES = [
  { id: 'ab1', a: 'A', b: 'B', len: 2 },
  { id: 'ab2', a: 'A', b: 'B', len: 2 },
  { id: 'bc', a: 'B', b: 'C', len: 3 },
  { id: 'ca', a: 'C', b: 'A', len: 1 },
  { id: 'cd', a: 'C', b: 'D', len: 4 },
  { id: 'xy', a: 'X', b: 'Y', len: 3 },
  { id: 'xz', a: 'X', b: 'Z', len: 4 },
  { id: 'xw', a: 'X', b: 'W', len: 1 },
];

const claims = (pairs) => new Map(pairs);

test('isConnected finds multi-hop path', () => {
  const c = claims([['ab1', 'red'], ['bc', 'red'], ['cd', 'red']]);
  assert.equal(isConnected(ROUTES, c, 'red', 'A', 'D'), true);
  assert.equal(isConnected(ROUTES, c, 'red', 'D', 'A'), true);
});

test('isConnected ignores other colors', () => {
  const c = claims([['ab1', 'red'], ['bc', 'red'], ['cd', 'blue']]);
  assert.equal(isConnected(ROUTES, c, 'red', 'A', 'D'), false);
});

test('longestRoute uses a loop once', () => {
  const c = claims([['ab1', 'red'], ['bc', 'red'], ['ca', 'red'], ['cd', 'red']]);
  assert.equal(longestRoute(ROUTES, c, 'red'), 10);
});

test('longestRoute uses both lines of a double route', () => {
  const c = claims([['ab1', 'red'], ['ab2', 'red'], ['bc', 'red']]);
  // B-A-B-C : 2 + 2 + 3
  assert.equal(longestRoute(ROUTES, c, 'red'), 7);
});

test('longestRoute with branches', () => {
  const c = claims([['xy', 'red'], ['xz', 'red'], ['xw', 'red']]);
  assert.equal(longestRoute(ROUTES, c, 'red'), 7);
});

test('longestRoute zero for no claims', () => {
  assert.equal(longestRoute(ROUTES, claims([]), 'red'), 0);
});

const ticket = (id, a, b, points) => ({ type: 'addTicket', ticket: { id, a, b, points, color: 'red', hue: '#f0a' } });

test('ticketStatus auto, manual and open', () => {
  const s = deriveState([
    { type: 'claim', route: 'ab1', color: 'red' },
    ticket('t1', 'A', 'B', 5),
    ticket('t2', 'A', 'D', 8),
    ticket('t3', 'X', 'Y', 4),
    { type: 'markTicket', id: 't2', manual: true },
  ]);
  assert.equal(ticketStatus(ROUTES, s, s.tickets.get('t1')), 'auto');
  assert.equal(ticketStatus(ROUTES, s, s.tickets.get('t2')), 'manual');
  assert.equal(ticketStatus(ROUTES, s, s.tickets.get('t3')), 'open');
});

test('ticketScore splits done and open', () => {
  const s = deriveState([
    { type: 'claim', route: 'ab1', color: 'red' },
    ticket('t1', 'A', 'B', 5),
    ticket('t2', 'A', 'D', 8),
    ticket('t3', 'X', 'Y', 4),
    { type: 'markTicket', id: 't2', manual: true },
  ]);
  assert.deepEqual(ticketScore(ROUTES, s, 'red'), { done: 13, open: 4 });
  assert.deepEqual(ticketScore(ROUTES, s, 'blue'), { done: 0, open: 0 });
});
