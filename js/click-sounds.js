// Momospeare click sounds: every link/button click plays one of the five
// lighthearted GTA sounds at random. Self-hosted MP3s, no third-party
// requests. Scoped to the Momospeare pages only (momospeare.html,
// momospeare/capturegta6.html, links/index.html), not the professional
// portfolio pages.
(function () {
  var SOUNDS = [
    '/assets/sounds/gta-v-wasted.mp3',
    '/assets/sounds/gta-sa-mission-passed.mp3',
    '/assets/sounds/cj-ah-shit-here-we-go-again.mp3',
    '/assets/sounds/big-smoke-oh-my-god.mp3',
    '/assets/sounds/gta-cheat-sound.mp3'
  ];
  var players = SOUNDS.map(function (src) {
    var a = new Audio(src);
    a.preload = 'auto';
    a.volume = 0.8;
    return a;
  });
  // Warm up on first interaction so the files are cached before a click.
  function warmUp() {
    players.forEach(function (a) { a.load(); });
    document.removeEventListener('pointerdown', warmUp);
  }
  document.addEventListener('pointerdown', warmUp);
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('a, button') : null;
    if (!t) return;
    var pick = players[Math.floor(Math.random() * players.length)];
    try {
      pick.currentTime = 0;
      var p = pick.play();
      if (p && p.catch) p.catch(function () { /* autoplay blocked, ignore */ });
    } catch (err) { /* ignore */ }
  });
})();
