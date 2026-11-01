// Ticket to Ride Europe board data.
//
// Coordinates are in the pixel space of the owner's 1280×960 board photo
// (reference/board.jpg, not committed), so the layout matches the table.
// Routes: the published Europe route list (rulebook / BoardGameGeek route
// lists), checked one by one against the photo for color, length, tunnel
// outline and locomotive spaces. 47 cities, 101 routes (each line of a
// double route counts once).
//
// `bend` is the point the route passes through halfway, for routes that
// visibly curve on the board. `offset` puts the two lines of a double route
// on either side of the centre line: +1 is to the right of the a→b
// direction (screen coordinates), −1 to the left.

export const VIEWBOX = { w: 1280, h: 960 };

export const CITIES = [
  ['edinburgh', 'Edinburgh', 198, 88],
  ['london', 'London', 300, 302],
  ['amsterdam', 'Amsterdam', 430, 304],
  ['bruxelles', 'Bruxelles', 405, 370],
  ['dieppe', 'Dieppe', 289, 429],
  ['brest', 'Brest', 161, 473],
  ['paris', 'Paris', 360, 485],
  ['essen', 'Essen', 542, 314],
  ['frankfurt', 'Frankfurt', 526, 410],
  ['kobenhavn', 'København', 635, 169],
  ['stockholm', 'Stockholm', 767, 61],
  ['berlin', 'Berlin', 671, 330],
  ['danzig', 'Danzig', 812, 223],
  ['riga', 'Riga', 917, 96],
  ['petrograd', 'Petrograd', 1117, 91],
  ['wilno', 'Wilno', 1007, 274],
  ['warszawa', 'Warszawa', 875, 307],
  ['smolensk', 'Smolensk', 1127, 267],
  ['moskva', 'Moskva', 1222, 244],
  ['kyiv', 'Kyïv', 1051, 371],
  ['kharkov', 'Kharkov', 1205, 435],
  ['rostov', 'Rostov', 1245, 496],
  ['sochi', 'Sochi', 1239, 606],
  ['sevastopol', 'Sevastopol', 1137, 592],
  ['erzurum', 'Erzurum', 1212, 758],
  ['angora', 'Angora', 1124, 792],
  ['smyrna', 'Smyrna', 986, 835],
  ['constantinople', 'Constantinople', 1037, 735],
  ['bucuresti', 'Bucureşti', 979, 584],
  ['sofia', 'Sofia', 909, 669],
  ['athina', 'Athina', 889, 814],
  ['sarajevo', 'Sarajevo', 828, 663],
  ['zacrab', 'Zacrab', 727, 595],
  ['budapest', 'Budapest', 799, 509],
  ['wien', 'Wien', 740, 479],
  ['munchen', 'München', 599, 462],
  ['zurich', 'Zürich', 515, 554],
  ['venezia', 'Venezia', 620, 587],
  ['roma', 'Roma', 632, 703],
  ['brindisi', 'Brindisi', 739, 727],
  ['palermo', 'Palermo', 679, 866],
  ['marseille', 'Marseille', 480, 678],
  ['pamplona', 'Pamplona', 276, 695],
  ['barcelona', 'Barcelona', 295, 820],
  ['madrid', 'Madrid', 141, 820],
  ['lisboa', 'Lisboa', 44, 860],
  ['cadiz', 'Cádiz', 143, 920],
].map(([id, name, x, y]) => ({ id, name, x, y }));

const ROUTES_RAW = [];

// Single route.
function r(a, b, len, color, opts = {}) {
  ROUTES_RAW.push({
    id: `${a}-${b}`, a, b, len, color,
    tunnel: !!opts.tunnel, loco: opts.loco ?? 0,
    pair: null, offset: 0, bend: opts.bend ?? null,
  });
}

// Double route: colors are [left of a→b, right of a→b].
function d(a, b, len, [left, right], opts = {}) {
  const base = { a, b, len, tunnel: !!opts.tunnel, loco: opts.loco ?? 0, bend: opts.bend ?? null };
  const id1 = `${a}-${b}-1`;
  const id2 = `${a}-${b}-2`;
  ROUTES_RAW.push({ ...base, id: id1, color: left, pair: id2, offset: -1 });
  ROUTES_RAW.push({ ...base, id: id2, color: right, pair: id1, offset: 1 });
}

// British Isles and the Channel
d('edinburgh', 'london', 4, ['orange', 'black']);
r('london', 'amsterdam', 2, 'gray', { loco: 2 });
d('london', 'dieppe', 2, ['gray', 'gray'], { loco: 1 });

// France, Benelux
r('brest', 'dieppe', 2, 'orange');
r('brest', 'paris', 3, 'black');
r('brest', 'pamplona', 4, 'pink', { bend: [255, 575] });
r('dieppe', 'paris', 1, 'pink');
r('dieppe', 'bruxelles', 2, 'green');
d('bruxelles', 'paris', 2, ['red', 'yellow']);
r('amsterdam', 'bruxelles', 1, 'black');
r('amsterdam', 'essen', 3, 'yellow');
r('amsterdam', 'frankfurt', 2, 'white');
r('bruxelles', 'frankfurt', 2, 'blue');
d('paris', 'frankfurt', 3, ['white', 'orange']);
d('paris', 'pamplona', 4, ['green', 'blue'], { bend: [318, 590] });
r('paris', 'marseille', 4, 'gray', { bend: [410, 588] });
r('paris', 'zurich', 3, 'gray', { tunnel: true, bend: [437, 548] });
r('pamplona', 'marseille', 4, 'red', { bend: [380, 652] });

