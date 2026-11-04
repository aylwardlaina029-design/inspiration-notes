const fs=require('fs');
const {execSync}=require('child_process');
const {JSDOM,VirtualConsole}=require('jsdom');

const html=fs.readFileSync('standalone.html','utf8');
const m=html.match(/<script>([\s\S]*?)<\/script>/);
fs.writeFileSync('_inline_extract.js', m[1], 'utf8');
try{ execSync('node --check _inline_extract.js', {stdio:'pipe'}); console.log('node --check: OK'); }
catch(e){ console.error('node --check FAILED:\n', e.stdout?.toString()+e.stderr?.toString()); process.exit(1); }

const errors=[];
const vc=new VirtualConsole();
vc.on('jsdomError',e=>{const msg=(e.detail&&e.detail.message)||e.message||''; if(!/scrollTo/.test(msg)) errors.push('jsdomError: '+msg);});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:vc});
const {window}=dom; const doc=window.document;

let confirmAnswer=true; const confirmCalls=[];
window.confirm=(msg)=>{ confirmCalls.push(String(msg)); return confirmAnswer; };

const tick=(ms=80)=>new Promise(r=>setTimeout(r,ms));
// 在页面脚本作用域内求值（store 是顶层 const，window.eval 可访问；返回 thenable 需 Promise.resolve 包一层）
const evalIn=(code)=>Promise.resolve(window.eval(code));

const click=(el)=>el.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
// 取最后一个（最新）弹层，避免拿到残留的旧弹层
const lastModal=()=>{ const ms=[...doc.querySelectorAll('.modal-overlay .modal')]; return ms[ms.length-1]; };
const closeAllModals=()=>{ doc.querySelectorAll('.modal-overlay').forEach(o=>o.remove()); };

