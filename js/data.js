(function (g) {
  'use strict';
  const H = g.HomeYear = {};
  H.rules = {version: '0.2', saveVersion: 2, initialCash: 300000, capacity: 20, weeks: 52, fee: 0.01};
  H.difficulties = {
    easy: {name: '轻松', initialCash: 400000, houseFactor: 0.8, warehouseFactor: 0.8, volatility: 0.85, risk: 0.8},
    standard: {name: '标准', initialCash: 300000, houseFactor: 1, warehouseFactor: 1, volatility: 1, risk: 1},
    challenge: {name: '挑战', initialCash: 250000, houseFactor: 1.25, warehouseFactor: 1.2, volatility: 1.15, risk: 1.25}
  };
  // All monetary configuration is in cents. base/min/max/size are frozen API aliases.
  const rows = [
    ['rice','大米','生活','耐存储的主食，体积大但价格稳。',18000,7000,43000,2,.045,.7,.7,.08,0,'米'],
    ['oil','食用油','生活','供应与节日需求牵动家庭用油。',24000,9000,65000,2,.065,.8,.9,.12,0,'油'],
    ['pork','猪肉','生活','供给周期长，疫病与集中出栏都会改变行情。',12000,3500,38000,2,.105,1,1.3,.15,0,'肉'],
    ['eggs','鸡蛋','生活','薄利日用品，供应恢复速度快。',7000,2500,19000,1,.065,.6,1,.08,0,'蛋'],
    ['fruit','水果','生活','夏日需求与丰收相互拉扯。',14000,4000,42000,2,.095,.8,1.2,.25,Math.PI,'果'],
    ['milk','牛奶','生活','低波动补给，适合谨慎经营。',11000,4500,24000,2,.04,.5,.7,.05,0,'奶'],
    ['phone','手机','电子','换代与促销令旧款承压。',65000,22000,180000,2,.11,1.2,1.1,.08,4,'机'],
    ['gpu','显卡','电子','高波动硬件，缺货与迭代风险突出。',80000,20000,240000,3,.18,1.4,1.5,.05,1,'卡'],
    ['console','游戏机','电子','假期需求强，热潮结束后可能回落。',50000,15000,140000,3,.13,1.2,1.1,.2,0,'游'],
    ['camera','相机','电子','旅游季走俏，占用空间不小。',90000,30000,230000,3,.09,1.1,.9,.18,Math.PI,'摄'],
    ['gold','黄金饰品','贵重','昂贵且紧凑，但通常波动小。',120000,70000,190000,1,.035,.4,.65,.03,0,'金'],
    ['watch','名表','贵重','紧凑奢侈品，消费冷却时难免回调。',150000,50000,350000,2,.09,1.1,1,.08,0,'表'],
    ['collectible','城市藏品','贵重','小众收藏，热度反转可能很猛烈。',70000,12000,250000,2,.20,1.5,1.4,.05,2,'藏'],
    ['coat','羽绒服','季节','冬旺夏淡，提前布局仍有天气风险。',30000,8000,90000,2,.08,.8,1.1,.5,0,'衣'],
    ['ac','空调','季节','夏季旺销，但大体积压缩仓位。',65000,20000,170000,5,.09,.9,1.3,.5,Math.PI,'凉'],
    ['umbrella','雨具','季节','梅雨季需求突出，单价低。',9000,2500,27000,1,.085,.7,1.25,.28,3.6,'伞'],
    ['mask','口罩','应急','平时廉价，防护需求出现时跳涨。',6000,1500,28000,1,.12,.6,1.6,.1,0,'罩'],
    ['medicine','常备药','应急','季节性需求与供应事件并存。',16000,5500,48000,1,.075,.7,1.2,.25,0,'药'],
    ['battery','电池','应急','制造与停电需求影响供应。',20000,7000,60000,2,.10,1,1.3,.08,0,'电'],
    ['food','应急食品','应急','低价耐储，应急时可能集中购买。',13000,4000,40000,2,.07,.7,1.2,.1,0,'备']
  ];
  H.products = rows.map(r => ({id:r[0], name:r[1], category:r[2], description:r[3],
    basePrice:r[4], minPrice:r[5], maxPrice:r[6], unitSize:r[7], volatility:r[8],
    trendSensitivity:r[9], eventSensitivity:r[10], season:r[11], phase:r[12], icon:r[13],
    base:r[4], min:r[5], max:r[6], size:r[7]}));
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
  // Warehouse prices are cumulative lease investment; upgrading pays the difference.
  const market = [
    ['chips','芯片供应趋紧',3,{gpu:.5,phone:.2,console:.2},'reliable'],
    ['new_gpu','新显卡上市',3,{gpu:-.4},'reliable'],
    ['electronics_sale','电子促销季',2,{phone:-.25,console:-.2,camera:-.2},'reliable'],
    ['gold_safe','避险买盘增加',4,{gold:.2,watch:.1},'normal'],
    ['gold_supply','金饰供给恢复',3,{gold:-.15},'reliable'],
    ['pork_glut','集中出栏',3,{pork:-.4},'reliable'],
    ['pork_short','养殖供应收紧',4,{pork:.45},'normal'],
    ['heat','持续高温',3,{ac:.5,fruit:.2,battery:.1},'reliable'],
    ['cold','寒潮来临',3,{coat:.5,medicine:.2},'reliable'],
    ['rain','连续降雨',3,{umbrella:.6,fruit:-.15},'reliable'],
    ['dry','天气转晴',2,{umbrella:-.4},'normal'],
    ['harvest','粮食丰收',4,{rice:-.3,oil:-.15},'reliable'],
    ['crop_loss','农产减收',4,{rice:.3,oil:.3,fruit:.25},'normal'],
    ['egg_supply','蛋品供给宽松',2,{eggs:-.3},'reliable'],
    ['egg_demand','烘焙订单增长',3,{eggs:.35,milk:.15},'normal'],
    ['milk_sale','奶品促销',2,{milk:-.2},'reliable'],
    ['travel','旅行季升温',3,{camera:.35,fruit:.1},'normal'],
    ['console_launch','热门游戏发售',3,{console:.4},'reliable'],
    ['console_stock','游戏机库存充足',3,{console:-.35},'reliable'],
    ['phone_launch','新机换代',3,{phone:-.35},'reliable'],
    ['luxury','奢侈消费回暖',4,{watch:.4,collectible:.2},'normal'],
    ['weak','消费热情降温',4,{watch:-.35,collectible:-.3,camera:-.2},'normal'],
    ['collection','收藏展览开幕',3,{collectible:.5},'reliable'],
    ['bubble','藏品热度消退',3,{collectible:-.45},'normal'],
    ['flu','防护需求增加',3,{mask:.65,medicine:.4},'reliable'],
    ['supply','防护工厂增产',4,{mask:-.4,medicine:-.2},'reliable'],
    ['power','区域停电检修',2,{battery:.5,food:.2},'reliable'],
    ['battery_factory','电池生产恢复',3,{battery:-.35},'reliable'],
    ['prepared','应急储备倡议',3,{food:.45,rice:.15},'reliable'],
    ['coat_sale','冬衣清仓',3,{coat:-.45},'reliable'],
    ['ac_factory','空调出厂促销',3,{ac:-.35},'reliable'],
    ['logistics','物流成本上升',3,{rice:.15,oil:.2,food:.15,battery:.15},'normal']
  ];
  H.events = market.map(r => ({id:r[0], type:'market', title:r[1], description:r[1]+'，相关品类目标价将受到暂时影响。',
    duration:r[2], effects:r[3], reliability:r[4], weight:1}));
  const personal = [
    ['rent','临时租住维护费',-18000],['repair','手机维修',-24000],['ill','看诊支出',-20000],
    ['fare','通勤补缴',-12000],['bonus','公司小奖金',25000],['repay','朋友归还借款',16000],
    ['gift','亲友红包',12000],['refund','账单退款',9000]
  ];
  H.events.push(...personal.map(r => ({id:r[0],type:'personal',title:r[1],description:'生活的一点插曲，不改变商品行情。',
    duration:1, cash:r[2], effects:{}, reliability:'reliable', weight:1})));
  H.reliability = {
    reliable:{name:'可靠消息', description:'已发生的供应或需求消息，不保证价格上涨'},
    normal:{name:'一般新闻', description:'事件观察，影响大小仍有不确定性'},
    rumor:{name:'市场传闻', description:'未经核实，不驱动市场，不应作为保证'}
  };
  H.defaultSettings = {autoSave:true, sound:true, music:true, animation:'normal', numberFormat:'decimal'};
})(window);
