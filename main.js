// Elysium Labs — site interactions.
// Fixed 3D scene: the Monumental E (always turning + scroll-reactive) floating over a
// neon-green "gravity grid" that bends toward the cursor, in a soft atmospheric space.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = matchMedia('(max-width: 760px)').matches;
const isLight = document.body.dataset.theme === 'light';

/* ---------------- reveals ---------------- */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
document.querySelectorAll('.reveal').forEach((el) => {
  const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
  el.style.transitionDelay = (Math.min(sibs.indexOf(el), 6) * 60) + 'ms';
  io.observe(el);
});

/* ---------------- nav state ---------------- */
const nav = document.getElementById('nav');
const onScrollNav = () => nav.classList.toggle('scrolled', window.scrollY > 24);
onScrollNav();
addEventListener('scroll', onScrollNav, { passive: true });

/* ---------------- 3D background ---------------- */
const canvas = document.getElementById('bg');
let renderer, scene, camera, pmrem, model, heroPivot, grid, particles;
let navR, navScene, navCam, navPivot;   // tiny corner E, synced to the hero
let running = true;
const pointer = { x: 0, y: 0 };
const eased = { x: 0, y: 0 };

function fitCamera(radius) {
  const fovV = camera.fov * Math.PI / 180;
  const distV = radius / Math.sin(fovV / 2);
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * camera.aspect);
  const distH = radius / Math.sin(fovH / 2);
  const margin = isMobile ? 2.15 : 1.34;     // smaller, less dominant on phones
  camera.position.set(0, 0, Math.max(distV, distH) * margin);
  camera.lookAt(0, 0, 0);
}

/* gravity grid — a frontal fabric of green lines that dips toward the cursor */
function makeGrid() {
  const W = 36, H = 22, NX = isMobile ? 30 : 48, NY = isMobile ? 20 : 30;
  const cols = NX + 1, rows = NY + 1, base = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++)
    base.push([-W / 2 + (i / NX) * W, -H / 2 + (j / NY) * H]);
  const idx = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols - 1; i++) { const a = j * cols + i; idx.push(a, a + 1); }
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols; i++) { const a = j * cols + i; idx.push(a, a + cols); }
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(base.length * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const mat = new THREE.LineBasicMaterial({
    color: isLight ? 0x12a866 : 0x39ff88,
    transparent: true, opacity: isLight ? 0.2 : 0.14,
    blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false });
  const lines = new THREE.LineSegments(geo, mat);
  lines.position.z = -5.5;
  return { lines, base, pos, geo, halfW: W / 2, halfH: H / 2 };
}
function updateGrid(t, wx, wy) {
  const { base, pos, geo } = grid, sig = 3.1, amp = 1.7;
  for (let k = 0; k < base.length; k++) {
    const x = base[k][0], y = base[k][1];
    const dx = x - wx, dy = y - wy;
    const well = -amp * Math.exp(-(dx * dx + dy * dy) / (2 * sig * sig));
    const wave = 0.16 * Math.sin(x * 0.55 + t * 0.7) + 0.16 * Math.cos(y * 0.5 + t * 0.55);
    pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = well + wave;
  }
  geo.attributes.position.needsUpdate = true;
}

/* faint drifting dust for atmosphere */
function makeParticles() {
  const n = isMobile ? 90 : 240, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { p[i*3]=(Math.random()-0.5)*34; p[i*3+1]=(Math.random()-0.5)*20; p[i*3+2]=-3-Math.random()*9; }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ color: isLight ? 0x3a3a3a : 0xbfeede, size: 0.035, transparent: true, opacity: isLight ? 0.3 : 0.5, depthWrite: false });
  return new THREE.Points(g, m);
}

/* tiny corner E in the nav — same model, driven by the same transforms as the hero */
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
  clone.position.set(0, 0, 0); clone.updateMatrixWorld(true);   // ignore the hero's offset
  const box = new THREE.Box3().setFromObject(clone);
  const radius = box.getBoundingSphere(new THREE.Sphere()).radius;
  clone.position.sub(box.getCenter(new THREE.Vector3()));        // center the clone on its own bounds
  navPivot = new THREE.Group(); navPivot.add(clone); navScene.add(navPivot);
  const fov = navCam.fov * Math.PI / 180;
  navCam.position.set(0, 0, radius / Math.sin(fov / 2) * 1.3); navCam.lookAt(0, 0, 0);
}

