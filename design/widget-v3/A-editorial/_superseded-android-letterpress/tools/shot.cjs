// usage: node tools/shot.cjs <url-query> <out.png> [scale] [t] [selector]
const { chromium } = require('/workspace/inertia/node_modules/playwright');
(async()=>{
  const [,,query,out,scale='3',t='20000',sel]=process.argv;
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:1300,height:1000},deviceScaleFactor:+scale});
  p.on('console',m=>console.log('console:',m.text())); p.on('pageerror',e=>console.log('ERR',e.message));
  await p.goto('file:///workspace/inertia/design/widget-v3/A-editorial/_superseded-android-letterpress/index.html?'+query); await p.evaluate(()=>window.__ready);
  await p.waitForTimeout(300);
  await p.evaluate(t=>window.__setT(+t),t);
  const el = sel? await p.$(sel) : null;
  if(el) await el.screenshot({path:out}); else await p.screenshot({path:out,fullPage:true});
  await b.close();
})();
