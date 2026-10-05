'use strict';
// Visual acceptance for the AV upgrade: drives the real index.html through DOM actions in headless Edge,
// saves screenshots and measures layout, contrast, SVG budget, render time, idle cost and celebration cleanup.
// Fixtures use only public APIs (a separate Engine + JSON import through the settings dialog), like acceptance-final.
// Usage: node tests/av-visual.cjs [--quick] [--idle 60]
const {launchEdge,delay}=require('./cdp-helper.cjs');const fs=require('node:fs/promises'),path=require('node:path'),{pathToFileURL}=require('node:url');
const argv=process.argv.slice(2),QUICK=argv.includes('--quick'),IDLE=Number((argv[argv.indexOf('--idle')+1])||60)*(argv.includes('--idle')?1:1);
const out=path.resolve(process.env.UI_EVIDENCE_DIR||path.join(__dirname,'../docs/av-visual-evidence'));
const VIEWS=[{id:'1366x768',w:1366,h:768,dsf:1},{id:'1600x900',w:1600,h:900,dsf:1},{id:'1920x1080',w:1920,h:1080,dsf:1},{id:'2560x1440',w:2560,h:1440,dsf:1},{id:'1920x1080@125',w:1536,h:864,dsf:1.25},{id:'1920x1080@150',w:1280,h:720,dsf:1.5}];
const report={kind:'real Edge headless file:// DOM automation of index.html; screenshots are machine captures, not manual review',started:new Date().toISOString(),checks:[],metrics:{},scenes:[],errors:[],requests:[],shots:[]};
let c;const ev=x=>c.evaluate(x);const allScenes=[];async function harvest(){try{const a=await ev('window.__scenes||[]');allScenes.push(...a);await ev('window.__scenes=[]');}catch{}}
function ck(name,pass,detail){report.checks.push({name,pass:!!pass,...(detail!==undefined?{detail}:{})});if(!pass)console.error('FAIL',name,detail!==undefined?JSON.stringify(detail):'');}
async function click(sel){await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)throw Error('Missing '+${JSON.stringify(sel)});if(e.disabled)throw Error('Disabled '+${JSON.stringify(sel)});e.click()})()`);await delay(240);}
async function input(sel,v){await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`);}
async function closeDlg(){if(await ev('document.querySelector("dialog").open'))await click('[data-action=close]');}
async function shot(name){const r=await c.send('Page.captureScreenshot',{format:'jpeg',quality:80,captureBeyondViewport:false});const f=name+'.jpg';await fs.writeFile(path.join(out,f),Buffer.from(r.data,'base64'));report.shots.push(f);}
async function view(v){await c.send('Emulation.setDeviceMetricsOverride',{width:v.w,height:v.h,deviceScaleFactor:v.dsf,mobile:false});await delay(250);}
async function load(){if(c)await harvest();await c.send('Page.navigate',{url:pathToFileURL(path.resolve(__dirname,'../index.html')).href});for(let i=0;i<100;i++){if(await ev('document.readyState==="complete"&&!!window.HomeYear?.UI'))return;await delay(50);}throw Error('load timeout');}
// Public fixture: advance a separate engine with the same seed via dispatch, optionally grant cash (recorded like acceptance-final), import through UI.
async function fixture({week=1,cash=0,house=null,end=false,seed='AV-VISUAL'}){
 const raw=await ev(`(()=>{const e=new HomeYear.Engine(${JSON.stringify(seed)},'standard');let t=0;const d=(type,id)=>{const v=e.visible();const r=e.dispatch({type,id,revision:v.revision,token:'fx'+(++t)});if(!r.ok)throw Error(r.error)};for(let w=1;w<${week};w++)d('next');let s=e.snapshot();if(${cash}){s.cash+=${cash};s.stats.grants+=${cash};HomeYear.record(s);e.restore(s);}if(${JSON.stringify(house)})d('house',${JSON.stringify(house)});if(${end})d('end');return JSON.stringify(e.snapshot())})()`);
 await closeDlg();await click('[data-action=settings]');await input('[data-testid=save-text]',raw);await click('[data-testid=import]');await click('[data-testid=confirm-yes]');await closeDlg();
}
const layoutProbe=`(()=>{const d=document.documentElement,vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0},inV=e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1};
 const nb=document.querySelector('[data-testid=next-week]');const top=[...document.querySelectorAll('.topbar>.brand-chip,.topbar>.calendar,.topbar>.metrics,.topbar>.top-actions')].filter(vis).map(e=>e.getBoundingClientRect());let overlap=false;for(let i=0;i<top.length;i++)for(let j=i+1;j<top.length;j++){const a=top[i],b=top[j];if(a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1)overlap=true;}
 const clipped=[...document.querySelectorAll('.product h3,.product strong,.metric strong,.brand,.window-caption h3,[data-testid=cash]')].filter(e=>vis(e)&&e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).overflow!=='visible').length;
 return {noOverflow:d.scrollWidth<=innerWidth&&d.scrollHeight<=innerHeight,nextVisible:!nb||inV(nb),topOverlap:overlap,clipped,products:document.querySelectorAll('.product').length,firstProductVisible:!document.querySelector('.product')||inV(document.querySelector('.product'))}})()`;
