# Ticket to Ride Europe tracker

A personal companion page for the Ticket to Ride Europe board game: the board on your phone, the right way up, where you can mark claimed routes, stations and destination tickets and keep score per player color.

**Open it:** https://murrr-andrew.github.io/ticket-to-ride/

The interface is in Russian; city names are as printed on the English board. Works best with the phone in landscape. Add it to the home screen and it opens offline too.

## How to use

- **Menu** (round button, top right) opens the side panel: player colors, score summary, score table. Every new action uses the chosen color until you pick another one.
- **Tap a route** to claim it; tap a claimed route to unclaim it. Double routes ask which line.
- **Tap a city** to place or remove a station, or to start a ticket: "Ticket from here", tap the second city, enter the points.
- **↶** (below the menu button) reverts the last action.
- **Score & tickets** shows points, wagons, stations and the longest route for every color, and your tickets. A ticket is marked connected automatically when your routes link both cities; use "Mark connected" when the path goes through a station.
- **Check map** (`?check`) lists every route by city to compare with a physical board.

House rules built in: unused stations score nothing, and the longest-route bonus is shown but not added.

## Development

Plain HTML, CSS and JavaScript, no build step.

```sh
python3 -m http.server 8080   # then open http://localhost:8080
npm test                      # logic, graph, geometry and map data tests (Node 18+)
```

Map data lives in `js/data.js`. After changing any app file, bump `CACHE` in `sw.js` only if you switch to cache-first; the current service worker is network-first, so updates arrive on the next online visit.

Fan-made, for personal use. Not affiliated with Days of Wonder; no game artwork is used — the map is drawn from scratch.
