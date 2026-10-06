'use strict';
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), assert = require('node:assert/strict');
const context = vm.createContext({console});
context.window = context;
const root = path.join(__dirname, '..');
for (const file of ['js/data.js', 'js/math.js', 'js/v2-baseline.js', 'js/v3-baseline.js', 'js/market.js', 'js/trading.js', 'js/statistics.js', 'js/validation.js', 'js/game.js', 'js/save.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
}
const H = context.HomeYear;
let seq = 0;
function dispatch(e, type, id, qty) {
  const r = e.dispatch({type, id, qty, revision: e.visible().revision, token: 'housing-' + (++seq)});
  assert.equal(r.ok, true, r.error);
  return r;
}
function fund(e, cash) {
  const s = e.snapshot();
  if (cash >= s.cash) s.stats.grants += cash - s.cash;
  else s.stats.expenses += s.cash - cash;
  s.cash = cash;
  H.record(s);
  e.restore(s);
}
function halfUp(base, week, shocks) {
  let num = BigInt(base) * (101n ** BigInt(week - 1));
  let den = 100n ** BigInt(week - 1);
  for (const entry of shocks) {
    if (entry.week > week) continue;
    const ev = H.housingEvents.find(item => item.id === entry.id);
    num *= BigInt(ev.numer);
    den *= BigInt(ev.denom);
  }
  return Number((num + den / 2n) / den);
}
const base = H.priceBooks['0.3'].standard.houses.studio;
const week1 = H.create('housing-week1', 'standard');
assert.equal(week1.priceBook.id, '0.3');
assert.equal(week1.priceBook.houses.studio, base);
assert.equal(H.houseAt(base, 1, []), base);
for (const [id, price] of Object.entries(H.priceBooks['0.3'].standard.houses)) {
  assert.equal(H.houseQuote(week1, id, 1), price);
}
assert.equal(H.houseAt(base, 52, []), halfUp(base, 52, []));
assert.equal(Object.keys(H.priceBooks['0.2'].standard.houses).length, 5);
assert.equal(H.priceBooks['0.2'].standard.houses.studio, 650000);
assert.equal(H.events.length, 45);
assert.equal(H.events.some(e => String(e.id).startsWith('housing_')), false);

const shock = [{id: 'housing_stimulus', week: 6}];
const applied = H.create('housing-apply', 'standard');
applied.week = 6;
applied.housingLog = shock.slice();
const warehouses = JSON.stringify(applied.priceBook.warehouses);
H.applyHousePrices(applied);
const once = applied.priceBook.houses.studio;
assert.equal(once, halfUp(base, 6, shock));
assert.notEqual(once, halfUp(base, 6, []));
H.applyHousePrices(applied);
assert.equal(applied.priceBook.houses.studio, once);
assert.equal(JSON.stringify(applied.priceBook.warehouses), warehouses);
applied.week = 11;
H.applyHousePrices(applied);
const later = applied.priceBook.houses.studio;
assert.equal(later, halfUp(base, 11, shock));
assert.notEqual(later, halfUp(base, 11, shock.concat(shock)));
const num6 = BigInt(base) * (101n ** 5n) * 108n;
const den6 = (100n ** 5n) * 100n;
const num11 = BigInt(base) * (101n ** 10n) * 108n;
const den11 = (100n ** 10n) * 100n;
assert.equal(num11 * den6 * (100n ** 5n), num6 * den11 * (101n ** 5n));

const buyer = new H.Engine('housing-buy', 'standard');
fund(buyer, 2000000);
dispatch(buyer, 'house', 'studio');
dispatch(buyer, 'next');
const bought = buyer.snapshot();
const cash = H.difficulties.standard.initialCash - bought.stats.bought + bought.stats.sold + bought.stats.grants - bought.stats.expenses - bought.houseBasis - bought.stats.warehouseSpent;
assert.equal(bought.cash, cash);
H.validate(bought);
assert.equal(bought.purchases.length, 1);
assert.equal(bought.houseBasis, bought.purchases[0].paid);

const climb = new H.Engine('housing-climb', 'standard');
while (climb.visible().week < 8) dispatch(climb, 'next');
fund(climb, 5000000);
dispatch(climb, 'house', 'studio');
const mid = climb.snapshot();
const due = mid.priceBook.houses.flat - mid.priceBook.houses.studio;
assert.notEqual(due, 350000);
const upgraded = climb.dispatch({type: 'house', id: 'flat', revision: climb.visible().revision, token: 'housing-up'});
assert.equal(upgraded.ok, true, upgraded.error);
const after = climb.snapshot();
assert.equal(after.cash, mid.cash - due);
assert.equal(after.purchases[1].paid, due);
assert.equal(after.purchases[1].price, mid.priceBook.houses.flat);
assert.equal(after.houseBasis, mid.priceBook.houses.flat);
const down = climb.dispatch({type: 'house', id: 'studio', revision: climb.visible().revision, token: 'housing-down'});
assert.equal(down.ok, false);
assert.equal(climb.snapshot().house, 'flat');
const same = climb.dispatch({type: 'house', id: 'flat', revision: climb.visible().revision, token: 'housing-same'});
assert.equal(same.ok, false);

const map = new Map();
const store = {getItem: k => map.has(k) ? map.get(k) : null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k)};
const saves = new H.SaveAdapter(store);
const old = climb.snapshot();
old.version = 6;
const oldRaw = JSON.stringify(old);
map.set('homeyear.save.v6', oldRaw);
const noticed = saves.load();
assert.equal(noticed.ok, true);
assert.equal(noticed.state, null);
assert.equal(noticed.notice, H.oldSaveNotice);
assert.equal(map.get('homeyear.save.v6'), oldRaw);
assert.equal(saves.import(oldRaw, climb).ok, false);
assert.equal(map.get('homeyear.save.v6'), oldRaw);
assert.equal(climb.snapshot().house, 'flat');
map.set(saves.key, oldRaw);
assert.equal(saves.load().ok, false);
assert.equal(map.get(saves.key), oldRaw);
assert.equal(map.get('homeyear.save.v6'), oldRaw);

