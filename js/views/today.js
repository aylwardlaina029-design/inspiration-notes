// views/today.js - 今日视图
import { el, clear } from '../dom.js';
import * as store from '../store.js';
import { todayStr, formatCN, weekdayName } from '../dateutil.js';
import { appliesOn, PATTERN_LABEL, customDaysLabel } from '../recurring.js';
import { renderMood } from '../components/mood.js';
import { emptyState } from '../components/empty.js';
import { dueDatedTasks, notificationsSupported, notificationPermission, requestNotificationPermission, fireDueNotifications } from '../reminder.js';

function taskRow(task, done, onToggle, onEdit) {
  const check = el('button', {
    class: 'check' + (done ? ' done' : ''),
    onclick: onToggle
  }, [done ? '✓' : '']);
  const title = el('div', { class: 'task-title' + (done ? ' struck' : '') }, [task.title]);
  const row = el('div', { class: 'task-row' }, [check, title]);
  if (onEdit) row.appendChild(el('button', { class: 'task-edit', onclick: onEdit }, ['✎']));
  return row;
}

export async function renderToday(container, ctx) {
  clear(container);
  const date = todayStr();
  const tasks = await store.listTasks();

  const shortDue = tasks.filter(t => t.type === 'short' && t.date === date);
  const datedDue = tasks.filter(t => t.type === 'dated' && t.targetDate && t.targetDate <= date);
  const recurDue = tasks.filter(t => t.type === 'recurring' && appliesOn(t, date));

  const refresh = ctx.refresh || (() => {});

  // 顶部日期
  container.appendChild(el('div', { class: 'date-hero' }, [
    el('div', { class: 'date-hero-main' }, [formatCN(date)]),
    el('div', { class: 'date-hero-sub' }, ['今天的灵感与计划'])
  ]));

  // 到期提醒横幅（仅未授权通知时提示开启；任务在下方「到期/逾期」卡片中可勾选）
  const due = await dueDatedTasks();
  if (due.length && notificationsSupported() && notificationPermission() !== 'granted') {
    const banner = el('div', { class: 'reminder-banner' }, [
      el('div', { class: 'reminder-head' }, [
        el('span', { class: 'reminder-ico', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5.2 18.8C5.2 11.4 9.9 5.6 19.4 5c.5 9.5-5.4 14.2-14.2 13.8Z"/><path d="M5.2 18.8 14.9 9.1"/></svg>' }),
        '有 ' + due.length + ' 条任务到期 / 逾期'
      ]),
      el('div', { class: 'reminder-tip' }, ['开启系统通知，应用打开当天会自动弹窗提醒；任务可在下方直接勾选完成。']),
      el('button', { class: 'btn tiny primary', style: 'margin-top:8px', onclick: async () => {
        const p = await requestNotificationPermission();
        if (p === 'granted') await fireDueNotifications();
        refresh();
      } }, ['开启系统通知'])
    ]);
    container.appendChild(banner);
  }

  // 心情
  const moodCard = el('div', { class: 'card' });
  await renderMood(moodCard, date, () => {});
  container.appendChild(moodCard);

  // 短期任务
  const shortCard = el('div', { class: 'card' });
  shortCard.appendChild(el('div', { class: 'card-title' }, [
    '今日待办 ',
    el('span', { class: 'card-count' }, [`(${shortDue.filter(t => t.done).length}/${shortDue.length})`])
  ]));
  if (!shortDue.length) shortCard.appendChild(emptyState('🌿', '暂无待办', '记下一条试试'));
  for (const t of shortDue) {
    shortCard.appendChild(taskRow(t, t.done, async () => { await store.toggleTaskDone(t); refresh(); },
      () => import('../components/quickadd.js').then(m => m.openQuickAdd(refresh, { task: t }))));
  }
  container.appendChild(shortCard);

  // 循环任务
  if (recurDue.length) {
    const rCard = el('div', { class: 'card' });
    rCard.appendChild(el('div', { class: 'card-title' }, ['循环任务']));
    for (const t of recurDue) {
      const comp = await store.getCompletion(t.id, date);
      const done = !!(comp && comp.done);
      rCard.appendChild(taskRow(t, done, async () => { await store.setCompletion(t.id, date, !done); refresh(); },
        () => import('../components/quickadd.js').then(m => m.openQuickAdd(refresh, { task: t }))));
      const meta = el('div', { class: 'task-meta' }, [PATTERN_LABEL[t.pattern] + (t.pattern === 'custom' ? '（' + customDaysLabel(t.customDays) + '）' : '')]);
      rCard.appendChild(meta);
    }
    container.appendChild(rCard);
  }

  // 今天到期 / 逾期的未来定时任务（逾期未完成标红，均可直接勾选）
  if (datedDue.length) {
    const overCount = datedDue.filter(t => !t.done && t.targetDate < date).length;
    const dCard = el('div', { class: 'card' });
    dCard.appendChild(el('div', { class: 'card-title' }, [
      '到期 / 逾期 ',
      el('span', { class: 'card-count' }, ['(' + datedDue.filter(t => t.done).length + '/' + datedDue.length + (overCount ? '，' + overCount + ' 条逾期' : '') + ')'])
    ]));
    for (const t of datedDue) {
      const row = taskRow(t, t.done, async () => { await store.toggleTaskDone(t); refresh(); },
        () => import('../components/quickadd.js').then(m => m.openQuickAdd(refresh, { task: t })));
      if (!t.done && t.targetDate < date) row.classList.add('overdue-row');
      dCard.appendChild(row);
    }
    container.appendChild(dCard);
  }
}
