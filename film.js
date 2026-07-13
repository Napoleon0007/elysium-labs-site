/* One of One story film: the video plays BY ITSELF — it starts from the top when
   the section comes into view and the 7 story beats cross-fade in time with the
   video's own playback (not the scroll). Scrolling no longer drives it. */
(() => {
  const film = document.getElementById('story');
  const v = document.getElementById('filmband');
  if (!film || !v) return;

  v.src = matchMedia('(max-width: 760px)').matches ? 'assets/oneofone-tall.mp4' : 'assets/oneofone-wide.mp4';
  v.muted = true; v.playsInline = true; v.loop = true;
  // Blast through the "every website looks the same" intro, then settle into the
  // story pace so the choosing + hero beats arrive fast. Beats are tied to the
  // clock, so a quicker intro reaches them sooner.
  const rateFor = () => {
    const d = v.duration || 0;
    if (!d) return 1.44;
    const f = v.currentTime / d;
    if (f < 0.24) return 2.3;                                        // fast intro
    if (f < 0.36) return 2.3 + (1.44 - 2.3) * ((f - 0.24) / 0.12);   // ease back
    return 1.44;                                                     // story pace
  };
  const setRate = () => { try { v.playbackRate = rateFor(); } catch (e) {} };
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
    try { v.playbackRate = rateFor(); } catch (e) {}
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

  let inView = false;

  // a "tap to play" affordance — only revealed if iOS blocks muted autoplay
  const tap = document.createElement('button');
  tap.type = 'button';
  tap.className = 'film-tap';
  tap.setAttribute('aria-label', 'Play the film');
  stick.appendChild(tap);

  const cleared = () => film.classList.remove('film-blocked');   // it's playing now
  v.addEventListener('playing', cleared);
  v.addEventListener('timeupdate', () => { if (v.currentTime > 0.05) cleared(); });

  const attempt = () => { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); };

  // Nudge playback several times before giving up — iOS often allows muted
  // autoplay only on the 2nd or 3rd try. The tap-to-play button appears ONLY
  // if it's still stuck after ~2.5s, which in practice means Low Power Mode
  // (iOS blocks all autoplay there and nothing but a real tap will start it).
  let tries = 0;
  const ensurePlaying = () => {
    if (!inView) return;
    if (!v.paused && v.currentTime > 0.05) { cleared(); return; }
    attempt();
    if (++tries < 8) setTimeout(ensurePlaying, 300);
    else film.classList.add('film-blocked');
  };

  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      inView = true;
      tries = 0;
      film.classList.remove('film-blocked');
      if (v.readyState >= 1) { try { v.currentTime = 0; } catch (e) {} }
      ensurePlaying();
    } else {
      inView = false;
      film.classList.remove('film-blocked');
      v.pause();
    }
  }, { threshold: 0.5 }).observe(stick);

  // iOS unlocks media on a real tap (scrolling doesn't count): the visitor's
  // first tap anywhere, or on the button, starts the film if it was blocked.
  const unlock = () => { if (inView && v.paused) attempt(); };
  document.addEventListener('touchend', unlock, { passive: true });
  document.addEventListener('click', unlock);
  tap.addEventListener('click', (e) => { e.stopPropagation(); attempt(); });

  sync();
})();