const fresh = new H.Engine('housing-mile', 'standard');
fund(fresh, 2000000);
dispatch(fresh, 'house', 'studio');
map.delete(saves.key);
const mile = new H.SaveAdapter(store);
assert.equal(mile.mergeMilestones(fresh.snapshot()).ok, true);
const first = mile.loadMilestones();
assert.equal(first.ok, true);
assert.equal(first.milestones.entries.length, 1);
assert.equal(mile.mergeMilestones(fresh.snapshot()).ok, true);
assert.equal(mile.loadMilestones().milestones.entries.length, 1);
const kept = map.get('homeyear.milestones.v1');
assert.equal(mile.save(fresh.snapshot()).ok, true);
assert.equal(mile.remove().ok, true);
assert.equal(map.get('homeyear.milestones.v1'), kept);
assert.equal(mile.save(fresh.snapshot()).ok, true);
assert.equal(map.get('homeyear.milestones.v1'), kept);
const badges = H.milestoneBadges(mile.loadMilestones().milestones.entries);
assert.equal(badges.find(b => b.id === 'first-key').earned, true);
assert.equal(badges.find(b => b.id === 'count-5').earned, false);

map.set('homeyear.milestones.v1', '{');
const broken = new H.SaveAdapter(store);
assert.equal(broken.loadMilestones().ok, false);
assert.equal(broken.isMilestoneQuarantined(), true);
assert.equal(broken.mergeMilestones(fresh.snapshot()).ok, false);
assert.equal(map.get('homeyear.milestones.v1'), '{');
assert.equal(broken.save(fresh.snapshot()).ok, true);
assert.equal(map.get('homeyear.milestones.v1'), '{');
assert.equal(broken.mergeMilestones(fresh.snapshot(), {replaceDamaged: true}).ok, true);
const replaced = broken.loadMilestones();
assert.equal(replaced.ok, true);
assert.equal(replaced.milestones.entries.length, 1);
assert.equal(replaced.milestones.entries[0].houseId, 'studio');
assert.equal(broken.isMilestoneQuarantined(), false);
console.log('housing-milestone passed');
