// Draws the board as one SVG and handles pan, pinch-zoom and taps.

import { CITIES, ROUTES, VIEWBOX } from './data.js';
import { routeWagons, routePath } from './geometry.js';

const NS = 'http://www.w3.org/2000/svg';

export const ROUTE_FILL = {
  red: '#d1342b', blue: '#2a8fd6', green: '#6caf2c', yellow: '#f2c419', black: '#2e2b29',
  white: '#f6f2e8', orange: '#ee8a2b', pink: '#c46ac7', gray: '#a19c94',
};

export const PLAYER_FILL = {
  red: '#e3261b', blue: '#1b56d1', green: '#16923a', yellow: '#ffd500', black: '#121212',
};

const cityById = new Map(CITIES.map((c) => [c.id, c]));

function el(tag, attrs = {}, parent = null) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

const layers = {};
const wagonsOf = new Map(); // routeId -> wagon geometry

export function renderMap(svg, handlers) {
  svg.setAttribute('viewBox', `0 0 ${VIEWBOX.w} ${VIEWBOX.h}`);
  svg.innerHTML = '';

  const defs = el('defs', {}, svg);
  // Locomotive mark for ferry spaces: a tiny engine.
  const loco = el('symbol', { id: 'loco', viewBox: '0 0 20 12' }, defs);
  el('path', { d: 'M2 3h9v-2h3v2h3l2 4v3H2z', fill: '#1d1d1d' }, loco);
  el('circle', { cx: 6, cy: 10, r: 2, fill: '#1d1d1d' }, loco);
  el('circle', { cx: 14, cy: 10, r: 2, fill: '#1d1d1d' }, loco);
  // Station: a little house.
  const station = el('symbol', { id: 'station', viewBox: '0 0 20 20' }, defs);
  el('path', { d: 'M2 9 10 2l8 7v9H2z', stroke: '#fff', 'stroke-width': 2, 'stroke-linejoin': 'round' }, station);

  el('rect', { x: 0, y: 0, width: VIEWBOX.w, height: VIEWBOX.h, class: 'board-bg' }, svg);

  layers.routes = el('g', { class: 'routes' }, svg);
  layers.rings = el('g', { class: 'rings' }, svg);
  layers.cities = el('g', { class: 'cities' }, svg);
  layers.stations = el('g', { class: 'stations' }, svg);

  for (const r of ROUTES) {
    const a = cityById.get(r.a);
    const b = cityById.get(r.b);
    const g = el('g', { class: 'route', 'data-route': r.id }, layers.routes);
    el('path', { class: 'hit', d: routePath(r, a, b) }, g);
    const wagons = routeWagons(r, a, b);
    wagonsOf.set(r.id, wagons);
    wagons.forEach((w, i) => {
      const t = `translate(${w.x.toFixed(1)} ${w.y.toFixed(1)}) rotate(${w.angle.toFixed(1)})`;
      el('rect', {
        class: `wagon${r.tunnel ? ' tunnel' : ''}`,
        x: -w.w / 2, y: -w.h / 2, width: w.w, height: w.h, rx: 2,
        fill: ROUTE_FILL[r.color], transform: t,
      }, g);
      if (i < r.loco) {
        el('use', { href: '#loco', x: -6, y: -3.6, width: 12, height: 7.2, transform: t, class: 'loco' }, g);
      }
    });
    el('g', { class: 'claim' }, g);
  }

  for (const c of CITIES) {
    const g = el('g', { class: 'city', 'data-city': c.id }, layers.cities);
    el('circle', { class: 'city-hit', cx: c.x, cy: c.y, r: 20 }, g);
    el('circle', { class: 'city-dot', cx: c.x, cy: c.y, r: 8 }, g);
    const label = el('text', { class: 'city-label', x: c.x, y: c.y + 23 }, g);
    label.textContent = c.name;
  }

  enablePanZoom(svg, handlers);
}

export function updateMap(svg, state, { last, tickets }) {
  for (const g of layers.routes.children) {
    const id = g.dataset.route;
    const claimLayer = g.querySelector('.claim');
    const color = state.claims.get(id);
    if (claimLayer.dataset.color === (color ?? '')) continue;
    claimLayer.dataset.color = color ?? '';
    claimLayer.innerHTML = '';
    g.classList.toggle('claimed', !!color);
    if (!color) continue;
    for (const w of wagonsOf.get(id)) {
      el('rect', {
        x: -w.w / 2 + 2, y: -w.h / 2 + 2, width: w.w - 4, height: w.h - 4, rx: 1.5,
        fill: PLAYER_FILL[color],
        transform: `translate(${w.x.toFixed(1)} ${w.y.toFixed(1)}) rotate(${w.angle.toFixed(1)})`,
      }, claimLayer);
    }
  }

  layers.stations.innerHTML = '';
  for (const [cityId, color] of state.stations) {
    const c = cityById.get(cityId);
    el('use', { href: '#station', x: c.x + 4, y: c.y - 30, width: 24, height: 24, fill: PLAYER_FILL[color] }, layers.stations);
  }

  layers.rings.innerHTML = '';
  const ringCount = new Map();
  for (const t of tickets) {
    for (const cityId of [t.a, t.b]) {
      const c = cityById.get(cityId);
      const n = ringCount.get(cityId) ?? 0;
      ringCount.set(cityId, n + 1);
      el('circle', {
        cx: c.x, cy: c.y, r: 13 + n * 6, fill: 'none', stroke: t.hue, 'stroke-width': 4.5,
        class: t.done ? 'ring done' : 'ring',
      }, layers.rings);
    }
  }

  svg.querySelectorAll('.last').forEach((n) => n.classList.remove('last'));
  for (const sel of lastSelectors(last)) svg.querySelector(sel)?.classList.add('last');
}

