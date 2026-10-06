'use strict';
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {launchEdge,delay}=require('./cdp-helper.cjs');
const out=process.env.UI_EVIDENCE_DIR||'C:\\Users\\admin\\AppData\\Local\\Temp\\homeyear-loan-ui';
const root=path.resolve(__dirname,'..');
const report={kind:'loan and scratch-off browser acceptance',checks:[],failures:[],errors:[],external:[],shots:[],notes:[],audio:{}};
function brief(d){if(d==null||typeof d!=='object')return d;const s=JSON.stringify(d);return s.length>420?s.slice(0,420)+'…':d;}
function check(name,pass,detail){report.checks.push({name,pass:!!pass,detail:brief(detail)});if(!pass){report.failures.push(name);console.error('FAIL',name,brief(detail));}}
const PRIZES=[0,1200,4000,10000,25000,120000];
const PRIZE_KIND=[['空信封','prize-none'],['鸡蛋','prize-small'],['红包','prize-small'],['雨伞','prize-mid'],['金表','prize-mid'],['房门钥匙','prize-key']];
function prizeKindOf(text){const row=PRIZE_KIND.find(([n])=>String(text).startsWith('三个'+n+'，'));return row?row[1]:'';}
const STORY=["(()=>{","const H=HomeYear,e=new H.Engine('YEAR-END','standard');let n=0;","const step=(type,id)=>{const s=e.visible();const r=e.dispatch({type:type,id:id,revision:s.revision,token:type+'|'+(id||'')+'|'+s.revision+'|'+n});n++;if(!r.ok)throw Error((r.error||'dispatch')+' @'+type+' '+(id||'')+' week '+s.week);};","const s0=e.snapshot();s0.cash+=2000000;s0.stats.grants+=2000000;H.record(s0);H.validate(s0);e.restore(s0);","step('loan','1000');step('lottery');step('repay','500');step('next');step('repay','interest');","while(e.snapshot().week<52)step('next');step('end');","const s=e.snapshot();if(s.status!=='ended'||s.week!==52)throw Error('year not ended');","if(!(s.stats.loanInterestPaid>0)||!(s.stats.lotterySpent>0)||!(s.stats.loanDrawn>0))throw Error('story ledger empty');","return s;})()"].join('');
const POOR=["(()=>{","const H=HomeYear,e=new H.Engine('POOR-LOAN','standard');let n=0;","const step=(type,id)=>{const s=e.visible();const r=e.dispatch({type:type,id:id,revision:s.revision,token:type+':'+n});n++;if(!r.ok)throw Error(r.error||type);};","step('loan','1000');const s=e.snapshot();const drop=s.cash-2000;if(drop<=0)throw Error('cash already low');","s.cash=2000;s.stats.expenses+=drop;H.record(s);H.validate(s);e.restore(s);return e.snapshot();})()"].join('');
const RICH=["(()=>{","const H=HomeYear,e=new H.Engine('RICH-BUY','standard');const s=e.snapshot();","s.cash+=2000000;s.stats.grants+=2000000;H.record(s);H.validate(s);e.restore(s);return e.snapshot();})()"].join('');
(async()=>{let edge;fs.mkdirSync(out,{recursive:true});try{
edge=await launchEdge();report.browser=edge.version.Browser;const c=edge.cdp;
const ev=async(expression,timeout=20000)=>{const r=await c.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},timeout);if(r.exceptionDetails){const d=r.exceptionDetails;throw Error(String((d.exception&&d.exception.description)||d.text||'evaluate').slice(0,800));}return r.result?r.result.value:undefined;};
await c.send('Page.enable');await c.send('Runtime.enable');await c.send('Network.enable');await c.send('Emulation.setFocusEmulationEnabled',{enabled:true});
c.on('Runtime.exceptionThrown',p=>{const d=p.exceptionDetails||{};report.errors.push(String((d.exception&&d.exception.description)||d.text||'exception').split('\n')[0].slice(0,240));});
c.on('Network.requestWillBeSent',p=>{if(/^https?:|^wss?:/.test(p.request.url))report.external.push(p.request.url);});
const snap=()=>ev('HomeYear.UI.snapshot()');
const mark=()=>ev('window.__mark=window.__audio.length');
const since=()=>ev('window.__audio.slice(window.__mark)');
const countKind=(list,kind)=>(list||[]).filter(k=>k===kind).length;
async function click(selector){
  const xy=await ev(`(()=>{const sel=${JSON.stringify(selector)};const e=document.querySelector(sel);if(!e||e.disabled)throw Error('missing/disabled '+sel);e.scrollIntoView({block:'center',inline:'nearest'});const r=e.getBoundingClientRect();const pts=[[.5,.5],[.5,.25],[.25,.5],[.75,.5],[.5,.75]];for(const [px,py] of pts){const x=r.left+r.width*px,y=r.top+r.height*py;const t=document.elementFromPoint(x,y);if(t&&(t===e||e.contains(t)))return {x,y};}const t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);throw Error('occluded '+sel+' by '+String(t?(t.id||t.getAttribute('data-testid')||t.getAttribute('data-action')||t.className||t.tagName):'none').slice(0,80));})()`);
  for(const type of ['mousePressed','mouseReleased'])await c.send('Input.dispatchMouseEvent',{type,x:xy.x,y:xy.y,button:'left',clickCount:1});
  await delay(250);
}
async function clickTry(selector){
  try{await click(selector);return true;}catch(e){if(String(e.message).includes('audio-enable')){try{await click('#audio-enable');}catch(err){}try{await click(selector);return true;}catch(err){throw err;}}throw e;}
}
async function closeDialog(){if(await ev('!!document.querySelector("dialog")&&document.querySelector("dialog").open')){try{await click('dialog [data-action=close]');}catch(e){await escapeKey();}}}
async function escapeKey(){await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await delay(200);}
async function shot(name){const r=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const file=path.join(out,name+'.png');fs.writeFileSync(file,Buffer.from(r.data,'base64'));report.shots.push(file);}
async function size(width,height){await c.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await delay(150);}
async function waitUI(){for(let n=0;n<120;n++){try{if(await ev('!!window.HomeYear&&!!window.HomeYear.UI'))return;}catch(e){}await delay(50);}throw Error('UI did not boot');}
async function cashLine(centsExpr){return ev(`(()=>{const fmt=n=>'¥'+(Number(n)/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});const shown=document.querySelector('[data-testid=cash]').textContent;const n=(${centsExpr});return {ok:shown===fmt(n)&&HomeYear.UI.settings().numberFormat==='decimal',shown,expect:fmt(n)};})()`);}
async function bank(testid){return ev(`(()=>{const b=document.querySelector('[data-testid="${testid}"]');if(!b)return null;const choice=b.closest('.bank-choice');const local=choice&&choice.querySelector('.bank-reason');const block=b.closest('.bank-block');const shared=block&&[...block.children].find(el=>el.classList&&el.classList.contains('bank-reason'));const reason=(local||shared)?(local||shared).textContent:'';return {disabled:!!b.disabled,text:b.textContent,reason};})()`);}
async function nextWeek(){const before=(await snap()).week;await clickTry('[data-testid=next-week]');const seen=[];for(let i=0;i<4;i++){const kind=await ev('document.querySelector("dialog").open?document.querySelector("dialog").dataset.kind:""');if(!kind)break;seen.push(kind);await escapeKey();}if(seen.length)report.notes.push('after next toward '+(before+1)+': '+seen.join(','));const week=(await snap()).week;check('week advanced from '+before,week===before+1,{week,seen});check('dialog closed after next '+week,await ev('!document.querySelector("dialog").open'),seen);return week;}
async function importState(state){
  await ev('window.__pending='+JSON.stringify(state),30000);
  if(await ev('document.querySelector("dialog").open'))await clickTry('dialog [data-action=close]');
  await clickTry('[data-action=settings]');
  await ev("(()=>{const e=document.querySelector('[data-testid=save-text]');e.value=JSON.stringify(window.__pending);e.dispatchEvent(new Event('input',{bubbles:true}));})()");
  await clickTry('[data-testid=import]');
  const kind=await ev('document.querySelector("dialog").dataset.kind');
  if(kind!=='confirm'){const toast=await ev('(document.querySelector("#toasts")||{textContent:""}).textContent');return {ok:false,detail:String(toast).slice(0,200)};}
  await clickTry('[data-testid=confirm-yes]');
  return ev(`(()=>{const a=window.__pending,b=HomeYear.UI.snapshot();const dj=(x,y,p)=>{if(Object.is(x,y))return '';if(typeof x!==typeof y||x===null||y===null||typeof x!=='object')return p||'root';if(Array.isArray(x)||Array.isArray(y)){if(!Array.isArray(x)||!Array.isArray(y)||x.length!==y.length)return p+' len';for(let i=0;i<x.length;i++){const d=dj(x[i],y[i],p+'['+i+']');if(d)return d;}return '';}const ks=Object.keys(x).concat(Object.keys(y).filter(k=>!Object.prototype.hasOwnProperty.call(x,k)));for(const k of ks){if(!Object.prototype.hasOwnProperty.call(x,k)||!Object.prototype.hasOwnProperty.call(y,k))return p+'.'+k+' missing';const d=dj(x[k],y[k],p+'.'+k);if(d)return d;}return '';};const diff=dj(a,b,'');return {ok:diff==='',diff,status:b.status,dialog:document.querySelector('dialog').open?document.querySelector('dialog').dataset.kind:''};})()`);
}
async function layoutOf(){return ev(`(()=>{const d=document.querySelector('dialog');const r=d.getBoundingClientRect();const tol=1;const inside=!!d.open&&r.width>0&&r.height>0&&r.left>=-tol&&r.top>=-tol&&r.right<=innerWidth+tol&&r.bottom<=innerHeight+tol;const overflow=document.documentElement.scrollWidth>document.documentElement.clientWidth+1;const cells=[...d.querySelectorAll('[data-testid^="scratch-"]')].map(e=>Math.round(e.getBoundingClientRect().height));const bad=[];for(const b of [...d.querySelectorAll('button')]){const br0=b.getBoundingClientRect();if(br0.height<1||br0.width<1)continue;b.scrollIntoView({block:'center',inline:'nearest'});const br=b.getBoundingClientRect();const x=Math.min(innerWidth-1,Math.max(0,br.left+br.width/2)),y=Math.min(innerHeight-1,Math.max(0,br.top+br.height/2));const t=document.elementFromPoint(x,y);if(!t||!(t===b||b.contains(t)))bad.push(b.getAttribute('data-testid')||b.getAttribute('data-action')||b.textContent.slice(0,12));}return {inside,overflow,kind:d.dataset.kind,title:(d.querySelector('h2')||{}).textContent||'',cells,minCell:cells.length?Math.min.apply(null,cells):null,bad,vw:innerWidth,vh:innerHeight};})()`);}
function maskOk(row){return row&&row.price===3000&&PRIZES.includes(row.prize)&&row.shown===row.masked&&row.result==='揭开三个相同的图案'&&row.kind==='lottery'&&row.buyText==='再刮一张'&&row.buyDisabled&&row.cells===9&&row.minCell>=44;}
async function lotteryOpen(){if(await ev('document.querySelector("dialog").open'))await closeDialog();await mark();await clickTry('[data-testid=open-lottery]');return since();}
async function readMask(before){return ev(`(()=>{const fmt=n=>'¥'+(n/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});const s=HomeYear.UI.snapshot();const before=${before};const prize=s.cash-(before-HomeYear.lotteryRules.price);const heights=[...document.querySelectorAll('[data-testid^="scratch-"]')].map(e=>e.getBoundingClientRect().height);const b=document.querySelector('[data-testid=lottery-buy]');return {price:HomeYear.lotteryRules.price,prize,shown:document.querySelector('[data-testid=cash]').textContent,masked:fmt(before-HomeYear.lotteryRules.price),book:fmt(s.cash),result:(document.querySelector('[data-role=lot-result]')||{}).textContent||'',kind:document.querySelector('dialog').dataset.kind,buyText:b?b.textContent:'',buyDisabled:!!(b&&b.disabled),cells:heights.length,minCell:heights.length?Math.min.apply(null,heights):0,open:document.querySelector('dialog').open};})()`);}
async function buyCard(){
  const before=await ev('HomeYear.UI.snapshot().cash');
  const btn=await ev('(()=>{const b=document.querySelector("[data-testid=lottery-buy]");return b?{text:b.textContent,disabled:!!b.disabled}:null;})()');
  if(!btn||btn.disabled)throw Error('lottery-buy unavailable '+(btn&&btn.text));
  await clickTry('[data-testid=lottery-buy]');
  return readMask(before);
}
async function resultNow(){return ev(`(()=>{const text=(document.querySelector('[data-role=lot-result]')||{}).textContent||'';const yuan=cents=>{const n=cents/100;return (Number.isInteger(n)?String(n):n.toFixed(2))+' 元';};const sym=HomeYear.lotteryRules.symbols.find(s=>text==='三个'+s.name+'，奖金 '+yuan(s.prize));const fmt=n=>'¥'+(n/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});const s=HomeYear.UI.snapshot();const shown=document.querySelector('[data-testid=cash]').textContent;const b=document.querySelector('[data-testid=lottery-buy]');return {text,formatOk:!!sym,name:sym?sym.name:'',prize:sym?sym.prize:null,cashOk:shown===fmt(s.cash),kind:document.querySelector('dialog').dataset.kind,open:!!document.querySelector('dialog').open,buyText:b?b.textContent:'',buyDisabled:!!(b&&b.disabled)};})()`);}
const SCRATCH_WAIT=750;
async function waitTicketSettled(){
  for(let n=0;n<50;n++){
    const text=await ev('(document.querySelector("[data-role=lot-result]")||{textContent:""}).textContent');
    if(text&&text!=='揭开三个相同的图案')return text;
    await delay(120);
  }
  return ev('(document.querySelector("[data-role=lot-result]")||{textContent:""}).textContent');
}
async function dragCard(){
  await mark();
  const pts=await ev(`(()=>{return [0,1,2,3,4].map(i=>{const e=document.querySelector('[data-testid=scratch-'+i+']');const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});})()`);
  await c.send('Input.dispatchMouseEvent',{type:'mousePressed',x:pts[0].x,y:pts[0].y,button:'left',buttons:1,clickCount:1,pointerType:'mouse'});
  await delay(SCRATCH_WAIT);
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];for(const t of [.35,.7,1]){await delay(40);await c.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,button:'left',buttons:1,pointerType:'mouse'});}await delay(SCRATCH_WAIT);}
  await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:pts[4].x,y:pts[4].y,button:'left',buttons:0,clickCount:1,pointerType:'mouse'});
  await delay(200);
  const opened=await ev('[...document.querySelectorAll(".scratch-cell.open")].length');
  return {opened,audio:await since()};
}
async function clickCells(expectScratch){
  await mark();
  const first=[];
  for(let i=0;i<9;i++){
    const skip=await ev(`document.querySelector('[data-testid=scratch-${i}]').classList.contains('open')`);
    if(skip)continue;
    await clickTry(`[data-testid=scratch-${i}]`);
    await delay(SCRATCH_WAIT);
    first.push(await ev('[...document.querySelectorAll(".scratch-cell.open")].length'));
    const done=await ev('document.querySelector("[data-role=lot-result]").textContent!=="揭开三个相同的图案"');
    if(done)break;
  }
  for(let i=0;i<9;i++){const skip=await ev(`document.querySelector('[data-testid=scratch-${i}]').classList.contains('open')`);if(!skip){await clickTry(`[data-testid=scratch-${i}]`);await delay(SCRATCH_WAIT);}}
  return {first,audio:await since(),expectScratch};
}
report.cards=0;report.seenEmpty=false;
function noteResult(text){if(text==='三个空信封，奖金 0 元')report.seenEmpty=true;}
await size(1366,768);
await c.send('Page.navigate',{url:pathToFileURL(path.join(root,'index.html')).href});
await waitUI();
await ev("localStorage.clear();localStorage.setItem('homeyear.tutorial','seen')");
await c.send('Page.reload',{ignoreCache:true});
await waitUI();
await ev(`(()=>{window.__audio=[];window.__nodes={osc:0,buf:0};window.__states=[];const orig=HomeYear.Audio.play.bind(HomeYear.Audio);HomeYear.Audio.play=function(kind){window.__audio.push(kind);const st=HomeYear.Audio.status();window.__states.push(st.state);return orig(kind);};const AC=window.AudioContext||window.webkitAudioContext;if(AC){const co=AC.prototype.createOscillator,cb=AC.prototype.createBufferSource;AC.prototype.createOscillator=function(){window.__nodes.osc++;return co.apply(this,arguments);};AC.prototype.createBufferSource=function(){window.__nodes.buf++;return cb.apply(this,arguments);};}})()`);
check('new-game controls',await ev('!!document.querySelector("[data-testid=seed]")&&!!document.querySelector("[data-testid=difficulty]")&&!!document.querySelector("[data-testid=new-game]")'));
await ev("(()=>{document.querySelector('[data-testid=seed]').value='LOAN-UI';document.querySelector('[data-testid=difficulty]').value='standard';})()");
await clickTry('[data-testid=new-game]');
if(await ev('document.querySelector("dialog").open&&document.querySelector("dialog").dataset.kind==="confirm"'))await clickTry('[data-testid=confirm-yes]');
const fresh=await snap();
check('fresh standard game',fresh&&fresh.seed==='LOAN-UI'&&fresh.difficulty==='standard'&&fresh.cash===300000&&fresh.loan.principal===0&&fresh.loan.interestDue===0&&fresh.week===1,fresh&&{seed:fresh.seed,cash:fresh.cash,week:fresh.week});
check('cash format', (await cashLine('HomeYear.UI.snapshot().cash')).ok);
check('houses label open',await ev('document.querySelector("[data-testid=houses]").textContent')==='逛逛住房');
check('no loan-due yet',await ev('!document.querySelector("[data-testid=loan-due]")'));
await clickTry('[data-action=help]');
const help=await ev(`(()=>{const d=document.querySelector('dialog');const hs=[...d.querySelectorAll('h3')];const para=name=>{const h=hs.find(el=>el.textContent===name);const p=h&&h.nextElementSibling;return p&&p.tagName==='P'?p.textContent:'';};return {kind:d.dataset.kind,title:d.querySelector('h2').textContent,credit:para('信用社'),lot:para('刮刮乐'),fee:para('交易与费用')};})()`);
check('help credit and lottery paragraphs',help.kind==='help'&&help.credit.includes('跨周')&&help.lot.includes('30 元'),{credit:help.credit&&help.credit.slice(0,40),lot:help.lot&&help.lot.slice(0,40)});
check('help buy-early copy',help.fee.includes('房价每周大约涨 1%')&&help.fee.includes('现金够最低档就先买钥匙'),help.fee&&help.fee.slice(0,80));
await closeDialog();
await clickTry('[data-testid=houses]');
const office=await ev(`(()=>{const fmt=n=>'¥'+(Number(n)/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});const s=HomeYear.UI.snapshot(),h=HomeYear.houses.find(x=>x.id==='studio'),btn=document.querySelector('[data-testid=house-studio]');const year=document.querySelector('[data-testid=year-end-studio]');const quote=HomeYear.houseQuote(s,'studio',52);const twoQuote=HomeYear.houseQuote(s,'two',52);const two=document.querySelector('[data-testid=year-end-two]');const note=document.querySelector('[data-testid=house-near-note]');const ending=(document.querySelector('[data-testid=flyer-studio] .flyer-price small')||{}).textContent||'';return {title:document.querySelector('#modal-title').textContent,kind:document.querySelector('dialog').dataset.kind,price:HomeYear.housePrice(s,h),cash:s.cash,disabled:!!(btn&&btn.disabled),action:btn&&btn.dataset.action,buys:document.querySelectorAll('[data-action=buy-house]').length,yearText:year?year.textContent:'',yearOk:!!year&&year.textContent==='若等到第 52 周，本日口径约 '+fmt(quote),twoOk:!!two&&two.textContent==='若等到第 52 周，本日口径约 '+fmt(twoQuote),note:note?note.textContent:'',ending,quote,twoQuote,twoPrice:HomeYear.housePrice(s,HomeYear.houses.find(x=>x.id==='two'))};})()`);
check('open office studio unaffordable',office.title==='一扇属于自己的门'&&office.kind==='houses'&&office.price===420000&&office.cash<420000&&office.disabled&&office.action==='buy-house'&&office.buys>0,office);
check('flyer year-end uses houseQuote 52',office.yearOk&&office.twoOk&&office.twoPrice===700000,{yearText:office.yearText,quote:office.quote,twoQuote:office.twoQuote,twoPrice:office.twoPrice});
check('near houses teach buy then upgrade',office.note==='先住进来，再换大的。升档按当周市价抵扣。',office.note);
check('studio ending copy',office.ending.includes('有了自己的门'),office.ending);
await closeDialog();
await mark();
await clickTry('[data-testid=open-credit]');
let heard=await since();
const book=await ev(`(()=>{const fmt=n=>'¥'+(n/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});const s=HomeYear.UI.snapshot();const rows=[...document.querySelectorAll('.passbook-row')].map(r=>r.textContent);return {kind:document.querySelector('dialog').dataset.kind,title:document.querySelector('#modal-title').textContent,rows,seal:document.querySelector('.passbook-seal').textContent,foot:document.querySelector('.bank-note').textContent,next:HomeYear.loanInterest(s),expect:['本金'+fmt(0),'待付利息'+fmt(0),'再过一周'+fmt(0)]};})()`);
check('credit dialog settled',book.kind==='credit'&&book.title==='信用社'&&book.seal==='结清'&&book.foot==='有贷款时，售楼处不接待。'&&book.expect.every((t,i)=>book.rows[i]===t),book);
{const reasons=await Promise.all(['repay-interest','repay-500','repay-all'].map(bank));check('no debt reason',reasons.every(r=>r&&r.disabled&&r.reason==='没有欠款'),reasons);const borrows=await Promise.all(['loan-500','loan-1000','loan-2000','loan-3000'].map(bank));check('borrow enabled',borrows.every(r=>r&&!r.disabled&&r.reason===''),borrows);}
check('credit open silent',countKind(heard,'credit-open')===0,heard);
check('credit scene named',await ev(`(()=>{const svg=document.querySelector("dialog .art-credit");if(!svg||!(svg.textContent||"").includes("信用社"))return false;const t=[...svg.querySelectorAll("text")].find(el=>el.textContent.includes("信用社"));if(!t)return false;const a=svg.getBoundingClientRect(),r=t.getBoundingClientRect();return r.width>8&&r.height>8&&r.top>=a.top-2&&r.bottom<=a.bottom+2;})()`));
await mark();
await clickTry('[data-testid=loan-1000]');
heard=await since();
const borrowed=await snap();
check('borrow 1000 fen',borrowed.loan.principal===100000&&borrowed.loan.interestDue===0&&borrowed.cash===fresh.cash+100000,{principal:borrowed.loan.principal,due:borrowed.loan.interestDue,cash:borrowed.cash});
const book2=await ev(`(()=>{const fmt=n=>'¥'+(n/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});const s=HomeYear.UI.snapshot();const rows=[...document.querySelectorAll('.passbook-row')].map(r=>r.textContent);return {rows,seal:document.querySelector('.passbook-seal').textContent,due:document.querySelector('[data-testid=loan-due]').textContent,expectDue:'未还贷款 '+fmt(s.loan.principal+s.loan.interestDue),nextRow:'再过一周'+fmt(HomeYear.loanInterest(s)),interest:HomeYear.loanInterest(s)};})()`);
check('open loan passbook',book2.seal==='未清'&&book2.interest===1500&&book2.rows[2]===book2.nextRow&&book2.due===book2.expectDue,book2);
{const borrows=await Promise.all(['loan-500','loan-1000','loan-2000','loan-3000'].map(bank));check('second borrow blocked',borrows.every(r=>r&&r.disabled&&r.reason==='已有贷款'),borrows);const interest=await bank('repay-interest');const part=await bank('repay-500');const all=await bank('repay-all');check('same-week repay reasons',interest&&interest.disabled&&interest.reason==='没有待付利息'&&part&&!part.disabled&&all&&!all.disabled,{interest,part,all});}
check('loan sound without another credit-open',countKind(heard,'loan')===1&&countKind(heard,'credit-open')===0,heard);
await closeDialog();
const mainHousing=await ev(`(()=>{const open=document.querySelector('dialog').open&&document.querySelector('dialog').dataset.kind==='houses';const app=document.querySelector('#app').textContent;return {open,studio:app.includes('老旧单间'),news:!!document.querySelector('[data-testid=housing-news]'),label:document.querySelector('[data-testid=houses]').textContent};})()`);
check('main screen still shows housing',!mainHousing.open&&mainHousing.label==='售楼处关门'&&(mainHousing.studio||mainHousing.news),mainHousing);
check('loan house hint beside closed office',await ev('!!document.querySelector(".loan-house-hint")&&document.querySelector(".loan-house-hint").textContent==="年底买房要先还清"'));
await mark();
await clickTry('[data-testid=houses]');
heard=await since();
const closed=await ev(`(()=>{const d=document.querySelector('dialog');return {title:d.querySelector('h2').textContent,kind:d.dataset.kind,text:d.querySelector('.dialog-body').textContent,go:!!d.querySelector('[data-testid=go-credit]'),buy:!!d.querySelector('[data-action=buy-house]'),house:!!d.querySelector('[data-testid^="house-"]')};})()`);
check('closed office',closed.title==='售楼处关门'&&closed.kind==='houses'&&closed.text.includes('贷款未清，售楼处暂停接待')&&closed.text.includes('年底买房要先还清')&&closed.text.includes('未还')&&closed.go&&!closed.buy&&!closed.house,{title:closed.title,buy:closed.buy,house:closed.house,text:closed.text.slice(0,80)});
check('refuse when office closed',countKind(heard,'refuse')===1,heard);
await mark();
await clickTry('[data-testid=go-credit]');
heard=await since();
check('go-credit opens credit',await ev('document.querySelector("dialog").dataset.kind')==='credit'&&countKind(heard,'credit-open')===0,heard);
await closeDialog();
await nextWeek();
let mid=await snap();
check('week interest 1500',mid.loan.principal===100000&&mid.loan.interestDue===1500,{principal:mid.loan.principal,due:mid.loan.interestDue,week:mid.week});
await clickTry('[data-testid=open-credit]');
await mark();await clickTry('[data-testid=repay-interest]');heard=await since();
mid=await snap();
check('interest cleared loan stays',mid.loan.interestDue===0&&mid.loan.principal===100000&&countKind(heard,'click')===1&&countKind(heard,'repay')===0,heard.concat([{due:mid.loan.interestDue,principal:mid.loan.principal}]));
check('interest button now empty',(await bank('repay-interest')).reason==='没有待付利息');
await mark();await clickTry('[data-testid=repay-500]');heard=await since();
mid=await snap();
check('partial principal repay is click',mid.loan.principal===50000&&mid.loan.interestDue===0&&countKind(heard,'click')===1&&countKind(heard,'repay')===0,{principal:mid.loan.principal,heard});
await closeDialog();
await nextWeek();
mid=await snap();
check('interest on remaining 500',mid.loan.principal===50000&&mid.loan.interestDue===750,{principal:mid.loan.principal,due:mid.loan.interestDue});
await clickTry('[data-testid=open-credit]');
await clickTry('[data-testid=repay-500]');
mid=await snap();
check('repay 500 leaves short debt',mid.loan.principal===750&&mid.loan.interestDue===0,{principal:mid.loan.principal,due:mid.loan.interestDue});
check('short debt reason',(await bank('repay-500')).disabled&&(await bank('repay-500')).reason==='欠款不足 500 元');
await mark();await clickTry('[data-testid=repay-all]');heard=await since();
mid=await snap();
check('repay all clears and plays repay',mid.loan.principal===0&&mid.loan.interestDue===0&&countKind(heard,'repay')===1,{heard,principal:mid.loan.principal});
check('seal settled and houses reopen',await ev('document.querySelector(".passbook-seal").textContent')==='结清'&&await ev('!document.querySelector("[data-testid=loan-due]")')&&await ev('document.querySelector("[data-testid=houses]").textContent')==='逛逛住房');
await closeDialog();
await clickTry('[data-testid=houses]');
check('office sells again',await ev('document.querySelector("#modal-title").textContent==="一扇属于自己的门"&&document.querySelectorAll("[data-action=buy-house]").length>0&&!!document.querySelector("[data-testid=house-studio]")'));
await closeDialog();
const openedAudio=await lotteryOpen();
const lot=await ev(`(()=>{const d=document.querySelector('dialog');const b=d.querySelector('[data-testid=lottery-buy]');const svgEl=d.querySelector('.art-scratch');const svg=(svgEl||{}).textContent||'';const t=svgEl&&[...svgEl.querySelectorAll('text')].find(el=>el.textContent.includes('幸运刮刮乐'));let inFrame=false;if(svgEl&&t){const a=svgEl.getBoundingClientRect(),r=t.getBoundingClientRect();inFrame=r.width>8&&r.height>8&&r.top>=a.top-2&&r.bottom<=a.bottom+2&&r.left>=a.left-2&&r.right<=a.right+2;}return {kind:d.dataset.kind,title:d.querySelector('h2').textContent,text:d.textContent,buy:b.textContent,disabled:!!b.disabled,session:!!d.querySelector('[data-role=lot-session]'),banner:svg.includes('幸运刮刮乐'),bannerInFrame:inFrame,hint:d.textContent.includes('格已揭开')};})()`);
check('lottery stand',lot.kind==='lottery'&&lot.title==='街口刮刮乐'&&lot.text.includes('30 元')&&lot.text.includes('空信封 0')&&lot.text.includes('钥匙 1200')&&lot.text.includes('期望返还约 78%，不限张数，亏了不补')&&lot.buy==='刮一张 · 30元'&&!lot.disabled&&lot.session&&lot.banner&&lot.bannerInFrame&&!lot.hint, {title:lot.title,buy:lot.buy,banner:lot.banner,bannerInFrame:lot.bannerInFrame,hint:lot.hint});
check('lottery open silent',countKind(openedAudio,'lottery-open')===0,openedAudio);
let row=await buyCard();report.cards++;
check('cash masked before reveal',maskOk(row),row);
check('no scratch counter',await ev('!document.querySelector(".scratch-hint-bar")&&!(document.querySelector("dialog").textContent||"").includes("格已揭开")'));
let drag=await dragCard();
check('drag opens more than one cell',drag.opened>1,{opened:drag.opened,scratch:drag.audio.filter(k=>k==='scratch')});
check('drag scratch while motion on',drag.audio.includes('scratch'),drag.audio.filter(k=>k==='scratch'||k.startsWith('prize-')));
if(await ev('document.querySelector("[data-role=lot-result]").textContent==="揭开三个相同的图案"'))await clickCells(true);
let done=await resultNow();noteResult(done.text);
check('revealed cash and prize line',done.formatOk&&done.cashOk&&done.kind==='lottery',done);
check('prize sound matches triple',countKind(drag.audio,'scratch')>=1&&(done.text?(await ev('window.__audio.filter(k=>k==="'+prizeKindOf(done.text)+'").length>=1')):false),{text:done.text,kind:prizeKindOf(done.text)});
if(!done.formatOk){await mark();await clickTry('[data-testid=lottery-reveal-all]');await waitTicketSettled();done=await resultNow();noteResult(done.text);}
check('again button after reveal',done.buyText==='再刮一张'&&done.buyDisabled===false&&done.open,{buy:done.buyText,disabled:done.buyDisabled});
row=await buyCard();report.cards++;
check('again stays in dialog and locks',maskOk(row)&&row.open,row);
const cell=await clickCells(true);
check('cell by cell first open is one',cell.first[0]===1,{first:cell.first.slice(0,4)});
done=await resultNow();noteResult(done.text);
const cellPrizes=cell.audio.filter(k=>k.startsWith('prize-'));
check('cell reveal one prize and scratch',cell.audio.includes('scratch')&&cellPrizes.length===1&&cellPrizes[0]===prizeKindOf(done.text),{text:done.text,prizes:cellPrizes,scratch:cell.audio.filter(k=>k==='scratch').length});
check('again enabled inside dialog',done.kind==='lottery'&&done.open&&done.buyText==='再刮一张'&&done.buyDisabled===false);
row=await buyCard();report.cards++;
check('second masked card',maskOk(row),row);
const maskedCash=row.shown;
await escapeKey();
let cleared=await cashLine('HomeYear.UI.snapshot().cash');
check('escape unrevealed shows book cash',await ev('!document.querySelector("dialog").open')&&cleared.ok&&cleared.shown!==maskedCash,{shown:cleared.shown,expect:cleared.expect});
await lotteryOpen();
row=await buyCard();report.cards++;
check('mask before close button',maskOk(row),row);
await clickTry('dialog [data-action=close]');
cleared=await cashLine('HomeYear.UI.snapshot().cash');
check('close button clears mask',await ev('!document.querySelector("dialog").open')&&cleared.ok,cleared);
await lotteryOpen();
row=await buyCard();report.cards++;
check('mask before reveal all',maskOk(row),row);
await mark();
await clickTry('[data-testid=lottery-reveal-all]');
await waitTicketSettled();
heard=await since();
done=await resultNow();noteResult(done.text);
check('reveal all shows prize once',done.formatOk&&done.cashOk&&heard.filter(k=>k.startsWith('prize-')).length===1&&heard.filter(k=>k.startsWith('prize-'))[0]===prizeKindOf(done.text),{text:done.text,heard:heard.filter(k=>k==='scratch'||k.startsWith('prize-'))});
await closeDialog();
await clickTry('[data-action=settings]');
await ev("(()=>{const e=document.querySelector('[data-setting=animation]');e.value='off';e.dispatchEvent(new Event('change',{bubbles:true}));})()");
check('animation off',await ev("HomeYear.UI.settings().animation==='off'"));
await closeDialog();
await lotteryOpen();
row=await buyCard();report.cards++;
await mark();
for(let i=0;i<9;i++){if(!await ev(`document.querySelector('[data-testid=scratch-${i}]').classList.contains('open')`)){await clickTry(`[data-testid=scratch-${i}]`);await delay(SCRATCH_WAIT);}}
heard=await since();
done=await resultNow();noteResult(done.text);
check('reduced motion no scratch one prize',!heard.includes('scratch')&&heard.filter(k=>k.startsWith('prize-')).length===1&&heard.filter(k=>k.startsWith('prize-'))[0]===prizeKindOf(done.text),{text:done.text,heard});
while(!report.seenEmpty&&report.cards<40){
  if(await ev('document.querySelector("[data-role=lot-result]").textContent==="揭开三个相同的图案"')){await clickTry('[data-testid=lottery-reveal-all]');await waitTicketSettled();}
  done=await resultNow();noteResult(done.text);
  if(report.seenEmpty)break;
  if(report.cards>=40)break;
  if(done.buyDisabled)break;
  await clickTry('[data-testid=lottery-buy]');report.cards++;
}
check('saw empty envelope within 40',report.seenEmpty,{cards:report.cards});
await ev("(()=>{const e=document.querySelector('[data-setting=animation]');if(!e)return;e.value='normal';e.dispatchEvent(new Event('change',{bubbles:true}));})()");
await closeDialog();
await clickTry('[data-testid=open-credit]');
await clickTry('[data-testid=loan-1000]');
await closeDialog();
for(const [w,h,tag] of [[1366,768,'1366'],[390,844,'390']]){
  await size(w,h);
  await closeDialog();
  await clickTry('[data-testid=open-credit]');
  let lay=await layoutOf();
  check('credit inside '+tag,lay.inside&&!lay.overflow&&lay.bad.length===0&&lay.kind==='credit',lay);
  await shot('credit-'+tag);
  await closeDialog();
  await clickTry('[data-testid=houses]');
  lay=await layoutOf();
  const closedOk=await ev('document.querySelector("#modal-title").textContent==="售楼处关门"&&!document.querySelector("[data-action=buy-house]")');
  check('closed office inside '+tag,lay.inside&&!lay.overflow&&lay.bad.length===0&&lay.kind==='houses'&&closedOk,lay);
  await shot('office-'+tag);
  await closeDialog();
  await clickTry('[data-testid=open-lottery]');
  if(!await ev('document.querySelector("[data-testid=scratch-0]")'))await buyCard();
  lay=await layoutOf();
  check('scratch inside '+tag,lay.inside&&!lay.overflow&&lay.bad.length===0&&lay.kind==='lottery'&&lay.cells.length===9&&lay.minCell>=44,lay);
  await shot('scratch-'+tag);
  await closeDialog();
}
await size(1366,768);
let poor;
try{poor=await ev(POOR,30000);}catch(e){poor=null;check('poor fixture',false,String(e.message).slice(0,240));}
if(poor){
  const imported=await importState(poor);
  check('poor import',imported.ok===true,imported.diff||imported.detail||imported);
  await closeDialog();
  await clickTry('[data-testid=open-credit]');
  const b500=await bank('loan-500'),r500=await bank('repay-500'),rall=await bank('repay-all'),rint=await bank('repay-interest');
  check('poor credit reasons',b500.reason==='已有贷款'&&b500.disabled&&r500.reason==='现金不足'&&r500.disabled&&rall.reason==='现金不足'&&rint.reason==='没有待付利息',{b500,r500,rall,rint});
  await closeDialog();
  await clickTry('[data-testid=open-lottery]');
  const poorBuy=await ev(`(()=>{const b=document.querySelector('[data-testid=lottery-buy]');const reason=(b.closest('.bank-choice').querySelector('.bank-reason')||{}).textContent||'';return {disabled:!!b.disabled,reason,text:b.textContent};})()`);
  check('lottery cash short',poorBuy.disabled&&poorBuy.reason==='现金不够一张',poorBuy);
  await closeDialog();
}
let rich;
try{rich=await ev(RICH,20000);}catch(e){rich=null;check('rich fixture',false,String(e.message).slice(0,240));}
if(rich){
  const imported=await importState(rich);
  check('rich import',imported.ok===true&&imported.status==='playing',imported.diff||imported.detail||imported);
  await clickTry('[data-testid=open-credit]');
  await clickTry('[data-testid=loan-1000]');
  await closeDialog();
  await mark();
  await clickTry('[data-testid=houses]');
  heard=await since();
  check('rich office refuses',await ev('document.querySelector("#modal-title").textContent')==='售楼处关门'&&countKind(heard,'refuse')>=1);
  await closeDialog();
  await clickTry('[data-testid=open-credit]');
  await clickTry('[data-testid=repay-all]');
  const clearedLoan=await snap();
  check('same-week repay accrues 0',clearedLoan.loan.principal===0&&clearedLoan.loan.interestDue===0&&clearedLoan.stats.loanInterestAccrued===0&&clearedLoan.stats.loanInterestPaid===0,{due:clearedLoan.loan.interestDue,accrued:clearedLoan.stats.loanInterestAccrued,paid:clearedLoan.stats.loanInterestPaid});
  await closeDialog();
  check('houses label after clear',await ev('document.querySelector("[data-testid=houses]").textContent')==='逛逛住房');
  await clickTry('[data-testid=houses]');
  await clickTry('[data-testid=house-studio]');
  check('buy confirms',await ev('document.querySelector("dialog").dataset.kind')==='confirm');
  await clickTry('[data-testid=confirm-yes]');
  const owned=await snap();
  check('bought studio',owned.house==='studio',{house:owned.house,cash:owned.cash});
  await shot('studio');
  await closeDialog();
}
let story=null;
try{story=await ev(STORY,60000);}catch(e){report.storybook='not reached: '+String(e.message).slice(0,300);report.notes.push(report.storybook);}
if(story){
  const imported=await importState(story);
  check('year-end import',imported.ok===true&&imported.status==='ended'&&imported.dialog==='result',imported.diff||imported.detail||imported.dialog);
  const rows=await ev(`(()=>{const labels=['贷款借入','已还本金','已付利息','未还本金','未还利息','扣贷款后','彩票支出','彩票奖金'];const t=document.querySelector('dialog').innerText;return {kind:document.querySelector('dialog').dataset.kind,title:document.querySelector('#modal-title').textContent,missing:labels.filter(x=>!t.includes(x))};})()`);
  check('storybook loan and lottery rows',rows.kind==='result'&&rows.title==='这一年的故事'&&rows.missing.length===0,rows);
  await shot('storybook');
  await closeDialog();
  await clickTry('[data-testid=open-credit]');
  const endedReasons=await Promise.all(['loan-1000','loan-500','repay-all','repay-interest','repay-500'].map(bank));
  check('ended year blocks credit',endedReasons.every(r=>r&&r.disabled&&r.reason==='本年已结束'),endedReasons);
  await closeDialog();
}else report.notes.push(report.storybook||'storybook was not reached');
if(report.storybook){}
await closeDialog();
await clickTry('[data-action=home]');
if(await ev('document.querySelector("dialog").open&&document.querySelector("dialog").dataset.kind==="confirm"'))await clickTry('[data-testid=confirm-yes]');
await ev("(()=>{document.querySelector('[data-testid=seed]').value='EASY-W1';document.querySelector('[data-testid=difficulty]').value='easy';})()");
await clickTry('[data-testid=new-game]');
if(await ev('document.querySelector("dialog").open&&document.querySelector("dialog").dataset.kind==="confirm"'))await clickTry('[data-testid=confirm-yes]');
const easy=await snap();
check('easy week-1 cash below studio',easy&&easy.difficulty==='easy'&&easy.week===1&&easy.cash<520000&&easy.priceBook.houses.studio===520000,{cash:easy&&easy.cash,studio:easy&&easy.priceBook&&easy.priceBook.houses.studio});
await clickTry('[data-testid=houses]');
check('easy office unaffordable',await ev('(()=>{const s=HomeYear.UI.snapshot(),btn=document.querySelector("[data-testid=house-studio]");return document.querySelector("#modal-title").textContent==="一扇属于自己的门"&&s.cash<HomeYear.housePrice(s,HomeYear.houses[0])&&!!(btn&&btn.disabled);})()'));
await closeDialog();
const nudgeState=await ev(`(()=>{const H=HomeYear,e=new H.Engine('NUDGE-CASH','standard');const s=e.snapshot();const target=H.housePrice(s,H.houses[0])+200000;const need=target-s.cash;s.cash+=need;s.stats.grants+=need;H.record(s);H.validate(s);e.restore(s);return e.snapshot();})()`);
const nudged=await importState(nudgeState);
check('nudge state imported',nudged.ok===true&&nudged.status==='playing',nudged.diff||nudged.detail||nudged.status);
await closeDialog();
await clickTry('[data-testid=next-week]');
for(let i=0;i<4;i++){if(await ev('document.querySelector("dialog").open'))await escapeKey();}
const toastText=await ev('(()=>{const n=document.querySelector("#toasts");return n?n.textContent:"";})()');
check('first affordable nudge',toastText.includes('现金已经够老旧单间')&&toastText.includes('房价每周大约涨 1%'),toastText.slice(0,120));
await ev('document.querySelector("#toasts").innerHTML=""');
await clickTry('[data-testid=next-week]');
for(let i=0;i<4;i++){if(await ev('document.querySelector("dialog").open'))await escapeKey();}
const toastAgain=await ev('(()=>{const n=document.querySelector("#toasts");return n?n.textContent:"";})()');
check('nudge does not repeat same seed',!toastAgain.includes('现金已经够老旧单间'),toastAgain.slice(0,120));
await closeDialog();
await clickTry('[data-action=settings]');
await clickTry('[data-setting=sound]');
const soundOff=await ev('HomeYear.UI.settings().sound===false');
check('sound unchecked',soundOff);
const probe=await ev(`(()=>{const st=HomeYear.Audio.status();const o0=window.__nodes.osc,b0=window.__nodes.buf;HomeYear.Audio.play('credit-open');return {state:st.state,sound:HomeYear.UI.settings().sound,osc:window.__nodes.osc-o0,buf:window.__nodes.buf-b0,ran:window.__states.includes('running'),totalOsc:window.__nodes.osc,totalBuf:window.__nodes.buf};})()`);
report.audio=probe;
if(probe.state==='running'){check('silence when sound off',probe.sound===false&&probe.osc===0&&probe.buf===0,probe);report.audio.silence='checked while AudioContext running';}
else{report.audio.silence='only checked at the settings.sound guard';report.notes.push('silence-when-off was only checked at the settings.sound guard');}
if(probe.state!=='running'||!probe.ran){report.audio.speaker='unverified';report.notes.push('speaker output unverified because AudioContext was not running');}
else report.audio.speaker=probe.totalOsc+probe.totalBuf>0?'audio graph ran; physical speaker not measured':'running context produced no nodes before the muted probe';
check('no runtime exceptions or http(s) requests',report.errors.length===0&&report.external.length===0,{errors:report.errors.slice(0,8),external:report.external.slice(0,8)});
}catch(e){report.fatal=String(e&&e.stack||e).slice(0,1200);console.error(e);}finally{
report.summary={passed:report.checks.filter(x=>x.pass).length,failed:report.failures.length,cards:report.cards,seenEmpty:report.seenEmpty};
report.shots=report.shots.map(f=>f);
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({summary:report.summary,fatal:report.fatal,failures:report.failures,audio:report.audio,notes:report.notes,shots:report.shots,storybook:report.storybook||'reached'},null,2));
try{if(edge)await edge.cleanup();}catch(err){report.notes.push('cleanup: '+String(err.message||err).slice(0,200));}
if(report.fatal||report.failures.length)process.exitCode=1;
}})();
