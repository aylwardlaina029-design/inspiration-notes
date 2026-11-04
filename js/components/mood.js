// components/mood.js - 每日心情选择器（emoji + 绿系容器，按视觉设计方案 v1.0）
import { el } from '../dom.js';
import * as store from '../store.js';

const LABELS = ['很差', '不佳', '一般', '不错', '很好'];
// 索引 = 评分-1：很差 / 不佳 / 一般 / 不错 / 很好
const EMOJIS = ['😣', '🙁', '😐', '🙂', '😄'];

export function moodEmoji(score) {
  const i = Number(score) - 1;
  return (i >= 0 && i < EMOJIS.length) ? EMOJIS[i] : '';
}
export function moodLabel(score) {
  const i = Number(score) - 1;
  return (i >= 0 && i < LABELS.length) ? LABELS[i] : '';
}

export async function renderMood(container, dateStr, onChange) {
  container.innerHTML = '';
  const mood = await store.getMood(dateStr);
  const wrap = el('div', { class: 'mood' });
  wrap.appendChild(el('div', { class: 'mood-title' }, ['今日心情']));
  const row = el('div', { class: 'mood-row' });
  // 从左到右展示：很好(5) → 不错(4) → 一般(3) → 不佳(2) → 很差(1)
  for (let i = EMOJIS.length - 1; i >= 0; i--) {
    const active = mood && mood.score === i + 1;
    const btn = el('button', {
      class: 'mood-btn' + (active ? ' active' : ''),
      title: LABELS[i], 'aria-label': LABELS[i],
      onclick: async () => { await store.setMood(dateStr, i + 1); await renderMood(container, dateStr, onChange); onChange && onChange(); }
    });
    btn.textContent = EMOJIS[i];
    row.appendChild(btn);
  }
  wrap.appendChild(row);
  const note = el('input', {
    class: 'mood-note-input', placeholder: '写点心情备注（可选）', value: mood ? mood.note : ''
  });
  note.addEventListener('change', async () => { await store.setMood(dateStr, mood ? mood.score : 0, note.value); });
  wrap.appendChild(note);
  container.appendChild(wrap);
}

export { LABELS };
