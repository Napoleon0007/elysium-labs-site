/* Elysium Labs — Selected Work section.
   A dark cosmic gallery low on the page: a starfield + electric-blue gravity
   floor behind four frames that float in 3D, one of them a live figure-eight
   with Earth, Mars & Venus. All 2D canvas (no WebGL) so it never fights the
   site's Three.js background — which we pause while this section fills the
   screen. Everything is gated by IntersectionObserver: nothing animates, and
   no battery is spent, until the visitor actually scrolls down here. */
(() => {
  const section = document.getElementById('work');
  if (!section) return;
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const sky = section.querySelector('.work-sky');
  const tb  = section.querySelector('.wtb');
  if (!sky) return;
  const sc = sky.getContext('2d');

  let sd = 20260709;
  const rr = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };

  /* ---------------- starfield + galaxies (pre-rendered) ---------------- */
  let W, H, DPR, bg;
  function makeSky() {
    bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    const b = bg.getContext('2d');
    b.fillStyle = '#05060c'; b.fillRect(0, 0, W, H);
    const gals = [
      {x:.15,y:.20,r:.15,rot:-.5,sq:.42,col:'160,180,235'},
      {x:.84,y:.16,r:.12,rot:.7,sq:.5,col:'235,205,175'},
      {x:.72,y:.40,r:.09,rot:-.3,sq:.4,col:'190,170,235'},
      {x:.30,y:.46,r:.11,rot:.4,sq:.46,col:'150,190,225'},
      {x:.90,y:.54,r:.08,rot:.2,sq:.5,col:'220,190,210'}
    ];
    gals.forEach(g => {
      const cx = g.x*W, cy = g.y*H, R = g.r*Math.min(W,H);
      b.save(); b.translate(cx,cy); b.rotate(g.rot); b.scale(1,g.sq);
      let rg = b.createRadialGradient(0,0,0,0,0,R);
      rg.addColorStop(0,`rgba(${g.col},.28)`); rg.addColorStop(.3,`rgba(${g.col},.1)`); rg.addColorStop(1,`rgba(${g.col},0)`);
      b.fillStyle = rg; b.beginPath(); b.arc(0,0,R,0,7); b.fill();
      let cg = b.createRadialGradient(0,0,0,0,0,R*.18);
      cg.addColorStop(0,'rgba(255,255,255,.55)'); cg.addColorStop(1,`rgba(${g.col},0)`);
      b.fillStyle = cg; b.beginPath(); b.arc(0,0,R*.18,0,7); b.fill(); b.restore();
    });
    sd = 424242; const N = Math.round((W*H)/(9000/DPR));
    for (let i = 0; i < N; i++) {
      const x = rr()*W, y = rr()*H, s = (rr()*rr())*(1.7*DPR)+.35*DPR, warm = rr(), a = .25+rr()*.7;
      const col = warm>.86 ? '255,225,190' : warm>.72 ? '200,215,255' : '255,255,255';
      b.fillStyle = `rgba(${col},${a})`; b.beginPath(); b.arc(x,y,s,0,7); b.fill();
      if (s > 1.4*DPR) { let gg = b.createRadialGradient(x,y,0,x,y,s*5);
        gg.addColorStop(0,`rgba(${col},.5)`); gg.addColorStop(1,`rgba(${col},0)`);
        b.fillStyle = gg; b.beginPath(); b.arc(x,y,s*5,0,7); b.fill(); }
    }
  }
  function fitSky() {
    DPR = Math.min(devicePixelRatio||1, 2);
    const r = sky.getBoundingClientRect();
    W = sky.width = Math.max(2, Math.round(r.width*DPR));
    H = sky.height = Math.max(2, Math.round(r.height*DPR));
    makeSky();
  }
  function drawFloor(t) {
    const horizon = H*0.60, cx = W*0.5, rows = 22, cols = 24, speed = reduce ? 0 : t*0.00004;
    sc.lineWidth = Math.max(1, DPR*0.65);
    for (let r = 0; r < rows; r++) {
      let f = (r/rows + speed) % 1; const persp = f*f;
      const y = horizon + persp*(H-horizon)*1.05;
      sc.strokeStyle = `rgba(74,124,255,${Math.pow(f,1.5)*0.4})`;
      sc.beginPath(); sc.moveTo(0,y); sc.lineTo(W,y); sc.stroke();
    }
    for (let c = -cols; c <= cols; c++) {
      const spread = c/cols; const xTop = cx+spread*W*0.05, xBot = cx+spread*W*1.75;
      const a = 0.24*(1-Math.min(1,Math.abs(spread)*0.92));
      sc.strokeStyle = `rgba(64,112,255,${Math.max(0.03,a)})`;
      sc.beginPath(); sc.moveTo(xTop,horizon); sc.lineTo(xBot,H); sc.stroke();
    }
    let g = sc.createRadialGradient(cx,horizon,0,cx,horizon,W*0.42);
    g.addColorStop(0,'rgba(47,109,255,0.14)'); g.addColorStop(1,'rgba(47,109,255,0)');
    sc.fillStyle = g; sc.fillRect(0,horizon-H*0.12,W,H);
  }
  function drawSky(t) { sc.clearRect(0,0,W,H); if (bg) sc.drawImage(bg,0,0); drawFloor(t); }

  /* ---------------- live three-body: Earth, Mars & Venus ---------------- */
  let tbActive = false;
  const TB = (() => {
    if (!tb) return null;
    const cx = tb.getContext('2d'); const TRAIL = 64; let bodies, S, cw, ch, starBg, P = {}, PR;
    const J = () => (rr()-0.5)*1e-4;
    function shade(g, size) { const R = size/2;
      g.save(); g.beginPath(); g.arc(R,R,R,0,7); g.clip();
      let t = g.createRadialGradient(R*0.62,R*0.60,R*0.12,R,R,R*1.22);
      t.addColorStop(0,'rgba(0,0,0,0)'); t.addColorStop(0.5,'rgba(0,0,8,0.12)'); t.addColorStop(1,'rgba(0,0,10,0.94)');
      g.fillStyle = t; g.fillRect(0,0,size,size);
      let sp = g.createRadialGradient(R*0.56,R*0.52,0,R*0.56,R*0.52,R*0.72);
      sp.addColorStop(0,'rgba(255,255,255,0.30)'); sp.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle = sp; g.fillRect(0,0,size,size); g.restore(); }
    function blob(g,x,y,r,col,pts) { g.fillStyle = col; g.beginPath();
      for (let a = 0; a < Math.PI*2; a += Math.PI*2/pts) { const rad = r*(0.62+rr()*0.62), xx = x+Math.cos(a)*rad, yy = y+Math.sin(a)*rad; a===0?g.moveTo(xx,yy):g.lineTo(xx,yy);} g.closePath(); g.fill(); }
    function disc(size){ const cn = document.createElement('canvas'); cn.width = cn.height = size; return [cn, cn.getContext('2d')]; }
    function clip(g,size){ const R = size/2; g.save(); g.beginPath(); g.arc(R,R,R,0,7); g.clip(); }
    function makeEarth(size){ const [cn,g] = disc(size), R = size/2; clip(g,size);
      let o = g.createRadialGradient(R*0.6,R*0.58,R*0.1,R,R,R); o.addColorStop(0,'#2f86dc'); o.addColorStop(0.7,'#124f9c'); o.addColorStop(1,'#0a2c60');
      g.fillStyle = o; g.fillRect(0,0,size,size);
      sd = 7; for (let i=0;i<10;i++) blob(g,R+(rr()-0.5)*1.7*R,R+(rr()-0.5)*1.7*R,R*(0.15+rr()*0.17), i%3?'#3d8a46':'#6d7a3c',9);
      g.fillStyle = 'rgba(244,250,255,0.92)'; g.beginPath(); g.ellipse(R,R*0.1,R*0.52,R*0.15,0,0,7); g.fill();
      g.beginPath(); g.ellipse(R,R*1.92,R*0.58,R*0.2,0,0,7); g.fill();
      g.globalAlpha = 0.5; sd = 91; for (let i=0;i<8;i++) blob(g,rr()*size,rr()*size,R*(0.1+rr()*0.15),'#ffffff',8); g.globalAlpha = 1;
      g.restore(); shade(g,size); return cn; }
    function makeMars(size){ const [cn,g] = disc(size), R = size/2; clip(g,size);
      let o = g.createRadialGradient(R*0.6,R*0.58,R*0.1,R,R,R); o.addColorStop(0,'#d0663a'); o.addColorStop(0.7,'#a4431f'); o.addColorStop(1,'#6d2a12');
      g.fillStyle = o; g.fillRect(0,0,size,size);
      sd = 31; for (let i=0;i<9;i++) blob(g,R+(rr()-0.5)*1.7*R,R+(rr()-0.5)*1.7*R,R*(0.13+rr()*0.17), i%2?'rgba(120,54,26,0.7)':'rgba(214,138,88,0.55)',8);
      g.fillStyle = 'rgba(245,240,236,0.9)'; g.beginPath(); g.ellipse(R,R*0.12,R*0.34,R*0.13,0,0,7); g.fill();
      g.restore(); shade(g,size); return cn; }
    function makeVenus(size){ const [cn,g] = disc(size), R = size/2; clip(g,size);
      let o = g.createRadialGradient(R*0.6,R*0.58,R*0.1,R,R,R); o.addColorStop(0,'#efe0b0'); o.addColorStop(0.7,'#d8b877'); o.addColorStop(1,'#a9864e');
      g.fillStyle = o; g.fillRect(0,0,size,size);
      sd = 53; g.globalAlpha = 0.5; for (let i=0;i<7;i++){ const yy = R*(0.3+i*0.22); g.fillStyle = i%2?'rgba(255,246,214,0.6)':'rgba(184,150,96,0.5)'; g.beginPath(); g.ellipse(R+(rr()-0.5)*R*0.4,yy,R*1.05,R*0.12,(rr()-0.5)*0.3,0,7); g.fill(); } g.globalAlpha = 1;
      g.restore(); shade(g,size); return cn; }
    function makeStars(size){ const [cn,g] = disc(size); g.fillStyle = '#05060c'; g.fillRect(0,0,size,size);
      let neb = g.createRadialGradient(size*0.5,size*0.44,0,size*0.5,size*0.44,size*0.72); neb.addColorStop(0,'rgba(24,30,60,0.55)'); neb.addColorStop(1,'rgba(6,7,14,0)'); g.fillStyle = neb; g.fillRect(0,0,size,size);
      sd = 2024; const N = Math.round(size*size/2600);
      for (let i=0;i<N;i++){ const x = rr()*size, y = rr()*size, r = (rr()*rr())*1.8+0.3, w = rr(); const col = w>0.85?'255,224,190':w>0.7?'200,214,255':'255,255,255'; g.fillStyle = `rgba(${col},${0.3+rr()*0.6})`; g.beginPath(); g.arc(x,y,r,0,7); g.fill(); }
      return cn; }
    function atmo(x,y,r,col,st){ cx.save(); const g = cx.createRadialGradient(x,y,r*0.8,x,y,r*1.32); g.addColorStop(0,`rgba(${col},0)`); g.addColorStop(0.55,`rgba(${col},${0.42*st})`); g.addColorStop(1,`rgba(${col},0)`); cx.fillStyle = g; cx.beginPath(); cx.arc(x,y,r*1.34,0,7); cx.fill(); cx.restore(); }
    function limb(x,y,r,col){ cx.save(); cx.strokeStyle = `rgba(${col},0.5)`; cx.lineWidth = Math.max(1,r*0.06); cx.beginPath(); cx.arc(x,y,r*0.96,Math.PI*0.85,Math.PI*1.75); cx.stroke(); cx.restore(); }
    function fit(){ const dpr = Math.min(devicePixelRatio||1,2); const r = tb.getBoundingClientRect();
      cw = tb.width = Math.max(2,r.width*dpr); ch = tb.height = Math.max(2,r.height*dpr); S = cw*0.30; PR = Math.max(9,cw*0.052);
      const psz = Math.round(PR*2.6); P.earth = makeEarth(psz); P.mars = makeMars(psz); P.venus = makeVenus(psz); starBg = makeStars(Math.max(cw,ch)); }
    function init(){ bodies = [
      {x:0.97000436,y:-0.24308753,vx:0.466203685+J(),vy:0.43236573+J(),trail:[],k:'venus',atm:'235,215,150',as:0.5,tr:'214,180,120'},
      {x:-0.97000436,y:0.24308753,vx:0.466203685+J(),vy:0.43236573+J(),trail:[],k:'mars',atm:'205,110,60',as:0.4,tr:'210,120,80'},
      {x:0,y:0,vx:-0.93240737+J(),vy:-0.86473146+J(),trail:[],k:'earth',atm:'135,198,255',as:1.25,tr:'120,180,255'}]; }
    sd = 246; fit(); init(); addEventListener('resize', fit);
    const px = x => cw/2+x*S, py = y => ch/2+y*S;
    function step(dt){ for (const b of bodies){ b.ax=0; b.ay=0; }
      for (let i=0;i<3;i++) for (let k=i+1;k<3;k++){ const a=bodies[i],b=bodies[k],dx=b.x-a.x,dy=b.y-a.y,r2=dx*dx+dy*dy+1e-6,r=Math.sqrt(r2),f=1/(r2*r); a.ax+=dx*f;a.ay+=dy*f;b.ax-=dx*f;b.ay-=dy*f; }
      for (const b of bodies){ b.vx+=b.ax*dt;b.vy+=b.ay*dt;b.x+=b.vx*dt;b.y+=b.vy*dt; } }
    function draw(){ cx.clearRect(0,0,cw,ch); if (starBg) cx.drawImage(starBg,0,0,cw,ch);
      bodies.forEach(b => { for (let k=1;k<b.trail.length;k++){ const al=(k/b.trail.length)*0.32; cx.strokeStyle=`rgba(${b.tr},${al})`; cx.lineWidth=Math.max(1,(devicePixelRatio||1)); cx.beginPath(); cx.moveTo(px(b.trail[k-1][0]),py(b.trail[k-1][1])); cx.lineTo(px(b.trail[k][0]),py(b.trail[k][1])); cx.stroke(); } });
      bodies.forEach(b => { const X=px(b.x),Y=py(b.y); atmo(X,Y,PR,b.atm,b.as);
        cx.save(); cx.shadowColor='rgba(0,0,0,0.5)'; cx.shadowBlur=PR*0.5; cx.shadowOffsetY=PR*0.12;
        const img=P[b.k]; if (img) cx.drawImage(img,X-PR,Y-PR,PR*2,PR*2); cx.restore(); if (b.k==='earth') limb(X,Y,PR,'175,215,255'); });
      const vg = cx.createRadialGradient(cw/2,ch*0.46,cw*0.25,cw/2,ch*0.5,cw*0.72); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(2,3,10,0.55)'); cx.fillStyle=vg; cx.fillRect(0,0,cw,ch); }
    let last = 0;
    function frame(ts){ if (ts-last < 30) return; last = ts;
      for (let s=0;s<6;s++) step(0.004);
      let esc=false; for (const b of bodies){ b.trail.push([b.x,b.y]); if (b.trail.length>TRAIL) b.trail.shift(); if (Math.abs(b.x)>2.1||Math.abs(b.y)>2.1) esc=true; }
      if (esc){ const t=bodies.map(b=>b.trail); init(); bodies.forEach((b,i)=>b.trail=t[i].slice(-8)); } draw(); }
    return { frame, drawOnce: () => { for (let i=0;i<200;i++){ step(0.004); if (i%3===0) for (const b of bodies){ b.trail.push([b.x,b.y]); if (b.trail.length>TRAIL) b.trail.shift(); } } draw(); } };
  })();

  /* ---------------- run loop, gated + background hand-off ---------------- */
  fitSky();
  addEventListener('resize', fitSky);
  let raf = null;
  function loop(t){ drawSky(t); if (TB) TB.frame(t); raf = requestAnimationFrame(loop); }
  function start(){ if (raf || reduce) return; raf = requestAnimationFrame(loop); }
  function stop(){ if (raf) cancelAnimationFrame(raf); raf = null; }

  if (reduce) { drawSky(0); if (TB) TB.drawOnce(); }

  // animate only while the section is anywhere near the viewport
  new IntersectionObserver((es) => {
    for (const e of es) e.isIntersecting ? start() : stop();
  }, { rootMargin: '300px 0px 300px 0px' }).observe(section);

  // pause the site's Three.js scene while this opaque section fills the screen
  let bgPaused = false;
  function bgCheck() {
    const r = section.getBoundingClientRect();
    const covers = r.top < innerHeight*0.35 && r.bottom > innerHeight*0.65;
    if (covers && !bgPaused) { bgPaused = true; window.__bg && window.__bg.pause && window.__bg.pause(); }
    else if (!covers && bgPaused) { bgPaused = false; window.__bg && window.__bg.resume && window.__bg.resume(); }
  }
  addEventListener('scroll', bgCheck, { passive: true });
  addEventListener('resize', bgCheck);
  bgCheck();
})();
