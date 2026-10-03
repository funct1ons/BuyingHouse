(function (H) {
  'use strict';
  H.create = function (seed='CITY-382741',difficulty='standard') {
    if (typeof seed!=='string' || !seed.length || seed.length>128) throw Error('种子不能为空或过长');
    if (!Object.prototype.hasOwnProperty.call(H.difficulties,difficulty)) throw Error('难度无效');
    const s={version:H.rules.saveVersion, rulesVersion:H.rules.version, seed, difficulty,
      week:1, cash:H.difficulties[difficulty].initialCash, capacity:H.rules.capacity, warehouse:'room',
      revision:0, status:'playing', house:null, result:null, rng:{}, inventory:{}, market:{}, activeEvents:[],
      macro:1, season:'冬', personal:0, personalEvent:null, news:[], history:[], stats:{}};
    for (const key of H.statFields) s.stats[key]=0;
    s.stats.byProduct={};
    for (const stream of ['market','events','visual']) s.rng[stream]=H.seed(seed+':'+stream);
    for (const p of H.products) {
      s.inventory[p.id]={qty:0,cost:0};
      s.market[p.id]={price:p.base,previous:p.base,trend:0,history:[p.base],low:p.base,high:p.base};
      s.stats.byProduct[p.id]=0;
    }
    H.record(s); H.validate(s);
    return s;
  };
  H.Engine = function (seed,difficulty) {
    let state=H.create(seed,difficulty), seen=new Set();
    this.onCommit=null;
    this.snapshot=() => H.clone(state);
    this.restore=s => {
      // Validate before copying: JSON serialization must never silently coerce NaN.
      H.validate(s);
      const copy=H.clone(s);
      state=copy;
      seen=new Set();
    };
    // Public information projection for UI/simulation; no trends, RNG, or hidden effects.
    this.visible=() => ({seed:state.seed,difficulty:state.difficulty,week:state.week,revision:state.revision,
      cash:state.cash,capacity:state.capacity,warehouse:state.warehouse,house:state.house,status:state.status,
      inventory:H.clone(state.inventory),news:H.clone(state.news),assets:H.assets(state),
      market:Object.fromEntries(H.products.map(p => {const m=state.market[p.id];return [p.id,
        {price:m.price,previous:m.previous,history:m.history.slice(),low:m.low,high:m.high}];}))});
    this.dispatch=op => {
      try {
        if (!op || typeof op.token!=='string' || !op.token.length) throw Error('操作标识缺失');
        if (op.type==='end' && state.status==='ended') return {ok:true,result:H.clone(state.result)};
        if (seen.has(op.token)) throw Error('重复提交');
        if (op.revision!==state.revision) throw Error('操作已过期');
        if (state.status!=='playing') throw Error('本年已结束');
        const next=H.clone(state);
        switch (op.type) {
          case 'buy': case 'sell': H.trade(next,op.type,op.id,op.qty); break;
          case 'house': H.buyHouse(next,op.id); break;
          case 'warehouse': H.upgradeWarehouse(next,op.id); break;
          case 'next':
            if (next.week===52) throw Error('第52周请结束本年');
            next.week++;
            H.environment(next); H.drawEvents(next); H.trends(next); H.prices(next);
            H.personal(next); H.news(next); break;
          case 'end':
            if (next.week!==52) throw Error('尚未到年底');
            next.status='ended'; break;
          default: throw Error('未知操作');
        }
        H.record(next); next.revision++;
        if (next.status==='ended') next.result=H.summary(next);
        H.validate(next);
        state=next; seen.add(op.token);
        let saveError=null;
        if (this.onCommit) {
          try {this.onCommit(this.snapshot());} catch (e) {saveError=e.message;}
        }
        return {ok:true,saveError,result:state.result ? H.clone(state.result) : null};
      } catch (e) {return {ok:false,error:e.message};}
    };
  };
})(window.HomeYear);
