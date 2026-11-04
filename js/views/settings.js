// views/settings.js - 设置：备份 / 清空 / 关于
import { el, clear } from '../dom.js';
import * as store from '../store.js';
import { notificationsSupported, notificationPermission, requestNotificationPermission } from '../reminder.js';

function permText() {
  if (!notificationsSupported()) return '当前环境不支持系统通知，将以应用内横幅提醒。';
  const p = notificationPermission();
  return p === 'granted' ? '已开启系统通知 ✓' : p === 'denied' ? '通知已被拒绝，可在浏览器站点设置中重新开启' : '尚未开启系统通知';
}

export async function renderSettings(container, ctx) {
  clear(container);
  const refresh = ctx.refresh || (() => {});

  if (!(ctx && ctx.inDrawer)) {
    container.appendChild(el('div', { class: 'date-hero' }, [
      el('div', { class: 'date-hero-main' }, ['设置']),
      el('div', { class: 'date-hero-sub' }, ['数据备份与关于'])
    ]));
  }

  container.appendChild(el('div', { class: 'card' }, [
    el('div', { class: 'card-title' }, ['数据备份']),
    el('div', { class: 'set-row' }, [
      el('button', { class: 'btn primary', onclick: async () => {
        const data = await store.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'inspire-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
      } }, [
        el('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15.2V4.4"/><path d="M7.9 8.5 12 4.4l4.1 4.1"/><path d="M4.8 14.4v3.3a2 2 0 0 0 2 2h10.4a2 2 0 0 0 2-2v-3.3"/></svg>' }),
        '导出 JSON'
      ]),
      el('label', { class: 'btn secondary' }, ['导入 JSON', el('input', {
        type: 'file', accept: '.json', style: 'display:none', onchange: async (e) => {
          const f = e.target.files[0]; if (!f) return;
          try { const data = JSON.parse(await f.text()); await store.importData(data); alert('导入成功'); refresh(); }
          catch (err) { alert('导入失败：' + err.message); }
        }
      })])
    ])
  ]));

  container.appendChild(el('div', { class: 'card danger-zone' }, [
    el('div', { class: 'card-title' }, ['危险区']),
    el('button', { class: 'btn danger block', onclick: async () => {
      if (confirm('确定清空全部数据？此操作不可恢复！')) { await store.wipeAll(); alert('已清空'); refresh(); }
    } }, ['清空全部数据'])
  ]));

  container.appendChild(el('div', { class: 'card' }, [
    el('div', { class: 'card-title' }, ['到期提醒']),
    el('div', { class: 'set-row' }, [
      el('span', { class: 'muted' }, [permText()]),
      el('button', { class: 'btn info', onclick: async () => { await requestNotificationPermission(); refresh(); } }, ['授权/重试'])
    ]),
    el('div', { class: 'muted', style: 'margin-top:8px; font-size:12px' }, ['本地优先应用无法在完全关闭后后台推送。应用打开当天，到期与逾期任务会触发系统通知（若已授权），并在「今日」顶部以横幅提醒。'])
  ]));

  container.appendChild(el('div', { class: 'card about' }, [
    el('div', { class: 'card-title' }, ['关于']),
    el('div', {}, ['灵感记录 · 本地优先 PWA']),
    el('div', { class: 'muted' }, ['所有数据仅保存在本机浏览器（IndexedDB），不会上传。建议定期导出 JSON 备份。'])
  ]));
}
