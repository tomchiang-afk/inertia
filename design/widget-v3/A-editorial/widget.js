/* Inertia widget v3 — Direction A "Editorial restraint", iOS WidgetKit first.
   Centre of gravity: the MONTH RHYTHM (月節奏) — mortgage principal + deposit interest + passive income,
   spread evenly per day — and a smooth long-term trend. Never daily market moves, no "today" P&L, no timers.
   WidgetKit mapping:
   - number roll      -> timeline entries every 15 min (precomputed) + .contentTransition(.numericText(value:))
   - beat matrix      -> 30×4 dots = the month; one dot = 1/120 month ≈ 6 h ≈ NT$430. The leading dot brightens
                         per entry and "lands" on its beat. Static SwiftUI per entry; entry-to-entry change animates.
   - trend line       -> 24-month smoothed net worth, Path per entry; end point advances with the rhythm.
   - lock ring        -> ProgressView(timerInterval: monthStart...monthEnd) (month fill, live, not a countdown)
   DEMO time-lapse: 1 entry (15 min) = 1.25 s. Roll animation runs at real speed. Pure function of t. */
(function(){
const S=3;
const R={ principal:22100, interest:1000, passive:28500 }; const RHYTHM=R.principal+R.interest+R.passive; // 51,600 / 月
const DAYS=30, PER_DAY=RHYTHM/DAYS;                                       // 1,720 / 日
const MONTH0=new Date(2026,8,1).getTime(), NOW0=new Date(2026,8,27,22,7,0).getTime();
const NW0=16470382; // anchored smooth net worth at NOW0 (market legs valued on a smoothed monthly anchor)
const ENTRY=1250, ROLL=560, MIN_PER_ENTRY=15;
const f0=n=>Math.round(n).toLocaleString('en-US');
const wan=n=>{const w=n/1e4; return w>=100? f0(w): w.toFixed(1);};
let START_OFFSET_MIN=0; // video can start later in the evening
const entryTime=k=>NOW0+(START_OFFSET_MIN+k*MIN_PER_ENTRY)*60000;
const vnow=t=>new Date(NOW0+START_OFFSET_MIN*60000+t/ENTRY*MIN_PER_ENTRY*60000);

function model(k){ // values at timeline entry k (quantised to entries, as WidgetKit would render them)
  const ts=entryTime(k), elapsedDays=(ts-MONTH0)/864e5;
  const accrued=PER_DAY*elapsedDays, nw=NW0+(ts-NOW0)/864e5*PER_DAY;
  return {ts,elapsedDays,accrued,nw,frac:elapsedDays/DAYS};
}
function V(pre,n,post){ return {pre:pre||'',n:String(n),post:post||''}; }
function content(mode,k){
  const m=model(k), c={mode,frac:m.frac};
  if(mode==='exact'){
    c.label='淨資產 · NT$'; c.hero=V('',f0(m.nw));
    c.pace=V('+',f0(m.accrued).replace(/^/,''),''); c.paceOf='/ '+f0(RHYTHM);
    c.lockBig=V('<span class="cur">NT$</span>',f0(m.nw)); c.circ=V('+',wan(m.accrued),'<small>萬</small>'); c.inline='本月節奏 +NT$'+f0(m.accrued);
    c.foot=['房貸本金 · 利息 · 被動收入', '每日 ≈ '+f0(PER_DAY)];
  } else if(mode==='rounded'){
    c.label='淨資產 · NT$ 約'; c.hero=V('',f0(Math.round(m.nw/1e4)),'<span class="unit">萬</span>');
    c.pace=V('+',wan(m.accrued),'<small>萬</small>'); c.paceOf='/ '+wan(RHYTHM)+'萬';
    c.lockBig=V('',f0(Math.round(m.nw/1e4)),'<span class="unit">萬</span>'); c.circ=V('+',wan(m.accrued),'<small>萬</small>'); c.inline='本月節奏 約 +'+wan(m.accrued)+'萬';
    c.foot=['房貸本金 · 利息 · 被動收入', '每日 約 '+f0(Math.round(PER_DAY/100)*100)];
  } else if(mode==='relative'){
    c.label='本月已累積'; c.hero=V('+',(m.accrued/m.nw*100).toFixed(3),'<span class="pct">%</span>');
    c.pace=V('',Math.round(m.frac*100)+'%',''); c.paceOfLabel='月節奏完成'; c.paceOf='';
    c.lockBig=V('+',(m.accrued/m.nw*100).toFixed(3),'%'); c.circ=V('',Math.round(m.frac*100),'<small>%</small>'); c.inline='本月節奏 +'+(m.accrued/m.nw*100).toFixed(2)+'%';
    c.foot=['房貸本金 · 利息 · 被動收入', '月節奏 ≈ '+(RHYTHM/m.nw*100).toFixed(2)+'%'];
  } else if(mode==='rhythm'){
    c.label='月節奏'; c.heroWords='靜靜增長'; c.pace=null; c.paceWords='九月 · 第 27 日';
    c.lockWords='靜靜增長'; c.circ=null; c.inline='Inertia · 本月節奏如常';
    c.foot=['房貸本金 · 利息 · 被動收入','平穩'];
  } else {
    c.label='淨資產 · NT$'; c.hero=V('','','<span class="dots">'+'<i></i>'.repeat(6)+'</span>');
    c.pace=V('+','•••',''); c.paceOf='/ •••';
    c.lockBig=V('<span class="cur">NT$</span>','••••••'); c.circ=V('','•••'); c.inline='Inertia · 金額已隱藏';
    c.foot=['房貸本金 · 利息 · 被動收入','每日 ≈ •••'];
  }
  if(mode==='rhythm') c.paceWords=c.paceWords.replace('27',String(Math.floor(m.elapsedDays)+1));
  return c;
}

/* numericText-style roll */
const easeOut=p=>1-Math.pow(1-p,3), esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
function roll(prev,cur,p){
  if(prev===cur||p>=1) return esc(cur);
  const L=Math.max(prev.length,cur.length), a=prev.padStart(L,' '), b=cur.padStart(L,' '), q=easeOut(p); let s='';
  for(let i=0;i<L;i++){ const A=a[i]===' '?'':esc(a[i]), B=b[i]===' '?'':esc(b[i]);
    if(a[i]===b[i]){ s+=B; continue; }
    s+=`<span class="roll"><span class="o" style="opacity:${1-q};transform:translateY(${-q*38}%);filter:blur(${q*2.2}px)">${A}</span><span style="display:inline-block;opacity:${q};transform:translateY(${(1-q)*38}%);filter:blur(${(1-q)*2.2}px)">${B}</span></span>`; }
  return s;
}
const vhtml=(pv,cv,p)=>cv? cv.pre+roll(pv?pv.n:cv.n,cv.n,p)+cv.post : '';

/* subtle grain */
const cache={};
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function grain(w,h,dark){
  const key=`${w}x${h}${dark}`; if(cache[key]) return cache[key];
  const cv=document.createElement('canvas'); cv.width=w*S; cv.height=h*S; const x=cv.getContext('2d'), r=rng(dark?5:9);
  const img=x.createImageData(cv.width,cv.height), base=dark?[22,21,19]:[247,244,238], amp=dark?5:6;
  for(let i=0;i<cv.width*cv.height;i++){ const n=(r()-.5)*amp; img.data[i*4]=base[0]+n; img.data[i*4+1]=base[1]+n; img.data[i*4+2]=base[2]+n*.95; img.data[i*4+3]=255; }
  x.putImageData(img,0,0);
  const g=x.createLinearGradient(0,0,0,cv.height); g.addColorStop(0,dark?'rgba(255,250,240,.025)':'rgba(255,255,255,.35)'); g.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=g; x.fillRect(0,0,cv.width,cv.height);
  return cache[key]=cv.toDataURL('image/png');
}

/* beat matrix: 30 columns (days) × 4 rows (quarter-days, bottom→top). Lit = elapsed month. */
function matrixHtml(w,h,rows){ // builds static dot grid; lighting applied in apply()
  const cols=DAYS, px=w/cols, py=h/rows, d=Math.min(px,py)*(px<6?0.64:0.5); let s=`<div class="mx" style="width:${w}px;height:${h}px">`;
  for(let c=0;c<cols;c++) for(let r=0;r<rows;r++){ const idx=c*rows+r; // fills column by column, bottom to top
    s+=`<i data-i="${idx}" style="left:${(c+.5)*px-d/2}px;top:${h-(r+.5)*py-d/2}px;width:${d}px;height:${d}px"></i>`; }
  return s+'</div>';
}
function lightMatrix(mx,frac,rows){
  const total=DAYS*rows, pos=frac*total, lit=Math.floor(pos), ch=pos-lit;
  mx.querySelectorAll('i').forEach(el=>{ const i=+el.dataset.i;
    if(i<lit){ el.className='on'; el.style.opacity=''; }
    else if(i===lit){ el.className='lead'; el.style.opacity=(0.22+0.78*ch).toFixed(3); }
    else { el.className=''; el.style.opacity=''; } });
}

/* smooth 24-month trend (monthly anchors, market legs smoothed; no daily noise) */
function trendPts(){
  if(cache.tp) return cache.tp;
  const anchors=Array.from({length:25},(_,i)=>14.62+1.85*Math.pow(i/24,1.12)); // smoothed monthly anchors, ×1e6 NT$ (no daily noise)
  return cache.tp=anchors;
}
function trendSvg(w,h,frac){
  const a=trendPts(), n=a.length-1, lo=a[0]-.08, hi=a[n]+.25;
  const X=i=>(i/(n+3))*w, Y=v=>h-4-(v-lo)/(hi-lo)*(h-10);
  const pts=a.map((v,i)=>[X(i),Y(v)]);
  // Catmull-Rom → cubic Bézier for a calm curve
  let d=`M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for(let i=0;i<pts.length-1;i++){ const p0=pts[i-1]||pts[i], p1=pts[i], p2=pts[i+1], p3=pts[i+2]||p2;
    d+=` C${(p1[0]+(p2[0]-p0[0])/6).toFixed(1)} ${(p1[1]+(p2[1]-p0[1])/6).toFixed(1)} ${(p2[0]-(p3[0]-p1[0])/6).toFixed(1)} ${(p2[1]-(p3[1]-p1[1])/6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`; }
  const e=pts[n], proj=[X(n+3),Y(a[n]+3*.09)];
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible">
    <path d="M${e[0]} ${e[1]} L${proj[0]} ${proj[1]}" stroke="var(--t3)" stroke-width="1" stroke-dasharray="1.5 3" fill="none" stroke-linecap="round"/>
    <path d="${d}" stroke="var(--t1)" stroke-width="1.35" fill="none" stroke-linecap="round" data-trend/>
    <circle data-tend cx="${e[0]}" cy="${e[1]}" r="2.6" fill="var(--acc)"/><circle cx="${e[0]}" cy="${e[1]}" r="5.5" fill="var(--acc)" opacity=".14" data-tend2/></svg>`;
}

function base(cls,w,h,theme){
  const el=document.createElement('div'); el.className='wg '+theme+' '+cls; el.style.width=w+'px'; el.style.height=h+'px';
  if(theme!=='tinted') el.innerHTML=`<div class="grain" style="background-image:url(${grain(w,h,theme==='dark')})"></div>`;
  return el;
}
function fit(h,avail,maxPx){ h.style.fontSize='100px'; const w=h.getBoundingClientRect().width||1; h.style.fontSize=Math.min(maxPx,Math.floor(avail/w*1000)/10)+'px'; }
function paceHtml(c){
  if(!c.pace) return `<div class="pace"><span class="lbl" style="color:var(--t1)">${c.paceWords}</span></div>`;
  return `<div class="pace"><span class="lbl">${c.paceOfLabel||'本月'}</span><span class="num" data-r="pace"></span>${c.paceOf?`<span class="lbl of">${c.paceOf}</span>`:''}</div>`;
}
function build(kind,mode,theme){
  const c=content(mode,0), cw=content(mode,400);
  let el;
  if(kind==='small'){
    el=base('small',170,170,theme); const P=16, IW=138;
    el.insertAdjacentHTML('beforeend',`
      <div class="a lbl" style="left:${P}px;top:17px">${c.label}</div>
      <div class="a" style="left:${P}px;width:${IW}px;top:38px;height:54px;display:flex;align-items:flex-end">
        ${c.heroWords?`<div class="hero words">${c.heroWords}</div>`:`<div class="hero" data-r="hero"></div>`}</div>
      <div class="a" style="left:${P}px;width:${IW}px;top:101px">${paceHtml(c)}</div>
      <div class="a" style="left:${P-1}px;top:130px" data-mx="4">${matrixHtml(IW+2,24,4)}</div>`);
  } else if(kind==='medium'){
    el=base('medium',364,170,theme); const P=16, LW=176, RX=206, RW=142;
    el.insertAdjacentHTML('beforeend',`
      <div class="a lbl" style="left:${P}px;top:17px">${c.label}</div>
      <div class="a" style="left:${P}px;width:${LW}px;top:38px;height:56px;display:flex;align-items:flex-end">
        ${c.heroWords?`<div class="hero words" style="font-size:30px">${c.heroWords}</div>`:`<div class="hero" data-r="hero"></div>`}</div>
      <div class="a" style="left:${P}px;width:${LW}px;top:103px">${paceHtml(c)}</div>
      <div class="a lbl" style="left:${RX}px;width:${RW}px;top:17px;text-align:right">24 個月 · 平滑趨勢</div>
      <div class="a" style="left:${RX}px;top:40px">${trendSvg(RW,62,c.frac)}</div>
      <div class="a" style="left:${P-2}px;top:126px" data-mx="4">${matrixHtml(364-2*P+4,20,4)}</div>
      <div class="a foot" style="left:${P}px;width:${364-2*P}px;top:151px"><span class="lbl">${c.foot[0]}</span><span class="lbl" style="color:var(--t1)">${c.foot[1]}</span></div>`);
  } else if(kind==='rect'){
    el=document.createElement('div'); el.className='acc rect';
    el.innerHTML=`<div class="lblx" style="position:absolute;top:2px">${mode==='relative'?'Inertia · 本月已累積':'Inertia · 淨資產'}</div>
      <div style="position:absolute;top:19px;left:0;width:172px">${c.lockWords?`<div class="big" style="font:400 24px/1.2 'Noto Serif TC';letter-spacing:.1em">${c.lockWords}</div>`:`<div class="big" data-r="lock"></div>`}</div>
      <div style="position:absolute;left:-1px;bottom:3px" data-mx="1" class="lockmx">${matrixHtml(174,6,1)}</div>`;
  } else if(kind==='circ'){
    el=document.createElement('div'); el.className='acc circ';
    el.innerHTML=`<svg viewBox="0 0 76 76"><circle cx="38" cy="38" r="33" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="4"/><circle data-ring cx="38" cy="38" r="33" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" transform="rotate(-90 38 38)" stroke-dasharray="207.3" stroke-dashoffset="207.3"/></svg>
      <div class="c">${c.circ?`<span class="v" data-r="circ"></span>`:`<svg width="24" height="10" viewBox="0 0 24 10">${Array.from({length:8},(_,i)=>`<circle cx="${1.5+i*3}" cy="5" r="1.1" fill="${i<6?'#fff':'rgba(255,255,255,.35)'}"/>`).join('')}</svg>`}<span class="k">${mode==='relative'?'月節奏':'本月'}</span></div>`;
  } else if(kind==='inline'){ el=document.createElement('div'); el.className='acc inline'; el.dataset.inline='1'; }
  el.dataset.mode=mode; el._kind=kind;
  el._fit=()=>{ const h=el.querySelector('[data-r=hero]'); if(h){ h.innerHTML=vhtml(null,cw.hero,1); fit(h,kind==='small'?138:176, kind==='small'?(mode==='exact'?40:54):(mode==='exact'?46:56)); }
    const L=el.querySelector('[data-r=lock]'); if(L){ L.innerHTML=vhtml(null,cw.lockBig,1); fit(L,166,30);} };
  return el;
}

function apply(root,t){
  const k=Math.max(0,Math.floor(t/ENTRY)), p=Math.min(1,(t-k*ENTRY)/ROLL);
  root.querySelectorAll('.wg,.acc').forEach(el=>{
    const m=el.dataset.mode, cur=content(m,k), prev=content(m,Math.max(0,k-1)), pp=k===0?1:p;
    const set=(r,a,b)=>{ const n=el.querySelector(`[data-r=${r}]`); if(n) n.innerHTML=vhtml(a,b,pp); };
    set('hero',prev.hero,cur.hero); set('lock',prev.lockBig,cur.lockBig); set('circ',prev.circ,cur.circ); set('pace',prev.pace,cur.pace);
    // matrix: brightness interpolates between entries with the same easing as the system's default entry transition
    const fr=prev.frac+(cur.frac-prev.frac)*easeOut(pp);
    el.querySelectorAll('[data-mx]').forEach(mx=>lightMatrix(mx,fr,+mx.dataset.mx));
    const ring=el.querySelector('[data-ring]'); if(ring) ring.setAttribute('stroke-dashoffset',207.3*(1-fr));
    if(el.dataset.inline) el.textContent=cur.inline;
  });
  const now=vnow(t), hm=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  root.querySelectorAll('.sbclock').forEach(e=>e.textContent=hm);
}
window.Ed={content,build,apply,ENTRY,ROLL,setStartOffset:m=>{START_OFFSET_MIN=m;},RHYTHM,PER_DAY};
})();