// WCAG contrast of visible text against the composited background chain (alpha blended down to an opaque layer).
const contrastProbe=`(()=>{const P=s=>{const m=s.match(/[\\d.]+/g);return m?m.map(Number):[0,0,0,0]},lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])},blend=(t,b)=>{const a=t[3]===undefined?1:t[3];return [0,1,2].map(i=>t[i]*a+b[i]*(1-a))};
 function bg(e){const layers=[];for(let n=e;n&&n.nodeType===1;n=n.parentElement){const cs=getComputedStyle(n),c=P(cs.backgroundColor);if(c.length<4)c[3]=1;if(c[3]>0)layers.push(c);if(c[3]>=1)break;if(n.matches('.topbar,.start'))return null;}let base=[255,255,255];for(let i=layers.length-1;i>=0;i--)base=blend(layers[i],base);return base;}
 const sel=${JSON.stringify('#app p,#app small,#app h1,#app h2,#app h3,#app strong,#app label,#app button,#app span,#app dt,#app dd,dialog p,dialog small,dialog h2,dialog h3,dialog strong,dialog button,dialog dt,dialog dd,dialog span,dialog summary')};
 const res=[];for(const e of document.querySelectorAll(sel)){if(!e.childNodes.length||![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;const r=e.getBoundingClientRect();if(!r.width||!r.height||r.bottom<0||r.top>innerHeight)continue;const cs=getComputedStyle(e);if(cs.visibility!=='visible'||+cs.opacity<.99)continue;if(e.closest('button:disabled'))continue;const b=bg(e);if(!b)continue;const fg=blend(P(cs.color).concat(P(cs.color).length<4?[1]:[]),b),L1=lum(fg),L2=lum(b),ratio=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05),size=parseFloat(cs.fontSize),bold=+cs.fontWeight>=700,large=size>=24||(bold&&size>=18.66);res.push({t:e.textContent.trim().slice(0,24),cls:e.className&&String(e.className).slice(0,30),ratio:+ratio.toFixed(2),need:large?3:4.5});}
 const fails=res.filter(x=>x.ratio<x.need);return {count:res.length,min:res.reduce((m,x)=>Math.min(m,x.ratio),99),fails:fails.slice(0,12),failCount:fails.length}})()`;
