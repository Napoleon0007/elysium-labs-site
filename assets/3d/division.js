/* The 3D Division — page behaviour.
 *
 * Two things: the contour survey drawn behind the whole document, and the
 * scroll reveals. Ported from the Signature proposal so the page moves the
 * same way it does.
 */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------- reveals ---- */
  const items = [...document.querySelectorAll('.rv')];
  if (reduced || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('in'));
  } else {
    items.forEach(el => {
      const sibs = [...el.parentElement.children].filter(c => c.classList.contains('rv'));
      el.style.transitionDelay = `${Math.min(sibs.indexOf(el), 6) * 70}ms`;
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
    items.forEach(el => io.observe(el));
    requestAnimationFrame(() => {
      items.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) el.classList.add('in');
      });
    });
  }

  /* -------------------------------- background contour survey ------------
   * Marching squares over a value-noise field — the same drawing that sits
   * behind the proposal. Skipped entirely under reduced motion (the CSS
   * hides the canvas too).
   */
  const c = document.getElementById('contours');
  if (!c || reduced) return;
  const x = c.getContext('2d');
  if (!x) return;

  function noise(px, py) {
    let t = 0, a = 1, f = 0.9, s = 0;
    const h = (u, v) => {
      let n = u * 374761393 + v * 668265263;
      n = (n ^ (n >> 13)) * 1274126177;
      return ((n ^ (n >> 16)) >>> 0) / 4294967295;
    };
    for (let i = 0; i < 4; i++) {
      const xi = Math.floor(px * f), yi = Math.floor(py * f);
      const xf = px * f - xi, yf = py * f - yi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const n = h(xi, yi) * (1 - u) * (1 - v) + h(xi + 1, yi) * u * (1 - v)
              + h(xi, yi + 1) * (1 - u) * v + h(xi + 1, yi + 1) * u * v;
      t += n * a; s += a; a *= 0.5; f *= 2.1;
    }
    return t / s;
  }

  function draw() {
    const W = c.width = innerWidth, H = c.height = innerHeight;
    const css = getComputedStyle(document.documentElement);
    x.clearRect(0, 0, W, H);
    x.strokeStyle = css.getPropertyValue('--sage').trim() || '#A3B2A0';
    x.globalAlpha = 0.32; x.lineWidth = 1;

    const step = 9, cols = Math.ceil(W / step) + 1, rows = Math.ceil(H / step) + 1;
    const F = new Float32Array(cols * rows);
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++)
        F[j * cols + i] = noise(i * step / 540, j * step / 540);

    const ip = (v0, v1, p0, p1, lv) => p0 + (p1 - p0) * ((lv - v0) / (v1 - v0));
    const seg = (p, q) => { x.moveTo(p.x, p.y); x.lineTo(q.x, q.y); };

    for (let L = 1; L < 11; L++) {
      const lv = L / 11;
      x.beginPath();
      for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
          const x0 = i * step, y0 = j * step, x1 = x0 + step, y1 = y0 + step;
          // NB: never name a local `c` in here — it would shadow the canvas.
          const va = F[j * cols + i], vb = F[j * cols + i + 1],
                vc = F[(j + 1) * cols + i + 1], vd = F[(j + 1) * cols + i];
          const k = (va > lv ? 8 : 0) | (vb > lv ? 4 : 0) | (vc > lv ? 2 : 0) | (vd > lv ? 1 : 0);
          if (k === 0 || k === 15) continue;
          const T = { x: ip(va, vb, x0, x1, lv), y: y0 },
                R = { x: x1, y: ip(vb, vc, y0, y1, lv) },
                B = { x: ip(vd, vc, x0, x1, lv), y: y1 },
                Lf = { x: x0, y: ip(va, vd, y0, y1, lv) };
          if (k === 1 || k === 14) seg(Lf, B);
          else if (k === 2 || k === 13) seg(B, R);
          else if (k === 3 || k === 12) seg(Lf, R);
          else if (k === 4 || k === 11) seg(T, R);
          else if (k === 6 || k === 9) seg(T, B);
          else if (k === 7 || k === 8) seg(Lf, T);
          else if (k === 5) { seg(Lf, T); seg(B, R); }
          else if (k === 10) { seg(Lf, B); seg(T, R); }
        }
      }
      x.stroke();
    }
  }

  draw();
  let t;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 220); }, { passive: true });
})();
