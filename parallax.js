/* Scroll-driven depth for Elysium Labs.
   Two earned moments, no fade-rise-on-everything:
     1. the One-of-One film — a 3D slab that leans back, advances and settles
        as you scroll through its pinned section (the theatrical beat);
     2. the "What we do" cards — the photo drifts inside each frame for depth.
   Everything else stays calm. Reduced motion: nothing runs; the page is whole
   without it. Only transforms are touched (no DOM structure / backdrop-filter
   churn), so it never fights the Three.js background scene. */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const film  = document.getElementById('story');
  const video = document.getElementById('filmband');
  const caps  = Array.from(document.querySelectorAll('.cap'));
  if ((!film || !video) && !caps.length) return;

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
        const travel = Math.max(1, r.height - vh);
        const p = clamp(-r.top / travel, 0, 1);             // 0 entering pin -> 1 leaving
        const K = m ? 0.6 : 1;                              // gentler on phones
        const rx = (5 - 10 * p) * K;                        // lean back -> flat -> forward
        const sc = 1 + (-0.08 + 0.12 * p) * K;             // 0.92 -> 1.04 (desktop)
        const ty = (20 - 40 * p) * K;                       // vertical drift
        video.style.setProperty('--film-rx', rx.toFixed(2) + 'deg');
        video.style.setProperty('--film-sc', sc.toFixed(3));
        video.style.setProperty('--film-ty', ty.toFixed(1) + 'px');
      }
    }

    // ---- 2. cards: the photo drifts inside each frame ----
    if (caps.length) {
      const depth = m ? 10 : 22;
      for (const cap of caps) {
        const r = cap.getBoundingClientRect();
        if (r.bottom < -40 || r.top > vh + 40) continue;
        const c = (vh / 2 - (r.top + r.height / 2)) / vh;   // ~-0.6..0.6 as it passes
        cap.style.setProperty('--cap-par', (clamp(c, -1, 1) * depth).toFixed(1) + 'px');
      }
    }
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  frame();   // set initial poses
})();
