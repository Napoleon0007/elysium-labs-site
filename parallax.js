/* Scroll-driven depth for Elysium Labs.
   The earned moments:
     1. the One-of-One film — a 3D slab that leans back, advances and settles
        as you scroll through its pinned section (the theatrical beat);
     2. the "What we do" cards — whole-card multiplane: staggered scroll drift,
        a slow idle float, and on desktop a pointer tilt that follows the
        cursor (the card is one composited element — its text rides with it,
        and the photo layer is a static background, so iOS never flickers);
     3. the Process steps — a whisper of staggered drift so the list reads
        as sheets at different depths.
   Everything else stays calm. Reduced motion: nothing runs; the page is whole
   without it. Only transforms are touched (no DOM structure / backdrop-filter
   churn), so it never fights the Three.js background scene. */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const film  = document.getElementById('story');
  const video = document.getElementById('filmband');
  const caps  = Array.from(document.querySelectorAll('.cap'));
  const steps = Array.from(document.querySelectorAll('.step'));
  if ((!film || !video) && !caps.length && !steps.length) return;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const isMobile = () => matchMedia('(max-width: 760px)').matches;
  let ticking = false;

  function frame() {
    ticking = false;
    const vh = innerHeight;
    const m = isMobile();

    // ---- 1. film: 3D parallax through the pinned section ----
    if (film && video) {
      const r = film.getBoundingClientRect();
      if (r.top < vh * 2 && r.bottom > -vh) {               // only near the viewport
        if (m) {
          // phones: no 3D overscan — the film is object-fit:contain, shown whole,
          // so any scale/tilt would crop the mockup back off the sides.
          video.style.setProperty('--film-rx', '0deg');
          video.style.setProperty('--film-sc', '1');
          video.style.setProperty('--film-ty', '0px');
        } else {
          const travel = Math.max(1, r.height - vh);
          const p = clamp(-r.top / travel, 0, 1);           // 0 entering pin -> 1 leaving
          const rx = 1.6 - 3.2 * p;                          // whisper of 3D tilt
          const sc = 1.05 + 0.04 * p;                        // minimal overscan: barely crops, still no bars
          const ty = 4 - 8 * p;                              // small drift, kept inside the tiny margin
          video.style.setProperty('--film-rx', rx.toFixed(2) + 'deg');
          video.style.setProperty('--film-sc', sc.toFixed(3));
          video.style.setProperty('--film-ty', ty.toFixed(1) + 'px');
        }
      }
    }

    // ---- 2. cards: staggered whole-card drift — neighbours separate as they pass ----
    if (caps.length) {
      const depth = m ? 12 : 26;
      caps.forEach((cap, i) => {
        const r = cap.getBoundingClientRect();
        if (r.bottom < -60 || r.top > vh + 60) return;
        const c = clamp((vh / 2 - (r.top + r.height / 2)) / vh, -1, 1);
        const lane = 0.7 + (i % 3) * 0.3;                    // 0.7 / 1.0 / 1.3 — depth lanes
        cap.style.setProperty('--cap-dy', (c * depth * lane).toFixed(1) + 'px');
      });
    }

    // ---- 3. steps: the process list drifts as sheets at different depths ----
    if (steps.length && !m) {
      steps.forEach((st, i) => {
        const r = st.getBoundingClientRect();
        if (r.bottom < -40 || r.top > vh + 40) return;
        const c = clamp((vh / 2 - (r.top + r.height / 2)) / vh, -1, 1);
        st.style.setProperty('--step-dy', (c * (6 + (i % 2) * 5)).toFixed(1) + 'px');
      });
    }
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  frame();   // set initial poses

  // ---- 4. desktop pointer tilt on the cards — the cursor tips the plane ----
  // pointer:fine only; lerp-smoothed in a small rAF loop that runs only while
  // a card is under the cursor (or is still settling), then stops dead.
  if (matchMedia('(pointer: fine)').matches) {
    const MAXDEG = 5.5, LERP = 0.12;
    let live = null;                     // the hovered card
    let last = null;                     // the card still settling back
    let tx = 0, ty = 0, rx = 0, ry = 0;  // target / current angles
    let raf = 0;

    const tick = () => {
      rx += (tx - rx) * LERP; ry += (ty - ry) * LERP;
      const el = live || last;
      if (el) {
        el.style.setProperty('--cap-rx', rx.toFixed(2) + 'deg');
        el.style.setProperty('--cap-ry', ry.toFixed(2) + 'deg');
      }
      if (live || Math.abs(rx) > 0.05 || Math.abs(ry) > 0.05) {
        raf = requestAnimationFrame(tick);
      } else {
        if (last) { last.style.setProperty('--cap-rx', '0deg'); last.style.setProperty('--cap-ry', '0deg'); }
        raf = 0;
      }
    };
    document.addEventListener('pointermove', (e) => {
      const cap = e.target && e.target.closest ? e.target.closest('.cap') : null;
      if (cap !== live) {
        if (live) { last = live; }
        live = cap;
        if (!cap) { tx = 0; ty = 0; }    // glide back to flat, then stop
      }
      if (cap) {
        last = null;
        const r = cap.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;    // -0.5 .. 0.5
        const py = (e.clientY - r.top) / r.height - 0.5;
        tx = -py * MAXDEG * 2;                               // tip toward the cursor
        ty = px * MAXDEG * 2;
      }
      if ((live || last) && !raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
  }
})();
