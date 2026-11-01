// Lays out the wagon spaces of a route along a straight line or a
// quadratic curve that passes through `bend` halfway.

export const CITY_GAP = 12; // space kept free around each city dot
export const LINE_OFFSET = 8; // distance of each double line from the centre
export const WAGON_H = 11;
const WAGON_GAP = 3;
const SAMPLES = 64;

function curve(a, b, bend) {
  if (!bend) {
    return {
      at: (t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }),
      tangent: () => ({ x: b.x - a.x, y: b.y - a.y }),
    };
  }
  // Control point so the curve passes through `bend` at t = 0.5.
  const c = { x: 2 * bend[0] - (a.x + b.x) / 2, y: 2 * bend[1] - (a.y + b.y) / 2 };
  return {
    at: (t) => {
      const u = 1 - t;
      return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
    },
    tangent: (t) => ({
      x: 2 * (1 - t) * (c.x - a.x) + 2 * t * (b.x - c.x),
      y: 2 * (1 - t) * (c.y - a.y) + 2 * t * (b.y - c.y),
    }),
  };
}

// Point and direction at parameter t, shifted sideways by `side` units
// (positive = right of the a→b direction in screen coordinates).
function pointAt(cv, t, side) {
  const p = cv.at(t);
  const d = cv.tangent(t);
  const n = Math.hypot(d.x, d.y) || 1;
  return { x: p.x - (d.y / n) * side, y: p.y + (d.x / n) * side, angle: Math.atan2(d.y, d.x) };
}

export function routeWagons(route, a, b) {
  const cv = curve(a, b, route.bend);
  const side = route.offset * LINE_OFFSET;

  // Arc length table along the (offset) path.
  const pts = [];
  for (let i = 0; i <= SAMPLES; i++) pts.push(pointAt(cv, i / SAMPLES, side));
  const acc = [0];
  for (let i = 1; i <= SAMPLES; i++) {
    acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  const total = acc[SAMPLES];
  const tAt = (s) => {
    let i = 1;
    while (i < SAMPLES && acc[i] < s) i++;
    const f = (s - acc[i - 1]) / (acc[i] - acc[i - 1] || 1);
    return (i - 1 + f) / SAMPLES;
  };

  const usable = total - 2 * CITY_GAP;
  const slot = usable / route.len;
  const w = Math.max(4, slot - WAGON_GAP);
  const wagons = [];
  for (let k = 0; k < route.len; k++) {
    const p = pointAt(cv, tAt(CITY_GAP + slot * (k + 0.5)), side);
    wagons.push({ x: p.x, y: p.y, angle: (p.angle * 180) / Math.PI, w, h: WAGON_H });
  }
  return wagons;
}

// SVG path for the tap target along the route.
export function routePath(route, a, b) {
  const cv = curve(a, b, route.bend);
  const side = route.offset * LINE_OFFSET;
  const parts = [];
  for (let i = 0; i <= 16; i++) {
    const p = pointAt(cv, i / 16, side);
    parts.push(`${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  return parts.join('');
}
