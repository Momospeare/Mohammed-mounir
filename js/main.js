/* ============================================================
   Portfolio v1 — main.js (vanilla JS, no framework)
   - Renders timeline cards from data/timeline.json
   - 3D tilt on cards (disabled for reduced-motion / touch)
   - Leaflet journey map with markers + journey polyline
   - SVG progression path with clickable nodes
   - Section-view tracking via IntersectionObserver
   ============================================================ */

(function () {
  'use strict';

  var A = window.PortfolioAnalytics;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Inline SVG icon set (placeholders) ----------
     Swap any of these for real illustrations later; the renderer
     references them by the chapter's "icon" field. */
  var ICONS = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="#2ee6ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="#2ee6ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="#ff2e88" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>',
    plane: '<svg viewBox="0 0 24 24" fill="none" stroke="#2ee6ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12l20-7-6 7 6 7z"/><path d="M12 12v7"/></svg>',
    bike: '<svg viewBox="0 0 24 24" fill="none" stroke="#2ee6ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="17" r="3.5"/><circle cx="18" cy="17" r="3.5"/><path d="M6 17l4-8h5l3 8M10 9L8 4h2.5"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="#ff2e88" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h13l-3 4 3 4H5"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="#2ee6ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="#ff2e88" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h7M9 17h7"/></svg>'
  };

  function iconFor(name) {
    return ICONS[name] || ICONS.pin;
  }

  /* ---------- Load timeline data ---------- */
  fetch('data/timeline.json')
    .then(function (res) {
      if (!res.ok) throw new Error('timeline.json failed to load: ' + res.status);
      return res.json();
    })
    .then(function (data) {
      renderTimeline(data.chapters || []);
      renderProgressionPath(data.chapters || []);
      initJourneyMap(data.chapters || []);
    })
    .catch(function (err) {
      console.error(err);
      var track = document.getElementById('timeline-track');
      if (track) {
        track.innerHTML = '<p style="color:#a9b0d6">Timeline failed to load. Run via a local server (see README) — file:// blocks JSON fetches.</p>';
      }
    });

  /* ---------- Timeline cards ---------- */
  function renderTimeline(chapters) {
    var track = document.getElementById('timeline-track');
    if (!track) return;
    track.innerHTML = '';

    chapters.forEach(function (ch) {
      var scene = document.createElement('div');
      scene.className = 't-scene';

      var card = document.createElement('article');
      card.className = 't-card' + (ch.placeholder ? ' is-placeholder' : '');
      card.id = 'chapter-' + ch.id;
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', ch.title + ' — ' + ch.era);

      // Media slot: real photo if "photo" is set, placeholder icon otherwise.
      // PHOTO SWAP (later): set "photo" in timeline.json — zero code changes.
      var media = ch.photo
        ? '<img src="' + ch.photo + '" alt="' + escapeAttr(ch.photoCaption || ch.title) + '" loading="lazy">'
        : iconFor(ch.icon);

      card.innerHTML =
        '<span class="t-era">' + escapeHtml(ch.era) + '</span>' +
        '<div class="card-media">' + media + '</div>' +
        '<h3>' + escapeHtml(ch.title) + '</h3>' +
        '<p class="t-location">' + escapeHtml(ch.location) + '</p>' +
        '<p class="t-text">' + escapeHtml(ch.text) + '</p>' +
        (ch.placeholder ? '<span class="t-todo">TODO — content to be added</span>' : '');

      function onActivate() {
        A.timelineCardClick(ch.id, ch.title);
        card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
      }
      card.addEventListener('click', onActivate);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(); }
      });

      scene.appendChild(card);
      track.appendChild(scene);

      enableTilt(card);
    });
  }

  /* 3D tilt — pointer-driven rotateX/rotateY inside a perspective scene. */
  function enableTilt(card) {
    if (reduceMotion) return;
    if (window.matchMedia('(hover: none)').matches) return; // touch devices

    var raf = null;
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        card.style.transform =
          'rotateY(' + (px * 14).toFixed(2) + 'deg) rotateX(' + (-py * 14).toFixed(2) + 'deg) translateZ(6px)';
      });
    });
    card.addEventListener('pointerleave', function () {
      if (raf) cancelAnimationFrame(raf);
      card.style.transform = '';
    });
  }

  /* ---------- Journey map (Leaflet) ---------- */
  function initJourneyMap(chapters) {
    var el = document.getElementById('journey-map');
    if (!el || typeof L === 'undefined') return;

    var stops = chapters.filter(function (ch) { return ch.coords && ch.coords.length === 2; });
    if (!stops.length) {
      el.innerHTML = '<p style="color:#a9b0d6;padding:20px">No map stops yet.</p>';
      return;
    }

    var map = L.map('journey-map', { scrollWheelZoom: false }).setView(stops[0].coords, 2);
    map.on('focus', function () { map.scrollWheelZoom.enable(); });
    map.on('blur', function () { map.scrollWheelZoom.disable(); });

    // Dark basemap to match the neon theme (CARTO dark_all, free for this use).
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 18
    }).addTo(map);

    var latlngs = [];
    stops.forEach(function (ch, i) {
      latlngs.push(ch.coords);
      var marker = L.marker(ch.coords).addTo(map);
      marker.bindPopup('<strong>' + escapeHtml(ch.title) + '</strong><br>' + escapeHtml(ch.mapLabel || ch.location));
      marker.on('click', function () {
        A.mapMarkerClick(ch.id, ch.mapLabel || ch.location);
      });
      // Number the stops in journey order via a tooltip
      marker.bindTooltip(String(i + 1), { permanent: true, direction: 'top', offset: [0, -12], className: 'stop-tip' });
    });

    // Journey polyline — pink-to-cyan gradient feel via two-tone dash
    L.polyline(latlngs, { color: '#ff2e88', weight: 3, opacity: 0.85, dashArray: '1 8', lineCap: 'round' }).addTo(map);
    map.fitBounds(L.latLngBounds(latlngs).pad(0.35));
  }

  /* ---------- Progression path (SVG) ---------- */
  function renderProgressionPath(chapters) {
    var svg = document.getElementById('progress-path');
    if (!svg) return;

    var W = 1000, H = 150, pad = 40;
    var n = chapters.length;
    var stepX = (W - pad * 2) / Math.max(n - 1, 1);
    // Gentle wave so the path feels like a journey, not a ruler
    function yAt(i) { return H / 2 + Math.sin(i * 0.9) * 34; }

    var NS = 'http://www.w3.org/2000/svg';
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML =
      '<defs><linearGradient id="ppGradient" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#ff2e88"/><stop offset="1" stop-color="#2ee6ff"/>' +
      '</linearGradient></defs>';

    var d = chapters.map(function (ch, i) {
      var x = pad + i * stepX, y = yAt(i);
      return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
    }).join(' ');

    var base = document.createElementNS(NS, 'path');
    base.setAttribute('d', d);
    base.setAttribute('class', 'pp-track');
    svg.appendChild(base);

    var prog = document.createElementNS(NS, 'path');
    prog.setAttribute('d', d);
    prog.setAttribute('class', 'pp-progress');
    svg.appendChild(prog);

    chapters.forEach(function (ch, i) {
      var x = pad + i * stepX, y = yAt(i);
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'pp-node' + (ch.placeholder ? ' is-placeholder' : ''));
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', 'Go to chapter: ' + ch.title);

      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 11);
      g.appendChild(c);

      var t = document.createElementNS(NS, 'text');
      t.setAttribute('x', x); t.setAttribute('y', y + 30);
      t.textContent = ch.era.length > 14 ? ch.era.slice(0, 13) + '…' : ch.era;
      g.appendChild(t);

      function go() {
        A.progressionNodeClick(ch.id);
        var card = document.getElementById('chapter-' + ch.id);
        if (card) card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
      }
      g.addEventListener('click', go);
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });

      svg.appendChild(g);
    });
  }

  /* ---------- Section views + hero CTAs ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    // Hero CTA tracking (elements carry data-track-cta attributes)
    document.querySelectorAll('[data-track-cta]').forEach(function (el) {
      el.addEventListener('click', function () {
        A.heroCtaClick(el.getAttribute('data-track-cta'), el.getAttribute('href') || '');
      });
    });

    // Fire "section_view" once per section when it first enters the viewport
    var seen = {};
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !seen[entry.target.id]) {
          seen[entry.target.id] = true;
          var title = entry.target.querySelector('.section-title');
          A.sectionView(entry.target.id, title ? title.textContent.trim() : entry.target.id);
        }
      });
    }, { threshold: 0.35 });

    document.querySelectorAll('section[id]').forEach(function (s) { observer.observe(s); });

    // Footer year
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  });

  /* ---------- Tiny HTML escapers (timeline.json is local, but be safe) ---------- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
})();
