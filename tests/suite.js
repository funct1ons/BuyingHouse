(function (g) {
  'use strict';
  g.runCoreTests = function () {
    const H=g.HomeYear, log=[];
    function test(name,f) {try {f();log.push('PASS '+name);} catch(e) {log.push('FAIL '+name+': '+e.message);}}
    function assert(v,msg='断言失败') {if(!v) throw Error(msg);}
    const equal=(a,b) => assert(JSON.stringify(a)===JSON.stringify(b),'内容不相等');
    let token=0;
    const op=(e,type,id,qty) => e.dispatch({type,id,qty,revision:e.visible().revision,token:'test-'+(++token)});
    function fund(e,cash) {
      const s=e.snapshot();
      if(cash>=s.cash)s.stats.grants+=cash-s.cash;else s.stats.expenses+=s.cash-cash;
      s.cash=cash;H.record(s);e.restore(s);
    }
    function price(e,id,value) {
      const s=e.snapshot(),m=s.market[id];m.price=value;m.history[m.history.length-1]=value;
      if(s.week===1)m.previous=value;
      m.low=Math.min(m.low,value);m.high=Math.max(m.high,value);s.rumors=H.makeRumors(s);H.record(s);e.restore(s);
    }
    function rejects(e,mutate) {
      const before=e.snapshot(),bad=H.clone(before);mutate(bad);
      let caught=false;try{e.restore(bad);}catch(_){caught=true;}
      assert(caught,'应拒绝损坏档');equal(before,e.snapshot());
    }
    function ensureListed(e,id) {
      const s=e.snapshot();
      if(s.listing.includes(id))return;
      const listed=s.listing.slice();
      for(let i=listed.length-1;i>=0;i--){
        const outgoing=listed[i],trial=listed.slice();
        trial[i]=id;
        const sorted=H.products.map(p=>p.id).filter(x=>trial.includes(x));
        if(!H.listingCovers(sorted))continue;
        s.listing=sorted;s.absence[id]=0;s.onStreak[id]=1;s.absence[outgoing]=1;s.onStreak[outgoing]=0;
        s.rumors=H.makeRumors(s);H.record(s);e.restore(s);return;
      }
      throw Error('无法上架 '+id);
    }
    test('12轮换池/8退出商品/37事件/9住房/4仓储与价格簿',()=>{
      // 规则0.5仅新增7重大事件；0.4完整目录冻结，不用于现行事件抽取。住房冲击不进入 H.events。
      assert(H.products.length===12&&H.legacyProducts.length===8&&H.events.length===37&&H.houses.length===9&&H.warehouses.length===4);
      assert(!H.events.some(e=>e.id==='housing_stimulus'||e.id==='housing_first'||e.id==='housing_default'||e.id==='housing_index'));
      assert(H.v3.catalog.events.length===30&&H.v3.catalog.rules.saveVersion===3);
      assert(H.v2.catalog.products.length===20&&H.v2.catalog.events.length===40&&H.v2.catalog.rules.saveVersion===2);
      for(const p of H.products){for(const k of ['name','category','description','basePrice','minPrice','maxPrice','volatility','trendSensitivity','eventSensitivity','unitSize','icon','season'])assert(p[k]!==undefined);assert(p.basePrice===p.base&&p.unitSize===p.size);}
      assert(new Set(H.products.map(p=>p.volatility)).size>8);
      for(const d of Object.keys(H.difficulties))H.validate(H.create('difficulty',d));
    });
    test('不同价买入、多次部分卖出、费用与清仓精确整数',()=>{
      const e=new H.Engine('cost');ensureListed(e,'rice');price(e,'rice',18001);assert(op(e,'buy','rice',3).ok);
      price(e,'rice',20003);assert(op(e,'buy','rice',2).ok);
      equal(e.snapshot().inventory.rice,{qty:5,cost:94951});
      price(e,'rice',22007);assert(op(e,'sell','rice',1).ok);equal(e.snapshot().inventory.rice,{qty:4,cost:75961});
      assert(e.snapshot().stats.profit===2796);
      price(e,'rice',19009);assert(op(e,'sell','rice',2).ok);equal(e.snapshot().inventory.rice,{qty:2,cost:37981});
      assert(e.snapshot().stats.profit===2453);
      price(e,'rice',25001);assert(op(e,'sell','rice',2).ok);equal(e.snapshot().inventory.rice,{qty:0,cost:0});
      const s=e.snapshot();assert(s.cash===313973&&s.stats.profit===13973&&s.stats.fees===2045);
      assert(s.stats.bought===94951&&s.stats.sold===108924&&s.stats.turnover===204036);
      assert(s.stats.best===11520&&s.stats.worst===-343&&s.stats.trades===5);
    });
    test('资金不足/满仓/空仓/非法商品均原子拒绝',()=>{
      const e=new H.Engine();fund(e,10000000);ensureListed(e,'coat');assert(op(e,'buy','coat',10).ok);
      let s=e.snapshot();assert(!op(e,'buy','coat',1).ok);equal(s,e.snapshot());
      assert(!op(e,'sell','rice',1).ok);equal(s,e.snapshot());
      const poor=new H.Engine();fund(poor,0);s=poor.snapshot();assert(!op(poor,'buy','rice',1).ok);equal(s,poor.snapshot());
      assert(!op(poor,'house','studio').ok&&!op(poor,'warehouse','small').ok);
      assert(!op(poor,'buy','missing',1).ok);
    });
    test('整数边界和非有限数不可交易或恢复',()=>{
      const e=new H.Engine();ensureListed(e,'rice');ensureListed(e,'gpu');
      for(const q of [0,-1,NaN,Infinity,1.5,'1',Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER+1]) {
        const s=e.snapshot();assert(!op(e,'buy','rice',q).ok);equal(s,e.snapshot());
      }
      for(const v of [NaN,Infinity,-Infinity,'300000',-1,Number.MAX_SAFE_INTEGER+1])rejects(e,s=>{s.cash=v;});
      rejects(e,s=>{s.market.rice.trend=NaN;});
      fund(e,Number.MAX_SAFE_INTEGER-1000000);assert(op(e,'buy','rice',1).ok);H.validate(e.snapshot());
      assert(!op(e,'buy','gpu',Number.MAX_SAFE_INTEGER).ok);
    });
    test('严格必需字段、库存等级、历史、季节、事件和未来版本校验',()=>{
      const e=new H.Engine();
      for(const k of H.statFields)rejects(e,s=>{delete s.stats[k];});
      for(const k of Object.keys(e.snapshot()))rejects(e,s=>{delete s[k];});
      rejects(e,s=>{s.capacity=40;});rejects(e,s=>{s.warehouse='fake';});
      rejects(e,s=>{s.inventory.rice.qty=1;});rejects(e,s=>{s.inventory.rice.cost=1;});
      rejects(e,s=>{s.inventory.other={qty:0,cost:0};});
      rejects(e,s=>{s.history=[];});rejects(e,s=>{s.history[0].assets++;});
      rejects(e,s=>{s.market.rice.history=[];});rejects(e,s=>{s.market.rice.history.push(18000);});
      rejects(e,s=>{s.market.rice.history[0]++;});rejects(e,s=>{s.season=s.season==='夏'?'冬':'夏';});
      rejects(e,s=>{s.version=999;});rejects(e,s=>{s.rulesVersion='future';});
      rejects(e,s=>{s.result={};});rejects(e,s=>{s.status='ended';});
      op(e,'next');rejects(e,s=>{s.activeEvents=[{id:'chips',started:2,until:8}];});
      rejects(e,s=>{s.activeEvents=[{id:'rent',started:2,until:2}];});
      rejects(e,s=>{s.activeEvents=[{id:'chips',started:2,until:4},{id:'chips',started:2,until:4}];});
      rejects(e,s=>{s.market.rice.previous++;});rejects(e,s=>{s.stats.byProduct.rice++;});
    });
    test('统计关系、零交易、费用溢出与操作级峰值',()=>{
      const e=new H.Engine('audit');ensureListed(e,'rice');
      rejects(e,s=>{s.stats.fees=Number.MAX_SAFE_INTEGER;});
      for(const key of ['turnover','trades','best','worst','peak'])rejects(e,s=>{s.stats[key]=key==='worst'?-1:9999999;});
      assert(op(e,'buy','rice',3).ok);
      for(const key of ['fees','turnover','bought','sold'])rejects(e,s=>{s.stats[key]++;});
      rejects(e,s=>{s.stats.best=1;});rejects(e,s=>{s.stats.worst=-1;});
      rejects(e,s=>{s.stats.maxDrawdown=0;});
      // The initial operation-level peak survives this week's overwritten point.
      const s=e.snapshot();assert(s.stats.peak>s.history[0].assets);H.validate(s);
      assert(op(e,'sell','rice',2).ok);H.validate(e.snapshot());
      rejects(e,s=>{s.stats.best=s.stats.sold+1;});
      rejects(e,s=>{s.stats.worst=-s.stats.bought-1;});
    });
    test('不可能持仓成本拒绝，BigInt部分分摊不溢出',()=>{
      const e=new H.Engine('audit');
      rejects(e,s=>{s.inventory.rice={qty:3,cost:5000000000000000};s.stats.bought=5000000000000000;s.stats.grants=5000000000000000;H.record(s);});
      // Direct helper regression isolates the multiplication even though this
      // impossible imported inventory is now rejected by validation.
      const s=H.create('allocation');s.inventory.rice={qty:3,cost:5000000000000000};
      s.stats.bought=s.inventory.rice.cost;
      H.trade(s,'sell','rice',2);
      equal(s.inventory.rice,{qty:1,cost:1666666666666667});
      H.trade(s,'sell','rice',1);equal(s.inventory.rice,{qty:0,cost:0});
      ensureListed(e,'rice');fund(e,10000000);assert(op(e,'warehouse','large').ok);
      price(e,'rice',43000);assert(op(e,'buy','rice',60).ok);
      for(let i=0;i<59;i++){assert(op(e,'sell','rice',1).ok);H.validate(e.snapshot());}
      assert(op(e,'sell','rice',1).ok);
      price(e,'rice',7000);assert(op(e,'buy','rice',3).ok);assert(op(e,'sell','rice',2).ok);H.validate(e.snapshot());
    });
    test('UTF16种子兼容ASCII/BMP，非BMP低位参与且旧RNG可恢复',()=>{
      function legacy(text){let x=2166136261;for(const c of text)x=Math.imul(x^c.charCodeAt(0),16777619);return (x>>>0)||1;}
      for(const seed of ['audit','CITY-382741','中文种子','éΩ\uffff'])assert(H.seed(seed)===legacy(seed));
      const a=new H.Engine('😀'),b=new H.Engine('😁');op(a,'next');op(b,'next');
      assert(JSON.stringify(a.snapshot().market)!==JSON.stringify(b.snapshot().market));
      const old=H.create('😀');for(const stream of ['market','events','visual'])old.rng[stream]=legacy(old.seed+':'+stream);
      old.rumors=H.makeRumors(old);
      const c=new H.Engine('new'),d=new H.Engine('new');c.restore(old);d.restore(old);
      for(let w=1;w<52;w++){assert(op(c,'next').ok);assert(op(d,'next').ok);equal(c.snapshot(),d.snapshot());}
    });
    test('同种子同操作、restore后未来轨迹与视觉随机流隔离',()=>{
      const a=new H.Engine('same'),b=new H.Engine('same');
      for(let i=0;i<19;i++){assert(op(a,'next').ok);assert(op(b,'next').ok);}equal(a.snapshot(),b.snapshot());
      const c=new H.Engine('other');c.restore(JSON.parse(JSON.stringify(a.snapshot())));
      for(let i=20;i<52;i++){assert(op(a,'next').ok);assert(op(c,'next').ok);equal(a.snapshot(),c.snapshot());}
      const s=b.snapshot();H.random(s,'visual');b.restore(s);const d=new H.Engine();d.restore(c.snapshot());
      const before=b.snapshot(),f=new H.Engine();f.restore(before);H.random(before,'visual');b.restore(before);
      op(b,'next');op(f,'next');equal(b.snapshot().market,f.snapshot().market);
    });
    test('第52周交易购房、升级抵扣、幂等结算和结算一致性',()=>{
      const e=new H.Engine();for(let i=1;i<52;i++)assert(op(e,'next').ok);
      assert(e.snapshot().week===52&&!op(e,'next').ok);fund(e,9000000);ensureListed(e,'rice');
      assert(op(e,'buy','rice',1).ok);assert(op(e,'house','studio').ok);
      assert(e.snapshot().status==='playing');const booked=e.snapshot();
      const due=booked.priceBook.houses.flat-booked.priceBook.houses.studio;
      assert(op(e,'house','flat').ok);assert(e.snapshot().cash===booked.cash-due);
      assert(!op(e,'house','studio').ok&&!op(e,'house','flat').ok);
      assert(op(e,'end').ok);const done=e.snapshot();assert(done.result.house==='flat'&&done.history.length===52);
      assert(op(e,'end').ok);equal(done,e.snapshot());assert(!op(e,'buy','rice',1).ok);
      rejects(e,s=>{s.result.assets++;});rejects(e,s=>{s.result.byProduct.rice++;});rejects(e,s=>{s.result.history.pop();});
    });
    test('仓储升级累计成本、容量与档级',()=>{
      const e=new H.Engine();fund(e,2000000);
      assert(op(e,'warehouse','small').ok);assert(e.snapshot().cash===1930000&&e.snapshot().capacity===40);
      assert(op(e,'warehouse','large').ok);assert(e.snapshot().cash===1500000&&e.snapshot().stats.warehouseSpent===500000);
      assert(!op(e,'warehouse','small').ok&&!op(e,'warehouse','large').ok);
      rejects(e,s=>{s.stats.warehouseSpent--;});
    });
    test('重复/过期操作、快照隔离、保存拒绝不回滚',()=>{
      const e=new H.Engine();ensureListed(e,'rice');const first={type:'buy',id:'rice',qty:1,revision:e.visible().revision,token:'repeat'};
      assert(e.dispatch(first).ok);const s=e.snapshot();assert(!e.dispatch(first).ok);equal(s,e.snapshot());
      assert(!e.dispatch({...first,token:'stale'}).ok);const b=e.snapshot();b.cash=0;assert(e.snapshot().cash===s.cash);
      e.onCommit=()=>{throw Error('storage unavailable');};const r=op(e,'next');assert(r.ok&&r.saveError);
    });
    test('负面事件现金不足、生活收支不混交易利润',()=>{
      const s=H.create();s.cash=100;s.personal=-50000;H.personal(s);
      assert(s.cash===0&&s.stats.hardship===49900&&s.stats.profit===0&&s.stats.expenses===100);
      s.personal=30000;H.personal(s);assert(s.cash===30000&&s.stats.grants===30000&&s.stats.profit===0);
    });
    test('持续事件到期与季节、新闻可靠性和可见信息隔离',()=>{
      const s=H.create('duration');s.week=2;s.activeEvents=[{id:'chips',started:2,until:4}];
      s.week=4;H.drawEvents(s);assert(s.activeEvents.some(e=>e.id==='chips'));
      s.week=5;H.drawEvents(s);assert(!s.activeEvents.some(e=>e.id==='chips'&&e.started===2));
      assert(H.seasonAt(13)==='冬'&&H.seasonAt(14)==='春'&&H.seasonAt(27)==='夏'&&H.seasonAt(40)==='秋');
      const e=new H.Engine();const v=e.visible();assert(!('rng'in v)&&!('activeEvents'in v)&&!('onStreak'in v)&&!('absence'in v)&&!('macro'in v)&&!('personal'in v)&&!('stats'in v)&&!('trend'in v.market.rice)&&!('trend'in v.legacy.gold));
      assert(v.priceBook&&v.priceBook.id==='0.3'&&H.housePrice(v,H.houses[0])===v.priceBook.houses.studio);
      const rngBefore=e.snapshot().rng;const marketBefore=JSON.stringify(e.snapshot().market);e.visible();e.diagnostics();const seen=e.snapshot();
      assert(rngBefore.market===seen.rng.market&&rngBefore.events===seen.rng.events&&rngBefore.visual===seen.rng.visual&&rngBefore.listing===seen.rng.listing&&rngBefore.housing===seen.rng.housing&&marketBefore===JSON.stringify(seen.market));
      for(let i=1;i<52;i++)assert(op(e,'next').ok);for(const n of e.snapshot().news)assert(H.reliability[n.reliability]);
    });
    test('越界才计钳制，贴界且raw未越出不计，读取诊断不耗随机',()=>{
      const orig=H.random;
      let priced;
      try {
        H.random=()=>0.5;
        const s=H.create('clip-bound','standard');
        s.week=2;s.activeEvents=[];
        const rice=H.product('rice');
        const seasonal=1+rice.season*Math.cos((H.calendarWeek(s)-1)/52*Math.PI*2+rice.phase);
        s.macro=rice.max/(rice.base*seasonal);
        for(const p of H.products){s.market[p.id].trend=0;s.market[p.id].price=p.max;}
        s.market.rice.trend=0;s.market.rice.price=rice.max;
        const col=H.product('collectible');
        s.market.collectible.trend=1;s.market.collectible.price=col.max;
        priced=H.prices(s);
        assert(s.market.collectible.price===col.max,'钳制后成交价仍是上界整数');
        assert(s.market.rice.price===rice.max,'未越界的贴界价保持上界');
        assert(priced.clipped.includes('collectible'),'越界计入钳制');
        assert(!priced.clipped.includes('rice'),'贴界未越出不算钳制');
        assert(priced.clips===priced.clipped.length);
        assert(H._priceClips===undefined,'价格诊断不再写全局钩子');
      } finally {H.random=orig;}
      const spec=H.create('clip-spec','standard');
      spec.week=3;spec.activeEvents=[{id:'chips',started:3,until:5}];
      const specDiag=H.prices(spec);
      assert(specDiag.specStarts===1,'投机品冲击首周 '+specDiag.specStarts);
      assert(specDiag.specStartClips<=specDiag.specStarts);
      const capped=H.create('persist-cap','standard');
      capped.week=6;capped.activeEvents=[{id:'crop_loss',started:4,until:7},{id:'heat',started:6,until:8}];
      const capDiag=H.prices(capped);
      assert(capDiag.persistCapped.includes('fruit')&&capDiag.persistCapTriggers>=1,'持续项护栏单独计数');
      assert(capped.market.fruit.price>=H.product('fruit').min&&capped.market.fruit.price<=H.product('fruit').max);
      const engine=new H.Engine('clip-clear','standard');
      assert(op(engine,'next').ok);
      const committed=engine.diagnostics();
      assert(committed.clipLog.length===1&&Number.isInteger(committed.clips)&&Number.isInteger(committed.persistCapTriggers));
      const mid=engine.snapshot();
      engine.visible();engine.diagnostics();
      const after=engine.snapshot();
      assert(mid.rng.market===after.rng.market&&mid.rng.events===after.rng.events&&mid.rng.visual===after.rng.visual&&mid.rng.listing===after.rng.listing&&mid.rng.housing===after.rng.housing);
      assert(JSON.stringify(mid.market)===JSON.stringify(after.market));
      const rejected=engine.dispatch({type:'next',revision:engine.visible().revision-1,token:'stale-next'});
      assert(!rejected.ok&&engine.diagnostics().clips===committed.clips&&engine.diagnostics().clipLog.length===1,'拒绝的 next 不增加诊断');
      const fresh=new H.Engine('clip-fresh','standard').snapshot();
      engine.restore(fresh);
      assert(engine.diagnostics().clips===0&&engine.diagnostics().persistCapTriggers===0&&engine.diagnostics().clipLog.length===0,'restore 重置诊断');
      const late=new H.Engine('week52-reject','standard');
      for(let i=1;i<52;i++)assert(op(late,'next').ok);
      const beforeReject=late.diagnostics().clips;
      assert(late.visible().week===52&&!late.dispatch({type:'next',revision:late.visible().revision,token:'week52-next'}).ok);
      assert(late.diagnostics().clips===beforeReject,'第52周拒绝 next 不增加钳制');
    });
    test('存档自动/手动接口、设置分离、异常JSON/导入原子失败',()=>{
      const map=new Map(),store={getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
      const saves=new H.SaveAdapter(store),e=new H.Engine('save');
      assert(saves.load().ok&&saves.load().state===null);e.onCommit=s=>{const r=saves.save(s);if(!r.ok)throw Error(r.error);};
      ensureListed(e,'rice');assert(op(e,'buy','rice',1).ok);equal(saves.load().state,e.snapshot());
      const settings=H.clone(H.defaultSettings);settings.autoSave=false;assert(saves.saveSettings(settings).ok);
      e.onCommit=null;op(e,'next');assert(saves.load().state.week===1);assert(saves.save(e.snapshot()).ok);
      equal(saves.loadSettings().settings,settings);assert(!('settings'in e.snapshot()));
      const before=e.snapshot();for(const text of ['','{','null','[]','{"version":999}','{"cash":NaN}']){assert(!saves.import(text,e).ok);equal(before,e.snapshot());}
      const missing=e.snapshot();delete missing.stats.fees;assert(!saves.import(JSON.stringify(missing),e).ok);equal(before,e.snapshot());
      const other=new H.Engine();assert(saves.import(saves.export(e.snapshot()),other).ok);equal(other.snapshot(),e.snapshot());
    });
    test('损坏原档隔离且不自动覆盖，明确恢复/删除与存储拒绝可导出',()=>{
      const map=new Map(),store={getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
      const saves=new H.SaveAdapter(store),e=new H.Engine();map.set(saves.key,'BROKEN');
      assert(!saves.load().ok&&saves.damaged()==='BROKEN');assert(!saves.save(e.snapshot()).ok);assert(map.get(saves.key)==='BROKEN');
      assert(saves.save(e.snapshot(),{replaceDamaged:true}).ok&&saves.damaged()===null);
      assert(saves.remove().ok&&saves.load().state===null);
      map.set('homeyear.save.v1','legacy');assert(saves.load().ok&&saves.load().notice===H.oldSaveNotice&&saves.save(e.snapshot()).ok);assert(map.get('homeyear.save.v1')==='legacy');
      assert(saves.remove().ok);
      const denied=new H.SaveAdapter({getItem:()=>{throw Error('denied');},setItem:()=>{throw Error('quota');},removeItem:()=>{throw Error('denied');}});
      assert(!denied.load().ok&&!denied.save(e.snapshot()).ok);assert(denied.export(e.snapshot()).includes('CITY-382741'));
      e.onCommit=s=>{const r=denied.save(s);if(!r.ok)throw Error(r.error);};assert(op(e,'next').ok);
      map.set(saves.settingsKey,'{}');const settings=saves.loadSettings();assert(!settings.ok);equal(settings.settings,H.defaultSettings);
    });
    test('100种子52周交易、统计和全部不变式',()=>{
      for(let n=0;n<100;n++) {
        const e=new H.Engine('invariant-'+n,Object.keys(H.difficulties)[n%3]);
        for(let w=1;w<=52;w++){const id=e.snapshot().listing[0];op(e,'buy',id,1);op(e,'sell',id,1);H.validate(e.snapshot());if(w<52)assert(op(e,'next').ok);}
        assert(op(e,'end').ok);H.validate(e.snapshot());
      }
    });
    test('多种子52周轮换覆盖、缺席与不重抽',()=>{
      for(let n=0;n<20;n++){
        const e=new H.Engine('rotate-'+n,Object.keys(H.difficulties)[n%3]);
        const seen={};
        for(const p of H.products)seen[p.id]=0;
        for(let w=1;w<=52;w++){
          const s=e.snapshot();
          assert(s.listing.length===8&&H.listingCovers(s.listing));
          for(const p of H.products){
            if(!s.listing.includes(p.id)){seen[p.id]++;assert(seen[p.id]<=3&&s.absence[p.id]<=3);}else seen[p.id]=0;
          }
          if(s.week<52){
            const prev=H.clone(s),other=new H.Engine();other.restore(prev);
            assert(op(e,'next').ok);assert(op(other,'next').ok);equal(e.snapshot(),other.snapshot());
          }
        }
      }
    });
    test('未上架不能买，最低回收价1380且费用恒等式仍在',()=>{
      assert(H.buybackQuote(1500)===1380&&H.channelMin()===1380);
      const e=new H.Engine('buyback');fund(e,10000000);
      const off=H.products.find(p=>!e.snapshot().listing.includes(p.id));
      const before=e.snapshot();assert(!op(e,'buy',off.id,1).ok);equal(before,e.snapshot());
      ensureListed(e,'mask');price(e,'mask',1500);assert(op(e,'buy','mask',1).ok);
      const s=e.snapshot();let replaced=false;
      for(const incoming of H.products.filter(p=>!s.listing.includes(p.id))){
        const sorted=H.products.map(p=>p.id).filter(id=>s.listing.includes(id)&&id!=='mask'||id===incoming.id);
        if(!H.listingCovers(sorted))continue;
        s.listing=sorted;s.absence.mask=1;s.onStreak.mask=0;s.absence[incoming.id]=0;s.onStreak[incoming.id]=1;
        s.rumors=H.makeRumors(s);e.restore(s);replaced=true;break;
      }
      assert(replaced&&!e.snapshot().listing.includes('mask'));
      const cash=e.snapshot().cash,fees=e.snapshot().stats.fees,turnover=e.snapshot().stats.turnover,fee=H.fee(1380);
      assert(op(e,'sell','mask',1).ok);
      const after=e.snapshot();
      assert(after.cash===cash+1380-fee&&after.stats.turnover===turnover+1380&&after.stats.fees===fees+fee&&after.inventory.mask.qty===0);
      H.validate(after);rejects(e,st=>{st.stats.fees++;});
    });
    test('新用户默认开启音乐且已有关闭偏好保持不变',()=>{
      assert(H.defaultSettings.music===true);
      const map=new Map(),saves=new H.SaveAdapter({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});
      assert(saves.loadSettings().settings.music===true);
      map.set(saves.settingsKey,JSON.stringify({...H.defaultSettings,music:false}));
      assert(saves.loadSettings().settings.music===false);
    });
    return {passed:log.filter(x=>x.startsWith('PASS')).length,failed:log.filter(x=>x.startsWith('FAIL')).length,log};
  };
})(window);
