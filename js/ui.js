// Small DOM helpers: popup menu, dialogs, toast, panel and score overlay.

import { PLAYER_COLORS, WAGONS, STATIONS, colorStats, colorName } from './logic.js';
import { longestRoute, ticketStatus, ticketScore } from './graph.js';
import { ROUTES, CITIES } from './data.js';
import { PLAYER_FILL } from './map.js';

const $ = (id) => document.getElementById(id);
const cityName = new Map(CITIES.map((c) => [c.id, c.name]));
export const nameOf = (id) => cityName.get(id) ?? id;

function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'style') node.style.cssText = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) node.append(c);
  return node;
}

// ---- Toast ----
let toastTimer;
export function showToast(text) {
  const t = $('toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

// ---- Popup menu near a screen point ----
export function showPopup(at, title, items) {
  const p = $('popup');
  p.innerHTML = '';
  if (title) p.append(h('div', { class: 'title' }, title));
  for (const it of items) {
    p.append(h('button', {
      class: `btn${it.danger ? ' danger' : ''}`,
      onclick: () => { hidePopup(); it.onClick(); },
    }, it.swatch ? h('span', { class: 'swatch', style: `background:${it.swatch}` }) : null, it.label));
  }
  p.hidden = false;
  const r = p.getBoundingClientRect();
  const x = Math.min(Math.max(8, at.x - r.width / 2), window.innerWidth - r.width - 8);
  const y = at.y + 16 + r.height < window.innerHeight ? at.y + 16 : Math.max(8, at.y - r.height - 16);
  p.style.left = `${x}px`;
  p.style.top = `${y}px`;
}

export function hidePopup() { $('popup').hidden = true; }

// ---- Points dialog ----
export function askPoints(a, b) {
  return new Promise((resolve) => {
    const d = $('dialog');
    const input = h('input', { type: 'number', inputmode: 'numeric', min: 1, max: 30, placeholder: 'Очки' });
    const done = (value) => { d.hidden = true; d.innerHTML = ''; resolve(value); };
    const save = () => {
      const n = Number(input.value);
      if (!Number.isInteger(n) || n < 1 || n > 30) { showToast('Введите очки с карточки (1–30)'); return; }
      done(n);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
    d.innerHTML = '';
    d.append(h('div', { class: 'sheet dialog-box' },
      h('h2', {}, `Билет ${nameOf(a)} – ${nameOf(b)}`),
      input,
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn', onclick: () => done(null) }, 'Отмена'),
        h('button', { class: 'btn primary', onclick: save }, 'Сохранить'))));
    d.hidden = false;
    input.focus();
  });
}

// ---- Numbers shared by panel and table ----
export function summarize(state, color) {
  const s = colorStats(state, ROUTES, color);
  const t = ticketScore(ROUTES, state, color);
  return { ...s, ticketsDone: t.done, ticketsOpen: t.open, longest: longestRoute(ROUTES, state.claims, color) };
}

function ticketsOf(state, color) {
  return [...state.tickets.values()].filter((t) => t.color === color);
}

// ---- Right column ----
export function renderPanel(ctx) {
  const { game, state, pendingFrom } = ctx;
  const color = game.activeColor;
  const s = summarize(state, color);
  const tickets = ticketsOf(state, color);
  const doneCount = tickets.filter((t) => ticketStatus(ROUTES, state, t) !== 'open').length;

  const panel = $('panel');
  panel.innerHTML = '';
  panel.append(...[
    h('div', { class: 'chips' }, PLAYER_COLORS.map((c) => h('button', {
      class: `chip${c === color ? ' active' : ''}`,
      style: `background:${PLAYER_FILL[c]}`,
      'aria-label': colorName(c, true),
      onclick: () => { ctx.setColor(c); closeDrawer(); },
    }))),
    h('button', { class: 'summary', onclick: ctx.openTable },
      h('div', {}, h('b', {}, String(s.routePts)), ' очк.'),
      h('div', {}, 'Вагоны ', h('span', { class: s.wagonsLeft < 0 ? 'neg' : '' }, `${s.wagonsUsed}/${WAGONS}`)),
      h('div', {}, `Станции ${s.stationsUsed}/${STATIONS}`),
      h('div', {}, `Билеты ${doneCount}/${tickets.length}`),
      tickets.length ? h('div', { class: 'muted' }, `+${s.ticketsDone} / −${s.ticketsOpen}`) : null,
      h('div', {}, `Цепочка ${s.longest}`)),
    h('button', { class: 'btn primary', disabled: game.actions.length === 0, onclick: ctx.undo }, '↶ Отменить'),
    h('button', { class: 'btn', onclick: closeDrawer }, 'Скрыть ›'),
    h('button', { class: 'btn', onclick: ctx.openTable }, 'Очки и билеты'),
  ].filter(Boolean));

  // Ticket being added: hint over the map.
  const hint = $('ticket-hint');
  hint.hidden = !pendingFrom;
  hint.innerHTML = '';
  if (pendingFrom) {
    hint.append(`Билет из ${nameOf(pendingFrom)}: нажмите второй город`,
      h('button', { class: 'btn', onclick: ctx.cancelTicket }, 'Отмена'));
  }

  // Floating buttons on the map.
  const menu = $('menu-btn');
  menu.innerHTML = '';
  menu.append(h('span', { class: 'dot', style: `background:${PLAYER_FILL[color]}` }), String(s.routePts));
  menu.onclick = () => (panel.classList.contains('open') ? closeDrawer() : openDrawer());
  const undo = $('undo-btn');
  undo.disabled = game.actions.length === 0;
  undo.onclick = ctx.undo;

  // Last-round warning.
  const low = PLAYER_COLORS
    .map((c) => ({ c, left: colorStats(state, ROUTES, c) }))
    .filter(({ left }) => left.wagonsUsed > 0 && left.wagonsLeft <= 2);
  const banner = $('banner');
  banner.hidden = low.length === 0;
  banner.textContent = low.map(({ c, left }) => `Последний круг: у ${colorName(c, false, true)} осталось вагонов: ${left.wagonsLeft}`).join(' · ');
}

// ---- Drawer ----
export function openDrawer() {
  $('panel').classList.add('open');
  $('panel').setAttribute('aria-hidden', 'false');
  $('drawer-backdrop').hidden = false;
  $('drawer-backdrop').onclick = closeDrawer;
}

export function closeDrawer() {
  $('panel').classList.remove('open');
  $('panel').setAttribute('aria-hidden', 'true');
  $('drawer-backdrop').hidden = true;
}

// ---- Score table and tickets ----
export function openOverlay(ctx) {
  closeDrawer();
  const { state } = ctx;
  const o = $('overlay');
  const close = () => { o.hidden = true; o.innerHTML = ''; };

  const used = PLAYER_COLORS.filter((c) => {
    const s = summarize(state, c);
    return s.wagonsUsed > 0 || s.stationsUsed > 0 || ticketsOf(state, c).length > 0;
  });
  const rows = used.map((c) => ({ c, s: summarize(state, c) }));
  const best = Math.max(0, ...rows.map((r) => r.s.longest));

  const table = h('table', {},
    h('tr', {}, ['Цвет', 'Маршруты', 'Билеты', 'Итого', 'Вагоны', 'Станции', 'Цепочка'].map((t) => h('th', {}, t))),
    rows.map(({ c, s }) => h('tr', {},
      h('td', {}, h('span', { class: 'swatch', style: `background:${PLAYER_FILL[c]};vertical-align:middle;margin-right:6px` }), colorName(c, true)),
      h('td', {}, String(s.routePts)),
      h('td', {}, s.ticketsDone || s.ticketsOpen ? `+${s.ticketsDone} / −${s.ticketsOpen}` : '–'),
      h('td', {}, h('b', {}, String(s.routePts + s.ticketsDone - s.ticketsOpen))),
      h('td', { class: s.wagonsLeft < 0 ? 'neg' : '' }, `${s.wagonsUsed} (осталось ${s.wagonsLeft})`),
      h('td', {}, `${s.stationsUsed}/${STATIONS}`),
      h('td', {}, `${s.longest}${s.longest > 0 && s.longest === best ? ' ★' : ''}`))));

  const tickets = [...state.tickets.values()];
  const ticketList = tickets.length
    ? tickets.map((t) => {
      const st = ticketStatus(ROUTES, state, t);
      return h('div', { class: 'ticket' },
        h('span', { class: 'swatch', style: `background:${t.hue}` }),
        h('span', { class: 'name' }, `${nameOf(t.a)} – ${nameOf(t.b)} · ${t.points} · `,
          h('span', { style: `color:${PLAYER_FILL[t.color]};font-weight:700` }, colorName(t.color, true)), ' · ',
          st === 'auto' ? '✓ соединён' : st === 'manual' ? '✓ отмечен' : 'не соединён'),
        st !== 'auto'
          ? h('button', { class: 'btn', onclick: () => { ctx.markTicket(t, !t.manual); close(); } },
            t.manual ? 'Снять отметку' : 'Соединён')
          : null,
        h('button', { class: 'btn danger', onclick: () => { ctx.deleteTicket(t); close(); } }, 'Удалить'));
    })
    : h('p', {}, 'Билетов пока нет. Нажмите на город → «Билет отсюда».');

  o.innerHTML = '';
  o.append(h('div', { class: 'sheet', onclick: (e) => e.stopPropagation() },
    h('h2', {}, 'Очки'),
    rows.length ? table : h('p', {}, 'Пока ничего не отмечено.'),
    h('p', { style: 'font-size:12px;color:#7a6a55' },
      'Итого = маршруты + соединённые билеты − несоединённые. Самая длинная цепочка только показывается, бонус за неё не добавляется.'),
    h('h3', {}, 'Билеты'),
    ticketList,
    h('div', { class: 'row-actions' },
      h('button', { class: 'btn danger', onclick: () => { if (confirm('Начать новую игру? Всё будет удалено.')) { ctx.newGame(); close(); } } }, 'Новая игра'),
      h('a', { class: 'btn', href: '?check', style: 'text-align:center;text-decoration:none' }, 'Сверка карты'),
      h('button', { class: 'btn primary', onclick: close }, 'Закрыть'))));
  o.onclick = close;
  o.hidden = false;
}
