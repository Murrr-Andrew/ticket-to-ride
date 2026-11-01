# Ticket to Ride Europe Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static, offline-capable phone page with the Ticket to Ride Europe board where the owner claims routes, places stations and tracks tickets per player color, published on GitHub Pages.

**Architecture:** The game is an append-only list of actions; all state (claims, stations, tickets, scores) is derived by replaying it, so undo is "drop the last action". Pure logic lives in ES modules tested with `node --test`; the map is one SVG built from a data module; a small service worker caches the files.

**Tech Stack:** HTML, CSS, vanilla JS (ES modules), SVG, `node:test` (Node 18+), GitHub Pages, `gh` CLI.

**Spec:** `docs/superpowers/specs/2026-11-01-ttr-europe-tracker-design.md`

## Global Constraints

- No framework, no build step, no runtime dependencies. Tests use only `node:test` and `node:assert`.
- UI text in Russian (changed by the owner mid-build). City names spelled as on the owner's board (`reference/board.jpg`), e.g. `Zacrab`, `Kyiv`, `Kobenhavn`, `Munchen`.
- Player colors: `red`, `blue`, `green`, `yellow`, `black`. 45 wagons and 3 stations per color.
- Route colors: `red, blue, green, yellow, black, white, orange, pink, gray`.
- Route points: 1→1, 2→2, 3→4, 4→7, 5→10, 6→15, 8→21.
- Stations give no points. Longest route is shown, never scored.
- `reference/` and `.superpowers/` are git-ignored; nothing from the board photo is committed.
- Landscape-first; portrait shows a "Rotate your phone" hint. Target: Chrome on Android.
- Repo `Murrr-Andrew/ticket-to-ride`, public, Pages from `main` root.

## Review Focus

1. Tapping one line of a double route must claim that line only; the two lines must be separated enough on screen to tap (≥ ~10 px apart at default zoom on a 800×360 viewport). Test: `data.test.mjs` "double routes are offset" + manual check in Task 4.
2. Undoing an `unclaim` must restore the route to its previous color, not the active color. Test in Task 1 (`unclaim stores previous color and undo restores it`).
3. Corrupt or old `localStorage` must not brick the page: start a new game instead of throwing. Test in Task 1 (`loadGame returns empty game on bad JSON`).
4. Station limits: 4th station for a color and a 2nd station in one city are refused with a message, not silently ignored. Test in Task 1 (`canApply refuses...`).
5. A color going past 45 wagons is allowed (the owner may mis-mark) but shown as negative "left" in red, never crashing. Test in Task 1 (`wagonsLeft can go negative`).

---

### Task 1: Project scaffold and core state logic

**Files:**
- Create: `package.json` (only `"type": "module"` and `"scripts": {"test": "node --test tests/"}`), `.gitignore` (exists), `js/logic.js`, `tests/logic.test.mjs`

**Interfaces:**
- Produces (all exported from `js/logic.js`):
  - `PLAYER_COLORS: string[]` — the 5 colors in order above.
  - `WAGONS = 45`, `STATIONS = 3`.
  - `routePoints(len: number) -> number`
  - `emptyGame() -> { actions: Action[], activeColor: 'red' }`
  - Action shapes:
    - `{ type: 'claim', route, color }`
    - `{ type: 'unclaim', route, prevColor }`
    - `{ type: 'station', city, color }`
    - `{ type: 'unstation', city, prevColor }`
    - `{ type: 'addTicket', ticket: { id, a, b, points, color, hue } }`
    - `{ type: 'delTicket', id }`
    - `{ type: 'markTicket', id, manual: boolean }`
  - `deriveState(actions) -> { claims: Map<routeId,color>, stations: Map<cityId,color>, tickets: Map<id,{...ticket, manual:boolean}> }`
  - `canApply(state, action) -> { ok: true } | { ok: false, reason: string }`. Refusals: claim on an already claimed route; 4th station for a color (`"Blue has no stations left"`); station on a city that has one (`"Paris already has a station"`); ticket with `a === b`.
  - `colorStats(state, routes, color) -> { routePts, wagonsUsed, wagonsLeft, stationsUsed }` where `routes` is `Map<routeId, {len}>`.
  - `loadGame(storage) -> game`, `saveGame(storage, game)` — key `ttr-europe-game-v1`; any parse/shape error returns `emptyGame()`.

- [ ] **Step 1:** `git init -b main` in the project folder; create `package.json`.
- [ ] **Step 2: Write failing tests** in `tests/logic.test.mjs`:
  - `routePoints maps lengths` — `[1,2,3,4,5,6,8]` → `[1,2,4,7,10,15,21]`.
  - `claim then unclaim` — after claim `r1` red, `claims.get('r1') === 'red'`; after unclaim, `claims.has('r1') === false`.
  - `unclaim stores previous color and undo restores it` — `deriveState(actions.slice(0,-1))` after an unclaim gives back the old color.
  - `canApply refuses double claim, 4th station, second station in city, same-city ticket` — 4 cases, each `ok === false` with a non-empty `reason`.
  - `colorStats sums wagons and points` — red claims len 3 and len 6 → `routePts 19, wagonsUsed 9, wagonsLeft 36`.
  - `wagonsLeft can go negative` — claims totalling 47 → `wagonsLeft === -2`.
  - `loadGame returns empty game on bad JSON` — fake storage `{getItem: () => '{oops'}` → equals `emptyGame()`.
  - `saveGame/loadGame round-trip`.
