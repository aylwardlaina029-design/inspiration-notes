const fs=require('fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync('standalone.html','utf8');
const errors=[];
const vc=new VirtualConsole();
vc.on('jsdomError',e=>{const m=(e.detail&&e.detail.message)||e.message||''; if(!/scrollTo/.test(m)) errors.push('jsdomError: '+m);});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:vc});
const {window}=dom;
function click(el){el.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));}
setTimeout(async ()=>{
  const doc=window.document;
  const btns=[...doc.querySelectorAll('.mood-btn')];
  console.log('按钮从左到右标签:', btns.map(b=>b.getAttribute('aria-label')).join(' | '));
  click(btns[0]);
  await new Promise(r=>setTimeout(r,50));
  console.log('点最左(很好)后 active:', doc.querySelector('.mood-btn.active').getAttribute('aria-label'));
  const navCal=[...doc.querySelectorAll('.nav-btn')].find(b=>b.dataset.view==='calendar');
  click(navCal);
  await new Promise(r=>setTimeout(r,80));
  click(doc.querySelector('.cal-cell.today'));
  await new Promise(r=>setTimeout(r,50));
  const lbl=doc.querySelector('.mood-detail-label');
  console.log('日历今日详情标签:', lbl?lbl.textContent:'(none)');
  console.log('ERRORS:', errors.length?errors:'none');
},900);
