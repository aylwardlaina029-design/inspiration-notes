const fs=require('fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync('standalone.html','utf8');
const errors=[];
const vc=new VirtualConsole();
vc.on('jsdomError',e=>errors.push('jsdomError: '+(e.detail&&e.detail.stack||e.message)));
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:vc});
const {window}=dom;
setTimeout(()=>{
  const doc=window.document;
  const navCal=doc.querySelector('[data-view="calendar"]');
  const navRef=doc.querySelector('[data-view="reflections"]');
  console.log('nav calendar has svg:', !!navCal.querySelector('svg'));
  console.log('nav inspiration has svg:', !!navRef.querySelector('svg'));
  const navSvg=navCal.querySelector('svg');
  console.log('nav calendar svg rect fill (should be #A8BEDF):', navSvg && navSvg.querySelector('rect').getAttribute('fill'));
  const moodBtns=doc.querySelectorAll('.mood-btn');
  console.log('mood buttons count (should be 5):', moodBtns.length);
  console.log('all mood buttons have svg:', [...moodBtns].every(b=>b.querySelector('svg')));
  const face=moodBtns[0].querySelector('circle');
  console.log('mood face fill (should be #A8BEDF):', face && face.getAttribute('fill'));
  moodBtns[0].dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  setTimeout(()=>{
    const reMood=doc.querySelectorAll('.mood-btn');
    console.log('after click index0, active count (should be 1):', [...reMood].filter(b=>b.classList.contains('active')).length);
    console.log('after click, index0 active:', reMood[0].classList.contains('active'));
    console.log('ERRORS:', errors.length?errors:'none');
  },250);
},800);