function initGL() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  scene = new THREE.Scene();
  pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 100);

  // moody charcoal lighting
  const key = new THREE.DirectionalLight(0xffffff, 2.5); key.position.set(4, 6, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.9); rim.position.set(-6, 2, -5); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.7); fill.position.set(3, -2, 6); scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));

  grid = makeGrid(); scene.add(grid.lines);
  particles = makeParticles(); scene.add(particles);

  new GLTFLoader().load('assets/monument-e.glb', (gltf) => {
    model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    model.position.sub(box.getCenter(new THREE.Vector3()));
    model.traverse(o => { if (o.isMesh && o.material) { o.material.envMapIntensity = 1.15; } });
    heroPivot = new THREE.Group(); heroPivot.add(model); scene.add(heroPivot);
    fitCamera(sphere.radius); onResize();
    canvas.classList.add('ready');
    initNavMark(gltf.scene);
  }, undefined, (err) => console.warn('E model failed to load', err));

  addEventListener('resize', onResize);
  if (!isMobile) addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) requestAnimationFrame(loop); });
}

function onResize() {
  if (!renderer) return;
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (model) { const box = new THREE.Box3().setFromObject(model); fitCamera(box.getBoundingSphere(new THREE.Sphere()).radius); }
}

function scrollProgress() {
  const max = document.documentElement.scrollHeight - innerHeight;
  return max > 0 ? Math.min(window.scrollY / max, 1) : 0;
}

const clock = new THREE.Clock();
function loop() {
  if (!running) return;
  requestAnimationFrame(loop);
  if (!renderer) return;
  const t = clock.getElapsedTime();
  const p = scrollProgress();

  eased.x += (pointer.x - eased.x) * 0.05;
  eased.y += (pointer.y - eased.y) * 0.05;

  // gravity grid follows cursor (or slowly orbits on touch devices)
  let wx, wy;
  if (isMobile) { wx = Math.cos(t * 0.25) * grid.halfW * 0.4; wy = Math.sin(t * 0.32) * grid.halfH * 0.4; }
  else { wx = eased.x * grid.halfW * 0.85; wy = -eased.y * grid.halfH * 0.85; }
  updateGrid(t, wx, wy);
  particles.rotation.y = t * 0.02;
  particles.position.y = Math.sin(t * 0.1) * 0.3;

  // shared transform — the nav E mirrors the hero exactly.
  // near the bottom the E launches up and out of frame; pure function of scroll, so it returns on the way back up.
  const exitT = Math.max(0, Math.min(1, (p - 0.78) / 0.19));
  const exit = exitT * exitT;                  // ease-in: accelerates upward ("shoots")
  const rotY = t * 0.12 + p * Math.PI * 2.0 + eased.x * 0.45;
  const rotX = Math.sin(p * Math.PI) * 0.2 - eased.y * 0.2 - exit * 0.4;
  if (heroPivot) {
    const pivot = heroPivot;
    pivot.rotation.y = rotY; pivot.rotation.x = rotX;
    pivot.position.x = (isMobile ? 0 : 0.25) - p * (isMobile ? 0 : 0.5);
    pivot.position.y = Math.sin(t * 0.5) * 0.04 - p * 0.1 + exit * 14 - (isMobile ? 0.8 : 0);
  }
  renderer.render(scene, camera);

  if (navPivot) {
    // stays anchored in the corner the whole time — only mirrors the hero's rotation
    navPivot.rotation.y = rotY; navPivot.rotation.x = rotX;
    navR.render(navScene, navCam);
  }
}

window.__bg = { pause(){ running = false; }, resume(){ if (!running) { running = true; requestAnimationFrame(loop); } }, loaded(){ return !!model; } };

try { initGL(); requestAnimationFrame(loop); }
catch (err) { console.warn('WebGL unavailable — static background.', err); canvas.style.display = 'none'; }
