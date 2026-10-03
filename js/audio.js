(function(H){'use strict';
// Runtime audio: one Engine class drives both the live AudioContext and OfflineAudioContext renders,
// so tests exercise the real scheduler. Score/director/instruments are optional; without them music is silent
// but the public API and status semantics stay the same.
let ctx,masterGain,musicGain,sfxGain,engine,timer=null,settings=H.defaultSettings,volume=.5,scene=null,needsGesture=false,lastPhase,sweepTimer=null;
const key='homeyear.audio.volume.v1',S=H.AudioScore,D=H.AudioDirector,I=H.AudioInstruments,ready=!!(S&&D&&I);
const LOOKAHEAD=.15,TICK_MS=25,MAX_VOICES=48;
try{const raw=localStorage.getItem(key);if(raw!==null){const v=JSON.parse(raw);if(typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1)volume=v;}}catch(e){}

function Engine(ac,out,opts){
  // initialPhase hands the module's hysteresis memory (lastPhase) to a late-created engine, so music that is
  // switched on after the player already crossed the 0.90 line still agrees with the phase the UI has been showing.
  opts=opts||{};this.ac=ac;this.rng=S.prng(opts.seed===undefined?(Date.now()^0x5bd1e995):opts.seed);this.director=D.createDirector(opts.rules,opts.initialPhase);
  this.pending=[];this.voices=[];this.instances=[];this.retired=[];this.current=null;this.lastSwitchAt=-1e9;this.switches=[];this.muted=false;this.layers=this.director.layers();
  // Chain: cue instances → pre → dialog low-pass → duck → bus → compressor → out. Reverb returns into pre.
  this.pre=ac.createGain();this.dialog=ac.createBiquadFilter();this.dialog.type='lowpass';this.dialog.frequency.value=18000;this.dialog.Q.value=.5;
  this.duck=ac.createGain();this.bus=ac.createGain();this.bus.gain.value=opts.busGain===undefined?.42:opts.busGain;
  this.comp=ac.createDynamicsCompressor();this.comp.threshold.value=-16;this.comp.knee.value=8;this.comp.ratio.value=4;this.comp.attack.value=.006;this.comp.release.value=.22;
  this.verb=ac.createConvolver();this.verb.buffer=I.impulse(ac,2.4);this.verbIn=ac.createGain();this.verbOut=ac.createGain();this.verbOut.gain.value=.5;
  this.verbIn.connect(this.verb);this.verb.connect(this.verbOut);this.verbOut.connect(this.pre);
  this.pre.connect(this.dialog);this.dialog.connect(this.duck);this.duck.connect(this.bus);this.dcBlock=ac.createBiquadFilter();this.dcBlock.type='highpass';this.dcBlock.frequency.value=25;this.dcBlock.Q.value=.6;
  this.bus.connect(this.dcBlock);this.dcBlock.connect(this.comp);this.comp.connect(out);
  this.sfxBus=ac.createGain();this.sfxBus.gain.value=.6;this.sfxComp=ac.createDynamicsCompressor();this.sfxComp.threshold.value=-14;this.sfxComp.knee.value=2;this.sfxComp.ratio.value=20;this.sfxComp.attack.value=.001;this.sfxComp.release.value=.15;
  this.sfxTrim=ac.createGain();this.sfxTrim.gain.value=.72;this.sfxBus.connect(this.sfxComp);this.sfxComp.connect(this.sfxTrim);this.sfxTrim.connect(opts.sfxOut||out);this.sfxOut=this.sfxBus;
}
Engine.prototype.request=function(next,now){
  this.scene=next;const prevTarget=this.director.target(),target=this.director.request(next);this.layers=this.director.layers();
  const t=Math.max(now,this.ac.currentTime);
  this.dialog.frequency.setTargetAtTime(this.layers.dialog?2500:18000,t,.1);this.pre.gain.setTargetAtTime(this.layers.dialog?.63:1,t,.1);
  // Menu / endings do not wait for a phrase: cut at the next beat of the playing cue.
  if(this.current&&target!==this.current.cue.id&&target!==prevTarget&&(D.urgent(target)||D.urgent(this.current.cue.id))){const c=this.current,beat=c.spb,T=c.start+Math.ceil((now+.05-c.start)/beat)*beat;this.switchTo(target,Math.max(T,now+.05),{urgent:true});}
  return target;
};
Engine.prototype.instance=function(cueId,T,o){
  const ac=this.ac,cue=S.cues[cueId],spb=60/cue.bpm,inst={cue,spb,barDur:spb*4,start:T,nextBar:T,sec:0,bar:0,loop:0,variant:null,state:{},tracks:{},gain:ac.createGain(),intro:o.intro!==false,section:o.section||null,end:T};
  inst.fx=ac.createGain();inst.fx.connect(this.verbIn);inst.gain.connect(this.pre);
  const from=o.startLevel||0;for(const [p,v] of [[inst.gain.gain,cue.gain],[inst.fx.gain,cue.gain]]){p.setValueAtTime(v*from,T);p.linearRampToValueAtTime(v,T+(o.fadeIn||inst.barDur));}
  if(o.section)inst.sec=cue.order.indexOf(o.section);
  for(const tr of cue.tracks){const input=ac.createGain(),pan=ac.createStereoPanner(),send=ac.createGain();pan.pan.value=tr.pan||0;send.gain.value=tr.send||0;input.connect(pan);pan.connect(inst.gain);input.connect(send);send.connect(inst.fx);inst.tracks[tr.id]={input,pan,send};}
  this.instances.push(inst);return inst;
};
Engine.prototype.retire=function(inst,T,tau,padBar){
  for(const p of [inst.gain.gain,inst.fx.gain]){p.cancelScheduledValues(T);p.setTargetAtTime(0,T,tau);}inst.retiring=true;
  this.pending=this.pending.filter(e=>e.inst!==inst||e.time<T);
  if(padBar)this.queueBar(inst,T,{only:['pad']});
  inst.end=T+tau*8+2.5;this.retired.push(inst);this.instances=this.instances.filter(i=>i!==inst);
};
Engine.prototype.switchTo=function(cueId,T,o){
  o=o||{};const old=this.current;
  if(old){const urgent=o.urgent;this.retire(old,T,urgent?.3:.45,false);o=Object.assign({intro:false,startLevel:.6,fadeIn:.5},o);}
  this.current=this.instance(cueId,T,o);this.lastSwitchAt=T;this.switches.push({at:T,from:old?old.cue.id:null,to:cueId,urgent:!!o.urgent});
};
Engine.prototype.sectionId=function(inst){const c=inst.cue;return inst.sec<c.order.length?c.order[inst.sec]:c.tail;};
Engine.prototype.queueBar=function(inst,T,extra){
  const sid=extra&&extra.only?(this.sectionId(inst)||'A'):this.sectionId(inst),L=this.layers;
  if(!inst.variant||inst.bar===0)inst.variant=S.variant(inst.cue,sid,inst.loop,this.rng);
  const plan=Object.assign({section:sid,bar:inst.bar,variant:inst.variant,level:L.level,cold:L.cold,final:L.final,loop:inst.loop},extra||{});
  const res=S.bar(inst.cue,plan,inst.state,this.rng),bright=L.bright;
  for(const e of res.events){const time=T+e.at*inst.spb,dur=e.dur*inst.spb,opts=Object.assign({bright},e.opts),notes=e.notes.length?e.notes:[60];
    for(const m of notes)this.pending.push({time,inst,track:e.track,name:e.inst,midi:m,dur,vel:e.vel,opts});}
  inst.end=Math.max(inst.end,T+inst.barDur+3);
  return res;
};
Engine.prototype.advance=function(inst){
  inst.nextBar+=inst.barDur;if(++inst.bar<8)return;inst.bar=0;inst.sec++;const c=inst.cue;
  // Looping cues wrap back to A. The ending cues follow A/B/A2/C with an 8-bar coda T that keeps repeating
  // softly (the original design): the coda is held instead of wrapping, so the main form never replays and
  // the music never falls silent while the storybook dialog is on screen.
  if(inst.sec>=c.order.length+(c.tail?1:0)){inst.loop++;inst.sec=c.loop?0:(c.tail?c.order.length:c.order.length-1);}
  inst.inTail=!c.loop&&!!c.tail&&inst.sec===c.order.length;
};
Engine.prototype.tick=function(now){
  const horizon=now+LOOKAHEAD;
  if(!this.current){const resume=this.resumeCue;this.resumeCue=null;const id=this.director.target();this.switchTo(id,now+.05,resume===id&&S.cues[id].order.includes('A2')?{section:'A2',intro:false,fadeIn:1.5}:{});}
  let guard=0;
  while(this.current&&this.current.nextBar<=horizon&&guard++<8){
    const c=this.current,T=c.nextBar;
    if(c.intro){this.queueBar(c,T,{only:['pad','bass','hiss'],section:c.cue.order[0],bar:0});c.intro=false;c.nextBar+=c.barDur;continue;}
    const want=this.director.decide({current:c.cue.id,now:T,lastSwitchAt:this.lastSwitchAt,barInSection:c.bar});
    if(want&&want!==c.cue.id){this.switchTo(want,T);continue;}
    c.lastPlan={section:this.sectionId(c),bar:c.bar};c.lastChord=this.queueBar(c,T).chord;this.advance(c);
  }
  this.flush(horizon);
  this.sweep(now);
};
Engine.prototype.sweep=function(now){
  for(const inst of this.retired.slice())if(now>inst.end){for(const k in inst.tracks){const t=inst.tracks[k];t.input.disconnect();t.pan.disconnect();t.send.disconnect();}inst.gain.disconnect();inst.fx.disconnect();this.retired.splice(this.retired.indexOf(inst),1);}
  return this.retired.length;
};
Engine.prototype.flush=function(horizon){
  if(!this.pending.length)return;this.pending.sort((a,b)=>a.time-b.time);let n=0;
  while(n<this.pending.length&&this.pending[n].time<horizon)n++;
  const due=this.pending.splice(0,n);
  for(const e of due){
    if(this.muted)continue;
    const t=Math.max(e.time,this.ac.currentTime);this.voices=this.voices.filter(v=>v.end>t);
    if(this.voices.length>=MAX_VOICES){this.voices.sort((a,b)=>a.end-b.end);const victim=this.voices.shift();victim.handle.stop(t);this.stolen=(this.stolen||0)+1;}
    const tr=e.inst.tracks[e.track];if(!tr)continue;
    const handle=I.play(e.name,this.ac,tr.input,t,e.midi,e.dur,e.vel,e.opts);this.voices.push({end:handle.end,handle});
  }
};
// Stop scheduling: drop queued notes and fade whatever is already sounding.
Engine.prototype.halt=function(now,tau,remember){
  const c=this.current;this.resumeCue=remember&&c?c.cue.id:null;
  if(c)this.retire(c,now,tau||.12,false);this.current=null;this.pending=[];
};
Engine.prototype.keyOf=function(){const c=this.current;if(!c)return 2;const sec=c.cue.sections[this.sectionId(c)]||{};return sec.key===undefined?c.cue.key:sec.key;};
const SFX={buy:[[0,7,.25],[.09,12,.4]],sell:[[0,12,.2],[.08,16,.2],[.16,19,.45]],next:[[0,7,.35],[.12,14,.55]],error:[[0,-5,.3],[.16,-6,.45]],news:[[0,16,.4],[.16,11,.6]],click:[[0,12,.18]]};
Engine.prototype.sfx=function(kind,t,out){
  const ac=this.ac,k=this.keyOf(),base=60+k,dest=this.sfxBus;
  if(kind==='house'){
    // Stinger: I–IV–I(add9) arpeggio with bells; music ducks by ~6 dB for two bars.
    const bar=this.current?this.current.barDur:2.6;this.duck.gain.cancelScheduledValues(t);this.duck.gain.setTargetAtTime(.5,t,.05);this.duck.gain.setTargetAtTime(1,t+bar*2,.4);
    [[0,[0,4,7,12]],[.55,[5,9,12,17]],[1.1,[0,7,14,16,19]]].forEach(([dt,chord],i)=>chord.forEach((iv,j)=>I.play('glock',ac,dest,t+dt+j*.06,base+12+iv,.8,.75)));
    I.play('bell',ac,dest,t,base,2,.8);I.play('bell',ac,dest,t+1.1,base+12,2,.7);I.play('sub',ac,dest,t+1.1,base-24,1.6,.9);return;
  }
  const list=SFX[kind]||SFX.click,name=kind==='error'?'bass':kind==='news'||kind==='next'?'glock':'marimba';
  for(const [dt,iv,dur] of list){I.play(name,ac,dest,t+dt,base+iv-(kind==='error'?24:0),dur,kind==='error'?1.3:.8,{});if(kind!=='error')I.play('epiano',ac,dest,t+dt,base+iv,dur,1.1,{});}
};
Engine.prototype.status=function(){const c=this.current;return {cue:c?c.cue.id:null,section:c?(c.intro?'intro':(c.lastPlan||{}).section||null):null,bar:c&&c.lastPlan?c.lastPlan.bar+1:0,
  bpm:c?c.cue.bpm:null,chord:c?c.lastChord||null:null,target:this.director.target(),pendingCue:c&&this.director.target()!==c.cue.id?this.director.target():null,lastSwitchAt:this.lastSwitchAt,
  inTail:!!(c&&c.inTail),loop:c?c.loop:0,
  switches:this.switches.length,requests:this.director.requests(),layers:this.layers,queued:this.pending.length,voices:this.voices.length,stolen:this.stolen||0,retiring:this.retired.length};};

// ---- Live context management ----
function blocked(){needsGesture=true;try{window.dispatchEvent(new CustomEvent('homeyear:audio-blocked'));}catch(e){}}
function checkRunning(){if(!ctx)return;setTimeout(()=>{if(ctx&&ctx.state!=='running'&&(settings.music||settings.sound)&&!document.hidden)blocked();},1000);}
function ensureEngine(){if(!engine&&ready&&ctx){engine=new Engine(ctx,musicGain,{sfxOut:sfxGain,initialPhase:lastPhase});if(scene)engine.request(scene,ctx.currentTime);}return engine;}
function tick(){if(!ctx||!engine||ctx.state!=='running')return;engine.muted=volume===0;engine.tick(ctx.currentTime);}
function sweepLater(){if(sweepTimer!==null)return;sweepTimer=setTimeout(function again(){sweepTimer=null;if(engine&&ctx&&timer===null&&engine.sweep(ctx.state==='running'?ctx.currentTime:Infinity)>0)sweepTimer=setTimeout(again,1000);},1000);}
function stopMusic(remember){if(timer!==null){clearInterval(timer);timer=null;}if(engine&&ctx){const t=ctx.currentTime;engine.halt(t,.1,remember);musicGain.gain.cancelScheduledValues(t);musicGain.gain.setTargetAtTime(0,t,.06);musicGain.gain.setValueAtTime(0,t+.36);sweepLater();}}
function music(){
  if(!settings.music||!ctx||document.hidden||ctx.state!=='running'){stopMusic(!!settings.music&&!!ctx&&document.hidden);return;}
  if(timer===null){ensureEngine();const t=ctx.currentTime;musicGain.gain.cancelScheduledValues(t);musicGain.gain.setValueAtTime(musicGain.gain.value,t);musicGain.gain.setTargetAtTime(1,t,.05);timer=setInterval(tick,TICK_MS);tick();}
}
// resume() rejected or still not running: remember the request, do not start an idle scheduler.
// A later successful resume (or the real click on the "enable sound" prompt) starts the loop.
function resumeCtx(){needsGesture=false;return ctx.resume().then(()=>{if(ctx.state==='running'){if(settings.music)music();}else needsGesture=true;});}
H.AudioEngine=ready?Engine:null;
H.Audio={
  unlock(){try{if(!ctx){ctx=new(window.AudioContext||window.webkitAudioContext)();masterGain=ctx.createGain();masterGain.gain.value=volume;masterGain.connect(ctx.destination);musicGain=ctx.createGain();musicGain.connect(masterGain);sfxGain=ctx.createGain();sfxGain.gain.value=.9;sfxGain.connect(masterGain);}
    resumeCtx().catch(blocked);checkRunning();if(settings.music)music();}catch(e){blocked();}},
  configure(s){settings=s;if(!s.music)stopMusic(false);if(s.music||s.sound){if(ctx){resumeCtx().catch(blocked);}if(s.music)music();}else if(ctx)ctx.suspend().catch(()=>{});},
  setScene(next){if(!D)return null;scene=D.normalize(next);lastPhase=D.phaseOf(scene,lastPhase);if(engine&&ctx)engine.request(scene,ctx.currentTime);return lastPhase;},
  volume:()=>volume,
  setVolume(v){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1)return false;volume=v;if(masterGain)masterGain.gain.setValueAtTime(v,ctx.currentTime);try{localStorage.setItem(key,JSON.stringify(v));}catch(e){}return true;},
  status:()=>Object.assign({volume,gain:masterGain?masterGain.gain.value:null,state:ctx?ctx.state:'uncreated',musicRunning:timer!==null,playing:timer!==null&&!!ctx&&ctx.state==='running',needsGesture,engine:ready,musicWanted:!!(settings&&settings.music)},engine?engine.status():{cue:null},I?{nodes:I.stats()}:{}),
  play(kind){if(!settings.sound||!ctx||ctx.state!=='running')return;if(ready){ensureEngine();engine.sfx(kind,ctx.currentTime+.01,sfxGain);}}
};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ctx&&(settings.music||settings.sound)&&ctx.state!=='running')resumeCtx().catch(blocked);music();});
})(window.HomeYear);
