(function (H,g) {
  'use strict';
  H.SaveAdapter = function (storage) {
    const key='homeyear.save.v2', settingsKey='homeyear.settings.v1';
    let quarantined=false, damagedRaw=null;
    this.key=key;
    this.settingsKey=settingsKey;
    function getStorage() {
      if (storage) return storage;
      // Access itself can throw (privacy/file:// restrictions).
      return g.localStorage;
    }
    function failure(error,recoverable=true) {return {ok:false,error:error.message,recoverable};}
    this.parse = raw => {
      try {
        if (typeof raw!=='string' || raw.length>2000000) throw Error('存档文本为空或过大');
        const value=JSON.parse(raw);
        H.validate(value);
        return {ok:true,state:H.clone(value)};
      } catch (e) {return failure(e);}
    };
    this.load = () => {
      let raw=null;
      try {
        const store=getStorage();
        raw=store.getItem(key);
        // The phase-1 API could export v1, but did not persist. Explicitly reject
        // any externally stored legacy save; never silently overwrite it.
        if (raw===null) {
          const old=store.getItem('homeyear.save.v1');
          if (old!==null) {raw=old;throw Error('发现旧版存档：不支持自动迁移，请保留原档');}
          return {ok:true,state:null};
        }
        const parsed=this.parse(raw);
        if (!parsed.ok) throw Error(parsed.error);
        quarantined=false; damagedRaw=null;
        return parsed;
      } catch (e) {
        quarantined=true; damagedRaw=raw;
        return {...failure(e),raw};
      }
    };
    this.save = (state,options={}) => {
      try {
        H.validate(state);
        if (quarantined && !options.replaceDamaged) throw Error('原存档已隔离，请先导出原文，再明确覆盖或删除');
        getStorage().setItem(key,JSON.stringify(state));
        quarantined=false; damagedRaw=null;
        return {ok:true};
      } catch (e) {return failure(e);}
    };
    this.remove = () => {
      try {
        const store=getStorage(); store.removeItem(key); store.removeItem('homeyear.save.v1');
        quarantined=false; damagedRaw=null;
        return {ok:true};
      } catch (e) {return failure(e);}
    };
    this.export = state => {H.validate(state);return JSON.stringify(state,null,2);};
    this.import = (raw,engine) => {
      const parsed=this.parse(raw);
      if (!parsed.ok) return parsed;
      try {engine.restore(parsed.state);return {ok:true};} catch (e) {return failure(e);}
    };
    this.damaged = () => damagedRaw;
    this.isQuarantined = () => quarantined;
    this.loadSettings = () => {
      try {
        const raw=getStorage().getItem(settingsKey);
        if (raw===null) return {ok:true,settings:H.clone(H.defaultSettings)};
        const value=JSON.parse(raw); H.validateSettings(value);
        return {ok:true,settings:value};
      } catch (e) {return {...failure(e),settings:H.clone(H.defaultSettings)};}
    };
    this.saveSettings = settings => {
      try {H.validateSettings(settings);getStorage().setItem(settingsKey,JSON.stringify(settings));return {ok:true};}
      catch (e) {return failure(e);}
    };
  };
})(window.HomeYear,window);
