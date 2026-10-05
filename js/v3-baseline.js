// Frozen full economic/validation context from a538345 (rules 0.4/save 3).
// Self-contained: no live v4 catalog, math, validator or engine dependency.
(function (live) {
'use strict';
const window = {};
(function (g) {
  'use strict';
  const H = g.HomeYear = {};
  H.rules = {
    version: '0.4', saveVersion: 3, initialCash: 300000, capacity: 20, weeks: 52, fee: 0.01,
    buybackNumer: 92, buybackDenom: 100, onSale: 8, replaceMin: 2, replaceMax: 3, maxAbsence: 3,
    headlineMoveBps: 800, revertRate: 0.15
  };
  H.roleHalf = {daily: 0.08, industry: 0.14, spec: 0.20};
  H.persistCap = {daily: 3000, industry: 6000, spec: 8000};
  H.difficulties = {
    easy: {name: '轻松', initialCash: 400000, houseFactor: 0.8, warehouseFactor: 0.8, volatility: 0.85, risk: 0.8},
    standard: {name: '标准', initialCash: 300000, houseFactor: 1, warehouseFactor: 1, volatility: 1, risk: 1},
    challenge: {name: '挑战', initialCash: 250000, houseFactor: 1.25, warehouseFactor: 1.2, volatility: 1.15, risk: 1.25}
  };
  // base/min/max/size remain frozen aliases. role is the rotation role; category stays the shelf tab.
  const rows = [
    ['rice','大米','生活','耐存储的主食，体积大但价格稳。',18000,7000,43000,2,.045,.7,.7,.08,0,'米','daily'],
    ['pork','猪肉','生活','供给周期长，疫病与集中出栏都会改变行情。',12000,3500,38000,2,.105,1,1.3,.15,0,'肉','industry'],
    ['eggs','鸡蛋','生活','薄利日用品，供应恢复速度快。',7000,2500,19000,1,.065,.6,1,.08,0,'蛋','daily'],
    ['fruit','水果','生活','夏日需求与丰收相互拉扯。',14000,4000,42000,2,.095,.8,1.2,.25,Math.PI,'果','industry'],
    ['phone','手机','电子','换代与促销令旧款承压。',65000,22000,180000,2,.11,1.2,1.1,.08,4,'机','industry'],
    ['gpu','显卡','电子','高波动硬件，缺货与迭代风险突出。',80000,20000,240000,3,.18,1.4,1.5,.05,1,'卡','spec'],
    ['watch','名表','贵重','紧凑奢侈品，消费冷却时难免回调。',150000,50000,350000,2,.09,1.1,1,.08,0,'表','spec'],
    ['collectible','城市藏品','贵重','小众收藏，热度反转可能很猛烈。',70000,12000,250000,2,.20,1.5,1.4,.05,2,'藏','spec'],
    ['coat','羽绒服','季节','冬旺夏淡，提前布局仍有天气风险。',30000,8000,90000,2,.08,.8,1.1,.5,0,'衣','industry'],
    ['ac','空调','季节','夏季旺销，但大体积压缩仓位。',65000,20000,170000,5,.09,.9,1.3,.5,Math.PI,'凉','industry'],
    ['umbrella','雨具','季节','梅雨季需求突出，单价低。',9000,2500,27000,1,.085,.7,1.25,.28,3.6,'伞','industry'],
    ['mask','口罩','应急','平时廉价，防护需求出现时跳涨。',6000,1500,28000,1,.12,.6,1.6,.1,0,'罩','spec']
  ];
  const legacyRows = [
    ['oil','食用油','生活','已退出轮换。旧档持仓只能按冻结回收价出售。',24000,9000,65000,2,.065,.8,.9,.12,0,'油'],
    ['milk','牛奶','生活','已退出轮换。旧档持仓只能按冻结回收价出售。',11000,4500,24000,2,.04,.5,.7,.05,0,'奶'],
    ['console','游戏机','电子','已退出轮换。旧档持仓只能按冻结回收价出售。',50000,15000,140000,3,.13,1.2,1.1,.2,0,'游'],
    ['camera','相机','电子','已退出轮换。旧档持仓只能按冻结回收价出售。',90000,30000,230000,3,.09,1.1,.9,.18,Math.PI,'摄'],
    ['gold','黄金饰品','贵重','已退出轮换。旧档持仓只能按冻结回收价出售。',120000,70000,190000,1,.035,.4,.65,.03,0,'金'],
    ['medicine','常备药','应急','已退出轮换。旧档持仓只能按冻结回收价出售。',16000,5500,48000,1,.075,.7,1.2,.25,0,'药'],
    ['battery','电池','应急','已退出轮换。旧档持仓只能按冻结回收价出售。',20000,7000,60000,2,.10,1,1.3,.08,0,'电'],
    ['food','应急食品','应急','已退出轮换。旧档持仓只能按冻结回收价出售。',13000,4000,40000,2,.07,.7,1.2,.1,0,'备']
  ];
  const mapRow = (r, role) => ({id:r[0], name:r[1], category:r[2], description:r[3],
    basePrice:r[4], minPrice:r[5], maxPrice:r[6], unitSize:r[7], volatility:r[8],
    trendSensitivity:r[9], eventSensitivity:r[10], season:r[11], phase:r[12], icon:r[13],
    base:r[4], min:r[5], max:r[6], size:r[7], role:role || null, lowRef:r[4] <= 20000, legacy:!role});
  H.products = rows.map(r => mapRow(r, r[14]));
  H.legacyProducts = legacyRows.map(r => mapRow(r, null));
  H.houses = [
    {id:'studio', name:'老旧单间', price:650000, district:'旧街', description:'小，但房门属于自己。', icon:'⌂', ending:'勉强上车'},
    {id:'flat', name:'普通公寓', price:1000000, district:'近郊', description:'有阳台，也有新的生活。', icon:'⌂', ending:'小有成就'},
    {id:'two', name:'舒适两居', price:1400000, district:'河岸', description:'客厅不再兼任仓库。', icon:'⌂', ending:'安居有余'},
    {id:'city', name:'城市住宅', price:1900000, district:'中心', description:'通勤与风景都更从容。', icon:'⌂', ending:'城市新贵'},
    {id:'dream', name:'理想之家', price:2500000, district:'花园', description:'终于有地方安放所有梦想。', icon:'⌂', ending:'理想成真'}
  ];
  H.warehouses = [
    {id:'room', name:'出租屋角落', capacity:20, price:0},
    {id:'small', name:'小仓库', capacity:40, price:70000},
    {id:'normal', name:'普通仓库', capacity:75, price:220000},
    {id:'large', name:'大型仓库', capacity:120, price:500000}
  ];
  // Published integer books already include the difficulty factor. 0.2 is immutable.
  const book = (houses, warehouses) => ({houses, warehouses});
  H.priceBooks = {
    '0.2': {
      easy: book({studio:520000, flat:800000, two:1120000, city:1520000, dream:2000000}, {room:0, small:56000, normal:176000, large:400000}),
      standard: book({studio:650000, flat:1000000, two:1400000, city:1900000, dream:2500000}, {room:0, small:70000, normal:220000, large:500000}),
      challenge: book({studio:812500, flat:1250000, two:1750000, city:2375000, dream:3125000}, {room:0, small:84000, normal:264000, large:600000})
    }
  };
  const fx = (kind, bps) => ({kind, bps});
  const market = [
    ['egg_supply','蛋筐在店门口叠了起来','集中到货已经发生，鸡蛋的本周价格里看得到。',2,'temporary','reliable',{eggs:fx('persist',-1800)}],
    ['egg_demand','烘焙坊把蛋订走了','订单已经落到蛋品上，本周价格已经变化。',3,'none','normal',{eggs:fx('persist',2000)}],
    ['harvest','新米进了街口粮店','丰收的米已经到货，本周米价里看得到。',4,'temporary','reliable',{rice:fx('persist',-2000)}],
    ['crop_loss','田里少收了一季','减收已经牵动大米和水果。本周涨跌以成交价为准。',4,'none','normal',{rice:fx('persist',2200), fruit:fx('persist',3500)}],
    ['pork_glut','屠宰场门口排起了队','集中出栏已经发生，猪肉本周价格已经变化。',3,'temporary','reliable',{pork:fx('persist',-2800)}],
    ['pork_short','栏里一时补不上猪','供应收紧已经发生，猪肉本周价格已经变化。',4,'none','normal',{pork:fx('persist',4000)}],
    ['heat','热气贴着店门不散','高温已经牵动空调和水果。本周涨跌以成交价为准。',3,'none','reliable',{ac:fx('persist',4000), fruit:fx('persist',3000)}],
    ['cold','寒潮贴着窗玻璃','冷空气已经到了，羽绒服本周价格已经变化。',3,'none','reliable',{coat:fx('persist',4500)}],
    ['rain','雨顺着屋檐下了整条街','连续降雨已经发生，雨具和水果的本周价格都已变化。',3,'none','reliable',{umbrella:fx('persist',4000), fruit:fx('persist',-2000)}],
    ['dry','放晴以后伞架空了半边','转晴已经发生，雨具本周价格已经变化。',2,'temporary','normal',{umbrella:fx('persist',-3000)}],
    ['coat_sale','冬衣挂上了清仓牌','换季清仓已经发生，羽绒服本周价格已经变化。',3,'temporary','reliable',{coat:fx('persist',-3500)}],
    ['ac_factory','空调车停在店门口','出厂促销已经发生，空调本周价格已经变化。',3,'temporary','reliable',{ac:fx('persist',-3000)}],
    ['electronics_sale','手机柜贴上了促销条','促销已经发生，手机本周价格已经变化。',2,'temporary','reliable',{phone:fx('persist',-2200)}],
    ['phone_launch','新机亮相，旧款还在柜上','换代已经记入旧手机的价格中枢，本年不会自动改回。本周涨跌以成交价为准。',52,'structural','reliable',{phone:fx('structural',-3000)}],
    ['chips','芯片盒子迟迟没到店','供应趋紧已经发生，显卡和手机的本周价格都已变化。',3,'none','reliable',{gpu:fx('immediate',7000), phone:fx('persist',2200)}],
    ['new_gpu','新卡到店，旧卡还在架上','新品上市已经记入显卡的价格中枢，本年不会自动改回。本周涨跌以成交价为准。',52,'structural','reliable',{gpu:fx('structural',-3500)}],
    ['luxury','橱窗的灯亮到很晚','消费回暖已经牵动名表和藏品。本周涨跌以成交价为准。',4,'none','normal',{watch:fx('persist',2500), collectible:fx('immediate',8000)}],
    ['weak','奢侈柜台前的人少了','热情降温已经发生。之后可以反弹，也可以继续走低。本周涨跌以成交价为准。',4,'unwind','normal',{watch:fx('persist',-3000), collectible:fx('persist',-4000)}],
    ['collection','展览把藏品请上了台面','开幕已经发生，藏品本周价格已经变化。',1,'none','reliable',{collectible:fx('immediate',9000)}],
    ['bubble','展览散场，热度跟着走了','热度消退已经发生。之后可以反弹，也可以继续走低。本周涨跌以成交价为准。',1,'unwind','normal',{collectible:fx('immediate',-5000)}],
    ['flu','药房门口排起了夜班','防护需求已经起来，口罩本周价格已经变化。',1,'none','reliable',{mask:fx('immediate',8000)}],
    ['supply','防护厂的灯通宵亮着','增产已经发生，口罩本周价格已经变化。',3,'temporary','reliable',{mask:fx('persist',-3500)}]
  ];
  H.events = market.map(r => ({id:r[0], type:'market', title:r[1], situation:r[2], description:r[2],
    duration:r[3], fade:r[4], reliability:r[5], effects:r[6], weight:1}));
  const personal = [
    ['rent','临时租住维护费',-18000],['repair','手机维修',-24000],['ill','看诊支出',-20000],
    ['fare','通勤补缴',-12000],['bonus','公司小奖金',25000],['repay','朋友归还借款',16000],
    ['gift','亲友红包',12000],['refund','账单退款',9000]
  ];
  H.events.push(...personal.map(r => ({id:r[0], type:'personal', title:r[1], situation:'生活的一点插曲，不改变商品行情。',
    description:'生活的一点插曲，不改变商品行情。', duration:1, cash:r[2], effects:{}, reliability:'reliable', fade:'none', weight:1})));
  H.reliability = {
    reliable:{name:'可靠消息', description:'已经发生的供应或需求变化，不保证下一周继续上涨或下跌'},
    normal:{name:'一般新闻', description:'事件仍在影响价格中枢，幅度不再另加一笔'}
  };
  H.moveSituation = '没有新的供应或需求事件。下面的百分比来自本周成交价，不是原因说明。';
  H.holdingSituation = '这是已发生的本周涨跌，不代表下周方向。';
  H.newsSituation = n => {
    if (!n) return '';
    if (n.kind === 'holding') return H.holdingSituation;
    if (n.id === 'move' && n.kind === 'headline') return H.moveSituation;
    const ev = H.events.find(e => e.id === n.id);
    return (ev && ev.situation) || '';
  };
  H.focusOrder = (s, list) => list.slice().sort((a, b) => {
    const qty = p => p.legacy ? s.legacy[p.id].qty : s.inventory[p.id].qty;
    const abs = p => Math.abs(H.changeBps(p.legacy ? s.legacy[p.id] : s.market[p.id]));
    const arrival = p => !p.legacy && s.onStreak && s.onStreak[p.id] === 1 ? 1 : 0;
    const held = (qty(b) > 0) - (qty(a) > 0);
    if (held) return held;
    const delta = abs(b) - abs(a);
    if (delta) return delta;
    const fresh = arrival(b) - arrival(a);
    if (fresh) return fresh;
    return (H.products.findIndex(p => p.id === a.id) - H.products.findIndex(p => p.id === b.id));
  });
  H.defaultSettings = {autoSave:true, sound:true, music:true, animation:'normal', numberFormat:'decimal'};
  H.migrationConfirm = '迁入会清空尚未结束的旧市场事件，并清空本周旧新闻。货架会按新规则重排。此后同一种子不会再走出旧规则的未来路径。已退出商品价格冻结，只能回收出售。现金、持仓成本、历史和住房仓储价不会被改写。本地 v2 原键不会被覆盖，原文写入独立备份键。拒绝则不写新档。';
  H.replaceDamagedConfirm = '当前新档已隔离。这一步会替换损坏的 v3。请先导出损坏原文。确认替换？';
})(window);

(function (H) {
  'use strict';
  H.int = function (n, min = 0, max = Number.MAX_SAFE_INTEGER) {
    if (!Number.isSafeInteger(n) || n < min || n > max) throw Error('数值必须是范围内的安全整数');
    return n;
  };
  H.add = (a,b) => H.int(a+b);
  H.mul = (a,b) => H.int(a*b);
  H.clone = function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (value && typeof value === 'object') {
      const out = {};
      for (const key of Object.keys(value)) out[key] = clone(value[key]);
      return out;
    }
    return value;
  };
  H.random = function (s, stream) {
    let x = s.rng[stream] >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    s.rng[stream] = x >>> 0;
    return (x >>> 0) / 4294967296;
  };
  H.seed = function (text) {
    let x = 2166136261;
    for (let i=0;i<text.length;i++) x = Math.imul(x ^ text.charCodeAt(i),16777619);
    return (x >>> 0) || 1;
  };
  H.product = id => {
    const p = H.products.find(x => x.id === id);
    if (!p) throw Error('未知商品');
    return p;
  };
  H.holding = id => {
    const p = H.products.find(x => x.id === id) || H.legacyProducts.find(x => x.id === id);
    if (!p) throw Error('未知商品');
    return p;
  };
  H.heldProducts = () => H.products.concat(H.legacyProducts);
  H.quoteOf = (s,id) => id in s.inventory ? s.market[id] : s.legacy[id];
  H.qtyOf = (s,id) => H.quoteOf(s,id) && (id in s.inventory ? s.inventory[id].qty : s.legacy[id].qty);
  H.costOf = (s,id) => id in s.inventory ? s.inventory[id].cost : s.legacy[id].cost;
  H.difficulty = s => H.difficulties[s.difficulty];
  H.publishedBook = s => {
    const table = H.priceBooks[s.priceBook && s.priceBook.id];
    const book = table && table[s.difficulty];
    if (!book) throw Error('价格簿无效');
    return book;
  };
  H.housePrice = (s,h) => {
    const houses = s.priceBook && s.priceBook.houses;
    if (!houses || !Object.prototype.hasOwnProperty.call(houses, h.id)) throw Error('价格簿无效');
    return H.int(houses[h.id]);
  };
  H.warehousePrice = (s,w) => {
    const warehouses = s.priceBook && s.priceBook.warehouses;
    if (!warehouses || !Object.prototype.hasOwnProperty.call(warehouses, w.id)) throw Error('价格簿无效');
    return H.int(warehouses[w.id]);
  };
  H.used = s => H.heldProducts().reduce((n,p) => H.add(n, H.mul(H.qtyOf(s,p.id), p.size)), 0);
  H.inventoryValue = s => H.heldProducts().reduce((n,p) => H.add(n, H.mul(H.qtyOf(s,p.id), H.quoteOf(s,p.id).price)), 0);
  H.houseValue = s => s.house ? H.housePrice(s, H.houses.find(h => h.id === s.house)) : 0;
  H.assets = s => H.add(H.add(s.cash, H.inventoryValue(s)), H.houseValue(s));
  H.fee = amount => H.int(Math.ceil(amount * H.rules.fee));
  H.buybackQuote = price => {
    const q = Math.floor(price * H.rules.buybackNumer / H.rules.buybackDenom);
    if (q >= 1) return q;
    return price >= 1 ? 1 : 0;
  };
  H.channelUnit = (s,id) => {
    const price = H.quoteOf(s,id).price;
    if (H.legacyProducts.some(p => p.id === id) || !s.listing.includes(id)) return H.buybackQuote(price);
    return price;
  };
  H.channelGross = (s,id,qty) => H.mul(H.channelUnit(s,id), qty);
  H.channelNet = (s,id,qty) => {
    const gross = H.channelGross(s,id,qty);
    return gross - H.fee(gross);
  };
  H.liquidValue = s => H.heldProducts().reduce((n,p) => {
    const qty = H.qtyOf(s,p.id);
    return qty ? H.add(n, H.channelNet(s,p.id,qty)) : n;
  }, 0);
  H.changeBps = m => m.previous ? Math.round((m.price - m.previous) / m.previous * 10000) : 0;
  H.seasonAt = week => ['冬','春','夏','秋'][Math.floor((week-1)/13)];
})(window.HomeYear);


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

(function (H) {
  'use strict';
  const marketEvents = () => H.events.filter(e => e.type === 'market');
  const personalEvents = () => H.events.filter(e => e.type === 'personal');
  const pick = (s, list) => list[Math.floor(H.random(s, 'events') * list.length)];
  const poolIndex = id => H.products.findIndex(p => p.id === id);
  const byPool = (a, b) => poolIndex(a) - poolIndex(b);
  const shuffle = (list, s) => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(H.random(s, 'listing') * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  H.listingCovers = ids => {
    if (!Array.isArray(ids) || ids.length !== H.rules.onSale || new Set(ids).size !== ids.length) return false;
    const goods = ids.map(id => H.products.find(p => p.id === id));
    if (goods.some(p => !p)) return false;
    const roles = new Set(goods.map(p => p.role));
    return roles.has('daily') && roles.has('industry') && roles.has('spec') && goods.filter(p => p.lowRef).length >= 2;
  };
  function repair(order) {
    const listed = order.slice(0, H.rules.onSale);
    const off = order.slice(H.rules.onSale);
    const swapIn = (incoming, accept) => {
      for (let i = listed.length - 1; i >= 0; i--) {
        const outgoing = listed[i];
        const trial = listed.slice();
        trial[i] = incoming;
        if (!accept(trial, outgoing)) continue;
        listed[i] = incoming;
        const at = off.indexOf(incoming);
        off[at] = outgoing;
        return true;
      }
      return false;
    };
    for (const role of ['daily', 'industry', 'spec']) {
      if (listed.some(id => H.product(id).role === role)) continue;
      const incoming = off.filter(id => H.product(id).role === role).sort(byPool)[0];
      if (!incoming || !swapIn(incoming, trial => ['daily', 'industry', 'spec'].every(r => r === role || trial.some(id => H.product(id).role === r)))) {
        throw Error('轮换约束无解');
      }
    }
    while (listed.filter(id => H.product(id).lowRef).length < 2) {
      const incoming = off.filter(id => H.product(id).lowRef).sort(byPool)[0];
      if (!incoming || !swapIn(incoming, (trial, outgoing) => !H.product(outgoing).lowRef && ['daily', 'industry', 'spec'].every(r => trial.some(id => H.product(id).role === r)))) {
        throw Error('轮换约束无解');
      }
    }
    if (!H.listingCovers(listed)) throw Error('轮换约束无解');
    return listed.slice().sort(byPool);
  }
  H.initialListing = s => repair(shuffle(H.products.map(p => p.id), s));
  function combinations(arr, k) {
    const out = [];
    const walk = (start, acc) => {
      if (acc.length === k) { out.push(acc.slice()); return; }
      for (let i = start; i < arr.length; i++) { acc.push(arr[i]); walk(i + 1, acc); acc.pop(); }
    };
    walk(0, []);
    return out;
  }
  H.rotate = s => {
    const prev = s.listing.slice();
    const off = H.products.map(p => p.id).filter(id => !prev.includes(id));
    const mustIn = off.filter(id => s.absence[id] >= H.rules.maxAbsence);
    if (mustIn.length > H.rules.replaceMax) throw Error('轮换约束无解');
    const k = H.rules.replaceMin + Math.floor(H.random(s, 'listing') * (H.rules.replaceMax - H.rules.replaceMin + 1));
    if (k < mustIn.length) throw Error('轮换约束无解');
    const extras = shuffle(off.filter(id => !mustIn.includes(id)), s);
    const returners = mustIn.concat(extras.slice(0, k - mustIn.length));
    const valid = combinations(prev.slice().sort(byPool), k).filter(leavers => H.listingCovers(prev.filter(id => !leavers.includes(id)).concat(returners)));
    if (!valid.length) throw Error('轮换约束无解');
    valid.sort((a, b) => {
      const streak = list => list.reduce((n, id) => n + s.onStreak[id], 0);
      const diff = streak(b) - streak(a);
      if (diff) return diff;
      for (let i = 0; i < a.length; i++) {
        const d = poolIndex(a[i]) - poolIndex(b[i]);
        if (d) return d;
      }
      return 0;
    });
    const leavers = valid[0];
    const next = prev.filter(id => !leavers.includes(id)).concat(returners).sort(byPool);
    s.turn = {arrived: returners.slice(), departed: leavers.map(id => ({id, streak: s.onStreak[id]}))};
    s.listing = next;
    for (const p of H.products) {
      if (next.includes(p.id)) {
        s.onStreak[p.id] = prev.includes(p.id) ? s.onStreak[p.id] + 1 : 1;
        s.absence[p.id] = 0;
      } else {
        s.absence[p.id] = s.absence[p.id] + 1;
        s.onStreak[p.id] = 0;
      }
    }
  };
  H.environment = s => {
    s.season = H.seasonAt(s.week);
    s.macro = Math.max(.8, Math.min(1.2, s.macro * .8 + (.9 + .2 * H.random(s, 'market')) * .2));
  };
  H.drawEvents = s => {
    s.activeEvents = s.activeEvents.filter(e => e.until >= s.week);
    s.personal = 0;
    s.personalEvent = null;
    s.news = [];
    if (H.random(s, 'events') < .42) {
      const e = pick(s, marketEvents());
      if (!s.activeEvents.some(a => a.id === e.id)) {
        s.activeEvents.push({id: e.id, started: s.week, until: Math.min(52, s.week + e.duration - 1)});
      }
    }
    if (H.random(s, 'events') < .08) {
      const e = pick(s, personalEvents());
      s.personalEvent = e.id;
      s.personal = e.cash < 0 ? Math.round(e.cash * H.difficulty(s).risk) : e.cash;
    }
  };
  H.trends = s => {
    for (const p of H.products) {
      const m = s.market[p.id];
      const half = H.roleHalf[p.role];
      m.trend = Math.max(-1, Math.min(1, m.trend * .7 + (H.random(s, 'market') - .5) * half * .5));
    }
  };
  function effectsFor(s, id) {
    const found = [];
    for (const a of s.activeEvents) {
      const e = H.events.find(e => e.id === a.id);
      const fx = e && e.effects[id];
      if (fx) found.push({active: a, fx});
    }
    return found;
  }
  H.prices = s => {
    let clips = 0, persistCapTriggers = 0, specStarts = 0, specStartClips = 0;
    const clipped = [], persistCapped = [], persistProducts = [], startedProducts = [];
    for (const p of H.products) {
      const m = s.market[p.id];
      const half = H.roleHalf[p.role];
      const shock = (H.random(s, 'market') - .5) * 2 * half * H.difficulty(s).volatility;
      const found = effectsFor(s, p.id);
      let structural = 1, persist = 0, start = 0, starts = false;
      for (const item of found) {
        if (item.fx.kind === 'structural') structural *= 1 + item.fx.bps / 10000;
        if (item.fx.kind === 'persist') persist += item.fx.bps;
        if (item.active.started === s.week) { starts = true; start += item.fx.bps; }
      }
      const cap = H.persistCap[p.role];
      if (persist > cap || persist < -cap) {
        persistCapTriggers++;
        persistCapped.push(p.id);
      }
      persist = Math.max(-cap, Math.min(cap, persist));
      if (persist !== 0) persistProducts.push(p.id);
      if (starts) startedProducts.push(p.id);
      const seasonal = 1 + p.season * Math.cos((s.week - 1) / 52 * Math.PI * 2 + p.phase);
      const center = p.base * seasonal * s.macro * structural * (1 + persist / 10000);
      const noise = Math.round(m.price * (m.trend * p.trendSensitivity + shock));
      m.previous = m.price;
      const raw = starts
        ? m.price + Math.round(m.price * start / 10000) + noise
        : m.price + Math.round(H.rules.revertRate * (center - m.price)) + noise;
      const clamped = Math.max(p.min, Math.min(p.max, raw));
      if (clamped !== raw) {
        clips++;
        clipped.push(p.id);
      }
      if (starts && p.role === 'spec') {
        specStarts++;
        if (clamped !== raw) specStartClips++;
      }
      m.price = H.int(clamped);
      m.history.push(m.price);
      if (m.history.length > 12) m.history.shift();
      m.low = Math.min(m.low, m.price);
      m.high = Math.max(m.high, m.price);
    }
    for (const p of H.legacyProducts) {
      const m = s.legacy[p.id];
      m.previous = m.price;
      m.history.push(m.price);
      if (m.history.length > 12) m.history.shift();
    }
    return {clips, clipped, persistCapTriggers, persistCapped, persistProducts, startedProducts, specStarts, specStartClips,
      eventStarted: s.activeEvents.some(a => a.started === s.week)};
  };
  H.personal = s => {
    if (s.personal < 0) {
      const paid = Math.min(s.cash, -s.personal);
      s.cash -= paid;
      s.stats.hardship = H.add(s.stats.hardship, -s.personal - paid);
      s.stats.expenses = H.add(s.stats.expenses, paid);
    } else {
      s.cash = H.add(s.cash, s.personal);
      s.stats.grants = H.add(s.stats.grants, s.personal);
    }
  };
  H.bulletinRows = news => {
    const head = news.find(n => n.kind === 'headline') || null;
    const hold = news.find(n => n.kind === 'holding') || null;
    const list = news.find(n => n.kind === 'listing') || null;
    const rows = [head];
    if (hold) rows.push(hold);
    if (list && rows.length < 3) rows.push(list);
    return rows.slice(0, 3);
  };
  function item(s, id, title, reliability, kind, productId, fresh) {
    return {id, title, reliability, week: s.week, kind, productId, changeBps: productId ? H.changeBps(H.quoteOf(s, productId)) : 0, fresh};
  }
  H.news = s => {
    const turn = s.turn || {arrived: [], departed: []};
    delete s.turn;
    const fresh = s.activeEvents.filter(a => a.started === s.week);
    s.news = [];
    let headlineId = null;
    if (fresh.length) {
      const e = H.events.find(ev => ev.id === fresh[0].id);
      const affected = Object.keys(e.effects);
      affected.sort((a, b) => Math.abs(H.changeBps(s.market[b])) - Math.abs(H.changeBps(s.market[a])));
      headlineId = affected[0];
      s.news.push(item(s, e.id, e.title, e.reliability, 'headline', headlineId, true));
    } else {
      const moves = H.products.filter(p => Math.abs(H.changeBps(s.market[p.id])) >= H.rules.headlineMoveBps)
        .sort((a, b) => Math.abs(H.changeBps(s.market[b.id])) - Math.abs(H.changeBps(s.market[a.id])));
      if (moves.length) {
        headlineId = moves[0].id;
        s.news.push(item(s, 'move', moves[0].name + '本周价格已经明显变动', 'normal', 'headline', headlineId, true));
      }
    }
    const rest = H.products.filter(p => p.id !== headlineId && Math.abs(H.changeBps(s.market[p.id])) >= H.rules.headlineMoveBps);
    const held = rest.filter(p => s.inventory[p.id].qty > 0);
    const second = (held.length ? held : rest).sort((a, b) => Math.abs(H.changeBps(s.market[b.id])) - Math.abs(H.changeBps(s.market[a.id])))[0];
    if (second) s.news.push(item(s, 'move', second.name + '本周价格已经明显变动', 'normal', 'holding', second.id, true));
    const arrived = turn.arrived.slice().sort((a, b) => H.product(a).basePrice - H.product(b).basePrice || byPool(a, b));
    const departed = turn.departed.slice().sort((a, b) => b.streak - a.streak || byPool(a.id, b.id));
    if (arrived.length || departed.length) {
      const primary = arrived[0] || departed[0].id;
      const parts = [];
      if (arrived.length) parts.push('新到货：' + H.product(arrived[0]).name);
      if (departed.length) parts.push('暂时缺货：' + H.product(departed[0].id).name);
      s.news.push(item(s, 'listing', parts.join('；'), 'normal', 'listing', primary, true));
    }
    for (const a of s.activeEvents) {
      if (a.started === s.week) continue;
      const e = H.events.find(ev => ev.id === a.id);
      const affected = Object.keys(e.effects).sort((x, y) => Math.abs(H.changeBps(s.market[y])) - Math.abs(H.changeBps(s.market[x])));
      s.news.push(item(s, e.id, e.title, 'normal', 'ongoing', affected[0], false));
    }
    if (s.personalEvent) {
      const e = H.events.find(ev => ev.id === s.personalEvent);
      s.news.push(item(s, e.id, e.title, 'reliable', 'personal', null, true));
    }
  };
})(window.HomeYear);

(function (H) {
  'use strict';
  H.trade = function (s,kind,id,qty) {
    const p = H.holding(id);
    H.int(qty,1);
    const legacy = H.legacyProducts.some(x => x.id === id);
    const item = legacy ? s.legacy[id] : s.inventory[id];
    if (kind === 'buy' && legacy) throw Error('已退出市场，只能按冻结回收价出售');
    if (kind === 'buy' && !s.listing.includes(id)) throw Error('本周未上架');
    const unit = kind === 'buy' ? s.market[id].price : H.channelUnit(s, id);
    const gross = H.mul(unit, qty), fee = H.fee(gross);
    if (kind === 'buy') {
      const cost = H.add(gross,fee);
      if (cost > s.cash) throw Error('资金不足');
      if (H.add(H.used(s),H.mul(qty,p.size)) > s.capacity) throw Error('库存已满');
      s.cash -= cost;
      item.qty = H.add(item.qty,qty);
      item.cost = H.add(item.cost,cost);
      s.stats.bought = H.add(s.stats.bought,cost);
    } else {
      if (qty > item.qty) throw Error('持仓不足');
      const allocated = qty === item.qty ? item.cost : H.int(Number(BigInt(item.cost)*BigInt(qty)/BigInt(item.qty)));
      const net = gross-fee, profit = net-allocated;
      s.cash = H.add(s.cash,net);
      item.qty -= qty;
      item.cost -= allocated;
      s.stats.profit = H.int(s.stats.profit+profit,-Number.MAX_SAFE_INTEGER);
      s.stats.sold = H.add(s.stats.sold,net);
      s.stats.byProduct[id] = H.int(s.stats.byProduct[id]+profit,-Number.MAX_SAFE_INTEGER);
      s.stats.best = Math.max(s.stats.best,profit);
      s.stats.worst = Math.min(s.stats.worst,profit);
    }
    s.stats.fees = H.add(s.stats.fees,fee);
    s.stats.turnover = H.add(s.stats.turnover,gross);
    s.stats.trades = H.add(s.stats.trades,1);
  };
  H.buyHouse = function (s,id) {
    const index = H.houses.findIndex(h => h.id === id), old = H.houses.findIndex(h => h.id === s.house);
    if (index < 0 || index <= old) throw Error('仅允许首次购买或升级住房');
    const due = H.housePrice(s,H.houses[index])-H.houseValue(s);
    if (s.cash < due) throw Error('购房资金不足');
    s.cash -= due;
    s.house = id;
    if (s.stats.houseWeek === 0) s.stats.houseWeek = s.week;
  };
  H.upgradeWarehouse = function (s,id) {
    const index = H.warehouses.findIndex(w => w.id === id), old = H.warehouses.findIndex(w => w.id === s.warehouse);
    if (index < 0 || index <= old) throw Error('仅允许升级仓储');
    const due = H.warehousePrice(s,H.warehouses[index])-H.warehousePrice(s,H.warehouses[old]);
    if (s.cash < due) throw Error('仓储资金不足');
    s.cash -= due;
    s.warehouse = id;
    s.capacity = H.warehouses[index].capacity;
    s.stats.warehouseSpent = H.add(s.stats.warehouseSpent,due);
    s.stats.upgrades = H.add(s.stats.upgrades,1);
  };
})(window.HomeYear);

(function (H) {
  'use strict';
  H.statFields = ['bought','sold','profit','grants','expenses','hardship','trades','best','worst','peak','fees','turnover',
    'houseWeek','warehouseSpent','upgrades','maxDrawdown'];
  H.record = s => {
    const point = {week:s.week, cash:s.cash, inventory:H.inventoryValue(s), house:H.houseValue(s), assets:H.assets(s)};
    s.history[s.week-1] = point;
    s.stats.peak = Math.max(s.stats.peak,point.assets);
    const drawdown = s.stats.peak ? Math.round((s.stats.peak-point.assets)/s.stats.peak*1000000) : 0;
    s.stats.maxDrawdown = Math.max(s.stats.maxDrawdown,drawdown);
  };
  H.summary = s => {
    const ranked = H.heldProducts().map(p => ({id:p.id,profit:s.stats.byProduct[p.id]})).sort((a,b) => b.profit-a.profit);
    const h = H.houses.find(h => h.id === s.house);
    return {ending:h ? h.ending : '仍在租房', assets:H.assets(s), cash:s.cash, house:s.house,
      inventoryValue:H.inventoryValue(s), liquidValue:H.liquidValue(s), houseValue:H.houseValue(s), profit:s.stats.profit,
      unrealized:H.heldProducts().reduce((n,p) => n + H.channelNet(s,p.id,H.qtyOf(s,p.id)) - H.costOf(s,p.id), 0),
      turnover:s.stats.turnover, bought:s.stats.bought, sold:s.stats.sold, fees:s.stats.fees,
      best:s.stats.best, worst:s.stats.worst, bestProduct:ranked[0].id, worstProduct:ranked[ranked.length-1].id,
      peak:s.stats.peak, trades:s.stats.trades, houseWeek:s.stats.houseWeek, upgrades:s.stats.upgrades,
      maxDrawdown:s.stats.maxDrawdown, byProduct:H.clone(s.stats.byProduct), history:H.clone(s.history)};
  };
})(window.HomeYear);

(function (H) {
  'use strict';
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
  function channelFloor(minPrice) {
    return Math.min(minPrice, H.buybackQuote(minPrice));
  }
  H.channelMin = () => Math.min(...H.heldProducts().map(p => channelFloor(p.min)));
  H.validateSettings = settings => {
    keys(settings, Object.keys(H.defaultSettings), '设置');
    for (const key of ['autoSave', 'sound', 'music']) if (typeof settings[key] !== 'boolean') throw Error('设置类型错误');
    if (!['normal', 'reduced', 'off'].includes(settings.animation) || !['decimal', 'compact'].includes(settings.numberFormat)) throw Error('设置值无效');
  };
  function quoteRow(p, m, week) {
    H.int(m.price, p.min, p.max); H.int(m.previous, p.min, p.max);
    finite(m.trend, -1, 1, '趋势');
    H.int(m.low, p.min, m.price); H.int(m.high, m.price, p.max);
    if (!Array.isArray(m.history) || m.history.length !== Math.min(week, 12)) throw Error('行情历史长度无效');
    m.history.forEach(v => H.int(v, m.low, m.high));
    if (m.history[m.history.length - 1] !== m.price || (week > 1 && m.history[m.history.length - 2] !== m.previous)) throw Error('行情历史与当前价不一致');
    if (week === 1 && m.previous !== m.price) throw Error('初周前价无效');
  }
  H.validate = function (s) {
    keys(s, ['version', 'rulesVersion', 'seed', 'difficulty', 'week', 'cash', 'capacity', 'warehouse', 'revision', 'status', 'house', 'result',
      'rng', 'inventory', 'market', 'activeEvents', 'macro', 'season', 'personal', 'personalEvent', 'news', 'history', 'stats',
      'listing', 'absence', 'onStreak', 'legacy', 'migration', 'priceBook'], '存档');
    if (s.version !== H.rules.saveVersion || s.rulesVersion !== H.rules.version) throw Error('存档版本不兼容（不支持旧版或未来版本）');
    if (typeof s.seed !== 'string' || !s.seed.length || s.seed.length > 128) throw Error('种子无效');
    if (!Object.prototype.hasOwnProperty.call(H.difficulties, s.difficulty)) throw Error('难度无效');
    H.int(s.week, 1, 52); H.int(s.cash); H.int(s.revision);
    const warehouse = H.warehouses.find(w => w.id === s.warehouse);
    if (!warehouse || s.capacity !== warehouse.capacity) throw Error('仓储等级与容量不一致');
    if (s.house !== null && !H.houses.some(h => h.id === s.house)) throw Error('住房无效');
    if (!['playing', 'ended'].includes(s.status)) throw Error('状态无效');
    if (s.status === 'playing' && s.result !== null) throw Error('未结束状态不能有结算');
    if (s.status === 'ended' && s.week !== 52) throw Error('结算周无效');
    keys(s.priceBook, ['id', 'houses', 'warehouses'], '价格簿');
    const published = H.priceBooks[s.priceBook.id] && H.priceBooks[s.priceBook.id][s.difficulty];
    if (!published) throw Error('价格簿无效');
    keys(s.priceBook.houses, Object.keys(published.houses), '住房价');
    keys(s.priceBook.warehouses, Object.keys(published.warehouses), '仓储价');
    for (const id of Object.keys(published.houses)) if (s.priceBook.houses[id] !== published.houses[id]) throw Error('住房价与价格簿不一致');
    for (const id of Object.keys(published.warehouses)) if (s.priceBook.warehouses[id] !== published.warehouses[id]) throw Error('仓储价与价格簿不一致');
    if (s.migration !== null) {
      keys(s.migration, ['fromVersion', 'fromRules', 'atWeek', 'backup'], '迁移');
      if (s.migration.fromVersion !== 2 || s.migration.fromRules !== '0.2') throw Error('迁移来源无效');
      H.int(s.migration.atWeek, 1, s.week);
      if (typeof s.migration.backup !== 'string' || !s.migration.backup.startsWith('homeyear.save.backup.')) throw Error('迁移备份无效');
    }
    keys(s.rng, ['market', 'events', 'visual', 'listing'], '随机流');
    for (const key of ['market', 'events', 'visual', 'listing']) H.int(s.rng[key], 1, 4294967295);
    const ids = H.products.map(p => p.id);
    const legacyIds = H.legacyProducts.map(p => p.id);
    keys(s.inventory, ids, '库存'); keys(s.market, ids, '市场'); keys(s.legacy, legacyIds, '退出商品');
    keys(s.absence, ids, '缺席'); keys(s.onStreak, ids, '在售连续');
    if (!Array.isArray(s.listing) || s.listing.length !== 8 || s.listing.some((id, i) => id !== ids.filter(x => s.listing.includes(x))[i])) throw Error('在售名单无效');
    if (!H.listingCovers(s.listing)) throw Error('在售覆盖无效');
    let costs = 0;
    for (const p of H.products) {
      const i = s.inventory[p.id], m = s.market[p.id];
      keys(i, ['qty', 'cost'], '持仓'); H.int(i.qty); H.int(i.cost);
      if ((i.qty === 0) !== (i.cost === 0)) throw Error('数量与成本不一致');
      costs = H.add(costs, i.cost);
      keys(m, ['price', 'previous', 'trend', 'history', 'low', 'high'], '行情');
      quoteRow(p, m, s.week);
      H.int(s.absence[p.id], 0, 3); H.int(s.onStreak[p.id], 0, 52);
      if (s.listing.includes(p.id)) {
        if (s.absence[p.id] !== 0 || s.onStreak[p.id] < 1) throw Error('在售计数无效');
      } else if (s.absence[p.id] < 1 || s.onStreak[p.id] !== 0) throw Error('缺席计数无效');
    }
    for (const p of H.legacyProducts) {
      const i = s.legacy[p.id];
      keys(i, ['qty', 'cost', 'price', 'previous', 'trend', 'history', 'low', 'high'], '退出持仓');
      H.int(i.qty); H.int(i.cost);
      if ((i.qty === 0) !== (i.cost === 0)) throw Error('数量与成本不一致');
      costs = H.add(costs, i.cost);
      quoteRow(p, i, s.week);
    }
    if (H.used(s) > s.capacity) throw Error('容量溢出');
    finite(s.macro, .8, 1.2, '宏观');
    if (s.season !== H.seasonAt(s.week)) throw Error('本周季节无效');
    if (!Array.isArray(s.activeEvents) || s.activeEvents.length > H.events.length) throw Error('持续事件无效');
    const unique = new Set();
    for (const a of s.activeEvents) {
      keys(a, ['id', 'started', 'until'], '持续事件');
      const e = H.events.find(e => e.id === a.id && e.type === 'market');
      if (!e || unique.has(a.id)) throw Error('事件无效或重复');
      unique.add(a.id);
      H.int(a.started, 2, s.week); H.int(a.until, s.week, 52);
      if (a.until !== Math.min(52, a.started + e.duration - 1)) throw Error('事件持续时间不一致');
    }
    H.int(s.personal, -1000000, 1000000);
    if (s.personalEvent !== null) {
      const e = H.events.find(e => e.id === s.personalEvent && e.type === 'personal');
      if (!e || s.personal !== (e.cash < 0 ? Math.round(e.cash * H.difficulty(s).risk) : e.cash)) throw Error('个人事件不一致');
    } else if (s.personal !== 0) throw Error('个人收支缺少事件');
    keys(s.stats, H.statFields.concat('byProduct'), '统计');
    for (const k of H.statFields) H.int(s.stats[k], ['profit', 'worst'].includes(k) ? -Number.MAX_SAFE_INTEGER : 0);
    H.int(s.stats.worst, -Number.MAX_SAFE_INTEGER, 0);
    H.int(s.stats.houseWeek, 0, s.week); H.int(s.stats.upgrades, 0, 3); H.int(s.stats.maxDrawdown, 0, 1000000);
    if ((s.house === null) !== (s.stats.houseWeek === 0)) throw Error('购房周数不一致');
    if (s.stats.warehouseSpent !== H.warehousePrice(s, warehouse) || (s.warehouse === 'room') !== (s.stats.upgrades === 0)) throw Error('仓储统计不一致');
    keys(s.stats.byProduct, ids.concat(legacyIds), '商品利润');
    const st = s.stats, big = BigInt;
    let profits = 0n;
    for (const p of H.heldProducts()) {
      H.int(st.byProduct[p.id], -Number.MAX_SAFE_INTEGER); profits += big(st.byProduct[p.id]);
      const i = p.legacy ? s.legacy[p.id] : s.inventory[p.id];
      const lower = big(i.qty) * big(p.min + Math.floor(p.min * H.rules.fee));
      const upper = big(i.qty) * big(p.max + Math.ceil(p.max * H.rules.fee)) + big(st.trades);
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
    const floorGross = big(H.channelMin());
    if ((trades === 0n && (bought || sold || fees || turnover || big(costs) || st.best || st.worst)) ||
        (trades > 0n && (turnover === 0n || fees === 0n || turnover < floorGross * trades)) ||
        big(st.best) > sold || -big(st.worst) > realized ||
        big(st.profit) > big(st.best) * trades || big(st.profit) < big(st.worst) * trades) throw Error('交易次数或最佳最差统计不一致');
    const unit = s.migration ? Math.max(...H.v2.catalog.products.map(p => Math.ceil(p.max / p.size))) : Math.max(...H.products.map(p => Math.ceil(p.max / p.size)));
    const maxStock = trades === 0n ? 0n : big(s.capacity) * big(unit);
    if (st.peak < H.difficulty(s).initialCash || big(st.peak) > big(H.difficulty(s).initialCash) + big(st.grants) + sold + maxStock) throw Error('资产峰值不可达');
    const minimumDrawdown = st.peak ? Math.round((st.peak - H.assets(s)) / st.peak * 1000000) : 0;
    if (st.maxDrawdown < minimumDrawdown) throw Error('最大回撤小于当前回撤');
    const expectedCash = H.difficulty(s).initialCash - s.stats.bought + s.stats.sold + s.stats.grants - s.stats.expenses - H.houseValue(s) - s.stats.warehouseSpent;
    if (!Number.isSafeInteger(expectedCash) || expectedCash !== s.cash) throw Error('现金与收支统计不一致');
    if (!Array.isArray(s.history) || s.history.length !== s.week) throw Error('资产历史长度无效');
    for (let index = 0; index < s.history.length; index++) {
      const v = s.history[index]; keys(v, ['week', 'cash', 'inventory', 'house', 'assets'], '资产历史');
      H.int(v.week, index + 1, index + 1);
      for (const k of ['cash', 'inventory', 'house', 'assets']) H.int(v[k]);
      if (v.assets !== H.add(H.add(v.cash, v.inventory), v.house) || v.assets > s.stats.peak) throw Error('资产历史不一致');
    }
    const current = s.history[s.week - 1];
    if (current.cash !== s.cash || current.inventory !== H.inventoryValue(s) || current.house !== H.houseValue(s) || current.assets !== H.assets(s)) throw Error('本周资产历史不一致');
    if (!Array.isArray(s.news) || s.news.length > H.events.length + 4) throw Error('新闻无效');
    let headlines = 0, moves = 0;
    for (const n of s.news) {
      keys(n, ['id', 'title', 'reliability', 'week', 'kind', 'productId', 'changeBps', 'fresh'], '新闻');
      if (typeof n.title !== 'string' || !n.title.length || n.title.length > 200 || !Object.prototype.hasOwnProperty.call(H.reliability, n.reliability) || n.week !== s.week) throw Error('新闻内容无效');
      if (!['headline', 'holding', 'listing', 'ongoing', 'personal'].includes(n.kind) || typeof n.fresh !== 'boolean') throw Error('新闻种类无效');
      H.int(n.changeBps, -1000000, 1000000);
      if (n.id === 'rumor') throw Error('新闻内容无效');
      if (n.productId !== null) {
        if (!ids.concat(legacyIds).includes(n.productId) || n.changeBps !== H.changeBps(H.quoteOf(s, n.productId))) throw Error('新闻涨跌与行情不一致');
      } else if (n.changeBps !== 0 || n.kind !== 'personal') throw Error('新闻内容无效');
      if (n.kind === 'ongoing' && (n.reliability !== 'normal' || n.fresh !== false)) throw Error('持续事件新闻无效');
      if (n.kind === 'headline') headlines++;
      if (n.id === 'move') {
        moves++;
        if (n.kind !== 'headline' && n.kind !== 'holding') throw Error('新闻内容无效');
        if (n.kind === 'headline' && s.activeEvents.some(a => a.started === s.week)) throw Error('无事件头条与新事件冲突');
      } else if (n.id === 'listing') {
        if (n.kind !== 'listing') throw Error('新闻内容无效');
      } else if (!H.events.some(e => e.id === n.id)) throw Error('新闻内容无效');
    }
    if (headlines > 1) throw Error('新闻内容无效');
    const bulletinRows = s.news.filter(n => n.kind === 'headline' || n.kind === 'holding' || n.kind === 'listing');
    if (bulletinRows.length > 3 || bulletinRows.filter(n => n.kind === 'listing').length > 1) throw Error('快报超过三行');
    if (s.status === 'ended' && !same(s.result, H.summary(s))) throw Error('结算与状态不一致');
    return true;
  };
})(window.HomeYear);

(function (H) {
  'use strict';
  function blankLegacy(p) {
    return {qty: 0, cost: 0, price: p.base, previous: p.base, trend: 0, history: [p.base], low: p.base, high: p.base};
  }
  function priceBook(difficulty) {
    const published = H.priceBooks['0.2'][difficulty];
    return {id: '0.2', houses: H.clone(published.houses), warehouses: H.clone(published.warehouses)};
  }
  H.create = function (seed = 'CITY-382741', difficulty = 'standard') {
    if (typeof seed !== 'string' || !seed.length || seed.length > 128) throw Error('种子不能为空或过长');
    if (!Object.prototype.hasOwnProperty.call(H.difficulties, difficulty)) throw Error('难度无效');
    const s = {version: H.rules.saveVersion, rulesVersion: H.rules.version, seed, difficulty,
      week: 1, cash: H.difficulties[difficulty].initialCash, capacity: H.rules.capacity, warehouse: 'room',
      revision: 0, status: 'playing', house: null, result: null, rng: {}, inventory: {}, market: {}, activeEvents: [],
      macro: 1, season: '冬', personal: 0, personalEvent: null, news: [], history: [], stats: {},
      listing: [], absence: {}, onStreak: {}, legacy: {}, migration: null, priceBook: priceBook(difficulty)};
    for (const key of H.statFields) s.stats[key] = 0;
    s.stats.byProduct = {};
    for (const stream of ['market', 'events', 'visual', 'listing']) s.rng[stream] = H.seed(seed + ':' + stream);
    for (const p of H.products) {
      s.inventory[p.id] = {qty: 0, cost: 0};
      s.market[p.id] = {price: p.base, previous: p.base, trend: 0, history: [p.base], low: p.base, high: p.base};
      s.stats.byProduct[p.id] = 0;
      s.absence[p.id] = 0;
      s.onStreak[p.id] = 0;
    }
    for (const p of H.legacyProducts) {
      s.legacy[p.id] = blankLegacy(p);
      s.stats.byProduct[p.id] = 0;
    }
    s.listing = H.initialListing(s);
    for (const p of H.products) {
      const on = s.listing.includes(p.id);
      s.absence[p.id] = on ? 0 : 1;
      s.onStreak[p.id] = on ? 1 : 0;
    }
    H.record(s); H.validate(s);
    return s;
  };
  H.migrateV2 = function (raw, backup) {
    if (!raw || raw.status !== 'playing') throw Error('已结束旧档不迁移');
    if (!H.v2 || !H.v2.validate(raw)) throw Error('旧档校验失败');
    const book = H.priceBooks['0.2'][raw.difficulty];
    if (!book) throw Error('旧档难度无效');
    if (H.v2.houseValue(raw) !== (raw.house ? book.houses[raw.house] : 0)) throw Error('旧住房价与价格簿不一致');
    if (raw.stats.warehouseSpent !== book.warehouses[raw.warehouse]) throw Error('旧仓储价与价格簿不一致');
    const s = H.create(raw.seed, raw.difficulty);
    s.week = raw.week;
    s.cash = raw.cash;
    s.capacity = raw.capacity;
    s.warehouse = raw.warehouse;
    s.revision = raw.revision;
    s.house = raw.house;
    s.macro = raw.macro;
    s.season = raw.season;
    s.personal = raw.personal;
    s.personalEvent = raw.personalEvent;
    s.history = H.clone(raw.history);
    s.stats = H.clone(raw.stats);
    s.activeEvents = [];
    s.rng.market = raw.rng.market;
    s.rng.events = raw.rng.events;
    s.rng.visual = raw.rng.visual;
    s.rng.listing = H.seed(raw.seed + ':listing:' + raw.week + ':' + raw.revision);
    for (const p of H.products) {
      s.inventory[p.id] = H.clone(raw.inventory[p.id]);
      s.market[p.id] = H.clone(raw.market[p.id]);
    }
    for (const p of H.legacyProducts) {
      const src = raw.market[p.id];
      s.legacy[p.id] = {qty: raw.inventory[p.id].qty, cost: raw.inventory[p.id].cost,
        price: src.price, previous: src.previous, trend: src.trend, history: src.history.slice(), low: src.low, high: src.high};
    }
    s.listing = H.initialListing(s);
    for (const p of H.products) {
      const on = s.listing.includes(p.id);
      s.absence[p.id] = on ? 0 : 1;
      s.onStreak[p.id] = on ? 1 : 0;
    }
    s.migration = {fromVersion: 2, fromRules: '0.2', atWeek: raw.week, backup};
    s.news = [];
    const moves = H.products.filter(p => Math.abs(H.changeBps(s.market[p.id])) >= H.rules.headlineMoveBps)
      .sort((a, b) => Math.abs(H.changeBps(s.market[b.id])) - Math.abs(H.changeBps(s.market[a.id])));
    if (moves.length) {
      const bps = H.changeBps(s.market[moves[0].id]);
      s.news.push({id: 'move', title: moves[0].name + '本周价格已经明显变动', reliability: 'normal', week: s.week,
        kind: 'headline', productId: moves[0].id, changeBps: bps, fresh: true});
    }
    if (s.cash !== raw.cash || JSON.stringify(s.history) !== JSON.stringify(raw.history) || s.stats.warehouseSpent !== raw.stats.warehouseSpent || H.houseValue(s) !== H.v2.houseValue(raw)) {
      throw Error('迁移改变了现金、历史或住房仓储价');
    }
    H.validate(s);
    return s;
  };
  H.Engine = function (seed, difficulty) {
    let state = H.create(seed, difficulty), seen = new Set();
    this.onCommit = null;
    this.snapshot = () => H.clone(state);
    const blankDiag = () => ({clips: 0, persistCapTriggers: 0, specStarts: 0, specStartClips: 0,
      eventStartedClips: 0, noEventStartedClips: 0, eventStartedWeeks: 0, noEventStartedWeeks: 0,
      byProduct: {}, persistCapped: {}, clipLog: []});
    let diag = blankDiag();
    this.restore = s => {
      H.validate(s);
      state = H.clone(s);
      seen = new Set();
      diag = blankDiag();
    };
    this.diagnostics = () => ({clips: diag.clips, persistCapTriggers: diag.persistCapTriggers, specStarts: diag.specStarts, specStartClips: diag.specStartClips,
      eventStartedClips: diag.eventStartedClips, noEventStartedClips: diag.noEventStartedClips,
      eventStartedWeeks: diag.eventStartedWeeks, noEventStartedWeeks: diag.noEventStartedWeeks,
      byProduct: Object.assign({}, diag.byProduct), persistCapped: Object.assign({}, diag.persistCapped),
      clipLog: diag.clipLog.map(row => Object.assign({}, row, {clipped: row.clipped.slice(), startedProducts: row.startedProducts.slice(),
        persistCapped: row.persistCapped.slice(), persistProducts: row.persistProducts.slice()}))});
    this.visible = () => ({seed: state.seed, difficulty: state.difficulty, week: state.week, revision: state.revision,
      cash: state.cash, capacity: state.capacity, warehouse: state.warehouse, house: state.house, status: state.status,
      priceBook: H.clone(state.priceBook), listing: state.listing.slice(), inventory: H.clone(state.inventory),
      legacy: Object.fromEntries(H.legacyProducts.map(p => [p.id, {qty: state.legacy[p.id].qty, cost: state.legacy[p.id].cost, price: state.legacy[p.id].price, previous: state.legacy[p.id].previous}])),
      news: H.clone(state.news), assets: H.assets(state), liquid: H.liquidValue(state),
      market: Object.fromEntries(H.products.map(p => { const m = state.market[p.id]; return [p.id,
        {price: m.price, previous: m.previous, history: m.history.slice(), low: m.low, high: m.high}]; }))});
    this.dispatch = op => {
      try {
        if (!op || typeof op.token !== 'string' || !op.token.length) throw Error('操作标识缺失');
        if (op.type === 'end' && state.status === 'ended') return {ok: true, result: H.clone(state.result)};
        if (seen.has(op.token)) throw Error('重复提交');
        if (op.revision !== state.revision) throw Error('操作已过期');
        if (state.status !== 'playing') throw Error('本年已结束');
        const next = H.clone(state);
        let pending = null;
        switch (op.type) {
          case 'buy': case 'sell': H.trade(next, op.type, op.id, op.qty); break;
          case 'house': H.buyHouse(next, op.id); break;
          case 'warehouse': H.upgradeWarehouse(next, op.id); break;
          case 'next':
            if (next.week === 52) throw Error('第52周请结束本年');
            next.week++;
            H.environment(next); H.rotate(next); H.drawEvents(next); H.trends(next);
            pending = H.prices(next);
            pending.week = next.week;
            H.personal(next); H.news(next); break;
          case 'end':
            if (next.week !== 52) throw Error('尚未到年底');
            next.status = 'ended'; break;
          default: throw Error('未知操作');
        }
        H.record(next); next.revision++;
        if (next.status === 'ended') next.result = H.summary(next);
        H.validate(next);
        state = next; seen.add(op.token);
        if (pending) {
          diag.clips += pending.clips;
          diag.persistCapTriggers += pending.persistCapTriggers;
          diag.specStarts += pending.specStarts;
          diag.specStartClips += pending.specStartClips;
          for (const id of pending.clipped) diag.byProduct[id] = (diag.byProduct[id] || 0) + 1;
          for (const id of pending.persistCapped) diag.persistCapped[id] = (diag.persistCapped[id] || 0) + 1;
          if (pending.eventStarted) { diag.eventStartedClips += pending.clips; diag.eventStartedWeeks++; }
          else { diag.noEventStartedClips += pending.clips; diag.noEventStartedWeeks++; }
          diag.clipLog.push({week: pending.week, clips: pending.clips, clipped: pending.clipped.slice(),
            startedProducts: pending.startedProducts.slice(), persistCapTriggers: pending.persistCapTriggers,
            persistCapped: pending.persistCapped.slice(), persistProducts: pending.persistProducts.slice(),
            specStarts: pending.specStarts, specStartClips: pending.specStartClips, eventStarted: pending.eventStarted});
        }
        let saveError = null;
        if (this.onCommit) {
          try { this.onCommit(this.snapshot()); } catch (e) { saveError = e.message; }
        }
        return {ok: true, saveError, result: state.result ? H.clone(state.result) : null};
      } catch (e) { return {ok: false, error: e.message}; }
    };
  };
})(window.HomeYear);

const V = window.HomeYear;
live.v3 = {catalog: V, validate: V.validate, create: V.create, Engine: V.Engine, migrateV2: V.migrateV2};
})(window.HomeYear);
