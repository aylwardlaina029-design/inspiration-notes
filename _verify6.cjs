const fs=require('fs');
const {execSync}=require('child_process');
const {JSDOM,VirtualConsole}=require('jsdom');

const html=fs.readFileSync('standalone.html','utf8');

// ---- 1. node --check on extracted inline script ----
const m=html.match(/<script>([\s\S]*?)<\/script>/);
if(!m){console.error('NO SCRIPT BLOCK');process.exit(1);}
fs.writeFileSync('_inline_extract.js', m[1], 'utf8');
try{ execSync('node --check _inline_extract.js', {stdio:'pipe'}); console.log('node --check: OK'); }
catch(e){ console.error('node --check FAILED:\n', e.stdout?.toString()+e.stderr?.toString()); process.exit(1); }

// ---- 2. jsdom behavioral checks ----
const errors=[];
const vc=new VirtualConsole();
vc.on('jsdomError',e=>{const msg=(e.detail&&e.detail.message)||e.message||''; if(!/scrollTo/.test(msg)) errors.push('jsdomError: '+msg);});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:vc});
const {window}=dom;
const doc=window.document;
function click(el){el.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

setTimeout(async ()=>{
  // 播种：今天 = 全部完成(应显示对钩)；本月其余天 = 部分完成(应显示绿圆点)
  const info = await window.eval(`(async () => {
    const t = todayStr();
    const n = new Date();
    const ym = n.getFullYear() + '-' + String(n.getMonth()+1).padStart(2,'0');
    const dim = new Date(n.getFullYear(), n.getMonth()+1, 0).getDate();
    const days = [];
    for (let i=1;i<=dim;i++) days.push(ym + '-' + String(i).padStart(2,'0'));
    for (const d of days) {
      if (d === t) { await store.addTask({type:'short', date:d, title:'今天做完的事', done:true}); }
      else { await store.addTask({type:'short', date:d, title:'事一', done:true}); await store.addTask({type:'short', date:d, title:'事二', done:false}); }
    }
    return { t:t, days:days };
  })()`);

  const navCal=[...doc.querySelectorAll('.nav-btn')].find(b=>b.dataset.view==='calendar');
  click(navCal);
  await sleep(150);

  const ticks=doc.querySelectorAll('.cal-tick');
  const doneDots=doc.querySelectorAll('.dot.done');
  const partialDots=doc.querySelectorAll('.dot.partial');

  console.log('全页面 .dot.done 残留数:', doneDots.length, doneDots.length===0?'OK(已全部换成对钩)':'FAIL');
  console.log('.cal-tick 总数:', ticks.length, '(1 个日期格 + 1 个图例)');
  console.log('部分完成绿圆点数:', partialDots.length, '/ 期望', info.days.length-1, '(含图例1个)');
  console.log('仅日历格内绿圆点数:', doc.querySelectorAll('.cal-grid .dot.partial').length, '/ 期望', info.days.length-1);
  const rootCS=window.getComputedStyle(doc.documentElement);
  console.log('令牌 --primary =', rootCS.getPropertyValue('--primary').trim(), '| --primary-deep =', rootCS.getPropertyValue('--primary-deep').trim());

  const todayCell=doc.querySelector('.cal-cell.today');
  const todayTick=todayCell && todayCell.querySelector('.cal-tick');
  const todayPartial=todayCell && todayCell.querySelector('.dot.partial');
  console.log('今日格（全部完成）→ 对钩:', todayTick?JSON.stringify(todayTick.textContent):'(none)', todayTick?'OK':'FAIL');
  console.log('今日格 → 不应再有绿圆点:', todayPartial?'FAIL':'OK');

  // 其它日期格不应出现对钩
  const otherTicks=[...doc.querySelectorAll('.cal-cell')].filter(c=>!c.classList.contains('today')).filter(c=>c.querySelector('.cal-tick')).length;
  console.log('非今日格误显对钩数:', otherTicks, otherTicks===0?'OK':'FAIL');

  // 图例
  const legendItem=[...doc.querySelectorAll('.cal-legend > span')].find(s=>s.textContent.includes('已完成'));
  const legendTick=legendItem && legendItem.querySelector('.cal-tick');
  console.log('图例「已完成」→ 对钩:', legendTick?JSON.stringify(legendTick.textContent):'(none)', legendTick?'OK':'FAIL');

  // 解析后的颜色 / 字号
  if(todayTick){
    const cs=window.getComputedStyle(todayTick);
    console.log('对钩 color:', cs.color, cs.color==='rgb(47, 101, 67)'?'OK(#2F6543)':'MISMATCH');
    console.log('对钩 font-size:', cs.fontSize, '| line-height:', cs.lineHeight);
  }
  const pd=partialDots[0];
  if(pd){ console.log('「有任务」圆点 color:', window.getComputedStyle(pd).backgroundColor, '(应为 rgb(78, 154, 108))'); }

  console.log('ERRORS:', errors.length?errors:'none');
  console.log('VERIFY DONE');
  process.exit(0);
},950);
