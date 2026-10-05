'use strict';
// Independent in-memory regression fixtures, never balance samples or policy runs.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function core(){const ctx=vm.createContext({console});ctx.window=ctx;for(const name of ['data','math','v2-baseline','v3-baseline','market','trading','statistics','validation','game','save'])vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),ctx);return ctx.HomeYear;}
const H=core();let seq=0;
function dispatch(e,type,id,qty){const r=e.dispatch({type,id,qty,revision:e.visible().revision,token:'calendar-fixture-'+(++seq)});if(!r.ok)throw Error(r.error);return r;}
function fixtures(){const events={},starts={},late={};let ordinary=null,ongoing=null;
 for(let n=0;n<500;n++){const seed='CALENDAR-FIXTURE-'+n,e=new H.Engine(seed);const start=e.snapshot().calendarStartWeek;if(!starts[start])starts[start]=seed;
  for(let w=2;w<=52;w++){const before=e.snapshot();dispatch(e,'next');const s=e.snapshot(),fresh=s.news.find(n=>n.kind==='headline'&&n.fresh&&s.swanLog.some(l=>l.id===n.id&&l.week===w));if(fresh&&!events[fresh.id])events[fresh.id]={before,after:s};if(!ordinary&&s.activeEvents.some(a=>a.started===w&&a.id.indexOf('swan_')!==0))ordinary={before,after:s};if(!ongoing&&s.news.some(n=>n.kind==='ongoing'&&n.id.indexOf('swan_')===0))ongoing={before,after:s};if(n===0&&w>=49)late[w]=s;}
  if(Object.keys(starts).length===52&&Object.keys(events).length===7&&ordinary&&ongoing)break;
 }
 if(Object.keys(starts).length!==52||Object.keys(events).length!==7)throw Error('Fixture coverage incomplete');
 return {kind:'Independent in-memory boundary fixtures; NOT formal economic evidence',events,starts,late,ordinary,ongoing};
}
module.exports={H,core,root,dispatch,fixtures};
