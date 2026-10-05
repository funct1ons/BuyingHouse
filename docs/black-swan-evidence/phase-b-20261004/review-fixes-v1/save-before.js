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
    const key = 'homeyear.save.v4', v3Key = 'homeyear.save.v3', legacyKey = 'homeyear.save.v2', v1Key = 'homeyear.save.v1', settingsKey = 'homeyear.settings.v1';
    let quarantined = false, damagedRaw = null;
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
        // A valid current save is authoritative even when an unrelated old-key read fails.
        const readOld = (oldKey, parse) => {
          try { const text = store.getItem(oldKey); return text === null ? null : parse(text); }
          catch (e) { return failure(e); }
        };
        const oldV3 = readOld(v3Key, this.parseV3);
        const legacy = readOld(legacyKey, this.parseLegacy);
        if (raw === null) {
          if (store.getItem(v1Key) !== null) throw Error('发现旧版存档：不支持自动迁移，请保留原档');
          quarantined = false; damagedRaw = null;
          return {ok: true, state: null, legacy, oldV3};
        }
        const parsed = this.parse(raw);
        if (!parsed.ok) throw Error(parsed.error);
        quarantined = false; damagedRaw = null;
        return {...parsed, legacy, oldV3};
      } catch (e) {
        quarantined = true; damagedRaw = raw;
        let legacy = null;
        try {
          const legacyRaw = getStorage().getItem(legacyKey);
          if (legacyRaw !== null) legacy = this.parseLegacy(legacyRaw);
        } catch (ignore) {}
        let oldV3 = null;
        try { const oldRaw = getStorage().getItem(v3Key); if (oldRaw !== null) oldV3 = this.parseV3(oldRaw); } catch (ignore) {}
        return {...failure(e), raw, legacy, oldV3};
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
      const read = this.readKey(v3Key);
      return read.ok && read.raw !== null ? read.raw : this.legacyRaw();
    };
    const stage = (raw, version) => {
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
        parsed = version === 2 || version === 3 ? this.stageOld(raw) : this.parse(raw);
      } catch (e) { return failure(e); }
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
