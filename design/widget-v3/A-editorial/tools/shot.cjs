// node tools/shot.cjs "<query>" out.png [scale] [t] [selector]
const { chromium } = require('/workspace/inertia/node_modules/playwright');
const BASE='file://'+require('path').resolve(__dirname,'..','index.html');
(async()=>{ const [,,query,out,scale='3',t='21000',sel]=process.argv;
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000},deviceScaleFactor:+scale});
  p.on('pageerror',e=>console.log('ERR',e.message)); p.on('console',m=>{if(m.type()==='error')console.log('console',m.text())});
  await p.goto(BASE+'?'+query); await p.evaluate(()=>window.__ready); await p.waitForTimeout(250); await p.evaluate(t=>window.__setT(+t),t);
  const el=sel?await p.$(sel):null; if(el) await el.screenshot({path:out}); else await p.screenshot({path:out,fullPage:true}); await b.close(); })();
