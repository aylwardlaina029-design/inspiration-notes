// reminder.js - 定时任务到期提醒（本地优先 PWA 方案）
// 说明：本地优先应用无法在完全关闭后做后台推送。提醒在「应用打开当天」触发：
// 到期或逾期的定时任务会弹出系统通知（若已授权），并始终在「今日」顶部以横幅呈现。
import * as store from './store.js';
import { todayStr, formatCN } from './dateutil.js';

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}
export function notificationPermission() {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try { return await Notification.requestPermission(); } catch { return 'denied'; }
}

// 今天到期或已逾期的未完成任务（仅定时/某日任务）
export async function dueDatedTasks() {
  const today = todayStr();
  const tasks = await store.listTasks();
  return tasks
    .filter(t => t.type === 'dated' && t.targetDate && t.targetDate <= today && !t.done)
    .sort((a, b) => (a.targetDate || '').localeCompare(b.targetDate || ''));
}

export async function showNotification(title, body, tag) {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body, tag,
          icon: './assets/icons/icon-192.png',
          badge: './assets/icons/icon-192.png'
        });
        return;
      }
    }
    if (notificationsSupported() && Notification.permission === 'granted') {
      new Notification(title, { body, tag, icon: './assets/icons/icon-192.png' });
    }
  } catch { /* 通知不可用时静默忽略 */ }
}

// 触发到期通知；同一任务同一天每个会话只提醒一次（避免反复打扰）
export async function fireDueNotifications() {
  if (!notificationsSupported() || Notification.permission !== 'granted') return [];
  const today = todayStr();
  const due = await dueDatedTasks();
  for (const t of due) {
    const key = 'remind_' + t.id + '_' + t.targetDate;
    if (sessionStorage.getItem(key)) continue;
    sessionStorage.setItem(key, '1');
    const when = t.targetDate < today ? '（已逾期）' : '（今天到期）';
    await showNotification('⏰ 任务到期提醒', t.title + when, 'due_' + t.id);
  }
  return due;
}

// 提醒引擎：应用打开时、周期性、标签页重新可见时检查
export function startReminderEngine() {
  fireDueNotifications();
  const interval = setInterval(() => fireDueNotifications(), 60 * 1000);
  const onVisible = () => { if (document.visibilityState === 'visible') fireDueNotifications(); };
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