- [ ] **Step 3:** `npm test` → FAIL (module not found).
- [ ] **Step 4:** Implement `js/logic.js`.
- [ ] **Step 5:** `npm test` → all pass.
- [ ] **Step 6:** Commit `Add core game state logic` (spec, plan, `.gitignore` included in this first commit).

### Task 2: Graph logic — ticket connection and longest route

**Files:**
- Create: `js/graph.js`, `tests/graph.test.mjs`

**Interfaces:**
- Consumes: `deriveState` output from Task 1.
- Produces:
  - `isConnected(routes: {id,a,b,len}[], claims: Map, color, a, b) -> boolean` — BFS over routes claimed in `color`.
  - `longestRoute(routes, claims, color) -> number` — longest trail in wagons: DFS from every city over unused edges of that color, edges may not repeat, cities may. At most ~45 wagons per color, so plain backtracking is fine.
  - `ticketStatus(routes, state, ticket) -> 'auto' | 'manual' | 'open'` — `auto` if `isConnected` for `ticket.color`, else `manual` if `ticket.manual`, else `open`.
  - `ticketScore(routes, state, color) -> { done: number, open: number }` — sums of points for done tickets / open tickets of that color.

- [ ] **Step 1: Write failing tests** with a tiny hand-made graph (A-B len2, B-C len3, C-A len1, C-D len4, plus a second A-B line):
  - `isConnected finds multi-hop path` — A to D in red after claiming A-B, B-C, C-D.
  - `isConnected ignores other colors` — same claims but C-D blue → false for red.
  - `longestRoute uses a loop once` — red claims A-B(2), B-C(3), C-A(1), C-D(4) → `10`.
  - `longestRoute with branches` — star graph X-Y(3), X-Z(4), X-W(1) → `7`.
  - `longestRoute zero for no claims` → `0`.
  - `ticketStatus manual and auto`; `ticketScore splits done and open`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement `js/graph.js`.
- [ ] **Step 4:** `npm test` → pass.
- [ ] **Step 5:** Commit `Add ticket connection and longest route`.

### Task 3: Map data

**Files:**
- Create: `js/data.js`, `tests/data.test.mjs`

**Interfaces:**
- Produces:
  - `VIEWBOX = { w: 1280, h: 960 }` (same pixel space as `reference/board.jpg`, so coordinates are read straight off the photo).
  - `CITIES: { id: string, name: string, x: number, y: number }[]` — `id` is the lowercase ASCII name (`zacrab`, `kobenhavn`).
  - `ROUTES: { id: string, a: string, b: string, len: number, color: string, tunnel: boolean, loco: number, pair: string|null, offset: -1|0|1 }[]` — `id` like `paris-wien-1`; for double routes `pair` is the other line's id and `offset` is −1 / +1 (0 for single); `loco` is the number of locomotive spaces (ferries), else 0.
  - Optional `bend` per route: `{ x, y }` control point when the route visibly curves on the board (quadratic curve through it). Straight otherwise.

- [ ] **Step 1: Write failing tests** in `tests/data.test.mjs`:
  - `47 cities with unique ids`.
  - `every route references existing cities`, `a !== b`.
  - `lengths are in {1,2,3,4,6,8}`, `colors are valid`, `loco <= len`.
  - `double routes are paired both ways and never share a color unless gray`.
  - `double routes are offset` — paired routes have opposite non-zero `offset`.
  - `route count` — assert the total equals the count established in Step 3 (write it in after research; record the number and the sources in a comment at the top of `data.js`).
  - `graph is connected` — every city reachable from `paris`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: Build the data.** City coordinates: read each city dot's centre from `reference/board.jpg` (open it and estimate; ±5 px is fine). Routes: start from published Europe route lists (rulebook, BoardGameGeek, wiki), then check each one's color, length, tunnel outline and locomotive marks against the photo. The photo wins on conflict. Put any route the photo doesn't settle in a `UNSURE` export (array of route ids with a note) for the owner to check.
- [ ] **Step 4:** `npm test` → pass.
- [ ] **Step 5:** Commit `Add Europe map data`.

### Task 4: Map rendering, pan/zoom, claim by tap

**Files:**
- Create: `index.html`, `css/app.css`, `js/map.js`, `js/app.js`

**Interfaces:**
- Consumes: `CITIES`, `ROUTES`, `VIEWBOX` (Task 3); `deriveState`, `canApply`, `loadGame`, `saveGame` (Task 1).
- Produces:
  - `renderMap(svg: SVGSVGElement, { onRouteTap(routeId), onCityTap(cityId) }) -> void` — draws once.
  - `updateMap(svg, state, { lastAction, ticketHues }) -> void` — repaints claims, stations, ticket rings, last-action pulse.
  - `enablePanZoom(svg) -> void` — pointer events: one finger pans, two fingers pinch; a tap is a pointerdown/up under 8 px movement and 300 ms. `touch-action: none` on the SVG; viewport meta `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no` (Chrome Android honours it).

