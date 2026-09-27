// Renders all PNG deliverables at 3x. node tools/render.cjs
const { chromium } = require('/workspace/inertia/node_modules/playwright');
const BASE='file://'+require('path').resolve(__dirname,'..','index.html');
const OUT=require('path').resolve(__dirname,'..','renders');
(async()=>{
  const b=await chromium.launch();
  const open=async(q,scale=3,vw=411,vh=914)=>{ const p=await b.newPage({viewport:{width:vw,height:vh},deviceScaleFactor:scale});
    p.on('pageerror',e=>console.log('ERR',e.message)); await p.goto(BASE+'?'+q); await p.evaluate(()=>window.__ready); await p.waitForTimeout(250); return p; };
  for(const th of ['light','dark']){
    const p=await open(`capture&theme=${th}&mode=exact`);
    await p.evaluate(()=>window.__setT(21000));           // fully developed, rhythm mid-loop, no ticker transition
    await p.screenshot({path:`${OUT}/A-editorial_home_${th}.png`,clip:{x:0,y:0,width:411,height:914}});
    await p.screenshot({path:`${OUT}/A-editorial_2x2_${th}.png`,clip:{x:5,y:192,width:208,height:254}});
    await p.screenshot({path:`${OUT}/A-editorial_4x2_${th}.png`,clip:{x:5,y:430,width:401,height:254}});
    await p.close();
  }
  // rounded mode on the home screen (the likely everyday default for a widget)
  { const p=await open(`capture&theme=light&mode=rounded`); await p.evaluate(()=>window.__setT(21000));
    await p.screenshot({path:`${OUT}/A-editorial_home_light_rounded.png`,clip:{x:0,y:0,width:411,height:914}}); await p.close(); }
  // privacy sheet (light + dark side by side)
  { const p=await open(`capture&view=sheet`,3,1400,1000); await p.evaluate(()=>window.__setT(21000));
    await p.screenshot({path:`${OUT}/A-editorial_privacy-modes_sheet.png`,fullPage:true}); await p.close(); }
  // develop sequence strip (9 AdapterViewFlipper items, 2x2, update case with ghost of previous edition)
  { const p=await open(`capture&theme=light&mode=exact`);
    await p.evaluate(()=>{ window.__setT(20000); window.__update(); });
    const shots=[];
    for(let k=0;k<9;k++){ await p.evaluate(k=>window.__setT(20000+k*450+440),k); const f=`/tmp/devk${k}.png`;
      await p.screenshot({path:f,clip:{x:21,y:208+45,width:176,height:50}}); shots.push(f); }
    require('fs').writeFileSync('/tmp/devlist.txt',shots.join('\n')); await p.close(); }
  await b.close();
})();
