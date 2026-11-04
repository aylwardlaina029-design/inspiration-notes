// components/empty.js - 统一空状态（§4.4 三要素）
// 一个自然系小装饰 + 二级色短句 + 三级色行动建议；全应用同一构图，只换文案。
import { el } from '../dom.js';

export function emptyState(decor, title, hint) {
  return el('div', { class: 'empty' }, [
    el('div', { class: 'empty-decor' }, [decor]),
    el('div', { class: 'empty-title' }, [title]),
    hint ? el('div', { class: 'empty-hint' }, [hint]) : null
  ]);
}