Rendering rules: each route is `len` rounded rectangles laid along the line (or curve), gap ~3 px, in the route color; tunnels get a dark dashed outline; the first `loco` spaces carry a small locomotive glyph (a simple SVG symbol drawn by us). Double lines are shifted ±7 px perpendicular. A claimed route keeps its route-color rectangles and gets a player-color "wagon" (smaller rect, white border) on each space. Each route has an invisible wide hit path (stroke ~18 px) for tapping. Cities: circle + label; stations: small house shape in the player color beside the dot.

- [ ] **Step 1:** Build `index.html` (SVG + right column placeholder + rotate hint), `css/app.css`, `js/map.js`, `js/app.js`. `app.js`: load game, render, on route tap → claim with active color (or unclaim if claimed), check `canApply`, push action, save, update.
- [ ] **Step 2: Verify in a browser** with `python3 -m http.server 8080`, Chrome DevTools device emulation at landscape 800×360: all 47 cities visible, double lines tappable separately, pinch/pan works, claiming and reload keep state. Screenshot and compare side by side with `reference/board.jpg`.
- [ ] **Step 3:** Commit `Draw the map and claim routes by tap`.

### Task 5: Side column, stations, tickets, undo, score table

**Files:**
- Create: `js/ui.js`; Modify: `index.html`, `css/app.css`, `js/app.js`

**Interfaces:**
- Consumes: Tasks 1–4. `colorStats`, `ticketStatus`, `ticketScore`, `longestRoute`, `updateMap`.
- Produces: `renderPanel(root, game, state)`, `openOverlay(game, state)`, `showToast(text)`.

Behaviour (all from the spec):
- Right column: 5 color chips (active one ringed), active color summary: `pts`, `wagons used/45`, `stations n/3`, `tickets done/total`, `longest`; Undo button (disabled when no actions); "Table" button.
- `activeColor` changes only when the owner taps a chip; every action uses it; saved in the game.
- City tap → small popup at the city: "Place station" / "Remove station" / "Ticket from here". After "Ticket from here", the next city tap opens a dialog: points (number input, required, 1–30) → `addTicket` with the next hue from `TICKET_HUES = ['#ff00aa', '#00c8ff', '#ff7a00', '#8a2be2', '#00d084', '#c0ff00']` (cycling).
- Tickets are drawn as a thick ring in the hue around both cities; a done ticket's ring turns dashed.
- Overlay: table rows per player color that has any action: route pts, tickets done/open (only colors with tickets), total = route pts + done − open, wagons used/left (left in red when < 0), stations, longest (leader marked ★). Ticket list with status (auto ✓ / manual ✓ / open), "Mark connected" toggle, delete. "New game" with `confirm()`.
- Undo pops the last action; the new last action is pulsed on the map (CSS animation on that route's hit path or city).
- When any color has `wagonsLeft <= 2`, show a banner "Last round: <Color> has N wagons left".
- Refused actions (`canApply` false) show the reason as a toast.

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify in browser** (same emulation): play a short scripted game — claim 4 routes red, 1 blue; station in Paris red; ticket Paris–Wien 8; check numbers match `colorStats` by hand; undo 3 times and see the pulse move; reload, state intact; 4th station refused with a toast.
- [ ] **Step 3:** `npm test` still passes. Commit `Add panel, stations, tickets, undo and score table`.

### Task 6: Offline, check view, README, publish

**Files:**
- Create: `sw.js`, `manifest.webmanifest`, `icon.svg`, `icon-192.png`, `icon-512.png` (rendered from `icon.svg` with headless Chrome or `sips`), `README.md`; Modify: `index.html`, `js/app.js`

- [ ] **Step 1:** `sw.js`: cache name `ttr-v1`, precache all app files; fetch handler network-first for same-origin GET, falling back to cache. Register from `app.js` (`navigator.serviceWorker.register('sw.js')`). Manifest: name "TTR Europe Tracker", `display: fullscreen`, `orientation: landscape`.
- [ ] **Step 2:** Check view: when URL has `?check`, render a scrollable list of cities, each with its routes as text (`Paris → Wien · 3 · purple(pink) · tunnel`) plus the `UNSURE` list at the top.
- [ ] **Step 3:** `README.md`: what it is, link to the page, how to run tests, that it is a personal fan tool not affiliated with Days of Wonder.
- [ ] **Step 4:** Commit; `gh repo create Murrr-Andrew/ticket-to-ride --public --source . --push`; enable Pages: `gh api -X POST repos/Murrr-Andrew/ticket-to-ride/pages -f 'source[branch]=main' -f 'source[path]=/'`.
- [ ] **Step 5: Verify**: `gh api repos/Murrr-Andrew/ticket-to-ride/pages` shows `status: built` (poll), the URL `https://murrr-andrew.github.io/ticket-to-ride/` loads, service worker registers (DevTools → Application), and offline reload still works.
