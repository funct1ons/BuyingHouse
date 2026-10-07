const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({window:{}});
for (const file of ['data','math','market','trading','statistics','street','validation','game','save']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file+'.js'),'utf8'),context);
}
const H = context.window.HomeYear;
let token = 0;
function op(e,type,id,qty){return e.dispatch({type,id,qty,revision:e.snapshot().revision,token:String(++token)});}
function ok(e,type,id,qty){const r=op(e,type,id,qty);assert.equal(r.ok,true,r.error);return e.snapshot();}
function closing(difficulty='fantasy',house=true){
  const e=new H.Engine('AUCTION-TEST',difficulty);
  // Controlled grant keeps the real cash ledger balanced for deterministic boundary cases.
  let s=e.snapshot();s.cash+=5000000;s.stats.grants+=5000000;H.record(s);e.restore(s);
  if(house)ok(e,'house','city');
  if(H.loanOpen(e.snapshot()))ok(e,'repay','all');
  while(e.snapshot().week<52)ok(e,'next');
  return e;
}
test('all difficulties allow debt-funded purchase and upgrade',()=>{
  for(const d of Object.keys(H.difficulties)){
    const e=new H.Engine('BORROW-HOME',d);
    if(!H.loanOpen(e.snapshot()))ok(e,'loan','12000');
    // Challenge needs operating income before it can afford its first home.
    if(d==='challenge'){const s=e.snapshot();s.cash+=1000000;s.stats.grants+=1000000;H.record(s);e.restore(s);}
    ok(e,'house','studio');ok(e,'house','flat');assert.equal(H.loanOpen(e.snapshot()),true);
  }
});
test('auction repays interest first, preserves records, permits one lower-tier purchase',()=>{
  const e=closing();ok(e,'loan','1000');const before=e.snapshot();
  const s=ok(e,'end');assert.equal(s.status,'rebuy');assert.equal(s.house,null);
  assert.equal(s.auction.proceeds,H.houseValue(before));assert.equal(s.cash,before.cash+H.houseValue(before)-102000);
  assert.equal(s.stats.loanInterestAccrued-before.stats.loanInterestAccrued,2000);
  assert.equal(s.loan.principal,0);assert.equal(s.purchases.length,1);
  const saves=new H.SaveAdapter();
  const parsed=saves.parse(saves.export(s));assert.equal(parsed.ok,true,parsed.error);
  const restored=new H.Engine('X','standard');restored.restore(parsed.state);
  for(const type of ['next','loan','repay','lottery','buy','sell','warehouse'])assert.equal(op(restored,type,'1000',1).ok,false);
  const final=ok(restored,'house','studio');assert.equal(final.status,'ended');assert.equal(final.purchases.length,2);
  assert.equal(final.purchases[1].paid,H.housePrice(s,H.houses[0]));
  assert.equal(op(restored,'house','flat').ok,false);assert.equal(ok(restored,'end').cash,final.cash);
  assert.equal(final.stats.loanInterestAccrued,s.stats.loanInterestAccrued);H.validate(final);
  assert.equal(saves.parse(saves.export(final)).ok,true);
});
test('skip purchase does not accrue twice; no debt keeps the house; no house does not auction',()=>{
  const e=closing();ok(e,'loan','1000');const s=ok(e,'end');const end=ok(e,'end');
  assert.equal(end.status,'ended');assert.equal(end.house,null);assert.equal(end.stats.loanInterestAccrued,s.stats.loanInterestAccrued);
  const paid=closing();const kept=ok(paid,'end');assert.equal(kept.house,'city');assert.equal(kept.auction,undefined);
  const none=closing('standard',false);ok(none,'loan','1000');const rent=ok(none,'end');assert.equal(rent.status,'ended');assert.equal(rent.auction,undefined);
});
test('insufficient auction proceeds retain debt and nonnegative cash',()=>{
  const e=closing('standard',false);ok(e,'house','studio');ok(e,'loan','12000');
  const s=e.snapshot();s.stats.expenses+=s.cash;s.cash=0;H.record(s);e.restore(s);
  const a=ok(e,'end');assert.equal(a.status,'rebuy');assert.equal(a.cash,0);assert.equal(H.loanOpen(a),true);
  assert.equal(a.loan.interestDue,0);assert.equal(op(e,'house','studio').ok,false);ok(e,'end');
});
test('challenge opening interest plus a full year at maximum principal can settle',()=>{
  const e=new H.Engine('CHALLENGE-FULL-LOAN','challenge');
  const s=e.snapshot();s.cash+=2000000;s.stats.grants+=2000000;H.record(s);e.restore(s);
  ok(e,'repay','all');ok(e,'loan','12000');ok(e,'house','studio');
  while(e.snapshot().week<52)ok(e,'next');
  const a=ok(e,'end');assert.equal(a.status,'rebuy');
  assert.equal(a.stats.loanInterestAccrued,12000+52*24000);ok(e,'end');
});
test('invalid auction amounts and forged purchase phase fail validation',()=>{
  const e=closing();ok(e,'loan','1000');const s=ok(e,'end');
  for(const field of ['proceeds','cashBefore','purchaseCount','principalBefore','interestBefore']){
    const bad=H.clone(s);bad.auction[field]++;assert.throws(()=>H.validate(bad));
  }
  const bad=H.clone(s);delete bad.auction;assert.throws(()=>H.validate(bad));
});
