/* ═══════════════════════════════════════════════════════════
   audio-engine.js — Procedural Web Audio SFX Engine
   Part of: Ashes of Command: The Reclamation (Interactive GDD)
   Created: 2026-03-28 | Rewritten: 2026-03-29
   Dependencies: None (standalone Web Audio API)
   ═══════════════════════════════════════════════════════════

   EXPORTS: AudioEngine (global IIFE)
     - init()                   Initialize AudioContext + signal chain
     - setFaction(key)          Switch faction theme
     - setVolume(v)             Master volume (0-1)
     - setSfxVol(v)             SFX volume (0-1)
     - playClick()              UI click sound (faction-themed)
     - playHover()              UI hover sound (faction-themed)
     - playAction(type)         Named action sound
     - playAccordion(isOpen)    Accordion open/close sound
     - playRarity(tier)         Rarity reveal sound
     - startViz()               Start audio visualizer

   SFX-ONLY: All background music and ambient drones removed.
   This engine provides purely interactive sound effects that
   respond to user actions — clicks, hovers, transitions, and
   feedback sounds.

   SIGNAL CHAIN:
     voices → sfxGain → reverbSend → FDN reverb ─┐
                                                   ├→ comp → masterGain → tapeSat → out
              sfxGain ─────────────────────────────┘

   AUTO-MUTED: AudioContext starts suspended. User interaction required.
   ═══════════════════════════════════════════════════════════ */

