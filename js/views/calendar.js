// views/calendar.js - 日历总览 + 日期详情
import { el, clear } from '../dom.js';
import * as store from '../store.js';
import { todayStr, monthMatrix, formatCN, parse } from '../dateutil.js';
import { appliesOn } from '../recurring.js';
import { moodEmoji, moodLabel } from '../components/mood.js';
import { emptyState } from '../components/empty.js';

let viewY, viewM;

async function openDayDetail(d, refresh) {
  const overlay = el('div', { class: 'modal-overlay' });
  const modal = el('div', { class: 'modal wide' });
  const close = () => overlay.remove();
  modal.appendChild(el('h3', { class: 'modal-title' }, [formatCN(d)]));
  const body = el('div', { class: 'day-body' });
  modal.appendChild(body);
  modal.appendChild(el('div', { class: 'qa-actions' }, [el('button', { class: 'btn primary', onclick: close }, ['关闭'])]));
  overlay.appendChild(modal);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);

  async function paint() {
    body.innerHTML = '';
    const tasks = await store.listTasks();
    const items = [];
    for (const t of tasks) {
      if (t.type === 'short' && t.date === d) items.push({ task: t, done: t.done, toggle: async () => store.toggleTaskDone(t) });
      else if (t.type === 'dated' && t.targetDate === d) items.push({ task: t, done: t.done, toggle: async () => store.toggleTaskDone(t) });
      else if (t.type === 'recurring' && appliesOn(t, d)) {
        const c = await store.getCompletion(t.id, d); const done = !!(c && c.done);
        items.push({ task: t, done, toggle: async () => store.setCompletion(t.id, d, !done) });
      }
    }
    body.appendChild(el('div', { class: 'day-section-title' }, [
      '计划 ',
      el('span', { class: 'card-count' }, [`(${items.filter(i => i.done).length}/${items.length})`])
    ]));
    if (!items.length) body.appendChild(emptyState('🍃', '这一天没有计划', '添加一条试试'));
    for (const it of items) {
      const row = el('div', { class: 'task-row' }, [
        el('button', { class: 'check' + (it.done ? ' done' : ''), onclick: async () => { await it.toggle(); await paint(); refresh(); } }, [it.done ? '✓' : '']),
        el('div', { class: 'task-title' + (it.done ? ' struck' : '') }, [it.task.title]),
        el('button', { class: 'task-edit', onclick: () => import('../components/quickadd.js').then(m => m.openQuickAdd(async () => { await paint(); refresh(); }, { task: it.task })) }, ['✎'])
      ]);
      body.appendChild(row);
    }

    const mood = await store.getMood(d);
    body.appendChild(el('div', { class: 'day-section-title' }, ['心情']));
    if (mood && mood.score) {
      const mwrap = el('div', { class: 'mood-detail' });
      mwrap.appendChild(el('span', { class: 'mood-emoji' }, [moodEmoji(mood.score)]));
      mwrap.appendChild(el('span', { class: 'mood-detail-label' }, [moodLabel(mood.score)]));
      if (mood.note) mwrap.appendChild(el('span', { class: 'mood-detail-note' }, [mood.note]));
      body.appendChild(mwrap);
    } else {
      body.appendChild(el('div', { class: 'empty-note' }, ['未记录']));
    }

    const refs = (await store.listReflections()).filter(r => r.date === d);
    body.appendChild(el('div', { class: 'day-section-title' }, [
      '灵感 ',
      el('span', { class: 'card-count' }, [`(${refs.length})`])
    ]));
    if (!refs.length) body.appendChild(el('div', { class: 'empty-note' }, ['无']));
    for (const r of refs) body.appendChild(el('div', { class: 'ref-mini' }, [r.title ? el('b', {}, [r.title + '：']) : null, r.content]));
  }
  await paint();
}

export async function renderCalendar(container, ctx) {
  clear(container);
  const refresh = ctx.refresh || (() => {});
  const now = new Date();
  if (!viewY) { viewY = now.getFullYear(); viewM = now.getMonth() + 1; }

  const tasks = await store.listTasks();
  const comps = await store.allCompletions();
  const compMap = {}; comps.forEach(c => compMap[c.id] = c);
  const moods = await store.listMoods();
  const moodMap = {};
  moods.forEach(m => { if (m && m.score) moodMap[m.date] = m.score; });
  const refs = await store.listReflections();
  const refSet = new Set(refs.map(r => r.date));

  function itemsFor(day) {
    const arr = [];
    for (const t of tasks) {
      if (t.type === 'short' && t.date === day) arr.push({ task: t, done: t.done });
      else if (t.type === 'dated' && t.targetDate === day) arr.push({ task: t, done: t.done });
      else if (t.type === 'recurring' && appliesOn(t, day)) {
        const c = compMap[`${t.id}__${day}`]; arr.push({ task: t, done: !!(c && c.done) });
      }
    }
    return arr;
  }

  container.appendChild(el('div', { class: 'cal-header' }, [
    el('button', { class: 'cal-nav', onclick: () => { viewM--; if (viewM < 1) { viewM = 12; viewY--; } refresh(); } }, ['‹']),
    el('div', { class: 'cal-title' }, [`${viewY}年${viewM}月`]),
    el('button', { class: 'cal-nav', onclick: () => { viewM++; if (viewM > 12) { viewM = 1; viewY++; } refresh(); } }, ['›'])
  ]));

  const grid = el('div', { class: 'cal-grid' });
  ['日', '一', '二', '三', '四', '五', '六'].forEach(w => grid.appendChild(el('div', { class: 'cal-weekday' }, [w])));
  const cells = monthMatrix(viewY, viewM);
  const today = todayStr();
  for (const d of cells) {
    const inMonth = parse(d).getMonth() + 1 === viewM;
    const items = itemsFor(d);
    const total = items.length;
    const done = items.filter(i => i.done).length;
    const cls = 'cal-cell' + (inMonth ? '' : ' out') + (d === today ? ' today' : '');
    const dots = el('div', { class: 'cal-dots' });
    if (total > 0) {
      if (done === total) dots.appendChild(el('span', { class: 'cal-tick' }, ['✓']));
      else dots.appendChild(el('span', { class: 'dot partial' }));
    }
    if (moodMap[d]) dots.appendChild(el('span', { class: 'dot mood' }));
    if (refSet.has(d)) dots.appendChild(el('span', { class: 'dot ref' }));
    grid.appendChild(el('div', { class: cls, onclick: () => openDayDetail(d, refresh) }, [el('div', { class: 'cal-num' }, [String(parse(d).getDate())]), dots]));
  }
  container.appendChild(grid);

  container.appendChild(el('div', { class: 'cal-legend' }, [
    el('span', {}, [el('span', { class: 'dot partial' }), ' 有任务']),
    el('span', {}, [el('span', { class: 'cal-tick' }, ['✓']), ' 已完成']),
    el('span', {}, [el('span', { class: 'dot mood' }), ' 有心情']),
    el('span', {}, [el('span', { class: 'dot ref' }), ' 有灵感'])
  ]));
}
