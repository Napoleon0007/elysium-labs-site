// Elysium Labs concierge — a scripted studio bot. No backend, no tracking:
// it knows the studio, answers instantly, and hands real conversations to
// WhatsApp or email. Swap ANSWERS/match() for a Worker + LLM later without
// touching the shell.
(function () {
  'use strict';

  const WA = 'https://wa.me/27609371148';
  const MAIL = 'studio@elysiumlabs.co.za';

  /* ---------------- the knowledge ---------------- */
  const ANSWERS = {
    build: {
      q: 'What do you build?',
      a: 'Pretty much anything with a screen:\n• Websites & landing pages — designed, written and live in days\n• Playable brand games — physics, prizes, leaderboards, in the browser\n• Score & qualifier apps — they interview your customers so you don’t have to\n• Software & dashboards — tools that quietly do the admin\n• 3D & motion — WebGL scenes like the room you’re floating in now\n\nEverything is designed, written and built end to end by one studio.',
    },
    price: {
      q: 'What does it cost?',
      a: 'It depends on the build, but plainly:\n• Landing pages are the fastest and most affordable — live in days\n• Full brand sites, games and apps are quoted per project after a short scope call\n• Care & hosting — we host it, watch it and keep it sharp from R350/month\n\nTell us what you need and you’ll have a straight answer within a day.',
    },
    process: {
      q: 'How does it work?',
      a: 'Four steps, no mystery:\n1. Scope — we learn your business and pin down what moves the needle\n2. Design — a direction you sign off before a line of code is written\n3. Build — production-grade, mobile-first, sub-second fast\n4. Launch — live, measured and yours. We stay on call after.',
    },
    speed: {
      q: 'How fast can you deliver?',
      a: 'A landing page can be designed, written and live within days. Bigger builds — full sites, games, apps — get an honest timeline at scoping, and we hit it. Mobile-first and sub-second fast is the standard, not an extra.',
    },
    who: {
      q: 'Who are you?',
      a: 'Elysium Labs is a digital studio on the Garden Route, South Africa. One studio, end to end: strategy, design and code under the same roof — which is why things ship fast and nothing gets lost between departments. We build things. This site is the portfolio.',
    },
    hosting: {
      q: 'Do you do hosting?',
      a: 'Yes — Care & Hosting from R350/month. We host it, monitor it, keep it fast and keep it sharp. You own everything; we just make sure it never embarrasses you at 2am.',
    },
    industries: {
      q: 'Which industries?',
      a: 'Guest houses and hospitality, breweries, property developments, artists and creators — and we’re built to work across many more. If your business refuses to look ordinary, we’re a fit.',
    },
    start: {
      q: 'Start a project',
      a: 'Easy — tell us about it on WhatsApp or email and you’ll hear back within a day:',
      actions: true,
    },
  };

  const KEYWORDS = [
    [/price|cost|charge|rand|r\d|budget|expensive|cheap|quote/i, 'price'],
    [/host|maintain|care|server|domain|uptime/i, 'hosting'],
    [/process|how (do|does) (it|you)|steps|work\b/i, 'process'],
    [/fast|quick|time|long|deadline|days|deliver/i, 'speed'],
    [/who|about|where|studio|team|garden route/i, 'who'],
    [/industr|hotel|guest|brewer|property|restaurant|shop/i, 'industries'],
    [/build|make|do you|website|site|game|app|3d|software|landing|dashboard|score/i, 'build'],
    [/start|begin|project|hire|contact|talk|touch|quote/i, 'start'],
  ];

  /* ---------------- the shell ---------------- */
  const root = document.createElement('div');
  root.id = 'concierge';
  root.innerHTML = `
    <button id="cg-fab" aria-label="Chat with Elysium Labs" aria-expanded="false">
      <svg id="botsvg" viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <radialGradient id="cg-body" cx="40%" cy="28%" r="82%">
            <stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#eef0f6"/><stop offset="1" stop-color="#c6cad8"/>
          </radialGradient>
          <linearGradient id="cg-visor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#3350dd"/><stop offset=".5" stop-color="#1a2a9e"/><stop offset="1" stop-color="#0c1245"/>
          </linearGradient>
          <linearGradient id="cg-teal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#7fe9ef"/><stop offset="1" stop-color="#2eb6c0"/>
          </linearGradient>
          <radialGradient id="cg-ball" cx="35%" cy="30%" r="75%">
            <stop offset="0" stop-color="#c3f7fa"/><stop offset="1" stop-color="#37c2cc"/>
          </radialGradient>
        </defs>
        <g id="botAll">
          <rect x="58" y="5" width="4" height="13" rx="2" fill="#cdd2df"/>
          <circle cx="60" cy="5" r="5" fill="url(#cg-ball)"/>
          <g id="armL" class="arm"><rect x="22" y="68" width="13" height="30" rx="6.5" fill="url(#cg-body)"/><circle cx="28.5" cy="98" r="8" fill="url(#cg-teal)"/><circle cx="26" cy="95" r="2.4" fill="#ffffff" opacity=".5"/></g>
          <g id="armR" class="arm"><rect x="85" y="68" width="13" height="30" rx="6.5" fill="url(#cg-body)"/><circle cx="91.5" cy="98" r="8" fill="url(#cg-teal)"/><circle cx="89" cy="95" r="2.4" fill="#ffffff" opacity=".5"/></g>
          <ellipse cx="60" cy="83" rx="30" ry="25" fill="url(#cg-body)"/>
          <ellipse cx="60" cy="64" rx="23" ry="7" fill="#1a1f3a" opacity=".06"/>
          <path d="M46 81 Q60 103 74 81 Q60 91 46 81Z" fill="url(#cg-teal)"/>
          <rect x="24" y="41" width="12" height="20" rx="6" fill="url(#cg-teal)"/>
          <rect x="84" y="41" width="12" height="20" rx="6" fill="url(#cg-teal)"/>
          <circle cx="60" cy="45" r="28" fill="url(#cg-body)"/>
          <ellipse cx="49" cy="33" rx="11" ry="6.5" fill="#ffffff" opacity=".5"/>
          <rect x="39" y="32" width="42" height="28" rx="14" fill="url(#cg-visor)"/>
          <ellipse cx="52" cy="39" rx="15" ry="5" fill="#ffffff" opacity=".14"/>
          <g id="eyes">
            <g id="eyesOpen">
              <g id="eyeL" class="eye"><rect x="47.5" y="39.5" width="9.5" height="11" rx="4.75" fill="#7cf0ff"/><circle cx="50" cy="42.5" r="1.7" fill="#ffffff"/></g>
              <g id="eyeR" class="eye"><rect x="63" y="39.5" width="9.5" height="11" rx="4.75" fill="#7cf0ff"/><circle cx="65.5" cy="42.5" r="1.7" fill="#ffffff"/></g>
            </g>
            <g id="eyesHappy" opacity="0" fill="none" stroke="#7cf0ff" stroke-width="3.4" stroke-linecap="round">
              <path d="M47 47 Q52.2 39.5 57.5 47"/>
              <path d="M62.5 47 Q67.8 39.5 73 47"/>
            </g>
          </g>
        </g>
      </svg>
    </button>
    <section id="cg-panel" role="dialog" aria-label="Elysium Labs studio bot" hidden>
      <header>
        <div class="cg-id">
          <span class="cg-title"><span class="cg-dot" aria-hidden="true"></span>Elysium <em>labs</em></span>
          <span class="cg-sub">Studio bot · replies instantly</span>
        </div>
        <button id="cg-close" aria-label="Close chat">✕</button>
      </header>
      <div id="cg-log" aria-live="polite"></div>
      <div id="cg-chips"></div>
      <form id="cg-form" autocomplete="off">
        <input id="cg-in" type="text" placeholder="Ask us anything…" aria-label="Your question">
        <button type="submit" aria-label="Send">→</button>
      </form>
    </section>`;
  document.body.appendChild(root);

  const fab = root.querySelector('#cg-fab');
  const panel = root.querySelector('#cg-panel');
  const log = root.querySelector('#cg-log');
  const chips = root.querySelector('#cg-chips');
  const form = root.querySelector('#cg-form');
  const input = root.querySelector('#cg-in');

  function say(text, who, actions) {
    const b = document.createElement('div');
    b.className = 'cg-msg ' + who;
    b.textContent = text;
    log.appendChild(b);
    if (actions) {
      const row = document.createElement('div');
      row.className = 'cg-actions';
      row.innerHTML =
        `<a class="cg-act" target="_blank" rel="noopener" href="${WA}?text=${encodeURIComponent('Hi Elysium Labs — I’d like to start a project.')}">WhatsApp us</a>` +
        `<a class="cg-act" href="mailto:${MAIL}?subject=${encodeURIComponent('New project')}">Email us</a>`;
      log.appendChild(row);
    }
    log.scrollTop = log.scrollHeight;
  }

  function answer(key) {
    const item = ANSWERS[key];
    say(item.a, 'bot', item.actions);
  }

  function match(text) {
    for (const [re, key] of KEYWORDS) if (re.test(text)) return key;
    return null;
  }

  function renderChips() {
    chips.innerHTML = '';
    for (const key of ['build', 'price', 'process', 'start']) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cg-chip';
      b.textContent = ANSWERS[key].q;
      b.onclick = () => { say(ANSWERS[key].q, 'me'); answer(key); };
      chips.appendChild(b);
    }
  }

  let greeted = false, closeTimer;
  function open() {
    clearTimeout(closeTimer);
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    // force a reflow so the .open transition runs from the collapsed state
    void panel.offsetWidth;
    panel.classList.add('open');
    if (!greeted) {
      greeted = true;
      say('Hi — welcome to Elysium Labs. We build websites, games, apps and 3D experiences, end to end. What would you like to know?', 'bot');
      renderChips();
    }
    setTimeout(() => input.focus(), 60);
  }
  function close() {
    panel.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
    closeTimer = setTimeout(() => { panel.hidden = true; }, 260);   // after the fade-out
    fab.focus();
  }

  fab.addEventListener('click', () => panel.classList.contains('open') ? close() : open());
  root.querySelector('#cg-close').addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    say(text, 'me');
    const key = match(text);
    if (key) answer(key);
    else say('Good question — that one deserves a human. Message us on WhatsApp or email and you’ll have an answer within a day.', 'bot', true);
  });

  /* ---------------- the bot's little life ---------------- */
  // his mesh has no skeleton, so this rigged vector version is what lets him
  // emote. Everything reads through the eyes — lots of blinking, the odd wink,
  // glances and smiling eyes; the hands scratch his head, scratch behind, rub
  // together and wave. No spin. Timers are randomised so he never loops.
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const eyes = root.querySelector('#eyes');
  const armR = root.querySelector('#armR');
  const armL = root.querySelector('#armL');

  function flash(el, cls, ms) { el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); }
  function blink() {
    flash(eyes, 'blink', 115);
    if (Math.random() < 0.3) setTimeout(() => flash(eyes, 'blink', 115), 235);   // double-blink
  }
  function eyeExpr() {
    const r = Math.random();
    if (r < 0.42) flash(eyes, 'wink', 260);          // a cheeky wink
    else if (r < 0.75) flash(eyes, 'look', 1400);    // glance around
    else flash(eyes, 'happy', 900);                  // smiling eyes
  }
  let busy = false;
  function handGesture() {
    if (busy || document.hidden) return;
    busy = true;
    const done = (ms) => setTimeout(() => (busy = false), ms);
    const r = Math.random();
    if (r < 0.3) { flash(armL, 'rub', 1600); flash(armR, 'rub', 1600); done(1660); }   // rub hands
    else if (r < 0.6) { flash(armR, 'scratchHead', 1900); done(1960); }                // scratch head
    else if (r < 0.85) { flash(armL, 'scratchBack', 1900); done(1960); }               // scratch behind
    else { flash(armR, 'wave', 1300); done(1360); }                                    // wave
  }
  function loop(fn, min, max) {
    setTimeout(() => { if (!document.hidden) fn(); loop(fn, min, max); }, min + Math.random() * (max - min));
  }
  if (!reduce) {
    loop(blink, 1300, 2900);         // lots of blinking
    loop(eyeExpr, 3600, 6400);       // winks / glances / smiling eyes
    loop(handGesture, 6500, 11000);  // scratch head, scratch behind, rub, wave
  }

  /* ---------------- lead form ---------------- */
  // static hosting = no mail server, so the form composes the enquiry and
  // hands it to WhatsApp (where these leads live), pre-written and one tap
  // from sent. When the API worker lands this can POST for real instead.
  const lead = document.getElementById('leadform');
  if (lead) lead.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('lf-name').value.trim();
    const msg = document.getElementById('lf-msg').value.trim();
    if (!name || !msg) return;
    const text = `Hi Elysium Labs — I'm ${name}. ${msg}`;
    window.open(`${WA}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    const note = document.createElement('p');
    note.className = 'lf-sent';
    note.textContent = 'Opening WhatsApp with your message — just press send. Prefer email? Use the address below.';
    lead.querySelector('.lf-sent')?.remove();
    lead.appendChild(note);
  });
})();
