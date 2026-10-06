'use strict';
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), assert = require('node:assert/strict');
const context = vm.createContext({console});
context.window = context;
for (const file of ['js/data.js', 'js/math.js', 'js/v2-baseline.js', 'js/v3-baseline.js', 'js/market.js', 'js/trading.js', 'js/statistics.js', 'js/street.js', 'js/validation.js', 'js/game.js', 'js/save.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, {filename: file});
}
const H = context.HomeYear;
let seq = 0;
function op(e, type, id, qty) {
  return e.dispatch({type, id, qty, revision: e.visible().revision, token: 'loan-lottery-' + (++seq)});
}
function fund(e, cash) {
  const s = e.snapshot();
  if (cash >= s.cash) s.stats.grants += cash - s.cash;
  else s.stats.expenses += s.cash - cash;
  s.cash = cash;
  H.record(s);
  e.restore(s);
}
function must(e, type, id, qty) {
  const r = op(e, type, id, qty);
  assert.equal(r.ok, true, r.error);
  return r;
}
function reject(e, type, id, message) {
  const before = e.snapshot();
  const r = op(e, type, id);
  assert.equal(r.ok, false);
  assert.equal(r.error, message);
  assert.deepEqual(Object.keys(r).sort(), ['error', 'ok']);
  assert.deepEqual(e.snapshot(), before);
}
function toWeek(e, week) {
  while (e.snapshot().week < week) must(e, 'next');
}
function assertFace(card) {
  assert.equal(card.cells.length, 9);
  const counts = new Map();
  for (const id of card.cells) counts.set(id, (counts.get(id) || 0) + 1);
  const triples = [...counts.entries()].filter(([, n]) => n >= 3);
  assert.equal(triples.length, 1);
  assert.equal(triples[0][1], 3);
  assert.equal(triples[0][0], card.symbolId);
  for (const [id, n] of counts) if (id !== card.symbolId) assert.ok(n <= 2, id + ' 出现 ' + n + ' 次');
  const row = H.lotteryRules.symbols.find(item => item.id === card.symbolId);
  assert.ok(row);
  assert.equal(card.prize, row.prize);
}
const tests = [];
function test(name, fn) { tests.push([name, fn]); }

test('新局校验、贷款为零、lottery 随机流按种子分开', () => {
  const seed = 'loan-fresh';
  const e = new H.Engine(seed);
  const s = e.snapshot();
  H.validate(s);
  assert.equal(JSON.stringify(s.loan), JSON.stringify({principal: 0, interestDue: 0}));
  assert.equal(s.rng.lottery, H.seed(seed + ':lottery'));
  assert.deepEqual(Object.keys(s.rng).sort(), ['events', 'housing', 'listing', 'lottery', 'market', 'visual']);
});

test('借入 1000 后不能再借，同周还清则利息为零且现金回到借入前', () => {
  const e = new H.Engine('loan-once');
  const cash = e.snapshot().cash;
  const borrowed = must(e, 'loan', '1000');
  assert.equal(borrowed.ok, true);
  const s = e.snapshot();
  assert.equal(s.cash, cash + 100000);
  assert.equal(s.loan.principal, 100000);
  assert.equal(s.loan.interestDue, 0);
  reject(e, 'loan', '1000', '请先还清当前贷款');
  must(e, 'repay', 'all');
  const done = e.snapshot();
  assert.equal(done.loan.interestDue, 0);
  assert.equal(done.stats.loanInterestAccrued, 0);
  assert.equal(done.cash, cash);
  assert.equal(H.loanOpen(done), false);
  assert.equal(e.visible().loan.open, false);
});

test('过一周后利息为 1500，先息后本再还 500 元', () => {
  const e = new H.Engine('loan-interest');
  must(e, 'loan', '1000');
  const open = e.snapshot();
  assert.equal(H.loanInterest(open), Math.ceil(open.loan.principal * 15 / 1000));
  assert.equal(H.loanInterest(open), 1500);
  must(e, 'next');
  const due = e.snapshot();
  assert.equal(due.week, 2);
  assert.equal(due.loan.interestDue, 1500);
  assert.equal(due.loan.principal, 100000);
  must(e, 'repay', '500');
  const paid = e.snapshot();
  assert.equal(paid.loan.interestDue, 0);
  assert.equal(due.loan.principal - paid.loan.principal, 48500);
  assert.equal(paid.loan.principal, 51500);
  must(e, 'repay', '500');
  const left = e.snapshot();
  assert.ok(left.loan.principal + left.loan.interestDue < 50000);
  reject(e, 'repay', '500', '欠款不足 500 元，请还清全部');
});

test('现金不够时还款整笔拒绝', () => {
  const e = new H.Engine('loan-short');
  must(e, 'loan', '1000');
  fund(e, 49999);
  assert.ok(e.snapshot().loan.principal + e.snapshot().loan.interestDue >= 50000);
  reject(e, 'repay', '500', '还款资金不足');
});

test('有贷款不能买房，还清且现金够房款后可以买', () => {
  const e = new H.Engine('loan-house');
  must(e, 'loan', '1000');
  reject(e, 'house', 'studio', '售楼处暂停接待，请先还清信用社贷款');
  const s = e.snapshot();
  const price = H.housePrice(s, H.houses.find(h => h.id === 'studio'));
  fund(e, price + s.loan.principal + s.loan.interestDue);
  must(e, 'repay', 'all');
  assert.equal(H.loanOpen(e.snapshot()), false);
  must(e, 'house', 'studio');
  assert.equal(e.snapshot().house, 'studio');
  H.validate(e.snapshot());
});

test('第 52 周仍持有本金时结束再计一周利息；同周借还则利息为零', () => {
  const held = new H.Engine('loan-year');
  must(held, 'loan', '1000');
  toWeek(held, 52);
  assert.equal(held.snapshot().week, 52);
  assert.equal(held.snapshot().loan.principal, 100000);
  const before = held.snapshot();
  const weekly = H.loanInterest(before);
  assert.equal(weekly, 1500);
  must(held, 'end');
  const after = held.snapshot();
  assert.equal(after.status, 'ended');
  assert.equal(after.loan.interestDue, before.loan.interestDue + weekly);
  assert.equal(after.stats.loanInterestAccrued, before.stats.loanInterestAccrued + weekly);
  assert.equal(after.loan.principal, 100000);

  const cleared = new H.Engine('loan-year-clear');
  toWeek(cleared, 52);
  must(cleared, 'loan', '1000');
  must(cleared, 'repay', 'all');
  assert.equal(cleared.snapshot().loan.interestDue, 0);
  assert.equal(cleared.snapshot().stats.loanInterestAccrued, 0);
  assert.equal(cleared.snapshot().stats.loanInterestPaid, 0);
  must(cleared, 'end');
  assert.equal(cleared.snapshot().loan.interestDue, 0);
  assert.equal(cleared.snapshot().stats.loanInterestAccrued, 0);
  assert.equal(cleared.snapshot().stats.loanInterestPaid, 0);
});

test('借、还、买彩票之后现金恒等式仍通过校验', () => {
  const e = new H.Engine('loan-identity');
  must(e, 'loan', '1000');
  must(e, 'next');
  must(e, 'repay', '500');
  must(e, 'lottery');
  must(e, 'lottery');
  H.validate(e.snapshot());
});

test('借入后的峰值上界包含借入的现金', () => {
  const e = new H.Engine('loan-peak');
  const initial = H.difficulty(e.snapshot()).initialCash;
  must(e, 'loan', '1000');
  const s = e.snapshot();
  assert.equal(s.cash, initial + 100000);
  assert.equal(H.assets(s), s.cash);
  assert.equal(s.stats.peak, H.assets(s));
  H.validate(s);
});

test('刮刮乐：现金不足拒绝，买成后支出、现金和 9 格牌面一致', () => {
  const poor = new H.Engine('lottery-poor');
  fund(poor, H.lotteryRules.price - 1);
  reject(poor, 'lottery', undefined, '现金不够一张刮刮乐');

  const e = new H.Engine('lottery-buy');
  const before = e.snapshot();
  const r = must(e, 'lottery');
  const after = e.snapshot();
  assert.equal(after.stats.lotteryCount, 1);
  assert.equal(after.stats.lotterySpent, after.stats.lotteryCount * 3000);
  assert.equal(after.cash - before.cash, -3000 + r.card.prize);
  assert.equal(r.card.cells.length, 9);
  assertFace(r.card);
});

test('空信封会在 80 张内出现，且 symbolId 为 empty', () => {
  const e = new H.Engine('lottery-empty');
  let card = null;
  for (let n = 1; n <= 80; n++) {
    const r = must(e, 'lottery');
    assertFace(r.card);
    assert.equal(e.snapshot().stats.lotterySpent, n * 3000);
    if (r.card.prize === 0) { card = r.card; break; }
  }
  assert.ok(card, '80 张内没有出现空信封');
  assert.equal(card.symbolId, 'empty');
  assert.equal(card.prize, 0);
});

test('同一种子同一串操作，两台引擎的牌面和现金一致', () => {
  function play(seed) {
    const e = new H.Engine(seed);
    const cards = [];
    cards.push(must(e, 'lottery').card);
    must(e, 'loan', '1000');
    cards.push(must(e, 'lottery').card);
    must(e, 'next');
    must(e, 'repay', '500');
    cards.push(must(e, 'lottery').card);
    return {cards, cash: e.snapshot().cash, state: e.snapshot()};
  }
  const a = play('lottery-pair');
  const b = play('lottery-pair');
  assert.deepEqual(a.cards, b.cards);
  assert.equal(a.cash, b.cash);
  assert.deepEqual(a.state, b.state);
});

test('买彩票只推进 lottery 随机流', () => {
  const e = new H.Engine('lottery-rng');
  const before = e.snapshot().rng;
  must(e, 'lottery');
  const after = e.snapshot().rng;
  for (const key of ['market', 'events', 'visual', 'listing', 'housing']) assert.equal(after[key], before[key], key);
  assert.notEqual(after.lottery, before.lottery);
});

test('同一周没有刮刮乐次数上限', () => {
  const e = new H.Engine('lottery-week');
  assert.ok(e.snapshot().cash >= 4 * 3000);
  for (let n = 0; n < 4; n++) {
    const r = must(e, 'lottery');
    assert.equal(r.card.cells.length, 9);
    assertFace(r.card);
  }
  const s = e.snapshot();
  assert.equal(s.week, 1);
  assert.equal(s.stats.lotteryCount, 4);
  assert.equal(s.stats.lotterySpent, 4 * 3000);
  H.validate(s);
});

test('存档键是 v10，v9 原文拒绝且不被覆盖', () => {
  const map = new Map();
  const store = {
    getItem: k => map.has(k) ? map.get(k) : null,
    setItem: (k, v) => map.set(k, v),
    removeItem: k => map.delete(k)
  };
  const saves = new H.SaveAdapter(store);
  assert.equal(saves.key, 'homeyear.save.v10');
  const e = new H.Engine('loan-save');
  const fresh = e.snapshot();
  const legacy = H.clone(fresh);
  legacy.version = 9;
  const raw = JSON.stringify(legacy);
  const original = 'v9-original-must-stay';
  map.set('homeyear.save.v9', original);
  const parsed = saves.parse(raw);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error, H.oldSaveNotice);
  const imported = saves.import(raw, e);
  assert.equal(imported.ok, false);
  assert.equal(imported.error, H.oldSaveNotice);
  assert.deepEqual(e.snapshot(), fresh);
  assert.equal(map.get('homeyear.save.v9'), original);
  assert.equal(map.has('homeyear.save.v10'), false);
  assert.equal(saves.save(fresh).ok, true);
  assert.equal(map.get('homeyear.save.v9'), original);
  assert.equal(typeof map.get('homeyear.save.v10'), 'string');
  map.delete(saves.key);
  const loaded = saves.load();
  assert.equal(loaded.notice, H.oldSaveNotice);
  assert.equal(loaded.state, null);
  assert.equal(map.get('homeyear.save.v9'), original);
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log('PASS ' + name);
  } catch (e) {
    failed++;
    console.log('FAIL ' + name + ': ' + e.message);
    console.log(e.stack);
  }
}
console.log((tests.length - failed) + ' passed, ' + failed + ' failed');
process.exitCode = failed ? 1 : 0;
