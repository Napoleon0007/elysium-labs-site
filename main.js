// Elysium Labs — site interactions.
// A deep white room: the Monumental E floats in soft fog over a grey "gravity floor"
// grid that recedes into the distance and ripples toward the cursor. The sculpture
// mirrors faintly in the floor like polished stone; energy rings travel the grid;
// dust drifts at two depths. A synced mini-E spins in the nav.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = matchMedia('(max-width: 760px)').matches;
const isLight = document.body.dataset.theme === 'light';
const FOG = isLight ? 0xf3f0ea : 0x070707;
const FLOOR_Y = -2.1;
const INK = new THREE.Color(0x0c0e13);   // brand near-black the footer E lands in

document.body.classList.add('js');   // reveals are enhancement-only (CSS gates on .js)

/* ---------------- reveals ---------------- */
/* The preloader curtain covers the page on first paint; the hero entrance
   must play as the curtain lifts, not finish hidden behind it — so reveal
   observation starts on the loader's elysium:reveal event. */
let io, revealsStarted = false;
const initReveals = () => {
  if (revealsStarted) return;
  revealsStarted = true;
  io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach((el) => {
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    el.style.transitionDelay = (Math.min(sibs.indexOf(el), 6) * 60) + 'ms';
    io.observe(el);
  });
  // belt-and-braces: when the main thread is saturated (heavy WebGL on a weak
  // device), IntersectionObserver callbacks can starve — sweep periodically so
  // no content ever stays hidden behind its own entrance.
  const revealSweep = setInterval(() => {
    const left = document.querySelectorAll('.reveal:not(.in)');
    if (!left.length) { clearInterval(revealSweep); return; }
    for (const el of left) {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.95 && r.bottom > 0) { el.classList.add('in'); io.unobserve(el); }
    }
  }, 500);
};
const loaderEl = document.getElementById('loader');
if (loaderEl && !loaderEl.classList.contains('done')) {
  addEventListener('elysium:reveal', initReveals, { once: true });
  setTimeout(initReveals, 4500);          // never let the entrance depend on one event
} else initReveals();

/* ---------------- nav state ---------------- */
const nav = document.getElementById('nav');
const onScrollNav = () => nav.classList.toggle('scrolled', window.scrollY > 24);
onScrollNav();
addEventListener('scroll', onScrollNav, { passive: true });

