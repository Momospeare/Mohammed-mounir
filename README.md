# Mohammed Mounir — Portfolio v1 (scaffold)

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
├── index.html          # structure, GTM snippets (TODO: real ID), Leaflet CDN
├── css/
│   └── style.css       # GTA 6-inspired theme: neon pink/cyan on calm dark base
├── js/
│   ├── analytics.js    # dataLayer scaffold + PortfolioAnalytics API (TODO: IDs)
│   └── main.js         # timeline render, 3D tilt, Leaflet map, SVG path, tracking
├── data/
│   └── timeline.json   # ALL timeline content — chapters, map stops, placeholders
├── assets/
│   └── photos/         # (create when ready) real photos go here
└── README.md
```

## What's wired up

- **Timeline** — horizontal scroll-snap track, one 3D-tilt card per chapter from `timeline.json`. Hover tilts (pointer devices only, honors `prefers-reduced-motion`); click/keyboard centers the card.
- **Photo swap (later, zero code changes)** — set a chapter's `"photo"` to e.g. `"assets/photos/libya.jpg"` and add `"photoCaption"`. The card renderer picks it up automatically.
- **Journey map** — Leaflet with dark CARTO basemap; numbered markers in journey order (Baghdad → Tripoli/Libya → Richmond Hill → Toronto → Bradford), dashed journey polyline, popups. Scroll-wheel zoom enables on focus so it never hijacks page scroll.
- **Progression path** — SVG wave with one node per chapter; dashed = placeholder chapter. Click a node to jump to its card.
- **Analytics** — `dataLayer.push()` events: `timeline_card_click`, `journey_map_marker_click`, `progression_node_click`, `section_view` (IntersectionObserver, once per section), `hero_cta_click`.

## TODO before launch (all marked with TODO comments in code)

1. **GTM**: create a new container → replace `GTM-XXXXXXX` in `index.html` (head snippet + noscript).
2. **GA4**: new property → GA4 Configuration tag in GTM → publish. (Remove the `__PORTFOLIO_DEBUG` console line in `js/analytics.js`.)
3. **Content**: fill Experience from the master resume; Skills/Certs from the skills tracker; VIPs/Hobbies/Contact from brain-dumps; flip `"placeholder": true` chapters to real content.
4. **Photos**: drop into `assets/photos/`, reference in `timeline.json`.
5. **Race track chapter**: append to `timeline.json` — map + path update themselves.
6. **Domain**: GitHub Pages + Namecheap (Momospeare.com or Mohammedmounir.ca/com — still his call).

## Notes

- Nothing deployed, no repo created — local scaffold only, per instructions.
- Coordinates verified via geocoding: Baghdad (33.3421, 44.39307), Tripoli as Libya marker (32.89534, 13.18105), Richmond Hill (43.84744, -79.3785), Toronto (43.64869, -79.38544), Bradford (44.11474, -79.56283).
- Timeline copy sticks to his brain-dump wording; nothing invented.
