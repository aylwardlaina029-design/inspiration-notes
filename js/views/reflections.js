// views/reflections.js - 灵感
import { el, clear } from '../dom.js';
import * as store from '../store.js';
import { formatCN } from '../dateutil.js';
import { emptyState } from '../components/empty.js';

function openReflectionEditor(onSaved, existing) {
  const overlay = el('div', { class: 'modal-overlay' });
  const modal = el('div', { class: 'modal' });
  const close = () => overlay.remove();
  const dateInput = el('input', { type: 'date', class: 'qa-date', value: existing ? existing.date : new Date().toISOString().slice(0, 10) });
  const titleInput = el('input', { class: 'qa-input', placeholder: '标题（可选）', value: existing ? existing.title : '' });
  const content = el('textarea', { class: 'qa-textarea', placeholder: '写下你的灵感…' }, [existing ? existing.content : '']);

  modal.appendChild(el('h3', { class: 'modal-title' }, [existing ? '编辑灵感' : '写灵感']));
  modal.appendChild(el('div', { class: 'qa-field' }, [el('label', {}, ['日期']), dateInput]));
  modal.appendChild(titleInput);
  modal.appendChild(content);
  modal.appendChild(el('div', { class: 'qa-actions' }, [
    el('button', { class: 'btn ghost', onclick: close }, ['取消']),
    el('button', { class: 'btn primary', onclick: async () => {
      const c = content.value.trim();
      if (!c) { content.focus(); return; }
      if (existing) { await store.updateReflection(Object.assign({}, existing, { date: dateInput.value, title: titleInput.value, content: c })); }
      else { await store.addReflection({ date: dateInput.value, title: titleInput.value, content: c }); }
      close(); onSaved && onSaved();
    } }, [existing ? '保存' : '保存'])
  ]));
  overlay.appendChild(modal);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);
  content.focus();
}

export async function renderReflections(container, ctx) {
  clear(container);
  const refresh = ctx.refresh || (() => {});
  const list = await store.listReflections();

  container.appendChild(el('div', { class: 'date-hero' }, [
    el('div', { class: 'date-hero-main' }, ['灵感记录']),
    el('div', { class: 'date-hero-sub' }, ['记录思考，沉淀复利'])
  ]));
  container.appendChild(el('button', { class: 'btn primary block', onclick: () => openReflectionEditor(refresh) }, ['＋ 写一条灵感']));

  if (!list.length) {
    container.appendChild(emptyState('🌱', '还没有灵感', '把今天的想法记下来吧，哪怕只有一句话'));
    return;
  }
  for (const r of list) {
    const card = el('div', { class: 'card ref-card' }, [
      el('div', { class: 'ref-top' }, [
        el('span', { class: 'ref-date chip blossom' }, [formatCN(r.date)]),
        el('button', { class: 'btn tiny danger', onclick: async () => { if (confirm('删除这条灵感？')) { await store.deleteReflection(r.id); refresh(); } } }, ['删除'])
      ]),
      r.title ? el('div', { class: 'ref-title' }, [r.title]) : null,
      el('div', { class: 'ref-content' }, [r.content])
    ]);
    card.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') return; openReflectionEditor(refresh, r); });
    container.appendChild(card);
  }
}
