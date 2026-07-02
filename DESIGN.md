# Design

## Theme

Light only. A deep white room: warm-white radial field (#ffffff → #efece6), ink-black type, and the dark 3D Monumental-E sculpture floating over an electric-blue wireframe "gravity floor" that recedes into fog. The page IS the gallery; the E is the single exhibit. Film grain (3.5%) and a faint vignette keep the white from feeling clinical.

## Color

- `--bg` white field: radial `#ffffff → #f6f4f0 → #efece6`
- `--ink` #141210 (primary text, solid buttons)
- `--mut` #6e6a64 (secondary text) · `--mut2` #3c3833 (leads/nav)
- `--blue` #0000F2 — the ONE brand accent. Lives in exactly two places: the word "labs" in the wordmark and the gravity-floor wireframe. Never used decoratively elsewhere.
- Lines: rgba(0,0,0,.12) and .06 for hairline rules
- Strategy: restrained monochrome + single electric accent. Identity is locked — do not add colors.

## Typography

- **Inter** (300/400/500/600) — everything structural. Tight display tracking (-.035em), weight 500–600 for headings.
- **Instrument Serif italic** — emphasis words only (`em` inside headings, step numbers, footer tagline). It is the brand's "human voice" inside the architectural sans.
- Hero: clamp ≤6rem, line-height .93. Statement/CTA headings: clamp mid-3rem-range.
- Identity note: both families are locked brand choices (identity-preservation) — don't swap.

## Components

- **Pill buttons**: 100px radius, hairline border; `.solid` = ink bg / white text; arrow `→` slides 4px on hover.
- **Wordmark**: "Elysium labs" — "labs" in blue; live 3D mini-E canvas (34px) in the nav, rotation-synced to the hero sculpture.
- **Text links**: hairline underline offset, darkens on hover.
- **Section rules**: 1px hairlines used as architecture (steps list, footer top).
- **Text halo**: white text-shadow lifts ink text where it crosses the dark sculpture — invisible on white.

## Layout

- Max width 1180px, pad clamp(20px, 5vw, 64px), section padding clamp(90px, 14vh, 160px).
- Hero: full viewport, type left-aligned over the 3D scene; scroll cue bottom-left.
- The 3D canvas is fixed and z-0; all content scrolls above it at z-2.
- Footer: 3-column grid ≥760px, stacked below.

## Motion

- 3D scene: E rotates with scroll (full 2π across page), leans toward cursor, exits upward near the CTA; camera descends toward the gravity floor as you scroll (smoothstep). Floor dips toward pointer/finger.
- Reveals: IntersectionObserver fade+rise, 60ms sibling stagger, cubic-bezier(.2,.7,.2,1). Reveals must be enhancement-only (content visible without JS).
- `prefers-reduced-motion`: reveals instant, scroll cue hidden, 3D scene must go static (no scroll/cursor animation).
