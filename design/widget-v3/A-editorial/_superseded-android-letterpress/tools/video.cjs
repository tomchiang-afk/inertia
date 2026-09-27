// Deterministic frame capture of the home screen at real device timing -> /tmp/vframes/*.png
// node tools/video.cjs [theme] [seconds] [fps] [scale]
const { chromium } = require('/workspace/inertia/node_modules/playwright');
const fs=require('fs'), path=require('path');
const BASE='file://'+path.resolve(__dirname,'..','index.html');
(async()=>{
  const [,,theme='light',secs='10',fps='24',scale='2']=process.argv;
  const dir=`/tmp/vframes_${theme}`; fs.rmSync(dir,{recursive:true,force:true}); fs.mkdirSync(dir);
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:411,height:914},deviceScaleFactor:+scale});
  await p.goto(BASE+`?capture&theme=${theme}&mode=exact`); await p.evaluate(()=>window.__ready); await p.waitForTimeout(300);
  const N=Math.round(+secs*+fps), UPDATE_AT=6000; let updated=false;
  for(let i=0;i<N;i++){
    const t=i*1000/+fps;
    if(!updated && t>=UPDATE_AT){ await p.evaluate(t=>{window.__setT(t);window.__update();},t); updated=true; }
    await p.evaluate(t=>window.__setT(t),t);
    await p.screenshot({path:`${dir}/f${String(i).padStart(4,'0')}.png`,clip:{x:0,y:0,width:411,height:914}});
  }
  await b.close(); console.log('frames',N,dir);
})();