// Iberia
d('madrid', 'pamplona', 3, ['black', 'white'], { tunnel: true });
r('pamplona', 'barcelona', 2, 'gray', { tunnel: true });
r('madrid', 'barcelona', 2, 'yellow');
r('lisboa', 'madrid', 3, 'pink', { bend: [62, 796] });
r('lisboa', 'cadiz', 2, 'blue', { bend: [78, 910] });
r('madrid', 'cadiz', 3, 'orange', { bend: [198, 876] });
r('barcelona', 'marseille', 4, 'gray');

// Germany, Scandinavia
r('essen', 'frankfurt', 2, 'green');
r('essen', 'berlin', 2, 'blue');
d('essen', 'kobenhavn', 3, ['gray', 'gray'], { loco: 1 });
d('kobenhavn', 'stockholm', 3, ['yellow', 'white'], { bend: [695, 108] });
r('stockholm', 'petrograd', 8, 'gray', { tunnel: true, bend: [950, 64] });
d('frankfurt', 'berlin', 3, ['black', 'red']);
r('frankfurt', 'munchen', 2, 'pink');
r('berlin', 'danzig', 4, 'gray', { bend: [708, 222] });
d('berlin', 'warszawa', 4, ['pink', 'yellow'], { bend: [773, 308] });
r('berlin', 'wien', 3, 'green');

// Baltic and Russia
r('danzig', 'riga', 3, 'black', { bend: [852, 148] });
r('danzig', 'warszawa', 2, 'gray');
r('riga', 'petrograd', 4, 'gray');
r('riga', 'wilno', 4, 'green', { bend: [925, 205] });
r('warszawa', 'wilno', 3, 'red');
r('warszawa', 'wien', 4, 'blue');
r('warszawa', 'kyiv', 4, 'gray', { bend: [963, 360] });
r('wilno', 'petrograd', 4, 'blue');
r('wilno', 'smolensk', 3, 'yellow', { bend: [1058, 240] });
r('wilno', 'kyiv', 2, 'gray');
r('smolensk', 'moskva', 2, 'orange');
r('smolensk', 'kyiv', 3, 'red');
r('petrograd', 'moskva', 4, 'white', { bend: [1202, 150] });
r('moskva', 'kharkov', 4, 'gray', { bend: [1248, 340] });
r('kyiv', 'kharkov', 4, 'gray', { bend: [1125, 452] });
r('kharkov', 'rostov', 2, 'green', { bend: [1245, 448] });
r('rostov', 'sochi', 2, 'gray');
r('rostov', 'sevastopol', 4, 'gray', { bend: [1165, 520] });

// Black Sea and Turkey
r('sevastopol', 'sochi', 2, 'gray', { loco: 1 });
r('sevastopol', 'erzurum', 4, 'gray', { loco: 2 });
r('sevastopol', 'constantinople', 4, 'gray', { loco: 2 });
r('sevastopol', 'bucuresti', 4, 'white', { bend: [1060, 535] });
r('sochi', 'erzurum', 3, 'red', { tunnel: true });
r('erzurum', 'angora', 3, 'black');
r('angora', 'constantinople', 2, 'gray', { tunnel: true });
r('angora', 'smyrna', 3, 'orange', { tunnel: true });
r('smyrna', 'constantinople', 2, 'gray', { tunnel: true });
r('smyrna', 'athina', 2, 'gray', { loco: 1 });
r('smyrna', 'palermo', 6, 'gray', { loco: 2, bend: [830, 858] });

// Balkans and Central Europe
r('kyiv', 'bucuresti', 4, 'gray');
r('kyiv', 'budapest', 6, 'gray', { tunnel: true, bend: [925, 412] });
r('budapest', 'bucuresti', 4, 'gray', { tunnel: true });
r('bucuresti', 'sofia', 2, 'gray', { tunnel: true });
r('bucuresti', 'constantinople', 3, 'yellow');
r('sofia', 'constantinople', 3, 'blue');
r('sofia', 'athina', 3, 'pink');
r('sofia', 'sarajevo', 2, 'gray', { tunnel: true });
r('sarajevo', 'athina', 4, 'green');
r('sarajevo', 'budapest', 3, 'pink');
r('sarajevo', 'zacrab', 3, 'red');
r('zacrab', 'budapest', 2, 'orange');
r('zacrab', 'wien', 2, 'gray');
r('zacrab', 'venezia', 2, 'gray');
d('wien', 'budapest', 1, ['red', 'white']);
r('munchen', 'wien', 3, 'orange');
r('munchen', 'venezia', 2, 'blue', { tunnel: true });
r('zurich', 'munchen', 2, 'yellow', { tunnel: true });
r('zurich', 'venezia', 2, 'green', { tunnel: true });
r('zurich', 'marseille', 2, 'pink', { tunnel: true });

// Italy and the Mediterranean
r('venezia', 'roma', 2, 'black');
r('roma', 'brindisi', 2, 'white');
r('roma', 'palermo', 4, 'gray', { loco: 1 });
r('marseille', 'roma', 4, 'gray', { tunnel: true, bend: [555, 636] });
r('brindisi', 'palermo', 3, 'gray', { loco: 1 });
r('brindisi', 'athina', 4, 'gray', { loco: 1 });

export const ROUTES = ROUTES_RAW;

// Routes the photo did not settle beyond doubt; shown first in ?check mode.
export const UNSURE = [];
