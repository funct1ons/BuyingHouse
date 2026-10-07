'use strict';
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), assert = require('node:assert/strict');
const ctx = vm.createContext({console}); ctx.window = ctx;
for (const file of ['data','math','v2-baseline','v3-baseline','market','trading','statistics','street','validation','game','save']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/' + file + '.js'), 'utf8'), ctx);
const H = ctx.HomeYear;
let seq = 0, passed = 0;
const call = (e, type, id) => e.dispatch({type, id, qty: 1, revision: e.visible().revision, token: 'settlement-' + ++seq});
function must(e, type, id) { const r = call(e, type, id); assert.equal(r.ok, true, r.error); return r; }
function cash(e, amount) {
  const s = e.snapshot(), delta = amount - s.cash;
  s.stats[delta >= 0 ? 'grants' : 'expenses'] += Math.abs(delta); s.cash = amount; H.record(s); e.restore(s);
}
function fixture(house = null, earlyLoan = false, difficulty = 'standard') {
  const e = new H.Engine('settlement-' + difficulty, difficulty);
  if (house) { cash(e, 100000000); must(e, 'house', house); }
  if (earlyLoan) must(e, 'loan', '3000');
  while (e.snapshot().week < 52) must(e, 'next');
  if (!earlyLoan) must(e, 'loan', '1000');
  return e;
}
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }
function reject(e, type, id) { const before = e.snapshot(); assert.equal(call(e, type, id).ok, false); assert.deepEqual(e.snapshot(), before); }
function roundtrip(e) {
  const a = new H.SaveAdapter(), restored = new H.Engine();
  const r = a.parse(a.export(e.snapshot())); assert.equal(r.ok, true, r.error); restored.restore(r.state);
  assert.deepEqual(restored.snapshot(), e.snapshot()); return restored;
}
function tamper(e, change) { const s = e.snapshot(); change(s); if (s.status === 'ended') s.result = H.summary(s); assert.throws(() => H.validate(s)); }

