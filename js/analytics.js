/* ============================================================
   Analytics scaffold — dataLayer events (local only for now)
   ------------------------------------------------------------
   The GTM snippet was REMOVED from index.html (Nov 2026 audit):
   it fired requests with a placeholder ID. Events below still
   push to window.dataLayer harmlessly. To wire real analytics:
     1. Create a new Google Tag Manager container at
        https://tagmanager.google.com and copy its container ID.
     2. Re-add the standard GTM <head> snippet and <body>
        <noscript> iframe to index.html with the real ID.
     3. In GTM, create a GA4 Configuration tag with your new
        GA4 Measurement ID (G-XXXXXXXXXX) and publish the container.
   ============================================================ */

(function () {
  'use strict';

  // Ensure the dataLayer exists even if the GTM snippet hasn't run.
  window.dataLayer = window.dataLayer || [];

  /**
   * Push a structured event to the dataLayer.
   * In GTM, create Custom Event triggers matching these event names,
   * then wire them to GA4 Event tags.
   *
   * @param {string} name   - snake_case event name, e.g. "timeline_card_click"
   * @param {Object} params - extra dimensions, e.g. { chapter_id: "asp" }
   */
  function track(name, params) {
    window.dataLayer.push(Object.assign({ event: name }, params || {}));
  }

  // Public API used by main.js
  window.PortfolioAnalytics = {
    track: track,

    timelineCardClick: function (chapterId, chapterTitle) {
      track('timeline_card_click', { chapter_id: chapterId, chapter_title: chapterTitle });
    },

    mapMarkerClick: function (chapterId, mapLabel) {
      track('journey_map_marker_click', { chapter_id: chapterId, map_label: mapLabel });
    },

    progressionNodeClick: function (chapterId) {
      track('progression_node_click', { chapter_id: chapterId });
    },

    sectionView: function (sectionId, sectionTitle) {
      track('section_view', { section_id: sectionId, section_title: sectionTitle });
    },

    heroCtaClick: function (ctaLabel, ctaTarget) {
      track('hero_cta_click', { cta_label: ctaLabel, cta_target: ctaTarget });
    }
  };
})();
