// store.js - 高层数据读写
import { openDB, getAll, get, put, del, clearStore, bulkPut, uid } from './db.js';
import { todayStr, addDays } from './dateutil.js';
import { appliesOn } from './recurring.js';

export async function listTasks() { return (await getAll('tasks')) || []; }
export async function addTask(partial) {
  const task = Object.assign({ id: uid(), createdAt: new Date().toISOString(), order: Date.now() }, partial);
  await put('tasks', task);
  return task;
}
export async function updateTask(task) { await put('tasks', task); return task; }
export async function deleteTask(id) {
  await del('tasks', id);
  const comps = await listCompletionsForTask(id);
  for (const c of comps) await del('completions', c.id);
}
export async function toggleTaskDone(task) {
  task.done = !task.done;
  task.doneAt = task.done ? new Date().toISOString() : null;
  await put('tasks', task);
  return task;
}

// ---- 完成记录（循环任务按 任务×日期）----
export async function getCompletion(taskId, dateStr) { return get('completions', `${taskId}__${dateStr}`); }
export async function setCompletion(taskId, dateStr, done) {
  const id = `${taskId}__${dateStr}`;
  const rec = (await get('completions', id)) || { id, taskId, date: dateStr };
  rec.done = done;
  rec.doneAt = done ? new Date().toISOString() : null;
  await put('completions', rec);
  return rec;
}
export async function listCompletionsForTask(taskId) { return (await getAll('completions')).filter(c => c.taskId === taskId); }
export async function allCompletions() { return (await getAll('completions')) || []; }

// ---- 心情 ----
export async function listMoods() { return (await getAll('moods')) || []; }
export async function getMood(dateStr) { return get('moods', `m_${dateStr}`); }
export async function setMood(dateStr, score, note) {
  const rec = { id: `m_${dateStr}`, date: dateStr, score: score || 0, note: note || '' };
  await put('moods', rec);
  return rec;
}

// ---- 灵感 ----
export async function listReflections() {
  const all = await getAll('reflections') || [];
  return all.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
}
export async function addReflection(partial) {
  const ref = Object.assign({ id: uid(), createdAt: new Date().toISOString() }, partial);
  await put('reflections', ref);
  return ref;
}
export async function updateReflection(ref) { await put('reflections', ref); return ref; }
export async function deleteReflection(id) { await del('reflections', id); }

// ---- 连续完成天数（streak）----
export async function streak(task) {
  let count = 0;
  let d = todayStr();
  for (let i = 0; i < 400; i++) {
    if (!appliesOn(task, d)) { d = addDays(d, -1); continue; }
    const c = await getCompletion(task.id, d);
    if (c && c.done) { count++; d = addDays(d, -1); } else break;
  }
  return count;
}

// ---- 导出 / 导入 ----
export async function exportData() {
  const [tasks, completions, moods, reflections] = await Promise.all([
    getAll('tasks'), getAll('completions'), getAll('moods'), getAll('reflections')
  ]);
  return { app: 'inspire-log', version: 1, exportedAt: new Date().toISOString(), tasks, completions, moods, reflections };
}
export async function importData(data) {
  if (!data || !data.tasks) throw new Error('无效的备份文件');
  await Promise.all([clearStore('tasks'), clearStore('completions'), clearStore('moods'), clearStore('reflections')]);
  await bulkPut('tasks', data.tasks);
  if (data.completions) await bulkPut('completions', data.completions);
  if (data.moods) await bulkPut('moods', data.moods);
  if (data.reflections) await bulkPut('reflections', data.reflections);
}
export async function wipeAll() {
  await Promise.all([clearStore('tasks'), clearStore('completions'), clearStore('moods'), clearStore('reflections')]);
}
