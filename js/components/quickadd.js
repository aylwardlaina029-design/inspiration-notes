// components/quickadd.js - 加号速记浮层（新增 / 编辑任务）
import { el } from '../dom.js';
import * as store from '../store.js';
import { todayStr, addDays, weekdayName, parse } from '../dateutil.js';

const WEEK = ['日', '一', '二', '三', '四', '五', '六']; // 对应 getDay 0..6

// 相对日期提示：今天 / 明天 / N 天后 / 已逾期 N 天
function relativeHint(str) {
  if (!str) return '';
  const diff = Math.round((parse(str) - parse(todayStr())) / 86400000);
  if (diff === 0) return '就是今天';
  if (diff === 1) return '明天';
  if (diff > 1) return diff + ' 天后';
  if (diff === -1) return '昨天（已逾期）';
  return '已逾期 ' + (-diff) + ' 天';
}

export function openQuickAdd(onSaved, opts = {}) {
  const isEdit = !!opts.task;
  const t = opts.task || {};
  let type = opts.type || t.type || 'short';

  const overlay = el('div', { class: 'modal-overlay' });
  const modal = el('div', { class: 'modal' });
  const close = () => overlay.remove();

  const title = el('h3', { class: 'modal-title' }, [isEdit ? '编辑任务' : '快速记录']);
  const input = el('input', { class: 'qa-input', placeholder: '想记点什么…', value: t.title || '' });

  const tabs = el('div', { class: 'qa-tabs' });
  const dyn = el('div', { class: 'qa-dyn' });

  function makeTab(key, label) {
    return el('button', {
      class: 'qa-tab' + (type === key ? ' active' : ''),
      onclick: () => { type = key; tabs.querySelectorAll('.qa-tab').forEach(b => b.classList.toggle('active', b.textContent === label)); renderDyn(); }
    }, [label]);
  }
  tabs.appendChild(makeTab('short', '今日'));
  tabs.appendChild(makeTab('recurring', '循环'));
  tabs.appendChild(makeTab('dated', '某日'));

  function renderDyn() {
    dyn.innerHTML = '';
    if (type === 'recurring') {
      const pat = el('div', { class: 'qa-field' }, [el('label', {}, ['循环方式'])]);
      const sel = el('select', { class: 'qa-select' }, [
        el('option', { value: 'daily' }, ['每日']),
        el('option', { value: 'workday' }, ['仅工作日']),
        el('option', { value: 'custom' }, ['自定义星期'])
      ]);
      sel.value = t.pattern || 'daily';
      pat.appendChild(sel);
      dyn.appendChild(pat);

      const daysBox = el('div', { class: 'qa-weekdays' + (sel.value === 'custom' ? '' : ' hidden') });
      const cur = Array.isArray(t.customDays) ? t.customDays : [];
      WEEK.forEach((w, i) => {
        const id = 'wd' + i;
        const cb = el('input', { type: 'checkbox', id, value: i });
        if (cur.includes(i)) cb.checked = true;
        daysBox.appendChild(el('label', { class: 'wd-label' }, [cb, w]));
      });
      dyn.appendChild(daysBox);
      sel.addEventListener('change', () => daysBox.classList.toggle('hidden', sel.value !== 'custom'));

      const end = el('div', { class: 'qa-field' }, [
        el('label', {}, ['结束日期（可选）']),
        el('input', { type: 'date', class: 'qa-date', value: t.endDate || '' })
      ]);
      dyn.appendChild(end);
      dyn._collect = () => ({
        pattern: sel.value,
        customDays: sel.value === 'custom' ? WEEK.map((_, i) => i).filter(i => {
          const cb = daysBox.querySelector('#wd' + i); return cb && cb.checked;
        }) : undefined,
        endDate: end.querySelector('input').value || undefined
      });
    } else if (type === 'dated') {
      const init = t.targetDate || addDays(todayStr(), 1);
      const d = el('div', { class: 'qa-field' }, [
        el('label', {}, ['定到这一天']),
        el('input', { type: 'date', class: 'qa-date', value: init })
      ]);
      const hint = el('div', { class: 'qa-hint' }, [relativeHint(init)]);
      d.querySelector('input').addEventListener('change', e => { hint.textContent = relativeHint(e.target.value); });
      d.appendChild(hint);
      dyn.appendChild(d);
      dyn._collect = () => ({ targetDate: d.querySelector('input').value || addDays(todayStr(), 1) });
    } else {
      dyn._collect = () => ({});
    }
  }
  renderDyn();

  const actions = el('div', { class: 'qa-actions' }, [
    el('button', { class: 'btn ghost', onclick: close }, ['取消']),
    el('button', { class: 'btn primary', onclick: async () => {
      const titleText = input.value.trim();
      if (!titleText) { input.focus(); return; }
      const extra = dyn._collect ? dyn._collect() : {};
      if (isEdit) {
        const updated = Object.assign({}, t, { title: titleText, type, note: t.note || '' }, extra);
        if (type === 'short') updated.date = t.date || todayStr();
        if (type === 'recurring') { updated.startDate = t.startDate || todayStr(); }
        await store.updateTask(updated);
      } else {
        if (type === 'short') await store.addTask({ type: 'short', title: titleText, date: todayStr() });
        else if (type === 'recurring') await store.addTask(Object.assign({ type: 'recurring', title: titleText, startDate: todayStr() }, extra));
        else if (type === 'dated') await store.addTask(Object.assign({ type: 'dated', title: titleText }, extra));
      }
      close();
      onSaved && onSaved();
    } }, [isEdit ? '保存' : '记下'])
  ]);

  modal.appendChild(title);
  modal.appendChild(input);
  modal.appendChild(tabs);
  modal.appendChild(dyn);
  modal.appendChild(actions);
  // 仅在编辑已有任务时提供删除入口；独立成行并与「取消/保存」拉开距离，避免误触
  if (isEdit) {
    modal.appendChild(el('div', { class: 'qa-del-row' }, [
      el('button', { class: 'btn danger block', onclick: async () => {
        if (!confirm('删除这条任务？')) return;
        await store.deleteTask(t.id);
        close();
        onSaved && onSaved();
      } }, ['删除任务'])
    ]));
  }
  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);
  input.focus();
}