test('三难度现金边界：无现金、仅部分利息、恰好利息、部分本金、恰好还清、有余额', () => {
  for (const difficulty of Object.keys(H.difficulties)) for (const amount of [0, 1499, 1500, 1501, 101500, 101501]) {
    const e = fixture(null, false, difficulty); cash(e, amount);
    const before = e.snapshot(); must(e, 'end'); const s = e.snapshot();
    assert.equal(s.status, 'ended'); assert.equal(s.cash, Math.max(0, amount - 101500));
    assert.equal(s.loan.interestDue, Math.max(0, 1500 - amount));
    assert.equal(s.loan.principal, 100000 - Math.min(100000, Math.max(0, amount - 1500)));
    assert.equal(s.stats.loanInterestAccrued, before.stats.loanInterestAccrued + 1500);
    assert.equal(s.settlement.cashBefore, amount); assert.equal(s.settlement.auction, null);
    const finished = e.snapshot(); must(e, 'end'); assert.deepEqual(e.snapshot(), finished); roundtrip(e);
  }
});
test('现金足够时保留住房且不进入回购', () => {
  const e = fixture('studio'); cash(e, 101500); must(e, 'end');
  assert.equal(e.snapshot().house, 'studio'); assert.equal(e.snapshot().settlement.auction, null);
  assert.equal(e.snapshot().status, 'ended'); reject(e, 'house', 'flat');
});
test('库存不自动出售，现金不足且无住房时保留未偿债务', () => {
  const e = fixture(); must(e, 'buy', e.visible().listing[0]); cash(e, 0);
  const before = e.snapshot(); must(e, 'end'); const s = e.snapshot();
  assert.deepEqual(s.inventory, before.inventory); assert.equal(s.stats.sold, before.stats.sold);
  assert.equal(s.loan.principal, 100000); assert.equal(s.cash, 0);
});
test('拍卖按末周市价无费用，回购操作限制、失败原子性、恢复与放弃', () => {
  const e = fixture('flat'); cash(e, 0); const before = e.snapshot(); must(e, 'end');
  const s = e.snapshot(); assert.equal(s.status, 'rebuy'); assert.equal(s.house, null); assert.equal(s.result, null);
  assert.equal(s.settlement.auction.proceeds, H.houseValue(before));
  assert.equal(s.cash, Math.max(0, H.houseValue(before) - 101500));
  assert.equal(s.stats.fees, before.stats.fees); assert.equal(s.stats.sold, before.stats.sold);
  assert.deepEqual(s.purchases, before.purchases); assert.equal(s.houseBasis, before.houseBasis);
  assert.deepEqual(e.visible().settlement, s.settlement);
  for (const type of ['buy','sell','next','loan','repay','lottery','warehouse']) reject(e, type, '1000');
  reject(e, 'house', 'mars'); reject(e, 'house', 'invalid');
  const restored = roundtrip(e); must(restored, 'end');
  assert.equal(restored.snapshot().status, 'ended'); assert.equal(restored.snapshot().house, null);
  assert.equal(restored.snapshot().stats.loanInterestAccrued, s.stats.loanInterestAccrued);
  const done = restored.snapshot(); must(restored, 'end'); assert.deepEqual(restored.snapshot(), done);
});
test('拍卖后可降级回购一次，全额支付并立即结束，不再计息', () => {
  const e = fixture('flat'); cash(e, 0); must(e, 'end'); const before = e.snapshot();
  must(e, 'house', 'studio'); const s = e.snapshot();
  assert.equal(s.status, 'ended'); assert.equal(s.house, 'studio');
  assert.equal(s.purchases.length, before.settlement.purchaseCount + 1);
  assert.equal(s.cash, before.cash - H.houseQuote(before, 'studio'));
  assert.equal(s.stats.loanInterestAccrued, before.stats.loanInterestAccrued);
  assert.equal(s.stats.houseWeek, before.stats.houseWeek); reject(e, 'house', 'flat'); roundtrip(e);
});
test('合成低价边界：拍卖仍不足时现金为零并保留债务，先息后本', () => {
  // Current housing floors exceed the maximum annual debt. Exercise the payment
  // helper with a synthetic quote without changing any production rule or save.
  const e = fixture('studio', true); cash(e, 0); const s = e.snapshot();
  const beforeInterest = s.loan.interestDue, quote = H.houseValue;
  try { H.houseValue = () => 100000; H.settleDebt(s); }
  finally { H.houseValue = quote; }
  assert.equal(s.status, 'rebuy'); assert.equal(s.cash, 0); assert.equal(s.loan.principal, 300000);
  assert.equal(s.loan.interestDue, beforeInterest + 4500 - 100000);
  assert.equal(s.settlement.auction.proceeds, 100000);
  // Even synthetic surplus cash must not reopen credit-funded buying after settlement.
  s.cash = 1000000;
  const before = H.clone(s);
  assert.throws(() => H.buyHouse(s, 'studio'), /清偿贷款/);
  assert.deepEqual(s, before);
});
test('严格字段、拍卖条件、价格、购房边界及偿债金额篡改均拒绝', () => {
  const e = fixture('flat'); cash(e, 0); must(e, 'end');
  for (const change of [s => delete s.settlement, s => s.settlement.extra = 0,
    s => s.settlement.cashBefore++, s => s.settlement.principalBefore++, s => s.settlement.interestAfterAccrual++,
    s => s.settlement.purchaseCount++, s => s.settlement.auction.proceeds++, s => s.settlement.auction.houseId = 'studio',
    s => s.settlement.auction.extra = 0, s => s.settlement.auction = null, s => s.status = 'playing',
    s => s.result = {}, s => s.settlement.interestAfterAccrual = 0]) tamper(e, change);
  const fresh = new H.Engine().snapshot(); fresh.settlement = e.snapshot().settlement; assert.throws(() => H.validate(fresh));
  must(e, 'house', 'studio'); tamper(e, s => s.status = 'rebuy'); tamper(e, s => s.purchases.at(-1).week = 51);
});
test('结算入口不可提前或重复执行，未结算存档不能虚增计息周数', () => {
  const fresh = new H.Engine().snapshot(); assert.throws(() => H.settleDebt(fresh));
  const e = fixture('flat', true); cash(e, 0); must(e, 'end');
  const settled = e.snapshot(); assert.throws(() => H.settleDebt(settled)); assert.deepEqual(settled, e.snapshot());
  const bad = new H.Engine().snapshot(); bad.loan.principal = 100000; bad.stats.loanDrawn = 100000;
  bad.cash += 100000; bad.loan.interestDue = 1500; bad.stats.loanInterestAccrued = 1500; H.record(bad);
  assert.throws(() => H.validate(bad), /周数上限/);
});
test('v11不迁移、可导出原文，v12保存/删除不改旧键', () => {
  const map = new Map([['homeyear.save.v11', '{original-v11}']]);
  const a = new H.SaveAdapter({getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: k => map.delete(k)});
  const initial = a.load(); assert.equal(initial.oldPresent, true); assert.equal(initial.notice, H.oldSaveNotice);
  assert.equal(a.oldRaw(), '{original-v11}'); assert.equal(a.isQuarantined(), false);
  const e = new H.Engine(); const old = e.snapshot(); old.version = 11; old.rulesVersion = '0.12'; delete old.settlement;
  const raw = JSON.stringify(old), before = e.snapshot();
  for (const r of [a.parse(raw), a.import(raw,e), a.stageOld(raw), a.migrate(raw)]) { assert.equal(r.ok, false); assert.equal(r.error, H.oldSaveNotice); }
  assert.deepEqual(e.snapshot(), before); assert.equal(a.save(before).ok, true); assert.equal(a.key, 'homeyear.save.v12');
  assert.equal(a.remove().ok, true); assert.equal(a.oldRaw(), '{original-v11}'); assert.equal(map.size, 1);
});
console.log(passed + ' passed, 0 failed');
