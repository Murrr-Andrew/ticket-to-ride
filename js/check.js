// ?check view: every route as text, grouped by city, to compare with the board.

import { CITIES, ROUTES, UNSURE } from './data.js';
import { colorName } from './logic.js';

const nameOf = new Map(CITIES.map((c) => [c.id, c.name]));

function describe(r, from) {
  const other = r.a === from ? r.b : r.a;
  const extra = [r.tunnel ? 'туннель' : null, r.loco ? `паром, паровозов: ${r.loco}` : null, r.pair ? 'двойной' : null]
    .filter(Boolean).join(', ');
  return `${nameOf.get(other)} · ${r.len} · ${colorName(r.color)}${extra ? ` · ${extra}` : ''}`;
}

export function renderCheck(root) {
  root.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'check';
  const head = document.createElement('p');
  head.innerHTML = `<b>Городов: ${CITIES.length}, маршрутов: ${ROUTES.length}.</b> Сравните каждый город с полем. <a href="./">Назад к карте</a>`;
  page.append(head);

  if (UNSURE.length) {
    const h = document.createElement('h2');
    h.textContent = 'Проверьте в первую очередь';
    const ul = document.createElement('ul');
    for (const u of UNSURE) {
      const li = document.createElement('li');
      li.textContent = `${u.id}: ${u.note}`;
      ul.append(li);
    }
    page.append(h, ul);
  }

  for (const c of [...CITIES].sort((x, y) => x.name.localeCompare(y.name))) {
    const h = document.createElement('h2');
    h.textContent = c.name;
    const ul = document.createElement('ul');
    for (const r of ROUTES.filter((x) => x.a === c.id || x.b === c.id)) {
      const li = document.createElement('li');
      li.textContent = describe(r, c.id);
      ul.append(li);
    }
    page.append(h, ul);
  }
  root.append(page);
}
