// recurring.js - 循环任务规则计算
import { weekday, isWorkday } from './dateutil.js';

// task.pattern: 'daily' | 'workday' | 'custom'
// task.customDays: getDay 值数组 (0=周日..6=周六)
// task.startDate / task.endDate: 'YYYY-MM-DD' 可选边界
export function appliesOn(task, dateStr) {
  if (task.type !== 'recurring') return false;
  if (task.startDate && dateStr < task.startDate) return false;
  if (task.endDate && dateStr > task.endDate) return false;
  if (task.pattern === 'daily') return true;
  if (task.pattern === 'workday') return isWorkday(dateStr);
  if (task.pattern === 'custom') {
    return Array.isArray(task.customDays) && task.customDays.includes(weekday(dateStr));
  }
  return false;
}

export const PATTERN_LABEL = { daily: '每日', workday: '工作日', custom: '自定义' };

// 把 customDays(0=周日..6=周六) 转成中文标签
export function customDaysLabel(days) {
  const names = ['日', '一', '二', '三', '四', '五', '六'];
  if (!Array.isArray(days) || !days.length) return '';
  return '每周' + days.slice().sort().map(d => names[d]).join('、');
}
