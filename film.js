/* One of One story film: the video plays BY ITSELF — it starts from the top when
   the section comes into view and the 7 story beats cross-fade in time with the
   video's own playback (not the scroll). Scrolling no longer drives it. */
(() => {
  const film = document.getElementById('story');
  const v = document.getElementById('filmband');
  if (!film || !v) return;

  v.src = matchMedia('(max-width: 760px)').matches ? 'assets/oneofone-tall.mp4' : 'assets/oneofone-wide.mp4';
  v.muted = true; v.playsInline = true; v.loop = true;
  const setRate = () => { try { v.playbackRate = 1.44; } catch (e) {} };   // sped up hard (was 1.2)
  v.addEventListener('loadedmetadata', setRate);
  setRate();

  const beats = Array.from(film.querySelectorAll('.fbeat'));
  const bar = film.querySelector('.film-progress i');
  if (!beats.length) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // reduced motion: no video choreography — show every beat, stacked
  if (reduce) { beats.forEach(b => b.classList.add('on')); return; }

  // beats + progress ride the VIDEO's own clock
  let active = -1;
  const sync = () => {
    const d = v.duration || 0;
    if (!d) return;
    const p = Math.min(Math.max(v.currentTime / d, 0), 1);
    if (bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    const i = Math.min(beats.length - 1, Math.floor(p * beats.length));
    if (i !== active) {
      active = i;
      beats.forEach((b, idx) => b.classList.toggle('on', idx === i));
    }
  };
  v.addEventListener('timeupdate', sync);
  v.addEventListener('loadedmetadata', sync);

  // start from the top when the film arrives on screen; pause when it leaves
  const stick = film.querySelector('.film-sticky') || film;
  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      try { v.currentTime = 0; } catch (e) {}
      const pr = v.play();
      if (pr && pr.catch) pr.catch(() => {});
    } else {
      v.pause();
    }
  }, { threshold: 0.5 }).observe(stick);

  sync();
})();
