import { emptyGame, deriveState, canApply, loadGame, saveGame, colorName, sanitizeActions, STORAGE_KEY } from './logic.js';
import { ticketStatus } from './graph.js';
import { CITIES, ROUTES } from './data.js';
import { renderMap, updateMap, ROUTE_FILL, PLAYER_FILL } from './map.js';
import { renderPanel, openOverlay, showPopup, hidePopup, showToast, askPoints, nameOf } from './ui.js';
import { renderCheck } from './check.js';

const TICKET_HUES = ['#ff00aa', '#00c8ff', '#ff7a00', '#8a2be2', '#00d084', '#c0ff00'];
const routeById = new Map(ROUTES.map((r) => [r.id, r]));
const cityNames = Object.fromEntries(CITIES.map((c) => [c.id, c.name]));

const known = { routes: new Set(routeById.keys()), cities: new Set(CITIES.map((c) => c.id)) };

// Load the saved game; anything that doesn't fit the current map is dropped,
// and a save that still fails is kept aside under a backup key.
function startGame() {
  const raw = localStorage.getItem(STORAGE_KEY);
  try {
    const g = loadGame(localStorage);
    g.actions = sanitizeActions(g.actions, known);
    deriveState(g.actions);
    return g;
  } catch {
    if (raw) localStorage.setItem(`${STORAGE_KEY}-backup`, raw);
    return emptyGame();
  }
}

let game = startGame();
let state = deriveState(game.actions);
let pendingFrom = null; // first city of a ticket being added

const svg = document.getElementById('map');

function refresh() {
  hidePopup();
  state = deriveState(game.actions);
  const tickets = [...state.tickets.values()].map((t) => ({
    a: t.a, b: t.b, hue: t.hue, done: ticketStatus(ROUTES, state, t) !== 'open',
  }));
  updateMap(svg, state, { tickets });
  renderPanel(ctx);
}

function dispatch(action) {
  const check = canApply(state, action, cityNames);
  if (!check.ok) { showToast(check.reason); return false; }
  game.actions.push(action);
  saveGame(localStorage, game);
  refresh();
  return true;
}

const ctx = {
  get game() { return game; },
  get state() { return state; },
  get pendingFrom() { return pendingFrom; },
  setColor(c) { game.activeColor = c; saveGame(localStorage, game); refresh(); },
  undo() {
    if (!game.actions.length) return;
    game.actions.pop();
    saveGame(localStorage, game);
    refresh();
  },
  openTable() { openOverlay(ctx); },
  cancelTicket() { pendingFrom = null; refresh(); },
  markTicket(t, manual) { dispatch({ type: 'markTicket', id: t.id, manual, cities: [t.a, t.b] }); },
  deleteTicket(t) { dispatch({ type: 'delTicket', id: t.id, cities: [t.a, t.b] }); },
  newGame() {
    const color = game.activeColor;
    game = { ...emptyGame(), activeColor: color };
    pendingFrom = null;
    saveGame(localStorage, game);
    refresh();
  },
};

function lineLabel(r) {
  const owner = state.claims.get(r.id);
  return owner
    ? `Снять: ${colorName(r.color)} путь (${colorName(owner)} игрок)`
    : `Занять ${colorName(r.color)} путь`;
}

function toggleRoute(r) {
  const owner = state.claims.get(r.id);
  if (owner) dispatch({ type: 'unclaim', route: r.id, prevColor: owner });
  else dispatch({ type: 'claim', route: r.id, color: game.activeColor });
}

function onRouteTap(routeId, at) {
  hidePopup();
  if (!routeId) return;
  const r = routeById.get(routeId);
  if (!r.pair) return toggleRoute(r);
  // Double route: the two lines sit close together, so ask which one.
  const lines = [r, routeById.get(r.pair)].sort((x, y) => x.offset - y.offset);
  showPopup(at, `${nameOf(r.a)} – ${nameOf(r.b)} · ${r.len}`, lines.map((line) => ({
    label: lineLabel(line),
    swatch: state.claims.has(line.id) ? PLAYER_FILL[state.claims.get(line.id)] : ROUTE_FILL[line.color],
    onClick: () => toggleRoute(line),
  })));
}

async function onCityTap(cityId, at) {
  hidePopup();
  if (pendingFrom) {
    if (cityId === pendingFrom) { showToast('Выберите другой город'); return; }
    const a = pendingFrom;
    pendingFrom = null;
    refresh();
    const points = await askPoints(a, cityId);
    if (points == null) return;
    const hue = TICKET_HUES[game.actions.filter((x) => x.type === 'addTicket').length % TICKET_HUES.length];
    dispatch({
      type: 'addTicket',
      ticket: { id: `t${Date.now().toString(36)}`, a, b: cityId, points, color: game.activeColor, hue },
    });
    return;
  }
  const owner = state.stations.get(cityId);
  const items = [];
  if (owner) {
    items.push({ label: `Убрать станцию (${colorName(owner)})`, swatch: PLAYER_FILL[owner], danger: true,
      onClick: () => dispatch({ type: 'unstation', city: cityId, prevColor: owner }) });
  } else {
    items.push({ label: `Поставить станцию (${colorName(game.activeColor)})`, swatch: PLAYER_FILL[game.activeColor],
      onClick: () => dispatch({ type: 'station', city: cityId, color: game.activeColor }) });
  }
  items.push({ label: 'Билет отсюда', onClick: () => { pendingFrom = cityId; refresh(); } });
  showPopup(at, nameOf(cityId), items);
}

if (new URLSearchParams(location.search).has('check')) {
  renderCheck(document.getElementById('app'));
} else {
  renderMap(svg, { onRouteTap, onCityTap });
  svg.addEventListener('pointerdown', hidePopup);
  refresh();
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
