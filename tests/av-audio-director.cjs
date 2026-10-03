'use strict';
// Node check: real Engine openings (three difficulties) mapped through the UI progress formula into the
// public-state director. No browser needed; loads the same classic scripts the game uses.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({console});ctx.window=ctx;
for(const f of ['js/data.js','js/math.js','js/market.js','js/trading.js','js/statistics.js','js/validation.js','js/game.js','js/audio-score.js','js/audio-director.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx,{filename:f});
const H=ctx.HomeYear,D=H.AudioDirector,checks=[];
const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name+(detail!==undefined?' '+JSON.stringify(detail):''));};
// Same formula as the UI left-panel progress bar (js/ui.js renderGame): cash / (next house price - owned value).
const progressOf=s=>{const owned=H.houses.findIndex(h=>h.id===s.house),goal=H.houses[Math.min(owned+1,4)],due=H.housePrice(s,goal)-H.houseValue(s);return due>0?Math.max(0,Math.min(1,s.cash/due)):1;};
const sceneOf=(s,screen)=>({screen:screen||'game',week:s.week,status:s.status,house:s.house,progress:progressOf(s),season:s.season,climate:'steady',dialogOpen:false});

for(const diff of Object.keys(H.difficulties)){
  const e=new H.Engine('CITY-OPEN-'+diff,diff),s=e.visible(),sc=sceneOf(s);
  check(`${diff} opening (week 1, cash ${s.cash}) is early`,D.phaseOf(sc)==='early',{progress:+sc.progress.toFixed(3)});
}
check('thresholds are enter .90 / leave .80',D.RULES.upAt===.9&&D.RULES.downAt===.8,{up:D.RULES.upAt,down:D.RULES.downAt});
// Hysteresis sweep on public progress only.
const g=p=>({screen:'game',week:10,status:'playing',house:null,progress:p});
let ph='early';const path1=[.5,.85,.89,.9,.85,.81,.8,.79,.85,.9];const seen=path1.map(p=>ph=D.phaseOf(g(p),ph));
check('progress sweep .5→.9→.79→.9 follows hysteresis',JSON.stringify(seen)===JSON.stringify(['early','early','early','development','development','development','development','early','early','development']),seen);
check('week 18 forces development even at low progress',D.phaseOf({screen:'game',week:18,status:'playing',progress:.1},'early')==='development');
check('owning a house forces development',D.phaseOf({screen:'game',week:5,status:'playing',house:'studio',progress:0},'early')==='development');
check('week 45 is sprint regardless of progress/house',D.phaseOf({screen:'game',week:45,status:'playing',house:'dream',progress:1},'development')==='sprint');
check('ended: house → ending-home, none → ending-rent',D.phaseOf({screen:'game',status:'ended',house:'flat'})==='ending-home'&&D.phaseOf({screen:'game',status:'ended',house:null})==='ending-rent');
check('start screen → menu even mid-season',D.phaseOf({screen:'start',week:30,status:'playing'},'development')==='menu');
// Director must ignore any non-public field even if a caller passes one.
const leaky=D.normalize({screen:'game',week:3,status:'playing',progress:.1,macro:1.3,rng:[1,2],trend:{}});
check('normalize drops non-public fields (macro/rng/trend)',!('macro' in leaky)&&!('rng' in leaky)&&!('trend' in leaky),Object.keys(leaky));

check('season accepts Chinese and English names',D.normalize({season:'autumn'}).season==='秋'&&D.normalize({season:'春'}).season==='春'&&D.normalize({season:'x'}).season===null);
// A real 52-week standard game with a fixed "buy rice then sell" routine: record the phase per week.
const e=new H.Engine('CITY-AUDIO-RUN','standard');let prev,weeks=[];
for(let w=1;w<=52;w++){const s=e.visible();prev=D.phaseOf(sceneOf(s),prev);weeks.push(prev);e.dispatch({type:w===52?'end':'next',revision:s.revision,token:'av-'+w});}
const endS=e.visible();prev=D.phaseOf(sceneOf(endS),prev);
const firstDev=weeks.indexOf('development')+1,firstSprint=weeks.indexOf('sprint')+1;
check('real standard run: early at week 1, sprint from week 45, ending after end',weeks[0]==='early'&&firstSprint===45&&weeks.slice(44).every(x=>x==='sprint')&&/^ending-/.test(prev),{firstDev,firstSprint,ending:prev});
check('real standard run: phases never go backwards from sprint',weeks.slice(firstSprint-1).every(x=>x==='sprint'));
const failed=checks.filter(c=>!c.pass).length;console.log(`\n${checks.length-failed}/${checks.length} passed`);process.exitCode=failed?1:0;
