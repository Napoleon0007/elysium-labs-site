// Elysium Labs — site interactions.
// A deep white room: the Monumental E floats in soft fog over a grey "gravity floor"
// grid that recedes into the distance and ripples toward the cursor. A synced mini-E in the nav.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = matchMedia('(max-width: 760px)').matches;
const isLight = document.body.dataset.theme === 'light';
const FOG = isLight ? 0xf3f0ea : 0x070707;

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

/* ---------------- 3D scene ---------------- */
const canvas = document.getElementById('bg');
let renderer, scene, camera, pmrem, model, heroPivot, floor, particles;
let navR, navScene, navCam, navPivot;
let camDist = 0;
let running = true;
const pointer = { x: 0, y: 0 };
const eased = { x: 0, y: 0 };

function fitCamera(radius) {
  const fovV = camera.fov * Math.PI / 180;
  const distV = radius / Math.sin(fovV / 2);
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * camera.aspect);
  const distH = radius / Math.sin(fovH / 2);
  const margin = isMobile ? 2.15 : 1.34;
  const d = Math.max(distV, distH) * margin;
  camDist = d;
  camera.position.set(0, d * 0.18, d * 0.99);   // raised + tilted down so the floor reads
  camera.lookAt(0, -0.35, 0);
}

/* gravity floor — a recessed grid that dips toward the cursor and fades into fog */
function makeFloor() {
  const W = 30, D = 38, NX = isMobile ? 24 : 40, ND = isMobile ? 30 : 48;
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
    color: isLight ? 0x1f1b16 : 0x39ff88,
    transparent: true, opacity: isLight ? 0.26 : 0.16,
    blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    depthWrite: false, fog: true });
  const lines = new THREE.LineSegments(geo, mat);
  lines.position.set(0, -2.1, -10);
  return { lines, base, pos, geo, halfW: W / 2, halfD: D / 2 };
}
function updateFloor(t, wx, wz) {
  const { base, pos, geo } = floor, sig = 3.5, amp = 1.7;
  for (let k = 0; k < base.length; k++) {
    const x = base[k][0], z = base[k][1];
    const dx = x - wx, dz = z - wz;
    const well = -amp * Math.exp(-(dx * dx + dz * dz) / (2 * sig * sig));
    const wave = 0.13 * Math.sin(x * 0.5 + t * 0.65) + 0.13 * Math.cos(z * 0.42 + t * 0.5);
    pos[k * 3] = x; pos[k * 3 + 1] = well + wave; pos[k * 3 + 2] = z;
  }
  geo.attributes.position.needsUpdate = true;
}

/* faint drifting dust for atmosphere */
function makeParticles() {
  const n = isMobile ? 70 : 200, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { p[i*3]=(Math.random()-0.5)*26; p[i*3+1]=(Math.random()-0.5)*14; p[i*3+2]=-4-Math.random()*12; }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ color: isLight ? 0x6b655c : 0xbfeede, size: 0.03, transparent: true, opacity: isLight ? 0.35 : 0.5, depthWrite: false, fog: true });
  return new THREE.Points(g, m);
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

function initGL() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(FOG, 11, 46);           // deep room — distance fades to the page colour
  pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 100);

  const key = new THREE.DirectionalLight(0xffffff, 2.5); key.position.set(4, 6, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.9); rim.position.set(-6, 2, -5); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.7); fill.position.set(3, -2, 6); scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));

  floor = makeFloor(); scene.add(floor.lines);
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

  // gravity floor dips toward the cursor (slow drift on touch devices)
  let wx, wz;
  if (isMobile) { wx = Math.cos(t * 0.22) * 7; wz = Math.sin(t * 0.3) * 9; }
  else { wx = eased.x * floor.halfW * 0.7; wz = eased.y * floor.halfD * 0.5; }
  updateFloor(t, wx, wz);
  particles.rotation.y = t * 0.02;
  particles.position.y = Math.sin(t * 0.1) * 0.3;

  // depth perception — start up high, descend toward the gravity floor as the page scrolls
  const dd = p * p * (3 - 2 * p);                       // smoothstep ease
  camera.position.y = camDist * 0.18 + (-1.15 - camDist * 0.18) * dd;
  camera.position.z = camDist * 0.99 + (camDist * 0.78 - camDist * 0.99) * dd;
  camera.lookAt(0, -0.35 - 1.05 * dd, -3.2 * dd);

  // shared transform — the nav E mirrors the hero's rotation exactly.
  const exitT = Math.max(0, Math.min(1, (p - 0.78) / 0.19));
  const exit = exitT * exitT;
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
    navPivot.rotation.y = rotY; navPivot.rotation.x = rotX;   // stays anchored, only rotates
    navR.render(navScene, navCam);
  }
}

window.__bg = { pause() { running = false; }, resume() { if (!running) { running = true; requestAnimationFrame(loop); } }, loaded() { return !!model; } };

try { initGL(); requestAnimationFrame(loop); }
catch (err) { console.warn('WebGL unavailable — static background.', err); canvas.style.display = 'none'; }
