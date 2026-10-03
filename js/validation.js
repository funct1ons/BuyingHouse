(function (H) {
  'use strict';
  function object(value,label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(label+'必须是对象');
  }
  function keys(value,expected,label) {
    object(value,label);
    const actual = Object.keys(value);
    if (actual.length !== expected.length || expected.some(k => !Object.prototype.hasOwnProperty.call(value,k))) {
      throw Error(label+'字段缺失或未知');
    }
  }
  function finite(n,min,max,label) {
    if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) throw Error(label+'无效');
  }
  function same(a,b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    const ka=Object.keys(a), kb=Object.keys(b);
    return ka.length===kb.length && ka.every(k => Object.prototype.hasOwnProperty.call(b,k) && same(a[k],b[k]));
  }
  H.validateSettings = settings => {
    keys(settings,Object.keys(H.defaultSettings),'设置');
    for (const key of ['autoSave','sound','music']) if (typeof settings[key] !== 'boolean') throw Error('设置类型错误');
    if (!['normal','reduced','off'].includes(settings.animation) || !['decimal','compact'].includes(settings.numberFormat)) throw Error('设置值无效');
  };
  H.validate = function (s) {
    keys(s,['version','rulesVersion','seed','difficulty','week','cash','capacity','warehouse','revision','status','house','result',
      'rng','inventory','market','activeEvents','macro','season','personal','personalEvent','news','history','stats'],'存档');
    if (s.version !== H.rules.saveVersion || s.rulesVersion !== H.rules.version) throw Error('存档版本不兼容（不支持旧版或未来版本）');
    if (typeof s.seed !== 'string' || !s.seed.length || s.seed.length>128) throw Error('种子无效');
    if (!Object.prototype.hasOwnProperty.call(H.difficulties,s.difficulty)) throw Error('难度无效');
    H.int(s.week,1,52); H.int(s.cash); H.int(s.revision);
    const warehouse = H.warehouses.find(w => w.id === s.warehouse);
    if (!warehouse || s.capacity !== warehouse.capacity) throw Error('仓储等级与容量不一致');
    if (s.house !== null && !H.houses.some(h => h.id === s.house)) throw Error('住房无效');
    if (!['playing','ended'].includes(s.status)) throw Error('状态无效');
    if (s.status === 'playing' && s.result !== null) throw Error('未结束状态不能有结算');
    if (s.status === 'ended' && s.week !== 52) throw Error('结算周无效');
    keys(s.rng,['market','events','visual'],'随机流');
    for (const key of ['market','events','visual']) H.int(s.rng[key],1,4294967295);
    const ids = H.products.map(p => p.id);
    keys(s.inventory,ids,'库存'); keys(s.market,ids,'市场');
    let costs = 0;
    for (const p of H.products) {
      const i=s.inventory[p.id], m=s.market[p.id];
      keys(i,['qty','cost'],'持仓'); H.int(i.qty); H.int(i.cost);
      if ((i.qty===0)!==(i.cost===0)) throw Error('数量与成本不一致');
      costs=H.add(costs,i.cost);
      keys(m,['price','previous','trend','history','low','high'],'行情');
      H.int(m.price,p.min,p.max); H.int(m.previous,p.min,p.max);
      finite(m.trend,-1,1,'趋势');
      H.int(m.low,p.min,m.price); H.int(m.high,m.price,p.max);
      if (!Array.isArray(m.history) || m.history.length!==Math.min(s.week,12)) throw Error('行情历史长度无效');
      m.history.forEach(v => H.int(v,m.low,m.high));
      if (m.history[m.history.length-1]!==m.price || (s.week>1 && m.history[m.history.length-2]!==m.previous)) throw Error('行情历史与当前价不一致');
      if (s.week===1 && m.previous!==m.price) throw Error('初周前价无效');
    }
    if (H.used(s)>s.capacity) throw Error('容量溢出');
    finite(s.macro,.8,1.2,'宏观');
    if (s.season!==H.seasonAt(s.week)) throw Error('本周季节无效');
    if (!Array.isArray(s.activeEvents) || s.activeEvents.length>H.events.length) throw Error('持续事件无效');
    const unique=new Set();
    for (const a of s.activeEvents) {
      keys(a,['id','started','until'],'持续事件');
      const e=H.events.find(e => e.id===a.id && e.type==='market');
      if (!e || unique.has(a.id)) throw Error('事件无效或重复');
      unique.add(a.id);
      H.int(a.started,2,s.week); H.int(a.until,s.week,55);
      if (a.until!==a.started+e.duration-1) throw Error('事件持续时间不一致');
    }
    H.int(s.personal,-1000000,1000000);
    if (s.personalEvent!==null) {
      const e=H.events.find(e => e.id===s.personalEvent && e.type==='personal');
      if (!e || s.personal!==(e.cash<0?Math.round(e.cash*H.difficulty(s).risk):e.cash)) throw Error('个人事件不一致');
    } else if (s.personal!==0) throw Error('个人收支缺少事件');
    keys(s.stats,H.statFields.concat('byProduct'),'统计');
    for (const k of H.statFields) H.int(s.stats[k],['profit','worst'].includes(k)?-Number.MAX_SAFE_INTEGER:0);
    H.int(s.stats.worst,-Number.MAX_SAFE_INTEGER,0);
    H.int(s.stats.houseWeek,0,s.week); H.int(s.stats.upgrades,0,3); H.int(s.stats.maxDrawdown,0,1000000);
    if ((s.house===null)!==(s.stats.houseWeek===0)) throw Error('购房周数不一致');
    if (s.stats.warehouseSpent!==H.warehousePrice(s,warehouse) || (s.warehouse==='room')!==(s.stats.upgrades===0)) throw Error('仓储统计不一致');
    keys(s.stats.byProduct,ids,'商品利润');
    const st=s.stats, big=BigInt;
    let profits=0n;
    for (const p of H.products) {
      H.int(st.byProduct[p.id],-Number.MAX_SAFE_INTEGER); profits+=big(st.byProduct[p.id]);
      const i=s.inventory[p.id];
      // Each buy adds at most ceil(max*fee) per unit. A partial-sale floor
      // leaves less than one extra cent; allow one cent per historical trade.
      const lower=big(i.qty)*big(p.min+Math.floor(p.min*H.rules.fee));
      const upper=big(i.qty)*big(p.max+Math.ceil(p.max*H.rules.fee))+big(st.trades);
      if (i.cost && (big(i.cost)<lower || big(i.cost)>upper)) throw Error('持仓成本超出可达价格范围');
    }
    const bought=big(st.bought),sold=big(st.sold),fees=big(st.fees),turnover=big(st.turnover),trades=big(st.trades);
    const realized=bought-big(costs);
    if (realized<0n || profits!==big(st.profit) || big(st.profit)!==sold-realized) throw Error('交易利润不一致');
    // B=buy gross+buy fees; S=sell gross-sell fees; T=both gross.
    const twiceBuyFees=bought+sold-turnover+fees;
    if (twiceBuyFees<0n || twiceBuyFees>2n*fees || twiceBuyFees%2n) throw Error('手续费与成交额不一致');
    const buyFees=twiceBuyFees/2n,sellFees=fees-buyFees;
    const buyGross=bought-buyFees,sellGross=sold+sellFees;
    for (const [gross,fee] of [[buyGross,buyFees],[sellGross,sellFees]]) {
      if (gross<0n || (gross===0n && fee!==0n) || fee<gross/100n || fee>gross/100n+trades) throw Error('手续费统计无效');
    }
    if ((trades===0n && (bought || sold || fees || turnover || big(costs) || st.best || st.worst)) ||
        (trades>0n && (turnover===0n || fees===0n || turnover<1500n*trades)) ||
        big(st.best)>sold || -big(st.worst)>realized ||
        big(st.profit)>big(st.best)*trades || big(st.profit)<big(st.worst)*trades) throw Error('交易次数或最佳最差统计不一致');
    // Operation-level peaks can exceed the overwritten weekly history. Use a
    // conservative resource bound, never equality with weekly-history maxima.
    const maxStock=trades===0n?0n:big(s.capacity)*big(Math.max(...H.products.map(p=>Math.ceil(p.max/p.size))));
    if (st.peak<H.difficulty(s).initialCash || big(st.peak)>big(H.difficulty(s).initialCash)+big(st.grants)+sold+maxStock) throw Error('资产峰值不可达');
    const minimumDrawdown=st.peak?Math.round((st.peak-H.assets(s))/st.peak*1000000):0;
    if (st.maxDrawdown<minimumDrawdown) throw Error('最大回撤小于当前回撤');
    const expectedCash=H.difficulty(s).initialCash-s.stats.bought+s.stats.sold+s.stats.grants-s.stats.expenses-H.houseValue(s)-s.stats.warehouseSpent;
    if (!Number.isSafeInteger(expectedCash) || expectedCash!==s.cash) throw Error('现金与收支统计不一致');
    if (!Array.isArray(s.history) || s.history.length!==s.week) throw Error('资产历史长度无效');
    for (let index=0;index<s.history.length;index++) {
      const v=s.history[index]; keys(v,['week','cash','inventory','house','assets'],'资产历史');
      H.int(v.week,index+1,index+1);
      for (const k of ['cash','inventory','house','assets']) H.int(v[k]);
      if (v.assets!==H.add(H.add(v.cash,v.inventory),v.house) || v.assets>s.stats.peak) throw Error('资产历史不一致');
    }
    const current=s.history[s.week-1];
    if (current.cash!==s.cash || current.inventory!==H.inventoryValue(s) || current.house!==H.houseValue(s) || current.assets!==H.assets(s)) throw Error('本周资产历史不一致');
    if (!Array.isArray(s.news) || s.news.length>H.events.length+1) throw Error('新闻无效');
    for (const n of s.news) {
      keys(n,['id','title','reliability','week'],'新闻');
      if ((n.id!=='rumor' && !H.events.some(e => e.id===n.id)) || typeof n.title!=='string' || !n.title.length || n.title.length>200 || !Object.prototype.hasOwnProperty.call(H.reliability,n.reliability) || n.week!==s.week) throw Error('新闻内容无效');
    }
    if (s.status==='ended' && !same(s.result,H.summary(s))) throw Error('结算与状态不一致');
    return true;
  };
})(window.HomeYear);
