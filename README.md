# Elysium Labs — Site

The public site for **Elysium Labs**, a digital studio. *We build things.*

A static site (HTML / CSS / vanilla JS) with a Three.js hero: the **Monumental E** —
a fixed 3D sculpture that turns as you scroll and leans toward the cursor, floating
over a faint neon "gravity grid" that folds toward the pointer. A miniature of the same
E spins in the top-left, perfectly synced to the hero.

## Structure

| File | |
|------|--|
| `index.html` | primary site — white / light theme |
| `index-dark.html` | dark variant |
| `styles.css` · `styles-dark.css` | themes |
| `main.js` | Three.js scene + scroll/cursor interactions |
| `assets/monument-e.glb` | the E model (compressed 24.7 MB → 1.1 MB) |
| `assets/three/` | vendored Three.js (r160, no CDN dependency) |
| `assets/brand/` | favicons + marks (rendered from the 3D E) |

## Deploy

**Cloudflare Worker `elysium-labs-site`** — not Railway, and `git push` does NOT deploy.
(An earlier version of this README said Railway/git-push; that was wrong and cost a
session. The live mechanism is the Worker in `src/worker.js` + `wrangler.jsonc`.)

```bash
cd "~/Desktop/Github projects/Elysium Labs website"
export PATH="$HOME/.nvm/versions/node/v26.2.0/bin:$PATH"   # npx is not on PATH in a non-interactive shell
git checkout -- assets/oneofone-*.mp4                      # see "iCloud trap" below
npx --yes wrangler@4.120.1 deploy
```

`wrangler` is pinned to **4.120.1** deliberately: on 2026-08-11 the floating `wrangler@4`
tag resolved to a build whose dependency tree asked for a `miniflare` version that does
not exist on the registry, and every deploy in the estate died. Don't drop the pin.

Routes `www.elysiumlabs.co.za/*` and `elysiumlabs.co.za/*` (apex 301s to www). Static
assets are served from the repo root; `.assetsignore` is what keeps the docs, `src/`,
`scratchpad/` and `assets/unused/` off the public URL — add to it, don't rely on
`.gitignore`, which wrangler does not read.

The Worker itself does four things: security headers, cache policy, the apex→www and
`/index.html`→`/` redirects, and **HTTP 206 byte-range serving for `/assets/*.mp4`**.
That last one is not optional — Cloudflare's static assets answer video with a plain 200
and iOS Safari refuses to play a video that isn't range-served, so without it the story
film is a frozen frame on every iPhone. Desktop Chrome plays it fine either way, which is
why the bug is invisible in testing.

### iCloud trap, before every deploy

`assets/oneofone-tall.mp4` and `assets/oneofone-wide.mp4` get evicted by iCloud to
169-byte `.icloud` stubs. They then show as *deleted* in `git status` even though nothing
was deleted. **Deploying in that state uploads the stubs and wipes the live videos.**
Restore them with `git checkout -- assets/oneofone-*.mp4` first — git force-tracks both
via the `!` rules in `.gitignore`.

## Run locally

```bash
python3 -m http.server 8123    # → http://localhost:8123
```

`npm start` (`serve`) also works for a plain static preview, but neither runs the Worker,
so redirects, cache headers, video range serving and `/api/chat` are all absent locally.
Use `npx wrangler dev` when any of those matter.

Built by Elysium Labs.
