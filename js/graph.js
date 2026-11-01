// Graph checks over claimed routes: ticket connection and longest route.

function ownedEdges(routes, claims, color) {
  return routes.filter((r) => claims.get(r.id) === color);
}

function adjacency(edges) {
  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.a)) adj.set(e.a, []);
    if (!adj.has(e.b)) adj.set(e.b, []);
    adj.get(e.a).push(e);
    adj.get(e.b).push(e);
  }
  return adj;
}

export function isConnected(routes, claims, color, a, b) {
  if (a === b) return true;
  const adj = adjacency(ownedEdges(routes, claims, color));
  const seen = new Set([a]);
  const queue = [a];
  while (queue.length) {
    const city = queue.shift();
    for (const e of adj.get(city) ?? []) {
      const next = e.a === city ? e.b : e.a;
      if (next === b) return true;
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return false;
}

// Longest trail in wagons: each route at most once, cities may repeat.
export function longestRoute(routes, claims, color) {
  const edges = ownedEdges(routes, claims, color);
  const adj = adjacency(edges);
  const used = new Set();
  let best = 0;
  const walk = (city, total) => {
    if (total > best) best = total;
    for (const e of adj.get(city)) {
      if (used.has(e.id)) continue;
      used.add(e.id);
      walk(e.a === city ? e.b : e.a, total + e.len);
      used.delete(e.id);
    }
  };
  for (const city of adj.keys()) walk(city, 0);
  return best;
}

export function ticketStatus(routes, state, ticket) {
  if (isConnected(routes, state.claims, ticket.color, ticket.a, ticket.b)) return 'auto';
  return ticket.manual ? 'manual' : 'open';
}

export function ticketScore(routes, state, color) {
  let done = 0;
  let open = 0;
  for (const t of state.tickets.values()) {
    if (t.color !== color) continue;
    if (ticketStatus(routes, state, t) === 'open') open += t.points;
    else done += t.points;
  }
  return { done, open };
}
