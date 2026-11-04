// _verify11.cjs — 校验空状态三级提示文案（去掉方位）与三级文字色
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync('standalone.html', 'utf8');
const vc = new VirtualConsole();
const errors = [];
vc.on('jsdomError', e => { if (!/scrollTo/i.test(e.message)) errors.push(e.message); });
vc.on('error', (...a) => { const m = a.join(' '); if (!/scrollTo/i.test(m)) errors.push(m); });

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc });
const { window } = dom;
const doc = window.document;
const tick = ms => new Promise(r => setTimeout(r, ms));
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const checks = [];
const ck = (name, ok) => checks.push([name, !!ok]);

(async () => {
  await tick(900);

  // 令牌展开：jsdom 不解析 var()
  const tokens = {};
  for (const ss of doc.styleSheets) {
    let rules; try { rules = ss.cssRules; } catch { continue; }
    for (const r of rules) {
      if (r.selectorText === ':root') {
        for (const p of r.style) {
          const v = r.style.getPropertyValue(p);
          if (v) tokens[p.trim()] = v.trim();
        }
      }
    }
  }
  const faint = (tokens['--faint'] || '').toUpperCase();
  ck('三级文字令牌 --faint = #9AA79D', faint === '#9AA79D');

  const rule = sel => {
    const out = [];
    for (const ss of doc.styleSheets) {
      let rules; try { rules = ss.cssRules; } catch { continue; }
      for (const r of rules) {
        if (r.selectorText && r.selectorText.split(',').map(s => s.trim()).includes(sel)) out.push(r.style.cssText);
      }
    }
    return out.join(' | ');
  };
  ck('.empty-hint 使用三级文字色 var(--faint)', /color:\s*var\(--faint\)/.test(rule('.empty-hint')));

  // ---- 今日页空状态 ----
  await Promise.resolve(window.eval("navigate('today')"));
  await tick(500);
  const todayHint = doc.querySelector('.empty-hint');
  ck('今日页三级提示文案 = 记下一条试试', todayHint && todayHint.textContent.trim() === '记下一条试试');
  ck('今日页提示不含方位词', !/右下角|左下角|右下|左下/.test(doc.body.textContent));

  // ---- 日历详情弹层空状态 ----
  await Promise.resolve(window.eval("navigate('calendar')"));
  await tick(600);
  const cells = [...doc.querySelectorAll('.cal-cell')];
  ck('日历格子已渲染', cells.length > 0);
  const todayCell = cells.find(c => c.classList.contains('today')) || cells[0];
  click(todayCell);
  await tick(600);
  const sheet = [...doc.querySelectorAll('.modal-overlay .modal')].pop();
  ck('日历详情弹层已打开', !!sheet);
  const sheetHint = sheet && sheet.querySelector('.empty-hint');
  ck('弹层三级提示文案 = 添加一条试试', sheetHint && sheetHint.textContent.trim() === '添加一条试试');
  ck('弹层内无残留方位文案', sheet && !/右下角|左下角/.test(sheet.textContent));
  ck('弹层二级短句 = 这一天没有计划', sheet && /这一天没有计划/.test(sheet.textContent));
  ck('弹层仍有装饰 🍃', sheet && !!sheet.querySelector('.empty-decor'));

  console.log('\n=== 校验结果 ===');
  checks.forEach(([n, ok]) => console.log((ok ? 'PASS  ' : 'FAIL  ') + n));
  const failed = checks.filter(c => !c[1]).length;
  console.log(`\n${checks.length - failed}/${checks.length} 通过`);
  console.log('运行期错误:', errors.length, errors.slice(0, 3).join(' | '));
  process.exit(failed || errors.length ? 1 : 0);
})();
