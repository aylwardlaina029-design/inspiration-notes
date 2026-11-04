// _verify10.cjs —— 验证「按视觉设计方案对齐」的 14 项决策全部落地
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync('standalone.html', 'utf8');
const vc = new VirtualConsole();
const errors = [];
vc.on('jsdomError', e => { if (!/scrollTo/i.test(e.message)) errors.push(e.message); });
vc.on('error', (...a) => errors.push(a.join(' ')));

const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc
});
const { window } = dom, doc = window.document;
const tick = (ms) => new Promise(r => setTimeout(r, ms));

// jsdom 无 Notification API，补一个以便渲染到期提醒横幅
Object.defineProperty(window, 'Notification', {
  configurable: true,
  value: { permission: 'default', requestPermission: async () => 'default' }
});

const checks = [];
const ck = (name, cond) => checks.push([name, !!cond]);

(async () => {
  await tick(900);

  const styleText = doc.querySelector('style').textContent;
  const root = window.getComputedStyle(doc.documentElement);
  const tok = (v) => root.getPropertyValue(v).trim();

  // ---------- 令牌 ----------
  ck('令牌 --primary-d = #3F8759', tok('--primary-d') === '#3F8759');
  ck('令牌 --green-100 = #DCEBE1', tok('--green-100') === '#DCEBE1');
  ck('令牌 --green-50 = #EFF6F1', tok('--green-50') === '#EFF6F1');
  ck('令牌 --blossom-100 = #FAECEC', tok('--blossom-100') === '#FAECEC');
  ck('令牌 --sky-d = #3E7DA8', tok('--sky-d') === '#3E7DA8');
  ck('令牌 --r-card = 18px', tok('--r-card') === '18px');
  ck('令牌 --r-btn = 14px', tok('--r-btn') === '14px');
  ck('令牌 --r-input = 13px', tok('--r-input') === '13px');
  ck('令牌 --r-pill = 999px', tok('--r-pill') === '999px');
  ck('令牌 --shadow-btn 用 rgba(63,135,89,.28)', tok('--shadow-btn') === '0 4px 12px rgba(63,135,89,.28)');

  // ---------- 圆角统一四档 ----------
  const rule = (sel) => {
    const out = [];
    for (const ss of doc.styleSheets) {
      let rules; try { rules = ss.cssRules; } catch { continue; }
      for (const r of rules) {
        if (r.selectorText && r.selectorText.split(',').map(s => s.trim()).includes(sel)) {
          out.push(r.style.cssText);
        }
      }
    }
    return out.join(' | ');
  };
  // 把 var(--x) 解析成实际令牌值（jsdom 不解析 var()，需自行展开后再比对）
  const resolve = (cssText) => (cssText || '').replace(/var\(--([a-z0-9-]+)\)/gi,
    (_, name) => (tok('--' + name) || 'VAR(' + name + ')'));
  // jsdom 会把 rgba() 序列化成 rgb(a, b, c, d)，两种写法都接受
  const hasColor = (cssText, rgbStr, rgbaStr) => {
    const t = resolve(cssText);
    return t.includes(rgbStr) || t.includes(rgbaStr);
  };
  ck('.card 圆角 18px', /border-radius:\s*18px/.test(resolve(rule('.card'))));
  ck('.btn 圆角 14px', /border-radius:\s*14px/.test(resolve(rule('.btn'))));
  ck('.btn.tiny 高 34 / 圆角 11 / 字号 12.5', /min-height:\s*34px/.test(resolve(rule('.btn.tiny'))) && /border-radius:\s*11px/.test(resolve(rule('.btn.tiny'))) && /font-size:\s*12\.5px/.test(resolve(rule('.btn.tiny'))));
  ck('.chip 圆角 999', /border-radius:\s*999px/.test(resolve(rule('.chip'))));

  // ---------- 按钮五档 ----------
  ck('主要按钮 = Green 600 (#3F8759)', /background:\s*var\(--primary-d\)/.test(rule('.btn.primary')));
  ck('次要按钮 = Green 100 / Green 700', /background:\s*var\(--green-100\)/.test(rule('.btn.secondary')) && /color:\s*var\(--primary-deep\)/.test(rule('.btn.secondary')));
  ck('描边按钮 = 白底 / 二级字 / 分割线边', /background:\s*var\(--surface\)/.test(rule('.btn.outline')) && /border:\s*1px solid var\(--line\)/.test(rule('.btn.outline')));
  ck('危险按钮 = 浅砖红底 / 砖红字', /background:\s*var\(--danger-bg\)/.test(rule('.btn.danger')));
  ck('幽灵按钮 = 透明 / Green 700', /background:\s*transparent/.test(rule('.btn.ghost')) && /color:\s*var\(--primary-deep\)/.test(rule('.btn.ghost')));
  ck('信息按钮 = 天空蓝系', /background:\s*var\(--sky-100\)/.test(rule('.btn.info')));

  // ---------- 保持现状的三项 ----------
  ck('[保持] 输入框仍有 1px 边框且未改聚焦色', /border:\s*1px solid var\(--line\)/.test(rule('.qa-input')) && /border-color:\s*var\(--primary\)/.test(rule('.qa-input:focus')));
  ck('[保持] 弹层遮罩仍为 rgba(46,55,68,.42)', hasColor(rule('.modal-overlay'), 'rgba(46, 55, 68, 0.42)', 'rgba(46,55,68,.42)'));
  ck('[保持] 日历格圆角仍 12px', /border-radius:\s*12px/.test(rule('.cal-cell')));
  ck('[保持] 日历今日格仍用主色描边', /outline:\s*1\.5px solid var\(--primary\)/.test(rule('.cal-cell.today')));
  ck('[保持] 日历日期数字仍为深墨色', /color:\s*var\(--ink\)/.test(rule('.cal-num')));
  ck('[保持] 星期行仍为二级色', /color:\s*var\(--muted\)/.test(rule('.cal-weekday')));
  ck('[保持] 心情 chip 仍 scale(1.06) 且带边框', /transform:\s*scale\(1\.06\)/.test(rule('.mood-btn.active')) && /border:\s*1px solid var\(--line\)/.test(rule('.mood-btn')));

  // ---------- 文字色层级 ----------
  ck('页头副标题改为三级色', /color:\s*var\(--faint\)/.test(rule('.app-header p')));
  ck('「今日心情」标签 = Green 700 加粗', /color:\s*var\(--primary-deep\)/.test(rule('.mood-title')) && /font-weight:\s*600/.test(rule('.mood-title')));
  ck('计数用 .card-count (Green 700)', /color:\s*var\(--primary-deep\)/.test(rule('.card-count')));
  ck('字号阶梯：h1 20px', /font-size:\s*20px/.test(rule('.app-header h1')));
  ck('字号阶梯：card-title 15px', /font-size:\s*15px/.test(rule('.card-title')));
  ck('字号阶梯：底栏小字 12px', /font-size:\s*12px/.test(rule('.nav-btn')));

  // ---------- 空状态三要素 ----------
  ck('.empty 是浅绿底圆角容器', /background:\s*#F2F7F3/i.test(resolve(rule('.empty'))) && /border-radius:\s*18px/.test(resolve(rule('.empty'))));
  ck('.empty-title 二级色 / .empty-hint 三级色', /color:\s*var\(--muted\)/.test(rule('.empty-title')) && /color:\s*var\(--faint\)/.test(rule('.empty-hint')));
  const emptyToday = doc.querySelector('.empty');
  ck('今日页空状态含 装饰+短句+建议 三层', !!emptyToday && !!emptyToday.querySelector('.empty-decor') && !!emptyToday.querySelector('.empty-title') && !!emptyToday.querySelector('.empty-hint'));
  ck('今日页空状态文案 = 🌿 / 暂无待办 / 点右下角 ＋ 记下一条', !!emptyToday && emptyToday.querySelector('.empty-decor').textContent === '🌿' && emptyToday.querySelector('.empty-title').textContent === '暂无待办' && emptyToday.querySelector('.empty-hint').textContent.includes('记下一条'));

  // ---------- 计数 span ----------
  const cardCount = doc.querySelector('.card-count');
  ck('今日待办计数用 .card-count 包裹', !!cardCount && cardCount.textContent === '(0/0)');

  // ---------- 加号按钮（折中方案）----------
  const addBtn = doc.querySelector('.nav-btn.add-btn');
  const addSpan = addBtn.querySelector('span:first-child');
  const addCss = rule('.nav-btn.add-btn span:first-child');
  ck('加号方形 44×44', /width:\s*44px/.test(addCss) && /height:\s*44px/.test(addCss));
  ck('加号改为圆角方形 r15', /border-radius:\s*15px/.test(addCss));
  ck('加号光学补偿 margin-top:-8px', /margin-top:\s*-8px/.test(addCss));
  ck('加号静止态不上抬', /transform:\s*translateY\(0\)/.test(addCss));
  ck('加号点按态 translateY(-7px) scale(1.05)', /translateY\(-7px\) scale\(1\.05\)/.test(rule('.nav-btn.add-btn:active span:first-child')));
  ck('加号内嵌图标 20px', /width:\s*20px/.test(rule('.nav-btn.add-btn span:first-child svg')));

  // ---------- 底栏与菜单按钮 ----------
  ck('底栏未选中 = 三级色', /color:\s*var\(--faint\)/.test(rule('.nav-btn')));
  ck('底栏选中 = Green 700 + 小字加粗', /color:\s*var\(--primary-deep\)/.test(rule('.nav-btn.active')) && /font-weight:\s*600/.test(rule('.nav-btn.active')));
  ck('菜单按钮 = 浅绿底 + Green 600 图标', /background:\s*var\(--green-50\)/.test(rule('.header-gear')) && /color:\s*var\(--primary-d\)/.test(rule('.header-gear')));

  // ---------- 图标（§2.1 五个重做）----------
  const navSvgs = [...doc.querySelectorAll('.bottom-nav svg')];
  ck('底栏 3 个图标线宽均为 1.8', navSvgs.length === 3 && navSvgs.every(s => s.getAttribute('stroke-width') === '1.8'));
  const gearSvg = doc.querySelector('#settings-gear svg');
  ck('菜单图标线宽 1.8', gearSvg.querySelector('path').getAttribute('stroke-width') === '1.8');
  const calSvg = navSvgs.find(s => s.outerHTML.includes('rect'));
  ck('日历图标：内部为微笑曲线（无实心圆点）', calSvg && calSvg.outerHTML.includes('M9.3 15.2') && !calSvg.outerHTML.includes('<circle'));
  const refSvg = navSvgs.find(s => s.outerHTML.includes('M12 14c0-3-2.5-4-4.5-4C7.5 6.5 9.5 4 12 4s4.5 2.5 4.5 6c-2 0-4.5 1-4.5 4z'));
  ck('灵感图标 = 设计稿原始几何（灯泡 + 嫩芽茎 + 灯座）', refSvg
    && refSvg.outerHTML.includes('M12 21v-7')
    && refSvg.outerHTML.includes('M9 21h6')
    && refSvg.querySelectorAll('path').length === 3);
  ck('灵感图标已无旧的自制双叶几何', !doc.body.innerHTML.includes('M12 11.6c-1.6 0-2.7-1'));
  ck('灵感图标与 index.html 源文件一致', (function () {
    const fsx = require('fs');
    const src = fsx.readFileSync('index.html', 'utf8');
    const i = src.indexOf('data-view="reflections"');
    const st = src.indexOf('<svg', i), en = src.indexOf('</svg>', i);
    const d = (src.slice(st, en).match(/\sd="([^"]+)"/g) || []).map(x => x.slice(4, -1));
    const m = doc.querySelector('.nav-btn[data-view="reflections"] svg');
    const dm = m ? [...m.querySelectorAll('path')].map(p => p.getAttribute('d')) : [];
    return d.length === dm.length && d.every((x, k) => x === dm[k]);
  })());
  const quillSvg = navSvgs.find(s => s.outerHTML.includes('M5 19c-.3-4.4'));
  ck('快速记录图标 = 羽毛笔 + 叶片（3 条 path）', quillSvg && quillSvg.querySelectorAll('path').length === 3);

  // ---------- 灵感页 ----------
  const evalIn = (expr) => window.eval(expr);
  await Promise.resolve(evalIn(`(async()=>{ await store.addReflection({date: todayStr(), title:'测试灵感', content:'内容'}); })()`));
  await Promise.resolve(evalIn(`(async()=>{ await navigate('reflections'); })()`));
  await tick(400);
  const refCard = doc.querySelector('.ref-card');
  ck('灵感条目左侧 3px 花粉粉竖线', /border-left:\s*3px solid var\(--blossom\)/.test(rule('.ref-card')));
  const chip = refCard && refCard.querySelector('.chip.blossom');
  ck('灵感日期 = 浅粉胶囊标签', !!chip && /background:\s*#FAECEC/i.test(resolve(rule('.chip.blossom'))) && /border-radius:\s*999px/.test(resolve(rule('.chip'))));
  ck('灵感 CTA 文案 = ＋ 写一条灵感', [...doc.querySelectorAll('.btn.primary')].some(b => b.textContent.includes('写一条灵感')));
  // 清理
  await Promise.resolve(evalIn(`(async()=>{ const l=await store.listReflections(); for(const r of l) await store.deleteReflection(r.id); })()`));

  // ---------- 设置抽屉 ----------
  await Promise.resolve(evalIn(`(async()=>{ await navigate('today'); })()`));
  await tick(200);
  await Promise.resolve(evalIn(`(async()=>{ openSettingsDrawer(); })()`));
  await tick(400);
  const dz = doc.querySelector('.danger-zone');
  ck('危险区卡片带极浅砖红描边', !!dz && /border-color:\s*var\(--danger-line\)/.test(rule('.danger-zone')));
  ck('「授权/重试」改天空蓝系信息按钮', [...doc.querySelectorAll('#settings-drawer-body .btn')].some(b => b.textContent.includes('授权/重试') && b.classList.contains('info')));
  ck('「导入 JSON」改次要按钮', [...doc.querySelectorAll('#settings-drawer-body .btn')].some(b => b.textContent.includes('导入 JSON') && b.classList.contains('secondary')));
  ck('「导出 JSON」带向上箭头+托盘图标', [...doc.querySelectorAll('#settings-drawer-body .btn svg')].some(s => s.outerHTML.includes('M12 15.2V4.4')));

  // ---------- 页面切换动效 ----------
  const view = doc.getElementById('view');
  ck('页面切换有淡入上移动效', view.classList.contains('view-enter') && /@keyframes viewIn\{from\{opacity:0; transform:translateY\(4px\)/.test(styleText));

  // ---------- 提醒横幅叶形图标 ----------
  await Promise.resolve(evalIn(`(async()=>{ await store.addTask({type:'dated', title:'到期任务', targetDate: todayStr()}); await navigate('today'); })()`));
  await tick(400);
  const banner = doc.querySelector('.reminder-banner');
  ck('到期提醒横幅用叶形图标（替掉 ⏰）', !!banner && !!banner.querySelector('.reminder-ico svg') && !banner.textContent.includes('⏰'));
  ck('横幅图标为 18px', /width:\s*18px/.test(rule('.reminder-ico svg')));
  await Promise.resolve(evalIn(`(async()=>{ const l=await store.listTasks(); for(const t of l) await store.deleteTask(t.id); })()`));

  // ---------- 过渡时长统一 150–200ms ----------
  ck('抽屉过渡 200ms', /transition:\s*transform \.2s/.test(rule('.drawer')));
  ck('弹层动画 180ms', /animation:\s*slideUp \.18s/.test(rule('.modal')));

  // ---------- 输出 ----------
  let pass = 0, fail = 0;
  for (const [name, ok] of checks) {
    console.log((ok ? '  PASS  ' : '  FAIL  ') + name);
    ok ? pass++ : fail++;
  }
  console.log('\n' + pass + '/' + checks.length + ' 通过, 失败 ' + fail);
  console.log('运行期错误: ' + (errors.length ? errors.join(' | ') : '无'));
  process.exit(fail || errors.length ? 1 : 0);
})();
