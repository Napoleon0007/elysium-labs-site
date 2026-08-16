/* The 3D Division — page behaviour.
 *
 * Deliberately small. The homepage's main.js is a Three.js scene bound to
 * elements that don't exist here, and its reveal observer only starts on the
 * preloader's `elysium:reveal` event, so this page carries its own.
 *
 * Two jobs: stagger the reveals, and drift the hero photograph against the
 * scroll. Nothing else runs.
 */
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------- reveals ---- */
  const items = [...document.querySelectorAll('.reveal')];

  if (reduced || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('in'));
  } else {
    // Stagger within a group so a grid lands as a wave, not all at once.
    items.forEach(el => {
      const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
      el.style.transitionDelay = `${Math.min(sibs.indexOf(el), 7) * 70}ms`;
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    items.forEach(el => io.observe(el));

    // Anything already on screen at load (the hero) should not wait for a scroll.
    requestAnimationFrame(() => {
      items.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) el.classList.add('in');
      });
    });
  }

  /* ----------------------------------------------------- hero parallax --- */
  // The layer is overscanned 8% top and bottom in CSS, so it can travel without
  // ever exposing an edge. Capped well inside that budget.
  const img = document.querySelector('.d-hero-img');
  const hero = document.querySelector('.d-hero');

  if (img && hero && !reduced) {
    let ticking = false;

    const draw = () => {
      ticking = false;
      const h = hero.offsetHeight || 1;
      const past = Math.min(Math.max(-hero.getBoundingClientRect().top, 0), h);
      img.style.transform = `translate3d(0, ${(past * 0.18).toFixed(1)}px, 0)`;
    };

    addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(draw);
    }, { passive: true });

    draw();
  }

  /* --------------------------------------------------------- footer yr --- */
  const yr = document.getElementById('yr');
  if (yr) yr.textContent = String(new Date().getFullYear());
})();
