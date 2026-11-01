import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeWagons } from '../js/geometry.js';

const A = { x: 0, y: 0 };
const B = { x: 200, y: 0 };

test('one wagon per space, in order from a to b', () => {
  const w = routeWagons({ len: 4, offset: 0, bend: null }, A, B);
  assert.equal(w.length, 4);
  for (let i = 1; i < 4; i++) assert.ok(w[i].x > w[i - 1].x);
  assert.ok(w[0].x > 0 && w[3].x < 200);
  for (const s of w) {
    assert.equal(Math.round(s.y), 0);
    assert.equal(Math.round(s.angle), 0);
  }
});

test('wagons stay clear of the city dots', () => {
  const w = routeWagons({ len: 1, offset: 0, bend: null }, A, B);
  assert.ok(w[0].x - w[0].w / 2 >= 12);
  assert.ok(w[0].x + w[0].w / 2 <= 188);
});

test('double line offset goes to the right of a→b', () => {
  const right = routeWagons({ len: 2, offset: 1, bend: null }, A, B);
  const left = routeWagons({ len: 2, offset: -1, bend: null }, A, B);
  assert.ok(right[0].y > 0, 'right of a left-to-right route is screen-down');
  assert.ok(left[0].y < 0);
});

test('bent route passes through the bend point', () => {
  const w = routeWagons({ len: 3, offset: 0, bend: [100, 60] }, A, B);
  const mid = w[1];
  assert.ok(Math.abs(mid.x - 100) < 3, `x ${mid.x}`);
  assert.ok(Math.abs(mid.y - 60) < 3, `y ${mid.y}`);
});
