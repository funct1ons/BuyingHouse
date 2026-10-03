'use strict';
// Development comparison: the same 1366×768 market at several paper-grain strengths (?grain=), crops saved for review.
const {launchEdge,delay}=require('./cdp-helper.cjs');const fs=require('node:fs/promises'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{let e;const out=path.resolve(__dirname,'../docs/av-visual-evidence/grain');await fs.mkdir(out,{recursive:true});try{e=await launchEdge();const c=e.cdp;await c.send('Page.enable');await c.send('Runtime.enable');await c.send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
for(const g of (process.argv[2]||'1,0.3,0.2,0').split(',')){await c.send('Page.navigate',{url:pathToFileURL(path.resolve(__dirname,'../index.html')).href+'?grain='+g});await delay(700);
 await c.evaluate('localStorage.clear()');await c.send('Page.reload');await delay(700);await c.evaluate(`(()=>{document.querySelector('#seed').value='AV-GRAIN';document.querySelector('[data-testid=new-game]').click()})()`);await delay(300);await c.evaluate(`(()=>{const t=document.querySelector('[data-action=tour-finish]');if(t)t.click()})()`);await delay(300);
 for(const [name,clip] of [['full',null],['zoom',{x:240,y:90,width:480,height:330,scale:2}]]){const s=await c.send('Page.captureScreenshot',{format:'png',...(clip?{clip}:{})});await fs.writeFile(path.join(out,`market-1366-grain-${g}-${name}.png`),Buffer.from(s.data,'base64'));}
 console.log('grain',g);}
}finally{if(e)await e.cleanup();}})().catch(x=>{console.error(x);process.exitCode=1;});
