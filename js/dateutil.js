// dateutil.js - 本地日期工具。所有日期以 'YYYY-MM-DD' 字符串表示（本地时区）
export function pad(n) { return String(n).padStart(2, '0'); }

export function format(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parse(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayStr() { return format(new Date()); }

export function addDays(str, n) {
  const d = parse(str);
  d.setDate(d.getDate() + n);
  return format(d);
}

export function weekday(str) { return parse(str).getDay(); } // 0=周日..6=周六

export function isWorkday(str) {
  const w = weekday(str);
  return w >= 1 && w <= 5;
}

export function weekdayName(str) {
  const names = ['日', '一', '二', '三', '四', '五', '六'];
  return '周' + names[weekday(str)];
}

export function formatCN(str) {
  const d = parse(str);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdayName(str)}`;
}

// 生成某月的 6x7 网格（42 个 'YYYY-MM-DD'，含前后补位）
export function monthMatrix(year, month) {
  const first = new Date(year, month - 1, 1);
  const startW = first.getDay();
  const start = new Date(year, month - 1, 1 - startW);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(format(d));
  }
  return cells;
}
