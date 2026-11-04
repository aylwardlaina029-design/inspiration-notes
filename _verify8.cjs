const fs=require('fs');
const {execSync}=require('child_process');
const {JSDOM,VirtualConsole}=require('jsdom');

const html=fs.readFileSync('standalone.html','utf8');
const m=html.match(/<script>([\s\S]*?)<\/script>/);
if(m){ fs.writeFileSync('_inline_extract.js', m[1], 'utf8');
  try{ execSync('node --check _inline_extract.js', {stdio:'pipe'}); console.log('node --check: OK'); }
  catch(e){ console.error('node --check FAILED:\n', e.stdout?.toString()+e.stderr?.toString()); process.exit(1); }
}

const errors=[];
const vc=new VirtualConsole();
vc.on('jsdomError',e=>{const msg=(e.detail&&e.detail.message)||e.message||''; if(!/scrollTo/.test(msg)) errors.push('jsdomError: '+msg);});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:vc});
const {window}=dom; const doc=window.document;

setTimeout(()=>{
  const gear=doc.querySelector('#settings-gear');
  const svg=gear && gear.querySelector('svg');
  const path=svg && svg.querySelector('path');
  const d=path?path.getAttribute('d'):'(none)';

  console.log('\n--- 顶部三横杠图标 ---');
  console.log('  #settings-gear 存在:', !!gear);
  console.log('  path d =', d);
  console.log('  stroke-width =', path?path.getAttribute('stroke-width'):'(none)');
  console.log('  linecap =', path?path.getAttribute('stroke-linecap'):'(none)');

  // 解析三条横线
  const segs=[...d.matchAll(/M([\d.]+) ([\d.]+)h([\d.]+)/g)].map(x=>({x:+x[1],y:+x[2],len:+x[3]}));
  console.log('\n--- 三条横线解析 ---');
  segs.forEach((s,i)=>console.log(`  第${i+1}条: x=${s.x} y=${s.y} 路径长度=${s.len} → 可见长度=${s.len+2}(圆头端点各+1)`));

  const checks=[];
  checks.push(['找到三条横线', segs.length===3]);
  checks.push(['上面两条等长', segs[0].len===segs[1].len]);
  checks.push(['第三条比原来短三分之一', Math.abs((segs[2].len+2)/(segs[0].len+2) - 2/3) < 0.001]);
  checks.push(['三条左端对齐', segs.every(s=>s.x===segs[0].x)]);
  checks.push(['路径长度 16/16/10', segs[0].len===16 && segs[1].len===16 && segs[2].len===10]);
  checks.push(['圆头端点 stroke-linecap=round', path && path.getAttribute('stroke-linecap')==='round']);

  console.log('\n--- 断言 ---');
  let bad=0;
  for(const [n,ok] of checks){ console.log('  '+(ok?'OK  ':'FAIL')+'  '+n); if(!ok) bad++; }

  // 源文件与镜像一致性
  const src=fs.readFileSync('index.html','utf8');
  const srcD=(src.match(/<path[^>]*\sd="([^"]+)"/)||[])[1];
  const mirD=(html.match(/<path[^>]*\sd="([^"]+)"/)||[])[1];
  console.log('\n--- 源/镜像一致性 ---');
  console.log('  index.html   d =', srcD);
  console.log('  standalone   d =', mirD);
  const same=srcD===mirD;
  console.log('  一致:', same);
  if(!same) bad++;

  console.log('\nERRORS:', errors.length?errors:'none');
  console.log(bad?('\nRESULT: '+bad+' 项未通过'):'\nRESULT: 全部通过');
  process.exit(bad?1:0);
},900);
