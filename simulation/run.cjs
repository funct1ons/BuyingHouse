'use strict';
// Historical v2 tool. It still sells with price*0.99 and is not the v4 evidence runner.
// C1 and later samples use simulation/c1.cjs. Do not overwrite docs/balance-*.json with this file.
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
const root=path.join(__dirname,'..'), window={};
const files=['data','math','market','trading','statistics','validation','game'];
for(const name of files)new Function('window',fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'))(window);
const H=window.HomeYear;
const args=process.argv.slice(2), get=(key,fallback)=>{const i=args.indexOf('--'+key);return i<0?fallback:args[i+1];};
const count=Number(get('seeds',1000)), prefix=get('prefix','balance-v2'), out=get('out','docs/balance-primary.json');
if(!Number.isInteger(count)||count<1)throw Error('Invalid seed count');
const strategies=['conservative','random','momentum','value','idle'];
const quantile=(list,q)=>{const s=list.slice().sort((a,b)=>a-b);return s[Math.floor((s.length-1)*q)]??null;};
function run(seed,difficulty,strategy) {
  const e=new H.Engine(seed,difficulty), policy={rng:{policy:H.seed('policy:'+seed+':'+strategy)}};
  const rand=()=>H.random(policy,'policy');
  let revision=0,token=0;
  function act(type,id,qty) {
    const r=e.dispatch({type,id,qty,revision,token:'simulation-'+(++token)});
    if(!r.ok)throw Error(`${seed}/${strategy}/${type}: ${r.error}`);
    revision++;
  }
  function purchase(s,p,budget) {
    const qty=Math.min(Math.floor(budget/(s.market[p.id].price*1.01)),Math.floor((s.capacity-H.used(s))/p.size));
    if(qty>0)act('buy',p.id,qty);
  }
  function liquidate(s) {for(const p of H.products)if(s.inventory[p.id].qty)act('sell',p.id,s.inventory[p.id].qty);}
  for(let week=1;week<=52;week++) {
    // This object has no hidden trends, active effects, RNG state or future data.
    let s=e.visible();
    if(strategy!=='idle'&&week<52) {
      if(strategy==='random') {
        const listed=s.listing||H.products.map(p=>p.id);
        const p=H.products.find(x=>x.id===listed[Math.floor(rand()*listed.length)])||H.products[0],i=s.inventory[p.id];
        if(i.qty&&rand()<.5)act('sell',p.id,Math.max(1,Math.floor(i.qty*rand())));
        else if(listed.includes(p.id)) purchase(s,p,s.cash*(.2+.6*rand()));
      } else {
        for(const p of H.products) {
          const i=s.inventory[p.id],m=s.market[p.id];if(!i.qty)continue;
          const gain=(m.price*.99)/(i.cost/i.qty)-1,ratio=m.price/p.basePrice;
          const sell=strategy==='conservative' ? (gain>=.08||ratio>=1.03||gain<-.18) :
            strategy==='value' ? (gain>=.18||ratio>=1.03||gain<-.3) : (m.price<m.previous*.985||gain>=.2||gain<-.15);
          if(sell)act('sell',p.id,i.qty);
        }
        s=e.visible();
        const candidates=H.products.filter(p => {
          if(s.listing&&!s.listing.includes(p.id))return false;
          const m=s.market[p.id],ratio=m.price/p.basePrice;
          if(strategy==='conservative')return ['生活','贵重'].includes(p.category)&&p.volatility<.08&&ratio<.88;
          if(strategy==='value')return ratio<.84;
          return m.price/m.previous>1.025 && m.price/p.basePrice<1.55;
        }).sort((a,b) => strategy==='momentum' ?
          s.market[b.id].price/s.market[b.id].previous-s.market[a.id].price/s.market[a.id].previous :
          s.market[a.id].price/a.basePrice-s.market[b.id].price/b.basePrice);
        if(candidates.length)purchase(s,candidates[0],s.cash*(strategy==='conservative'?.5:.8));
      }
      s=e.visible();
      if(week<38 && H.used(s)>=s.capacity*.8) {
        const index=H.warehouses.findIndex(w=>w.id===s.warehouse),next=H.warehouses[index+1];
        if(next) {
          const due=H.warehousePrice(s,next)-H.warehousePrice(s,H.warehouses[index]);
          if(s.cash>due*2 && (strategy!=='random'||rand()<.25))act('warehouse',next.id);
        }
      }
    }
    s=e.visible();
    // Common housing policy: buy minimum when liquid cash allows it, upgrade at year end.
    if(!s.house && s.cash>=H.housePrice(s,H.houses[0]))act('house',H.houses[0].id);
    if(week===52) {
      if(strategy!=='idle')liquidate(e.visible());
      s=e.visible();
      for(let h=H.houses.length-1;h>=0;h--) {
        if(H.houses.findIndex(x=>x.id===s.house)>=h)break;
        if(s.cash+H.houseValue(s)>=H.housePrice(s,H.houses[h])){act('house',H.houses[h].id);break;}
      }
      act('end');
    } else act('next');
  }
  const s=e.snapshot();
  return {seed,assets:H.assets(s),house:s.house||'renting',houseWeek:s.stats.houseWeek,upgrades:s.stats.upgrades,
    drawdown:s.stats.maxDrawdown,byProduct:s.stats.byProduct,profit:s.stats.profit};
}
const report={format:1,createdAt:new Date().toISOString(),command:'node simulation/run.cjs '+args.join(' '),
  seeds:count,prefix,rulesVersion:H.rules.version,model:'same shipped Engine; no alternate economic model',
  information:'Engine.visible() only, public product guide (basePrice/category/volatility/size); policy RNG independent of engine',
  sourceHashes:Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'js',f+'.js'))).digest('hex')])),
  strategies:{conservative:'stable categories; <88% guide price, 50% cash; +8%/overvalue/-18% sell',
    random:'one random commodity action weekly; buy 20–80% cash, sell random fraction',
    momentum:'observed weekly rise >2.5%; 80% cash; sell reversal/+20%/-15%',
    value:'<84% public guide price; 80% cash; sell +18%/overvalue/-30%',idle:'no trades, common housing policy only'},groups:[]};
