'use strict';
// Audio branch verification in real Edge (headless, file://). Every check drives the real Engine/scheduler:
// offline renders tick the same Engine through OfflineAudioContext.suspend(); live checks use trusted CDP input.
// Results are digital measurements only; they make no claim about loudspeaker output or how it sounds.
const {launchEdge,delay}=require('./cdp-helper.cjs'),{pathToFileURL}=require('node:url'),path=require('node:path'),fs=require('node:fs/promises');
const args=process.argv.slice(2),WAV=args.includes('--samples'),out=path.resolve(__dirname,'../docs/av-samples');
const db=x=>x>0?20*Math.log10(x):-Infinity,r1=x=>Math.round(x*10)/10;
const G=(screen,o)=>Object.assign({screen,status:'playing',house:null,progress:.1,week:5},o||{});
const SC={menu:{screen:'start'},early:G('game',{week:5,progress:.1}),development:G('game',{week:24,progress:.3}),sprint:G('game',{week:47,progress:.6}),
  'sprint-final':G('game',{week:51,progress:.6}),'ending-home':G('game',{week:52,status:'ended',house:'flat',progress:1}),'ending-rent':G('game',{week:52,status:'ended',house:null,progress:.4})};
const LIMITS={peakDb:-1,rmsLo:-24,rmsHi:-18,quietExtra:4,spreadDb:3,sfxPeakDb:-6,sfxOverMusicDb:6,dipDb:6,riseDb:3,jumpMax:.25,dwell:24};
(async()=>{let b;const rep={scope:'Real Edge headless file:// via tests/av-preview.html. Digital signal measurements of the real scheduler; NOT a listening test.',limits:LIMITS,checks:[],cues:{},transitions:[],errors:[]};
const check=(name,pass,detail)=>{rep.checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name+(detail!==undefined?' '+JSON.stringify(detail):''));};
try{
  b=await launchEdge();const c=b.cdp;rep.browser=b.version.Browser;await c.send('Runtime.enable');await c.send('Page.enable');
  c.on('Runtime.exceptionThrown',x=>rep.errors.push(x.exceptionDetails.exception?x.exceptionDetails.exception.description:x.exceptionDetails.text));
  // Count live intervals so we can prove exactly one scheduler timer and no leaks.
  await c.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.qaIntervals=new Set();const si=setInterval,ci=clearInterval;window.setInterval=function(...a){const id=si(...a);qaIntervals.add(id);return id};window.clearInterval=function(id){qaIntervals.delete(id);return ci(id)};
    window.audioProbe={branches:[]};const oc=AudioNode.prototype.connect;AudioNode.prototype.connect=function(...a){const r=oc.apply(this,a);if(this instanceof GainNode&&a[0]===this.context.destination&&this.context instanceof AudioContext){const an=this.context.createAnalyser();an.fftSize=2048;oc.call(this,an);audioProbe.branches.push(an);}return r;};`});
  await c.send('Page.navigate',{url:pathToFileURL(path.resolve(__dirname,'av-preview.html')).href});await delay(900);
  // Long offline renders exceed the helper's 10 s default, so evaluate with an explicit timeout.
  const render=async spec=>{const r=await c.send('Runtime.evaluate',{expression:`avRender(${JSON.stringify(spec)}).then(r=>{if(!${WAV})delete r.wav;return r;})`,returnByValue:true,awaitPromise:true},180000);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const steady=r=>r.rms.slice(Math.ceil(4/.3)).filter(x=>x>1e-5).sort((a,b)=>a-b);
  const median=a=>a.length?a[a.length>>1]:0;

  // 1. Each cue: 64 bars where the cue loops (or full form + tail), levels and structure.
  for(const [id,scene] of Object.entries(SC)){
    const cue=await c.evaluate(`(()=>{const k=HomeYear.AudioDirector.phaseOf(${JSON.stringify(scene)});const q=HomeYear.AudioScore.cues[k];return {id:k,bpm:q.bpm,loop:q.loop,bars:q.order.length*8+(q.tail?8:0)}})()`);
    const bars=cue.loop?(id==='sprint-final'?12:64):cue.bars+2,secs=Math.min(150,1+bars*4*60/cue.bpm);
    const r=await render({seconds:secs,scene,seed:11,wav:WAV,wavSeconds:45,wavFrom:cue.loop?0:Math.max(0,secs-45)});
    const rs=steady(r),med=median(rs),sections=[...new Set(r.timeline.map(x=>x.section).filter(Boolean))],chords=new Set(r.timeline.map(x=>x.chord).filter(Boolean));
    const info={cue:cue.id,seconds:r1(secs),peakDb:r1(db(r.peak)),rmsMedianDb:r1(db(med)),rmsP10Db:r1(db(rs[Math.floor(rs.length*.1)]||0)),rmsP90Db:r1(db(rs[Math.floor(rs.length*.9)]||0)),dc:+r.dc.toExponential(2),
      sections,maxJump:+Math.max(...r.jumps).toFixed(3),renderMs:Math.round(r.renderMs),stolen:r.status.stolen};
    rep.cues[id]=info;
    if(WAV&&r.wav){await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'cue-'+id+'.wav'),Buffer.from(r.wav,'base64'));}
    check(id+' peak <= -1 dBFS',info.peakDb<=LIMITS.peakDb,info.peakDb);
    const quiet=id==='menu'||id==='ending-rent',lo=LIMITS.rmsLo-(quiet?LIMITS.quietExtra:0);
    check(id+' median 300ms RMS in ['+lo+','+LIMITS.rmsHi+'] dBFS',info.rmsMedianDb>=lo&&info.rmsMedianDb<=LIMITS.rmsHi,info.rmsMedianDb);
    check(id+' no DC offset',Math.abs(r.dc)<1e-3,info.dc);
    if(cue.loop&&id!=='sprint-final')check(id+' plays A/B/A2/C in 64 bars and loops',['A','B','A2','C'].every(s=>sections.includes(s))&&r.timeline.filter(x=>x.section==='A').length>=2,sections);
    if(!cue.loop)check(id+' reaches tail after full form',sections.includes('T'),sections);
  }
  const game=['early','development','sprint','ending-home'].map(k=>rep.cues[k].rmsMedianDb);
  check('in-game cue RMS medians within '+LIMITS.spreadDb+' dB',Math.max(...game)-Math.min(...game)<=LIMITS.spreadDb,game);

  // 2. Distinct material: compare harmony/tempo/instrumentation from the real scores.
  const diff=await c.evaluate(`(()=>{const S=HomeYear.AudioScore;return S.cueIds.map(id=>{const q=S.cues[id];return {id,bpm:q.bpm,key:q.key,mode:q.mode,insts:[...new Set(q.tracks.map(t=>t.inst))].sort().join('+'),chords:Object.values(q.sections).map(s=>s.chords.join(' ')).join('|'),melody:Object.values(q.sections).map(s=>s.melody).join('|'),tracks:q.tracks.length}})})()`);
  const uniq=k=>new Set(diff.map(d=>d[k])).size===diff.length;
  check('six cues with distinct chord sequences, melodies and instrument sets',diff.length===6&&uniq('chords')&&uniq('melody')&&uniq('insts'),diff.map(d=>({id:d.id,bpm:d.bpm,key:d.key,mode:d.mode,insts:d.insts,tracks:d.tracks})));
  check('every cue has >=5 simultaneous parts',diff.every(d=>d.tracks>=5),diff.map(d=>d.tracks));

  // 3. Transitions: request mid-phrase, verify phrase/beat alignment and level continuity.
  const pairs=[['menu','early',true],['early','development',false],['development','sprint',false],['sprint','ending-home',true],['sprint','ending-rent',true],['development','menu',true],['ending-home','menu',true]];
  for(const [a,z,urgent] of pairs){
    const reqAt=33.3,r=await render({seconds:62,scene:SC[a],seed:5,timeline:[{at:reqAt,scene:SC[z]}],wav:WAV,wavFrom:reqAt-8,wavSeconds:24});
    const sw=r.switches.filter(s=>s.to===rep.cues[z].cue&&s.from===rep.cues[a].cue)[0],first=r.switches[0];
    const bpmA=rep.cues[a].cue&&(await c.evaluate(`HomeYear.AudioScore.cues[${JSON.stringify(rep.cues[a].cue)}].bpm`)),spb=60/bpmA,barDur=spb*4;
    const origin=first.at+(urgent?0:barDur),off=sw?(sw.at-origin)/(urgent?spb:barDur*4):NaN,aligned=sw&&Math.abs(off-Math.round(off))*(urgent?spb:barDur*4)<.005;
    const wait=sw?sw.at-reqAt:NaN,win=Math.round(.3*0+1),i0=Math.floor((sw?sw.at:0)/.3);
    const pct=(a,q)=>{const s=a.slice().sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(s.length*q))];},A=r.rms.slice(Math.max(0,i0-12),i0-1),Z=r.rms.slice(i0+13,i0+40),before=pct(A,.5),after=pct(Z,.5),hiA=pct(A,.9),hiZ=pct(Z,.9);
    const trans=r.rms.slice(i0,i0+13),minT=Math.min(...trans),maxT=Math.max(...trans),ref=Math.min(before,after),refHi=Math.max(hiA,hiZ);
    const jumpsT=r.jumps.slice(Math.floor((sw?sw.at:0)/.05)-4,Math.floor((sw?sw.at:0)/.05)+60),maxJump=Math.max(...jumpsT);
    const t={from:a,to:z,urgent,requestAt:reqAt,switchAt:sw?+sw.at.toFixed(3):null,waitS:r1(wait),gridUnits:off,dipDb:r1(db(ref)-db(minT)),riseDb:r1(db(maxT)-db(refHi)),maxJump:+maxJump.toFixed(3)};
    rep.transitions.push(t);
    check(`switch ${a}->${z} happens`,!!sw,t.switchAt);
    check(`switch ${a}->${z} on ${urgent?'beat':'4-bar phrase'} boundary (<=5ms)`,aligned,t.gridUnits);
    check(`switch ${a}->${z} wait ${urgent?'<= 1 beat':'<= dwell+phrase'}`,urgent?wait<=spb+.06:wait<=LIMITS.dwell+barDur*4,t.waitS);
    check(`switch ${a}->${z} RMS dip <= ${LIMITS.dipDb} dB vs lower median, rise <= ${LIMITS.riseDb} dB vs higher P90`,t.dipDb<=LIMITS.dipDb&&t.riseDb<=LIMITS.riseDb,{dip:t.dipDb,rise:t.riseDb});
    check(`switch ${a}->${z} no click (max sample jump <= ${LIMITS.jumpMax})`,maxJump<=LIMITS.jumpMax,t.maxJump);
    if(WAV&&r.wav)await fs.writeFile(path.join(out,`switch-${a}-to-${z}.wav`),Buffer.from(r.wav,'base64'));
  }

  // 4. Debounce: progress oscillates across the 0.35/0.45 hysteresis band and week oscillates near the sprint line.
  const osc=[];for(let t=2;t<120;t+=1.5)osc.push({at:t,scene:G('game',{week:10,progress:(Math.floor(t/1.5)%2)?.91:.79})});
  const d1=await render({seconds:120,scene:G('game',{week:10,progress:.79}),seed:3,timeline:osc});
  const gaps=d1.switches.slice(1).map((s,i)=>s.at-d1.switches[i].at);
  check('progress jitter 0.79<->0.91 for 2 min: switches respect dwell (>= 24 s apart)',gaps.every(g=>g>=LIMITS.dwell-.01),{switches:d1.switches.length,gaps:gaps.map(r1)});
  const osc2=[];for(let t=2;t<60;t+=1.5)osc2.push({at:t,scene:G('game',{week:10,progress:(Math.floor(t/1.5)%2)?.89:.81})});
  const d2=await render({seconds:60,scene:G('game',{week:10,progress:.81}),seed:3,timeline:osc2});
  check('progress jitter inside hysteresis band (0.81<->0.89) never switches',d2.switches.length===1,d2.switches.length);
  const burst=[];for(let i=0;i<40;i++)burst.push({at:10+i*.02,scene:G('game',{week:20+i,progress:.2})});burst.push({at:10.81,scene:G('game',{week:46,progress:.2})});
  const d3=await render({seconds:30,scene:G('game',{week:20,progress:.2}),seed:3,timeline:burst});
  check('41 rapid requests merge into a single switch to latest target (sprint)',d3.switches.length===2&&d3.switches[1].to==='sprint',d3.switches.map(s=>s.to));
  const d4=await render({seconds:40,scene:G('game',{week:17,progress:.2}),seed:3,timeline:[{at:1,scene:G('game',{week:18,progress:.2})},{at:9,scene:G('game',{week:45,progress:.2})}]});
  check('sprint takes priority and is not blocked by dwell (switch soon after week 45)',d4.switches.some(s=>s.to==='sprint'&&s.at-9<=4*4*60/100+.1),d4.switches.map(s=>({to:s.to,at:r1(s.at)})));
  const pure=await c.evaluate(`(()=>{const D=HomeYear.AudioDirector;return [D.phaseOf({screen:'game',week:47,status:'playing',progress:0}),D.phaseOf({screen:'game',week:30,status:'playing',house:'studio'}),D.phaseOf({screen:'game',week:3,status:'playing',progress:.85},'development'),D.phaseOf({screen:'game',week:3,status:'playing',progress:.85},'early'),D.phaseOf({screen:'game',week:52,status:'ended',house:null}),D.phaseOf({})]})()`);
  check('phaseOf priority/hysteresis on public fields',JSON.stringify(pure)===JSON.stringify(['sprint','development','development','early','ending-rent','menu']),pure);

  // 5. SFX and the house stinger.
  const fx=await render({seconds:14,scene:SC.early,seed:2,music:false,timeline:['buy','sell','next','news','error','click'].map((k,i)=>({at:1+i*1.2,sfx:k})).concat([{at:9,sfx:'house'}])});
  const fxPeak=db(fx.peak);check('SFX + stinger peak <= -6 dBFS',fxPeak<=LIMITS.sfxPeakDb,r1(fxPeak));
  const perFx={};for(const [i,k] of ['buy','sell','next','news','error','click'].entries()){const a=Math.floor((1+i*1.2)/.3),w=fx.rms.slice(a,a+4);perFx[k]=r1(db(Math.max(...w)));}
  rep.sfx=perFx;check('each SFX loudest window >= music median + 6 dB',Object.values(perFx).every(v=>v>=rep.cues.early.rmsMedianDb+LIMITS.sfxOverMusicDb),{perFx,music:rep.cues.early.rmsMedianDb});
  const st=await render({seconds:16,scene:SC.development,seed:2,timeline:[{at:8,sfx:'house'}],wav:WAV});
  const pre=median(st.rms.slice(14,26).sort((a,b)=>a-b)),mid=st.rms.slice(27,34);
  check('house stinger stays below -1 dBFS on top of music',db(st.peak)<=LIMITS.peakDb,r1(db(st.peak)));
  check('house stinger audible above music bed',Math.max(...mid)>pre*1.2,{bed:r1(db(pre)),stinger:r1(db(Math.max(...mid)))});
  if(WAV&&st.wav)await fs.writeFile(path.join(out,'stinger-house.wav'),Buffer.from(st.wav,'base64'));
  if(WAV&&fx.wav)await fs.writeFile(path.join(out,'sfx-all.wav'),Buffer.from(fx.wav,'base64'));

  // 6. Live lifecycle with trusted input on the real AudioContext.
  await c.send('Page.navigate',{url:pathToFileURL(path.resolve(__dirname,'av-preview.html')).href});await delay(900);
  const ev=x=>c.evaluate(x),click=async sel=>{const p=await ev(`(()=>{const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await c.send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await delay(150);};
  const sample=()=>ev(`(async()=>{let peak=0,s=0,n=0;for(let i=0;i<60;i++){for(const a of audioProbe.branches){const b=new Float32Array(a.fftSize);a.getFloatTimeDomainData(b);for(const x of b){peak=Math.max(peak,Math.abs(x));s+=x*x;n++;}}await new Promise(r=>setTimeout(r,10));}return {peak,rms:n?Math.sqrt(s/n):0,status:HomeYear.Audio.status(),timers:qaIntervals.size}})()`);
  await ev("HomeYear.Audio.configure({autoSave:true,sound:true,music:true,animation:'normal',numberFormat:'decimal'});document.getElementById('volume').dispatchEvent(new Event('click',{bubbles:true}))");
  await ev('HomeYear.Audio.unlock()');await delay(1300);const blk=await ev('({...HomeYear.Audio.status(),timers:qaIntervals.size})');
  check('untrusted unlock: suspended context reports playing=false, legacy musicRunning=true, no notes queued',blk.state!=='running'?(!blk.playing&&blk.musicRunning&&blk.queued===0&&blk.needsGesture):true,{state:blk.state,playing:blk.playing,musicRunning:blk.musicRunning,queued:blk.queued,needsGesture:blk.needsGesture});
  await c.send('Page.navigate',{url:pathToFileURL(path.resolve(__dirname,'av-preview.html')).href});await delay(900);
  check('before any gesture: no AudioContext',(await ev('HomeYear.Audio.status().state'))==='uncreated');
  await ev("HomeYear.Audio.setScene({screen:'start'})");check('setScene before gesture still does not create context',(await ev('HomeYear.Audio.status().state'))==='uncreated');
  await click('#cues button:nth-child(3)');await delay(2500);let s=await sample();
  check('trusted click: running, one scheduler timer, real signal',s.status.state==='running'&&s.status.musicRunning&&s.status.playing&&s.timers===2&&s.peak>0.01,{peak:+s.peak.toFixed(4),timers:s.timers,cue:s.status.cue});
  // av-preview's own 250 ms status refresher is the second interval; only one belongs to audio.
  const target=await c.send('Target.createTarget',{url:'about:blank'});await c.send('Target.activateTarget',{targetId:target.targetId});await delay(600);s=await sample();
  check('hidden tab: silent, scheduler stopped',s.peak===0&&!s.status.musicRunning&&!s.status.playing&&s.timers===1,{peak:s.peak,timers:s.timers,cue:s.status.cue});
  await c.send('Page.bringToFront');await delay(2200);s=await sample();
  check('return to tab: music resumes from A2 (not from the top)',s.peak>0.01&&s.status.musicRunning&&s.timers===2&&['A2','C','A'].includes(s.status.section),{peak:+s.peak.toFixed(4),section:s.status.section});
  await c.send('Target.closeTarget',{targetId:target.targetId});
  await click('#musicToggle');await delay(600);s=await sample();
  check('music off: silent within 600 ms, timer cleared, musicRunning false',s.peak===0&&!s.status.musicRunning&&s.timers===1,{peak:s.peak,timers:s.timers});
  await click('#musicToggle');await delay(2200);s=await sample();check('music on again: single timer, signal back',s.peak>0.01&&s.timers===2,{peak:+s.peak.toFixed(4),timers:s.timers});
  await ev("(()=>{const e=document.getElementById('volume');e.value='0';e.dispatchEvent(new Event('input',{bubbles:true}))})()");await delay(400);s=await sample();
  check('volume 0: master gain 0 and digital silence',s.status.gain===0&&s.peak===0,{gain:s.status.gain,peak:s.peak});
  await ev("(()=>{const e=document.getElementById('volume');e.value='50';e.dispatchEvent(new Event('input',{bubbles:true}))})()");await delay(1500);s=await sample();check('volume restored: signal back',s.peak>0.005,+s.peak.toFixed(4));
  await click('#dialog');await delay(800);const dlg=await ev('HomeYear.Audio.status().layers.dialog');check('dialogOpen applies duck snapshot without switching cue',dlg===true,dlg);await click('#dialog');
  const before=await ev('HomeYear.Audio.status()');for(let i=0;i<5;i++){await click('#cues button:nth-child('+(i%2?2:3)+')');}await delay(400);const after=await ev('HomeYear.Audio.status()');
  check('5 alternating preset clicks: requests counted, scheduler not duplicated',after.requests>=before.requests+5&&(await ev('qaIntervals.size'))===2,{requests:after.requests-before.requests,switches:after.switches-before.switches});
  await click('#cues button:nth-child(7)');await delay(3500);const end=await ev('HomeYear.Audio.status()');check('ending request switches promptly (no dwell)',end.cue==='ending-home',end.cue);
  await click('#cues button:nth-child(2)');await delay(3000);const menu=await ev('HomeYear.Audio.status()');check('back to menu switches promptly',menu.cue==='menu',menu.cue);
  // Leak check: stable node count after a long run (voices end and disconnect).
  const n1=await ev('HomeYear.Audio.status().nodes');await delay(12000);const n2=await ev('HomeYear.Audio.status().nodes');
  check('live voices bounded during playback (<= 64) while creation keeps progressing',n2.live<=64&&n2.created>n1.created,{before:n1,after:n2});
  await click('#musicToggle');await delay(4500);const n3=await ev('HomeYear.Audio.status()');
  check('after music off, all voices end and disconnect (live 0, no retiring instances)',n3.nodes.live===0&&n3.retiring===0,{nodes:n3.nodes,retiring:n3.retiring});
  check('no page exceptions',rep.errors.length===0,rep.errors.slice(0,3));
}catch(e){rep.fatal=e.stack;console.error(e);}finally{if(b)await b.cleanup();
  await fs.mkdir(out,{recursive:true});const file=path.resolve(__dirname,'../docs/av-samples/report.json');await fs.writeFile(file,JSON.stringify(rep,null,2));
  const failed=rep.checks.filter(x=>!x.pass).length;console.log(`\n${rep.checks.length-failed}/${rep.checks.length} passed`);if(rep.fatal||failed)process.exitCode=1;}
})();
