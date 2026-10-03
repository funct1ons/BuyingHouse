'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {pathToFileURL,fileURLToPath}=require('node:url');
const {launchEdge,delay}=require('./cdp-helper.cjs');
function args(){const out={};for(let i=2;i<process.argv.length;i++){const key=process.argv[i];if(!key.startsWith('--')||!process.argv[i+1])throw Error(`Expected --option value: ${key}`);out[key.slice(2)]=process.argv[++i];}return out;}
async function main(){
 const opts=args(),root=path.resolve(opts.root||path.join(__dirname,'..'));
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 const output=path.resolve(opts.output||path.join(root,'docs',`browser-evidence-${stamp}`));await fs.mkdir(output,{recursive:true});
 const width=Number(opts.width||1280),height=Number(opts.height||800);if(!Number.isInteger(width)||!Number.isInteger(height)||width<200||height<200)throw Error('Invalid viewport');
 const report={startedAt:new Date().toISOString(),command:[process.execPath,...process.argv.slice(1)],root,output,viewport:{width,height},phase:'stage-1 prototype; not a final acceptance gate',pages:[],unverified:['Final UI and multi-resolution layout','Save/load and complete playthrough','Persistent browser storage','External requests from browser internals (page Network events only)'],failures:[]};
 let edge;
 try{
  const index=await fs.readFile(path.join(root,'index.html'));report.version={indexSha256:crypto.createHash('sha256').update(index).digest('hex'),indexMtime:(await fs.stat(path.join(root,'index.html'))).mtime.toISOString(),git:'No git repository available at initial inspection; page loaded from live working tree'};
  edge=await launchEdge({executable:opts.edge,tempRoot:opts['temp-root'],startupTimeout:Number(opts['startup-timeout']||20000)});report.browser={...edge.version,pid:edge.pid,port:edge.port,executable:edge.executable,profile:edge.profile};
  const cdp=edge.cdp;let current;
  cdp.on('Runtime.exceptionThrown',p=>current&&current.runtimeExceptions.push(p));
  cdp.on('Runtime.consoleAPICalled',p=>current&&current.console.push(p));
  cdp.on('Log.entryAdded',p=>current&&current.log.push(p.entry));
  cdp.on('Network.requestWillBeSent',p=>{if(current&&/^https?:|^wss?:/i.test(p.request.url))current.externalRequests.push({url:p.request.url,method:p.request.method,type:p.type,initiator:p.initiator});});
  cdp.on('Network.loadingFailed',p=>current&&current.networkFailures.push(p));
  await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Log.enable');await cdp.send('Network.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  const pages=['index.html'];try{await fs.access(path.join(root,'tests','browser.html'));pages.push('tests/browser.html');}catch{report.unverified.push('tests/browser.html absent');}
  for(const file of pages){
   current={file,url:pathToFileURL(path.join(root,file)).href,console:[],runtimeExceptions:[],log:[],externalRequests:[],networkFailures:[]};report.pages.push(current);
   const navigation=await cdp.send('Page.navigate',{url:current.url});if(navigation.errorText)throw Error(navigation.errorText);
   let ready=false;const until=Date.now()+15000;while(Date.now()<until){try{ready=await cdp.evaluate(`location.href===${JSON.stringify(current.url)}&&document.readyState==='complete'`);}catch{}if(ready)break;await delay(100);}if(!ready)throw Error(`Page ready timeout: ${file}`);await delay(Number(opts.settle||1200));
   current.inspection=await cdp.evaluate(`(()=>{const d=document.documentElement,b=document.body,h=window.HomeYear;return {title:document.title,url:location.href,homeYear:{present:typeof h!=='undefined',type:typeof h,keys:h?Object.keys(h).sort():[]},viewport:{width:innerWidth,height:innerHeight},document:{width:d.scrollWidth,height:d.scrollHeight,clientWidth:d.clientWidth,clientHeight:d.clientHeight},horizontalOverflow:d.scrollWidth>innerWidth+1,verticalOverflow:d.scrollHeight>innerHeight+1,overflowElements:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left<-1)}).slice(0,30).map(e=>({tag:e.tagName,id:e.id,className:String(e.className)})),coreSuite:window.testResult||null,bodyText:(b?.innerText||'').slice(0,12000)}})()`);
   current.loadedFiles=[];for(const url of await cdp.evaluate(`([...document.scripts].map(s=>s.src).concat([...document.querySelectorAll('link[rel="stylesheet"]')].map(l=>l.href))).filter(Boolean)`)){if(!url.startsWith('file:'))continue;try{const local=fileURLToPath(url),bytes=await fs.readFile(local);current.loadedFiles.push({url,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),mtime:(await fs.stat(local)).mtime.toISOString()});}catch(e){current.loadedFiles.push({url,error:e.message});}}
   const screenshot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});current.screenshot=file.replace(/[^a-z0-9]/gi,'-')+'.png';await fs.writeFile(path.join(output,current.screenshot),Buffer.from(screenshot.data,'base64'));
   if(current.runtimeExceptions.length||current.console.some(e=>e.type==='error'))report.failures.push(`${file}: runtime/console errors`);
   if(current.inspection.horizontalOverflow)report.failures.push(`${file}: horizontal overflow`);
   if(file==='index.html'&&!current.inspection.homeYear.present)report.failures.push('index.html: window.HomeYear absent');
   if(file==='tests/browser.html'&&(!current.inspection.coreSuite||current.inspection.coreSuite.failed!==0))report.failures.push('Core suite absent or failed');
  }
 }catch(e){report.failures.push(e.stack||String(e));}
 finally{if(edge){report.browserStderr=edge.stderr;try{await edge.cleanup();report.cleanup='owned browser closed and temporary profile removed';}catch(e){report.cleanup=e.message;report.failures.push(e.message);}}report.finishedAt=new Date().toISOString();report.result=report.failures.length?'observed failures':'smoke observations passed (NOT final gate)';await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({output,result:report.result,failures:report.failures},null,2));if(report.failures.length)process.exitCode=1;}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
