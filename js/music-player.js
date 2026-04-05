/* =================================================================
   music-player.js -- Background Music Player (MP3 Streaming)
   Part of: Ashes of Command: The Reclamation (Interactive GDD)
   Created: 2026-04-04
   Dependencies: none (vanilla JS, HTML Audio elements)
   ================================================================= */

window.MusicPlayer = (function() {
  'use strict';

  var manifest = null;
  var masterVolume = 0.5;
  var currentKey = null;

  // Two audio elements for crossfade: A and B, swap roles each play()
  var audioA = null;
  var audioB = null;
  var activeSide = 'A'; // which one is currently playing

  // Active fade animation frame IDs
  var fadeOutId = null;
  var fadeInId = null;

  /* -- Helpers --------------------------------------------------- */

  function _createAudio() {
    var el = document.createElement('audio');
    el.preload = 'none';
    el.volume = 0;
    return el;
  }

  function _ensureElements() {
    if (!audioA) audioA = _createAudio();
    if (!audioB) audioB = _createAudio();
  }

  function _activeEl()   { return activeSide === 'A' ? audioA : audioB; }
  function _incomingEl()  { return activeSide === 'A' ? audioB : audioA; }

  /**
   * Ramp volume on an audio element using requestAnimationFrame.
   * Returns a promise that resolves when the ramp completes.
   */
  function _rampVolume(el, from, to, durationMs, cancelRef) {
    return new Promise(function(resolve) {
      if (!el || durationMs <= 0) {
        if (el) el.volume = Math.max(0, Math.min(1, to));
        resolve();
        return;
      }

      var startTime = null;
      var clampedFrom = Math.max(0, Math.min(1, from));
      var clampedTo   = Math.max(0, Math.min(1, to));

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var elapsed = timestamp - startTime;
        var progress = Math.min(elapsed / durationMs, 1);
        // Ease-in-out for smoother fades
        var eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        try {
          el.volume = clampedFrom + (clampedTo - clampedFrom) * eased;
        } catch(e) { /* element may have been removed */ }

        if (progress < 1) {
          var id = requestAnimationFrame(step);
          if (cancelRef) cancelRef.id = id;
        } else {
          resolve();
        }
      }

      var id = requestAnimationFrame(step);
      if (cancelRef) cancelRef.id = id;
    });
  }

  /* -- Public API ------------------------------------------------ */

  /**
   * Fetch and cache the tracks manifest.
   */
  async function loadManifest() {
    if (manifest) return manifest;
    try {
      var resp = await fetch('data/audio/tracks.json');
      if (!resp.ok) {
        console.warn('[MusicPlayer] tracks.json fetch failed:', resp.status);
        return null;
      }
      manifest = await resp.json();
      return manifest;
    } catch(e) {
      console.warn('[MusicPlayer] Failed to load manifest:', e);
      return null;
    }
  }

  /**
   * Play a track by its manifest key, crossfading from current.
   * @param {string} trackKey - Key in manifest.tracks
   * @param {object} [opts]   - Optional overrides: fadeIn, fadeOut
   */
  async function play(trackKey, opts) {
    try {
      if (!manifest) await loadManifest();
      if (!manifest) return;

      var track = manifest.tracks[trackKey];
      if (!track) {
        console.warn('[MusicPlayer] Unknown track:', trackKey);
        return;
      }

      // Already playing this track
      if (trackKey === currentKey) return;

      _ensureElements();
      opts = opts || {};

      var outEl = _activeEl();
      var inEl  = _incomingEl();
      var fadeOutMs = opts.fadeOut || (currentKey && manifest.tracks[currentKey] ? manifest.tracks[currentKey].fadeOut : 1500) || 1500;
      var fadeInMs  = opts.fadeIn  || track.fadeIn || 1800;

      // Cancel any in-progress fades
      if (fadeOutId) { cancelAnimationFrame(fadeOutId); fadeOutId = null; }
      if (fadeInId)  { cancelAnimationFrame(fadeInId);  fadeInId = null;  }

      // Fade out current
      var fadeOutRef = {};
      if (currentKey && outEl && !outEl.paused) {
        _rampVolume(outEl, outEl.volume, 0, fadeOutMs, fadeOutRef).then(function() {
          outEl.pause();
        });
        fadeOutId = fadeOutRef.id;
      }

      // Set up incoming
      inEl.src  = track.file;
      inEl.loop = track.loop !== false;
      inEl.volume = 0;

      // Attempt to load and play
      try {
        inEl.load();
        await inEl.play();
      } catch(e) {
        // 404 or NotAllowedError
        console.warn('[MusicPlayer] Playback failed for', trackKey, ':', e.message || e);
        return;
      }

      // Fade in
      var fadeInRef = {};
      _rampVolume(inEl, 0, masterVolume, fadeInMs, fadeInRef);
      fadeInId = fadeInRef.id;

      // Swap sides
      activeSide = activeSide === 'A' ? 'B' : 'A';
      currentKey = trackKey;

    } catch(e) {
      console.warn('[MusicPlayer] play() error:', e);
    }
  }

  /**
   * Stop current track with fade out.
   */
  async function stop() {
    try {
      if (!currentKey) return;
      _ensureElements();

      var el = _activeEl();
      if (!el || el.paused) {
        currentKey = null;
        return;
      }

      var fadeMs = 1500;
      if (manifest && manifest.tracks[currentKey]) {
        fadeMs = manifest.tracks[currentKey].fadeOut || 1500;
      }

      if (fadeOutId) { cancelAnimationFrame(fadeOutId); fadeOutId = null; }
      var ref = {};
      await _rampVolume(el, el.volume, 0, fadeMs, ref);
      el.pause();
      currentKey = null;
    } catch(e) {
      console.warn('[MusicPlayer] stop() error:', e);
    }
  }

  /**
   * Return the currently playing track key, or null.
   */
  function current() {
    return currentKey;
  }

  /**
   * Set master music volume (0-1) with a smooth ramp.
   */
  function setVolume(v) {
    v = Math.max(0, Math.min(1, v));
    masterVolume = v;

    _ensureElements();
    var el = _activeEl();
    if (el && !el.paused) {
      // Smooth 200ms ramp to new volume
      _rampVolume(el, el.volume, masterVolume, 200, null);
    }
  }

  /**
   * Look up the route in manifest.routes and play the mapped track.
   * @param {string} routeKey - Route identifier (e.g. 'ch5', 'dashboard')
   */
  async function playForRoute(routeKey) {
    try {
      if (!manifest) await loadManifest();
      if (!manifest || !manifest.routes) return;

      var trackKey = manifest.routes[routeKey];
      if (!trackKey) {
        // No music mapped for this route; do nothing
        return;
      }
      await play(trackKey);
    } catch(e) {
      console.warn('[MusicPlayer] playForRoute() error:', e);
    }
  }

  return {
    loadManifest: loadManifest,
    play:         play,
    stop:         stop,
    current:      current,
    setVolume:    setVolume,
    playForRoute: playForRoute
  };

})();
