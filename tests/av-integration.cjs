'use strict';
// Final AV integration checks on the real index.html (headless Edge, file://):
// 1) a rejected AudioContext resume shows a clickable "enable sound" prompt, and a real click on it starts audio and removes it;
// 2) after a real (trusted, CDP mouse) click the music scheduler is running, then 60s idle CPU is measured while music plays;
// 3) hidden page / music off stop the scheduler. Digital state only: says nothing about audible output or listening quality.
// Usage: node tests/av-integration.cjs [--idle 60]
const {launchEdge,delay}=require('./cdp-helper.cjs');const fs=require('node:fs/promises'),path=require('node:path'),{pathToFileURL}=require('node:url');
const argv=process.argv.slice(2),IDLE=argv.includes('--idle')?Number(argv[argv.indexOf('--idle')+1]):60;
const out=path.resolve(__dirname,'../docs/av-visual-evidence');const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
const report={kind:'real Edge headless file:// with trusted CDP mouse input; digital signals only, not listening tests',started:new Date().toISOString(),checks:[],metrics:{},errors:[]};
let c;const ev=x=>c.evaluate(x);
function ck(name,pass,detail){report.checks.push({name,pass:!!pass,...(detail!==undefined?{detail}:{})});if(!pass)console.error('FAIL',name,JSON.stringify(detail));}
async function realClick(sel){const r=await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)throw Error('missing '+${JSON.stringify(sel)});e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2}})()`);for(const type of ['mousePressed','mouseReleased'])await c.send('Input.dispatchMouseEvent',{type,x:r.x,y:r.y,button:'left',clickCount:1});await delay(300);}
async function load(pre){await c.send('Page.navigate',{url});for(let i=0;i<100;i++){if(await ev('document.readyState==="complete"&&!!window.HomeYear?.UI'))break;await delay(50);}if(pre)await ev(pre);}
// Sets a settings checkbox only when it differs, so the run never depends on the saved preference order.
async function setSetting(name,want){const changed=await ev(`(()=>{const e=document.querySelector('[data-setting=${name}]');if(!e)return false;if(!!e.checked===${want})return false;e.click();return true})()`);if(changed)await delay(400);return changed;}
// Public fixture: import a separately advanced engine snapshot through the settings dialog (same pattern as
// acceptance-final / av-visual), optionally granting cash and ending the year. No core or private state touched.
async function fixture({week=1,cash=0,house=null,end=false,seed='AV-INTEG'}){
 const raw=await ev(`(()=>{const e=new HomeYear.Engine(${JSON.stringify(seed)},'standard');let t=0;const d=(type,id)=>{const v=e.visible();const r=e.dispatch({type,id,revision:v.revision,token:'fx'+(++t)});if(!r.ok)throw Error(r.error)};for(let w=1;w<${week};w++)d('next');let s=e.snapshot();if(${cash}){s.cash+=${cash};s.stats.grants+=${cash};HomeYear.record(s);e.restore(s);}if(${JSON.stringify(house)})d('house',${JSON.stringify(house)});if(${end})d('end');return JSON.stringify(e.snapshot())})()`);
 if(await ev('document.querySelector("dialog").open'))await ev(`document.querySelector('[data-action=close]').click()`);
 await ev(`document.querySelector('[data-action=settings]').click()`);await delay(200);
 await ev(`(()=>{const t=document.querySelector('[data-testid=save-text]');t.value=${JSON.stringify(raw)};t.dispatchEvent(new Event('input',{bubbles:true}))})()`);
 await ev(`document.querySelector('[data-testid=import]').click()`);await delay(200);
 await ev(`document.querySelector('[data-testid=confirm-yes]').click()`);await delay(400);
 // An ended snapshot opens the year-end storybook; keep it open so the caller can inspect the result dialog.
 if(!end&&await ev('document.querySelector("dialog").open'))await ev(`document.querySelector('[data-action=close]').click()`);
 await delay(200);
}
const status=()=>ev('HomeYear.Audio.status()');
(async()=>{let edge;try{
 edge=await launchEdge();c=edge.cdp;report.browser=edge.version.Browser;await c.send('Page.enable');await c.send('Runtime.enable');await c.send('Performance.enable');
 c.on('Runtime.exceptionThrown',p=>report.errors.push(p.exceptionDetails.exception?p.exceptionDetails.exception.description:p.exceptionDetails.text));
 await c.send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
 // Count live setInterval timers so "one scheduler" can be asserted.
 await c.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.qaIntervals=new Set();const si=setInterval,ci=clearInterval;window.setInterval=function(...a){const id=si(...a);qaIntervals.add(id);return id};window.clearInterval=function(id){qaIntervals.delete(id);return ci(id)};
  if(location.search.includes('block'))(()=>{const N=window.AudioContext,R=N.prototype.resume;
   // Emulate an autoplay block: new contexts start suspended and resume() rejects until __allowResume.
   window.AudioContext=function(...a){const ac=new N(...a);ac.suspend();return ac};window.AudioContext.prototype=N.prototype;
   N.prototype.resume=function(){return window.__allowResume?R.call(this):Promise.reject(new DOMException('blocked by QA','NotAllowedError'))};})();`});

 // --- 1) blocked resume → prompt → real click recovers ---
 await c.send('Page.navigate',{url:url+'?block'});await delay(800);await ev(`localStorage.clear()`);await c.send('Page.navigate',{url:url+'?block'});await delay(800);
 ck('no AudioContext before any interaction',(await status()).state==='uncreated');
 await realClick('[data-testid=new-game]');await delay(1400);
 let st=await status();const prompt=await ev(`(()=>{const e=document.getElementById('audio-enable');if(!e)return null;const r=e.getBoundingClientRect();return {text:e.textContent,visible:r.width>0&&r.bottom<=innerHeight&&r.right<=innerWidth}})()`);
 ck('rejected resume sets needsGesture and shows a visible clickable prompt (no silent fake playback)',st.needsGesture===true&&st.state!=='running'&&prompt&&prompt.visible,{st:{state:st.state,needsGesture:st.needsGesture,musicRunning:st.musicRunning},prompt});
 const st0=await status();report.metrics.blockedStatus={state:st0.state,needsGesture:st0.needsGesture,musicRunning:st0.musicRunning,playing:st0.playing,queued:st0.queued,musicWanted:st0.musicWanted};
 ck('blocked context: status().playing is false and nothing is queued (no idle scheduling)',st0.playing===false&&!st0.queued,report.metrics.blockedStatus);
 ck('blocked context: musicRunning stays false (no idle scheduler while the context cannot run)',st0.musicRunning===false&&(await ev('qaIntervals.size'))===0,report.metrics.blockedStatus);
 ck('blocked context: the music request is remembered for recovery',st0.musicWanted===true&&st0.cue===null,report.metrics.blockedStatus);
 await ev('window.__allowResume=true');await realClick('#audio-enable');await delay(900);
 st=await status();ck('real click on prompt resumes audio, starts the scheduler exactly once and removes the prompt',st.state==='running'&&!st.needsGesture&&st.musicRunning===true&&st.playing===true&&(await ev('qaIntervals.size'))===1&&!(await ev(`!!document.getElementById('audio-enable')`)),{state:st.state,needsGesture:st.needsGesture,musicRunning:st.musicRunning,intervals:await ev('qaIntervals.size'),cue:st.cue});

 // --- 2) trusted click starts music; idle CPU while music actually schedules ---
 await load('localStorage.clear()');await load();
 await realClick('[data-testid=new-game]');await delay(500);if(await ev(`!!document.querySelector('[data-action=tour-finish]')`))await realClick('[data-action=tour-finish]');await delay(1500);
 st=await status();ck('trusted click: context running, music playing, single interval',st.state==='running'&&st.musicRunning&&st.playing===true&&(await ev('qaIntervals.size'))===1,{state:st.state,musicRunning:st.musicRunning,intervals:await ev('qaIntervals.size'),cue:st.cue});
 ck('audio cue follows the visual phase (early at standard start)',st.target==='early'&&(await ev('document.body.dataset.phase'))==='early',{target:st.target,cue:st.cue,phase:await ev('document.body.dataset.phase')});
  const m0=await c.send('Performance.getMetrics'),w0=Date.now(),s0=await status();await delay(IDLE*1000);const m1=await c.send('Performance.getMetrics'),wall=(Date.now()-w0)/1000,s1=await status();
  const get=(m,k)=>(m.metrics.find(x=>x.name===k)||{}).value||0,task=get(m1,'TaskDuration')-get(m0,'TaskDuration'),script=get(m1,'ScriptDuration')-get(m0,'ScriptDuration');
  const phase1=await ev('document.body.dataset.phase');
  report.metrics.idleMusic={seconds:+wall.toFixed(2),taskDurationSeconds:+task.toFixed(3),percent:+(task/wall*100).toFixed(3),scriptPercent:+(script/wall*100).toFixed(3),state:s1.state,musicRunning:s1.musicRunning,target:s1.target,phase:phase1,cue:s1.cue,bar0:s0.bar,bar1:s1.bar,section0:s0.section,section1:s1.section,switches:s1.switches,voices:s1.voices,queued:s1.queued,timers:await ev('qaIntervals.size'),note:'main-thread TaskDuration only; Web Audio rendering runs on the audio thread and is not included'};
  ck(`music playing ${IDLE}s idle: scheduler kept running (bars advanced)`,s1.musicRunning&&s1.state==='running'&&(s1.bar!==s0.bar||s1.section!==s0.section||s1.lastSwitchAt!==s0.lastSwitchAt),report.metrics.idleMusic);
  ck(`music playing ${IDLE}s idle: exactly one timer, voices <= 64, cue still matches the visual phase (no drift)`,report.metrics.idleMusic.timers===1&&s1.voices<=64&&s1.cue===s1.target&&s1.target===phase1,report.metrics.idleMusic);
  ck(`music playing ${IDLE}s idle: main-thread TaskDuration < 3% of wall time (headless baseline)`,task/wall<.03,report.metrics.idleMusic);

 // --- 3) hidden page / music off ---
 const hid=await ev(`(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));const s=HomeYear.Audio.status();delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));return {musicRunning:s.musicRunning,playing:s.playing,intervals:qaIntervals.size}})()`);
 ck('simulated hidden page stops the music scheduler',!hid.musicRunning&&!hid.playing,hid);await delay(600);
 await realClick('[data-action=settings]');await realClick('[data-setting=music]');await delay(300);st=await status();
 ck('music off via real click stops scheduler; no prompt left behind',!st.musicRunning&&(await ev('qaIntervals.size'))===0&&!(await ev(`!!document.getElementById('audio-enable')`)),{musicRunning:st.musicRunning,intervals:await ev('qaIntervals.size')});

 // --- 4) late-created engine keeps the hysteresis memory (sound off while crossing 0.90 and falling back) ---
 // Saved preference both off + reload: no engine is created, so the module's lastPhase keeps moving on its own.
 await load('localStorage.clear()');
 await ev(`localStorage.setItem('homeyear.settings.v1',JSON.stringify({autoSave:true,sound:false,music:false,animation:'normal',numberFormat:'decimal'}))`);
 await load();
 st=await status();ck('music+sound off from a saved preference: no context, no scheduler, no engine cue',st.state==='uncreated'&&st.musicRunning===false&&!st.playing&&(await ev('qaIntervals.size'))===0&&st.cue===null,{state:st.state,musicRunning:st.musicRunning,cue:st.cue,intervals:await ev('qaIntervals.size')});
 const due=await ev(`HomeYear.housePrice(new HomeYear.Engine('AV-LATE','standard').visible(),HomeYear.houses[0])`);
 const base=await ev(`(()=>{const e=new HomeYear.Engine('AV-LATE','standard');for(let w=1;w<10;w++){const v=e.visible();e.dispatch({type:'next',revision:v.revision,token:'l'+w})}return e.visible().cash})()`);
 const lateSteps=[];for(const [label,p] of [['p.50',.5],['p.92',.92],['p.85',.85]]){await fixture({week:10,cash:Math.round(p*due)-base,seed:'AV-LATE'});lateSteps.push({label,progress:(await ev('HomeYear.UI.audioScene()')).progress,phase:await ev('document.body.dataset.phase'),cue:(await status()).cue,timers:await ev('qaIntervals.size')});}
 report.metrics.lateEngine={steps:lateSteps,base};
 ck('while sound is off the visual phase still follows the hysteresis (0.50 → early, 0.92/0.85 → development)',lateSteps[0].phase==='early'&&lateSteps[1].phase==='development'&&lateSteps[2].phase==='development',lateSteps);
 ck('no engine and no scheduler are created while sound is off',lateSteps.every(s=>s.cue===null&&s.timers===0),lateSteps);
 await realClick('[data-action=settings]');await setSetting('music',true);await delay(1500);await realClick('[data-action=close]');await delay(500);
 st=await status();
 ck('late engine keeps lastPhase: music starts on the phase the picture already shows (no early/dev mismatch)',st.target==='development'&&st.cue==='development'&&(await ev('document.body.dataset.phase'))==='development'&&st.musicRunning===true&&st.playing===true,{target:st.target,cue:st.cue,phase:await ev('document.body.dataset.phase'),musicRunning:st.musicRunning,switches:st.switches});
 ck('late engine starts the scheduler exactly once (single fresh switch)',(await ev('qaIntervals.size'))===1&&st.switches===1,{intervals:await ev('qaIntervals.size'),switches:st.switches});

 // --- 5) the real year-end storybook must not duck the ending cue; transient dialogs still do ---
 await fixture({week:52,cash:2000000,house:'two',end:true,seed:'AV-END'});
 const rb=await ev(`(()=>{const d=document.querySelector('dialog'),s=HomeYear.Audio.status();return {open:d.open,kind:d.dataset.kind,storybook:!!d.querySelector('.storybook'),dialogOpen:HomeYear.UI.audioScene().dialogOpen,dialog:HomeYear.UI.audioScene().dialog,layers:s.layers.dialog,cue:s.cue,target:s.target}})()`);
 report.metrics.resultDialog=rb;
 ck('real result dialog reports dialogOpen=false (ending cue not pushed through the dialog mix)',rb.open===true&&rb.kind==='result'&&rb.storybook===true&&rb.dialogOpen===false&&rb.dialog==='result'&&rb.layers===false,rb);
 await delay(3000);st=await status();const rb2=await ev(`({layers:HomeYear.Audio.status().layers.dialog,phase:document.body.dataset.phase})`);
 ck('ending cue plays behind the storybook with the dialog mix off',st.cue==='ending-home'&&st.layers.dialog===false&&rb2.phase==='ending-home',{cue:st.cue,layers:st.layers,phase:rb2.phase});
 await realClick('[data-action=close]');await delay(400);const closed=await ev(`({open:document.querySelector('dialog').open,phase:document.body.dataset.phase,layers:HomeYear.Audio.status().layers.dialog,cue:HomeYear.Audio.status().cue})`);
 ck('closing the storybook keeps the ending cue and the un-ducked mix',closed.open===false&&closed.phase==='ending-home'&&closed.layers===false&&closed.cue==='ending-home',closed);
 await realClick('[data-action=settings]');await delay(400);const trans=await ev(`({levels:HomeYear.Audio.status().layers.dialog,open:document.querySelector('dialog').open,kind:document.querySelector('dialog').dataset.kind})`);
 ck('transient dialog over the ending cue still ducks (trade/houses/settings snapshot intact)',trans.levels===true&&trans.open===true&&trans.kind==='settings',trans);
 await realClick('[data-action=close]');await delay(300);const back=await ev('({levels:HomeYear.Audio.status().layers.dialog,open:document.querySelector("dialog").open})');
 ck('closing the transient dialog restores the un-ducked ending mix',back.levels===false&&back.open===false,back);
 ck('no runtime exceptions',report.errors.length===0,report.errors.slice(0,5));
}catch(e){report.fatal=e.stack||String(e);console.error(e);}
finally{if(edge)await edge.cleanup().catch(()=>{});report.finished=new Date().toISOString();report.summary={passed:report.checks.filter(x=>x.pass).length,failed:report.checks.filter(x=>!x.pass).length};await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'integration-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({summary:report.summary,metrics:report.metrics,fatal:report.fatal},null,1));if(report.fatal||report.summary.failed)process.exitCode=1;}})();
