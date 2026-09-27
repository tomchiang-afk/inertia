// Deterministic frame capture -> MP4 + GIF. node tools/video.cjs [theme] [mode]
// Time-lapse: 1 timeline entry (15 min on device) = 1.25 s; starts 22:37 so midnight (a beat column completes) lands at ~7.5 s; roll animation at real speed.
const { chromium } = require('/workspace/inertia/node_modules/playwright');
const fs=require('fs'), path=require('path'), {execSync}=require('child_process');
const BASE='file://'+path.resolve(__dirname,'..','index.html'), OUT=path.resolve(__dirname,'..','renders');
(async()=>{ const [,,theme='light',mode='exact',start='30']=process.argv, FPS=30, SECS=10, dir=`/tmp/vf_${theme}_${mode}`;
  fs.rmSync(dir,{recursive:true,force:true}); fs.mkdirSync(dir);
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:430,height:932},deviceScaleFactor:2});
  await p.goto(BASE+`?capture&theme=${theme}&mode=${mode}&start=${start}`); await p.evaluate(()=>window.__ready); await p.waitForTimeout(300);
  for(let i=0;i<FPS*SECS;i++){ await p.evaluate(t=>window.__setT(t),i*1000/FPS); await p.screenshot({path:`${dir}/f${String(i).padStart(4,'0')}.png`,clip:{x:0,y:0,width:430,height:932}}); }
  await b.close();
  const name=`A-ios_home_${theme}_${mode}_timeline`;
  execSync(`ffmpeg -loglevel error -y -framerate ${FPS} -i ${dir}/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart ${OUT}/${name}.mp4`);
  execSync(`ffmpeg -loglevel error -y -framerate ${FPS} -i ${dir}/f%04d.png -vf "fps=15,crop=860:940:0:110,scale=430:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" ${OUT}/${name}_widgets.gif`);
  console.log('done',name); })();