async function contrast(label){const r=await ev(contrastProbe);ck('text contrast ≥4.5:1 (≥3:1 large) · '+label,r.failCount===0&&r.count>10,{checked:r.count,min:r.min,fails:r.fails});return r;}
(async()=>{let edge;await fs.mkdir(out,{recursive:true});for(const f of await fs.readdir(out))if(/\.(jpg|png)$/.test(f))await fs.rm(path.join(out,f));
try{
 edge=await launchEdge();c=edge.cdp;report.browser=edge.version.Browser;report.node=process.version;
 await c.send('Page.enable');await c.send('Runtime.enable');await c.send('Network.enable');await c.send('Performance.enable');
 c.on('Runtime.exceptionThrown',p=>report.errors.push(p.exceptionDetails&&p.exceptionDetails.exception?p.exceptionDetails.exception.description:p));c.on('Runtime.consoleAPICalled',p=>{if(p.type==='error')report.errors.push(p.args.map(a=>a.value).join(' '))});c.on('Network.requestWillBeSent',p=>report.requests.push(p.request.url));
 // Record every setScene payload; wraps the real audio implementation if it exists, otherwise a recorder only.
 await c.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__scenes=[];document.addEventListener('DOMContentLoaded',()=>{},{once:true});Object.defineProperty(window,'__hookScenes',{value:()=>{const A=window.HomeYear&&window.HomeYear.Audio;if(!A||A.__hooked)return;const real=typeof A.setScene==='function'?A.setScene.bind(A):null;try{A.setScene=s=>{window.__scenes.push(JSON.parse(JSON.stringify(s)));return real?real(s):undefined};A.__hooked=true;}catch(e){}}});`});
 await view(VIEWS[0]);
 const t0=Date.now();await load();
 const paint=await ev(`new Promise(r=>{const e=performance.getEntriesByType('paint'),f=e.find(p=>p.name==='first-contentful-paint')||e.find(p=>p.name==='first-paint');if(f)return r({ms:f.startTime,source:f.name});requestAnimationFrame(()=>requestAnimationFrame(()=>r({ms:performance.now(),source:'double-rAF after load (no paint entry in headless)',domContentLoaded:performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd})))})`);report.metrics.firstContentfulPaintMs=paint;report.metrics.coldLoadWallMs=Date.now()-t0;
 ck('file:// start page painted < 1000ms (headless baseline)',paint&&paint.ms<1000,paint);
 ck('shared defs injected once with hy- ids only',await ev(`document.querySelectorAll('#hy-defs').length===1&&[...document.querySelectorAll('#app [id]')].every(e=>!e.closest('svg'))&&[...document.querySelectorAll('#hy-defs [id]')].every(e=>e.id.startsWith('hy-'))`));
 ck('no duplicate ids in document',await ev(`(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.length===new Set(ids).size})()`));
 report.metrics.audioSetSceneNative=await ev(`typeof HomeYear.Audio.setScene==='function'`);const hooked=await ev(`window.__hookScenes();!!HomeYear.Audio.__hooked`);
 ck('start page phase menu and city illustration',await ev(`document.body.dataset.phase==='menu'&&!!document.querySelector('.start .art-city')&&document.querySelectorAll('.start .hy-lamp').length>0&&document.querySelectorAll('.start .hy-lamp').length<=12`));

 // --- per-resolution walkthrough ---
 for(const v of QUICK?VIEWS.slice(0,1):VIEWS){
  await view(v);await load();await ev('window.__hookScenes()');await delay(1800);
  let L=await ev(layoutProbe);ck(`start layout · ${v.id}`,L.noOverflow,L);await shot(`${v.id}-01-start`);if(v.id==='1366x768'||v.id==='1920x1080')await contrast('start '+v.id);
  await input('[data-testid=seed]','AV-VISUAL');await click('[data-testid=new-game]');if(await ev('!!document.querySelector("[data-testid=confirm-yes]")'))await click('[data-testid=confirm-yes]');if(await ev('!!document.querySelector("[data-action=tour-finish]")'))await click('[data-action=tour-finish]');
  await fixture({week:9});await delay(150);
  L=await ev(layoutProbe);ck(`market layout · ${v.id}`,L.noOverflow&&L.nextVisible&&!L.topOverlap&&L.clipped===0&&L.firstProductVisible,L);await shot(`${v.id}-02-market`);
  if(v.id==='1366x768'||v.id==='1920x1080@150')await contrast('market '+v.id);
  const svgCount=await ev(`document.querySelectorAll('#app svg *').length`);report.metrics['svgElements '+v.id]=svgCount;ck(`market SVG elements < 2500 · ${v.id}`,svgCount<2500,{svgCount});
  await click('[data-testid=product-rice]');await click('[data-qty="5"]');await click('[data-testid=trade-submit]');await delay(100);
  L=await ev(`(()=>{const d=document.querySelector('dialog'),r=d.getBoundingClientRect();return {inView:r.top>=0&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1,receipt:!!d.querySelector('.receipt dl'),avg:!!d.querySelector('.trade-spark path[stroke-dasharray]'),icon:d.querySelector('.trade-icon').getBoundingClientRect().width}})()`);
  ck(`trade dialog receipt, average line, ≥96px product art · ${v.id}`,L.inView&&L.receipt&&L.avg&&L.icon>=95,L);await shot(`${v.id}-03-trade`);if(v.id==='1366x768')await contrast('trade dialog');
  await closeDlg();
  await fixture({week:30,cash:1500000});await click('[data-testid=houses]');
  L=await ev(`(()=>{const d=document.querySelector('dialog');return {flyers:d.querySelectorAll('.flyer').length,buttons:d.querySelectorAll('[data-action=buy-house]').length,distinctArt:new Set([...d.querySelectorAll('.flyer-art svg')].map(s=>s.innerHTML.length)).size,noOverflow:document.documentElement.scrollWidth<=innerWidth}})()`);
  ck(`five house flyers with distinct art · ${v.id}`,L.flyers===5&&L.buttons===5&&L.distinctArt===5&&L.noOverflow,L);await shot(`${v.id}-04-houses`);if(v.id==='1366x768')await contrast('houses');
  await click('[data-testid=house-studio]');await click('[data-testid=confirm-yes]');await delay(900);
  const fx1=await ev('HomeYear.UI.fx()');await shot(`${v.id}-05-celebration`);
  ck(`celebration shown with confetti · ${v.id}`,fx1.celebrating&&fx1.confetti,fx1);
  await delay(2600);const fx2=await ev('HomeYear.UI.fx()');ck(`confetti rAF stopped ≤2.5s and overlay cleaned · ${v.id}`,!fx2.rafActive&&!fx2.confetti&&!(await ev('!!document.querySelector(".celebration")')),fx2);
  ck(`house owned shows stamp · ${v.id}`,await ev(`!!document.querySelector('dialog .flyer.owned .owned-stamp')`));
  await closeDlg();await shot(`${v.id}-06-market-owned`);
  await fixture({week:52,cash:2000000,house:'two',end:true});await delay(200);
  if(!await ev('document.querySelector("dialog").open'))await click('[data-testid=next-week]');
  L=await ev(`(()=>{const d=document.querySelector('dialog');return {book:!!d.querySelector('.storybook.book-home'),phase:document.body.dataset.phase,marks:d.querySelectorAll('.asset-chart circle,.asset-chart path[stroke-dasharray]').length}})()`);
  ck(`ending-home storybook golden hour with peak and first-house marks · ${v.id}`,L.book&&L.phase==='ending-home'&&L.marks>=2,L);await shot(`${v.id}-07-result-home`);if(v.id==='1366x768')await contrast('result home');
  await fixture({week:52,end:true,seed:'AV-RENT'});await delay(200);if(!await ev('document.querySelector("dialog").open'))await click('[data-testid=next-week]');
  L=await ev(`(()=>{const d=document.querySelector('dialog');return {book:!!d.querySelector('.storybook.book-rent .art-rent'),phase:document.body.dataset.phase}})()`);
  ck(`ending-rent storybook blue hour rent window · ${v.id}`,L.book&&L.phase==='ending-rent',L);await shot(`${v.id}-08-result-rent`);
  await closeDlg();
 }

 // --- seasons × phases at 1366 (market screen; season accessory layer + time-of-day) ---
 await view(VIEWS[0]);await load();await ev('window.__hookScenes()');await input('[data-testid=seed]','AV-SEASON');await click('[data-testid=new-game]');if(await ev('!!document.querySelector("[data-action=tour-finish]")'))await click('[data-action=tour-finish]');
 for(const [week,season,phase,cash] of [[5,'winter','early',0],[16,'spring','development',300000],[27,'summer','development',0],[47,'autumn','sprint',0]]){await fixture({week,cash,seed:'AV-SEASON'});const s=await ev('({phase:document.body.dataset.phase,season:document.body.dataset.season,tone:document.querySelector(".home-window").dataset.tone})');ck(`week ${week}: body phase/season ${phase}/${season}`,s.phase===phase&&s.season===season,s);report.scenes.push({week,...s});await shot(`season-${season}-${phase}`);}
 ck('sprint shows brass countdown ring (no red alarm)',await ev(`!!document.querySelector('.calendar.countdown .cal-ring')`));

 // --- visual phase shares the director's hysteresis (enter 0.90, leave below 0.80); compare with a fresh director fed the same payloads ---
 {const steps=[];for(const [label,p] of [['p.50',.5],['p.92',.92],['p.85',.85],['p.75',.75],['p.85b',.85]]){const due=await ev(`HomeYear.housePrice(new HomeYear.Engine('AV-HYST','standard').visible(),HomeYear.houses[0])`);const base=await ev(`(()=>{const e=new HomeYear.Engine('AV-HYST','standard');for(let w=1;w<10;w++){const v=e.visible();e.dispatch({type:'next',revision:v.revision,token:'h'+w})}return e.visible().cash})()`);await fixture({week:10,cash:Math.round(p*due)-base,seed:'AV-HYST'});steps.push({label,phase:await ev('document.body.dataset.phase'),progress:(await ev('HomeYear.UI.audioScene()')).progress});}
 const expect=['early','development','development','early','early'];
 const ref=await ev(`(()=>{if(!HomeYear.AudioDirector)return null;const d=HomeYear.AudioDirector.createDirector();d.request({screen:'start'});return ${JSON.stringify(steps.map(s=>s.progress))}.map(p=>d.request({screen:'game',week:10,status:'playing',house:null,progress:p,season:'winter',climate:'steady',dialogOpen:false}))})()`);
 report.metrics.hysteresis={steps,expect,directorReference:ref};
 ck('visual phase hysteresis: early→development at ≥0.90, stays at 0.85, back to early below 0.80',steps.every((s,i)=>s.phase===expect[i]),steps);
 ck('visual phase equals a fresh HomeYear.AudioDirector fed the same public progress sequence',ref===null||ref.every((p,i)=>p===steps[i].phase),{ref,visual:steps.map(s=>s.phase)});}

 // --- scene cache: re-rendering the market must not rebuild illustrations unless their key changes ---
 const before=await ev('HomeYear.UI.sceneBuilds()');for(const cat of ['生活','电子','全部'])await click(`[data-action=category][data-category="${cat}"]`);const fav=await ev(`(()=>{const id=HomeYear.UI.snapshot().listing.find(x=>document.querySelector('[data-action=favorite][data-id="'+x+'"]'));if(!id)throw Error('no listed favorite control');return id;})()`);await click(`[data-action=favorite][data-id="${fav}"]`);await click(`[data-action=favorite][data-id="${fav}"]`);
 const after=await ev('HomeYear.UI.sceneBuilds()');ck('scene slots reused across re-renders (street/home not rebuilt)',after.street===before.street&&after.home===before.home,{before,after});
 // renderGame cost at 1366: category clicks call renderGame synchronously.
 const times=await ev(`(()=>{const t=[];for(let i=0;i<25;i++){const b=document.querySelector('[data-action=category][data-category="'+(i%2?'全部':'生活')+'"]');const s=performance.now();b.click();t.push(performance.now()-s);}t.sort((a,b)=>a-b);return t})()`);
 report.metrics.renderGameMedianMs=+times[12].toFixed(2);report.metrics.renderGameP90Ms=+times[22].toFixed(2);ck('renderGame median < 16ms at 1366 (headless baseline)',times[12]<16,{median:times[12],p90:times[22]});

 // --- setScene protocol from public values ---
 await delay(300);await harvest();const scenes=allScenes;report.metrics.setSceneCalls=scenes.length;
 const keys=['screen','week','status','house','progress','season','climate','dialogOpen','dialog'];
 ck('setScene payloads use only the agreed public keys',scenes.length>5&&scenes.every(s=>Object.keys(s).every(k=>keys.includes(k))),{sample:scenes.slice(-3),hooked});
 ck('setScene covers start, game, dialogs open/close and both endings',['start','game'].every(x=>scenes.some(s=>s.screen===x))&&scenes.some(s=>s.dialogOpen)&&scenes.some(s=>s.status==='ended'&&s.house)&&scenes.some(s=>s.status==='ended'&&!s.house)&&scenes.some(s=>!s.dialogOpen&&s.screen==='game'));
 ck('setScene values are valid enumerations',scenes.every(s=>(s.season===null||['winter','spring','summer','autumn'].includes(s.season))&&(s.climate===null||['hot','steady','cold'].includes(s.climate))&&(s.progress===null||(s.progress>=0&&s.progress<=1))));
 const sc=await ev('(()=>{const s=HomeYear.UI.snapshot(),a=HomeYear.UI.audioScene();return {a,week:s.week,house:s.house,cash:s.cash}})()');ck('latest scene matches visible state',sc.a.week===sc.week&&sc.a.house===sc.house&&sc.a.screen==='game',sc);
 ck('consecutive setScene payloads are deduplicated',scenes.every((s,i)=>i===0||JSON.stringify(s)!==JSON.stringify(scenes[i-1])));

 // --- reduced motion: system preference and in-game setting ---
 await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 ck('system reduced motion disables lamp/surge animation',await ev(`getComputedStyle(document.querySelector('.product')).animationName==='none'`));
 await fixture({week:20,cash:1500000,seed:'AV-RM'});await click('[data-testid=houses]');await click('[data-testid=house-studio]');await click('[data-testid=confirm-yes]');await delay(200);
 const rm=await ev(`({still:!!document.querySelector('.celebration.still'),canvas:!!document.querySelector('.celebration canvas'),fx:HomeYear.UI.fx()})`);ck('reduced motion celebration: no confetti, still card',rm.still&&!rm.canvas&&!rm.fx.confetti,rm);await shot('reduced-motion-celebration');
 await delay(2400);ck('reduced-motion celebration cleaned up',await ev('!document.querySelector(".celebration")&&!HomeYear.UI.fx().celebrating'));await closeDlg();
 await c.send('Emulation.setEmulatedMedia',{features:[]});
 await click('[data-action=settings]');await ev(`(()=>{const s=document.querySelector('[data-setting=animation]');s.value='off';s.dispatchEvent(new Event('change',{bubbles:true}))})()`);await closeDlg();
 ck('animation off: lamps rendered lit without animation',await ev(`document.body.dataset.animation==='off'&&getComputedStyle(document.querySelector('.product')).animationName==='none'`));
 await click('[data-action=settings]');await ev(`(()=>{const s=document.querySelector('[data-setting=animation]');s.value='normal';s.dispatchEvent(new Event('change',{bubbles:true}))})()`);await closeDlg();

 // --- celebration cancelled when page becomes hidden (simulated visibilitychange; headless cannot hide a tab) ---
 await fixture({week:20,cash:1500000,seed:'AV-HIDE'});await click('[data-testid=houses]');await click('[data-testid=house-studio]');await click('[data-testid=confirm-yes]');await delay(150);
 const hid=await ev(`(()=>{const was=HomeYear.UI.fx().celebrating;Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));const r={was,now:HomeYear.UI.fx(),overlay:!!document.querySelector('.celebration')};delete document.hidden;return r})()`);
 ck('simulated hidden page stops celebration rAF immediately',hid.was&&!hid.now.rafActive&&!hid.overlay,hid);await closeDlg();

 // --- idle cost on the market screen with music setting on (no interaction) ---
 await load();await ev('window.__hookScenes()');await click('[data-testid=continue]').catch(()=>{});await closeDlg();
 const m0=await c.send('Performance.getMetrics'),w0=Date.now();await delay(IDLE*1000);const m1=await c.send('Performance.getMetrics'),wall=(Date.now()-w0)/1000;
 const get=(m,k)=>(m.metrics.find(x=>x.name===k)||{}).value||0,task=get(m1,'TaskDuration')-get(m0,'TaskDuration');
 report.metrics.idle={seconds:wall,taskDurationSeconds:+task.toFixed(4),percent:+(task/wall*100).toFixed(3),screen:await ev('HomeYear.UI.screen()'),music:await ev('HomeYear.UI.settings().music'),audioState:await ev('HomeYear.Audio.status().state')};
 ck(`idle ${IDLE}s TaskDuration < 3% of wall time (headless baseline)`,task/wall<.03,report.metrics.idle);

 ck('no runtime/console errors',report.errors.length===0,report.errors.slice(0,5));
 ck('no external requests',!report.requests.some(u=>/^(https?|wss?):/.test(u)),report.requests.filter(u=>!u.startsWith('file:')&&!u.startsWith('data:')).slice(0,5));
}catch(e){report.fatal=e.stack||String(e);console.error(e);}
finally{if(edge)await edge.cleanup().catch(e=>report.cleanup=e.message);report.finished=new Date().toISOString();report.summary={passed:report.checks.filter(x=>x.pass).length,failed:report.checks.filter(x=>!x.pass).length};await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({summary:report.summary,metrics:report.metrics,fatal:report.fatal},null,1));if(report.fatal||report.summary.failed)process.exitCode=1;}})();
