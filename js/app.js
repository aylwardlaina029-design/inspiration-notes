// app.js - 入口：路由、导航、FAB、Service Worker 注册
import { renderToday } from './views/today.js';
import { renderCalendar } from './views/calendar.js';
import { renderReflections } from './views/reflections.js';
import { openQuickAdd } from './components/quickadd.js';
import { initSettingsDrawer } from './components/settingsDrawer.js';
import { startReminderEngine } from './reminder.js';

const VIEWS = {
  today: renderToday,
  calendar: renderCalendar,
  reflections: renderReflections
};
let current = 'today';

export async function navigate(name) {
  current = name;
  document.querySelectorAll('.nav-btn').forEach(b => {
    const v = b.dataset.view || (b.dataset.action === 'add' ? 'today' : null);
    b.classList.toggle('active', v === name);
  });
  const view = document.getElementById('view');
  view.innerHTML = '<div class="loading">加载中…</div>';
  await VIEWS[name](view, { refresh: () => navigate(current) });
  window.scrollTo(0, 0);
  // 页面切换动效：淡入上移 4px（先移除再强制回流，保证连续切换时动画能重新触发）
  view.classList.remove('view-enter');
  void view.offsetWidth;
  view.classList.add('view-enter');
}

export function initApp() {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.action === 'add') { navigate('today'); openQuickAdd(() => navigate(current)); }
    else navigate(btn.dataset.view);
  }));
  document.getElementById('app-title').addEventListener('click', () => navigate('today'));
  initSettingsDrawer();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  navigate('today');
  startReminderEngine();
}

initApp();
