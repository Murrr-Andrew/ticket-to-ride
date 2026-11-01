// Core game state. The game is a list of actions; everything else is derived
// by replaying them, so undo is just dropping the last action.

export const PLAYER_COLORS = ['red', 'blue', 'green', 'yellow', 'black'];
export const WAGONS = 45;
export const STATIONS = 3;
export const STORAGE_KEY = 'ttr-europe-game-v1';

const POINTS = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 10, 6: 15, 8: 21 };

export function routePoints(len) {
  return POINTS[len] ?? 0;
}

export function emptyGame() {
  return { actions: [], activeColor: 'red' };
}

export function deriveState(actions) {
  const claims = new Map();
  const stations = new Map();
  const tickets = new Map();
  for (const a of actions) {
    switch (a.type) {
      case 'claim': claims.set(a.route, a.color); break;
      case 'unclaim': claims.delete(a.route); break;
      case 'station': stations.set(a.city, a.color); break;
      case 'unstation': stations.delete(a.city); break;
      case 'addTicket': tickets.set(a.ticket.id, { ...a.ticket, manual: false }); break;
      case 'delTicket': tickets.delete(a.id); break;
      case 'markTicket': {
        const t = tickets.get(a.id);
        if (t) tickets.set(a.id, { ...t, manual: a.manual });
        break;
      }
    }
  }
  return { claims, stations, tickets };
}

// Russian color names: [nominative, genitive].
const COLOR_RU = {
  red: ['красный', 'красного'], blue: ['синий', 'синего'], green: ['зелёный', 'зелёного'],
  yellow: ['жёлтый', 'жёлтого'], black: ['чёрный', 'чёрного'], white: ['белый', 'белого'],
  orange: ['оранжевый', 'оранжевого'], pink: ['розовый', 'розового'], gray: ['серый', 'серого'],
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function colorName(color, capital = false, genitive = false) {
  const name = COLOR_RU[color]?.[genitive ? 1 : 0] ?? color;
  return capital ? cap(name) : name;
}

// cityNames: optional { cityId: displayName } for nicer messages.
export function canApply(state, action, cityNames = {}) {
  const no = (reason) => ({ ok: false, reason });
  switch (action.type) {
    case 'claim':
      if (state.claims.has(action.route)) return no('Этот маршрут уже занят');
      break;
    case 'station': {
      if (state.stations.has(action.city)) {
        return no(`В городе ${cityNames[action.city] ?? cap(action.city)} уже есть станция`);
      }
      const used = [...state.stations.values()].filter((c) => c === action.color).length;
      if (used >= STATIONS) return no(`У ${colorName(action.color, false, true)} цвета не осталось станций`);
      break;
    }
    case 'addTicket':
      if (action.ticket.a === action.ticket.b) return no('Выберите два разных города');
      break;
  }
  return { ok: true };
}

const toRouteMap = (routes) => (routes instanceof Map ? routes : new Map(routes.map((r) => [r.id, r])));

export function colorStats(state, routes, color) {
  const byId = toRouteMap(routes);
  let routePts = 0;
  let wagonsUsed = 0;
  for (const [id, c] of state.claims) {
    if (c !== color) continue;
    const len = byId.get(id)?.len ?? 0;
    routePts += routePoints(len);
    wagonsUsed += len;
  }
  const stationsUsed = [...state.stations.values()].filter((c) => c === color).length;
  return { routePts, wagonsUsed, wagonsLeft: WAGONS - wagonsUsed, stationsUsed };
}

const ALL_COLORS = new Set(PLAYER_COLORS);
const isObj = (x) => x !== null && typeof x === 'object';

// Keeps only actions that make sense against the current map data, so an old
// or damaged save can't break the page. `known` = { routes: Set, cities: Set }.
export function sanitizeActions(actions, known) {
  const tickets = new Set();
  const ok = (a) => {
    if (!isObj(a)) return false;
    switch (a.type) {
      case 'claim': return known.routes.has(a.route) && ALL_COLORS.has(a.color);
      case 'unclaim': return known.routes.has(a.route);
      case 'station': return known.cities.has(a.city) && ALL_COLORS.has(a.color);
      case 'unstation': return known.cities.has(a.city);
      case 'addTicket': {
        const t = a.ticket;
        const good = isObj(t) && typeof t.id === 'string' && known.cities.has(t.a) && known.cities.has(t.b)
          && ALL_COLORS.has(t.color) && Number.isFinite(t.points);
        if (good) tickets.add(t.id);
        return good;
      }
      case 'delTicket':
      case 'markTicket': return tickets.has(a.id);
      default: return false;
    }
  };
  return Array.isArray(actions) ? actions.filter(ok) : [];
}

export function loadGame(storage) {
  try {
    const game = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!game || !Array.isArray(game.actions) || !PLAYER_COLORS.includes(game.activeColor)) {
      return emptyGame();
    }
    return game;
  } catch {
    return emptyGame();
  }
}

export function saveGame(storage, game) {
  storage.setItem(STORAGE_KEY, JSON.stringify(game));
}
