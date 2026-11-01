# Ticket to Ride Europe — personal map tracker

Date: 2026-11-01
Status: draft, awaiting approval

## Why

The owner plays the physical board game Ticket to Ride Europe (English edition) with friends. The board often sits upside down or sideways from where they sit, so city names and routes are hard to read. They want the same map on their phone, always the right way up, where they can:

- see every city and route in its real color,
- mark claimed routes in a player color and keep score,
- highlight the two cities of each destination ticket to think about a path.

It is a personal tool, not a product. It is hosted as a static page on GitHub Pages so it opens from a phone at the table.

## Goals

1. The full Europe map as on the board: all 47 cities in roughly the board's positions, every route (including both lines of double routes) in its board color, drawn as separate wagon spaces, with tunnels and ferries marked.
2. Claim a route in a player color by tapping it. Score and wagon count for that color update at once.
3. Place stations on cities in a player color.
4. Add destination tickets (city A + city B + points) that highlight both cities, and see whether each is connected.
5. A per-color score table: points, wagons used / left, stations placed, longest continuous route.
6. Undo the last action, with the last action always visibly highlighted on the map.
7. The game survives closing the tab or locking the phone.
8. Opens from a phone at a public GitHub Pages URL.

## Non-goals

- No game engine: no cards, no turn order, no rule enforcement beyond what is listed here.
- No sync between phones and no accounts. One phone, one local game.
- No final bonus scoring: unused stations give **no** points (house rule), and the 10-point longest-route bonus is **not** added to the score. Longest route is shown only as information.
- No commercial use, no game artwork, logos or images from the box. The map is drawn from scratch in SVG.

## Anti-goals (it fails even if it "works")

- City names or routes that don't match the real board. The owner compares it with the physical board at the table. Wrong colors, lengths or missing routes make it useless.
- Routes too small to hit with a finger, or a tap that claims the wrong route of a double pair.
- Losing the game state mid-game.
- An accidental tap that can't be found and undone.

## Constraints

