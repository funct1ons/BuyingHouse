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
  H.SaveAdapter = function (storage) {
    const key = 'homeyear.save.v3', legacyKey = 'homeyear.save.v2', v1Key = 'homeyear.save.v1', settingsKey = 'homeyear.settings.v1';
    let quarantined = false, damagedRaw = null;
    this.key = key;
    this.legacyKey = legacyKey;
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
    this.load = () => {
      let raw = null;
      try {
        const store = getStorage();
        raw = store.getItem(key);
        const legacyRaw = store.getItem(legacyKey);
        const legacy = legacyRaw === null ? null : this.parseLegacy(legacyRaw);
        if (raw === null) {
          if (store.getItem(v1Key) !== null) throw Error('发现旧版存档：不支持自动迁移，请保留原档');
          return {ok: true, state: null, legacy};
        }
        const parsed = this.parse(raw);
        if (!parsed.ok) throw Error(parsed.error);
        quarantined = false; damagedRaw = null;
        return {...parsed, legacy};
      } catch (e) {
        quarantined = true; damagedRaw = raw;
        let legacy = null;
        try {
          const legacyRaw = getStorage().getItem(legacyKey);
          if (legacyRaw !== null) legacy = this.parseLegacy(legacyRaw);
        } catch (ignore) {}
        return {...failure(e), raw, legacy};
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
    this.stageLegacy = raw => {
      try {
        const store = getStorage();
        let beforeLegacy;
        try { beforeLegacy = store.getItem(legacyKey); }
        catch (e) { return failure(e); }
        const parsed = this.parseLegacy(raw);
        if (!parsed.ok) return parsed;
        let backupKey;
        try { backupKey = writeBackup(store, raw); }
        catch (e) { return failure(e); }
        let afterLegacy;
        try { afterLegacy = store.getItem(legacyKey); }
        catch (e) { return failure(e); }
        if (afterLegacy !== beforeLegacy) return failure(Error('旧档原键被意外改写'));
        if (store.getItem(backupKey) !== raw) return failure(Error('备份回读不一致'));
        const converted = H.migrateV2(parsed.state, backupKey);
        return {ok: true, state: H.clone(converted), backup: backupKey};
      } catch (e) { return failure(e); }
    };
    this.save = (state, options = {}) => {
      try {
        H.validate(state);
        if (quarantined && options.replaceDamaged !== true) throw Error('原存档已隔离，请先导出原文，再明确覆盖或删除');
        getStorage().setItem(key, JSON.stringify(state));
        quarantined = false; damagedRaw = null;
        return {ok: true};
      } catch (e) { return failure(e); }
    };
    this.migrate = (raw, options = {}) => {
      try {
        if (quarantined && options.replaceDamaged !== true) return failure(Error('原存档已隔离，请先导出原文，再明确覆盖或删除'));
        const staged = this.stageLegacy(raw);
        if (!staged.ok) return staged;
        const store = getStorage();
        const beforeLegacy = store.getItem(legacyKey);
        const encoded = JSON.stringify(staged.state);
        store.setItem(key, encoded);
        if (store.getItem(key) !== encoded) throw Error('新档回读不一致');
        if (store.getItem(legacyKey) !== beforeLegacy) throw Error('旧档原键被意外改写');
        if (store.getItem(staged.backup) !== raw) throw Error('备份回读不一致');
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
      const parsed = this.parse(raw);
      if (!parsed.ok) return parsed;
      try { engine.restore(parsed.state); return {ok: true}; } catch (e) { return failure(e); }
    };
    this.damaged = () => damagedRaw;
    this.isQuarantined = () => quarantined;
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
