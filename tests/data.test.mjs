import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CITIES, ROUTES, VIEWBOX } from '../js/data.js';

const ROUTE_COLORS = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'orange', 'pink', 'gray'];
const cityIds = new Set(CITIES.map((c) => c.id));
const byId = new Map(ROUTES.map((r) => [r.id, r]));

test('47 cities with unique ids inside the viewbox', () => {
  assert.equal(CITIES.length, 47);
  assert.equal(cityIds.size, 47);
  for (const c of CITIES) {
    assert.ok(c.x > 0 && c.x < VIEWBOX.w && c.y > 0 && c.y < VIEWBOX.h, c.id);
  }
});

test('101 routes with unique ids', () => {
  assert.equal(ROUTES.length, 101);
  assert.equal(byId.size, 101);
});

test('every route references existing, different cities', () => {
  for (const r of ROUTES) {
    assert.ok(cityIds.has(r.a), `${r.id}: ${r.a}`);
    assert.ok(cityIds.has(r.b), `${r.id}: ${r.b}`);
    assert.notEqual(r.a, r.b, r.id);
  }
});

test('lengths, colors and locomotives are valid', () => {
  for (const r of ROUTES) {
    assert.ok([1, 2, 3, 4, 6, 8].includes(r.len), `${r.id} len ${r.len}`);
    assert.ok(ROUTE_COLORS.includes(r.color), `${r.id} color ${r.color}`);
    assert.ok(r.loco >= 0 && r.loco <= r.len, `${r.id} loco`);
    assert.equal(typeof r.tunnel, 'boolean', r.id);
  }
});

test('double routes are paired both ways and differ in color unless gray', () => {
  for (const r of ROUTES.filter((x) => x.pair)) {
    const p = byId.get(r.pair);
    assert.ok(p, `${r.id} pair missing`);
    assert.equal(p.pair, r.id);
    assert.deepEqual([p.a, p.b].sort(), [r.a, r.b].sort());
    if (r.color !== 'gray') assert.notEqual(p.color, r.color, r.id);
  }
});

test('double routes are offset', () => {
  for (const r of ROUTES) {
    if (r.pair) {
      assert.ok(r.offset === -1 || r.offset === 1, r.id);
      assert.equal(byId.get(r.pair).offset, -r.offset, r.id);
    } else {
      assert.equal(r.offset, 0, r.id);
    }
  }
});

test('graph is connected', () => {
  const seen = new Set(['paris']);
  const queue = ['paris'];
  while (queue.length) {
    const c = queue.shift();
    for (const r of ROUTES) {
      const next = r.a === c ? r.b : r.b === c ? r.a : null;
      if (next && !seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  assert.equal(seen.size, 47);
});

test('known totals from the rulebook', () => {
  // 240 wagon spaces on the Europe board is not published; check a few anchors instead.
  const find = (a, b) => ROUTES.filter((r) => [r.a, r.b].sort().join() === [a, b].sort().join());
  assert.equal(find('stockholm', 'petrograd')[0].len, 8);
  assert.equal(find('stockholm', 'petrograd')[0].tunnel, true);
  assert.equal(find('palermo', 'smyrna')[0].loco, 2);
  assert.equal(find('edinburgh', 'london').length, 2);
  assert.deepEqual(find('wien', 'budapest').map((r) => r.color).sort(), ['red', 'white']);
});
