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
 report.metrics.blockedStatus={state:st.state,needsGesture:st.needsGesture,musicRunning:st.musicRunning,playing:st.playing,queued:st.queued};
 ck('blocked context: status().playing is false and nothing is queued (no idle scheduling)',st.playing===false&&!st.queued,report.metrics.blockedStatus);
 await ev('window.__allowResume=true');await realClick('#audio-enable');await delay(900);
 st=await status();ck('real click on prompt resumes audio and removes the prompt',st.state==='running'&&!st.needsGesture&&!(await ev(`!!document.getElementById('audio-enable')`)),{state:st.state,needsGesture:st.needsGesture});

 // --- 2) trusted click starts music; idle CPU while music actually schedules ---
 await load('localStorage.clear()');await load();
 await realClick('[data-testid=new-game]');await delay(500);if(await ev(`!!document.querySelector('[data-action=tour-finish]')`))await realClick('[data-action=tour-finish]');await delay(1500);
 st=await status();ck('trusted click: context running, music playing, single interval',st.state==='running'&&st.musicRunning&&st.playing===true&&(await ev('qaIntervals.size'))===1,{state:st.state,musicRunning:st.musicRunning,intervals:await ev('qaIntervals.size'),cue:st.cue});
 ck('audio cue follows the visual phase (early at standard start)',st.target==='early'&&(await ev('document.body.dataset.phase'))==='early',{target:st.target,cue:st.cue,phase:await ev('document.body.dataset.phase')});
 const m0=await c.send('Performance.getMetrics'),w0=Date.now(),s0=await status();await delay(IDLE*1000);const m1=await c.send('Performance.getMetrics'),wall=(Date.now()-w0)/1000,s1=await status();
 const get=(m,k)=>(m.metrics.find(x=>x.name===k)||{}).value||0,task=get(m1,'TaskDuration')-get(m0,'TaskDuration'),script=get(m1,'ScriptDuration')-get(m0,'ScriptDuration');
 report.metrics.idleMusic={seconds:+wall.toFixed(2),taskDurationSeconds:+task.toFixed(3),percent:+(task/wall*100).toFixed(3),scriptPercent:+(script/wall*100).toFixed(3),state:s1.state,musicRunning:s1.musicRunning,cue:s1.cue,bar0:s0.bar,bar1:s1.bar,switches:s1.switches,voices:s1.voices,note:'main-thread TaskDuration only; Web Audio rendering runs on the audio thread and is not included'};
 ck(`music playing ${IDLE}s idle: scheduler kept running (bars advanced)`,s1.musicRunning&&s1.state==='running'&&(s1.bar!==s0.bar||s1.section!==s0.section||s1.lastSwitchAt!==s0.lastSwitchAt),report.metrics.idleMusic);
 ck(`music playing ${IDLE}s idle: main-thread TaskDuration < 3% of wall time (headless baseline)`,task/wall<.03,report.metrics.idleMusic);

 // --- 3) hidden page / music off ---
 const hid=await ev(`(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));const s=HomeYear.Audio.status();delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));return {musicRunning:s.musicRunning,playing:s.playing,intervals:qaIntervals.size}})()`);
 ck('simulated hidden page stops the music scheduler',!hid.musicRunning&&!hid.playing,hid);await delay(600);
 await realClick('[data-action=settings]');await realClick('[data-setting=music]');await delay(300);st=await status();
 ck('music off via real click stops scheduler; no prompt left behind',!st.musicRunning&&(await ev('qaIntervals.size'))===0&&!(await ev(`!!document.getElementById('audio-enable')`)),{musicRunning:st.musicRunning,intervals:await ev('qaIntervals.size')});
 ck('no runtime exceptions',report.errors.length===0,report.errors.slice(0,5));
}catch(e){report.fatal=e.stack||String(e);console.error(e);}
finally{if(edge)await edge.cleanup().catch(()=>{});report.finished=new Date().toISOString();report.summary={passed:report.checks.filter(x=>x.pass).length,failed:report.checks.filter(x=>!x.pass).length};await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'integration-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({summary:report.summary,metrics:report.metrics,fatal:report.fatal},null,1));if(report.fatal||report.summary.failed)process.exitCode=1;}})();
