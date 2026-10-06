'use strict';
// Phase B unit/regression evidence, not strategy/balance simulations.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.BLACK_SWAN_EVIDENCE_DIR||path.join(root,'docs/black-swan-evidence/phase-b-20261004'));
function load(historical=false,configure){const c=vm.createContext({console});c.window=c;for(const f of ['data','math','v2-baseline',...(historical?[]:['v3-baseline']),'market','trading','statistics',...(historical?[]:['street']),'validation','game','save'])vm.runInContext(historical?cp.execFileSync('git',['show','a538345:js/'+f+'.js'],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,'js/'+f+'.js'),'utf8'),c,{filename:f});if(configure)configure(c);return c.HomeYear;}
const H=load(),V=H.v3.catalog,old=load(true),clone=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>assert.deepEqual(clone(a),clone(b));
const report={kind:'unit/regression only; not balance evidence',checks:[],fixtures:{},invariantHashes:{}};let token=0;
function test(name,f){try{f();report.checks.push({name,pass:true});console.log('PASS '+name);}catch(e){report.checks.push({name,pass:false,error:e.stack});console.error('FAIL '+name,e.stack);}}
function go(e,type='next',id,qty){const r=e.dispatch({type,id,qty,revision:e.visible().revision,token:'b-'+(++token)});assert.equal(r.ok,true,r.error);return r;}
function store(map=new Map(),hooks={}){return {map,getItem(k){if(hooks.read)return hooks.read(k,map);return map.has(k)?map.get(k):null;},setItem(k,v){if(hooks.write)return hooks.write(k,v,map);map.set(k,v);},removeItem(k){map.delete(k);}};}
const raw2=fs.readFileSync(path.join(root,'docs/fixtures/v2-baseline-migrate.json'),'utf8');
function reject(s,mutate){const bad=clone(s);mutate(bad);assert.throws(()=>H.validate(bad));const e=new H.Engine();e.restore(s);const before=e.snapshot();assert.throws(()=>e.restore(bad));same(e.snapshot(),before);}
function scheduled(s,values){const random=H.random,calls=[];try{H.random=(state,stream)=>{assert.equal(stream,'events');calls.push(stream);if(!values.length)throw Error('unexpected RNG draw');return values.shift();};const d=H.drawEvents(s);assert.equal(values.length,0);return {d,calls};}finally{H.random=random;}}
function scheduleBase(week=4){const s=H.create('schedule');s.week=week;s.season=H.seasonAt(week);s.activeEvents=[];s.listing=H.products.map(p=>p.id);return s;}
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
test('0.4 independent closure and unchanged monetary catalog invariants',()=>{
  same(V.products,old.products);same(V.events,old.events);same(V.rules,old.rules);same(V.v2.catalog.products,old.v2.catalog.products);
  for(const key of ['products','legacyProducts','houses','warehouses','difficulties']){same(H[key],old[key]);report.invariantHashes[key]=digest(H[key]);}
  same(H.create('pricebook').priceBook,old.create('pricebook').priceBook);assert.equal(H.rules.version,'0.5');assert.equal(H.rules.saveVersion,4);
  assert.equal(H.events.filter(e=>e.tier==='swan').length,7);same(H.events.filter(e=>!e.tier),old.events);
  const expected={swan_route:['phone'],swan_tariff:['phone','collectible'],swan_efficiency:['gpu'],swan_heat:['ac'],swan_protection:['mask'],swan_egg_short:['eggs'],swan_egg_relief:['eggs']};
  for(const e of H.events.filter(e=>e.tier==='swan')){same(e.primaryProducts,expected[e.id]);assert.equal(e.weight,1);assert.equal(e.reliability,'reliable');}
  const baseline=V.create('isolated');H.products[0].base++;try{V.validate(baseline);same(V.create('isolated'),old.create('isolated'));}finally{H.products[0].base--;}
});
test('frozen v3 versus git: full paths including ordinary structural/persist/personal/ended',()=>{
  const seen=new Set();let compares=0;
  for(const seed of ['UI-A-1','UI-A-2','UI-A-3','B-FROZEN-1','B-FROZEN-2']){const a=new V.Engine(seed),b=new old.Engine(seed);for(let w=1;w<=52;w++){
    const s=a.snapshot(),id=s.listing.find(id=>V.used(s)+V.holding(id).size<=s.capacity&&V.channelGross(s,id,1)+V.fee(V.channelGross(s,id,1))<=s.cash);
    if(id){for(const type of ['buy','sell']){const op={type,id,qty:1,revision:a.visible().revision,token:seed+w+type};same(a.dispatch(op),b.dispatch(op));same(a.snapshot(),b.snapshot());compares++;}}
    for(const n of a.snapshot().news)if(n.kind==='personal')seen.add('personal');for(const ac of a.snapshot().activeEvents)for(const f of Object.values(V.events.find(e=>e.id===ac.id).effects))seen.add(f.kind);
    const type=w===52?'end':'next',op={type,revision:a.visible().revision,token:seed+w+type};same(a.dispatch(op),b.dispatch(op));same(a.snapshot(),b.snapshot());compares++;
  }}
  assert.ok(seen.has('persist')&&seen.has('structural')&&seen.has('personal'));report.frozenComparisons=compares;
});
test('strict v3 negative cases retain original rejection, including migrated peak/result',()=>{
  const e=new V.Engine('strict');go(e);const plain=e.snapshot(),migrated=V.migrateV2(JSON.parse(raw2),'homeyear.save.backup.old');
  const mods=[s=>delete s.market.rice,s=>s.extra=1,s=>s.cash++,s=>s.stats.fees++,s=>s.stats.byProduct.rice++,s=>s.rng.events=0,s=>s.rng.listing=4294967296,s=>s.priceBook.houses.studio++,s=>s.market.rice.history.pop(),s=>s.listing.pop(),s=>s.absence.rice=99,s=>s.migration={fromVersion:2,fromRules:'0.2',atWeek:53,backup:'bad'}];
  for(const base of [plain,migrated])for(const mod of mods){const x=clone(base);mod(x);assert.throws(()=>V.validate(x));assert.throws(()=>old.validate(x));}
  const end=new V.Engine('ended');while(end.snapshot().week<52)go(end);go(end,'end');const original=end.snapshot(),x=clone(original);
  assert.ok(Object.hasOwn(x.result,'assets')&&Number.isSafeInteger(x.result.assets));x.result.assets++;
  same(Object.keys(x.result),Object.keys(original.result));assert.equal(x.result.assets,original.result.assets+1);
  assert.throws(()=>V.validate(x),/结算与状态不一致/);assert.throws(()=>old.validate(x),/结算与状态不一致/);
  const impossible=clone(migrated);assert.ok(Object.hasOwn(impossible.stats,'peak'));impossible.stats.peak=Number.MAX_SAFE_INTEGER;
  same(Object.keys(impossible.stats),Object.keys(migrated.stats));assert.throws(()=>V.validate(impossible),/资产峰值不可达/);assert.throws(()=>old.validate(impossible),/资产峰值不可达/);
  // Keep explicit unknown-key negatives separate from the real ledger/result checks.
  const unknownResult=clone(original);unknownResult.result.netAssets=1;assert.throws(()=>V.validate(unknownResult));assert.throws(()=>old.validate(unknownResult));
  const unknownStats=clone(migrated);unknownStats.stats.peakNet=1;assert.throws(()=>V.validate(unknownStats));assert.throws(()=>old.validate(unknownStats));
  report.strictTargets={resultField:'assets',resultKeysUnchanged:true,resultError:'结算与状态不一致',peakField:'peak',statsKeysUnchanged:true,peakError:'资产峰值不可达',unknownKeysRetained:true};
});
test('v3 upgrade preserves every field, all RNG, provenance, result; ended forbids actions',()=>{
  const e=new V.Engine('upgrade');for(let i=1;i<19;i++)go(e);const m=V.migrateV2(JSON.parse(raw2),'homeyear.save.backup.v2-retained');
  const ended=new V.Engine('ended');while(ended.snapshot().week<52)go(ended);go(ended,'end');
  const loose=clone(e.snapshot());loose.news.find(n=>n.kind==='headline'||n.kind==='holding').id='swan_route';assert.throws(()=>V.validate(loose));assert.throws(()=>old.validate(loose));
  for(const src of [V.create('new'),e.snapshot(),m,ended.snapshot()]){
    const raw='\n '+JSON.stringify(src,null,2)+'\n',st=store(),ad=new H.SaveAdapter(st),r=ad.stageV3(raw);assert.equal(r.ok,true,r.error);
    const x=clone(r.state);delete x.swanLog;delete x.upgrade;x.version=3;x.rulesVersion='0.4';same(x,src);same(r.state.swanLog,[]);assert.equal(st.getItem(r.backup),raw);assert.equal(st.getItem(ad.key),null);assert.equal(st.getItem(ad.v3Key),null);
    const eng=new H.Engine();eng.restore(r.state);if(src.status==='ended'){const before=eng.snapshot();for(const type of ['buy','sell','next'])assert.equal(eng.dispatch({type,id:'rice',qty:1,revision:before.revision,token:type}).ok,false);assert.equal(eng.dispatch({type:'end',revision:before.revision,token:'end-repeat'}).ok,true);same(eng.snapshot(),before);same(eng.snapshot().result,src.result);}
    else{const other=new H.Engine();other.restore(JSON.parse(ad.export(eng.snapshot())));go(eng);go(other);same(eng.snapshot(),other.snapshot());}
    reject(r.state,s=>s.upgrade.fromVersion=2);reject(r.state,s=>s.upgrade.fromRules='0.3');reject(r.state,s=>s.upgrade.extra=1);reject(r.state,s=>s.upgrade.backup='arbitrary');reject(r.state,s=>s.upgrade.atWeek=s.week+1);
    if(src.migration)reject(r.state,s=>s.upgrade.atWeek=src.migration.atWeek-1);
  }
});
test('v2 direct path identical frozen original conversion, without intermediate v3 write',()=>{
  const st=store();st.setItem('homeyear.save.v2',raw2);st.setItem('homeyear.save.v3','DO-NOT-TOUCH');const ad=new H.SaveAdapter(st),r=ad.migrate(raw2);assert.equal(r.ok,true,r.error);assert.equal(r.state.upgrade,null);same(r.state.swanLog,[]);
  const original=V.migrateV2(JSON.parse(raw2),r.backup),x=clone(r.state);delete x.swanLog;delete x.upgrade;x.version=3;x.rulesVersion='0.4';same(x,original);assert.equal(st.getItem('homeyear.save.v2'),raw2);assert.equal(st.getItem('homeyear.save.v3'),'DO-NOT-TOUCH');assert.ok(ad.parse(st.getItem(ad.key)).ok);
});
test('load/import/export/settings/cancellation staging is read-only; v4 priority and isolation',()=>{
  const raw3=JSON.stringify(V.create('priority'));for(const current of ['BROKEN',JSON.stringify({...H.create('future'),version:99})]){
    const st=store();st.setItem('homeyear.save.v3',raw3);st.setItem('homeyear.save.v2',raw2);st.setItem('homeyear.save.v4',current);const ad=new H.SaveAdapter(st),before=new Map(st.map);
    const r=ad.load();assert.equal(r.ok,false);assert.equal(r.oldV3.ok,true);assert.equal(ad.isQuarantined(),true);assert.equal(ad.damaged(),current);ad.loadSettings();ad.export(H.create('export'));assert.deepEqual(st.map,before);
    assert.equal(ad.save(H.create('replacement')).ok,false);assert.equal(ad.save(H.create('replacement'),{replaceDamaged:'true'}).ok,false);assert.equal(ad.migrate(raw3).ok,false);assert.deepEqual(st.map,before);
    const imp=ad.import(raw3,new H.Engine());assert.equal(imp.ok,true);assert.equal(st.getItem(ad.key),current);assert.equal(ad.isQuarantined(),true);
    const migrated=ad.migrate(raw3,{replaceDamaged:true});assert.equal(migrated.ok,true,migrated.error);assert.equal(st.getItem('homeyear.save.v3'),raw3);assert.equal(st.getItem('homeyear.save.v2'),raw2);assert.equal(ad.isQuarantined(),false);
  }
  const valid=H.create('current'),st=store();st.setItem('homeyear.save.v4',JSON.stringify(valid));st.setItem('homeyear.save.v3',raw3);same(new H.SaveAdapter(st).load().state,valid);
  const oldDenied=store(new Map([['homeyear.save.v4',JSON.stringify(valid)]]),{read(k,m){if(k==='homeyear.save.v3'||k==='homeyear.save.v2')throw Error('old read denied');return m.has(k)?m.get(k):null;}});same(new H.SaveAdapter(oldDenied).load().state,valid);
  let deniedContext;const denied=load(false,c=>{deniedContext=c;vm.runInContext("window.qaGetterReads=0;Object.defineProperty(window,'localStorage',{configurable:true,get(){window.qaGetterReads++;throw Error('getter denied');}})",c);});
  const getterLoad=new denied.SaveAdapter().load();assert.equal(getterLoad.ok,false);assert.match(getterLoad.error,/getter denied/);assert.ok(deniedContext.qaGetterReads>0);report.localStorageGetterReads=deniedContext.qaGetterReads;
  assert.equal(new H.SaveAdapter(store(new Map(),{read(){throw Error('get denied');}})).load().ok,false);
});
test('raw backups: same-text reuse, different-text collision, suffix exhaustion, no old writes',()=>{
  const raw3='\n'+JSON.stringify(V.create('backup'),null,1)+'\n',st=store(),ad=new H.SaveAdapter(st);const first=ad.stageV3(raw3);assert.equal(first.ok,true,first.error);const again=ad.stageV3(raw3);assert.equal(again.backup,first.backup);assert.equal(st.getItem(first.backup),raw3);
  st.setItem(first.backup,'different existing bytes');const collision=ad.stageV3(raw3);assert.equal(collision.backup,first.backup+'.1');assert.equal(st.getItem(first.backup),'different existing bytes');
  const exhausted=store();for(let i=0;i<=999;i++)exhausted.setItem(first.backup+(i?'.'+i:''),'occupied');const before=new Map(exhausted.map);assert.equal(new H.SaveAdapter(exhausted).stageV3(raw3).ok,false);assert.deepEqual(exhausted.map,before);
});
test('backup/write/readback failures leave active v4, both old raw keys and memory unchanged',()=>{
  const raw3=JSON.stringify(V.create('fail')),current=JSON.stringify(H.create('prior'));
  for(const mode of ['backupWrite','backupRead','currentWrite','currentRead','backupPostRead']){
    let written=false;const map=new Map([['homeyear.save.v2',raw2],['homeyear.save.v3',raw3],['homeyear.save.v4',current]]);
    const st=store(map,{write(k,v,m){if((mode==='backupWrite'&&k.includes('.backup.'))||(mode==='currentWrite'&&k==='homeyear.save.v4'))throw Error(mode);m.set(k,v);if(k==='homeyear.save.v4'&&v!==current)written=true;},read(k,m){if((mode==='backupRead'||(mode==='backupPostRead'&&written))&&k.includes('.backup.')&&m.has(k))return 'WRONG';if(mode==='currentRead'&&k==='homeyear.save.v4'&&written){written=false;return 'WRONG';}return m.has(k)?m.get(k):null;}});
    const ad=new H.SaveAdapter(st);ad.load();const eng=new H.Engine('memory'),before=eng.snapshot();const r=ad.migrate(raw3);assert.equal(r.ok,false,mode);same(eng.snapshot(),before);assert.equal(map.get('homeyear.save.v4'),current,mode);assert.equal(map.get('homeyear.save.v3'),raw3);assert.equal(map.get('homeyear.save.v2'),raw2);
  }
});
test('swan gate/week/cooldown/limit/unique/season/primary eligibility and RNG draw counts',()=>{
  for(const w of [1,2,3,51,52]){const s=scheduleBase(w),r=scheduled(s,[.99,.99]);assert.equal(r.d.eligible,false);assert.equal(r.d.swanAttempt,false);assert.equal(s.swanLog.length,0);}
  for(let d=1;d<=5;d++){const s=scheduleBase(4+d);s.swanLog=[{id:'swan_protection',week:4}];const r=scheduled(s,[.99,.99]);assert.equal(r.d.eligible,false);}
  const edge=scheduleBase(50);assert.equal(scheduled(edge,[0,0,.99]).d.swan,true);assert.equal(edge.activeEvents[0].until,52);edge.week=51;scheduled(edge,[.99,.99]);assert.equal(edge.activeEvents[0].until,52);edge.week=52;scheduled(edge,[.99,.99]);assert.equal(edge.activeEvents[0].until,52);
  const s=scheduleBase(10);s.swanLog=[{id:'swan_protection',week:4}];const r=scheduled(s,[0,0,.99]);assert.equal(r.d.swan,true);assert.equal(s.swanLog.length,2);assert.equal(r.calls.length,3);assert.equal(r.d.ordinaryAttempt,false);assert.equal(r.d.filtered.swan_protection,'used');assert.equal(r.d.filtered.swan_heat,'season');
  const max=scheduleBase(45);max.swanLog=H.events.filter(e=>e.tier==='swan').slice(0,6).map((e,i)=>({id:e.id,week:4+i*6}));assert.equal(scheduled(max,[.99,.99]).d.eligible,false);
  const secondary=scheduleBase();secondary.listing=['rice','fruit','umbrella','watch','tea','console'];const none=scheduled(secondary,[.99,.99]);assert.equal(none.d.swanAttempt,false);assert.equal(none.calls.length,2);assert.equal(none.d.candidates.length,0);
  for(const w of [26,27,39,40]){const s=scheduleBase(w),d=scheduled(s,[.99,.99,.99]).d;assert.equal(d.candidates.includes('swan_heat'),w>=27&&w<=39);}
  const fail=scheduleBase();const d=scheduled(fail,[.99,.1,0,.99]).d;assert.equal(d.swan,false);assert.equal(d.ordinaryAttempt,true);assert.ok(d.started&&!d.started.startsWith('swan_'));assert.equal(fail.swanLog.length,0);
});
test('ordinary overlap: primary short-term blocks, structural retains, persistent all effects block until expiry',()=>{
  const s=scheduleBase();s.activeEvents=[{id:'chips',started:2,until:4}];let d=scheduled(s,[.99,.99,.99]).d;assert.equal(d.filtered.swan_route,'overlap');assert.equal(d.filtered.swan_efficiency,'overlap');
  const st=scheduleBase();st.activeEvents=[{id:'phone_launch',started:2,until:52}];d=scheduled(st,[.99,.99,.99]).d;assert.ok(d.candidates.includes('swan_route'));assert.ok(st.activeEvents.some(a=>a.id==='phone_launch'));
  const p=scheduleBase(11);p.swanLog=[{id:'swan_route',week:10}];p.activeEvents=[{id:'swan_route',started:10,until:12}];
  for(const frac of [0,.2,.5,.9]){const x=clone(p),r=scheduled(x,[0,frac,.99]);assert.ok(r.d.started);const e=H.events.find(e=>e.id===r.d.started);assert.ok(!Object.keys(e.effects).some(id=>['phone','gpu','ac'].includes(id)));}
  const expired=clone(p);expired.week=13;expired.season=H.seasonAt(13);scheduled(expired,[.99,.99]);assert.equal(expired.activeEvents.length,0);
});
test('selection independent of cash/holdings/profit; success personal draw still occurs',()=>{
  const a=scheduleBase(),b=clone(a);b.cash=999999999;b.inventory.phone={qty:999,cost:1};b.stats.profit=-999999;b.market.phone.price=1;
  const x=scheduled(a,[0,0,.99]),y=scheduled(b,[0,0,.99]);same(x.d,y.d);same(a.activeEvents,b.activeEvents);same(a.swanLog,b.swanLog);
  const p=scheduleBase();const d=scheduled(p,[0,0,0,0]).d;assert.equal(d.swan,true);assert.ok(p.personalEvent);assert.notEqual(p.personal,0);
});
// Discover genuine committed snapshots of all seven fixed events, avoiding fixture fabrication.
test('real committed onset fixtures all seven; save/restore future, actual news, caps, logs and atomicity',()=>{
  const found={};for(let seed=0;seed<100&&Object.keys(found).length<7;seed++){
    const e=new H.Engine('B-SWAN-'+seed);while(e.snapshot().week<52){const prior=e.snapshot();go(e);const s=e.snapshot();for(const n of s.news.filter(n=>n.kind==='headline'&&n.fresh&&n.id.startsWith('swan_')))if(!found[n.id])found[n.id]={prior,state:s,diagnostic:clone(e.diagnostics().eventLog.at(-1))};}
  }
  assert.equal(Object.keys(found).length,7);report.fixtures=found;
  for(const [id,f] of Object.entries(found)){
    const s=f.state,ev=H.events.find(e=>e.id===id),n=s.news.find(n=>n.id===id);H.validate(s);assert.equal(n.changeBps,H.changeBps(s.market[n.productId]));assert.equal(n.title,ev.title);assert.ok(ev.primaryProducts.some(id=>s.listing.includes(id)));assert.ok(f.diagnostic.swan);
    const a=new H.Engine(),b=new H.Engine();a.restore(s);b.restore(JSON.parse(JSON.stringify(s)));for(let i=0;i<3;i++){go(a);go(b);same(a.snapshot(),b.snapshot());}
    const past=s.swanLog.at(-1);assert.equal(past.week,s.week);assert.equal(s.activeEvents.filter(a=>a.started===s.week).length,1);
    const safe=new H.Engine();safe.restore(f.prior);const before=safe.snapshot();for(const op of [{type:'buy',id:'rice',qty:-1},{type:'next',revision:-1}]){assert.equal(safe.dispatch({...op,revision:op.revision??before.revision,token:'fail-'+(++token)}).ok,false);same(safe.snapshot(),before);}
    let saves=0;safe.onCommit=()=>{saves++;throw Error('quota');};const op={type:'next',revision:before.revision,token:'commit-'+(++token)},r=safe.dispatch(op);assert.equal(r.ok,true);assert.ok(r.saveError);same(safe.snapshot(),s);const committed=safe.snapshot();assert.equal(safe.dispatch(op).ok,false);same(safe.snapshot(),committed);assert.equal(saves,1);
  }
});
test('swan log/active/news bidirectional strict negative tests and real actual percentages',()=>{
  for(const f of Object.values(report.fixtures)){
    const s=f.state,id=s.swanLog.at(-1).id;
    const mods=[x=>x.swanLog.pop(),x=>x.swanLog.at(-1).extra=1,x=>x.swanLog.at(-1).id='unknown',x=>x.swanLog.at(-1).week++,x=>x.swanLog.push(clone(x.swanLog.at(-1))),x=>x.activeEvents=x.activeEvents.filter(a=>a.id!==id),x=>x.activeEvents.find(a=>a.id===id).started--,x=>x.activeEvents.find(a=>a.id===id).until++,x=>x.news=x.news.filter(n=>n.id!==id),x=>x.news.find(n=>n.id===id).fresh=false,x=>x.news.find(n=>n.id===id).changeBps++,x=>x.news.find(n=>n.id===id).productId='tea',x=>x.news.push(clone(x.news.find(n=>n.id===id)))];
    for(const mutate of mods)reject(s,mutate);for(const kind of ['personal','holding','listing','ongoing'])reject(s,x=>x.news.find(n=>n.id===id).kind=kind);
    reject(s,x=>x.upgrade={fromVersion:3,fromRules:'0.4',atWeek:x.week,backup:'homeyear.save.backup.0123456789abcdef'});
    if(H.events.find(e=>e.id===id).duration>1){const e=new H.Engine();e.restore(s);go(e);const x=e.snapshot();assert.equal(x.news.find(n=>n.id===id).kind,'ongoing');assert.equal(x.news.find(n=>n.id===id).reliability,'normal');reject(x,y=>y.news.find(n=>n.id===id).kind='headline');reject(x,y=>y.news.find(n=>n.id===id).fresh=true);reject(x,y=>y.news.find(n=>n.id===id).reliability='reliable');}
  }
  const s=clone(report.fixtures.swan_heat.state);s.swanLog.at(-1).week=26;assert.throws(()=>H.validate(s));
});
test('immediate applies once, persistent caps/reversion untouched, no mirror on expiry',()=>{
  const s=scheduleBase(),q=s.market.mask;q.trend=0;q.previous=q.price=10000;s.macro=1;s.activeEvents=[{id:'swan_protection',started:4,until:4}];
  const random=H.random;try{H.random=()=>.5;H.prices(s);assert.equal(q.price,21000);const first=q.price;s.week=5;s.activeEvents=[];H.prices(s);assert.ok(q.price>10000&&q.price<first);assert.notEqual(q.price,10000);
    const route=scheduleBase();route.activeEvents=[{id:'swan_route',started:4,until:6}];const phone=route.market.phone;phone.trend=0;const prev=phone.price;const onset=H.prices(route);assert.equal(phone.price,Math.round(prev*1.4));assert.equal(onset.persistCapped.includes('phone'),false);
    // Protection is immediate +11000 and is intentionally not capped like daily persist.
    const daily=scheduleBase();daily.activeEvents=[{id:'swan_heat',started:4,until:6}];const caps=H.prices(daily);assert.equal(caps.persistCapped.includes('fruit'),false);same(H.persistCap,V.persistCap);assert.equal(H.rules.revertRate,V.rules.revertRate);
  }finally{H.random=random;}
});
test('visible projection has no scheduling/predictive state; diagnostics clone and committed only',()=>{
  const f=report.fixtures.swan_route,e=new H.Engine();e.restore(f.prior);same(e.diagnostics().eventLog,[]);const before=e.snapshot();e.visible();e.diagnostics();same(e.snapshot(),before);go(e);const d=e.diagnostics();assert.equal(d.eventLog.length,1);d.eventLog[0].started='changed';assert.equal(e.diagnostics().eventLog[0].started,'swan_route');
  const v=e.visible();for(const k of ['swanLog','activeEvents','rng','trend','upgrade'])assert.ok(!Object.hasOwn(v,k));assert.equal(JSON.stringify(v).includes('swanAttempt'),false);assert.ok(v.news.some(n=>n.id==='swan_route'));
});
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'unit-report.json'),JSON.stringify(report,null,2));for(const [id,f] of Object.entries(report.fixtures))fs.writeFileSync(path.join(out,id+'-fixture.json'),JSON.stringify(f,null,2));
console.log(`${report.checks.filter(x=>x.pass).length} passed, ${report.checks.filter(x=>!x.pass).length} failed`);if(report.checks.some(x=>!x.pass))process.exitCode=1;
