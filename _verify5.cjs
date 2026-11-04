const fs=require('fs');
const {execSync}=require('child_process');
const {JSDOM,VirtualConsole}=require('jsdom');

// ---- 1. node --check on extracted inline script ----
const html=fs.readFileSync('standalone.html','utf8');
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
  // green theme token
  const primary=window.getComputedStyle(doc.documentElement).getPropertyValue('--primary').trim();
  console.log('CSS --primary =', primary, primary==='#4E9A6C'?'OK':'MISMATCH');

  const btns=[...doc.querySelectorAll('.mood-btn')];
  const labels=btns.map(b=>b.getAttribute('aria-label'));
  console.log('心情按钮左→右标签:', labels.join(' | '));
  console.log('  顺序正确(很好|不错|一般|不佳|很差):', labels.join('|')==='很好|不错|一般|不佳|很差'?'OK':'FAIL');
  const emojis=btns.map(b=>b.textContent);
  console.log('心情按钮左→右emoji:', emojis.join(' '));

  // 选中“很好”(最左) -> 应写入 score=5
  click(btns[0]);
  await sleep(60);
  const act=doc.querySelector('.mood-btn.active');
  console.log('点最左后 active 标签:', act?act.getAttribute('aria-label'):'(none)');

  // 进入日历
  const navCal=[...doc.querySelectorAll('.nav-btn')].find(b=>b.dataset.view==='calendar');
  click(navCal);
  await sleep(90);

  // 今日格子里应有琥珀色心情圆点
  const todayCell=doc.querySelector('.cal-cell.today');
  const moodDot=todayCell && todayCell.querySelector('.cal-dots .dot.mood');
  console.log('日历今日格 琥珀心情点:', moodDot?'OK(amber)':'MISSING');

  // 打开今日详情 -> 应有 emoji + 标签
  if(todayCell){ click(todayCell); await sleep(60); }
  const dEmoji=doc.querySelector('.mood-emoji');
  const dLabel=doc.querySelector('.mood-detail-label');
  console.log('详情 emoji:', dEmoji?dEmoji.textContent:'(none)', '| 标签:', dLabel?dLabel.textContent:'(none)');

  console.log('ERRORS:', errors.length?errors:'none');
  console.log('VERIFY DONE');
},950);