- Plain static site: `index.html`, CSS and vanilla JavaScript, no framework, no build step, no runtime dependencies.
- **Offline (builder's call):** the page must reopen with no network after the tab was closed. Use a small service worker that caches the app files, plus a web manifest so it can be added to the home screen. Updates must reach the phone: network-first for the app files (fall back to cache offline), or cache-first with a version bump on every deploy. Either way, a fix pushed to GitHub shows up on the next online open.
- Target browser: **Chrome on the owner's phone** (assume Android). Pinch-zoom/pan must be handled by the page, and the browser's own page zoom must not fight it.
- Phone-first, in **landscape**. In portrait it still works but shows a "rotate your phone" hint.
- UI text in English (matches the English edition). Builder's call, confirmed acceptable.
- Repository: new public repo `ticket-to-ride` in GitHub account `Murrr-Andrew`, served by GitHub Pages from the default branch. `gh` CLI is logged in as `Murrr-Andrew` on this machine. The local folder is `/Users/andrewmurko/Documents/apps/ticket-to-ride`.

## Decided by the owner

### Layout (landscape)

- The map fills the screen except a narrow column on the right.
- Right column, top to bottom: the 5 player colors (red, blue, green, yellow, black) as round chips; the selected one is marked. Below: the selected color's summary (points, wagons `used/45`, stations `n/3`, tickets done/total, longest route). Then the Undo button.
- Tapping the summary (or a small button) opens the full score table for all colors and the ticket list as an overlay.
- Pinch to zoom and drag to pan the map.

### Player color

- The active color is chosen in the right column.
- Default for every new action is the color of the previous action. On a new game, the default is the first color the owner picks (builder may preselect red).
- Any color can be used for any action, so the owner can mark only their own moves, or friends' too.

### Map style

- "As in the game": cities at roughly their board positions, each route drawn as its row of wagon spaces (one rectangle per wagon), in the board color. Gray routes are gray.
- Double routes are two parallel lines, each claimable on its own.
- Tunnels: the wagon spaces have a distinct outline (the board uses a dark dashed border).
- Ferries: the route shows how many locomotive spaces it needs (a small locomotive mark on those spaces).

### Claiming routes

- Tap a route → it is claimed in the active color: the wagon spaces fill with the player color (or show a player-color marker on each space so the original route color is still readable — builder's call, see below).
- Tap a claimed route → it is unclaimed (this is also recorded as an action, so it can be undone).
- Claiming adds route points by the official table and subtracts the wagons from that color's 45.

Route points: 1 → 1, 2 → 2, 3 → 4, 4 → 7, 6 → 15, 8 → 21. (Include 5 → 10 for safety although the Europe map has no length-5 routes.)

### Stations

- Rules (verified from the Europe rulebook): each player has 3 stations; a station sits on a city; only one station per city across all players. At game end a station lets its owner count one route of another player that enters that city for their tickets.
- Tap a city → choose "Place station" (in the active color) or "Start ticket". A city with a station shows it in the player color; tapping it again offers "Remove station".
- The count `n/3` is shown per color. A 4th station for a color, or a 2nd station in one city, is refused with a short message.
- Stations give no points.

### Destination tickets

- Only the owner's tickets are tracked (they don't know other players' tickets). Builder's call: tickets belong to the color that was active when the ticket was added; in practice this is the owner's color.
- Add: tap city A → "Start ticket" → tap city B → enter the ticket's points (number input) → save.
- Each ticket gets its own highlight color (distinct from the 5 player colors), and both its cities get a ring in that color on the map. Several tickets can be active at once.
- **Automatic connection check:** a ticket is "connected" when city A and city B are linked only by routes claimed in the ticket's color (plain graph search, no network). The check runs after every action.
- **Manual "Mark connected":** for paths that use another player's route through a station (which the page usually can't see because others' routes may not be marked). It can be unchecked.
- Score: connected tickets (auto or manual) add their points; unconnected tickets show as pending with the points that would be lost. The total for the owner's color = route points + connected tickets − unconnected tickets. The table shows both "now" and the pending ticket value clearly so the mid-game number isn't confusing (builder decides presentation).
- A ticket can be deleted.

### Longest continuous route

- For each color with claimed routes: the longest path in wagons along that color's routes, where no route is used twice (cities may repeat). Stations do not count. Shown in the table; the leader is marked. No points are added.

### Undo and last action

- Every change is an action: claim, unclaim, place/remove station, add/delete ticket, mark/unmark connected.
- The most recent action is always highlighted on the map (e.g. pulsing outline on that route or city; for ticket actions, the ticket's cities).
- The Undo button reverts the last action and then highlights the action that is now last. Undo can be pressed repeatedly back to the start of the game.

### Persistence

- The whole game (actions, tickets, active color) is saved in `localStorage` after every action and restored on load.
- "New game" in the overlay clears everything after a confirmation.

## Map data

The builder must produce `data` (a JS or JSON file) with:

- 47 cities, with the names spelled as on the owner's board photo (e.g. Lisboa, Cadiz, Kobenhavn, Munchen, Zacrab, Wilno, Petrograd, Moskva, Kyiv, Angora, Smyrna, Constantinople, Erzurum, Sochi, Rostov, Sevastopol, Kharkov…), and x/y coordinates matching the board's layout closely enough that the owner recognizes it.
- Every route: the two cities, length, color (`red, blue, green, yellow, black, white, orange, pink, gray`), whether it is a tunnel, number of locomotive spaces for ferries, and for double routes both lines as separate entries.
- The official totals to check against: 47 cities, 101 routes counting each line of a double route separately (verify this number against sources), 46 tickets in the box (tickets are **not** needed as data since the owner types points in).

**Edition and reference:** the owner has the standard (non-anniversary) English board. Their photo of it is at `reference/board.jpg` (1280×960, slightly drawn on in green; colors are readable). The folder is git-ignored: the photo is a working reference only and is never committed or shipped.

- **Coordinates:** take city positions from the photo (scale to the SVG viewBox), so the layout matches what the owner sees at the table.
- **Routes:** build the list from reliable sources (official rulebook, BoardGameGeek files, wiki route lists), then check every route's color, length, tunnel and ferry marks against the photo. **The photo wins** when sources disagree. Where the photo is unclear, note the route in the data file and in the hand-over so the owner can check it on the real board.
- **Verification view (builder's call, owner-approved idea):** a simple way for the owner to compare the drawn map with their board once, e.g. a `?check` URL mode that lists all routes as text grouped by city. Keep it small.

## Left to the builder

- File structure, code organization, SVG rendering approach, pan/zoom implementation.
- Exact visual styling (background, fonts, how a claimed route shows the player color while keeping the route color readable, highlight animation).
- The 5 ticket highlight colors and how many tickets are supported before colors repeat.
- How the end of the game is signalled (suggestion: warn when any color has 2 or fewer wagons left, as that triggers the last round).
- Testing approach: at minimum, checks for route-points, wagon counting, ticket connection and longest-route logic, plus a manual check on a phone-sized landscape viewport.
- The `README.md` content.
