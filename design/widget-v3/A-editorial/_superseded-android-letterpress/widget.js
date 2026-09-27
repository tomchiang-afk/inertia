/* Inertia widget v3 — Direction A "Editorial / 印刷"
   Everything here mirrors what the Android side can do:
   - static "plate" (paper grain + typography)  -> one Bitmap per update (WidgetRenderer)
   - hero develop sequence                      -> AdapterViewFlipper, loopViews=false, 9 items, flipInterval 450ms
   - rhythm ink mark                            -> ViewFlipper, 12 pre-rendered frames, flipInterval 1500ms, fade 1200ms
   - footnote ticker                            -> ViewFlipper of TextViews, flipInterval 6000ms, slide 600ms
   - clock                                      -> TextClock (HH:mm)
   The JS engine below is a pure function of a virtual clock t so video capture is deterministic. */
(function(){
const S = 3; // raster scale for bitmaps (matches 3x renders; device uses 2.625)

/* ---------------- data (realistic, Taiwan household) ---------------- */
const D = {
  nw: 16470382, month: 51640, today: 1712, ytdPct: 6.8, edition: 1284,
  parts: [
    {k:'房產', v:11982000, sub:'板橋 · 房貸餘 612 萬', subZh:true},
    {k:'股票', v:3214382,  sub:'TWSE · NYSE · TSE'},
    {k:'現金', v:1274000,  sub:'TWD · USD · JPY'},
    {k:'被動收入', v:28500, flow:true, sub:'股息 · 利息 · 每月', subZh:true},
  ],
  todayParts: [['房貸本金攤還',1240],['存款利息',318],['0056 股息預估',154]],
  goal: {k:'換屋頭期款', pct:82},
  streak: 214, updated: '21:54',
  // daily net change, Sep 1..27 (TWD). Dividends on 16/21, two small market dips.
  days: [1480,1390,1522,1610,1455,1340,1502,1575,-620,1430,1498,1560,1405,1520,1470,3880,1500,1445,1395,1535,2960,-410,1480,1512,1390,1466,1712],
};
const fmt = n => Math.round(n).toLocaleString('en-US');
const wan = n => { const w=n/1e4; return (w>=100? fmt(w) : w.toFixed(1)); };

/* ---------------- privacy formatting ---------------- */
function content(mode, nw){
  nw = nw ?? D.nw;
  const pctM = (D.month/nw*100), pctT=(D.today/nw*100);
  const c = {mode};
  if(mode==='exact'){
    c.kicker=['淨資產','net worth'];
    c.hero=`<span class="cur">NT$</span><span class="fig">${fmt(nw)}</span>`;
    c.pace=[['本月','+'+fmt(D.month)],['今日<sup>1</sup>','+'+fmt(D.today)]];
    c.cats=D.parts.map(p=>({k:p.k,v:p.flow?fmt(p.v)+'<small>/月</small>':fmt(p.v),sub:p.sub,zh:p.subZh}));
    c.goal=D.goal.pct+'%'; c.bar='ink';
    c.tick=[...D.todayParts.map((p,i)=>`<sup>${i+1}</sup>${p[0]} <span class="n">+${fmt(p[1])}</span>`), `淨資產已連續 <span class="n">${D.streak}</span> 日未減少`];
  } else if(mode==='rounded'){
    c.kicker=['淨資產','approx.'];
    c.hero=`<span class="cur">NT$</span><span class="fig">${fmt(Math.round(nw/1e4))}</span><span class="unit">萬</span>`;
    c.pace=[['本月','+'+wan(D.month)+'<small>萬</small>'],['今日<sup>1</sup>','+'+fmt(Math.round(D.today/100)*100)]];
    c.cats=D.parts.map(p=>({k:p.k,v:(p.flow? wan(p.v):fmt(Math.round(p.v/1e4)))+'<small>萬'+(p.flow?'/月':'')+'</small>',sub:p.sub,zh:p.subZh}));
    c.goal=D.goal.pct+'%'; c.bar='ink';
    c.tick=[...D.todayParts.map((p,i)=>`<sup>${i+1}</sup>${p[0]} 約 <span class="n">+${fmt(Math.round(p[1]/50)*50)}</span>`), `淨資產已連續 <span class="n">${D.streak}</span> 日未減少`];
  } else if(mode==='relative'){
    c.kicker=['本月變化','this month'];
    c.hero=`<span class="fig">+${pctM.toFixed(2)}</span><span class="pct">%</span>`;
    c.pace=[['今日<sup>1</sup>','+'+pctT.toFixed(3)+'%'],['今年','+'+D.ytdPct.toFixed(1)+'%']];
    const tot=D.parts.filter(p=>!p.flow).reduce((a,p)=>a+p.v,0);
    c.cats=D.parts.map(p=>({k:p.k,v:p.flow? Math.round(p.v/D.month*100)+'%' : (p.v/tot*100).toFixed(1)+'%', sub:p.flow?'佔本月增長':'佔淨資產', zh:true}));
    c.goal=D.goal.pct+'%'; c.bar='ink';
    c.tick=[...D.todayParts.map((p,i)=>`<sup>${i+1}</sup>${p[0]} 佔今日 <span class="n">${Math.round(p[1]/D.today*100)}%</span>`), `淨資產已連續 <span class="n">${D.streak}</span> 日未減少`];
  } else if(mode==='rhythm'){
    c.kicker=['節奏','rhythm only'];
    c.hero=null;
    c.pace=[['本月','平穩向上'],['今日<sup>1</sup>','靜靜增長']]; c.paceWords=true;
    c.cats=D.parts.map((p,i)=>({k:p.k,glyph:i,sub:['每日攤還','隨市場起伏','每日計息','按月入帳'][i],zh:true}));
    c.goal=''; c.bar='ink';
    c.tick=['<sup>1</sup>房貸本金 今日已攤還','<sup>2</sup>存款利息 今日已計息','<sup>3</sup>股息 入帳在途','淨資產持續未減少'];
  } else { // masked
    c.kicker=['淨資產','hidden'];
    c.hero=`<span class="cur">NT$</span><span class="fig mask">${'<i class="dot"></i>'.repeat(6)}</span>`;
    c.pace=[['本月','+•••'],['今日<sup>1</sup>','+•••']];
    c.cats=D.parts.map(p=>({k:p.k,v:'••••'+(p.flow?'<small>/月</small>':''),sub:p.k==='房產'?'板橋 · 自住':p.sub,zh:p.subZh}));
    c.goal='••%'; c.bar='blind';
    c.tick=[...D.todayParts.map((p,i)=>`<sup>${i+1}</sup>${p[0]} <span class="n">+•••</span>`), '已隱藏金額 · 輕觸開啟 Inertia'];
  }
  return c;
}

/* ---------------- deterministic textures ---------------- */
function rng(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function valueNoise(w,h,cell,seed){
  const r=rng(seed), gw=Math.ceil(w/cell)+2, gh=Math.ceil(h/cell)+2, g=new Float32Array(gw*gh);
  for(let i=0;i<g.length;i++) g[i]=r();
  const out=new Float32Array(w*h);
  for(let y=0;y<h;y++){ const gy=y/cell, y0=gy|0, fy=gy-y0, sy=fy*fy*(3-2*fy);
    for(let x=0;x<w;x++){ const gx=x/cell, x0=gx|0, fx=gx-x0, sx=fx*fx*(3-2*fx);
      const a=g[y0*gw+x0], b=g[y0*gw+x0+1], c=g[(y0+1)*gw+x0], d=g[(y0+1)*gw+x0+1];
      out[y*w+x]=a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy; } }
  return out;
}
const cache={};
function paper(wdp,hdp,dark){
  const key=`p${wdp}x${hdp}${dark}`; if(cache[key]) return cache[key];
  const W=wdp*S,H=hdp*S, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const x=cv.getContext('2d'), r=rng(dark?911:417);
  const base=dark?[23,21,15]:[241,236,226];
  const img=x.createImageData(W,H), m1=valueNoise(W,H,90,dark?3:5), m2=valueNoise(W,H,14,dark?7:9);
  for(let i=0;i<W*H;i++){
    const n=(r()-.5)*(dark?8:10) + (m1[i]-.5)*(dark?3:4) + (m2[i]-.5)*(dark?2.5:3);
    img.data[i*4]=base[0]+n; img.data[i*4+1]=base[1]+n*.97; img.data[i*4+2]=base[2]+n*.9; img.data[i*4+3]=255;
  }
  x.putImageData(img,0,0);
  // fibres
  const nf=Math.round(wdp*hdp/28);
  for(let i=0;i<nf;i++){
    const px=r()*W, py=r()*H, a=r()*Math.PI*2, L=(2+r()*7)*S;
    x.strokeStyle=dark?`rgba(255,240,215,${.012+r()*.022})`:`rgba(110,90,60,${.025+r()*.04})`;
    x.lineWidth=(.2+r()*.25)*S; x.beginPath(); x.moveTo(px,py);
    x.quadraticCurveTo(px+Math.cos(a+.15)*L*.5,py+Math.sin(a+.15)*L*.5,px+Math.cos(a)*L,py+Math.sin(a)*L); x.stroke();
  }
  // inclusions
  for(let i=0;i<Math.round(wdp*hdp/1400);i++){ x.fillStyle=dark?'rgba(255,240,215,.10)':'rgba(70,50,30,.16)'; x.beginPath(); x.arc(r()*W,r()*H,(.3+r()*.5)*S,0,7); x.fill(); }
  // soft edge falloff (paper stock catching light)
  const g=x.createRadialGradient(W*.45,H*.35,Math.min(W,H)*.2,W*.5,H*.5,Math.max(W,H)*.8);
  g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,dark?'rgba(0,0,0,.22)':'rgba(120,95,60,.05)');
  x.fillStyle=g; x.fillRect(0,0,W,H);
  return cache[key]=cv.toDataURL('image/png');
}
// ink impression masks: coverage-exact thresholds of a clumpy noise field
const COVER=[0,.10,.24,.40,.57,.73,.87,.95,.993];
function inkMasks(){
  if(cache.masks) return cache.masks;
  const N=300, a=valueNoise(N,N,22,21), b=valueNoise(N,N,6,23), r=rng(29), f=new Float32Array(N*N);
  for(let i=0;i<f.length;i++) f[i]=a[i]*.55+b[i]*.3+r()*.15;
  const sorted=Float32Array.from(f).sort();
  cache.masks=COVER.map(cov=>{
    const cv=document.createElement('canvas'); cv.width=cv.height=N; const x=cv.getContext('2d'), img=x.createImageData(N,N);
    const th=sorted[Math.min(f.length-1,Math.floor(cov*f.length))], soft=.012;
    for(let i=0;i<f.length;i++){ const v=Math.max(0,Math.min(1,(th-f[i])/soft+.5)); img.data[i*4]=img.data[i*4+1]=img.data[i*4+2]=255; img.data[i*4+3]=v*255; }
    x.putImageData(img,0,0); return cv.toDataURL('image/png');
  });
  return cache.masks;
}
const INKOP=[0,.30,.42,.55,.68,.80,.90,.96,1];

/* ---------------- rhythm ink mark (12 frames) ---------------- */
const FRAMES=12, TODAY=27, NDAYS=30;
function themeCols(dark){ return dark? {ink:[236,228,210],ink2:[165,155,136],acc:[226,102,74],hi:'rgba(255,245,225,.10)',lo:'rgba(0,0,0,.6)',hair:'rgba(236,228,210,.28)'}
                                   : {ink:[28,26,23],ink2:[101,93,81],acc:[176,52,31],hi:"rgba(255,255,255,.7)",lo:"rgba(90,70,40,.32)",hair:'rgba(28,26,23,.35)'}; }
const rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
function rhythmFrames(wdp,hdp,dark,opt={}){
  const key=`r${wdp}x${hdp}${dark}${opt.big?1:0}`; if(cache[key]) return cache[key];
  const C=themeCols(dark), out=[];
  const W=wdp*S,H=hdp*S, pitch=W/NDAYS, base=H*(opt.big?.74:.70), maxV=Math.max(...D.days);
  const up=H*(opt.big?.62:.60), down=H*.2, sw=(opt.big?2.3:wdp>250?1.7:1.35)*S;
  const speck=valueNoise(W,H,2.2*S,77);
  for(let f=0;f<FRAMES;f++){
    const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const x=cv.getContext('2d');
    const r=rng(1000+f*0); // same tendril geometry each frame, scaled by phase
    const pulse=f*4.5, phi=.5-.5*Math.cos(2*Math.PI*f/FRAMES);
    // baseline hairline + printer's measure marks
    x.strokeStyle=C.hair; x.lineWidth=.5*S; x.beginPath(); x.moveTo(0,base+.5*S); x.lineTo(W,base+.5*S); x.stroke();
    for(let d=0; d<=NDAYS; d+=5){ const px=Math.min(W-.5*S,Math.max(.5*S,d*pitch)); x.beginPath(); x.moveTo(px,base+.5*S); x.lineTo(px,base+2.6*S); x.stroke(); }
    // strokes
    for(let i=0;i<NDAYS;i++){
      const day=i+1, cx=(i+.5)*pitch;
      if(day>TODAY){ // blind impression: debossed, no ink
        const hh=up*.42; x.lineWidth=sw; x.lineCap='butt';
        x.strokeStyle=C.lo; x.beginPath(); x.moveTo(cx-.35*S,base-hh); x.lineTo(cx-.35*S,base); x.stroke();
        x.strokeStyle=C.hi; x.beginPath(); x.moveTo(cx+.45*S,base-hh); x.lineTo(cx+.45*S,base); x.stroke();
        continue;
      }
      const v=D.days[i], g=Math.exp(-Math.pow((day-pulse)/2.6,2));
      const a=(v<0?.55:.58)+.42*g, wid=sw*(1+.35*g);
      const hh = v>=0 ? up*(v<=1600? .66*v/1600 : .66+.34*Math.min(1,(v-1600)/2300))*(1+.05*g) : -down*(Math.abs(v)/800);
      if(day===TODAY){
        x.fillStyle=rgba(C.acc,.95); x.fillRect(cx-wid*.55,base-hh,wid*1.1,hh);
        // bleeding drop at the head of today's stroke
        const R=(2.0+2.8*phi)*(opt.big?1.5:1)*S, hy=base-hh;
        const rg=x.createRadialGradient(cx,hy,0,cx,hy,R); rg.addColorStop(0,rgba(C.acc,.95)); rg.addColorStop(.55,rgba(C.acc,.55+.2*phi)); rg.addColorStop(1,rgba(C.acc,0));
        x.fillStyle=rg; x.beginPath(); x.arc(cx,hy,R,0,7); x.fill();
        x.strokeStyle=rgba(C.acc,.10+.22*phi); x.lineWidth=.45*S; x.beginPath(); x.arc(cx,hy,R*1.08,0,7); x.stroke(); // tide line
        x.lineCap='round';
        for(let k=0;k<18;k++){ const an=r()*Math.PI*2, L=R*(1.05+r()*1.1)*(.55+.6*phi), bend=(r()-.5)*.8;
          x.strokeStyle=rgba(C.acc,(.12+.22*r())*(.5+.5*phi)); x.lineWidth=(.25+.3*r())*S; x.beginPath(); x.moveTo(cx+Math.cos(an)*R*.4,hy+Math.sin(an)*R*.4);
          x.quadraticCurveTo(cx+Math.cos(an+bend)*L*.7,hy+Math.sin(an+bend)*L*.7,cx+Math.cos(an+bend*1.6)*L,hy+Math.sin(an+bend*1.6)*L); x.stroke(); }
      } else {
        x.fillStyle=rgba(v<0?C.ink2:C.ink,a);
        const y0=Math.min(base,base-hh), y1=Math.max(base,base-hh);
        x.fillRect(cx-wid/2,y0,wid,y1-y0);
        x.fillStyle=rgba(v<0?C.ink2:C.ink,a*.5); x.fillRect(cx-wid/2-.3*S,y0,.3*S,y1-y0); // slight ink squash edge
      }
    }
    // ink starvation speckle (letterpress)
    const img=x.getImageData(0,0,W,H), p=img.data;
    for(let i=0;i<W*H;i++){ if(p[i*4+3]>0){ const s=speck[i]; if(s>.86) p[i*4+3]*=Math.max(.3,1-(s-.86)*5); } }
    x.putImageData(img,0,0);
    out.push(cv.toDataURL('image/png'));
  }
  return cache[key]=out;
}
function glyph(i,dark){ // tiny per-category rhythm glyph for rhythm-only mode
  const key=`g${i}${dark}`; if(cache[key]) return cache[key];
  const C=themeCols(dark), w=44,h=9,cv=document.createElement('canvas'); cv.width=w*S; cv.height=h*S; const x=cv.getContext('2d');
  const pat=[[.5,.5,.5,.5,.5,.5,.5,.5,.5,.5,.5,.5,.5,.5],[.4,.7,.2,.9,.5,.3,.8,.6,.1,.7,.4,.9,.3,.6],[.25,.25,.25,.25,.25,.25,.25,.25,.25,.25,.25,.25,.25,.25],[.1,.1,.1,1,.1,.1,.1,.1,.1,1,.1,.1,.1,.1]][i];
  pat.forEach((v,k)=>{ x.fillStyle=rgba(C.ink,.75); const hh=Math.max(.12,v)*h*S; x.fillRect((k*3+1)*S,h*S-hh,1.1*S,hh); });
  return cache[key]=cv.toDataURL();
}

/* ---------------- widget DOM ---------------- */
function heroLayers(c, oldHtml){
  // item 0 = previous impression (fully inked); items 1..8 = new value developing
  const m=inkMasks(); let s='';
  // items 1..7 are composites: previous edition fading as a ghost + new value developing (app renders these as bitmaps)
  const num=(html,k,op)=>`<span class="num ink${k===8?' press':''}" style="-webkit-mask-image:url(${m[k]});mask-image:url(${m[k]});opacity:${op}">${html}</span>`;
  const mk=(html,k)=>`<div class="dev" data-k="${k}">${k===0? num(html,8,1) : ((oldHtml&&k<8)? `<div class="ghost">${num(oldHtml,8,(1-k/8)*.85)}</div>`:'') + num(html,k,INKOP[k])}</div>`;
  s+= oldHtml? mk(oldHtml,0) : `<div class="dev" data-k="0"></div>`;
  for(let k=1;k<=8;k++) s+=mk(c.hero,k);
  return s;
}
function fitHero(el,avail,maxPx){
  el.querySelectorAll('.num').forEach(n=>{ n.style.fontSize='100px'; const w=n.getBoundingClientRect().width; n.style.fontSize=Math.min(maxPx,Math.floor(avail/w*1000)/10)+'px'; });
}
function tickerHtml(lines){ return lines.map(l=>`<div>${l}</div>`).join(''); }

function build(size, mode, dark, opts={}){
  const c=content(mode, opts.nw), W=size==='4x2'?368:176, H=222;
  const el=document.createElement('div'); el.className='w '+(dark?'dark':'light'); el.style.width=W+'px'; el.style.height=H+'px';
  el.dataset.size=size; el.dataset.mode=mode;
  const cats = c.cats.map(k=>`<div style="height:28px"><div class="cr"><span class="cn">${k.k}</span><span class="lead"></span>${k.glyph!==undefined?`<img class="glyph" src="${glyph(k.glyph,dark)}">`:`<span class="cv">${k.v}</span>`}</div><div class="cs${k.zh?' zh':''}">${k.sub}</div></div>`).join('');
  const goalHtml = `<div class="row"><span>${D.goal.k}</span><span class="lead"></span><span class="pv">${c.goal}</span></div>
    <div class="bar ${c.bar}"><div class="base"></div><div class="fill" style="width:${D.goal.pct}%"></div>${c.bar==='ink'?`<div class="tick" style="left:${D.goal.pct}%"></div>`:''}</div>`;
  const pace = c.pace.map(p=>`<div class="c"><span class="l">${p[0]}</span><span class="v${c.paceWords?' words':''}">${p[1]}</span></div>`).join('');
  const tick = tickerHtml(size==='2x2'? [...c.tick, `本期印行於 <span class="n">${D.updated}</span>`] : c.tick);
  const kick = `<span>${c.kicker[0]}<i>${c.kicker[1]}</i></span><span class="dt">${size==='2x2'?'09·27 SUN':'SUN 27 SEP 2026'}</span>`;
  const rhythm = mode==='rhythm';
  let h='';
  h+=`<div class="grain" style="background-image:url(${paper(W,H,dark)})"></div>`;
  if(size==='2x2'){
    const P=14, IW=W-2*P;
    h+=`<div class="abs mast" style="left:${P}px;right:${P}px;top:13px"><span class="brand">INERTIA</span><span class="ed">第 <b>${fmt(D.edition)}</b> 期</span></div>`;
    h+=`<div class="abs rule2" style="left:${P}px;right:${P}px;top:25px"></div>`;
    h+=`<div class="abs kicker" style="left:${P}px;right:${P}px;top:35px">${kick}</div>`;
    if(!rhythm){
      h+=`<div class="hero" style="left:${P}px;width:${IW}px;top:48px;height:44px">${heroLayers(c,opts.oldHero)}</div>`;
      h+=`<div class="abs hair" style="left:${P}px;right:${P}px;top:99px"></div>`;
      h+=`<div class="abs pace" style="left:${P}px;right:${P}px;top:106px">${pace}</div>`;
      h+=`<div class="flip rhythm" style="left:${P}px;width:${IW}px;top:136px;height:36px"></div>`;
    } else {
      h+=`<div class="abs rhythm-cap" style="left:${P}px;right:${P}px;top:52px"><span style="font-size:27px;letter-spacing:.06em;line-height:1">九月廿七</span><i style="margin-top:6px">第二十七日 · 節奏如常</i></div>`;
      h+=`<div class="flip rhythm big" style="left:${P}px;width:${IW}px;top:104px;height:68px"></div>`;
    }
    h+=`<div class="abs goal" style="left:${P}px;right:${P}px;top:180px">${goalHtml}</div>`;
    h+=`<div class="abs foot" style="left:${P}px;right:${P}px;top:200px"><div class="ticker">${tick}</div><span class="clock tc">22:07</span></div>`;
    el.innerHTML=h; el._fit=()=>fitHero(el.querySelector('.hero')||el, IW, mode==='rounded'||mode==='relative'?46:40);
  } else {
    const P=16, R=346, LW=192;
    h+=`<div class="abs mast" style="left:${P}px;width:${R-P}px;top:13px"><span class="brand">INERTIA</span><span class="ed">家庭資產 · 日刊　第 <b>${fmt(D.edition)}</b> 期</span></div>`;
    h+=`<div class="abs rule2" style="left:${P}px;width:${R-P}px;top:25px"></div>`;
    h+=`<div class="abs kicker" style="left:${P}px;width:${LW}px;top:35px">${kick}</div>`;
    h+=`<div class="abs" style="left:${P+LW+10}px;top:35px;height:118px;border-left:.5px solid var(--hair)"></div>`;
    if(!rhythm){
      h+=`<div class="hero" style="left:${P}px;width:${LW}px;top:48px;height:48px">${heroLayers(c,opts.oldHero)}</div>`;
      h+=`<div class="abs hair" style="left:${P}px;width:${LW}px;top:102px"></div>`;
      h+=`<div class="abs pace" style="left:${P}px;width:${LW}px;top:109px">${pace}</div>`;
    } else {
      h+=`<div class="abs rhythm-cap" style="left:${P}px;width:${LW}px;top:52px"><span style="font-size:34px;letter-spacing:.06em;line-height:1">九月廿七</span><i style="margin-top:7px">第二十七日 · 節奏如常 · 三筆入帳在途</i></div>`;
      h+=`<div class="abs pace" style="left:${P}px;width:${LW}px;top:109px">${pace}</div>`;
    }
    h+=`<div class="abs goal" style="left:${P}px;width:${LW}px;top:143px">${goalHtml}</div>`;
    h+=`<div class="abs cats" style="left:${P+LW+21}px;width:${R-(P+LW+21)}px;top:36px">${cats}</div>`;
    h+=`<div class="flip rhythm" style="left:${P}px;width:${R-P}px;top:162px;height:26px"></div>`;
    [[1,0],[10,9],[20,19],[27,26],[30,29]].forEach(([lbl,i])=>{ h+=`<span class="daylbl" style="left:${P+(i+.5)*((R-P)/30)-3}px;top:191px;${lbl===27?'color:var(--acc)':''}">${lbl}</span>`; });
    h+=`<div class="abs foot" style="left:${P}px;width:${R-P}px;top:202px"><div class="ticker">${tick}</div><span class="clock">更新 ${D.updated} · <b class="tc">22:07</b></span></div>`;
    h+=`<div class="vmarg" style="left:353px;top:36px">二〇二六年九月廿七日 · 星期日 · <b>靜</b></div>`;
    el.innerHTML=h; el._fit=()=>fitHero(el.querySelector('.hero')||el, LW, mode==='rounded'||mode==='relative'?52:44);
  }
  // rhythm frames into the flipper
  const fl=el.querySelector('.flip.rhythm'), fw=parseFloat(fl.style.width), fh=parseFloat(fl.style.height);
  fl.innerHTML=rhythmFrames(fw,fh,dark,{big:rhythm}).map(u=>`<img src="${u}">`).join('');
  el._c=c;
  return el;
}

/* ---------------- motion engine (pure function of t) ---------------- */
const M={devInterval:450, devAnim:400, rInterval:1500, rAnim:1200, tInterval:6000, tAnim:600};
const ease=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2, dec=p=>1-Math.pow(1-p,2.2), acc=p=>p*p;
function apply(root,t){
  root.querySelectorAll('.w').forEach(w=>{
    const t0=w._devStart??-1e9, dt=t-t0;
    // AdapterViewFlipper (loopViews=false): item k shown at k*interval, in-anim alpha 0->1 over devAnim, previous out-anim 1->0
    const layers=w.querySelectorAll('.hero .dev');
    if(layers.length){
      const k=Math.max(0,Math.min(8,Math.floor(dt/M.devInterval)));
      const p=dt<0?1:Math.min(1,(dt-k*M.devInterval)/M.devAnim);
      layers.forEach((L,i)=>{ let o=0; if(i===k) o=(k===0?1:ease(p)); else if(i===k-1) o=1-ease(p); L.style.opacity=o; });
    }
    // ViewFlipper rhythm: 12 frames, symmetric crossfade
    const imgs=w.querySelectorAll('.flip.rhythm img');
    if(imgs.length){ const n=imgs.length, i=Math.floor(t/M.rInterval)%n, p=Math.min(1,(t%M.rInterval)/M.rAnim), prev=(i+n-1)%n;
      imgs.forEach((im,j)=>{ im.style.opacity = j===i? (t<M.rInterval? 1: ease(p)) : (j===prev && t>=M.rInterval ? 1-ease(p) : 0); }); }
    // ViewFlipper ticker: slide up
    const tl=w.querySelectorAll('.ticker div');
    if(tl.length){ const n=tl.length, tt=t+4200, i=Math.floor(tt/M.tInterval)%n, p=Math.min(1,(tt%M.tInterval)/M.tAnim), prev=(i+n-1)%n;
      tl.forEach((d,j)=>{ if(j===i){ const q=dec(p); d.style.opacity=q; d.style.transform=`translateY(${(1-q)*100}%)`; }
        else if(j===prev && p<1){ const q=acc(p); d.style.opacity=1-q; d.style.transform=`translateY(${-q*100}%)`; }
        else { d.style.opacity=0; } }); }
  });
  // TextClock
  const base=new Date(2026,8,27,22,7,12).getTime()+t, dd=new Date(base), hm=String(dd.getHours()).padStart(2,'0')+':'+String(dd.getMinutes()).padStart(2,'0');
  root.querySelectorAll('.tc').forEach(e=>e.textContent=hm);
  root.querySelectorAll('.sbclock').forEach(e=>e.textContent=hm);
}
window.Editorial={D,content,build,apply,M,fmt};
})();
