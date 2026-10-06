(function (H, g) {
  'use strict';
  H.contentId = function (text) {
    let a = 2166136261, b = 2166136261 ^ 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      a = Math.imul(a ^ c, 16777619);
      b = Math.imul(b ^ (c + i), 16777619);
    }
    return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
  };
  function milestoneId(entry) {
    return H.contentId(entry.seed + '\0' + entry.difficulty + '\0' + entry.calendarStartWeek + '\0' + entry.week + '\0' + entry.houseId + '\0' + entry.price + '\0' + entry.paid);
  }
  H.validateMilestones = function (value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('里程碑无效');
    const actual = Object.keys(value);
    if (actual.length !== 2 || !Object.prototype.hasOwnProperty.call(value, 'version') || !Object.prototype.hasOwnProperty.call(value, 'entries')) throw Error('里程碑无效');
    if (value.version !== 1 || !Array.isArray(value.entries) || value.entries.length > 1000) throw Error('里程碑无效');
    const ids = new Set();
    for (const entry of value.entries) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw Error('里程碑无效');
      const fields = ['houseId', 'week', 'difficulty', 'seed', 'calendarStartWeek', 'price', 'paid'];
      if (Object.keys(entry).length !== fields.length || fields.some(k => !Object.prototype.hasOwnProperty.call(entry, k))) throw Error('里程碑无效');
      if (!H.houses.some(h => h.id === entry.houseId) || !Object.prototype.hasOwnProperty.call(H.difficulties, entry.difficulty)) throw Error('里程碑无效');
      if (typeof entry.seed !== 'string' || !entry.seed.length || entry.seed.length > 128) throw Error('里程碑无效');
      H.int(entry.week, 1, 52);
      H.int(entry.calendarStartWeek, 1, 52);
      if (entry.calendarStartWeek !== H.calendarStart(entry.seed)) throw Error('里程碑无效');
      H.int(entry.price, 1);
      H.int(entry.paid, 1);
      if (entry.paid > entry.price) throw Error('里程碑无效');
      const id = milestoneId(entry);
      if (ids.has(id)) throw Error('里程碑无效');
      ids.add(id);
    }
    return true;
  };
  H.milestoneBadges = function (entries) {
    if (!Array.isArray(entries)) throw Error('里程碑无效');
    const seen = new Set(entries.map(e => e && e.houseId));
    const groups = new Map();
    for (const e of entries) {
      const key = e.seed + '\0' + e.difficulty + '\0' + e.calendarStartWeek;
      groups.set(key, (groups.get(key) || 0) + 1);
    }
    let climb = false;
    for (const n of groups.values()) if (n >= 3) climb = true;
    const row = (id, name, earned) => ({id, name, earned: !!earned});
    return [
      row('first-key', '第一次拿到钥匙', entries.length >= 1),
      row('count-5', '五次拿到钥匙', entries.length >= 5),
      row('count-10', '十次拿到钥匙', entries.length >= 10),
      row('city-five', '旧城五档都出现过', ['studio', 'flat', 'two', 'city', 'dream'].every(id => seen.has(id))),
      row('first-townhouse', '第一次市中心小洋楼', seen.has('townhouse')),
      row('first-courtyard', '第一次首都四合院', seen.has('courtyard')),
      row('first-island', '第一次独立海岛', seen.has('island')),
      row('first-mars', '第一次火星定居舱', seen.has('mars')),
      row('climb-3', '同一局至少三套', climb)
    ];
  };
  H.SaveAdapter = function (storage) {
    const key = 'homeyear.save.v11', v10Key = 'homeyear.save.v10', v9Key = 'homeyear.save.v9', v8Key = 'homeyear.save.v8', v7Key = 'homeyear.save.v7', v6Key = 'homeyear.save.v6', v5Key = 'homeyear.save.v5', v4Key = 'homeyear.save.v4', v3Key = 'homeyear.save.v3', legacyKey = 'homeyear.save.v2', v1Key = 'homeyear.save.v1', settingsKey = 'homeyear.settings.v1', milestoneKey = 'homeyear.milestones.v1';
    const oldKeys = [v10Key, v9Key, v8Key, v7Key, v6Key, v5Key, v4Key, v3Key, legacyKey, v1Key];
    let quarantined = false, damagedRaw = null, milestoneQuarantined = false, milestoneDamaged = null;
    this.key = key;
    this.legacyKey = legacyKey;
    this.v3Key = v3Key;
    this.settingsKey = settingsKey;
    function getStorage() {
      if (storage) return storage;
      return g.localStorage;
    }
    function failure(error, recoverable = true) { return {ok: false, error: error.message || String(error), recoverable}; }
    function writeBackup(store, raw) {
      const base = 'homeyear.save.backup.' + H.contentId(raw);
      for (let n = 0; n < 1000; n++) {
        const backupKey = n === 0 ? base : base + '.' + n;
        const existing = store.getItem(backupKey);
        if (existing !== null && existing !== raw) continue;
        store.setItem(backupKey, raw);
        if (store.getItem(backupKey) !== raw) throw Error('备份回读不一致');
        return backupKey;
      }
      throw Error('备份键耗尽');
    }
    this.parse = raw => {
      try {
        if (typeof raw !== 'string' || raw.length > 2000000) throw Error('存档文本为空或过大');
        const value = JSON.parse(raw);
        if (value && [1,2,3,4,5,6,7,8,9,10].includes(value.version)) throw Error(H.oldSaveNotice);
        H.validate(value);
        return {ok: true, state: H.clone(value)};
      } catch (e) { return failure(e); }
    };
    this.parseLegacy = raw => {
      try {
        if (typeof raw !== 'string' || !raw.length) throw Error('旧档文本为空');
        const value = JSON.parse(raw);
        if (!H.v2) throw Error('旧档校验不可用');
        H.v2.validate(value);
        return {ok: true, state: H.clone(value)};
      } catch (e) { return failure(e); }
    };
    this.parseV3 = raw => {
      try {
        if (typeof raw !== 'string' || !raw.length || raw.length > 2000000) throw Error('旧 v3 文本为空或过大');
        const value = JSON.parse(raw);
        if (!H.v3) throw Error('冻结 v3 校验不可用');
        H.v3.validate(value);
        return {ok: true, state: H.clone(value)};
      } catch (e) { return failure(e); }
    };
    this.load = () => {
      let raw = null;
      try {
        const store = getStorage();
        raw = store.getItem(key);
        if (raw === null) {
          let oldPresent = false;
          for (const oldKey of oldKeys) {
            if (store.getItem(oldKey) !== null) oldPresent = true;
          }
          quarantined = false; damagedRaw = null;
          return {ok:true, state:null, oldPresent, notice:oldPresent ? H.oldSaveNotice : null};
        }
        const parsed = this.parse(raw);
        if (!parsed.ok) throw Error(parsed.error);
        quarantined = false; damagedRaw = null;
        return parsed;
      } catch (e) {
        quarantined = true; damagedRaw = raw;
        return {...failure(e), raw};
      }
    };
    this.readKey = storageKey => {
      try {
        const store = getStorage();
        try { return {ok: true, raw: store.getItem(storageKey)}; }
        catch (e) { return failure(e); }
      } catch (e) { return failure(e); }
    };
    this.legacyRaw = () => {
      const read = this.readKey(legacyKey);
      return read.ok ? read.raw : null;
    };
    this.oldRaw = () => {
      for (const oldKey of oldKeys) {
        const read = this.readKey(oldKey);
        if (read.ok && read.raw !== null) return read.raw;
      }
      return null;
    };
    // Historical conversion implementation retained, explicitly disabled for 0.6.
    const stage = (raw, version) => {
      return failure(Error(H.oldSaveNotice));
      try {
        const store = getStorage();
        let beforeLegacy, beforeV3;
        try { beforeLegacy = store.getItem(legacyKey); beforeV3 = store.getItem(v3Key); }
        catch (e) { return failure(e); }
        const parsed = version === 3 ? this.parseV3(raw) : this.parseLegacy(raw);
        if (!parsed.ok) return parsed;
        let backupKey;
        try { backupKey = writeBackup(store, raw); }
        catch (e) { return failure(e); }
        let afterLegacy;
        try { afterLegacy = store.getItem(legacyKey); }
        catch (e) { return failure(e); }
        if (afterLegacy !== beforeLegacy || store.getItem(v3Key) !== beforeV3) return failure(Error('旧档原键被意外改写'));
        if (store.getItem(backupKey) !== raw) return failure(Error('备份回读不一致'));
        const converted = version === 3 ? H.migrateV3(parsed.state, backupKey) : H.migrateV2(parsed.state, backupKey);
        return {ok: true, state: H.clone(converted), backup: backupKey};
      } catch (e) { return failure(e); }
    };
    this.stageLegacy = raw => stage(raw, 2);
    this.stageV3 = raw => stage(raw, 3);
    this.stageOld = raw => {
      try { return JSON.parse(raw).version === 3 ? this.stageV3(raw) : this.stageLegacy(raw); }
      catch (e) { return failure(e); }
    };
    function writeCurrent(store, encoded) {
      const before = store.getItem(key);
      try {
        store.setItem(key, encoded);
        if (store.getItem(key) !== encoded) throw Error('新档回读不一致');
      } catch (e) {
        try { if (before === null) store.removeItem(key); else store.setItem(key, before); } catch (ignore) {}
        throw e;
      }
    }
    this.save = (state, options = {}) => {
      try {
        H.validate(state);
        if (quarantined && options.replaceDamaged !== true) throw Error('原存档已隔离，请先导出原文，再明确覆盖或删除');
        writeCurrent(getStorage(), JSON.stringify(state));
        quarantined = false; damagedRaw = null;
        return {ok: true};
      } catch (e) { return failure(e); }
    };
    this.migrate = (raw, options = {}) => {
      try {
        if (quarantined && options.replaceDamaged !== true) return failure(Error('原存档已隔离，请先导出原文，再明确覆盖或删除'));
        const staged = this.stageOld(raw);
        if (!staged.ok) return staged;
        const store = getStorage();
        const beforeLegacy = store.getItem(legacyKey), beforeV3 = store.getItem(v3Key), beforeCurrent = store.getItem(key);
        const encoded = JSON.stringify(staged.state);
        if (store.getItem(staged.backup) !== raw) throw Error('备份回读不一致');
        try {
          writeCurrent(store, encoded);
          if (store.getItem(v3Key) !== beforeV3) throw Error('旧 v3 原键被意外改写');
          if (store.getItem(legacyKey) !== beforeLegacy) throw Error('旧档原键被意外改写');
          if (store.getItem(staged.backup) !== raw) throw Error('备份回读不一致');
        } catch (e) {
          try { if (beforeCurrent === null) store.removeItem(key); else store.setItem(key, beforeCurrent); } catch (ignore) {}
          throw e;
        }
        quarantined = false; damagedRaw = null;
        return {ok: true, state: staged.state, backup: staged.backup};
      } catch (e) { return failure(e); }
    };
    this.remove = () => {
      try {
        getStorage().removeItem(key);
        quarantined = false; damagedRaw = null;
        return {ok: true};
      } catch (e) { return failure(e); }
    };
    this.removeLegacy = () => {
      try { getStorage().removeItem(legacyKey); return {ok: true}; }
      catch (e) { return failure(e); }
    };
    this.export = state => { H.validate(state); return JSON.stringify(state, null, 2); };
    this.exportRaw = storageKey => {
      const read = this.readKey(storageKey);
      if (!read.ok) throw Error(read.error);
      if (typeof read.raw !== 'string') throw Error('没有可导出的原文');
      return read.raw;
    };
    this.import = (raw, engine) => {
      let parsed;
      try {
        const version = JSON.parse(raw).version;
        parsed = this.parse(raw);
      } catch (e) { return failure(e); }
      if (!parsed.ok) return parsed;
      try { engine.restore(parsed.state); return {ok: true}; } catch (e) { return failure(e); }
    };
    this.damaged = () => damagedRaw;
    this.isQuarantined = () => quarantined;
    function entriesFrom(state) {
      if (!state || !Array.isArray(state.purchases)) throw Error('购房记录无效');
      return state.purchases.map(p => ({houseId: p.houseId, week: p.week, difficulty: state.difficulty, seed: state.seed, calendarStartWeek: H.calendarStart(state.seed), price: p.price, paid: p.paid}));
    }
    function dedupe(list) {
      const out = [], seen = new Set();
      for (const entry of list) {
        const id = milestoneId(entry);
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(entry);
      }
      return out;
    }
    this.loadMilestones = () => {
      let raw = null;
      try {
        const store = getStorage();
        raw = store.getItem(milestoneKey);
        if (raw === null) {
          milestoneQuarantined = false; milestoneDamaged = null;
          return {ok: true, milestones: {version: 1, entries: []}};
        }
        const value = JSON.parse(raw);
        H.validateMilestones(value);
        milestoneQuarantined = false; milestoneDamaged = null;
        return {ok: true, milestones: H.clone(value)};
      } catch (e) {
        milestoneQuarantined = true; milestoneDamaged = raw;
        return {...failure(e), raw};
      }
    };
    this.mergeMilestones = (state, options = {}) => {
      try {
        const incoming = entriesFrom(state);
        const current = this.loadMilestones();
        if (!current.ok && options.replaceDamaged !== true) throw Error(current.error);
        const entries = dedupe((current.ok ? current.milestones.entries : []).concat(incoming));
        const doc = {version: 1, entries};
        H.validateMilestones(doc);
        const encoded = JSON.stringify(doc);
        const store = getStorage();
        store.setItem(milestoneKey, encoded);
        if (store.getItem(milestoneKey) !== encoded) throw Error('里程碑回读不一致');
        milestoneQuarantined = false; milestoneDamaged = null;
        return {ok: true, milestones: H.clone(doc)};
      } catch (e) { return failure(e); }
    };
    this.damagedMilestones = () => milestoneDamaged;
    this.isMilestoneQuarantined = () => milestoneQuarantined;
    this.loadSettings = () => {
      try {
        const raw = getStorage().getItem(settingsKey);
        if (raw === null) return {ok: true, settings: H.clone(H.defaultSettings)};
        const value = JSON.parse(raw); H.validateSettings(value);
        return {ok: true, settings: value};
      } catch (e) { return {...failure(e), settings: H.clone(H.defaultSettings)}; }
    };
    this.saveSettings = settings => {
      try { H.validateSettings(settings); getStorage().setItem(settingsKey, JSON.stringify(settings)); return {ok: true}; }
      catch (e) { return failure(e); }
    };
  };
})(window.HomeYear, window);
