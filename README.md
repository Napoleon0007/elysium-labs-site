# Elysium Labs — Site

The public site for **Elysium Labs**, a digital studio. *We build things.*

A static site (HTML / CSS / vanilla JS) with a Three.js hero: the **Monumental E** —
a fixed 3D sculpture that turns as you scroll and leans toward the cursor, floating
over a faint neon "gravity grid" that folds toward the pointer. A miniature of the same
E spins in the top-left, perfectly synced to the hero.

## Run locally

```bash
python3 -m http.server 8123    # → http://localhost:8123
# or
npm install && npm start       # serves on $PORT (default 3000)
```

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

Railway (Node). `npm start` runs `serve` on `$PORT`. GitHub-connected — deploy = `git push`.

Built by Elysium Labs.
