# Mohammed Mounir — Professional Portfolio

Live: **https://mohammedmounir.ca/**

GitHub Pages-compatible **static** site. No build step, no framework — vanilla HTML/CSS/JS plus Leaflet (map) via CDN.

## Preview locally

`timeline.json` is fetched over HTTP, so `file://` won't work. Serve it:

```bash
cd ~/workspace/portfolio
python3 -m http.server 8000
# then open http://localhost:8000
```

## File tree

```
portfolio/
├── index.html          # structure, metadata + JSON-LD, Leaflet CDN
├── css/
│   └── style.css       # GTA 6-inspired theme: neon pink/cyan on calm dark base
├── js/
│   ├── analytics.js    # dataLayer events (local only — no GTM container yet)
│   └── main.js         # timeline render, 3D tilt, Leaflet map, SVG path, reveals, tracking
├── data/
│   └── timeline.json   # Professional timeline chapters only
├── robots.txt
├── sitemap.xml
├── assets/
│   └── photos/         # (create when ready) real photos go here
└── README.md
```

## Sections

- **Hero** — "Security experience. Technology in progress."
- **Interactive timeline** — horizontal scroll-snap track, one 3D-tilt card per professional chapter from `data/timeline.json`. Hover tilts (pointer devices only, honors `prefers-reduced-motion`); click/keyboard centers the card. Progress bar underneath.
- **Journey map** — Leaflet geographic map (Esri dark tiles) + SVG progression path. City-level markers for all 8 professional chapters; clicking a node or marker jumps to its card.
- **Experience** — full work history from the master resume and LinkedIn.
- **Projects** — MOLEX, SparkyLube, True Shield Security — shipped client work with measured results.
- **Skills & certifications** — from the master resume and skills tracker.
- **Highlights & awards** — OSPA, Lifesaver Awards, CEO Award, WLKN, Cineplex.
- **Hobbies** — Momospeare motovlog, track days, gaming, RC planes.
- **Education** — Seneca CPA (in progress) and Police Foundations (with distinction).
- **Contact** — LinkedIn + GitHub repository links.

## Content rules

- **Public site = professional + already-public life events only.** No personal-life material: no birthplace, childhood migration, residential addresses, family stories, or personal coordinates. Those live in the private companion site (`~/workspace/portfolio-private/`), never in this repo.
- **Timeline** — professional chapters only. To add one, append an object to `data/timeline.json` (keep `coords: null` unless the location is a verified professional location).
- **Photo swap (later, zero code changes)** — set a chapter's `"photo"` to e.g. `"assets/photos/wlkn.jpg"` and add `"photoCaption"`. The card renderer picks it up automatically.

## Analytics

`dataLayer.push()` events: `timeline_card_click`, `journey_map_marker_click`, `progression_node_click`, `section_view` (IntersectionObserver, once per section), `hero_cta_click`. These stay local until a real GTM container is added — see the header comment in `js/analytics.js` for the setup steps. No placeholder GTM requests are made.

## Deploy

Push to the `main` branch of `Momospeare/Mohammed-mounir` on GitHub; GitHub Pages serves the site from `main` / root. Verify after each deploy: page loads, timeline renders, no console errors, no invalid external requests.