(async()=>{
  await tick(900);
  const checks=[];

  const today=new Date();
  const dateStr=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
  const tid='TASK_DEL_'+Date.now();
  const keepId='TASK_KEEP_'+Date.now();
  const calId='TASK_CAL_'+Date.now();

  await evalIn('store.addTask({id:'+JSON.stringify(tid)+',type:"short",title:"待删除的测试任务",date:'+JSON.stringify(dateStr)+',createdAt:new Date().toISOString(),order:Date.now()})');
  await evalIn('navigate("today")');
  await tick(350);

  const before=await evalIn('store.listTasks().then(a=>a.map(t=>t.id))');
  checks.push(['测试任务已写入存储', before.indexOf(tid)!==-1]);

  // ---- 今日视图：任务行有 ✎ 编辑按钮 ----
  const rows=[...doc.querySelectorAll('.task-row')];
  const row=rows.find(r=>r.textContent.indexOf('待删除的测试任务')!==-1);
  checks.push(['今日视图渲染出该任务行', !!row]);

  const editBtn=row && row.querySelector('.task-edit');
  checks.push(['任务行有 ✎ 编辑按钮', !!editBtn]);

  // ---- 点 ✎ 打开编辑弹层 ----
  click(editBtn);
  await tick(350);

  const modal=lastModal();
  checks.push(['编辑弹层已打开', !!modal]);
  const modalTitle=modal && modal.querySelector('.modal-title');
  checks.push(['标题为「编辑任务」', !!modalTitle && modalTitle.textContent==='编辑任务']);

  const delBtn=modal && [...modal.querySelectorAll('button')].find(b=>b.textContent==='删除任务');
  checks.push(['弹层内有「删除任务」按钮', !!delBtn]);
  checks.push(['删除按钮带 danger 样式', !!delBtn && delBtn.className.indexOf('danger')!==-1]);
  checks.push(['删除按钮在独立分隔行 .qa-del-row 内', !!delBtn && !!delBtn.closest('.qa-del-row')]);
  checks.push(['删除行与「保存」按钮不同行（防误触）', (()=>{
    if(!delBtn) return false;
    const saveBtn=[...modal.querySelectorAll('button')].find(b=>b.textContent==='保存');
    return !!saveBtn && saveBtn.closest('.qa-del-row')===null && delBtn.closest('.qa-actions')===null;
  })()]);

  // ---- 新增模式下不应有删除按钮 ----
  closeAllModals();
  click(doc.querySelector('.nav-btn.add-btn'));
  await tick(350);
  const addModal=lastModal();
  const addDel=addModal && [...addModal.querySelectorAll('button')].find(b=>b.textContent==='删除任务');
  checks.push(['新增模式标题为「快速记录」', !!addModal && addModal.querySelector('.modal-title').textContent==='快速记录']);
  checks.push(['新增模式下无「删除任务」按钮', !addDel]);
  const cancelBtn=addModal && [...addModal.querySelectorAll('button')].find(b=>b.textContent==='取消');
  if(cancelBtn) click(cancelBtn);
  await tick(250);
  closeAllModals();

  // ---- 真正执行删除 ----
  const row2=[...doc.querySelectorAll('.task-row')].find(r=>r.textContent.indexOf('待删除的测试任务')!==-1);
  click(row2.querySelector('.task-edit'));
  await tick(350);
  const delBtn2=[...doc.querySelectorAll('.modal-overlay .modal button')].find(b=>b.textContent==='删除任务');
  click(delBtn2);
  await tick(450);

  const after=await evalIn('store.listTasks().then(a=>a.map(t=>t.id))');
  checks.push(['confirm 被调用且文案正确', confirmCalls.length>0 && confirmCalls[confirmCalls.length-1].indexOf('删除这条任务')!==-1]);
  checks.push(['任务已从存储中删除', after.indexOf(tid)===-1]);

  await evalIn('navigate("today")');
  await tick(350);
  const stillThere=[...doc.querySelectorAll('.task-row')].some(r=>r.textContent.indexOf('待删除的测试任务')!==-1);
  checks.push(['界面刷新后不再显示该任务', !stillThere]);

  // ---- 取消确认时不得删除 ----
  confirmAnswer=false;
  await evalIn('store.addTask({id:'+JSON.stringify(keepId)+',type:"short",title:"应保留的任务",date:'+JSON.stringify(dateStr)+',createdAt:new Date().toISOString(),order:Date.now()})');
  await evalIn('navigate("today")');
  await tick(350);
  const row3=[...doc.querySelectorAll('.task-row')].find(r=>r.textContent.indexOf('应保留的任务')!==-1);
  click(row3.querySelector('.task-edit'));
  await tick(350);
  const del3=[...doc.querySelectorAll('.modal-overlay .modal button')].find(b=>b.textContent==='删除任务');
  click(del3);
  await tick(450);
  const after2=await evalIn('store.listTasks().then(a=>a.map(t=>t.id))');
  checks.push(['取消确认后任务保留', after2.indexOf(keepId)!==-1]);
  checks.push(['取消时弹层保持打开', !!lastModal()]);
  closeAllModals();

  // ---- 日历日期详情：任务行应有 ✎ 编辑入口 ----
  await evalIn('store.addTask({id:'+JSON.stringify(calId)+',type:"dated",title:"日历里的任务",targetDate:'+JSON.stringify(dateStr)+',createdAt:new Date().toISOString(),order:Date.now()})');
  await evalIn('navigate("calendar")');
  await tick(400);
  const calCell=[...doc.querySelectorAll('.cal-cell')].find(c=>c.classList.contains('today'));
  click(calCell);
  await tick(500);
  const dayModal=lastModal();
  checks.push(['日历日期详情弹层已打开', !!dayModal]);
  const dayRows=dayModal ? [...dayModal.querySelectorAll('.task-row')] : [];
  const calRow=dayRows.find(r=>r.textContent.indexOf('日历里的任务')!==-1);
  checks.push(['日历详情渲染出该任务行', !!calRow]);
  checks.push(['日历详情任务行有 ✎ 编辑入口', !!(calRow && calRow.querySelector('.task-edit'))]);

  // 清理测试数据
  await evalIn('store.listTasks().then(a=>a.filter(t=>['+JSON.stringify(tid)+','+JSON.stringify(keepId)+','+JSON.stringify(calId)+'].indexOf(t.id)!==-1).forEach(t=>store.deleteTask(t.id)))');

  console.log('\n--- 断言 ---');
  let bad=0;
  for(const [n,ok] of checks){ console.log('  '+(ok?'OK  ':'FAIL')+'  '+n); if(!ok) bad++; }
  console.log('\nconfirm 调用记录:', confirmCalls);
  console.log('ERRORS:', errors.length?errors:'none');
  console.log(bad?('\nRESULT: '+bad+' 项未通过'):'\nRESULT: 全部通过');
  process.exit(bad?1:0);
})();
