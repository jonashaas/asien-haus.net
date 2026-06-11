# Asien-Haus Tübingen — Landing Page

Editorial one-pager for the Asien-Haus (asiatische Lebensmittel & Thai-Imbiss, Tübinger Altstadt, seit 1997).

## Stack

- **Plain HTML/CSS/JS** — no build step, deploy anywhere (GitHub Pages ready)
- **Three.js** (ESM via import map) — hero scene: rising gold/champagne particles with moonlight-blue sparks + glowing lantern disc, custom GLSL shaders, paused when offscreen, DPR-clamped, CSS-gradient fallback when WebGL is unavailable. Palette is themeable via `data-*` attributes on the `#scene` canvas.
- **GSAP 3.13** (ScrollTrigger + SplitText) — preloader, masked word/line reveals, stat counters, velocity-reactive marquee, SVG bowl draw-in with looping steam, nav theme flips per section
- **Lenis** — smooth scrolling, wired into ScrollTrigger

## Design — "Royal Thai Night"

Midnight indigo `#0A102A` / champagne ivory `#F3EDDB` / temple gold `#D9A441` (tokens: `--ink`, `--paper`, `--accent`). Fraunces (display) + Space Grotesk (UI), with a tiny text-subsetted Noto Serif Thai for the Thai accents: the บ้าน/เอเชีย seal, the บ้าน watermark, product glyphs (อาหาร, ผัก, สมุนไพร, ธรรมชาติ, จาน, ธูป) and ครัวไทย.

## Features

- Fully responsive (fluid `clamp()` type, burger menu with fullscreen overlay)
- `prefers-reduced-motion`: loader, smooth scroll, particles and animations are disabled
- Custom cursor & magnetic buttons on fine-pointer devices only
- Semantic markup, skip link, JSON-LD `GroceryStore` schema, German `lang`
- No cookies, no tracking, no embeds — external map/Instagram open as links
- Asset URLs carry a `?v=N` cache-buster — bump it when shipping changes

## Run locally

```sh
python3 serve.py 5197
# → http://127.0.0.1:5197  (serves with Cache-Control: no-store for development)
```

(A static server is required because Three.js loads as an ES module.)

## Pages

- `index.html` — landing page
- `index2.html` — redirect stub to `/` (kept so previously shared variant links don't break)
- `impressum.html`, `datenschutz.html` — legal pages

All facts (hours, phone numbers, address, assortment) taken from the original site content.