/* ---------------- the three-body problem ---------------- */
// three bodies locked in the figure-eight orbit (Chenciner & Montgomery),
// pinned to the right edge of the viewport like an instrument readout.
// A whisper of jitter means the choreography eventually breaks — chaos —
// and the system quietly resets. Gravity, again: the site's one obsession.
(() => {
  const c = document.getElementById('threebody');
  if (!c || reduceMotion || isMobile) { if (c) c.remove(); return; }
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const TRAIL = 90;
  let bodies;

  function init() {
    // the classic figure-8 solution, nudged so it eventually wanders
    const j = () => (Math.random() - 0.5) * 1e-4;
    bodies = [
      { x: 0.97000436, y: -0.24308753, vx: 0.466203685 + j(), vy: 0.43236573 + j(), trail: [] },
      { x: -0.97000436, y: 0.24308753, vx: 0.466203685 + j(), vy: 0.43236573 + j(), trail: [] },
      { x: 0, y: 0, vx: -0.93240737 + j(), vy: -0.86473146 + j(), trail: [] },
    ];
  }
  init();

  function step(dt) {
    for (const b of bodies) { b.ax = 0; b.ay = 0; }
    for (let i = 0; i < 3; i++) for (let k = i + 1; k < 3; k++) {
      const a = bodies[i], b = bodies[k];
      const dx = b.x - a.x, dy = b.y - a.y;
      const r2 = dx * dx + dy * dy + 1e-6, r = Math.sqrt(r2);
      const f = 1 / (r2 * r);
      a.ax += dx * f; a.ay += dy * f;
      b.ax -= dx * f; b.ay -= dy * f;
    }
    for (const b of bodies) {
      b.vx += b.ax * dt; b.vy += b.ay * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
    }
  }

  const px = (x) => W / 2 + x * (W * 0.34);
  const py = (y) => H / 2 + y * (W * 0.34);

  function draw() {
    ctx.clearRect(0, 0, W, H);
    bodies.forEach((b, i) => {
      const ink = i === 2 ? '0,0,242' : '20,18,16';       // the third body wears the blue
      for (let k = 1; k < b.trail.length; k++) {
        ctx.strokeStyle = `rgba(${ink},${(k / b.trail.length) * 0.22})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px(b.trail[k - 1][0]), py(b.trail[k - 1][1]));
        ctx.lineTo(px(b.trail[k][0]), py(b.trail[k][1]));
        ctx.stroke();
      }
      ctx.fillStyle = `rgb(${ink})`;
      ctx.beginPath();
      ctx.arc(px(b.x), py(b.y), i === 2 ? 3 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  let last = 0;
  function tick(ts) {
    requestAnimationFrame(tick);
    if (document.hidden) return;
    if (ts - last < 33) return;                            // ~30fps is plenty
    last = ts;
    for (let s = 0; s < 6; s++) step(0.004);
    let escaped = false;
    for (const b of bodies) {
      b.trail.push([b.x, b.y]);
      if (b.trail.length > TRAIL) b.trail.shift();
      if (Math.abs(b.x) > 1.9 || Math.abs(b.y) > 1.9) escaped = true;
    }
    if (escaped) init();                                   // chaos won; begin again
    draw();
  }
  requestAnimationFrame(tick);
})();

/* ---------------- 3D scene ---------------- */
const canvas = document.getElementById('bg');
let renderer, scene, camera, pmrem, model, heroPivot, reflPivot, floor, glow;
let dustNear, dustFar, dustClose, hazeA, hazeB;
const inscriptionMats = [];   // the "Elysium" floor inscription fades in near the end
let navR, navScene, navCam, navPivot;
let camDist = 0;
let running = true;
let introStart = -1;                       // clock time when the model appears
const pointer = { x: 0, y: 0 };
const eased = { x: 0, y: 0 };
let pEased = 0;                            // eased scroll progress — cinematic camera
let touchInfluence = 0, touchTarget = 0;   // 0 = ambient drift, 1 = following finger
const ripples = [];                        // traveling energy rings on the grid
let nextAmbientRipple = 2.2;

function fitCamera(radius) {
  const fovV = camera.fov * Math.PI / 180;
  const distV = radius / Math.sin(fovV / 2);
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * camera.aspect);
  const distH = radius / Math.sin(fovH / 2);
  const margin = isMobile ? 1.72 : 1.34;
  const d = Math.max(distV, distH) * margin;
  camDist = d;
  camera.position.set(0, d * 0.18, d * 0.99);   // raised + tilted down so the floor reads
  camera.lookAt(0, -0.35, 0);
}

/* gravity floor — a recessed grid that dips toward the cursor, carries traveling
   energy rings, and fades into fog. Deeper and wider than v1: the room recedes. */
function makeFloor() {
  const W = 40, D = 54, NX = isMobile ? 26 : 48, ND = isMobile ? 34 : 60;
  const cols = NX + 1, rows = ND + 1, base = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++)
    base.push([-W / 2 + (i / NX) * W, -D / 2 + (j / ND) * D]);   // [x, z]
  const idx = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols - 1; i++) { const a = j * cols + i; idx.push(a, a + 1); }
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols; i++) { const a = j * cols + i; idx.push(a, a + cols); }
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(base.length * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const mat = new THREE.LineBasicMaterial({
    color: isLight ? 0x0000F2 : 0x39ff88,          // electric blue carries the brand's one accent
    transparent: true, opacity: isLight ? 0.30 : 0.16,
    blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    depthWrite: false, fog: true });
  const lines = new THREE.LineSegments(geo, mat);
  lines.position.set(0, FLOOR_Y, -13);
  return { lines, base, pos, geo, halfW: W / 2, halfD: D / 2 };
}
function updateFloor(t, wx, wz) {
  const { base, pos, geo } = floor, sig = 3.5, amp = 1.9;
  for (let i = ripples.length - 1; i >= 0; i--) if (t - ripples[i].t0 > 4.2) ripples.splice(i, 1);
  for (let k = 0; k < base.length; k++) {
    const x = base[k][0], z = base[k][1];
    const dx = x - wx, dz = z - wz;
    let y = -amp * Math.exp(-(dx * dx + dz * dz) / (2 * sig * sig));
    y += 0.13 * Math.sin(x * 0.5 + t * 0.65) + 0.13 * Math.cos(z * 0.42 + t * 0.5);
    for (const rp of ripples) {
      const age = t - rp.t0;
      const rx = x - rp.x, rz = z - rp.z;
      const r = Math.sqrt(rx * rx + rz * rz);
      const front = r - age * 5.2;                       // expanding wavefront
      y += 0.45 * Math.sin(r * 1.9 - age * 8) *
           Math.exp(-(front * front) / 5) * Math.exp(-age * 0.85);
    }
    pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
  }
  geo.attributes.position.needsUpdate = true;
}

/* a second, fainter grid far below the gravity floor — the room has a floor
   beneath its floor, and the space reads as descending forever. Static: it is
   atmosphere, not interaction. */
function makeAbyss() {
  const W = 64, D = 76, NX = 26, ND = 30;
  const cols = NX + 1, pts = [];
  for (let j = 0; j <= ND; j++) for (let i = 0; i <= NX; i++)
    pts.push(-W / 2 + (i / NX) * W, Math.sin(i * 0.7) * 0.4 + Math.cos(j * 0.5) * 0.4, -D / 2 + (j / ND) * D);
  const idx = [];
  for (let j = 0; j <= ND; j++) for (let i = 0; i < NX; i++) { const a = j * cols + i; idx.push(a, a + 1); }
  for (let j = 0; j < ND; j++) for (let i = 0; i <= NX; i++) { const a = j * cols + i; idx.push(a, a + cols); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
  geo.setIndex(idx);
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
    color: isLight ? 0x0000F2 : 0x39ff88, transparent: true, opacity: 0.07,
    depthWrite: false, fog: true }));
  lines.position.set(0, -9.5, -22);
  return lines;
}

/* dust at two depths — near motes drift slowly, far dust barely breathes.
   both shift a touch with the pointer, which is what sells the depth. */
function makeDust(n, spread, depth, size, opacity) {
  const g = new THREE.BufferGeometry(), p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    p[i*3]   = (Math.random() - 0.5) * spread;
    p[i*3+1] = (Math.random() - 0.5) * 15;
    p[i*3+2] = depth[0] + Math.random() * (depth[1] - depth[0]);
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({
    color: isLight ? 0x6b655c : 0xbfeede, size, transparent: true,
    opacity, depthWrite: false, fog: true });
  return new THREE.Points(g, m);
}

/* a soft pool of the brand blue on the floor beneath the E — the monument
   charging the grid it stands over. */
function makeGlow() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(0,0,242,0.55)');
  g.addColorStop(0.5, 'rgba(0,0,242,0.16)');
  g.addColorStop(1, 'rgba(0,0,242,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 9),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: true }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, FLOOR_Y + 0.02, 0);
  return mesh;
}

/* the E mirrored in the floor — polished-stone reflection, faded by fog */
function makeReflection(src) {
  const clone = src.clone(true);
  clone.traverse(o => {
    if (o.isMesh && o.material) {
      o.material = o.material.clone();
      o.material.transparent = true;
      o.material.opacity = 0.16;
      o.material.envMapIntensity = 0.5;
      o.material.depthWrite = false;
    }
  });
  const pivot = new THREE.Group();
  pivot.add(clone);
  pivot.scale.y = -1;
  return pivot;
}

/* tiny corner E — same model, driven by the same transforms as the hero */
function initNavMark(src) {
  const c = document.getElementById('navmark');
  if (!c) return;
  navR = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
  navR.setPixelRatio(Math.min(devicePixelRatio, 2));
  const sz = c.clientWidth || 30; navR.setSize(sz, sz, false);
  navR.toneMapping = THREE.ACESFilmicToneMapping; navR.toneMappingExposure = 1.3;
  navScene = new THREE.Scene();
  navScene.environment = new THREE.PMREMGenerator(navR).fromScene(new RoomEnvironment(), 0.04).texture;
  navCam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  navScene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const k = new THREE.DirectionalLight(0xffffff, 3.0); k.position.set(4, 6, 5); navScene.add(k);
  const r = new THREE.DirectionalLight(0xffffff, 2.2); r.position.set(-5, 2, -4); navScene.add(r);
  const clone = src.clone(true);
  clone.position.set(0, 0, 0); clone.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(clone);
  const radius = box.getBoundingSphere(new THREE.Sphere()).radius;
  clone.position.sub(box.getCenter(new THREE.Vector3()));
  navPivot = new THREE.Group(); navPivot.add(clone); navScene.add(navPivot);
  const fov = navCam.fov * Math.PI / 180;
  navCam.position.set(0, 0, radius / Math.sin(fov / 2) * 1.3); navCam.lookAt(0, 0, 0);
}

/* ---------------- drafting lines ---------------- */
/* the E disassembles into its own edges as it recedes mid-page: electric-blue
   struts sampled from the monument's wireframe fly outward and settle into calm
   horizontal drafting rules floating in the room — an exploded architect's
   drawing of the thing you were just looking at. built once from the model's
   own edges; invisible (opacity 0) whenever recede is 0 so the hero and footer
   choreography stay pixel-identical to before. */
let draft = null;
const _qInv = new THREE.Quaternion();   // reused every frame — no per-frame allocation
const _vp = new THREE.Vector3();
function hash01(n) {
  // deterministic per-index pseudo-random in [0,1) — stable build, never Math.random
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function buildDraftLines(src) {
  const cap = isMobile ? 80 : 160;                 // hard strut cap: phones carry fewer
  heroPivot.updateMatrixWorld(true);               // heroPivot is identity here; meshes get world matrices
  const invHero = new THREE.Matrix4().copy(heroPivot.matrixWorld).invert();
  const segs = [];                                 // edge struts, resolved into heroPivot's local frame
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), lm = new THREE.Matrix4();
  src.traverse(o => {
    if (!o.isMesh || !o.geometry) return;
    const eg = new THREE.EdgesGeometry(o.geometry, 25);   // creased edges only — the structural lines
    const ep = eg.getAttribute('position');
    lm.multiplyMatrices(invHero, o.matrixWorld);          // mesh-local → heroPivot-local: edges sit on the E
    for (let i = 0; i < ep.count; i += 2) {
      va.fromBufferAttribute(ep, i).applyMatrix4(lm);
      vb.fromBufferAttribute(ep, i + 1).applyMatrix4(lm);
      segs.push({ ax: va.x, ay: va.y, az: va.z, bx: vb.x, by: vb.y, bz: vb.z, len: va.distanceTo(vb) });
    }
    eg.dispose();
  });
  if (!segs.length) return;
  segs.sort((a, b) => b.len - a.len);              // keep the longest struts — structure, not noise
  const n = Math.min(cap, segs.length);
  const home = new Float32Array(n * 6);            // assembled endpoints, heroPivot-local
  const expl = new Float32Array(n * 6);            // exploded endpoints, already world-aligned targets
  const stag = new Float32Array(n);                // per-strut stagger so the shed ripples, not blocks
  const LEVELS = 6;
  for (let i = 0; i < n; i++) {
    const s = segs[i], o = i * 6;
    home[o] = s.ax; home[o + 1] = s.ay; home[o + 2] = s.az;
    home[o + 3] = s.bx; home[o + 4] = s.by; home[o + 5] = s.bz;
    const h1 = hash01(i + 1), h2 = hash01(i + 101), h3 = hash01(i + 211), h4 = hash01(i + 331);
    stag[i] = h4;
    const mx = (s.ax + s.bx) * 0.5, mz = (s.az + s.bz) * 0.5;   // strut midpoint
    let rl = Math.hypot(mx, mz); if (rl < 1e-3) rl = 1e-3;
    const dx = mx / rl, dz = mz / rl;                          // radial direction off the E's y-axis
    const dist = 3.5 + h1 * 3.5;                               // pushed 3.5..7 units out
    const cx = dx * dist + (h2 - 0.5) * 1.2;                   // horizontal spread + a touch of scatter
    let cz = -3 + dz * dist * 0.35;                            // depth spread, centred at world z -3
    cz = cz < -6 ? -6 : cz > -2 ? -2 : cz;                     // stay -2..-6, inside fog near-range 12/58
    const level = -1.5 + (Math.floor(h3 * LEVELS) / (LEVELS - 1)) * 4.0;   // one of 6 rules, y -1.5..2.5
    let L = s.len; L = L > 3 ? 3 : L < 0.6 ? 0.6 : L;          // a level line of its own length, 0.6..3
    const half = L * 0.5;
    expl[o] = cx - half; expl[o + 1] = level; expl[o + 2] = cz;        // horizontal: both ends equal y, equal z
    expl[o + 3] = cx + half; expl[o + 4] = level; expl[o + 5] = cz;
  }
  const pos = home.slice();                        // start assembled (and invisible)
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));   // 2 verts per strut
  const mat = new THREE.LineBasicMaterial({ color: 0x0000F2, transparent: true, opacity: 0, depthWrite: false, fog: true });
  const group = new THREE.Group();
  group.visible = false;                           // nothing to draw until the recede begins
  group.add(new THREE.LineSegments(geo, mat));
  heroPivot.add(group);                            // rides the hero; counter-transformed to world at full shed
  draft = { group, mat, posAttr: geo.getAttribute('position'), pos, home, exploded: expl, stagger: stag, count: n, prev: 0 };
}
/* per-frame shed, driven by the existing recede (0→1→0). the strut group is a
   child of heroPivot, so at recede 0 it coincides exactly with the visible E;
   as the shed completes we counter-rotate/translate the group toward world-axis-
   aligned, so the rules read level and hold still in the room while the E itself
   sinks into the fog. every temporary is reused — zero per-frame allocations. */
function updateDraftLines(recede) {
  if (!draft) return;
  if (recede === 0 && draft.prev === 0) return;    // hero + footer: zero cost, pixel-identical
  draft.prev = recede;
  const kG = recede * recede * (3 - 2 * recede);   // smoothstepped recede — drives opacity + counter-transform
  draft.group.visible = kG > 0;
  draft.mat.opacity = kG * 0.5;
  // cancel the hero's spin/drift in proportion to the shed: identity at k0, full inverse at k1
  _qInv.copy(heroPivot.quaternion).invert();
  draft.group.quaternion.set(0, 0, 0, 1).slerp(_qInv, kG);
  _vp.copy(heroPivot.position).applyQuaternion(_qInv).multiplyScalar(-kG);
  draft.group.position.copy(_vp);
  const home = draft.home, expl = draft.exploded, stag = draft.stagger, pos = draft.pos, n = draft.count;
  for (let i = 0; i < n; i++) {
    let ki = recede * 1.35 - stag[i] * 0.35;       // per-strut stagger ripples the disassembly
    ki = ki < 0 ? 0 : ki > 1 ? 1 : ki;
    ki = ki * ki * (3 - 2 * ki);
    const o = i * 6;
    pos[o]     = home[o]     + (expl[o]     - home[o])     * ki;
    pos[o + 1] = home[o + 1] + (expl[o + 1] - home[o + 1]) * ki;
    pos[o + 2] = home[o + 2] + (expl[o + 2] - home[o + 2]) * ki;
    pos[o + 3] = home[o + 3] + (expl[o + 3] - home[o + 3]) * ki;
    pos[o + 4] = home[o + 4] + (expl[o + 4] - home[o + 4]) * ki;
    pos[o + 5] = home[o + 5] + (expl[o + 5] - home[o + 5]) * ki;
  }
  draft.posAttr.needsUpdate = true;
}

/* the room's architecture — two flanking rows of hairline pillars receding to
   the horizon. static; the fog swallows them with distance, and the camera's
   pointer parallax slides them against everything else, which is what makes
   the room read as a real space instead of a backdrop. */
function makeColonnade() {
  const N = isMobile ? 5 : 9, pts = [];
  for (let s = -1; s <= 1; s += 2) for (let i = 0; i < N; i++) {
    const z = -6 - i * (isMobile ? 8 : 4.6);
    const x = s * (10 + i * 0.55);
    pts.push(x, FLOOR_Y, z, x, 6, z);              // the pillar
    pts.push(x - 0.6, 6, z, x + 0.6, 6, z);        // its capital
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({
    color: 0x0000F2, transparent: true, opacity: 0.10, depthWrite: false, fog: true }));
}

/* soft vertical veils of the page colour hung between floor and horizon —
   the air between the planes. they ARE the haze, so they ignore the fog. */
function makeHaze(z, w, h, op) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true,
      opacity: op, depthWrite: false, fog: false }));
  m.position.set(0, 2, z);
  return m;
}

function initGL() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(FOG, 12, 58);           // deep room — distance fades to the page colour
  pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 120);

  const key = new THREE.DirectionalLight(0xffffff, 2.5); key.position.set(4, 6, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.9); rim.position.set(-6, 2, -5); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.7); fill.position.set(3, -2, 6); scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));

  floor = makeFloor(); scene.add(floor.lines);
  scene.add(makeAbyss());
  glow = makeGlow(); scene.add(glow);
  dustNear = makeDust(isMobile ? 50 : 120, 26, [-3, 6], 0.045, isLight ? 0.4 : 0.5);
  dustFar  = makeDust(isMobile ? 60 : 160, 44, [-30, -8], 0.028, isLight ? 0.28 : 0.4);
  scene.add(dustNear); scene.add(dustFar);
  scene.add(makeColonnade());
  hazeA = makeHaze(-16, 64, 22, 0.06); scene.add(hazeA);
  hazeB = makeHaze(-28, 90, 30, 0.09); scene.add(hazeB);
  if (!isMobile) {
    // a few motes right up against the lens — the near layer moves fastest
    // under the pointer, and that speed gradient is what sells the depth.
    dustClose = makeDust(40, 22, [4, 9], 0.08, isLight ? 0.25 : 0.35);
    scene.add(dustClose);
  }

  new GLTFLoader().load('assets/monument-e.glb', (gltf) => {
    model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    model.position.sub(box.getCenter(new THREE.Vector3()));
    model.traverse(o => { if (o.isMesh && o.material) {
      o.material.envMapIntensity = 1.15;
      o.userData.baseCol = o.material.color.clone();   // remembered so we can lerp to ink on landing
      o.userData.baseEnv = 1.15;
      o.userData.baseMetal = o.material.metalness == null ? 0 : o.material.metalness;
    } });
    heroPivot = new THREE.Group(); heroPivot.add(model); scene.add(heroPivot);
    reflPivot = makeReflection(model); scene.add(reflPivot);
    if (!reduceMotion) buildDraftLines(model);   // cache the E's wireframe ghost, ready to shed on recede
    fitCamera(sphere.radius); onResize();
    introStart = clock.getElapsedTime();
    canvas.classList.add('ready');
    initNavMark(gltf.scene);
    if (reduceMotion) renderStatic();
    loadSetPieces();                    // the floor inscription arrives after the star of the show
  }, undefined, (err) => console.warn('E model failed to load', err));

  addEventListener('resize', onResize);
  if (reduceMotion) return;                       // static scene: no pointer coupling
  if (!isMobile) {
    addEventListener('pointermove', (e) => {
      pointer.x = (e.clientX / innerWidth) * 2 - 1;
      pointer.y = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
    addEventListener('pointerdown', () => spawnRipple());
  }
  // touch devices: the gravity floor follows the finger, then eases back to drift
  const onTouch = (e) => {
    const tch = e.touches && e.touches[0];
    if (!tch) return;
    pointer.x = (tch.clientX / innerWidth) * 2 - 1;
    pointer.y = (tch.clientY / innerHeight) * 2 - 1;
    touchTarget = 1;
  };
  addEventListener('touchstart', (e) => { onTouch(e); spawnRipple(); }, { passive: true });
  addEventListener('touchmove', onTouch, { passive: true });
  addEventListener('touchend', () => { touchTarget = 0; }, { passive: true });
  addEventListener('touchcancel', () => { touchTarget = 0; }, { passive: true });
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) requestAnimationFrame(loop); });
}

/* set pieces, loaded after the monument so they never delay it:
   — the moon hangs directly behind the E like a backlight, and follows the
     monument wherever the scroll choreography takes it — a slow eclipse
   — the "Elysium" wordmark lies flat on the gravity floor like a colossal
     ground inscription, revealed by fog + camera descent near the page end */
let moonHolder;
function loadSetPieces() {
  const loader = new GLTFLoader();
  loader.load('assets/moon.glb', (g) => {
    const m = g.scene;
    const box = new THREE.Box3().setFromObject(m);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    m.position.sub(box.getCenter(new THREE.Vector3()));
    moonHolder = new THREE.Group();
    moonHolder.add(m);
    moonHolder.scale.setScalar((isMobile ? 5.5 : 7) / sphere.radius);
    m.traverse(o => {
      if (o.isMesh && o.material) {
        o.material.emissive = new THREE.Color(0xffffff);
        o.material.emissiveIntensity = 0.55;      // the shine Luke likes
      }
    });
    scene.add(moonHolder);
    if (reduceMotion && heroPivot) {
      moonHolder.position.set(0, 0.2, -30);
      renderStatic();
    }
  }, undefined, () => {});
  loader.load('assets/wordmark-3d.glb', (g) => {
    const word = g.scene;
    const box = new THREE.Box3().setFromObject(word);
    word.position.sub(box.getCenter(new THREE.Vector3()));
    const size = box.getSize(new THREE.Vector3());
    const holder = new THREE.Group();
    holder.add(word);
    const s = (isMobile ? 13 : 20) / size.x;
    holder.scale.set(s, s, s * 0.3);            // squashed extrusion: carved, not walls
    holder.rotation.x = -Math.PI / 2;           // lie flat, face up
    holder.position.set(0, FLOOR_Y + 0.05, -30); // out by the horizon, inside the fog
    word.traverse(o => {
      if (o.isMesh && o.material) {
        o.material = o.material.clone();
        o.material.color = new THREE.Color(0xd9d5cd);
        o.material.roughness = 0.9;
        o.material.transparent = true;
        o.material.opacity = 0;
        inscriptionMats.push(o.material);
      }
    });
    scene.add(holder);
  }, undefined, () => {});
}

function spawnRipple(x, z) {
  if (ripples.length >= 4) ripples.shift();
  ripples.push({
    x: x !== undefined ? x : eased.x * floor.halfW * 0.7,
    z: z !== undefined ? z : eased.y * floor.halfD * 0.5,
    t0: clock.getElapsedTime(),
  });
}

function onResize() {
  if (!renderer) return;
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (model) { const box = new THREE.Box3().setFromObject(model); fitCamera(box.getBoundingSphere(new THREE.Sphere()).radius); }
  if (reduceMotion) renderStatic();
}

function scrollProgress() {
  const max = document.documentElement.scrollHeight - innerHeight;
  return max > 0 ? Math.min(window.scrollY / max, 1) : 0;
}

/* one composed frame for prefers-reduced-motion: the finished room, no animation */
function renderStatic() {
  if (!renderer || !heroPivot) return;
  updateFloor(0.8, 4, -6);
  heroPivot.rotation.set(0.06, 0.5, 0);
  heroPivot.position.set(isMobile ? 0.85 : 0.25, isMobile ? -1.9 : 0, 0);
  syncReflection();
  renderer.render(scene, camera);
  if (navPivot) { navPivot.rotation.copy(heroPivot.rotation); navR.render(navScene, navCam); }
}

function syncReflection() {
  if (!reflPivot || !heroPivot) return;
  reflPivot.rotation.y = heroPivot.rotation.y;
  reflPivot.rotation.x = -heroPivot.rotation.x;
  reflPivot.position.set(heroPivot.position.x, 2 * FLOOR_Y - heroPivot.position.y, heroPivot.position.z);
}

const clock = new THREE.Clock();
let lastT = 0;
let eDark = false;   // whether the footer E currently has fog disabled (so ink reads, not washed grey)
function loop() {
  if (!running || reduceMotion) return;
  requestAnimationFrame(loop);
  if (!renderer) return;
  const t = clock.getElapsedTime();
  const dt = lastT ? t - lastT : 1 / 60; lastT = t;
  // time-based easing: identical glide at 60fps or 5fps — on slow devices a
  // per-frame factor would leave the camera seconds behind the scroll.
  const ease = 1 - Math.exp(-dt * 4.5);
  pEased += (scrollProgress() - pEased) * ease;
  const p = pEased;
  const dd = p * p * (3 - 2 * p);                 // smoothstep of scroll depth

  // cinematic entrance: fog opens, the E rises out of the floor, camera settles
  let intro = 1;
  if (introStart >= 0 && t - introStart < 2.2) {
    const raw = (t - introStart) / 2.2;
    intro = raw * raw * (3 - 2 * raw);            // smoothstep
  }
  scene.fog.near = 12 - (1 - intro) * 5;
  scene.fog.far = 22 + intro * 36;

  const ease2 = 1 - Math.exp(-dt * 3.2);
  eased.x += (pointer.x - eased.x) * ease2;
  eased.y += (pointer.y - eased.y) * ease2;
  touchInfluence += (touchTarget - touchInfluence) * ease2;

  // ambient ripples keep the grid alive even when nobody moves
  if (t > nextAmbientRipple) {
    spawnRipple((Math.random() - 0.5) * floor.halfW * 1.2, (Math.random() - 0.7) * floor.halfD);
    nextAmbientRipple = t + 3.5 + Math.random() * 3;
  }

  // gravity floor dips toward the pointer. on touch it follows the finger and
  // blends back to a slow ambient drift once you lift off.
  let wx, wz;
  if (isMobile) {
    const driftX = Math.cos(t * 0.22) * 7, driftZ = Math.sin(t * 0.3) * 9;
    const tx = eased.x * floor.halfW * 0.7, tz = eased.y * floor.halfD * 0.5;
    wx = driftX + (tx - driftX) * touchInfluence;
    wz = driftZ + (tz - driftZ) * touchInfluence;
  } else {
    wx = eased.x * floor.halfW * 0.7; wz = eased.y * floor.halfD * 0.5;
  }
  updateFloor(t, wx, wz);

  dustNear.rotation.y = t * 0.02;
  dustNear.position.y = Math.sin(t * 0.1) * 0.3;
  dustNear.position.x = eased.x * 0.6;            // pointer parallax sells the depth
  dustFar.rotation.y = -t * 0.008;
  dustFar.position.x = eased.x * 0.2;
  if (dustClose) { dustClose.rotation.y = t * 0.03; dustClose.position.x = eased.x * 1.4; }
  if (hazeA) hazeA.position.x = Math.sin(t * 0.031) * 1.5;   // the air breathes, barely
  if (hazeB) hazeB.position.x = Math.cos(t * 0.023) * 2.2;

  glow.material.opacity = 0.5 + Math.sin(t * 0.9) * 0.14;
  glow.scale.setScalar(1 + Math.sin(t * 0.7) * 0.05);

  // the floor inscription surfaces from the fog as the camera nears the floor
  if (inscriptionMats.length) {
    const it = Math.max(0, Math.min(1, (p - 0.52) / 0.28));
    const o = it * it * (3 - 2 * it) * 0.7;
    for (const m of inscriptionMats) m.opacity = o;
  }

  // depth perception — start up high, descend toward the gravity floor as the page scrolls
  const settle = 1 + (1 - intro) * 0.4;           // entrance: camera drifts in from further out
  camera.position.y = (camDist * 0.18 + (-1.15 - camDist * 0.18) * dd) * settle + (1 - intro) * 1.2;
  camera.position.z = (camDist * 0.99 + (camDist * 0.78 - camDist * 0.99) * dd) * settle;
  // pointer parallax on the camera itself — the room pivots like a physical
  // space (the lookAt target stays put, so the view swings, never slides).
  // both axes are reassigned fresh every frame above, so nothing accumulates.
  const pk = isMobile ? 0.22 + 0.4 * touchInfluence : 1;
  camera.position.x = eased.x * 0.55 * pk;
  camera.position.y -= eased.y * 0.28 * pk;
  camera.lookAt(0, -0.35 - 1.05 * dd, -3.2 * dd);

  // shared transform — the nav E mirrors the hero's rotation exactly.
  const exitT = Math.max(0, Math.min(1, (p - 0.78) / 0.19));
  const exit = exitT * exitT;
  const rotY = t * 0.12 + p * Math.PI * 2.0 + eased.x * 0.45 + (1 - intro) * 0.9;
  const rotX = Math.sin(p * Math.PI) * 0.2 - eased.y * 0.2 - exit * 0.4;
  if (heroPivot) {
    heroPivot.rotation.y = rotY; heroPivot.rotation.x = rotX;
    // mid-page the monument recedes into the fog so the reading sections stay
    // clean, then it returns for the exit — depth choreography, not a fade.
    const midT = Math.max(0, Math.min(1, (p - 0.30) / 0.22));
    const backT = Math.max(0, Math.min(1, (p - 0.72) / 0.14));
    const recede = midT * midT * (3 - 2 * midT) * (1 - backT * backT * (3 - 2 * backT));
    const bx = (isMobile ? 0.85 : 0.25) - p * (isMobile ? 0 : 0.5) - recede * (isMobile ? 0.6 : 2.2);
    const by = Math.sin(t * 0.5) * 0.04 - p * 0.1 - (isMobile ? 1.9 : 0) - (1 - intro) * 3.2;
    const bz = -recede * 9;
    if (isMobile) {
      // phones: instead of flying up and out, the E glides straight DOWN into
      // the white footer and settles, centred at the bottom of the last screen.
      const land = [0, -2.35, -1.8];
      heroPivot.position.x = bx + (land[0] - bx) * exit;
      heroPivot.position.y = by + (land[1] - by) * exit;
      heroPivot.position.z = bz + (land[2] - bz) * exit;
      // as it settles on the white footer it swaps to a flat, UNLIT brand-ink
      // material so it reads as a crisp black E. The lit-for-dark original renders
      // washed-grey against white (bright scene lights + cream fog lift the albedo),
      // so darkening the colour alone isn't enough — go unlit.
      const wantDark = exit > 0.5;
      if (model && wantDark !== eDark) {
        eDark = wantDark;
        model.traverse(o => { if (o.isMesh && o.material) {
          if (!o.userData.litMat) o.userData.litMat = o.material;
          if (wantDark) {
            if (!o.userData.darkMat) o.userData.darkMat = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false, toneMapped: false });
            o.material = o.userData.darkMat;
          } else {
            o.material = o.userData.litMat;
          }
        } });
      }
      if (reflPivot) reflPivot.visible = exit < 0.5;   // drop the mirror as it lands (no washed double)
    } else {
      heroPivot.position.x = bx;
      heroPivot.position.z = bz;
      heroPivot.position.y = by + exit * 14;   // desktop: unchanged (rises up and out)
    }
    updateDraftLines(recede);   // shed the E's edges into drafting rules as it recedes, reassemble as it returns
    syncReflection();
  }
  if (moonHolder) {
    // the moon lives deep in the background and ORBITS with the scroll —
    // two full revolutions from top to footer, plus a slow idle drift.
    const a = p * Math.PI * 4 + t * 0.02;
    moonHolder.position.set(
      Math.sin(a) * 17,
      0.2 + Math.sin(a * 0.5) * 0.9,
      -42 + Math.cos(a) * 12);
    moonHolder.rotation.y = t * 0.05;             // its own slow spin
  }
  renderer.render(scene, camera);

  if (navPivot) {
    navPivot.rotation.y = rotY; navPivot.rotation.x = rotX;   // stays anchored, only rotates
    navR.render(navScene, navCam);
  }
}

window.__bg = {
  pause() { running = false; }, resume() { if (!running) { running = true; requestAnimationFrame(loop); } },
  loaded() { return !!model; },
  state() { return { pEased, pos: heroPivot ? heroPivot.position.toArray() : null }; },
};

try { initGL(); if (!reduceMotion) requestAnimationFrame(loop); }
catch (err) { console.warn('WebGL unavailable — static background.', err); canvas.style.display = 'none'; }