function lastSelectors(action) {
  if (!action) return [];
  switch (action.type) {
    case 'claim':
    case 'unclaim': return [`[data-route="${action.route}"]`];
    case 'station':
    case 'unstation': return [`[data-city="${action.city}"]`];
    case 'addTicket': return [action.ticket.a, action.ticket.b].map((c) => `[data-city="${c}"]`);
    case 'markTicket':
    case 'delTicket': return (action.cities ?? []).map((c) => `[data-city="${c}"]`);
    default: return [];
  }
}

// ---- Pan, pinch-zoom and tap ------------------------------------------

function enablePanZoom(svg, { onRouteTap, onCityTap }) {
  const vb = { x: 0, y: 0, w: VIEWBOX.w, h: VIEWBOX.h };
  const MIN_W = 220;
  const MAX_W = VIEWBOX.w * 1.1;
  const apply = () => svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);

  // Units per screen pixel (the SVG keeps aspect ratio with "meet").
  const scale = () => {
    const r = svg.getBoundingClientRect();
    return Math.max(vb.w / r.width, vb.h / r.height);
  };
  // Screen point -> board point.
  const toBoard = (cx, cy) => {
    const r = svg.getBoundingClientRect();
    const s = scale();
    const offX = (r.width * s - vb.w) / 2;
    const offY = (r.height * s - vb.h) / 2;
    return { x: vb.x - offX + (cx - r.left) * s, y: vb.y - offY + (cy - r.top) * s };
  };
  const clamp = () => {
    vb.x = Math.min(Math.max(vb.x, -vb.w * 0.5), VIEWBOX.w - vb.w * 0.5);
    vb.y = Math.min(Math.max(vb.y, -vb.h * 0.5), VIEWBOX.h - vb.h * 0.5);
  };
  const zoomAt = (cx, cy, factor) => {
    const p = toBoard(cx, cy);
    const nw = Math.min(MAX_W, Math.max(MIN_W, vb.w * factor));
    const f = nw / vb.w;
    vb.x = p.x - (p.x - vb.x) * f;
    vb.y = p.y - (p.y - vb.y) * f;
    vb.w = nw;
    vb.h = vb.h * f;
    clamp();
    apply();
  };

  const pointers = new Map();
  let gesture = null; // { startX, startY, startTime, moved, multi, lastDist, lastMid }

  svg.addEventListener('pointerdown', (e) => {
    try { svg.setPointerCapture(e.pointerId); } catch { /* not an active pointer */ }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      gesture = { startX: e.clientX, startY: e.clientY, startTime: Date.now(), moved: false, multi: false };
    } else {
      gesture.multi = true;
      gesture.lastDist = null;
    }
  });

  svg.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev || !gesture) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, cur);
    if (Math.hypot(cur.x - gesture.startX, cur.y - gesture.startY) > 8) gesture.moved = true;

    if (pointers.size === 1 && gesture.moved && !gesture.multi) {
      const s = scale();
      vb.x -= (cur.x - prev.x) * s;
      vb.y -= (cur.y - prev.y) * s;
      clamp();
      apply();
    } else if (pointers.size === 2) {
      const [p1, p2] = [...pointers.values()];
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      if (gesture.lastDist) {
        const s = scale();
        vb.x -= (mid.x - gesture.lastMid.x) * s;
        vb.y -= (mid.y - gesture.lastMid.y) * s;
        zoomAt(mid.x, mid.y, gesture.lastDist / dist);
      }
      gesture.lastDist = dist;
      gesture.lastMid = mid;
    }
  });

  const end = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size > 0 || !gesture) return;
    const isTap = !gesture.moved && !gesture.multi && Date.now() - gesture.startTime < 500 && e.type === 'pointerup';
    gesture = null;
    if (!isTap) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const city = target?.closest?.('[data-city]');
    if (city) return onCityTap(city.dataset.city, { x: e.clientX, y: e.clientY });
    const route = target?.closest?.('[data-route]');
    if (route) return onRouteTap(route.dataset.route, { x: e.clientX, y: e.clientY });
    onRouteTap(null);
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 1.15 : 1 / 1.15);
  }, { passive: false });

  apply();
}
