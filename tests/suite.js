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
      m.low=Math.min(m.low,value);m.high=Math.max(m.high,value);H.record(s);e.restore(s);
    }
    function rejects(e,mutate) {
      const before=e.snapshot(),bad=H.clone(before);mutate(bad);
      let caught=false;try{e.restore(bad);}catch(_){caught=true;}
      assert(caught,'应拒绝损坏档');equal(before,e.snapshot());
    }
    test('20商品/40数据事件/5住房/4仓储/三难度与字段差异',()=>{
      assert(H.products.length===20&&H.events.length===40&&H.houses.length===5&&H.warehouses.length===4);
      for(const p of H.products){for(const k of ['name','category','description','basePrice','minPrice','maxPrice','volatility','trendSensitivity','eventSensitivity','unitSize','icon','season'])assert(p[k]!==undefined);assert(p.basePrice===p.base&&p.unitSize===p.size);}
      assert(new Set(H.products.map(p=>p.volatility)).size>8);
      for(const d of Object.keys(H.difficulties))H.validate(H.create('difficulty',d));
    });
    test('不同价买入、多次部分卖出、费用与清仓精确整数',()=>{
      const e=new H.Engine('cost');price(e,'rice',18001);assert(op(e,'buy','rice',3).ok);
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
      const e=new H.Engine();fund(e,10000000);assert(op(e,'buy','coat',10).ok);
      let s=e.snapshot();assert(!op(e,'buy','coat',1).ok);equal(s,e.snapshot());
      assert(!op(e,'sell','rice',1).ok);equal(s,e.snapshot());
      const poor=new H.Engine();fund(poor,0);s=poor.snapshot();assert(!op(poor,'buy','rice',1).ok);equal(s,poor.snapshot());
      assert(!op(poor,'house','studio').ok&&!op(poor,'warehouse','small').ok);
      assert(!op(poor,'buy','missing',1).ok);
    });
    test('整数边界和非有限数不可交易或恢复',()=>{
      const e=new H.Engine();
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
      rejects(e,s=>{s.market.rice.history[0]++;});rejects(e,s=>{s.season='夏';});
      rejects(e,s=>{s.version=999;});rejects(e,s=>{s.rulesVersion='future';});
      rejects(e,s=>{s.result={};});rejects(e,s=>{s.status='ended';});
      op(e,'next');rejects(e,s=>{s.activeEvents=[{id:'chips',started:2,until:8}];});
      rejects(e,s=>{s.activeEvents=[{id:'rent',started:2,until:2}];});
      rejects(e,s=>{s.activeEvents=[{id:'chips',started:2,until:4},{id:'chips',started:2,until:4}];});
      rejects(e,s=>{s.market.rice.previous++;});rejects(e,s=>{s.stats.byProduct.rice++;});
    });
    test('统计关系、零交易、费用溢出与操作级峰值',()=>{
      const e=new H.Engine('audit');
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
      fund(e,10000000);assert(op(e,'warehouse','large').ok);
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
      assert(e.snapshot().week===52&&!op(e,'next').ok);fund(e,9000000);
      assert(op(e,'buy','rice',1).ok);assert(op(e,'house','studio').ok);
      assert(e.snapshot().status==='playing');const cash=e.snapshot().cash;
      assert(op(e,'house','flat').ok);assert(e.snapshot().cash===cash-350000);
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
      const e=new H.Engine(),first={type:'buy',id:'rice',qty:1,revision:0,token:'repeat'};
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
      const e=new H.Engine();const v=e.visible();assert(!('rng'in v)&&!('activeEvents'in v)&&!('trend'in v.market.rice));
      for(let i=1;i<52;i++)assert(op(e,'next').ok);for(const n of e.snapshot().news)assert(H.reliability[n.reliability]);
    });
    test('存档自动/手动接口、设置分离、异常JSON/导入原子失败',()=>{
      const map=new Map(),store={getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
      const saves=new H.SaveAdapter(store),e=new H.Engine('save');
      assert(saves.load().ok&&saves.load().state===null);e.onCommit=s=>{const r=saves.save(s);if(!r.ok)throw Error(r.error);};
      assert(op(e,'buy','rice',1).ok);equal(saves.load().state,e.snapshot());
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
      map.set('homeyear.save.v1','legacy');assert(!saves.load().ok&&!saves.save(e.snapshot()).ok);assert(map.get('homeyear.save.v1')==='legacy');
      assert(saves.remove().ok);
      const denied=new H.SaveAdapter({getItem:()=>{throw Error('denied');},setItem:()=>{throw Error('quota');},removeItem:()=>{throw Error('denied');}});
      assert(!denied.load().ok&&!denied.save(e.snapshot()).ok);assert(denied.export(e.snapshot()).includes('CITY-382741'));
      e.onCommit=s=>{const r=denied.save(s);if(!r.ok)throw Error(r.error);};assert(op(e,'next').ok);
      map.set(saves.settingsKey,'{}');const settings=saves.loadSettings();assert(!settings.ok);equal(settings.settings,H.defaultSettings);
    });
    test('100种子52周交易、统计和全部不变式',()=>{
      for(let n=0;n<100;n++) {
        const e=new H.Engine('invariant-'+n,Object.keys(H.difficulties)[n%3]);
        for(let w=1;w<=52;w++){op(e,'buy','coat',1);op(e,'sell','coat',1);H.validate(e.snapshot());if(w<52)assert(op(e,'next').ok);}
        assert(op(e,'end').ok);H.validate(e.snapshot());
      }
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