const AudioEngine = (() => {
  let ctx          = null;
  let masterGain   = null;
  let sfxGain      = null;
  let reverbSend   = null;
  let currentFaction = null;

  /* ═══════════════════════════════════════════════════════════
     INIT — Build signal chain
     ═══════════════════════════════════════════════════════════ */
  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    /* ── Master output with tape saturation ───────────────── */
    masterGain = ctx.createGain();
    masterGain.gain.value = 1.0;

    const tapeWS = ctx.createWaveShaper();
    const tapeCurve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i * 2) / 1024 - 1;
      tapeCurve[i] = (Math.exp(2 * x) - 1) / (Math.exp(2 * x) + 1) * 1.08;
    }
    tapeWS.curve = tapeCurve;
    tapeWS.oversample = '4x';
    masterGain.connect(tapeWS);
    tapeWS.connect(ctx.destination);

    /* ── Compressor/limiter ───────────────────────────────── */
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value      =  8;
    comp.ratio.value     =  6;
    comp.attack.value    =  0.002;
    comp.release.value   =  0.12;
    comp.connect(masterGain);

    /* ── SFX bus ──────────────────────────────────────────── */
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.72;
    sfxGain.connect(comp);

    /* ── FDN Reverb (10-tap) ──────────────────────────────── */
    const FDN_TAPS  = [1009, 1201, 1399, 1597, 1801, 2003, 2207, 2411, 2617, 2819];
    const FDN_FBACK = 0.42;
    const FDN_DAMP  = 0.55;
    const fdnMix    = ctx.createGain();
    fdnMix.gain.value = 0.28;
    fdnMix.connect(sfxGain);

    const fdnDelays = [];
    FDN_TAPS.forEach(function(tapLen, i) {
      const dl = ctx.createDelay(0.25);
      dl.delayTime.value = tapLen / ctx.sampleRate;
      const fb = ctx.createGain();
      fb.gain.value = FDN_DAMP * FDN_FBACK;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 4800 - i * 120;
      dl.connect(lp); lp.connect(fb); fb.connect(dl);
      dl.connect(fdnMix);
      fdnDelays.push(dl);
    });
    for (let i = 0; i < fdnDelays.length - 1; i += 2) {
      const xg = ctx.createGain();
      xg.gain.value = 0.08;
      fdnDelays[i].connect(xg);
      xg.connect(fdnDelays[i + 1]);
    }
    reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.18;
    fdnDelays.forEach(function(dl, i) {
      const ig = ctx.createGain();
      ig.gain.value = 0.1 + (i % 3) * 0.04;
      reverbSend.connect(ig);
      ig.connect(dl);
    });
  }

  /* ═══════════════════════════════════════════════════════════
     CORE SYNTHESIS HELPERS
     ═══════════════════════════════════════════════════════════ */

  /** Soft-clip waveshaper (overdrive) */
  function _makeClip(amount) {
    const ws = ctx.createWaveShaper();
    const n = 512;
    const cv = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      cv[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    ws.curve = cv;
    ws.oversample = '4x';
    return ws;
  }

  /** Stereo panner */
  function _panner(pan) {
    if (!ctx.createStereoPanner) return null;
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    return p;
  }

  /**
   * Core tone: oscillator → optional filter → gain → sfx bus
   * @param {string} type - Oscillator type (sine, sawtooth, square, triangle)
   * @param {number} f0 - Start frequency
   * @param {number} f1 - End frequency (glide target)
   * @param {number} vol - Volume (0-1)
   * @param {number} dur - Duration in seconds
   * @param {number} [filtHz] - Filter cutoff frequency
   * @param {string} [filtType] - Filter type (lowpass, highpass, bandpass)
   * @param {boolean} [useRev] - Route to reverb send
   * @param {number} [pan] - Stereo pan (-1 to 1)
   */
  function _tone(type, f0, f1, vol, dur, filtHz, filtType, useRev, pan) {
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, now);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(0.01, f1), now + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    let node = g;

    if (filtHz) {
      const f = ctx.createBiquadFilter();
      f.type = filtType || 'lowpass';
      f.frequency.value = filtHz;
      f.Q.value = 1.2;
      o.connect(f);
      f.connect(g);
    } else {
      o.connect(g);
    }

    if (pan) {
      const pn = _panner(pan);
      if (pn) { g.connect(pn); node = pn; }
    }

    node.connect(sfxGain);
    if (useRev) node.connect(reverbSend);
    o.start(now);
    o.stop(now + dur + 0.05);
  }

  /** White noise burst */
  function _noise(vol, dur, bpHz, bpQ, useRev, pan) {
    const bufLen = Math.floor(ctx.sampleRate * Math.min(dur + 0.1, 1.0));
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = bpHz;
    bp.Q.value = bpQ || 4;
    src.connect(bp);

    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    bp.connect(g);

    let node = g;
    if (pan) { const pn = _panner(pan); if (pn) { g.connect(pn); node = pn; } }

    node.connect(sfxGain);
    if (useRev) node.connect(reverbSend);
    src.start(now);
  }

  /** Distorted noise (Horde / Vorax aggression) */
  function _grind(vol, dur, bpHz, driveAmt, pan) {
    const bufLen = Math.floor(ctx.sampleRate * Math.min(dur + 0.1, 1.0));
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = bpHz;
    bp.Q.value = 6;
    src.connect(bp);

    const ws = _makeClip(driveAmt);
    bp.connect(ws);

    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    ws.connect(g);

    let node = g;
    if (pan) { const pn = _panner(pan); if (pn) { g.connect(pn); node = pn; } }
    node.connect(sfxGain);
    src.start(now);
  }

  /** Bell — multiple detuned voices, reverbed */
  function _bell(freq, variants, vol, dur, useRev, pan) {
    variants.forEach(function(v) {
      const cents = v[0];
      const relVol = v[1];
      const detunedFreq = freq * Math.pow(2, cents / 1200);
      _tone('sine', detunedFreq, detunedFreq * 0.5, vol * relVol, dur, null, null, useRev, pan);
    });
  }

  /** Arpeggio — sequence of tones with delays */
  function _arp(freqs, vol, noteDur, waveType, useRev) {
    freqs.forEach(function(item) {
      const fr = item[0];
      const delay = item[1];
      setTimeout(function() {
        if (ctx) _tone(waveType || 'sine', fr, fr, vol, noteDur, null, null, useRev);
      }, delay * 1000);
    });
  }

  /** Metallic ping — short bright impact */
  function _ping(freq, vol, dur, pan) {
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, now);
    o.frequency.exponentialRampToValueAtTime(freq * 0.7, now + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = freq * 0.5;

    o.connect(hp);
    hp.connect(g);

    let node = g;
    if (pan) { const pn = _panner(pan); if (pn) { g.connect(pn); node = pn; } }
    node.connect(sfxGain);
    node.connect(reverbSend);
    o.start(now);
    o.stop(now + dur + 0.05);
  }

  /** Whoosh — filtered noise sweep for transitions */
  function _whoosh(vol, dur, startHz, endHz, pan) {
    const bufLen = Math.floor(ctx.sampleRate * (dur + 0.1));
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const now = ctx.currentTime;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(startHz, now);
    bp.frequency.exponentialRampToValueAtTime(endHz, now + dur);
    bp.Q.value = 2;
    src.connect(bp);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    bp.connect(g);

    let node = g;
    if (pan) { const pn = _panner(pan); if (pn) { g.connect(pn); node = pn; } }
    node.connect(sfxGain);
    node.connect(reverbSend);
    src.start(now);
  }

  /** Thud — low impact for confirmations */
  function _thud(freq, vol, dur) {
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * 1.5, now);
    o.frequency.exponentialRampToValueAtTime(freq, now + 0.02);

    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = freq * 2;

    o.connect(lp);
    lp.connect(g);
    g.connect(sfxGain);
    o.start(now);
    o.stop(now + dur + 0.05);
  }

  /** Shimmer — rising bright tones for success/reveal */
  function _shimmer(baseFreq, vol, dur) {
    [1, 1.5, 2, 3].forEach(function(mult, i) {
      setTimeout(function() {
        if (!ctx) return;
        const f = baseFreq * mult;
        _tone('sine', f, f * 1.02, vol * (1 - i * 0.2), dur - i * 0.05, null, null, true, (i - 1.5) * 0.3);
      }, i * 30);
    });
  }

  /** Glitch — digital artifact burst */
  function _glitch(vol, dur) {
    const now = ctx.currentTime;
    const bufLen = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      d[i] = (Math.random() > 0.92) ? (Math.random() * 2 - 1) : 0;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2000 + Math.random() * 3000;
    bp.Q.value = 6;
    src.connect(bp);

    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    bp.connect(g);
    g.connect(sfxGain);
    src.start(now);
  }

  /* ═══════════════════════════════════════════════════════════
     UI SOUND PROFILES — Per-faction click + hover
     ═══════════════════════════════════════════════════════════ */
  const uiProfiles = {

    terran: {
      click() {
        _noise(0.55, 0.04, 600, 8, false, -0.3);
        setTimeout(function() {
          _tone('sawtooth', 900, 320, 0.38, 0.10, 1400, 'lowpass', false, 0.3);
          _tone('sawtooth', 1200, 500, 0.18, 0.07, 1000, 'lowpass', false, -0.1);
        }, 12);
      },
      hover() {
        _tone('sine', 2400, 2000, 0.20, 0.055, 3500, 'lowpass', false, 0.2);
      }
    },

    horde: {
      click() {
        _grind(0.72, 0.14, 160, 110, -0.4);
        _grind(0.50, 0.09, 420, 65, 0.4);
        setTimeout(function() {
          _tone('square', 130, 65, 0.32, 0.15, 380, 'lowpass', false, -0.2);
        }, 50);
      },
      hover() {
        _grind(0.38, 0.04, 900, 45, 0.3);
        _noise(0.22, 0.03, 2200, 5, false, -0.1);
      }
    },

    shards: {
      click() {
        _bell(2093, [[0, 1.0], [+5, 0.6], [-5, 0.6], [+12, 0.35]], 0.32, 0.55, true, -0.3);
        setTimeout(function() {
          _bell(6279, [[0, 1.0], [+5, 0.5]], 0.12, 0.42, true, 0.4);
        }, 15);
      },
      hover() {
        _bell(3520, [[0, 1.0], [+7, 0.42]], 0.13, 0.22, true, 0.25);
      }
    },

    necro: {
      click() {
        _tone('triangle', 420, 58, 0.44, 0.24, 500, 'lowpass', true, -0.25);
        setTimeout(function() {
          _tone('sine', 280, 40, 0.22, 0.20, 350, 'lowpass', true, 0.25);
          _noise(0.18, 0.09, 220, 6, true, 0.0);
        }, 35);
      },
      hover() {
        _tone('triangle', 340, 220, 0.24, 0.08, 450, 'lowpass', false, 0.15);
      }
    },

    accord: {
      click() {
        _tone('sine', 880, 880, 0.36, 0.15, null, null, true, -0.2);
        setTimeout(function() {
          _tone('sine', 1320, 1320, 0.28, 0.18, null, null, true, 0.2);
        }, 70);
      },
      hover() {
        _tone('sine', 1400, 1600, 0.18, 0.05, null, null, false, 0.1);
      }
    },

    vorax: {
      click() {
        _noise(0.62, 0.06, 700, 14, false, -0.35);
        _noise(0.38, 0.08, 200, 8, false, 0.35);
        setTimeout(function() {
          _tone('square', 90, 45, 0.30, 0.18, 350, 'lowpass', false, 0.0);
          _noise(0.25, 0.04, 1800, 10, false, -0.15);
        }, 40);
      },
      hover() {
        _noise(0.32, 0.035, 3500, 12, false, 0.2);
        _tone('square', 2800, 600, 0.10, 0.04, 3000, 'highpass', false, -0.1);
      }
    },

    guardians: {
      click() {
        _bell(293, [[0, 1.0], [+4, 0.55], [-4, 0.55]], 0.38, 1.0, true, -0.3);
        setTimeout(function() { _bell(440, [[0, 1.0], [+3, 0.48]], 0.24, 0.85, true, 0.3); }, 32);
        setTimeout(function() { _bell(587, [[0, 1.0]], 0.14, 0.68, true, 0.0); }, 78);
      },
      hover() {
        _bell(1760, [[0, 1.0], [+5, 0.38]], 0.14, 0.24, true, 0.2);
      }
    }
  };

  function playClick() {
    if (!ctx) init();
    const prof = uiProfiles[currentFaction];
    if (prof) { prof.click(); return; }
    _tone('sine', 1000, 500, 0.32, 0.10);
  }

  function playHover() {
    if (!ctx) init();
    const prof = uiProfiles[currentFaction];
    if (prof) { prof.hover(); return; }
    _tone('sine', 1200, 1400, 0.12, 0.05);
  }

  /* ═══════════════════════════════════════════════════════════
     NAMED ACTION SOUNDS
     ═══════════════════════════════════════════════════════════ */
  function playAction(type) {
    if (!ctx) init();
    const f = currentFaction;

    switch (type) {

      /* ── Search ──────────────────────────────────────────── */
      case 'searchOpen':
        _tone('sine', 260, 1100, 0.30, 0.22, null, null, true, -0.2);
        setTimeout(function() { _tone('sine', 400, 1500, 0.18, 0.18, null, null, true, 0.2); }, 28);
        break;

      case 'searchClose':
        _tone('sine', 900, 240, 0.26, 0.15, null, null, true, 0.0);
        break;

      case 'searchResult':
        _tone('sine', 1100, 1300, 0.20, 0.07, null, null, false, 0.15);
        break;

      /* ── Accordion ───────────────────────────────────────── */
      case 'accordionOpen': {
        const hz = { terran: 700, horde: 200, shards: 1400, necro: 280, accord: 880, vorax: 480, guardians: 370 };
        const fq = hz[f] || 550;
        _tone('sine', fq * 0.65, fq, 0.24, 0.12, null, null, false, -0.1);
        break;
      }
      case 'accordionClose': {
        const hz = { terran: 700, horde: 200, shards: 1400, necro: 280, accord: 880, vorax: 480, guardians: 370 };
        const fq = hz[f] || 550;
        _tone('sine', fq, fq * 0.52, 0.20, 0.10, null, null, false, 0.1);
        break;
      }

      /* ── Filter / Sort ───────────────────────────────────── */
      case 'filter': {
        const fp = {
          terran:    function() { _noise(0.26, 0.025, 700, 6, false, -0.2); setTimeout(function() { _tone('sawtooth', 1100, 700, 0.26, 0.07, 1200, 'lowpass', false, 0.2); }, 14); },
          horde:     function() { _grind(0.42, 0.06, 300, 70, 0.0); },
          shards:    function() { _bell(2637, [[0, 1.0], [+8, 0.5]], 0.22, 0.26, true, 0.3); },
          necro:     function() { _tone('triangle', 260, 130, 0.30, 0.14, 400, 'lowpass', true, -0.15); },
          accord:    function() { _tone('sine', 1047, 1319, 0.26, 0.09, null, null, false, 0.0); },
          vorax:     function() { _noise(0.38, 0.04, 600, 10, false, -0.2); setTimeout(function() { _noise(0.25, 0.04, 250, 7, false, 0.2); }, 18); },
          guardians: function() { _bell(349, [[0, 1.0], [+5, 0.5], [-5, 0.5]], 0.26, 0.36, true, 0.0); }
        };
        (fp[f] || function() { _tone('sine', 900, 700, 0.24, 0.07); })();
        break;
      }

      case 'sort': {
        const bases = { terran: 440, horde: 220, shards: 880, necro: 330, accord: 523, vorax: 370, guardians: 293 };
        const waves = { terran: 'sawtooth', horde: 'square', shards: 'sine', necro: 'triangle', accord: 'sine', vorax: 'square', guardians: 'triangle' };
        const b = bases[f] || 440;
        const w = waves[f] || 'sine';
        _arp([[b, 0], [b * 1.26, 0.055], [b * 1.587, 0.11]], 0.26, 0.10, w, (f === 'shards' || f === 'guardians'));
        break;
      }

      /* ── Sidebar ─────────────────────────────────────────── */
      case 'sidebarOpen':
        _whoosh(0.25, 0.18, 400, 2000, -0.4);
        setTimeout(function() { _ping(1800, 0.12, 0.08, -0.2); }, 80);
        break;

      case 'sidebarClose':
        _whoosh(0.20, 0.15, 2000, 400, -0.4);
        break;

      case 'sidebarToggle':
        _grind(0.42, 0.06, 250, 40, -0.2);
        setTimeout(function() { _tone('triangle', 200, 120, 0.26, 0.10, 350, 'lowpass', false, 0.2); }, 40);
        break;

      /* ── Navigation ──────────────────────────────────────── */
      case 'navChapter':
        _whoosh(0.18, 0.22, 300, 1800, 0.0);
        setTimeout(function() { _ping(2200, 0.14, 0.06, 0.15); }, 100);
        break;

      case 'navBack':
        _whoosh(0.16, 0.18, 1800, 300, 0.0);
        setTimeout(function() { _thud(120, 0.20, 0.12); }, 60);
        break;

      case 'navDashboard':
        _whoosh(0.22, 0.25, 200, 2400, 0.0);
        setTimeout(function() {
          _ping(1400, 0.16, 0.10, -0.2);
          _ping(2100, 0.12, 0.08, 0.2);
        }, 120);
        break;

      /* ── Scroll ──────────────────────────────────────────── */
      case 'scrollTop':
        _tone('sine', 800, 1600, 0.16, 0.12, null, null, false, 0.0);
        setTimeout(function() { _ping(2400, 0.10, 0.06, 0.1); }, 50);
        break;

      case 'scrollTick':
        _tone('sine', 2400, 1800, 0.04, 0.03, 3000, 'lowpass', false, 0);
        break;

      /* ── Map / Territory ─────────────────────────────────── */
      case 'mapHover':
        _ping(1600, 0.10, 0.08, 0.0);
        break;

      case 'mapClick':
        _thud(200, 0.18, 0.15);
        setTimeout(function() { _ping(1200, 0.14, 0.10, 0.0); }, 40);
        break;

      case 'territoryHover':
        _tone('sine', 800, 1000, 0.08, 0.06, null, null, false, 0.0);
        break;

      case 'territorySelect':
        _thud(160, 0.22, 0.18);
        _noise(0.14, 0.06, 800, 4, false, 0.0);
        setTimeout(function() { _tone('sine', 600, 900, 0.16, 0.12, null, null, true, 0.0); }, 30);
        break;

      /* ── Galaxy ──────────────────────────────────────────── */
      case 'galaxyHover':
        _bell(1760, [[0, 1.0], [+5, 0.4]], 0.08, 0.20, true, 0.0);
        break;

      case 'galaxyClick':
        _shimmer(880, 0.16, 0.35);
        break;

      /* ── Dashboard Cards ─────────────────────────────────── */
      case 'cardHover':
        _tone('sine', 1800, 2000, 0.06, 0.04, 3000, 'lowpass', false, 0.0);
        break;

      case 'cardClick':
        _ping(1400, 0.18, 0.10, 0.0);
        _noise(0.10, 0.03, 1200, 6, false, 0.0);
        break;

      case 'phaseHover':
        _tone('sine', 1200, 1400, 0.08, 0.05, null, null, false, 0.0);
        break;

      /* ── Faction Enter Stings ────────────────────────────── */
      case 'factionEnter': {
        const stings = {
          terran: function() {
            _noise(0.52, 0.06, 500, 5, false, -0.4);
            setTimeout(function() {
              _tone('sawtooth', 880, 440, 0.38, 0.22, 600, 'lowpass', false, -0.25);
              setTimeout(function() { _tone('sawtooth', 1320, 660, 0.28, 0.18, 700, 'lowpass', false, 0.25); }, 110);
            }, 25);
          },
          horde: function() {
            _grind(0.75, 0.24, 140, 130, -0.45);
            _grind(0.58, 0.20, 360, 85, 0.45);
            setTimeout(function() {
              _tone('square', 110, 55, 0.44, 0.30, 400, 'lowpass', false, 0.0);
              _noise(0.40, 0.14, 600, 5, false, -0.2);
            }, 65);
          },
          shards: function() {
            var notes = [[523, 0], [659, 90], [784, 180], [1047, 300], [1319, 460]];
            notes.forEach(function(n) {
              setTimeout(function() {
                _bell(n[0], [[0, 1.0], [+6, 0.55], [-6, 0.55]], 0.28, 0.58, true, (Math.random() - 0.5) * 0.7);
              }, n[1]);
            });
          },
          necro: function() {
            _bell(220, [[0, 1.0], [+4, 0.5]], 0.40, 0.58, true, -0.3);
            setTimeout(function() { _bell(165, [[0, 1.0]], 0.32, 0.52, true, 0.3); }, 125);
            setTimeout(function() { _tone('triangle', 110, 55, 0.34, 0.48, 250, 'lowpass', true, 0.0); }, 265);
          },
          accord: function() {
            _arp([[1047, 0], [1319, 0.08], [1568, 0.17], [2093, 0.30]], 0.32, 0.24, 'sine', true);
          },
          vorax: function() {
            var bursts = [[600, 0], [300, 42], [900, 82], [450, 145], [200, 210]];
            bursts.forEach(function(b) {
              setTimeout(function() { _noise(0.44, 0.11, b[0], 8 + Math.random() * 6, false, (Math.random() - 0.5) * 0.8); }, b[1]);
            });
            setTimeout(function() { _tone('square', 80, 40, 0.38, 0.32, 280, 'lowpass', false, 0.0); }, 100);
          },
          guardians: function() {
            _bell(293, [[0, 1.0], [+4, 0.62], [-4, 0.62]], 0.42, 1.15, true, -0.35);
            setTimeout(function() { _bell(440, [[0, 1.0], [+3, 0.52]], 0.30, 0.95, true, 0.35); }, 82);
            setTimeout(function() { _bell(587, [[0, 1.0]], 0.22, 0.80, true, -0.1); }, 210);
            setTimeout(function() { _bell(880, [[0, 1.0], [+5, 0.38]], 0.14, 0.65, true, 0.1); }, 395);
          }
        };
        (stings[f] || function() { _tone('sine', 880, 440, 0.36, 0.22, null, null, true); })();
        break;
      }

      /* ── Dev Mode ────────────────────────────────────────── */
      case 'devUnlock':
        setTimeout(function() { _arp([[523, 0], [659, 0.07], [784, 0.14]], 0.26, 0.18, 'sine', false); }, 0);
        setTimeout(function() { _arp([[659, 0], [784, 0.07], [988, 0.14], [1047, 0.22]], 0.32, 0.22, 'sine', true); }, 400);
        setTimeout(function() {
          _arp([[784, 0], [988, 0.07], [1175, 0.14], [1319, 0.22], [1568, 0.32]], 0.36, 0.26, 'sine', true);
          setTimeout(function() { _bell(4186, [[0, 1.0], [12, 0.6], [-12, 0.6], [24, 0.35]], 0.20, 0.65, true, 0.0); }, 380);
        }, 900);
        break;

      case 'editOn':
        _tone('sawtooth', 440, 440, 0.36, 0.15, 600, 'lowpass', false, -0.15);
        setTimeout(function() { _tone('sawtooth', 660, 660, 0.36, 0.15, 600, 'lowpass', false, 0.15); }, 140);
        break;

      case 'editOff':
        _tone('triangle', 880, 440, 0.36, 0.22, 700, 'lowpass', true, -0.1);
        setTimeout(function() { _tone('sine', 660, 330, 0.22, 0.18, null, null, true, 0.1); }, 40);
        break;

      /* ── Export ───────────────────────────────────────────── */
      case 'export':
        _arp([[523, 0], [659, 0.08], [784, 0.16], [1047, 0.26], [1319, 0.38]], 0.28, 0.22, 'sine', true);
        setTimeout(function() { _arp([[698, 0], [880, 0.08], [1047, 0.16], [1319, 0.26]], 0.20, 0.22, 'sine', true); }, 22);
        setTimeout(function() { _bell(2093, [[0, 1.0], [7, 0.55], [12, 0.35]], 0.16, 0.55, true, 0.0); }, 420);
        setTimeout(function() { _noise(0.12, 0.18, 5000, 2, true, 0); }, 650);
        break;

      /* ── UI Feedback ─────────────────────────────────────── */
      case 'success':
        _shimmer(1047, 0.20, 0.30);
        break;

      case 'error':
        _tone('square', 180, 120, 0.22, 0.11, 300, 'lowpass', false, 0);
        setTimeout(function() { _tone('square', 140, 90, 0.18, 0.10, 250, 'lowpass', false, 0); }, 110);
        break;

      case 'warning':
        _tone('triangle', 440, 440, 0.20, 0.08, null, null, false, 0.0);
        setTimeout(function() { _tone('triangle', 440, 440, 0.16, 0.06, null, null, false, 0.0); }, 120);
        break;

      case 'loading':
        _tone('sine', 600, 800, 0.08, 0.15, null, null, false, 0.0);
        break;

      case 'loadComplete':
        _ping(2000, 0.14, 0.08, 0.0);
        setTimeout(function() { _ping(2800, 0.10, 0.06, 0.15); }, 60);
        break;

      /* ── Tooltip ─────────────────────────────────────────── */
      case 'tooltip':
        _tone('sine', 3000, 2600, 0.06, 0.03, 4000, 'lowpass', false, 0.0);
        break;

      /* ── Ctrl+K ──────────────────────────────────────────── */
      case 'ctrlK':
        _tone('sine', 440, 880, 0.24, 0.09, null, null, true, -0.15);
        setTimeout(function() { _tone('sine', 880, 1320, 0.16, 0.08, null, null, true, 0.15); }, 55);
        break;

      /* ── Unit Sprite ─────────────────────────────────────── */
      case 'unitSprite':
        _tone('sine', 1600, 2200, 0.20, 0.06, null, null, false, 0.2);
        setTimeout(function() { _tone('sine', 2200, 1600, 0.12, 0.05, null, null, false, -0.1); }, 55);
        break;

      case 'statHover':
        _tone('sine', 1900, 2100, 0.07, 0.03, 3000, 'lowpass', false, 0);
        break;

      /* ── Glitch effect ───────────────────────────────────── */
      case 'glitch':
        _glitch(0.14, 0.08);
        break;

      /* ── Chapter Index ───────────────────────────────────── */
      case 'indexOpen':
        _whoosh(0.20, 0.20, 300, 2200, 0.0);
        setTimeout(function() { _shimmer(1400, 0.10, 0.20); }, 100);
        break;

      case 'indexClose':
        _whoosh(0.16, 0.15, 2200, 300, 0.0);
        break;

      /* ── Audio Panel ─────────────────────────────────────── */
      case 'panelOpen':
        _ping(1200, 0.14, 0.08, 0.3);
        setTimeout(function() { _ping(1800, 0.10, 0.06, 0.3); }, 50);
        break;

      case 'panelClose':
        _ping(1800, 0.10, 0.06, 0.3);
        setTimeout(function() { _ping(1200, 0.08, 0.06, 0.3); }, 50);
        break;

      /* ── Combat/Strategy clicks ──────────────────────────── */
      case 'clickCombat':
        _grind(0.42, 0.06, 250, 50, 0);
        setTimeout(function() { _tone('square', 160, 80, 0.25, 0.11, 350, 'lowpass', false, 0); }, 35);
        break;

      case 'clickStrategy':
        _tone('sine', 1200, 1400, 0.18, 0.07, null, null, false, 0.15);
        setTimeout(function() { _tone('sine', 1400, 1600, 0.12, 0.06, null, null, false, -0.1); }, 45);
        break;

      case 'clickGalactic':
        _tone('sine', 280, 560, 0.22, 0.14, null, null, true, -0.2);
        setTimeout(function() { _tone('sine', 560, 840, 0.14, 0.12, null, null, true, 0.2); }, 70);
        break;

      default:
        _tone('sine', 1000, 800, 0.15, 0.08);
        break;
    }
  }

  /* ═══════════════════════════════════════════════════════════
     PER-FACTION ACCORDION SOUNDS
     ═══════════════════════════════════════════════════════════ */
  function playAccordion(isOpen) {
    if (!ctx) init();
    const f = currentFaction;
    if (isOpen) {
      if (f === 'terran') { _noise(0.26, 0.03, 600, 6, false, -0.2); setTimeout(function() { _tone('sawtooth', 700, 1050, 0.20, 0.09, 1200, 'lowpass', false, 0.2); }, 18); }
      else if (f === 'horde') { _grind(0.40, 0.08, 180, 80, -0.3); setTimeout(function() { _grind(0.26, 0.05, 400, 50, 0.3); }, 50); }
      else if (f === 'shards') { _bell(1319, [[0, 1.0], [8, 0.55]], 0.20, 0.28, true, 0.25); }
      else if (f === 'necro') { _tone('triangle', 280, 420, 0.24, 0.12, 500, 'lowpass', true, -0.15); setTimeout(function() { _noise(0.10, 0.05, 1800, 8, false, 0.15); }, 40); }
      else if (f === 'accord') { _tone('sine', 880, 1047, 0.22, 0.10, null, null, false, -0.1); setTimeout(function() { _tone('sine', 1047, 1319, 0.14, 0.08, null, null, false, 0.1); }, 65); }
      else if (f === 'vorax') { _noise(0.32, 0.05, 500, 10, false, -0.2); setTimeout(function() { _noise(0.20, 0.04, 200, 6, false, 0.2); }, 30); }
      else if (f === 'guardians') { _bell(369, [[0, 1.0], [5, 0.55], [-4, 0.45]], 0.28, 0.45, true, 0.0); }
      else { _tone('sine', 550, 550 * 0.65, 0.20, 0.09, null, null, false, 0); }
    } else {
      if (f === 'terran') { _tone('sawtooth', 1050, 700, 0.16, 0.09, 1200, 'lowpass', false, 0); }
      else if (f === 'horde') { _grind(0.30, 0.06, 180, 60, 0); }
      else if (f === 'shards') { _bell(1319, [[0, 1.0], [8, 0.4]], 0.14, 0.22, true, -0.2); }
      else if (f === 'necro') { _tone('triangle', 420, 220, 0.18, 0.10, 400, 'lowpass', true, 0); }
      else if (f === 'accord') { _tone('sine', 1047, 740, 0.16, 0.08, null, null, false, 0); }
      else if (f === 'vorax') { _noise(0.22, 0.04, 500, 8, false, 0); }
      else if (f === 'guardians') { _bell(293, [[0, 1.0], [-4, 0.4]], 0.22, 0.38, true, 0); }
      else { _tone('sine', 550, 550 * 0.52, 0.16, 0.09, null, null, false, 0); }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     RARITY REVEAL SOUNDS
     ═══════════════════════════════════════════════════════════ */
  function playRarity(r) {
    if (!ctx) init();
    if (r === 'Common') { _tone('sine', 800, 700, 0.16, 0.06, 2000, 'lowpass', false, 0); }
    else if (r === 'Uncommon') { _tone('sine', 1100, 1300, 0.20, 0.09, null, null, false, 0.1); }
    else if (r === 'Rare') {
      _tone('sine', 900, 1100, 0.24, 0.12, null, null, false, -0.15);
      setTimeout(function() { _tone('sine', 1200, 1400, 0.18, 0.10, null, null, false, 0.15); }, 60);
    } else if (r === 'Epic') {
      _tone('sawtooth', 660, 880, 0.26, 0.13, 1200, 'lowpass', false, -0.2);
      setTimeout(function() { _tone('sawtooth', 880, 1100, 0.20, 0.12, 1400, 'lowpass', false, 0.2); }, 55);
      setTimeout(function() { _tone('sine', 1320, 1760, 0.12, 0.12, null, null, true, 0); }, 115);
    } else if (r === 'Legendary') {
      _bell(659, [[0, 1.0], [7, 0.6], [-7, 0.6]], 0.33, 0.55, true, -0.3);
      setTimeout(function() { _bell(880, [[0, 1.0], [5, 0.5]], 0.26, 0.50, true, 0.3); }, 80);
      setTimeout(function() { _bell(1320, [[0, 1.0], [4, 0.4]], 0.18, 0.45, true, 0); }, 180);
      setTimeout(function() { _bell(1760, [[0, 1.0]], 0.11, 0.40, true, 0.1); }, 310);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     AUDIO VISUALIZER
     ═══════════════════════════════════════════════════════════ */
  let _anlz = null, _vizRaf = null;
  const _vizLvl = [0, 0, 0, 0, 0, 0, 0];

  function startViz() {
    if (_anlz || !ctx) return;
    _anlz = ctx.createAnalyser();
    _anlz.fftSize = 64;
    masterGain.connect(_anlz);
    (function tick() {
      _vizRaf = requestAnimationFrame(tick);
      if (!_anlz) return;
      const buf = new Uint8Array(_anlz.frequencyBinCount);
      _anlz.getByteFrequencyData(buf);
      const step = Math.floor(_anlz.frequencyBinCount / 7);
      const fmap = { terran: '#00b4ff', shards: '#00ffee', horde: '#ff6622', necro: '#44ff66', accord: '#ffaa22', vorax: '#ff2266', guardians: '#cc44ff' };
      const col = fmap[currentFaction] || '#4488ff';
      for (let i = 0; i < 7; i++) {
        let val = 0;
        for (let b = i * step; b < (i + 1) * step && b < _anlz.frequencyBinCount; b++) val = Math.max(val, buf[b]);
        val = val / 255;
        _vizLvl[i] += (val - _vizLvl[i]) * 0.35;
        const bar = document.getElementById('avb' + i);
        if (bar) { bar.style.height = Math.max(2, Math.round(_vizLvl[i] * 14)) + 'px'; bar.style.background = col; }
      }
    })();
  }

  /* ═══════════════════════════════════════════════════════════
     PUBLIC API
     ═══════════════════════════════════════════════════════════ */
  function setFaction(key) { currentFaction = key; }
  function setVolume(v)    { if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v)); }
  function setSfxVol(v)    { if (sfxGain) sfxGain.gain.value = Math.max(0, Math.min(1, v)); }
  function getSfxVol()     { return sfxGain ? sfxGain.gain.value : 0.72; }

  return {
    init,
    setFaction,
    setVolume,
    setSfxVol,
    getSfxVol,
    playClick,
    playHover,
    playAction,
    playAccordion,
    playRarity,
    startViz,

    /* ── Stubs for backward compatibility ─────────────────── */
    /* These no-op so existing callers don't throw errors     */
    toggle:             function() {},
    startBg:            function() {},
    stopBg:             function() {},
    setMusicVol:        function() {},
    getMusicVol:        function() { return 0; },
    duck:               function() {},
    setBpm:             function() {},
    toggleBitcrush:     function() {},
    isBitcrushOn:       function() { return false; },
    setTrack:           function() {},
    toggleHum:          function() { return false; },
    toggleReverb:       function() {
      if (!reverbSend) return false;
      const now = ctx ? ctx.currentTime : 0;
      const revOn = reverbSend.gain.value > 0.01;
      if (revOn) {
        reverbSend.gain.cancelScheduledValues(now);
        reverbSend.gain.linearRampToValueAtTime(0.0001, now + 0.3);
      } else {
        reverbSend.gain.cancelScheduledValues(now);
        reverbSend.gain.linearRampToValueAtTime(0.18, now + 0.5);
      }
      return !revOn;
    },
    crossfadeToCategory: function() {},
    startCategoryBg:     function() {},
    stopCategoryBg:      function() {},
    onScroll:            function() {}
  };
})();
