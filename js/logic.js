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

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// cityNames: optional { cityId: displayName } for nicer messages.
export function canApply(state, action, cityNames = {}) {
  const no = (reason) => ({ ok: false, reason });
  switch (action.type) {
    case 'claim':
      if (state.claims.has(action.route)) return no('This route is already claimed');
      break;
    case 'station': {
      if (state.stations.has(action.city)) {
        return no(`${cityNames[action.city] ?? cap(action.city)} already has a station`);
      }
      const used = [...state.stations.values()].filter((c) => c === action.color).length;
      if (used >= STATIONS) return no(`${cap(action.color)} has no stations left`);
      break;
    }
    case 'addTicket':
      if (action.ticket.a === action.ticket.b) return no('Pick two different cities');
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