const start=Date.now();
for(const difficulty of Object.keys(H.difficulties))for(const strategy of strategies) {
  const samples=[];
  for(let n=0;n<count;n++)samples.push(run(prefix+'-'+n,difficulty,strategy));
  const assets=samples.map(s=>s.assets),wins=samples.filter(s=>s.house!=='renting'),drawdowns=samples.map(s=>s.drawdown/10000);
  const byProduct=Object.fromEntries(H.products.map(p=>[p.id,samples.reduce((sum,s)=>sum+s.byProduct[p.id],0)/count]));
  const group={difficulty,strategy,count,successRate:wins.length/count,
    assets:{p10:quantile(assets,.1),p50:quantile(assets,.5),p90:quantile(assets,.9)},
    houses:Object.fromEntries(['renting',...H.houses.map(h=>h.id)].map(id=>[id,samples.filter(s=>s.house===id).length])),
    purchaseWeek:{p10:quantile(wins.map(s=>s.houseWeek),.1),p50:quantile(wins.map(s=>s.houseWeek),.5),p90:quantile(wins.map(s=>s.houseWeek),.9)},
    upgradeRate:samples.filter(s=>s.upgrades>0).length/count,meanUpgrades:samples.reduce((sum,s)=>sum+s.upgrades,0)/count,
    drawdownPercent:{p10:quantile(drawdowns,.1),p50:quantile(drawdowns,.5),p90:quantile(drawdowns,.9)},
    meanProfit:samples.reduce((sum,s)=>sum+s.profit,0)/count,meanContribution:byProduct,samples};
  report.groups.push(group);
  console.log(`${difficulty}/${strategy}: ${(100*group.successRate).toFixed(1)}% assets ¥${(group.assets.p10/100).toFixed(0)}/${(group.assets.p50/100).toFixed(0)}/${(group.assets.p90/100).toFixed(0)} upgrade ${(100*group.upgradeRate).toFixed(1)}%`);
}
report.elapsedSeconds=(Date.now()-start)/1000;
fs.mkdirSync(path.dirname(path.join(root,out)),{recursive:true});fs.writeFileSync(path.join(root,out),JSON.stringify(report,null,2));
console.log(`Saved ${out}; ${report.elapsedSeconds.toFixed(1)}s`);
