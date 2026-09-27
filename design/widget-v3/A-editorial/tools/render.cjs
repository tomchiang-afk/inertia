// Renders PNG deliverables at 3x: node tools/render.cjs
const { chromium } = require('/workspace/inertia/node_modules/playwright');
const path=require('path'), BASE='file://'+path.resolve(__dirname,'..','index.html'), OUT=path.resolve(__dirname,'..','renders');
(async()=>{
  const b=await chromium.launch();
  const open=async(q,vw=430,vh=932)=>{ const p=await b.newPage({viewport:{width:vw,height:vh},deviceScaleFactor:3}); p.on('pageerror',e=>console.log('ERR',e.message));
    await p.goto(BASE+'?capture&'+q); await p.evaluate(()=>window.__ready); await p.waitForTimeout(250); await p.evaluate(()=>window.__setT(1200)); return p; };
  const PH={x:0,y:0,width:430,height:932}, MED={x:15,y:52,width:400,height:216}, SML={x:15,y:257,width:400,height:236};
  for(const th of ['light','dark','tinted']){
    const p=await open(`theme=${th}&mode=exact`);
    await p.screenshot({path:`${OUT}/A-ios_home_${th}.png`,clip:PH});
    if(th!=='tinted'){ await p.screenshot({path:`${OUT}/A-ios_medium_${th}.png`,clip:MED}); await p.screenshot({path:`${OUT}/A-ios_small_${th}.png`,clip:SML}); }
    await p.close();
  }
  for(const th of ['light','dark']){ const p=await open(`theme=${th}&mode=rounded`); await p.screenshot({path:`${OUT}/A-ios_home_${th}_rounded.png`,clip:PH}); await p.close(); }
  { const p=await open(`view=lock&mode=rounded`); await p.screenshot({path:`${OUT}/A-ios_lockscreen_rounded.png`,clip:PH}); await p.close(); }
  { const p=await open(`view=sheet`,1500,1000); await p.screenshot({path:`${OUT}/A-ios_privacy-modes_sheet.png`,fullPage:true}); await p.close(); }
  // numericText roll sequence (medium, one timeline entry change)
  { const p=await open(`theme=light&mode=exact`); const fr=[];
    for(const [i,t] of [1200,1340,1440,1560,1900].entries()){ await p.evaluate(t=>window.__setT(t),t); const f=`/tmp/roll_${i}.png`; await p.screenshot({path:f,clip:{x:33,y:100,width:364,height:84}}); fr.push(f); }
    require('fs').writeFileSync('/tmp/rolllist',fr.join(' ')); await p.close(); }
  await b.close();
})();
