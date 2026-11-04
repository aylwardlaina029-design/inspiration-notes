// components/settingsDrawer.js - 设置右侧滑出抽屉
import { renderSettings } from '../views/settings.js';

export function openSettingsDrawer() {
  const drawer = document.getElementById('settings-drawer');
  const overlay = document.getElementById('drawer-overlay');
  if (!drawer || !overlay) return;
  renderSettings(document.getElementById('settings-drawer-body'), {
    inDrawer: true,
    refresh: () => openSettingsDrawer()
  });
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  overlay.classList.add('show');
  overlay.hidden = false;
}

export function closeSettingsDrawer() {
  const drawer = document.getElementById('settings-drawer');
  const overlay = document.getElementById('drawer-overlay');
  if (!drawer || !overlay) return;
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  overlay.classList.remove('show');
  overlay.hidden = true;
}

export function initSettingsDrawer() {
  const drawer = document.getElementById('settings-drawer');
  const overlay = document.getElementById('drawer-overlay');
  if (!drawer || !overlay) return;
  drawer.querySelector('.drawer-close').addEventListener('click', closeSettingsDrawer);
  overlay.addEventListener('click', closeSettingsDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSettingsDrawer(); });
  document.getElementById('settings-gear').addEventListener('click', openSettingsDrawer);
}
