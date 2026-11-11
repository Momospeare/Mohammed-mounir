/* ============================================================
   Portfolio — time-based theme (Toronto time, NOT device setting)
   - Light 7:00am–7:00pm America/Toronto, dark 7:00pm–7:00am.
   - Driven by Intl with timeZone "America/Toronto", so the switch
     follows Toronto time even for a visitor in another timezone, and
     prefers-color-scheme is deliberately ignored (Momo's call, Nov 8).
   - Sets <html data-theme="light|dark">; CSS flips variables on that
     attribute. Also updates meta theme-color and fires a "themechange"
     event (the journey map listens and swaps its basemap tiles).
   - Re-checks at the top of every hour, so a long-open tab flips at
     the 7am/7pm boundary without a reload.
   - Load this in <head> BEFORE the stylesheet so the first paint is
     already the right theme (no dark→light flash). No-JS fallback:
     the attribute is never set, so the site stays dark (current look).
   ============================================================ */

(function () {
  'use strict';

  var LIGHT_START_HOUR = 7;  /* 7:00am ET — light theme starts */
  var LIGHT_END_HOUR = 19;   /* 7:00pm ET — dark theme starts */
  var TIME_ZONE = 'America/Toronto';

  var hourFmt = null;
  try {
    hourFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      hour: 'numeric',
      hour12: false
    });
  } catch (e) {
    hourFmt = null; /* very old browser: falls back to the visitor's clock */
  }

  function torontoHour(date) {
    if (hourFmt) {
      var h = parseInt(hourFmt.format(date), 10);
      return h === 24 ? 0 : h; /* hour12:false can return 24 at midnight */
    }
    return date.getHours();
  }

  function themeFor(date) {
    var h = torontoHour(date);
    return (h >= LIGHT_START_HOUR && h < LIGHT_END_HOUR) ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    var root = document.documentElement;
    if (root.getAttribute('data-theme') === theme) return;
    root.setAttribute('data-theme', theme);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#f7f8fc' : '#0d0f1c');
    }

    if (typeof window.CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('themechange', {
        detail: { theme: theme }
      }));
    }
  }

  /* Delay to the next Toronto hour (not the visitor's local hour), so a
     long-open tab flips at the Toronto 7am/7pm boundary. Falls back to
     the local clock if Intl is unavailable. */
  var torontoPartsFmt = null;
  try {
    torontoPartsFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
  } catch (e) {
    torontoPartsFmt = null;
  }

  function msUntilNextHour(date) {
    if (torontoPartsFmt) {
      var min = 0, sec = 0;
      torontoPartsFmt.formatToParts(date).forEach(function (p) {
        if (p.type === 'minute') min = parseInt(p.value, 10);
        if (p.type === 'second') sec = parseInt(p.value, 10);
      });
      return (60 - min) * 60000 - sec * 1000 - date.getMilliseconds();
    }
    return (60 - date.getMinutes()) * 60000
      - date.getSeconds() * 1000
      - date.getMilliseconds();
  }

  function tick() {
    applyTheme(themeFor(new Date()));
    /* Re-check at the top of the next hour (min 1s, so a clock skew or a
       tab waking from sleep never spins). */
    setTimeout(tick, Math.max(msUntilNextHour(new Date()), 1000));
  }

  tick();
})();
