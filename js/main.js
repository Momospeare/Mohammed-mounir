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
        ? '<img src="' + escapeAttr(ch.photo) +
          '" alt="' + escapeAttr(ch.photoCaption || ch.title) +
          '" loading="lazy" decoding="async">'
        : iconFor(ch.icon);

      card.innerHTML =
        '<span class="t-era">' + escapeHtml(ch.era) + '</span>' +
        '<div class="card-media">' + media + '</div>' +
        '<h3>' + escapeHtml(ch.title) + '</h3>' +
        '<p class="t-location">' + escapeHtml(ch.location) + '</p>' +
        '<p class="t-text">' + escapeHtml(ch.text) + '</p>';

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
      if (e.pointerType !== 'mouse') return;
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        card.style.transform =
          'rotateY(' + (px * 7).toFixed(2) +
          'deg) rotateX(' + (-py * 7).toFixed(2) +
          'deg) translateZ(5px)';
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
      el.innerHTML =
        '<p style="color:#a9b0d6;padding:20px">' +
        'Professional location markers will appear here ' +
        'as verified locations are added.' +
        '</p>';
      return;
    }

    var map = L.map('journey-map', { scrollWheelZoom: false }).setView(stops[0].coords, 2);
    map.on('focus', function () { map.scrollWheelZoom.enable(); });
    map.on('blur', function () { map.scrollWheelZoom.disable(); });

    // Basemap follows the time-based theme: dark canvas at night, light
    // canvas 7am–7pm Toronto time (js/theme.js flips data-theme and fires
    // "themechange"; the listener below swaps tiles without rebuilding
    // the map). Both are the same Esri Canvas service, key-free.
    var TILE_URLS = {
      dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      light: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    };
    function tileUrl() {
      return document.documentElement.getAttribute('data-theme') === 'light'
        ? TILE_URLS.light
        : TILE_URLS.dark;
    }
    var tileLayer = L.tileLayer(tileUrl(), {
      attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, OpenStreetMap contributors, and the GIS user community',
      maxZoom: 16
    }).addTo(map);
    window.addEventListener('themechange', function () {
      map.removeLayer(tileLayer);
      tileLayer = L.tileLayer(tileUrl(), {
        attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, OpenStreetMap contributors, and the GIS user community',
        maxZoom: 16
      }).addTo(map);
    });

    var latlngs = [];
    // Cluster the markers: the GTA stops sit within ~50 km, so at the
    // default zoom they would overlap. A cluster shows the count and
    // splits apart as the visitor zooms in.
    var cluster = (typeof L.markerClusterGroup === 'function')
      ? L.markerClusterGroup({
          showCoverageOnHover: false,
          maxClusterRadius: 48,
          iconCreateFunction: function (c) {
            return L.divIcon({
              html: '<span>' + c.getChildCount() + '</span>',
              className: 'marker-cluster',
              iconSize: [36, 36]
            });
          }
        })
      : null;
    if (cluster) map.addLayer(cluster);
    stops.forEach(function (ch, i) {
      latlngs.push(ch.coords);
      // Number baked into the pin itself — no floating tooltips to collide
      // when markers cluster in the GTA.
      var marker = L.marker(ch.coords, {
        icon: L.divIcon({
          className: 'stop-marker',
          html: '<span>' + (i + 1) + '</span>',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      });
      if (cluster) cluster.addLayer(marker); else marker.addTo(map);
      // Screen readers announce bare pin numbers without this.
      marker.on('add', function () {
        var el = marker.getElement();
        if (el) el.setAttribute('aria-label', ch.title + ' — ' + (ch.mapLabel || ch.location));
      });
      marker.bindPopup('<strong>' + escapeHtml(ch.title) + '</strong><br>' + escapeHtml(ch.mapLabel || ch.location));
      marker.on('click', function () {
        A.mapMarkerClick(ch.id, ch.mapLabel || ch.location);
        var card = document.getElementById('chapter-' + ch.id);
        if (card) {
          card.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            inline: 'center',
            block: 'nearest'
          });
        }
      });
      // Number the stops in journey order via a tooltip
      marker.bindTooltip(ch.mapLabel || ch.location, { direction: 'top', offset: [0, -18], className: 'stop-tip' });
    });

    // Journey polyline — pink-to-cyan gradient feel via two-tone dash
    L.polyline(latlngs, { color: '#ff2e88', weight: 3, opacity: 0.85, dashArray: '1 8', lineCap: 'round' }).addTo(map);
    map.fitBounds(L.latLngBounds(latlngs).pad(0.35));
  }

  /* ---------- Progression path (SVG) ---------- */
  function renderProgressionPath(chapters) {
    var svg = document.getElementById('progress-path');
    if (!svg) return;

    var W = 1000, H = 280, pad = 40;
    var n = chapters.length;
    var stepX = (W - pad * 2) / Math.max(n - 1, 1);
    // Gentle wave so the path feels like a journey, not a ruler
    function yAt(i) { return H / 2 + Math.sin(i * 0.9) * 80; }

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
      c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 14);
      g.appendChild(c);

      // Invisible hit area: the visible dot is small on phones, so the
      // tappable target is much larger than what you see.
      var hit = document.createElementNS(NS, 'circle');
      hit.setAttribute('cx', x); hit.setAttribute('cy', y); hit.setAttribute('r', 30);
      hit.setAttribute('fill', '#000'); hit.setAttribute('fill-opacity', '0');
      g.insertBefore(hit, c);

      var t = document.createElementNS(NS, 'text');
      t.setAttribute('x', x); t.setAttribute('y', y + 34);
      // Short path labels (timeline.json "pathLabel") so nothing truncates.
      t.textContent = ch.pathLabel || (ch.era.length > 14 ? ch.era.slice(0, 13) + '…' : ch.era);
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
    // Drop the nav's scroll-fade cue once the visitor reaches its end
    var navLinks = document.querySelector('.nav-links');
    if (navLinks) {
      navLinks.addEventListener('scroll', function () {
        var atEnd = navLinks.scrollLeft + navLinks.clientWidth >= navLinks.scrollWidth - 4;
        navLinks.classList.toggle('at-end', atEnd);
      }, { passive: true });
    }

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

    // Scroll-triggered editorial reveals
    if (!reduceMotion && 'IntersectionObserver' in window) {
      var revealObserver = new IntersectionObserver(
        function (entries, observer) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.12,
          rootMargin: '0px 0px -40px 0px'
        }
      );
      var revealTargets = document.querySelectorAll(
        '#experience .info-card, ' +
        '#projects .info-card, ' +
        '#skills .info-card, ' +
        '#education .info-card, ' +
        '.map-card, .path-card'
      );
      revealTargets.forEach(function (element) {
        element.classList.add('reveal');
        revealObserver.observe(element);
      });
    }

    // Timeline progress indicator
    var timeline = document.getElementById('timeline-track');
    var progress = document.getElementById('timeline-progress-fill');
    var progressBar = document.querySelector('.timeline-progress');
    if (timeline && progress && progressBar) {
      function updateTimelineProgress() {
        var maxScroll =
          timeline.scrollWidth - timeline.clientWidth;
        var percentage = maxScroll > 0
          ? (timeline.scrollLeft / maxScroll) * 100
          : 100;
        progress.style.width = percentage + '%';
        progressBar.setAttribute(
          'aria-valuenow',
          String(Math.round(percentage))
        );
      }
      timeline.addEventListener(
        'scroll',
        updateTimelineProgress,
        { passive: true }
      );
      window.addEventListener('resize', updateTimelineProgress);
      updateTimelineProgress();
    }

    // Footer year
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();

    // Back-to-top button
    var toTop = document.getElementById('to-top');
    if (toTop) {
      var updateToTop = function () {
        toTop.classList.toggle('is-visible', window.scrollY > 600);
      };
      window.addEventListener('scroll', updateToTop, { passive: true });
      updateToTop(); // page can load already scrolled (deep link / restored position)
      toTop.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    }
  });

  /* ---------- Tiny HTML escapers (timeline.json is local, but be safe) ---------- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
})();
