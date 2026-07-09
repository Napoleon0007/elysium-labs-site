/* One of One scroll-film: the film pins full-view and the 7 story beats
   cross-fade as you scroll through it. Motion is opacity/transform only,
   throttled with rAF, and only computed while the section is on screen. */
(() => {
  const film = document.getElementById('story');
  const v = document.getElementById('filmband');
  if (!v) return;

  // responsive source + 30% faster playback
  v.src = matchMedia('(max-width: 760px)').matches ? 'assets/oneofone-tall.mp4' : 'assets/oneofone-wide.mp4';
  const setRate = () => { try { v.playbackRate = 1.3; } catch (e) {} };
  v.addEventListener('loadedmetadata', setRate);
  setRate();

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) { v.autoplay = true; const p = v.play && v.play(); if (p) p.catch(() => {}); }

  const beats = film ? Array.from(film.querySelectorAll('.fbeat')) : [];
  const bar = film ? film.querySelector('.film-progress i') : null;
  if (!film || !beats.length) return;

  // reduced motion: no scroll choreography — show every beat, stacked
  if (reduce) { beats.forEach(b => b.classList.add('on')); return; }

  let active = -1, ticking = false, inView = false;

  const update = () => {
    ticking = false;
    const total = film.offsetHeight - window.innerHeight;
    const p = total > 0
      ? Math.min(Math.max(-film.getBoundingClientRect().top / total, 0), 1)
      : 0;
    if (bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    const i = Math.min(beats.length - 1, Math.floor(p * beats.length));
    if (i !== active) {
      active = i;
      beats.forEach((b, idx) => b.classList.toggle('on', idx === i));
    }
  };

  const onScroll = () => {
    if (!ticking && inView) { ticking = true; requestAnimationFrame(update); }
  };

  new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    if (inView) update();
  }, { threshold: 0 }).observe(film);

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => requestAnimationFrame(update), { passive: true });
  update();
})();
