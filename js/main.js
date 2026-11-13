/* ============================================================
   Portfolio v1 — main.js (vanilla JS, no framework)
   - Wires the static journey-app flip cards (map + path + cards linked)
   - Leaflet journey map with markers + journey polyline
   - SVG progression path with clickable nodes
   - Section-view tracking via IntersectionObserver
   ============================================================ */

(function () {
  'use strict';

  // Analytics is optional: if analytics.js fails to load, every
  // tracking call below becomes a harmless no-op instead of throwing.
  var A = window.PortfolioAnalytics || {
    timelineCardClick: function () {},
    mapMarkerClick: function () {},
    progressionNodeClick: function () {},
    sectionView: function () {},
    heroCtaClick: function () {}
  };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Load timeline data ---------- */
  fetch('data/timeline.json')
    .then(function (res) {
      if (!res.ok) throw new Error('timeline.json failed to load: ' + res.status);
      return res.json();
    })
    .then(function (data) {
      renderProgressionPath(data.chapters || []);
      initJourneyMap(data.chapters || []);
    })
    .catch(function (err) {
      console.error(err);
      var mapEl = document.getElementById('journey-map');
      if (mapEl) {
        mapEl.innerHTML = '<p style="color:var(--muted); padding: 20px;">Journey map unavailable — the timeline data failed to load.</p>';
      }
      var pathEl = document.getElementById('progress-path');
      if (pathEl) {
        pathEl.setAttribute('aria-label', 'Progression path unavailable — the timeline data failed to load.');
      }
    });

  /* ---------- Journey app: flip cards, linked to map + path ----------
     Cards are static HTML (indexable). One card open at a time: selecting
     a chapter (card, map marker, or path node) flips it to its back,
     marks it selected, and lights up its marker + node. Clicking the
     open card again flips it back. Links/buttons inside a card act
     normally and never trigger a flip. */
  var chapterMarkers = {};
  var chapterNodes = {};
  var journeyMap = null;
  var chapterCoords = {};
  // While a programmatic scroll (card click, node/marker jump) is running,
  // scroll-sync stays quiet so it never fights the scroll or unflips the
  // open card mid-flight.
  var scrollLock = false;
  var scrollLockTimer = null;

  function clearSelection() {
    document.querySelectorAll('.j-card.is-selected, .j-card.is-flipped').forEach(function (c) {
      c.classList.remove('is-selected', 'is-flipped');
    });
    Object.keys(chapterNodes).forEach(function (id) { chapterNodes[id].classList.remove('is-active'); });
    Object.keys(chapterMarkers).forEach(function (id) {
      var m = chapterMarkers[id];
      if (m && m.getElement) { var el = m.getElement(); if (el) el.classList.remove('is-active'); }
    });
  }

  function selectChapter(id, opts) {
    var card = document.getElementById('chapter-' + id);
    if (!card) return;
    var flip = !opts || opts.flip !== false;
    if (flip && opts && opts.toggle && card.classList.contains('is-flipped')) {
      clearSelection();
      return;
    }
    clearSelection();
    card.classList.add('is-selected');
    if (flip) card.classList.add('is-flipped');
    if (chapterNodes[id]) chapterNodes[id].classList.add('is-active');
    var m = chapterMarkers[id];
    if (m && m.getElement) { var el = m.getElement(); if (el) el.classList.add('is-active'); }
    if (!opts || opts.scroll !== false) {
      scrollLock = true;
      clearTimeout(scrollLockTimer);
      scrollLockTimer = setTimeout(function () { scrollLock = false; }, 900);
      card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    }
    // Fly the map to the chapter's location — the map zooms in on the
    // place itself, not just a colour change on the marker.
    if (journeyMap && chapterCoords[id]) {
      if (reduceMotion) {
        journeyMap.setView(chapterCoords[id], 13, { animate: false });
        if (m) m.openPopup();
      } else {
        journeyMap.flyTo(chapterCoords[id], 13, { duration: 1.2 });
        if (m) {
          journeyMap.once('moveend', function () { m.openPopup(); });
          m.openPopup();
        }
      }
    }
  }

  function wireJourneyCards() {
    document.querySelectorAll('.j-card').forEach(function (card) {
      var id = card.id.replace('chapter-', '');
      var titleEl = card.querySelector('h3');
      var title = titleEl ? titleEl.textContent.trim() : id;
      card.addEventListener('click', function (e) {
        if (e.target.closest('a, button')) return; // links/buttons handle themselves
        A.timelineCardClick(id, title);
        selectChapter(id, { flip: true, toggle: true });
      });
      card.addEventListener('keydown', function (e) {
        if (e.target !== card) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          A.timelineCardClick(id, title);
          selectChapter(id, { flip: true, toggle: true });
        }
      });
      card.querySelectorAll('.j-flip-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          clearSelection();
        });
      });
    });
  }

  wireJourneyCards();

  /* ---------- Journey map (Leaflet) ---------- */
  function initJourneyMap(chapters) {
    var el = document.getElementById('journey-map');
    if (!el || typeof L === 'undefined') return;

    var stops = chapters.filter(function (ch) { return ch.coords && ch.coords.length === 2; });
    if (!stops.length) {
      el.innerHTML =
        '<p style="color:var(--muted);padding:20px">' +
        'Professional location markers will appear here ' +
        'as verified locations are added.' +
        '</p>';
      return;
    }

    // Touch: one-finger drag pans the map and traps the page scroll over
    // the 380px map. Start with dragging off on touch devices; the first
    // tap on the map enables it (clicks and marker popups still work).
    var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    var map = L.map('journey-map', { scrollWheelZoom: false, dragging: !isTouch }).setView(stops[0].coords, 2);
    journeyMap = map;
    chapters.forEach(function (ch) {
      if (ch.coords && ch.coords.length === 2) chapterCoords[ch.id] = ch.coords;
    });
    map.on('focus', function () { map.scrollWheelZoom.enable(); });
    map.on('blur', function () { map.scrollWheelZoom.disable(); });
    if (isTouch) { map.on('click', function () { map.dragging.enable(); }); }

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
      chapterMarkers[ch.id] = marker;
      marker.on('click', function () {
        A.mapMarkerClick(ch.id, ch.mapLabel || ch.location);
        selectChapter(ch.id, { flip: true });
      });
      // Number the stops in journey order via a tooltip
      marker.bindTooltip(ch.mapLabel || ch.location, { direction: 'top', offset: [0, -18], className: 'stop-tip' });
    });

    // Journey polyline — pink dotted line connecting the stops
    L.polyline(latlngs, { color: '#ff2e88', weight: 3, opacity: 0.85, dashArray: '1 8', lineCap: 'round' }).addTo(map);
    map.fitBounds(L.latLngBounds(latlngs).pad(0.35));
  }

  /* ---------- Progression path (SVG) ---------- */
  function renderProgressionPath(chapters) {
    var svg = document.getElementById('progress-path');
    if (!svg) return;

    var W = 1000, H = 340, pad = 40;
    var n = chapters.length;
    var stepX = (W - pad * 2) / Math.max(n - 1, 1);
    // Gentle wave so the path feels like a journey, not a ruler
    function yAt(i) { return H / 2 + Math.sin(i * 0.9) * 100; }

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
      c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 16);
      g.appendChild(c);

      // Invisible hit area: the visible dot is small on phones, so the
      // tappable target is much larger than what you see.
      var hit = document.createElementNS(NS, 'circle');
      hit.setAttribute('cx', x); hit.setAttribute('cy', y); hit.setAttribute('r', 36);
      hit.setAttribute('fill', '#000'); hit.setAttribute('fill-opacity', '0');
      g.insertBefore(hit, c);

      var t = document.createElementNS(NS, 'text');
      t.setAttribute('x', x); t.setAttribute('y', y + 34);
      // Short path labels (timeline.json "pathLabel") so nothing truncates.
      t.textContent = ch.pathLabel || (ch.era.length > 14 ? ch.era.slice(0, 13) + '…' : ch.era);
      g.appendChild(t);

      chapterNodes[ch.id] = g;
      function go() {
        A.progressionNodeClick(ch.id);
        selectChapter(ch.id, { flip: true });
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
      var updateNavFade = function () {
        var atEnd = navLinks.scrollLeft + navLinks.clientWidth >= navLinks.scrollWidth - 4;
        navLinks.classList.toggle('at-end', atEnd);
      };
      navLinks.addEventListener('scroll', updateNavFade, { passive: true });
      window.addEventListener('resize', updateNavFade);
      updateNavFade();
    }

    // Hero CTA tracking (elements carry data-track-cta attributes)
    document.querySelectorAll('[data-track-cta]').forEach(function (el) {
      el.addEventListener('click', function () {
        A.heroCtaClick(el.getAttribute('data-track-cta'), el.getAttribute('href') || '');
      });
    });

    // Fire "section_view" once per section when it first enters the viewport
    if ('IntersectionObserver' in window) {
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
    }

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
        '#journey-app .j-scene, ' +
        '#projects .info-card, ' +
        '#recognition .info-card, ' +
        '.map-card, .path-card'
      );
      revealTargets.forEach(function (element) {
        element.classList.add('reveal');
        revealObserver.observe(element);
      });
    }

    // Timeline progress indicator
    var timeline = document.getElementById('journey-track');
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

    // Scroll-sync: the card in the centre of the track auto-selects, so
    // the map follows the dates as you scroll. It selects (highlight +
    // map fly) but never flips — scrolling past a card shouldn't throw
    // it open. Programmatic scrolls are locked out above, so sync never
    // fights a click or unflips the open card mid-flight.
    if (timeline) {
      var syncToCenter = function () {
        if (scrollLock) return;
        var trackRect = timeline.getBoundingClientRect();
        var centerX = trackRect.left + trackRect.width / 2;
        var best = null, bestDist = Infinity;
        timeline.querySelectorAll('.j-scene').forEach(function (scene) {
          var r = scene.getBoundingClientRect();
          var d = Math.abs((r.left + r.width / 2) - centerX);
          if (d < bestDist) { bestDist = d; best = scene; }
        });
        if (!best) return;
        var card = best.querySelector('.j-card');
        if (!card || card.classList.contains('is-selected')) return;
        selectChapter(card.id.replace('chapter-', ''), { flip: false, scroll: false });
      };
      var syncTicking = false;
      timeline.addEventListener('scroll', function () {
        if (scrollLock || syncTicking) return;
        syncTicking = true;
        requestAnimationFrame(function () { syncTicking = false; syncToCenter(); });
      }, { passive: true });
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
