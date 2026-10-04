
(function (H) {
  'use strict';
  const V = {"rules":{"version":"0.2","saveVersion":2,"initialCash":300000,"capacity":20,"weeks":52,"fee":0.01},"difficulties":{"easy":{"name":"轻松","initialCash":400000,"houseFactor":0.8,"warehouseFactor":0.8,"volatility":0.85,"risk":0.8},"standard":{"name":"标准","initialCash":300000,"houseFactor":1,"warehouseFactor":1,"volatility":1,"risk":1},"challenge":{"name":"挑战","initialCash":250000,"houseFactor":1.25,"warehouseFactor":1.2,"volatility":1.15,"risk":1.25}},"products":[{"id":"rice","name":"大米","category":"生活","basePrice":18000,"minPrice":7000,"maxPrice":43000,"unitSize":2,"volatility":0.045,"base":18000,"min":7000,"max":43000,"size":2},{"id":"oil","name":"食用油","category":"生活","basePrice":24000,"minPrice":9000,"maxPrice":65000,"unitSize":2,"volatility":0.065,"base":24000,"min":9000,"max":65000,"size":2},{"id":"pork","name":"猪肉","category":"生活","basePrice":12000,"minPrice":3500,"maxPrice":38000,"unitSize":2,"volatility":0.105,"base":12000,"min":3500,"max":38000,"size":2},{"id":"eggs","name":"鸡蛋","category":"生活","basePrice":7000,"minPrice":2500,"maxPrice":19000,"unitSize":1,"volatility":0.065,"base":7000,"min":2500,"max":19000,"size":1},{"id":"fruit","name":"水果","category":"生活","basePrice":14000,"minPrice":4000,"maxPrice":42000,"unitSize":2,"volatility":0.095,"base":14000,"min":4000,"max":42000,"size":2},{"id":"milk","name":"牛奶","category":"生活","basePrice":11000,"minPrice":4500,"maxPrice":24000,"unitSize":2,"volatility":0.04,"base":11000,"min":4500,"max":24000,"size":2},{"id":"phone","name":"手机","category":"电子","basePrice":65000,"minPrice":22000,"maxPrice":180000,"unitSize":2,"volatility":0.11,"base":65000,"min":22000,"max":180000,"size":2},{"id":"gpu","name":"显卡","category":"电子","basePrice":80000,"minPrice":20000,"maxPrice":240000,"unitSize":3,"volatility":0.18,"base":80000,"min":20000,"max":240000,"size":3},{"id":"console","name":"游戏机","category":"电子","basePrice":50000,"minPrice":15000,"maxPrice":140000,"unitSize":3,"volatility":0.13,"base":50000,"min":15000,"max":140000,"size":3},{"id":"camera","name":"相机","category":"电子","basePrice":90000,"minPrice":30000,"maxPrice":230000,"unitSize":3,"volatility":0.09,"base":90000,"min":30000,"max":230000,"size":3},{"id":"gold","name":"黄金饰品","category":"贵重","basePrice":120000,"minPrice":70000,"maxPrice":190000,"unitSize":1,"volatility":0.035,"base":120000,"min":70000,"max":190000,"size":1},{"id":"watch","name":"名表","category":"贵重","basePrice":150000,"minPrice":50000,"maxPrice":350000,"unitSize":2,"volatility":0.09,"base":150000,"min":50000,"max":350000,"size":2},{"id":"collectible","name":"城市藏品","category":"贵重","basePrice":70000,"minPrice":12000,"maxPrice":250000,"unitSize":2,"volatility":0.2,"base":70000,"min":12000,"max":250000,"size":2},{"id":"coat","name":"羽绒服","category":"季节","basePrice":30000,"minPrice":8000,"maxPrice":90000,"unitSize":2,"volatility":0.08,"base":30000,"min":8000,"max":90000,"size":2},{"id":"ac","name":"空调","category":"季节","basePrice":65000,"minPrice":20000,"maxPrice":170000,"unitSize":5,"volatility":0.09,"base":65000,"min":20000,"max":170000,"size":5},{"id":"umbrella","name":"雨具","category":"季节","basePrice":9000,"minPrice":2500,"maxPrice":27000,"unitSize":1,"volatility":0.085,"base":9000,"min":2500,"max":27000,"size":1},{"id":"mask","name":"口罩","category":"应急","basePrice":6000,"minPrice":1500,"maxPrice":28000,"unitSize":1,"volatility":0.12,"base":6000,"min":1500,"max":28000,"size":1},{"id":"medicine","name":"常备药","category":"应急","basePrice":16000,"minPrice":5500,"maxPrice":48000,"unitSize":1,"volatility":0.075,"base":16000,"min":5500,"max":48000,"size":1},{"id":"battery","name":"电池","category":"应急","basePrice":20000,"minPrice":7000,"maxPrice":60000,"unitSize":2,"volatility":0.1,"base":20000,"min":7000,"max":60000,"size":2},{"id":"food","name":"应急食品","category":"应急","basePrice":13000,"minPrice":4000,"maxPrice":40000,"unitSize":2,"volatility":0.07,"base":13000,"min":4000,"max":40000,"size":2}],"houses":[{"id":"studio","price":650000,"ending":"勉强上车"},{"id":"flat","price":1000000,"ending":"小有成就"},{"id":"two","price":1400000,"ending":"安居有余"},{"id":"city","price":1900000,"ending":"城市新贵"},{"id":"dream","price":2500000,"ending":"理想成真"}],"warehouses":[{"id":"room","capacity":20,"price":0},{"id":"small","capacity":40,"price":70000},{"id":"normal","capacity":75,"price":220000},{"id":"large","capacity":120,"price":500000}],"events":[{"id":"chips","type":"market","title":"芯片供应趋紧","duration":3,"cash":0,"effects":{"gpu":0.5,"phone":0.2,"console":0.2},"reliability":"reliable"},{"id":"new_gpu","type":"market","title":"新显卡上市","duration":3,"cash":0,"effects":{"gpu":-0.4},"reliability":"reliable"},{"id":"electronics_sale","type":"market","title":"电子促销季","duration":2,"cash":0,"effects":{"phone":-0.25,"console":-0.2,"camera":-0.2},"reliability":"reliable"},{"id":"gold_safe","type":"market","title":"避险买盘增加","duration":4,"cash":0,"effects":{"gold":0.2,"watch":0.1},"reliability":"normal"},{"id":"gold_supply","type":"market","title":"金饰供给恢复","duration":3,"cash":0,"effects":{"gold":-0.15},"reliability":"reliable"},{"id":"pork_glut","type":"market","title":"集中出栏","duration":3,"cash":0,"effects":{"pork":-0.4},"reliability":"reliable"},{"id":"pork_short","type":"market","title":"养殖供应收紧","duration":4,"cash":0,"effects":{"pork":0.45},"reliability":"normal"},{"id":"heat","type":"market","title":"持续高温","duration":3,"cash":0,"effects":{"ac":0.5,"fruit":0.2,"battery":0.1},"reliability":"reliable"},{"id":"cold","type":"market","title":"寒潮来临","duration":3,"cash":0,"effects":{"coat":0.5,"medicine":0.2},"reliability":"reliable"},{"id":"rain","type":"market","title":"连续降雨","duration":3,"cash":0,"effects":{"umbrella":0.6,"fruit":-0.15},"reliability":"reliable"},{"id":"dry","type":"market","title":"天气转晴","duration":2,"cash":0,"effects":{"umbrella":-0.4},"reliability":"normal"},{"id":"harvest","type":"market","title":"粮食丰收","duration":4,"cash":0,"effects":{"rice":-0.3,"oil":-0.15},"reliability":"reliable"},{"id":"crop_loss","type":"market","title":"农产减收","duration":4,"cash":0,"effects":{"rice":0.3,"oil":0.3,"fruit":0.25},"reliability":"normal"},{"id":"egg_supply","type":"market","title":"蛋品供给宽松","duration":2,"cash":0,"effects":{"eggs":-0.3},"reliability":"reliable"},{"id":"egg_demand","type":"market","title":"烘焙订单增长","duration":3,"cash":0,"effects":{"eggs":0.35,"milk":0.15},"reliability":"normal"},{"id":"milk_sale","type":"market","title":"奶品促销","duration":2,"cash":0,"effects":{"milk":-0.2},"reliability":"reliable"},{"id":"travel","type":"market","title":"旅行季升温","duration":3,"cash":0,"effects":{"camera":0.35,"fruit":0.1},"reliability":"normal"},{"id":"console_launch","type":"market","title":"热门游戏发售","duration":3,"cash":0,"effects":{"console":0.4},"reliability":"reliable"},{"id":"console_stock","type":"market","title":"游戏机库存充足","duration":3,"cash":0,"effects":{"console":-0.35},"reliability":"reliable"},{"id":"phone_launch","type":"market","title":"新机换代","duration":3,"cash":0,"effects":{"phone":-0.35},"reliability":"reliable"},{"id":"luxury","type":"market","title":"奢侈消费回暖","duration":4,"cash":0,"effects":{"watch":0.4,"collectible":0.2},"reliability":"normal"},{"id":"weak","type":"market","title":"消费热情降温","duration":4,"cash":0,"effects":{"watch":-0.35,"collectible":-0.3,"camera":-0.2},"reliability":"normal"},{"id":"collection","type":"market","title":"收藏展览开幕","duration":3,"cash":0,"effects":{"collectible":0.5},"reliability":"reliable"},{"id":"bubble","type":"market","title":"藏品热度消退","duration":3,"cash":0,"effects":{"collectible":-0.45},"reliability":"normal"},{"id":"flu","type":"market","title":"防护需求增加","duration":3,"cash":0,"effects":{"mask":0.65,"medicine":0.4},"reliability":"reliable"},{"id":"supply","type":"market","title":"防护工厂增产","duration":4,"cash":0,"effects":{"mask":-0.4,"medicine":-0.2},"reliability":"reliable"},{"id":"power","type":"market","title":"区域停电检修","duration":2,"cash":0,"effects":{"battery":0.5,"food":0.2},"reliability":"reliable"},{"id":"battery_factory","type":"market","title":"电池生产恢复","duration":3,"cash":0,"effects":{"battery":-0.35},"reliability":"reliable"},{"id":"prepared","type":"market","title":"应急储备倡议","duration":3,"cash":0,"effects":{"food":0.45,"rice":0.15},"reliability":"reliable"},{"id":"coat_sale","type":"market","title":"冬衣清仓","duration":3,"cash":0,"effects":{"coat":-0.45},"reliability":"reliable"},{"id":"ac_factory","type":"market","title":"空调出厂促销","duration":3,"cash":0,"effects":{"ac":-0.35},"reliability":"reliable"},{"id":"logistics","type":"market","title":"物流成本上升","duration":3,"cash":0,"effects":{"rice":0.15,"oil":0.2,"food":0.15,"battery":0.15},"reliability":"normal"},{"id":"rent","type":"personal","title":"临时租住维护费","duration":1,"cash":-18000,"effects":{},"reliability":"reliable"},{"id":"repair","type":"personal","title":"手机维修","duration":1,"cash":-24000,"effects":{},"reliability":"reliable"},{"id":"ill","type":"personal","title":"看诊支出","duration":1,"cash":-20000,"effects":{},"reliability":"reliable"},{"id":"fare","type":"personal","title":"通勤补缴","duration":1,"cash":-12000,"effects":{},"reliability":"reliable"},{"id":"bonus","type":"personal","title":"公司小奖金","duration":1,"cash":25000,"effects":{},"reliability":"reliable"},{"id":"repay","type":"personal","title":"朋友归还借款","duration":1,"cash":16000,"effects":{},"reliability":"reliable"},{"id":"gift","type":"personal","title":"亲友红包","duration":1,"cash":12000,"effects":{},"reliability":"reliable"},{"id":"refund","type":"personal","title":"账单退款","duration":1,"cash":9000,"effects":{},"reliability":"reliable"}],"reliability":{"reliable":{"name":"可靠消息","description":"已发生的供应或需求消息，不保证价格上涨"},"normal":{"name":"一般新闻","description":"事件观察，影响大小仍有不确定性"},"rumor":{"name":"市场传闻","description":"未经核实，不驱动市场，不应作为保证"}},"statFields":["bought","sold","profit","grants","expenses","hardship","trades","best","worst","peak","fees","turnover","houseWeek","warehouseSpent","upgrades","maxDrawdown"]};
  V.seasonAt = week => ['冬','春','夏','秋'][Math.floor((week - 1) / 13)];
  V.difficulty = s => V.difficulties[s.difficulty];
  V.housePrice = (s, h) => H.int(Math.round(h.price * V.difficulty(s).houseFactor));
  V.warehousePrice = (s, w) => H.int(Math.round(w.price * V.difficulty(s).warehouseFactor));
  V.inventoryValue = s => V.products.reduce((n, p) => H.add(n, H.mul(s.inventory[p.id].qty, s.market[p.id].price)), 0);
  V.houseValue = s => s.house ? V.housePrice(s, V.houses.find(h => h.id === s.house)) : 0;
  V.assets = s => H.add(H.add(s.cash, V.inventoryValue(s)), V.houseValue(s));
  V.summary = s => {
    const ranked = V.products.map(p => ({id:p.id, profit:s.stats.byProduct[p.id]})).sort((a, b) => b.profit - a.profit);
    const h = V.houses.find(h => h.id === s.house);
    return {ending:h ? h.ending : '仍在租房', assets:V.assets(s), cash:s.cash, house:s.house,
      inventoryValue:V.inventoryValue(s), houseValue:V.houseValue(s), profit:s.stats.profit,
      unrealized:V.products.reduce((n, p) => n + s.inventory[p.id].qty * s.market[p.id].price - s.inventory[p.id].cost, 0),
      turnover:s.stats.turnover, bought:s.stats.bought, sold:s.stats.sold, fees:s.stats.fees,
      best:s.stats.best, worst:s.stats.worst, bestProduct:ranked[0].id, worstProduct:ranked[ranked.length - 1].id,
      peak:s.stats.peak, trades:s.stats.trades, houseWeek:s.stats.houseWeek, upgrades:s.stats.upgrades,
      maxDrawdown:s.stats.maxDrawdown, byProduct:H.clone(s.stats.byProduct), history:H.clone(s.history)};
  };
  function object(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(label + '必须是对象');
  }
  function keys(value, expected, label) {
    object(value, label);
    const actual = Object.keys(value);
    if (actual.length !== expected.length || expected.some(k => !Object.prototype.hasOwnProperty.call(value, k))) throw Error(label + '字段缺失或未知');
  }
  function finite(n, min, max, label) {
    if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) throw Error(label + '无效');
  }
  function same(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && same(a[k], b[k]));
  }
  function validate(s) {
    keys(s, ['version','rulesVersion','seed','difficulty','week','cash','capacity','warehouse','revision','status','house','result','rng','inventory','market','activeEvents','macro','season','personal','personalEvent','news','history','stats'], '存档');
    if (s.version !== V.rules.saveVersion || s.rulesVersion !== V.rules.version) throw Error('存档版本不兼容（不支持旧版或未来版本）');
    if (typeof s.seed !== 'string' || !s.seed.length || s.seed.length > 128) throw Error('种子无效');
    if (!Object.prototype.hasOwnProperty.call(V.difficulties, s.difficulty)) throw Error('难度无效');
    H.int(s.week, 1, 52); H.int(s.cash); H.int(s.revision);
    const warehouse = V.warehouses.find(w => w.id === s.warehouse);
    if (!warehouse || s.capacity !== warehouse.capacity) throw Error('仓储等级与容量不一致');
    if (s.house !== null && !V.houses.some(h => h.id === s.house)) throw Error('住房无效');
    if (!['playing','ended'].includes(s.status)) throw Error('状态无效');
    if (s.status === 'playing' && s.result !== null) throw Error('未结束状态不能有结算');
    if (s.status === 'ended' && s.week !== 52) throw Error('结算周无效');
    keys(s.rng, ['market','events','visual'], '随机流');
    for (const key of ['market','events','visual']) H.int(s.rng[key], 1, 4294967295);
    const ids = V.products.map(p => p.id);
    keys(s.inventory, ids, '库存'); keys(s.market, ids, '市场');
    let costs = 0;
    for (const p of V.products) {
      const i = s.inventory[p.id], m = s.market[p.id];
      keys(i, ['qty','cost'], '持仓'); H.int(i.qty); H.int(i.cost);
      if ((i.qty === 0) !== (i.cost === 0)) throw Error('数量与成本不一致');
      costs = H.add(costs, i.cost);
      keys(m, ['price','previous','trend','history','low','high'], '行情');
      H.int(m.price, p.min, p.max); H.int(m.previous, p.min, p.max);
      finite(m.trend, -1, 1, '趋势');
      H.int(m.low, p.min, m.price); H.int(m.high, m.price, p.max);
      if (!Array.isArray(m.history) || m.history.length !== Math.min(s.week, 12)) throw Error('行情历史长度无效');
      m.history.forEach(v => H.int(v, m.low, m.high));
      if (m.history[m.history.length - 1] !== m.price || (s.week > 1 && m.history[m.history.length - 2] !== m.previous)) throw Error('行情历史与当前价不一致');
      if (s.week === 1 && m.previous !== m.price) throw Error('初周前价无效');
    }
    const used = V.products.reduce((n, p) => H.add(n, H.mul(s.inventory[p.id].qty, p.size)), 0);
    if (used > s.capacity) throw Error('容量溢出');
    finite(s.macro, .8, 1.2, '宏观');
    if (s.season !== V.seasonAt(s.week)) throw Error('本周季节无效');
    if (!Array.isArray(s.activeEvents) || s.activeEvents.length > V.events.length) throw Error('持续事件无效');
    const unique = new Set();
    for (const a of s.activeEvents) {
      keys(a, ['id','started','until'], '持续事件');
      const e = V.events.find(e => e.id === a.id && e.type === 'market');
      if (!e || unique.has(a.id)) throw Error('事件无效或重复');
      unique.add(a.id);
      H.int(a.started, 2, s.week); H.int(a.until, s.week, 55);
      if (a.until !== a.started + e.duration - 1) throw Error('事件持续时间不一致');
    }
    H.int(s.personal, -1000000, 1000000);
    if (s.personalEvent !== null) {
      const e = V.events.find(e => e.id === s.personalEvent && e.type === 'personal');
      if (!e || s.personal !== (e.cash < 0 ? Math.round(e.cash * V.difficulty(s).risk) : e.cash)) throw Error('个人事件不一致');
    } else if (s.personal !== 0) throw Error('个人收支缺少事件');
    keys(s.stats, V.statFields.concat('byProduct'), '统计');
    for (const k of V.statFields) H.int(s.stats[k], ['profit','worst'].includes(k) ? -Number.MAX_SAFE_INTEGER : 0);
    H.int(s.stats.worst, -Number.MAX_SAFE_INTEGER, 0);
    H.int(s.stats.houseWeek, 0, s.week); H.int(s.stats.upgrades, 0, 3); H.int(s.stats.maxDrawdown, 0, 1000000);
    if ((s.house === null) !== (s.stats.houseWeek === 0)) throw Error('购房周数不一致');
    if (s.stats.warehouseSpent !== V.warehousePrice(s, warehouse) || (s.warehouse === 'room') !== (s.stats.upgrades === 0)) throw Error('仓储统计不一致');
    keys(s.stats.byProduct, ids, '商品利润');
    const st = s.stats, big = BigInt;
    let profits = 0n;
    for (const p of V.products) {
      H.int(st.byProduct[p.id], -Number.MAX_SAFE_INTEGER); profits += big(st.byProduct[p.id]);
      const i = s.inventory[p.id];
      const lower = big(i.qty) * big(p.min + Math.floor(p.min * V.rules.fee));
      const upper = big(i.qty) * big(p.max + Math.ceil(p.max * V.rules.fee)) + big(st.trades);
      if (i.cost && (big(i.cost) < lower || big(i.cost) > upper)) throw Error('持仓成本超出可达价格范围');
    }
    const bought = big(st.bought), sold = big(st.sold), fees = big(st.fees), turnover = big(st.turnover), trades = big(st.trades);
    const realized = bought - big(costs);
    if (realized < 0n || profits !== big(st.profit) || big(st.profit) !== sold - realized) throw Error('交易利润不一致');
    const twiceBuyFees = bought + sold - turnover + fees;
    if (twiceBuyFees < 0n || twiceBuyFees > 2n * fees || twiceBuyFees % 2n) throw Error('手续费与成交额不一致');
    const buyFees = twiceBuyFees / 2n, sellFees = fees - buyFees;
    const buyGross = bought - buyFees, sellGross = sold + sellFees;
    for (const [gross, fee] of [[buyGross, buyFees], [sellGross, sellFees]]) {
      if (gross < 0n || (gross === 0n && fee !== 0n) || fee < gross / 100n || fee > gross / 100n + trades) throw Error('手续费统计无效');
    }
    if ((trades === 0n && (bought || sold || fees || turnover || big(costs) || st.best || st.worst)) ||
        (trades > 0n && (turnover === 0n || fees === 0n || turnover < 1500n * trades)) ||
        big(st.best) > sold || -big(st.worst) > realized ||
        big(st.profit) > big(st.best) * trades || big(st.profit) < big(st.worst) * trades) throw Error('交易次数或最佳最差统计不一致');
    const maxStock = trades === 0n ? 0n : big(s.capacity) * big(Math.max(...V.products.map(p => Math.ceil(p.max / p.size))));
    if (st.peak < V.difficulty(s).initialCash || big(st.peak) > big(V.difficulty(s).initialCash) + big(st.grants) + sold + maxStock) throw Error('资产峰值不可达');
    const minimumDrawdown = st.peak ? Math.round((st.peak - V.assets(s)) / st.peak * 1000000) : 0;
    if (st.maxDrawdown < minimumDrawdown) throw Error('最大回撤小于当前回撤');
    const expectedCash = V.difficulty(s).initialCash - s.stats.bought + s.stats.sold + s.stats.grants - s.stats.expenses - V.houseValue(s) - s.stats.warehouseSpent;
    if (!Number.isSafeInteger(expectedCash) || expectedCash !== s.cash) throw Error('现金与收支统计不一致');
    if (!Array.isArray(s.history) || s.history.length !== s.week) throw Error('资产历史长度无效');
    for (let index = 0; index < s.history.length; index++) {
      const v = s.history[index]; keys(v, ['week','cash','inventory','house','assets'], '资产历史');
      H.int(v.week, index + 1, index + 1);
      for (const k of ['cash','inventory','house','assets']) H.int(v[k]);
      if (v.assets !== H.add(H.add(v.cash, v.inventory), v.house) || v.assets > s.stats.peak) throw Error('资产历史不一致');
    }
    const current = s.history[s.week - 1];
    if (current.cash !== s.cash || current.inventory !== V.inventoryValue(s) || current.house !== V.houseValue(s) || current.assets !== V.assets(s)) throw Error('本周资产历史不一致');
    if (!Array.isArray(s.news) || s.news.length > V.events.length + 1) throw Error('新闻无效');
    for (const n of s.news) {
      keys(n, ['id','title','reliability','week'], '新闻');
      if ((n.id !== 'rumor' && !V.events.some(e => e.id === n.id)) || typeof n.title !== 'string' || !n.title.length || n.title.length > 200 || !Object.prototype.hasOwnProperty.call(V.reliability, n.reliability) || n.week !== s.week) throw Error('新闻内容无效');
    }
    if (s.status === 'ended' && !same(s.result, V.summary(s))) throw Error('结算与状态不一致');
    return true;
  }
  H.v2 = {catalog:V, validate, houseValue:V.houseValue, warehousePrice:V.warehousePrice, assets:V.assets};
})(window.HomeYear);
