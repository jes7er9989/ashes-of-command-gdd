/* ═══════════════════════════════════════════════════════════
   audio-engine.js — Procedural Web Audio Synthesis Engine
   Part of: Ashes of Command: The Reclamation (Interactive GDD)
   Created: 2026-03-28 | Ported from monolith v5.9.1
   Dependencies: None (standalone Web Audio API)
   ═══════════════════════════════════════════════════════════

   EXPORTS: AudioEngine (global IIFE)
     - init()                   Initialize AudioContext + signal chain
     - setFaction(key)          Switch faction theme (terran|shards|horde|necro|accord|vorax|guardians)
     - toggle()                 Start/stop background ambient
     - setVolume(v)             Master volume (0-1)
     - setMusicVol(v)           Background music volume
     - setSfxVol(v)             SFX volume
     - playClick()              UI click sound (faction-themed)
     - playHover()              UI hover sound (faction-themed)
     - playAction()             Action confirmation sound
     - playAccordion(isOpen)    Accordion open/close sound
     - playRarity(tier)         Rarity reveal sound
     - startBg(factionKey)      Start faction background ambient
     - stopBg()                 Stop background ambient
     - startViz()               Start audio visualizer
     - duck()                   Momentary volume duck
     - setBpm(bpm)              Set lo-fi BPM (60-95)
     - toggleBitcrush()         Toggle bitcrush effect
     - toggleHum()              Toggle vinyl hiss floor
     - toggleReverb()            Toggle reverb send

   SIGNAL CHAIN:
     voices → sfxGain ──┬──────────────→ comp → masterGain → tapeSaturation → out
                reverbSend → FDN reverb ─┘
     bgOscillators → bgGain ─────────────────────────────────────────────────┘

   AUTO-MUTED: AudioContext starts suspended. User interaction required.
   ═══════════════════════════════════════════════════════════ */
// ═══════════════════════════════════════════
// Phase 10: Procedural Web Audio Engine
// ═══════════════════════════════════════════
const AudioEngine = (() => {
  let ctx          = null;
  let masterGain   = null;
  let bgGain       = null;
  let sfxGain      = null;
  let reverbNode   = null;
  let reverbSend   = null;
  let stereoWider  = null;
  let bgNodes      = [];
  let _bgTimers    = [];
  let currentFaction = null;
  let isPlaying    = false;

  // ═══════════════════════════════════════════════════════
  // INIT — signal chain:
  // voices → sfxGain ──┬──────────────→ comp → masterGain → out
  //           reverbSend → reverb ──┘
  // bgOscillators → bgGain ───────────────────────────────┘
  // ═══════════════════════════════════════════════════════
  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    // ── Master output ──────────────────────────────────────────
    masterGain = ctx.createGain();
    masterGain.gain.value = 1.0;

    // ── A5: TAPE SATURATION — tanh soft-clip on master bus ─────
    // Models analog tape harmonic saturation
    const tapeWS = ctx.createWaveShaper();
    const tapeCurve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i * 2) / 1024 - 1;
      // tanh approximation — warm soft clip, preserves transients
      tapeCurve[i] = (Math.exp(2*x) - 1) / (Math.exp(2*x) + 1) * 1.08;
    }
    tapeWS.curve = tapeCurve;
    tapeWS.oversample = '4x';
    masterGain.connect(tapeWS);
    tapeWS.connect(ctx.destination);

    // ── Stereo compressor/limiter — glues all buses ────────────
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value      =  8;
    comp.ratio.value     =  6;
    comp.attack.value    =  0.002;
    comp.release.value   =  0.12;
    comp.connect(masterGain);

    // ── SFX bus ────────────────────────────────────────────────
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.72;
    sfxGain.connect(comp);

    // ── BG music bus ───────────────────────────────────────────
    bgGain = ctx.createGain();
    bgGain.gain.value = 0.38;
    bgGain.connect(comp);

    // ── A7: REVERB UPGRADE — 10-tap Feedback Delay Network ─────
    // Prime-interval delays + cross-feedback = dense diffuse reverb
    // Much richer than simple IR noise convolution
    const FDN_TAPS  = [1009,1201,1399,1597,1801,2003,2207,2411,2617,2819]; // prime samples
    const FDN_FBACK = 0.42;  // feedback coefficient (controls tail length)
    const FDN_DAMP  = 0.55;  // high-freq damping (warmth)
    const fdnMix    = ctx.createGain(); fdnMix.gain.value = 0.28;
    fdnMix.connect(sfxGain);
    const fdnDelays = [];
    FDN_TAPS.forEach(function(tapLen, i) {
      const dl = ctx.createDelay(0.25);
      dl.delayTime.value = tapLen / ctx.sampleRate;
      const fb = ctx.createGain(); fb.gain.value = FDN_DAMP * FDN_FBACK;
      const lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=4800-i*120;
      dl.connect(lp); lp.connect(fb); fb.connect(dl); // feedback loop
      dl.connect(fdnMix); // tap to output
      fdnDelays.push(dl);
    });
    // Cross-connect every other tap for diffusion
    for (let i = 0; i < fdnDelays.length - 1; i += 2) {
      const xg = ctx.createGain(); xg.gain.value = 0.08;
      fdnDelays[i].connect(xg); xg.connect(fdnDelays[i+1]);
    }
    // Route reverb send into all FDN taps
    reverbNode = { connect: function(dest){} }; // placeholder (not used directly)
    reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.18;
    fdnDelays.forEach(function(dl, i) {
      const ig = ctx.createGain(); ig.gain.value = 0.1 + (i % 3) * 0.04;
      reverbSend.connect(ig); ig.connect(dl);
    });

    // ── A6: VINYL HISS FLOOR ────────────────────────────────────
    // Pink-ish noise at -32dB — the warmth blanket under everything
    const hissLen = ctx.sampleRate * 4; // 4-second looping buffer
    const hissBuf = ctx.createBuffer(2, hissLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = hissBuf.getChannelData(ch);
      // Pink noise via Paul Kellet approximation
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      for (let i = 0; i < hissLen; i++) {
        const w = Math.random()*2-1;
        b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
        b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
        b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
        const pink = (b0+b1+b2+b3+b4+b5+b6+w*0.5362) * 0.11;
        b6 = w * 0.115926;
        d[i] = pink * 0.028; // -32dB
      }
    }
    const hissSrc = ctx.createBufferSource();
    hissSrc.buffer = hissBuf; hissSrc.loop = true;
    const hissHp = ctx.createBiquadFilter(); hissHp.type='highpass'; hissHp.frequency.value=3200;
    const hissGn = ctx.createGain(); hissGn.gain.value = 0;
    hissSrc.connect(hissHp); hissHp.connect(hissGn); hissGn.connect(bgGain);
    hissSrc.start();
    // Fade in after a moment (respects mute state via bgGain)
    hissGn.gain.setValueAtTime(0, ctx.currentTime);
    hissGn.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 3.0);

    // ── A22: SUB RUMBLE DRONE ────────────────────────────────────
    // 22Hz sine — felt not heard, adds cinematic weight
    const subOsc = ctx.createOscillator(); subOsc.type='sine'; subOsc.frequency.value=22;
    const subGn  = ctx.createGain(); subGn.gain.value=0;
    const subLp  = ctx.createBiquadFilter(); subLp.type='lowpass'; subLp.frequency.value=45;
    subOsc.connect(subLp); subLp.connect(subGn); subGn.connect(bgGain);
    subOsc.start();
    subGn.gain.setValueAtTime(0, ctx.currentTime);
    subGn.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 4.0);
  }

  // ── Soft-clip waveshaper (overdrive) ────────────────────────
  function _makeClip(amount) {
    const ws = ctx.createWaveShaper();
    const n = 512; const cv = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      cv[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    ws.curve = cv; ws.oversample = '4x'; return ws;
  }

  // ── Stereo panner helper ─────────────────────────────────────
  function _panner(pan) {
    if (!ctx.createStereoPanner) return null;
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    return p;
  }

  // ── Core tone: oscillator → optional filter → gain → sfx bus ─
  function _tone(type, f0, f1, vol, dur, filtHz, filtType, useRev, pan) {
    const now = ctx.currentTime;
    const o   = ctx.createOscillator();
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

  // ── White noise burst ────────────────────────────────────────
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

  // ── Distorted noise (Horde / Vorax aggression) ───────────────
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

  // ── Bell — multiple detuned voices, reverbed ─────────────────
  function _bell(freq, variants, vol, dur, useRev, pan) {
    variants.forEach(function(v) {
      const cents = v[0]; const relVol = v[1];
      const detunedFreq = freq * Math.pow(2, cents / 1200);
      _tone('sine', detunedFreq, detunedFreq * 0.5, vol * relVol, dur, null, null, useRev, pan);
    });
  }

  // ── Arpeggio ─────────────────────────────────────────────────
  function _arp(freqs, vol, noteDur, waveType, useRev) {
    freqs.forEach(function(item) {
      const fr = item[0]; const delay = item[1];
      setTimeout(function() {
        if (ctx) _tone(waveType || 'sine', fr, fr, vol, noteDur, null, null, useRev);
      }, delay * 1000);
    });
  }

  // ═══════════════════════════════════════════════════════
  // UI PROFILES — per-faction click + hover sounds
  // ═══════════════════════════════════════════════════════
  const uiProfiles = {

    // TERRAN LEAGUE — Military precision, metal & circuits
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

    // SCRAP-HORDE — Brutal industrial, rust & rage
    horde: {
      click() {
        _grind(0.72, 0.14, 160, 110, -0.4);
        _grind(0.50, 0.09, 420, 65,   0.4);
        setTimeout(function() {
          _tone('square', 130, 65, 0.32, 0.15, 380, 'lowpass', false, -0.2);
        }, 50);
      },
      hover() {
        _grind(0.38, 0.04, 900, 45, 0.3);
        _noise(0.22, 0.03, 2200, 5, false, -0.1);
      }
    },

    // ETERNAL SHARDS — Crystalline resonance, ethereal pings
    shards: {
      click() {
        _bell(2093, [[0,1.0],[+5,0.6],[-5,0.6],[+12,0.35]], 0.32, 0.55, true, -0.3);
        setTimeout(function() {
          _bell(6279, [[0,1.0],[+5,0.5]], 0.12, 0.42, true, 0.4);
        }, 15);
      },
      hover() {
        _bell(3520, [[0,1.0],[+7,0.42]], 0.13, 0.22, true, 0.25);
      }
    },

    // NECRO-LEGION — Cold mechanical, digital ghosts
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

    // UNITY ACCORD — Clean diplomatic clarity
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

    // VORAX COLLECTIVE — Organic swarm, wet biological
    vorax: {
      click() {
        _noise(0.62, 0.06, 700, 14, false, -0.35);
        _noise(0.38, 0.08, 200, 8,  false,  0.35);
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

    // CORE GUARDIANS — Deep cosmic, ancient resonance
    guardians: {
      click() {
        _bell(293, [[0,1.0],[+4,0.55],[-4,0.55]], 0.38, 1.0, true, -0.3);
        setTimeout(function() { _bell(440, [[0,1.0],[+3,0.48]], 0.24, 0.85, true, 0.3); }, 32);
        setTimeout(function() { _bell(587, [[0,1.0]], 0.14, 0.68, true, 0.0); }, 78);
      },
      hover() {
        _bell(1760, [[0,1.0],[+5,0.38]], 0.14, 0.24, true, 0.2);
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

  // ═══════════════════════════════════════════════════════
  // NAMED ACTIONS
  // ═══════════════════════════════════════════════════════
  function playAction(type) {
    if (!ctx) init();
    const f = currentFaction;

    switch (type) {

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

      case 'accordionOpen': {
        const hz = {terran:700,horde:200,shards:1400,necro:280,accord:880,vorax:480,guardians:370};
        const fq = hz[f] || 550;
        _tone('sine', fq * 0.65, fq, 0.24, 0.12, null, null, false, -0.1);
        break;
      }
      case 'accordionClose': {
        const hz = {terran:700,horde:200,shards:1400,necro:280,accord:880,vorax:480,guardians:370};
        const fq = hz[f] || 550;
        _tone('sine', fq, fq * 0.52, 0.20, 0.10, null, null, false, 0.1);
        break;
      }

      case 'filter': {
        const fp = {
          terran:    function() { _noise(0.26, 0.025, 700, 6, false, -0.2); setTimeout(function() { _tone('sawtooth', 1100, 700, 0.26, 0.07, 1200, 'lowpass', false, 0.2); }, 14); },
          horde:     function() { _grind(0.42, 0.06, 300, 70, 0.0); },
          shards:    function() { _bell(2637, [[0,1.0],[+8,0.5]], 0.22, 0.26, true, 0.3); },
          necro:     function() { _tone('triangle', 260, 130, 0.30, 0.14, 400, 'lowpass', true, -0.15); },
          accord:    function() { _tone('sine', 1047, 1319, 0.26, 0.09, null, null, false, 0.0); },
          vorax:     function() { _noise(0.38, 0.04, 600, 10, false, -0.2); setTimeout(function() { _noise(0.25, 0.04, 250, 7, false, 0.2); }, 18); },
          guardians: function() { _bell(349, [[0,1.0],[+5,0.5],[-5,0.5]], 0.26, 0.36, true, 0.0); }
        };
        (fp[f] || function() { _tone('sine', 900, 700, 0.24, 0.07); })();
        break;
      }

      case 'sort': {
        const bases = {terran:440,horde:220,shards:880,necro:330,accord:523,vorax:370,guardians:293};
        const waves = {terran:'sawtooth',horde:'square',shards:'sine',necro:'triangle',accord:'sine',vorax:'square',guardians:'triangle'};
        const b = bases[f] || 440;
        const w = waves[f] || 'sine';
        _arp([[b,0],[b*1.26,0.055],[b*1.587,0.11]], 0.26, 0.10, w, (f==='shards'||f==='guardians'));
        break;
      }

      case 'sidebarToggle':
        _grind(0.42, 0.06, 250, 40, -0.2);
        setTimeout(function() { _tone('triangle', 200, 120, 0.26, 0.10, 350, 'lowpass', false, 0.2); }, 40);
        break;

      case 'editOn':
        _tone('sawtooth', 440, 440, 0.36, 0.15, 600, 'lowpass', false, -0.15);
        setTimeout(function() { _tone('sawtooth', 660, 660, 0.36, 0.15, 600, 'lowpass', false, 0.15); }, 140);
        break;

      case 'editOff':
        _tone('triangle', 880, 440, 0.36, 0.22, 700, 'lowpass', true, -0.1);
        setTimeout(function() { _tone('sine', 660, 330, 0.22, 0.18, null, null, true, 0.1); }, 40);
        break;

      case 'export':
        _arp([[523,0],[659,0.085],[784,0.17],[1047,0.27]], 0.32, 0.22, 'sine', true);
        setTimeout(function() { _noise(0.18, 0.12, 4000, 3, true, 0.3); }, 280);
        break;

      case 'devUnlock':
        _arp([[523,0],[659,0.09],[784,0.18],[1047,0.28],[1319,0.40]], 0.34, 0.26, 'sine', true);
        setTimeout(function() {
          _bell(4186, [[0,1.0],[+12,0.6],[-12,0.6],[+24,0.3]], 0.18, 0.55, true, 0.0);
        }, 460);
        break;

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
            _grind(0.58, 0.20, 360, 85,   0.45);
            setTimeout(function() {
              _tone('square', 110, 55, 0.44, 0.30, 400, 'lowpass', false, 0.0);
              _noise(0.40, 0.14, 600, 5, false, -0.2);
            }, 65);
          },
          shards: function() {
            var notes = [[523,0],[659,90],[784,180],[1047,300],[1319,460]];
            notes.forEach(function(n) {
              setTimeout(function() {
                _bell(n[0], [[0,1.0],[+6,0.55],[-6,0.55]], 0.28, 0.58, true, (Math.random()-0.5)*0.7);
              }, n[1]);
            });
          },
          necro: function() {
            _bell(220, [[0,1.0],[+4,0.5]], 0.40, 0.58, true, -0.3);
            setTimeout(function() { _bell(165, [[0,1.0]], 0.32, 0.52, true, 0.3); }, 125);
            setTimeout(function() { _tone('triangle', 110, 55, 0.34, 0.48, 250, 'lowpass', true, 0.0); }, 265);
          },
          accord: function() {
            _arp([[1047,0],[1319,0.08],[1568,0.17],[2093,0.30]], 0.32, 0.24, 'sine', true);
          },
          vorax: function() {
            var bursts = [[600,0],[300,42],[900,82],[450,145],[200,210]];
            bursts.forEach(function(b) {
              setTimeout(function() { _noise(0.44, 0.11, b[0], 8 + Math.random()*6, false, (Math.random()-0.5)*0.8); }, b[1]);
            });
            setTimeout(function() { _tone('square', 80, 40, 0.38, 0.32, 280, 'lowpass', false, 0.0); }, 100);
          },
          guardians: function() {
            _bell(293, [[0,1.0],[+4,0.62],[-4,0.62]], 0.42, 1.15, true, -0.35);
            setTimeout(function() { _bell(440, [[0,1.0],[+3,0.52]], 0.30, 0.95, true, 0.35); }, 82);
            setTimeout(function() { _bell(587, [[0,1.0]], 0.22, 0.80, true, -0.1); }, 210);
            setTimeout(function() { _bell(880, [[0,1.0],[+5,0.38]], 0.14, 0.65, true, 0.1); }, 395);
          }
        };
        (stings[f] || function() { _tone('sine', 880, 440, 0.36, 0.22, null, null, true); })();
        break;
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // BACKGROUND AMBIENT v3 — Rich per-faction synthesis
  // Each faction has: drone + harmonic layers + LFO + noise
  // texture + slow rhythmic pulse — all routed to bgGain
  // ═══════════════════════════════════════════════════════
  function stopBg() {
    _bgTimers.forEach(function(tid) { clearInterval(tid); });
    _bgTimers = [];
    bgNodes.forEach(function(n) {
      try { n.stop && n.stop(); } catch(e) {}
      try { n.disconnect(); } catch(e) {}
    });
    bgNodes = [];
    isPlaying = false;
  }

  function _bgGain(vol, fadeIn) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + (fadeIn || 2.5));
    g.connect(bgGain);
    return g;
  }

  function _osc(type, freq) {
    var o = ctx.createOscillator();
    o.type = type; o.frequency.value = freq;
    return o;
  }

  function _lfo(rate, depth, target) {
    var lfo = ctx.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = rate;
    var g = ctx.createGain(); g.gain.value = depth;
    lfo.connect(g); g.connect(target);
    return lfo;
  }

  function _bqf(type, freq, q) {
    var f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q || 1;
    return f;
  }

  // ── Chord progression: smoothly cycle oscillator frequencies ──
  // Eliminates monotone drone by evolving harmony over time
  function _evolve(oscs, progressions, intervalSec) {
    var step = 0;
    var tid = setInterval(function() {
      if (!ctx) { clearInterval(tid); return; }
      step = (step + 1) % progressions.length;
      var chord = progressions[step];
      var now = ctx.currentTime;
      oscs.forEach(function(o, i) {
        if (o && o.frequency && chord[i] !== undefined) {
          o.frequency.setTargetAtTime(chord[i], now, 1.8);
        }
        // Subtle detune drift for organic movement
        if (o && o.detune) {
          o.detune.setTargetAtTime((Math.random() - 0.5) * 14, now, 2.0);
        }
      });
    }, intervalSec * 1000);
    _bgTimers.push(tid);
  }

  function startBg(factionKey) {
    if (!ctx) init();
    if (currentFaction === factionKey && isPlaying) return;
    stopBg();
    currentFaction = factionKey;
    isPlaying = true;

    var nodes = [];
    var now = ctx.currentTime;

    function start(n) { n.start(now); nodes.push(n); return n; }
    function out(n, vol, fade) { var g = _bgGain(vol, fade); n.connect(g); nodes.push(g); return g; }

    if (factionKey === 'terran') {
      // TERRAN: Pulsing industrial drone — sawtooth base, punchy rhythm, metallic shimmer
      var lp  = _bqf('lowpass', 220, 1.8);
      var base = _osc('sawtooth', 55);
      var lfoA = _lfo(0.28, 4, base.frequency);
      base.connect(lp);
      out(lp, 0.48, 2.5);
      start(base); start(lfoA);

      // Rhythmic pulse oscillator (AM)
      var pulse = _osc('square', 2.0);
      var pGain = ctx.createGain(); pGain.gain.value = 0.25;
      pulse.connect(pGain);
      var amOsc = _osc('sawtooth', 55);
      var amMod = ctx.createGain(); amMod.gain.value = 0;
      pGain.connect(amMod.gain);
      amOsc.connect(amMod);
      var lpAM = _bqf('lowpass', 180, 2.0);
      amMod.connect(lpAM); out(lpAM, 0.32, 3.0);
      start(pulse); start(amOsc);

      // High harmonic shimmer
      var shimmer = _osc('sawtooth', 220);
      var shimLp  = _bqf('bandpass', 700, 4);
      shimmer.connect(shimLp); out(shimLp, 0.10, 3.5);
      start(shimmer);

      // Chord progression: Am → D → E → C (military power cycle)
      _evolve([base, amOsc, shimmer], [
        [55,    55,    220],       // A — tonic
        [73.42, 73.42, 293.66],    // D — subdominant
        [82.41, 82.41, 329.63],    // E — dominant
        [65.41, 65.41, 261.63],    // C — mediant
      ], 6);

    } else if (factionKey === 'shards') {
      // SHARDS: Shimmering crystalline pads — bell-like tones, slow filter sweep
      var freqs = [110, 165, 220, 330, 440];
      var shardOscs = [];
      freqs.forEach(function(f, i) {
        var o = _osc('sine', f);
        shardOscs.push(o);
        var lp = _bqf('lowpass', 1200 + i * 200, 0.8);
        var lfoF = _lfo(0.04 + i * 0.015, 30 + i * 10, lp.frequency);
        o.connect(lp);
        out(lp, 0.10 - i * 0.015, 2.5 + i * 0.4);
        start(o); start(lfoF);
      });
      // Slow filter modulation master LFO adds to all
      var masterLFO = _osc('sine', 0.07);
      masterLFO.start(now); nodes.push(masterLFO);

      // Chord progression: ethereal suspended movement
      _evolve(shardOscs, [
        [110,   165,   220,    330,    440],       // A harmonics
        [123.47,185,   246.94, 370,    493.88],    // B — lifted
        [130.81,196,   261.63, 392,    523.25],    // C — bright
        [116.54,174.61,233.08, 349.23, 466.16],    // Bb — warmth
      ], 8);

    } else if (factionKey === 'horde') {
      // HORDE: Grinding chaotic low-end — multiple detuned distorted saws, noise hits
      var hordeOscs = [];
      [38, 41, 45].forEach(function(freq, i) {
        var o = _osc('sawtooth', freq);
        hordeOscs.push(o);
        var lp = _bqf('lowpass', 160, 2.5);
        var clip = _makeClip(60 + i * 20);
        o.connect(clip); clip.connect(lp);
        out(lp, 0.28, 2.0 + i * 0.3);
        start(o);
      });
      // Rhythmic grind pulse
      var rPulse = _osc('square', 3.8);
      var rGain  = ctx.createGain(); rGain.gain.value = 0.30;
      rPulse.connect(rGain);
      var rBase  = _osc('square', 42);
      var rMod   = ctx.createGain(); rMod.gain.value = 0;
      rGain.connect(rMod.gain);
      rBase.connect(rMod);
      var rLp    = _bqf('lowpass', 140, 3.0);
      rMod.connect(rLp); out(rLp, 0.35, 2.5);
      start(rPulse); start(rBase);

      // Chord progression: aggressive tritone shifts, chaotic
      _evolve([hordeOscs[0], hordeOscs[1], hordeOscs[2], rBase], [
        [38,   41,   45,   42],    // Root grind
        [42,   46,   51,   46],    // Shift up — tension
        [34,   37,   41,   38],    // Drop — crushing weight
        [41,   48,   54,   50],    // Wide dissonance
        [36,   40,   44,   40],    // Reset approach
      ], 5);

    } else if (factionKey === 'necro') {
      // NECRO: Cold digital minor — slow minor chord in triangle waves, glitchy artifacts
      var minorChord = [65, 77.78, 97.5]; // D-minor flavour
      var necroOscs = [];
      minorChord.forEach(function(f, i) {
        var o = _osc('triangle', f);
        necroOscs.push(o);
        var lp = _bqf('lowpass', 300 + i * 80, 1.2);
        var lfoT = _lfo(0.08 + i * 0.03, 1.5, o.frequency);
        o.connect(lp); out(lp, 0.20 - i * 0.04, 3.0);
        start(o); start(lfoT);
      });
      // Digital glitch noise layer
      var glitchBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      var gd = glitchBuf.getChannelData(0);
      for (var gi = 0; gi < gd.length; gi++) {
        gd[gi] = (Math.random() > 0.996) ? (Math.random() * 2 - 1) * 0.8 : 0;
      }
      var glitch = ctx.createBufferSource();
      glitch.buffer = glitchBuf; glitch.loop = true;
      var gLp = _bqf('bandpass', 3000, 8);
      glitch.connect(gLp); out(gLp, 0.06, 4.0);
      glitch.start(now); nodes.push(glitch);

      // Chord progression: cold minor descent, mechanical dread
      _evolve(necroOscs, [
        [65,    77.78, 97.5],      // Dm — root
        [58.27, 69.30, 87.31],     // Bbm — flatted
        [55,    65.41, 82.41],     // Am — descending
        [61.74, 73.42, 92.50],     // Bm — tension
      ], 7);

    } else if (factionKey === 'accord') {
      // ACCORD: Clean harmonic precision — pure sine harmonics, low tremolo
      var accord_freqs = [82.5, 123.75, 165, 206.25]; // clean tempered
      var accordOscs = [];
      accord_freqs.forEach(function(f, i) {
        var o = _osc('sine', f);
        accordOscs.push(o);
        var lfoTrem = _lfo(0.20 + i * 0.05, 0.8, ctx.createGain().gain);
        var g = ctx.createGain(); g.gain.value = 0.18 - i * 0.03;
        o.connect(g); g.connect(bgGain);
        var lfoFq = _lfo(0.06 + i * 0.02, 0.6, o.frequency);
        start(o); start(lfoFq);
        var gainNode = _bgGain(0.18 - i * 0.03, 2.5 + i * 0.3);
        o.connect(gainNode); nodes.push(gainNode);
      });

      // Chord progression: bright diplomatic clarity
      _evolve(accordOscs, [
        [82.5,  123.75, 165,    206.25],   // E — tonic
        [87.31, 130.81, 174.61, 220],      // F — warmth
        [98,    146.83, 196,    246.94],    // G — lift
        [110,   164.81, 220,    277.18],    // A — resolve
      ], 6);

    } else if (factionKey === 'vorax') {
      // VORAX: Bio-organic chittering — noise textures, slowly evolving filter sweeps
      var vFreqs = [35, 52, 78];
      var voraxOscs = [];
      vFreqs.forEach(function(f, i) {
        var o = _osc('sawtooth', f);
        voraxOscs.push(o);
        var hp = _bqf('highpass', 30 + i * 15, 0.8);
        var lp = _bqf('lowpass',  130 + i * 30, 1.5);
        var clip = _makeClip(40 + i * 15);
        o.connect(clip); clip.connect(hp); hp.connect(lp);
        out(lp, 0.22, 2.0 + i * 0.4);
        // Slow filter LFO for organic breathing
        var lfoV = _lfo(0.12 + i * 0.04, 25 + i * 8, lp.frequency);
        start(o); start(lfoV);
      });
      // Organic noise texture — bandpass filtered
      var vBuf = ctx.createBuffer(2, ctx.sampleRate * 4, ctx.sampleRate);
      for (var vch = 0; vch < 2; vch++) {
        var vd = vBuf.getChannelData(vch);
        for (var vi = 0; vi < vd.length; vi++) vd[vi] = Math.random() * 2 - 1;
      }
      var vNoise = ctx.createBufferSource();
      vNoise.buffer = vBuf; vNoise.loop = true;
      var vBp = _bqf('bandpass', 180, 3);
      var vLfoN = _lfo(0.09, 60, vBp.frequency);
      vNoise.connect(vBp); out(vBp, 0.08, 3.5);
      vNoise.start(now); start(vLfoN); nodes.push(vNoise);

      // Chord progression: alien asymmetric crawl
      _evolve(voraxOscs, [
        [35,   52,   78],      // Root — familiar
        [38,   57,   85],      // Rise — unsettling
        [32,   48,   72],      // Drop — predatory
        [40,   60,   90],      // Surge — aggression
        [33,   55,   82],      // Asymmetric return
      ], 5);

    } else if (factionKey === 'guardians') {
      // GUARDIANS: Deep cosmic resonance — bell drones, slow harmonic evolution
      var gFreqs = [36.5, 73, 109.5, 146]; // D-based harmonics, cosmic low
      var guardOscs = [];
      gFreqs.forEach(function(f, i) {
        var o = _osc('sine', f);
        guardOscs.push(o);
        var lp = _bqf('lowpass', 500 + i * 150, 0.7);
        var lfoG = _lfo(0.03 + i * 0.01, 0.4 + i * 0.2, o.frequency);
        o.connect(lp); out(lp, 0.15 - i * 0.025, 3.0 + i * 0.5);
        start(o); start(lfoG);
      });
      // Shimmer reverb layer — high sine drones
      var guardShimOscs = [];
      var shimFreqs = [587, 880, 1174];
      shimFreqs.forEach(function(f, i) {
        var o = _osc('sine', f);
        guardShimOscs.push(o);
        var g = ctx.createGain(); g.gain.value = 0;
        g.gain.linearRampToValueAtTime(0.028 - i * 0.006, ctx.currentTime + 4.0 + i);
        o.connect(g); g.connect(bgGain);
        start(o); nodes.push(g);
      });

      // Chord progression: ancient cosmic cycles, open fifths
      _evolve(guardOscs.concat(guardShimOscs), [
        [36.5,  73,    109.5,  146,   587,    880,    1174],     // D — ancient root
        [41,    82,    123,    164,   659.25, 987.77, 1318.51],  // E — ascension
        [43.65, 87.31, 130.81, 174.61,698.46,1046.5, 1396.91],  // F — solemnity
        [48.99, 98,    146.83, 196,   784,    1174.66,1567.98],  // G — cosmic resolve
      ], 8);
    }

    bgNodes = nodes;
  }

  function setFaction(key)  { currentFaction = key; }
  function setVolume(v)     { if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v)); }
  function setMusicVol(v)   { if (bgGain)     bgGain.gain.value     = Math.max(0, Math.min(1, v)); }
  function setSfxVol(v)     { if (sfxGain)    sfxGain.gain.value    = Math.max(0, Math.min(1, v)); }
  function getMusicVol()    { return bgGain   ? bgGain.gain.value   : 0.38; }
  function getSfxVol()      { return sfxGain  ? sfxGain.gain.value  : 0.72; }
  function toggle()         { if (isPlaying) stopBg(); else if (currentFaction) startBg(currentFaction); }

  /* ─ A16: AUTO-DUCK ─ */
  var _dkTimer=null;
  function duck(){
    if(!bgGain)return;
    var vol=getMusicVol();
    bgGain.gain.cancelScheduledValues(ctx.currentTime);
    bgGain.gain.setTargetAtTime(vol*0.55,ctx.currentTime,0.025);
    clearTimeout(_dkTimer);
    _dkTimer=setTimeout(function(){if(bgGain)bgGain.gain.setTargetAtTime(vol,ctx.currentTime,0.22);},320);
  }

  /* ─ A2/A7: CROSSFADE to category ─ */
  var _catNodes=[];
  function stopCategoryBg(){_catNodes.forEach(function(n){try{n.stop&&n.stop();}catch(e){}try{n.disconnect();}catch(e){}});_catNodes=[];}

  function crossfadeToCategory(key){
    if(!ctx)init();
    var ab=document.getElementById('audio-toggle');
    if(!ab||ab.getAttribute('data-on')!=='1')return;
    if(isPlaying||_catNodes.length){
      bgGain.gain.setTargetAtTime(0,ctx.currentTime,0.22);
      setTimeout(function(){stopBg();stopCategoryBg();_startCat(key);bgGain.gain.setValueAtTime(0,ctx.currentTime);bgGain.gain.setTargetAtTime(getMusicVol(),ctx.currentTime,0.5);},650);
    } else { _startCat(key); }
  }

  /* ─ A1: CATEGORY AMBIENT BEDS ─ */

  // ─────────────────────────────────────────────────────────────
  // M1: FULL LOFI SCI-FI HIP HOP ENGINE
  // Jazzy 7th/9th chord piano + swing drum machine + bass + vinyl
  // M5: BPM controlled by slider (default 75)
  // ─────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════
  // MIDI DUBSTEP GALAGA ENGINE — 4 Tracks
  // Lo-fi Nujabes warmth × Hans Zimmer cinematic × Travis Scott trap
  // × MIDI Dubstep Galaga arcade energy
  //
  // Track 1  "Deep Space Lo-fi"     — 70 BPM   chill/Nujabes
  // Track 2  "Command & Conquer"    — 82 BPM   cinematic Zimmer
  // Track 3  "Trap Protocol"        — 92 BPM   trap aggression
  // Track 4  "Void Drift"           — 58 BPM   ambient void
  // Track 5  "Galaga Attack"        — 138 BPM  arcade dubstep blitz
  // Track 6  "Wub Machine"          — 140 BPM  heavy wobble dubstep
  // Track 7  "8-Bit Overdrive"      — 160 BPM  retro MIDI hyperspeed
  // ═══════════════════════════════════════════════════════════════

  var _lofi_bpm   = 70;
  var _lofi_timer = null;
  var _lofi_step  = 0;
  var _lofi_until;
  var _activeTrack = 1;

  // ── Shared chord sets ──────────────────────────────────────────
  var TRACK_CHORDS = {
    1: { // Deep Space Lo-fi
      seq:['Am7','Dm9','Gmaj7','Cmaj9'],
      chords:{
        Am7:   {notes:[220,261.63,329.63,392],    bass:110,    mel:[440,523.25,392,659.25]},
        Dm9:   {notes:[174.61,220,261.63,329.63], bass:146.83, mel:[587.33,440,523.25,698.46]},
        Gmaj7: {notes:[196,246.94,293.66,369.99], bass:98,     mel:[392,493.88,587.33,369.99]},
        Cmaj9: {notes:[261.63,329.63,392,493.88], bass:130.81, mel:[523.25,659.25,784,493.88]}
      },
      bpm:70, swing:0.62,
      walk:{Am7:[110,164.81,110,196,220],Dm9:[146.83,220,146.83,261.63,293.66],Gmaj7:[98,146.83,98,185,196],Cmaj9:[130.81,196,130.81,246.94,261.63]},
      kick: [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
      snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
      hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
      hopen:[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0],
    },
    2: { // Command & Conquer
      seq:['Fm9','Bbm7','Ebmaj7','Abmaj9'],
      chords:{
        Fm9:   {notes:[174.61,207.65,261.63,311.13],bass:87.31, mel:[349.23,440,523.25,415.30]},
        Bbm7:  {notes:[116.54,138.59,174.61,207.65],bass:116.54,mel:[233.08,277.18,349.23,415.30]},
        Ebmaj7:{notes:[155.56,195,233.08,293.66],   bass:77.78, mel:[311.13,390,466.16,587.33]},
        Abmaj9:{notes:[103.83,130.81,164.81,195],   bass:103.83,mel:[207.65,261.63,329.63,390]}
      },
      bpm:82, swing:0.56,
      walk:{Fm9:[87.31,130.81,87.31,110,116.54],Bbm7:[116.54,174.61,116.54,138.59,155.56],Ebmaj7:[77.78,116.54,77.78,97.99,103.83],Abmaj9:[103.83,155.56,103.83,130.81,138.59]},
      kick: [1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0],
      snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
      hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
      hopen:[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0],
    },
    3: { // Trap Protocol
      seq:['Am','Em','F','C'],
      chords:{
        Am:{notes:[220,261.63,329.63,440],    bass:55,    mel:[880,1046.5,784,659.25]},
        Em:{notes:[164.81,196,246.94,329.63], bass:82.41, mel:[659.25,784,987.77,1318.51]},
        F: {notes:[174.61,220,261.63,349.23], bass:87.31, mel:[698.46,880,1046.5,1396.91]},
        C: {notes:[261.63,329.63,392,523.25], bass:65.41, mel:[1046.5,1318.51,784,987.77]}
      },
      bpm:92, swing:0.52,
      walk:{Am:[55,82.41,55,65.41,73.42],Em:[82.41,110,82.41,98,87.31],F:[87.31,130.81,87.31,98,110],C:[65.41,98,65.41,82.41,87.31]},
      kick: [1,0,0,0,1,0,1,0,1,0,0,0,1,0,0,0],
      snare:[0,0,0,0,0,0,1,0,0,0,0,0,1,0,1,0],
      hihat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      hopen:[0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0],
    },
    4: { // Void Drift
      seq:['Dmaj9','Amaj7','Bm9','F#m7'],
      chords:{
        Dmaj9: {notes:[146.83,185,220,277.18],  bass:73.42, mel:[293.66,370,440,554.37]},
        Amaj7: {notes:[110,138.59,164.81,220],   bass:55,    mel:[220,277.18,329.63,440]},
        Bm9:   {notes:[123.47,155.56,185,246.94],bass:61.74, mel:[246.94,311.13,370,493.88]},
        'F#m7':{notes:[92.50,110,138.59,185],    bass:46.25, mel:[185,220,277.18,369.99]}
      },
      bpm:58, swing:0.58,
      walk:{Dmaj9:[73.42,110,73.42,92.50,82.41],Amaj7:[55,82.41,55,73.42,69.30],Bm9:[61.74,92.50,61.74,82.41,87.31],'F#m7':[46.25,69.30,46.25,61.74,65.41]},
      kick: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      snare:[0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
      hihat:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
      hopen:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    },
    5: { // Galaga Attack — arcade dubstep
      seq:['Am','E','F','G'],
      chords:{
        Am:{notes:[220,261.63,329.63,440],    bass:55,    mel:[880,1046.5,1318.51,1760]},
        E: {notes:[164.81,206.65,246.94,329.63],bass:82.41,mel:[659.25,784,987.77,1318.51]},
        F: {notes:[174.61,220,261.63,349.23], bass:87.31, mel:[698.46,880,1046.5,1396.91]},
        G: {notes:[196,246.94,293.66,392],    bass:98,    mel:[784,987.77,1174.66,1567.98]}
      },
      bpm:138, swing:0.50,
      walk:{Am:[55,110,55,73.42,82.41],E:[82.41,164.81,82.41,98,110],F:[87.31,174.61,87.31,110,116.54],G:[98,196,98,130.81,146.83]},
      kick: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
      snare:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],
      hihat:[1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1],
      hopen:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
    },
    6: { // Wub Machine — heavy wobble dubstep
      seq:['Dm','Am','Bb','C'],
      chords:{
        Dm:{notes:[146.83,174.61,220,293.66], bass:36.71, mel:[587.33,440,698.46,587.33]},
        Am:{notes:[110,130.81,164.81,220],    bass:55,    mel:[440,523.25,659.25,880]},
        Bb:{notes:[116.54,146.83,174.61,233.08],bass:58.27,mel:[466.16,587.33,698.46,932.33]},
        C: {notes:[130.81,164.81,196,261.63], bass:65.41, mel:[523.25,659.25,784,1046.5]}
      },
      bpm:140, swing:0.50,
      walk:{Dm:[36.71,55,36.71,46.25,43.65],Am:[55,82.41,55,69.30,65.41],Bb:[58.27,87.31,58.27,73.42,69.30],C:[65.41,98,65.41,82.41,77.78]},
      kick: [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0],
      snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
      hihat:[1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
      hopen:[0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0],
    },
    7: { // 8-Bit Overdrive — retro MIDI hyperspeed
      seq:['C','Am','F','G'],
      chords:{
        C: {notes:[523.25,659.25,784,1046.5], bass:65.41, mel:[2093,1567.98,1318.51,1046.5]},
        Am:{notes:[440,523.25,659.25,880],    bass:55,    mel:[1760,1318.51,1046.5,880]},
        F: {notes:[349.23,440,523.25,698.46], bass:87.31, mel:[1396.91,1046.5,880,698.46]},
        G: {notes:[392,493.88,587.33,784],    bass:98,    mel:[1567.98,1174.66,987.77,784]}
      },
      bpm:160, swing:0.50,
      walk:{C:[65.41,130.81,65.41,98,87.31],Am:[55,110,55,82.41,73.42],F:[87.31,174.61,87.31,110,98],G:[98,196,98,130.81,116.54]},
      kick: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
      snare:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],
      hihat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      hopen:[0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0],
    },
  };

  function _tc() { return TRACK_CHORDS[_activeTrack]; }

  // ── State ────────────────────────────────────────────────────
  var _bitcrushOn = false;
  var _padGain = null, _padFilter = null, _padBreath = null;
  var _arpStep = 0, _lastStringSwell = -1;
  var _wobbleLFO = null, _wobbleLFOGain = null;
  var _dubDropPending = false;
  var _galBar = 0;   // bar counter for galaga phrase tracking
  var _galPhrase = 0; // galaga arpeggio phrase index

  // ── A3: Sidechain duck ───────────────────────────────────────
  function _scDuck(t) {
    if(!_padGain||!ctx) return;
    _padGain.gain.cancelScheduledValues(t);
    _padGain.gain.setValueAtTime(0.06,t);
    _padGain.gain.linearRampToValueAtTime(0.32,t+0.04);
    _padGain.gain.setTargetAtTime(0.48,t+0.06,0.12);
  }

  // ── Rhodes PeriodicWave ──────────────────────────────────────
  var _rhodesWave=null;
  function _getRhodesWave(){
    if(_rhodesWave)return _rhodesWave;
    var r=new Float32Array([0,1.0,0.40,0.10,0.03,0.01]),im=new Float32Array(6);
    _rhodesWave=ctx.createPeriodicWave(r,im,{disableNormalization:false});
    return _rhodesWave;
  }
  function _rhodes(freq,t,dur,vol){
    if(!ctx)return;
    var o1=ctx.createOscillator(); o1.setPeriodicWave(_getRhodesWave()); o1.frequency.value=freq;
    var o2=ctx.createOscillator(); o2.type='sine'; o2.frequency.value=freq; o2.detune.value=5;
    var g1=ctx.createGain(); g1.gain.value=0.72; var g2=ctx.createGain(); g2.gain.value=0.28;
    var env=ctx.createGain();
    env.gain.setValueAtTime(vol,t); env.gain.exponentialRampToValueAtTime(vol*0.55,t+0.025);
    env.gain.exponentialRampToValueAtTime(vol*0.12,t+Math.min(dur*0.6,0.8)); env.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    var lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2800; lp.Q.value=0.3;
    o1.connect(g1); o2.connect(g2); g1.connect(env); g2.connect(env); env.connect(lp); lp.connect(bgGain);
    var rv=ctx.createGain(); rv.gain.value=0.20; lp.connect(rv); rv.connect(reverbSend);
    o1.start(t); o1.stop(t+dur+0.05); o2.start(t); o2.stop(t+dur+0.05);
  }

  // ── DUBSTEP: Wobble Bass ──────────────────────────────────────
  // Classic Skream-style wobble: sawtooth → lowpass with LFO
  function _wobbleBass(freq, t, dur, vol, wubRate) {
    if(!ctx) return;
    wubRate = wubRate || 4; // LFO frequency in Hz
    var osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = freq;
    var osc2 = ctx.createOscillator(); osc2.type = 'square'; osc2.frequency.value = freq*0.998;
    var mix1=ctx.createGain(); mix1.gain.value=0.6; var mix2=ctx.createGain(); mix2.gain.value=0.4;

    // Lowpass filter that gets swept by LFO
    var lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=400; lp.Q.value=8;

    // LFO for the wobble
    var lfo=ctx.createOscillator(); lfo.type='sine'; lfo.frequency.value=wubRate;
    var lfoAmt=ctx.createGain(); lfoAmt.gain.value=800; // sweep amount in Hz
    lfo.connect(lfoAmt); lfoAmt.connect(lp.frequency);

    // Distortion/saturation for grit
    var ws=ctx.createWaveShaper();
    var curve=new Float32Array(256);
    for(var i=0;i<256;i++){var x=i*2/256-1;curve[i]=Math.tanh(x*3)*0.85;}
    ws.curve=curve;

    var env=ctx.createGain();
    env.gain.setValueAtTime(0,t); env.gain.linearRampToValueAtTime(vol,t+0.008);
    env.gain.setValueAtTime(vol,t+dur-0.05); env.gain.linearRampToValueAtTime(0,t+dur);

    // Sub-bass: pure sine underneath
    var sub=ctx.createOscillator(); sub.type='sine'; sub.frequency.value=freq*0.5;
    var subEnv=ctx.createGain(); subEnv.gain.setValueAtTime(vol*0.55,t); subEnv.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    var subLp=ctx.createBiquadFilter(); subLp.type='lowpass'; subLp.frequency.value=120;
    sub.connect(subLp); subLp.connect(subEnv); subEnv.connect(bgGain);

    osc.connect(mix1); osc2.connect(mix2); mix1.connect(lp); mix2.connect(lp);
    lp.connect(ws); ws.connect(env); env.connect(bgGain);
    var rv=ctx.createGain(); rv.gain.value=0.08; env.connect(rv); rv.connect(reverbSend);

    [osc,osc2,lfo,sub].forEach(function(x){x.start(t);x.stop(t+dur+0.1);});
  }

  // ── DUBSTEP: Half-time snare with heavy reverb ────────────────
  function _dubSnare(t) {
    if(!ctx) return;
    // White noise burst
    var n=Math.floor(ctx.sampleRate*0.22);
    var buf=ctx.createBuffer(1,n,ctx.sampleRate); var d=buf.getChannelData(0);
    for(var i=0;i<n;i++) d[i]=Math.random()*2-1;
    var src=ctx.createBufferSource(); src.buffer=buf;
    var hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=1800; hp.Q.value=0.5;
    var bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=2200; bp.Q.value=1.5;
    var g=ctx.createGain(); g.gain.setValueAtTime(0.55,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.22);
    // Tone component
    var ot=ctx.createOscillator(); ot.type='triangle'; ot.frequency.value=160;
    var gt=ctx.createGain(); gt.gain.setValueAtTime(0.25,t); gt.gain.exponentialRampToValueAtTime(0.0001,t+0.08);
    // Big reverb send
    var rv=ctx.createGain(); rv.gain.value=0.65;
    src.connect(hp); hp.connect(bp); bp.connect(g); g.connect(bgGain); g.connect(rv); rv.connect(reverbSend);
    ot.connect(gt); gt.connect(bgGain); gt.connect(rv);
    src.start(t); ot.start(t); ot.stop(t+0.1);
  }

  // ── DUBSTEP: Drop siren ───────────────────────────────────────
  function _dubSiren(t) {
    if(!ctx) return;
    var o=ctx.createOscillator(); o.type='sawtooth';
    o.frequency.setValueAtTime(600,t); o.frequency.linearRampToValueAtTime(200,t+0.5);
    o.frequency.linearRampToValueAtTime(800,t+1.0); o.frequency.linearRampToValueAtTime(150,t+1.8);
    var lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1200; lp.Q.value=3;
    var env=ctx.createGain();
    env.gain.setValueAtTime(0.06,t); env.gain.setValueAtTime(0.06,t+1.6); env.gain.linearRampToValueAtTime(0,t+1.9);
    var rv=ctx.createGain(); rv.gain.value=0.5;
    o.connect(lp); lp.connect(env); env.connect(bgGain); env.connect(rv); rv.connect(reverbSend);
    o.start(t); o.stop(t+2.0);
  }

  // ── DUBSTEP: Reese bass (detuned saws) ───────────────────────
  function _reeseBass(freq, t, dur, vol) {
    if(!ctx) return;
    var detunes=[-7,0,7,-14,14];
    detunes.forEach(function(det){
      var o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.value=freq; o.detune.value=det;
      var lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=600; lp.Q.value=4;
      // LFO filter sweep for movement
      var lfo=ctx.createOscillator(); lfo.type='sine'; lfo.frequency.value=0.5;
      var lfog=ctx.createGain(); lfog.gain.value=300; lfo.connect(lfog); lfog.connect(lp.frequency);
      var env=ctx.createGain();
      env.gain.setValueAtTime(0,t); env.gain.linearRampToValueAtTime(vol/detunes.length,t+0.01);
      env.gain.setValueAtTime(vol/detunes.length,t+dur-0.04); env.gain.linearRampToValueAtTime(0,t+dur);
      o.connect(lp); lp.connect(env); env.connect(bgGain);
      var rv=ctx.createGain(); rv.gain.value=0.12; env.connect(rv); rv.connect(reverbSend);
      [o,lfo].forEach(function(x){x.start(t);x.stop(t+dur+0.1);});
    });
  }

  // ── GALAGA: 8-bit laser zap ───────────────────────────────────
  function _galLaser(t, vol) {
    if(!ctx) return;
    vol = vol || 0.09;
    var o=ctx.createOscillator(); o.type='square';
    o.frequency.setValueAtTime(1800+Math.random()*800,t);
    o.frequency.exponentialRampToValueAtTime(200+Math.random()*200,t+0.08);
    var env=ctx.createGain(); env.gain.setValueAtTime(vol,t); env.gain.exponentialRampToValueAtTime(0.0001,t+0.10);
    // 1-bit bitcrush feel
    var ws=ctx.createWaveShaper();
    var cv=new Float32Array(256);
    for(var i=0;i<256;i++) cv[i]=i<128?-1:1; // hard 1-bit clip
    ws.curve=cv;
    o.connect(ws); ws.connect(env); env.connect(bgGain);
    o.start(t); o.stop(t+0.12);
  }

  // ── GALAGA: alien death explosion ────────────────────────────
  function _galBoom(t, vol) {
    if(!ctx) return;
    vol = vol || 0.12;
    var n=Math.floor(ctx.sampleRate*0.18);
    var buf=ctx.createBuffer(1,n,ctx.sampleRate); var d=buf.getChannelData(0);
    for(var i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
    var src=ctx.createBufferSource(); src.buffer=buf;
    // Step-down pitch via re-triggering at different rates
    var bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=180+Math.random()*120; bp.Q.value=3;
    var env=ctx.createGain(); env.gain.setValueAtTime(vol,t); env.gain.exponentialRampToValueAtTime(0.0001,t+0.2);
    src.connect(bp); bp.connect(env); env.connect(bgGain);
    src.start(t);
  }

  // ── GALAGA: MIDI arpeggio blaster ────────────────────────────
  // Fast staccato square-wave arp — the Galaga melody engine
  function _galArp(freqs, t, sd, vol) {
    if(!ctx) return;
    freqs.forEach(function(freq, i) {
      var o=ctx.createOscillator(); o.type='square'; o.frequency.value=freq;
      var env=ctx.createGain();
      env.gain.setValueAtTime(vol,t+i*sd);
      env.gain.setValueAtTime(vol,t+i*sd+sd*0.65);
      env.gain.linearRampToValueAtTime(0,t+i*sd+sd*0.75);
      // mild LP to tame harshness
      var lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=3200;
      o.connect(lp); lp.connect(env); env.connect(bgGain);
      o.start(t+i*sd); o.stop(t+i*sd+sd*0.8);
    });
  }

  // ── GALAGA: 8-bit chord stab ─────────────────────────────────
  function _galChord(freqs, t, dur, vol) {
    if(!ctx) return;
    freqs.forEach(function(freq) {
      var o=ctx.createOscillator(); o.type='square'; o.frequency.value=freq;
      var o2=ctx.createOscillator(); o2.type='pulse'||'square'; o2.frequency.value=freq*2.005; o2.detune.value=7;
      var env=ctx.createGain();
      env.gain.setValueAtTime(vol/freqs.length,t);
      env.gain.exponentialRampToValueAtTime(vol/freqs.length*0.3,t+0.06);
      env.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      var lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2800;
      o.connect(lp); o2.connect(lp); lp.connect(env); env.connect(bgGain);
      var rv=ctx.createGain(); rv.gain.value=0.15; env.connect(rv); rv.connect(reverbSend);
      o.start(t); o.stop(t+dur+0.05); o2.start(t); o2.stop(t+dur+0.05);
    });
  }

  // ── GALAGA: Space invader descend sweep ──────────────────────
  function _galSweep(t, down) {
    if(!ctx) return;
    var o=ctx.createOscillator(); o.type='triangle';
    if(down) {
      o.frequency.setValueAtTime(1200,t); o.frequency.exponentialRampToValueAtTime(80,t+0.18);
    } else {
      o.frequency.setValueAtTime(80,t); o.frequency.exponentialRampToValueAtTime(1800,t+0.18);
    }
    var env=ctx.createGain(); env.gain.setValueAtTime(0.07,t); env.gain.exponentialRampToValueAtTime(0.0001,t+0.22);
    o.connect(env); env.connect(bgGain); o.start(t); o.stop(t+0.25);
  }

  // ── GALAGA: Coin / 1UP jingle ────────────────────────────────
  function _galCoin(t) {
    if(!ctx) return;
    [[523.25,0],[659.25,0.06],[784,0.12],[1046.5,0.18]].forEach(function(p) {
      var o=ctx.createOscillator(); o.type='square'; o.frequency.value=p[0];
      var env=ctx.createGain(); env.gain.setValueAtTime(0.055,t+p[1]); env.gain.exponentialRampToValueAtTime(0.0001,t+p[1]+0.08);
      o.connect(env); env.connect(bgGain); o.start(t+p[1]); o.stop(t+p[1]+0.10);
    });
  }

  // ── GALAGA: Warp gate bass hit ────────────────────────────────
  function _galWarp(t) {
    if(!ctx) return;
    var o=ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(55,t); o.frequency.exponentialRampToValueAtTime(28,t+0.35);
    var lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=100;
    var env=ctx.createGain(); env.gain.setValueAtTime(0.9,t); env.gain.exponentialRampToValueAtTime(0.0001,t+0.4);
    o.connect(lp); lp.connect(env); env.connect(bgGain);
    // High distortion for impact
    var ws2=ctx.createWaveShaper(); var cv2=new Float32Array(256);
    for(var i=0;i<256;i++){var x=i*2/256-1;cv2[i]=Math.sign(x)*Math.pow(Math.abs(x),0.3);}
    ws2.curve=cv2;
    var env2=ctx.createGain(); env2.gain.setValueAtTime(0.15,t); env2.gain.exponentialRampToValueAtTime(0.0001,t+0.3);
    o.connect(ws2); ws2.connect(env2); env2.connect(bgGain);
    o.start(t); o.stop(t+0.45);
  }

  // ── 808 sub-bass ─────────────────────────────────────────────
  function _lofi808(freq,t,dur,vol,isRoot){
    if(!ctx)return;
    var o=ctx.createOscillator(); o.type='sine';
    var sf=isRoot?freq*1.8:freq*1.3;
    o.frequency.setValueAtTime(sf,t); o.frequency.exponentialRampToValueAtTime(freq,t+(isRoot?0.28:0.10));
    var env=ctx.createGain();
    env.gain.setValueAtTime(0,t); env.gain.linearRampToValueAtTime(vol,t+0.003);
    env.gain.exponentialRampToValueAtTime(vol*0.45,t+dur*0.4); env.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    var lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=280; lp.Q.value=0.6;
    var lp2=ctx.createBiquadFilter(); lp2.type='lowpass'; lp2.frequency.value=180; lp2.Q.value=0.5;
    o.connect(lp); lp.connect(lp2); lp2.connect(env); env.connect(bgGain);
    o.start(t); o.stop(t+dur+0.1);
  }

  // ── Kick ─────────────────────────────────────────────────────
  function _lofiKick(t,hardness){
    if(!ctx)return; hardness=hardness||1.0;
    var o=ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(140*hardness,t); o.frequency.exponentialRampToValueAtTime(38,t+0.10);
    var g=ctx.createGain(); g.gain.setValueAtTime(0.9*hardness,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.22);
    var lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=220;
    o.connect(lp); lp.connect(bgGain); o.start(t); o.stop(t+0.25);
    // Click transient
    var click=ctx.createOscillator(); click.type='sine'; click.frequency.value=3000;
    var cg=ctx.createGain(); cg.gain.setValueAtTime(0.15,t); cg.gain.exponentialRampToValueAtTime(0.0001,t+0.005);
    click.connect(cg); cg.connect(bgGain); click.start(t); click.stop(t+0.01);
  }

  // ── Snare ────────────────────────────────────────────────────
  function _lofiSnare(t){
    if(!ctx)return;
    var n=Math.floor(ctx.sampleRate*0.14); var buf=ctx.createBuffer(1,n,ctx.sampleRate); var d=buf.getChannelData(0);
    for(var i=0;i<n;i++){var raw=Math.random()*2-1; d[i]=_bitcrushOn?(Math.round(raw*7)/7):raw;}
    var src=ctx.createBufferSource(); src.buffer=buf;
    var hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=2000; hp.Q.value=0.6;
    var gn=ctx.createGain(); gn.gain.setValueAtTime(0.28,t); gn.gain.exponentialRampToValueAtTime(0.0001,t+0.14);
    src.connect(hp); hp.connect(gn); gn.connect(bgGain); src.start(t);
    var ot=ctx.createOscillator(); ot.type='triangle'; ot.frequency.value=185;
    var gt=ctx.createGain(); gt.gain.setValueAtTime(0.18,t); gt.gain.exponentialRampToValueAtTime(0.0001,t+0.055);
    ot.connect(gt); gt.connect(bgGain); ot.start(t); ot.stop(t+0.07);
  }

  function _lofiClap(t){
    if(!ctx)return;
    [0,0.012].forEach(function(offset){
      var n=Math.floor(ctx.sampleRate*0.025); var buf=ctx.createBuffer(1,n,ctx.sampleRate); var d=buf.getChannelData(0);
      for(var i=0;i<n;i++) d[i]=Math.random()*2-1;
      var src=ctx.createBufferSource(); src.buffer=buf;
      var hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=1400;
      var bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1100; bp.Q.value=1.2;
      var g=ctx.createGain(); g.gain.setValueAtTime(offset===0?0.22:0.16,t+offset); g.gain.exponentialRampToValueAtTime(0.0001,t+offset+0.025);
      src.connect(hp); hp.connect(bp); bp.connect(g); g.connect(bgGain); src.start(t+offset);
    });
  }

  function _lofiHihat(t,open){
    if(!ctx)return;
    var dur=open?0.10:0.028; var n=Math.floor(ctx.sampleRate*dur);
    var buf=ctx.createBuffer(1,n,ctx.sampleRate); var d=buf.getChannelData(0);
    for(var i=0;i<n;i++) d[i]=Math.random()*2-1;
    var src=ctx.createBufferSource(); src.buffer=buf;
    var hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=8000; hp.Q.value=1.0;
    var g=ctx.createGain(); g.gain.setValueAtTime(open?0.10:0.055,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    src.connect(hp); hp.connect(g); g.connect(bgGain); src.start(t);
  }

  // ── Vinyl crackle ────────────────────────────────────────────
  function _lofiCrackle(t){
    if(!ctx||Math.random()>0.35)return;
    var dur=0.004+Math.random()*0.007; var n=Math.floor(ctx.sampleRate*dur);
    var buf=ctx.createBuffer(1,n,ctx.sampleRate); var d=buf.getChannelData(0);
    for(var i=0;i<n;i++) d[i]=Math.random()*2-1;
    var src=ctx.createBufferSource(); src.buffer=buf;
    var bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=2500+Math.random()*5000; bp.Q.value=2;
    var g=ctx.createGain(); g.gain.value=0.035+Math.random()*0.045;
    src.connect(bp); bp.connect(g); g.connect(bgGain); src.start(t);
  }

  // ── FM Chime ─────────────────────────────────────────────────
  function _lofiChime(freq,t,vol){
    if(!ctx)return;
    var mod=ctx.createOscillator(); mod.type='sine'; mod.frequency.value=freq*3.51;
    var modGain=ctx.createGain(); modGain.gain.value=freq*2.8; mod.connect(modGain);
    var car=ctx.createOscillator(); car.type='sine'; car.frequency.value=freq; modGain.connect(car.frequency);
    var env=ctx.createGain(); env.gain.setValueAtTime(vol,t); env.gain.exponentialRampToValueAtTime(vol*0.4,t+0.015);
    env.gain.exponentialRampToValueAtTime(vol*0.08,t+0.18); env.gain.exponentialRampToValueAtTime(0.0001,t+0.9);
    var hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=900;
    car.connect(hp); hp.connect(env); env.connect(bgGain);
    var rv=ctx.createGain(); rv.gain.value=0.55; env.connect(rv); rv.connect(reverbSend);
    mod.start(t); mod.stop(t+0.95); car.start(t); car.stop(t+0.95);
  }

  // ── Trap Flute ───────────────────────────────────────────────
  function _lofiFlute(freq,t,dur,vol){
    if(!ctx)return;
    var o=ctx.createOscillator(); o.type='sine'; o.frequency.value=freq;
    var o2=ctx.createOscillator(); o2.type='sine'; o2.frequency.value=freq*2.003;
    var vib=ctx.createOscillator(); vib.type='sine'; vib.frequency.value=5.5;
    var vibG=ctx.createGain(); vibG.gain.value=freq*0.011; vib.connect(vibG); vibG.connect(o.frequency);
    var env=ctx.createGain();
    env.gain.setValueAtTime(0,t); env.gain.linearRampToValueAtTime(vol,t+0.06);
    env.gain.setValueAtTime(vol,t+dur-0.08); env.gain.linearRampToValueAtTime(0,t+dur);
    var g1=ctx.createGain(); g1.gain.value=0.65; var g2=ctx.createGain(); g2.gain.value=0.22;
    o.connect(g1); o2.connect(g2); g1.connect(env); g2.connect(env); env.connect(bgGain);
    var rv=ctx.createGain(); rv.gain.value=0.28; env.connect(rv); rv.connect(reverbSend);
    [o,o2,vib].forEach(function(x){x.start(t);x.stop(t+dur+0.1);});
  }

  // ── Void pad ─────────────────────────────────────────────────
  function _voidPad(freq,t,dur,vol){
    if(!ctx)return;
    [freq,freq*2.003,freq*3.007,freq*0.5].forEach(function(f,i){
      var o=ctx.createOscillator(); o.type='sine'; o.frequency.value=f; o.detune.value=(i-1.5)*6;
      var env=ctx.createGain(); env.gain.setValueAtTime(0,t); env.gain.linearRampToValueAtTime(vol/(i+1)*0.8,t+1.2);
      env.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      var lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=700;
      o.connect(lp); lp.connect(env); env.connect(bgGain);
      var rv=ctx.createGain(); rv.gain.value=0.60; env.connect(rv); rv.connect(reverbSend);
      o.start(t); o.stop(t+dur+0.1);
    });
  }

  // ── Zimmer pad ───────────────────────────────────────────────
  function _zimmerPad(freq,t,dur,vol){
    if(!ctx)return;
    [-14,-5,0,5,14,-9,9].forEach(function(det,i){
      var o=ctx.createOscillator(); o.type=i<5?'sawtooth':'sine'; o.frequency.value=freq*(i===6?2.005:1.0); o.detune.value=det+(Math.random()-0.5)*2;
      var lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1200; lp.Q.value=0.4;
      var env=ctx.createGain();
      env.gain.setValueAtTime(0,t); env.gain.linearRampToValueAtTime(vol/7*0.7,t+0.45);
      env.gain.setValueAtTime(vol/7*0.7,t+dur-0.4); env.gain.linearRampToValueAtTime(0,t+dur);
      o.connect(lp); lp.connect(env); env.connect(bgGain);
      var rv=ctx.createGain(); rv.gain.value=0.45; env.connect(rv); rv.connect(reverbSend);
      o.start(t); o.stop(t+dur+0.1);
    });
  }

  // ── String swell ─────────────────────────────────────────────
  function _lofiStrings(ch,t,dur,vol){
    if(!ctx)return;
    ch.notes.slice(0,3).forEach(function(freq,i){
      [-8,0,8,-4].forEach(function(det){
        var o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.value=freq; o.detune.value=det+(Math.random()-0.5)*3;
        var lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=900; lp.Q.value=0.3;
        var env=ctx.createGain();
        env.gain.setValueAtTime(0,t); env.gain.linearRampToValueAtTime(vol*(1-i*0.28),t+0.6);
        env.gain.setValueAtTime(vol*(1-i*0.28),t+dur-0.5); env.gain.linearRampToValueAtTime(0,t+dur);
        var rv=ctx.createGain(); rv.gain.value=0.35;
        o.connect(lp); lp.connect(env); env.connect(bgGain); lp.connect(rv); rv.connect(reverbSend);
        o.start(t); o.stop(t+dur+0.1);
      });
    });
  }

  function _lofiArp(freq,t,dur,vol){
    if(!ctx)return;
    var o=ctx.createOscillator(); o.type='sine'; o.frequency.value=freq; o.detune.value=(Math.random()-0.5)*6;
    var env=ctx.createGain(); env.gain.setValueAtTime(vol,t); env.gain.exponentialRampToValueAtTime(vol*0.3,t+0.04); env.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    var lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1800; lp.Q.value=0.4;
    o.connect(lp); lp.connect(env); env.connect(bgGain); o.start(t); o.stop(t+dur+0.05);
  }

  function _lofiGhost(freq,t,vol){
    if(!ctx)return;
    var o=ctx.createOscillator(); o.type='sine'; o.frequency.value=freq;
    var env=ctx.createGain(); env.gain.setValueAtTime(0,t); env.gain.linearRampToValueAtTime(vol,t+0.002); env.gain.exponentialRampToValueAtTime(0.0001,t+0.12);
    var lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=200;
    o.connect(lp); lp.connect(env); env.connect(bgGain); o.start(t); o.stop(t+0.15);
  }

  function _lofiRiser(t,dur){
    if(!ctx)return;
    var n=Math.floor(ctx.sampleRate*dur); var buf=ctx.createBuffer(1,n,ctx.sampleRate); var d=buf.getChannelData(0);
    for(var i=0;i<n;i++) d[i]=Math.random()*2-1;
    var src=ctx.createBufferSource(); src.buffer=buf;
    var bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=2.5;
    bp.frequency.setValueAtTime(200,t); bp.frequency.exponentialRampToValueAtTime(3200,t+dur);
    var env=ctx.createGain(); env.gain.setValueAtTime(0,t); env.gain.linearRampToValueAtTime(0.045,t+dur*0.6); env.gain.linearRampToValueAtTime(0,t+dur);
    src.connect(bp); bp.connect(env); env.connect(bgGain);
    var rv=ctx.createGain(); rv.gain.value=0.4; env.connect(rv); rv.connect(reverbSend);
    src.start(t);
  }

  function _lofiStutter(t,baseFreq){
    if(!ctx)return;
    var hits=3+Math.floor(Math.random()*3); var gap=0.022+Math.random()*0.018;
    for(var si=0;si<hits;si++){
      var st=t+si*gap; var n=Math.floor(ctx.sampleRate*0.018);
      var buf=ctx.createBuffer(1,n,ctx.sampleRate); var d=buf.getChannelData(0);
      for(var k=0;k<n;k++) d[k]=Math.random()*2-1;
      var src=ctx.createBufferSource(); src.buffer=buf;
      var bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=baseFreq*(0.9+Math.random()*0.2); bp.Q.value=4;
      var g=ctx.createGain(); g.gain.value=0.032*(1-si/hits);
      src.connect(bp); bp.connect(g); g.connect(bgGain); src.start(st);
    }
  }

  var _rainNode=null;
  function _startRain(){
    if(!ctx||_rainNode)return;
    if(_activeTrack>=5)return; // no rain on dubstep/galaga tracks
    var sec=ctx.sampleRate*6; var buf=ctx.createBuffer(2,sec,ctx.sampleRate);
    for(var ch=0;ch<2;ch++){
      var d=buf.getChannelData(ch); var b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      for(var i=0;i<sec;i++){
        var w=Math.random()*2-1;
        b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.96900*b2+w*0.1538520;
        b3=0.86650*b3+w*0.3104856; b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
        d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11*0.055; b6=w*0.115926;
      }
    }
    var src=ctx.createBufferSource(); src.buffer=buf; src.loop=true;
    var lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=4800;
    var hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=600;
    var g=ctx.createGain(); g.gain.setValueAtTime(0,ctx.currentTime); g.gain.linearRampToValueAtTime(_activeTrack===4?0:0.38,ctx.currentTime+5);
    src.connect(lp); lp.connect(hp); hp.connect(g); g.connect(bgGain);
    src.start(); _rainNode=src;
  }

  var _melDelay=null;
  function _getMelDelay(){
    if(_melDelay)return _melDelay;
    if(!ctx)return null;
    var dly=ctx.createDelay(2.0); dly.delayTime.value=(60/_lofi_bpm)*0.75;
    var fbG=ctx.createGain(); fbG.gain.value=0.38;
    var wetG=ctx.createGain(); wetG.gain.value=0.22;
    var hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=800;
    dly.connect(fbG); fbG.connect(hp); hp.connect(dly); dly.connect(wetG); wetG.connect(bgGain);
    _melDelay=dly; return _melDelay;
  }

  // ── GALAGA ARPEGGIO PHRASES ───────────────────────────────────
  // Each phrase = array of multipliers off the root bass note
  var GAL_PHRASES = [
    // Classic Galaga ascending run
    [1,1.25,1.5,2,2.5,3,4,3,2,1.5,1.25,1],
    // Space invader march
    [1,1,1.5,1,1.25,1,1.5,1.5,2,1.5,1.25,1,1],
    // Boss approach
    [1,1.5,2,2.5,2,1.5,1,0.75,1,1.5,2,3],
    // Victory fanfare (coin-ish)
    [2,2.5,3,4,3,2.5,2,2.5,3,4,5,4],
    // Laser grid sweep
    [4,3,2,1.5,1.25,1,1.25,1.5,2,3,4,5,4,3],
    // Warp drive
    [1,2,4,8,4,2,1,0.5,1,2,4,2],
  ];

  // ── MAIN SCHEDULER ───────────────────────────────────────────
  function _lofiSchedule(){
    if(!ctx||!isPlaying)return;
    var tc=_tc(), bpm=_lofi_bpm, sd=60/bpm/4;
    var swing=tc.swing||0.50, ahead=0.18, now2=ctx.currentTime;
    if(!_lofi_until) _lofi_until=now2;

    while(_lofi_until < now2+ahead){
      var s16=_lofi_step%16;
      var bar=Math.floor(_lofi_step/16);
      var chSeq=tc.seq;
      var chIdx=Math.floor((_lofi_step%(chSeq.length*32))/32);
      var stepInCh=_lofi_step%32;
      var ch=tc.chords[chSeq[chIdx]];
      var walkData=tc.walk[chSeq[chIdx]];
      var t=_lofi_until+((s16%2===1)?sd*(swing-0.5):0);

      var isGalaga  = _activeTrack===5;
      var isWub     = _activeTrack===6;
      var is8bit    = _activeTrack===7;
      var isArcade  = isGalaga||is8bit;
      var isDub     = isWub;
      var isLofi    = _activeTrack<=4;

      // ── DRUMS ──────────────────────────────────────────────
      if(tc.kick[s16]){
        _lofiKick(t, isDub?1.6:isArcade?1.4:1.0);
        _scDuck(t);
      }
      if(tc.snare[s16]){
        if(isDub) _dubSnare(t);
        else { _lofiSnare(t); if(!isArcade) _lofiClap(t); }
      }
      if(tc.hihat[s16]) _lofiHihat(t, false);
      if(tc.hopen[s16]) _lofiHihat(t, true);

      // Extra hi-hat rolls (all tracks)
      if(s16===14 && bar%2===1 && Math.random()>0.30){
        var rollLen=isArcade?8:(Math.random()>0.5?4:6);
        for(var ri=0;ri<rollLen;ri++) _lofiHihat(t+ri*(sd/2)*0.5,false);
      }

      // ── BASS LAYER ─────────────────────────────────────────
      if(isWub){
        // Dubstep wobble bass on every chord change
        if(stepInCh===0)  _wobbleBass(walkData[0]*0.5, t, sd*14, 0.55, 2);
        if(stepInCh===16) _wobbleBass(walkData[2]*0.5, t, sd*12, 0.45, 4);
        // Reese bass on offbeats
        if(stepInCh===8)  _reeseBass(walkData[1]*0.5, t, sd*6,  0.30);
        if(stepInCh===24) _reeseBass(walkData[3]*0.5, t, sd*5,  0.25);
        // Sub hits
        if(tc.kick[s16])  _lofi808(walkData[0]*0.5, t, sd*2, 0.50, true);
      } else if(isGalaga||is8bit){
        // Galaga: punchy 808 on kick
        if(tc.kick[s16])  _lofi808(walkData[0], t, sd*2.5, 0.55, true);
        if(stepInCh===8)  _lofi808(walkData[1], t, sd*2.0, 0.35, false);
        if(stepInCh===16) _lofi808(walkData[2], t, sd*2.5, 0.45, true);
        if(stepInCh===24) _lofi808(walkData[3], t, sd*1.5, 0.28, false);
      } else {
        // Lo-fi/cinematic: melodic bass walk
        if(stepInCh===0)  _lofi808(walkData[0], t, sd*7.5, 0.68, true);
        if(stepInCh===8)  _lofi808(walkData[1], t, sd*4.5, 0.38, false);
        if(stepInCh===16) _lofi808(walkData[2], t, sd*6.0, 0.55, true);
        if(stepInCh===24) _lofi808(walkData[3], t, sd*3.5, 0.32, false);
        if(stepInCh===28) _lofi808(walkData[4], t, sd*2.5, 0.28, false);
      }

      // ── HARMONY / CHORDS ───────────────────────────────────
      if(stepInCh===0){
        var cdur=sd*13;
        if(isWub){
          // Dubstep: filtered sawtooth chord stabs on beat 1
          ch.notes.forEach(function(f,i){
            var o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.value=f;
            var lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=400; lp.Q.value=5;
            // LFO opens filter
            var lfo=ctx.createOscillator(); lfo.type='sine'; lfo.frequency.value=1.5;
            var lg=ctx.createGain(); lg.gain.value=600; lfo.connect(lg); lg.connect(lp.frequency);
            var env=ctx.createGain();
            env.gain.setValueAtTime(0.08,t); env.gain.exponentialRampToValueAtTime(0.02,t+0.4);
            env.gain.exponentialRampToValueAtTime(0.0001,t+cdur);
            o.connect(lp); lp.connect(env); env.connect(bgGain);
            [o,lfo].forEach(function(x){x.start(t);x.stop(t+cdur+0.1);});
          });
        } else if(isGalaga||is8bit){
          // 8-bit square chord stab
          _galChord(ch.notes, t, sd*2.5, 0.12);
          // Extra echo stab on beat 3
          if(Math.random()>0.4) _galChord(ch.notes, t+sd*8, sd*1.5, 0.07);
        } else if(_activeTrack===2){
          ch.notes.forEach(function(f,i){ _zimmerPad(f,t+i*0.02,cdur,0.30/ch.notes.length); });
        } else if(_activeTrack===4){
          ch.notes.forEach(function(f,i){ _voidPad(f,t+i*0.05,cdur*2.5,0.15/ch.notes.length); });
        } else {
          ch.notes.forEach(function(f,i){ _rhodes(f,t+i*0.014,cdur,0.11-i*0.012); });
        }
      }
      if(stepInCh===16 && isLofi && Math.random()>0.40){
        ch.notes.forEach(function(f,i){ _rhodes(f,t+i*0.010,sd*9,0.055-i*0.006); });
      }

      // ── MELODY / LEAD ──────────────────────────────────────
      var melSlots = isArcade ? (s16%2===0) : (s16===2||s16===5||s16===10||s16===13);
      if(melSlots && Math.random()>( isArcade?0.25:0.42 )){
        var mf=ch.mel[Math.floor(Math.random()*ch.mel.length)];
        var melRoll=Math.random();
        if(is8bit){
          // 8-bit: rapid square arp riffs
          _galLaser(t, 0.07);
          if(Math.random()>0.5) _galArp([mf,mf*1.25,mf*1.5,mf*2,mf*1.5], t, sd*0.6, 0.065);
        } else if(isGalaga){
          // Galaga: alternating laser pops and arp phrases
          if(melRoll<0.3){
            _galLaser(t, 0.08);
          } else if(melRoll<0.6){
            var phrase=GAL_PHRASES[_galPhrase%GAL_PHRASES.length];
            var noteLen=Math.min(sd*0.7, 0.08);
            _galArp(phrase.map(function(m){return walkData[0]*2*m;}), t, noteLen, 0.06);
            _galPhrase++;
          } else {
            _galChord(ch.notes.slice(0,2).map(function(f){return f*2;}), t, sd*1.2, 0.055);
          }
        } else if(isWub){
          // Wub: synth screech lead
          var wo=ctx.createOscillator(); wo.type='sawtooth'; wo.frequency.value=mf;
          wo.frequency.linearRampToValueAtTime(mf*1.5,t+sd*1.5);
          var wlp=ctx.createBiquadFilter(); wlp.type='lowpass'; wlp.frequency.value=3000; wlp.Q.value=4;
          var wenv=ctx.createGain(); wenv.gain.setValueAtTime(0.065,t); wenv.gain.exponentialRampToValueAtTime(0.0001,t+sd*3);
          wo.connect(wlp); wlp.connect(wenv); wenv.connect(bgGain);
          wo.start(t); wo.stop(t+sd*3.5);
        } else if(_activeTrack===4){
          _voidPad(mf*0.5,t,sd*8,0.06);
        } else if(melRoll<0.35){
          _lofiChime(mf*2,t,0.075);
        } else if(melRoll<0.65){
          _lofiFlute(mf,t,sd*(2+Math.random()*2),0.062);
        } else {
          var dly=_getMelDelay();
          var oo=ctx.createOscillator(); oo.setPeriodicWave(_getRhodesWave()); oo.frequency.value=mf;
          var dur2=sd*(1.8+Math.random()*2.5);
          var env2=ctx.createGain(); env2.gain.setValueAtTime(0.072,t); env2.gain.exponentialRampToValueAtTime(0.0001,t+dur2);
          oo.connect(env2); env2.connect(bgGain); if(dly) env2.connect(dly);
          oo.start(t); oo.stop(t+dur2+0.1);
        }
      }

      // ── ARP ────────────────────────────────────────────────
      if(!isArcade && !isDub && s16%2===0){
        var arpNotes=ch.notes.concat([ch.notes[0]*2]);
        _lofiArp(arpNotes[_arpStep%arpNotes.length], t, sd*1.8, _activeTrack===4?0.025:0.038);
        _arpStep++; if(stepInCh===0) _arpStep=0;
      }

      // ── STRING SWELLS ──────────────────────────────────────
      if(s16===0 && bar>0 && bar%8===0 && Math.floor(bar/8)!==_lastStringSwell && isLofi && _activeTrack!==3){
        _lastStringSwell=Math.floor(bar/8);
        _lofiStrings(ch,t,sd*28,_activeTrack===4?0.08:0.055);
      }

      // ── GHOST NOTES ────────────────────────────────────────
      if(isLofi && (s16===4||s16===6||s16===12) && Math.random()>0.65)
        _lofiGhost(walkData[0]*(Math.random()>0.5?1:1.5),t,0.12);

      // ── RISER ──────────────────────────────────────────────
      if(stepInCh===16 && Math.random()>0.50) _lofiRiser(t,sd*16);

      // ── GALAGA SPECIAL EVENTS ──────────────────────────────
      if(isGalaga||is8bit){
        // Laser zaps on offbeats
        if(s16===3||s16===7||s16===11||s16===15){
          if(Math.random()>0.55) _galLaser(t, 0.055);
        }
        // Warp hit every 4 bars
        if(s16===0 && bar%4===0) _galWarp(t);
        // Enemy sweep descend every 8 bars
        if(s16===0 && bar%8===0) _galSweep(t, true);
        // Coin jingle every 16 bars
        if(s16===0 && bar%16===0 && bar>0) _galCoin(t);
        // Explosion bursts on beats 2&4 snare positions
        if((s16===4||s16===12) && Math.random()>0.6) _galBoom(t, 0.06);
      }

      // ── DUBSTEP SPECIAL EVENTS ─────────────────────────────
      if(isDub){
        // Drop siren at phrase boundaries
        if(stepInCh===0 && bar%16===0 && bar>0) _dubSiren(t);
        // LFO wub rate doubles in drop sections
        if(s16===7 && bar%8===7 && Math.random()>0.3) _lofiStutter(t, walkData[0]*2);
      }

      // ── VINYL CRACKLE (lo-fi only) ─────────────────────────
      if(isLofi && _activeTrack!==3){
        if(s16===0 && Math.random()>0.5) _lofiCrackle(t);
        if(Math.random()>0.93) _lofiCrackle(t+sd*Math.random());
      }

      // ── STUTTER ────────────────────────────────────────────
      var stutterProb=_activeTrack===3?0.30:0.45;
      if(s16===7 && bar%8===7 && Math.random()>stutterProb && isLofi)
        _lofiStutter(t,walkData[0]*4);

      _galBar=bar;
      _lofi_step++;
      _lofi_until+=sd;
    }
    _lofi_timer=setTimeout(_lofiSchedule,40);
  }

  function _startLofi(){
    if(!ctx)init();
    _lofi_step=0; _lofi_until=ctx.currentTime+0.05;
    _lofi_bpm=_tc().bpm;
    _melDelay=null; _rainNode=null; _galBar=0; _galPhrase=0;
    isPlaying=true; _startRain(); _lofiSchedule();
  }

  function _stopLofi(){
    if(_lofi_timer){clearTimeout(_lofi_timer);_lofi_timer=null;}
    _lofi_until=null;
  }

  function setTrack(n){
    _activeTrack=Math.max(1,Math.min(7,n));
    var tc=_tc(); _lofi_bpm=tc.bpm;
    var disp=document.getElementById('bpm-display');
    var sldr=document.getElementById('slider-bpm');
    if(disp)disp.textContent=_lofi_bpm;
    if(sldr)sldr.value=_lofi_bpm;
    _stopLofi(); _rainNode=null; _arpStep=0; _lastStringSwell=-1; _galBar=0; _galPhrase=0;
    if(isPlaying)
      setTimeout(function(){_lofi_step=0;_lofi_until=ctx.currentTime+0.05;_startRain();_lofiSchedule();},80);
  }

  // Patch stopCategoryBg to also stop lofi
  var _origStopCat = stopCategoryBg;


  function _startCat(key) {
    if(!ctx) init();
    _stopLofi();
    stopCategoryBg();
    _padGain   = null;
    _padFilter = null;
    _padBreath = null;
    _arpStep   = 0;
    _lastStringSwell = -1;

    var nodes=[], now=ctx.currentTime;
    function O(t,f){var o=ctx.createOscillator();o.type=t;o.frequency.value=f;return o;}
    function F(t,f,q){var b=ctx.createBiquadFilter();b.type=t;b.frequency.value=f;b.Q.value=q||1;return b;}
    function Run(n){n.start(now);nodes.push(n);return n;}
    function LFO(rate,depth,param){var l=O('sine',rate),g=ctx.createGain();g.gain.value=depth;l.connect(g);g.connect(param);Run(l);}

    // ── A3+A10+A20: Integrated pad system ────────────────────
    // Signal chain: pad osc → padFilter (A10 LFO target)
    //                       → padBreath (A20 AM target)
    //                       → padGain   (A3 sidechain target)
    //                       → bgGain
    //
    // Choose pad root from key atmosphere
    var padRoot = (key==='finalwar'||key==='combat') ? 55 :
                  (key==='galactic'||key==='cosmic')  ? 73.42 :
                  (key==='strategy')                  ? 65.41 : 61.74;

    // Pad oscillators — two detuned sines for width
    var p1 = O('sine', padRoot),     p2 = O('sine', padRoot * 1.502);
    var p3 = O('sine', padRoot * 2); // octave for air
    p1.detune.value =  4; p2.detune.value = -3; p3.detune.value = 2;

    // A10: Tempo-sync LFO filter (1-bar rate = BPM/4 Hz, slow sweep)
    _padFilter = F('lowpass', 600, 1.1);
    var lfoRate = (_lofi_bpm / 4) / 16; // 1-bar period
    var filterLFO = O('sine', lfoRate);
    var filterDepth = ctx.createGain(); filterDepth.gain.value = 280;
    _padFilter.frequency.value = 520;
    filterLFO.connect(filterDepth);
    filterDepth.connect(_padFilter.frequency);
    Run(filterLFO);

    // A20: Breathing pad — 0.05Hz AM (one breath ~20s)
    _padBreath = ctx.createGain(); _padBreath.gain.value = 1.0;
    var breathLFO = O('sine', 0.052);
    var breathDepth = ctx.createGain(); breathDepth.gain.value = 0.18;
    var breathBase  = ctx.createGain(); breathBase.gain.value  = 0.82;
    // AM: output = base + depth*LFO, range ~0.64–1.0
    breathLFO.connect(breathDepth);
    breathDepth.connect(_padBreath.gain);
    Run(breathLFO);

    // A3: Sidechain gain node (duck target)
    _padGain = ctx.createGain(); _padGain.gain.value = 0.48;

    // Pad envelope (slow fade in)
    var padEnv = ctx.createGain();
    padEnv.gain.setValueAtTime(0, now);
    padEnv.gain.linearRampToValueAtTime(1.0, now + 3.5);

    // Connect chain: oscs → filter → breath → sidechain → env → bgGain
    [p1,p2,p3].forEach(function(o){ o.connect(_padFilter); });
    _padFilter.connect(_padBreath);
    _padBreath.connect(_padGain);
    _padGain.connect(padEnv);
    padEnv.connect(bgGain);

    // Reverb send from pad
    var padRv = ctx.createGain(); padRv.gain.value = 0.30;
    _padFilter.connect(padRv); padRv.connect(reverbSend);

    [p1,p2,p3].forEach(function(o){ Run(o); });

    // Category-flavor subtle extra pad
    if(key==='cosmic'||key==='galactic') {
      var shimmer = O('sine', padRoot * 4.01);
      shimmer.detune.value = 7;
      var shG = ctx.createGain(); shG.gain.value = 0;
      shG.gain.linearRampToValueAtTime(0.022, now + 4);
      shimmer.connect(shG); shG.connect(bgGain); Run(shimmer);
    } else if(key==='finalwar') {
      var fw=O('sawtooth',36), fwl=F('lowpass',110,2);
      var ws=ctx.createWaveShaper(), wc=new Float32Array(256);
      for(var fi=0;fi<256;fi++){var fy=(fi*2)/256-1;wc[fi]=fy*0.4;}
      ws.curve=wc; fw.connect(ws); ws.connect(fwl);
      var fwG=ctx.createGain();fwG.gain.setValueAtTime(0,now);fwG.gain.linearRampToValueAtTime(0.08,now+2);
      fwl.connect(fwG);fwG.connect(bgGain); Run(fw);
    }

    _catNodes=nodes; isPlaying=true;

    // Start the lofi beat
    _startLofi();
  }
  function startCategoryBg(key){_startCat(key);}

  /* ─ A3: SCROLL TICK ─ */
  var _lastST=0;
  function onScroll(scrollTop){
    if(!ctx)return;
    var now2=Date.now();if(now2-_lastST<200)return;_lastST=now2;
    _tone('sine',2400,1800,.04,.03,3000,'lowpass',false,0);
  }

  /* ─ A4: RARITY REVEAL SOUNDS ─ */
  function playRarity(r){
    if(!ctx)init();duck();
    if(r==='Common'){_tone('sine',800,700,.16,.06,2000,'lowpass',false,0);}
    else if(r==='Uncommon'){_tone('sine',1100,1300,.20,.09,null,null,false,.1);}
    else if(r==='Rare'){
      _tone('sine',900,1100,.24,.12,null,null,false,-.15);
      setTimeout(function(){_tone('sine',1200,1400,.18,.10,null,null,false,.15);},60);
    } else if(r==='Epic'){
      _tone('sawtooth',660,880,.26,.13,1200,'lowpass',false,-.2);
      setTimeout(function(){_tone('sawtooth',880,1100,.20,.12,1400,'lowpass',false,.2);},55);
      setTimeout(function(){_tone('sine',1320,1760,.12,.12,null,null,true,0);},115);
    } else if(r==='Legendary'){
      _bell(659,[[0,1.0],[7,.6],[-7,.6]],.33,.55,true,-.3);
      setTimeout(function(){_bell(880,[[0,1.0],[5,.5]],.26,.50,true,.3);},80);
      setTimeout(function(){_bell(1320,[[0,1.0],[4,.4]],.18,.45,true,0);},180);
      setTimeout(function(){_bell(1760,[[0,1.0]],.11,.40,true,.1);},310);
    }
  }

  /* ─ Extended playAction ─ */
  var _origPA=playAction;
  playAction=function(type){
    if(!ctx)init();
    switch(type){
      case 'unitSprite':
        duck();_tone('sine',1600,2200,.20,.06,null,null,false,.2);
        setTimeout(function(){_tone('sine',2200,1600,.12,.05,null,null,false,-.1);},55);break;
      case 'statHover':
        _tone('sine',1900,2100,.07,.03,3000,'lowpass',false,0);break;
      case 'ctrlK':
        duck();_tone('sine',440,880,.24,.09,null,null,true,-.15);
        setTimeout(function(){_tone('sine',880,1320,.16,.08,null,null,true,.15);},55);break;
      case 'clickCombat':
        duck();_grind(.42,.06,250,50,0);
        setTimeout(function(){_tone('square',160,80,.25,.11,350,'lowpass',false,0);},35);break;
      case 'clickStrategy':
        duck();_tone('sine',1200,1400,.18,.07,null,null,false,.15);
        setTimeout(function(){_tone('sine',1400,1600,.12,.06,null,null,false,-.1);},45);break;
      case 'clickGalactic':
        duck();_tone('sine',280,560,.22,.14,null,null,true,-.2);
        setTimeout(function(){_tone('sine',560,840,.14,.12,null,null,true,.2);},70);break;
      case 'devUnlock':
        duck();
        setTimeout(function(){_arp([[523,0],[659,.07],[784,.14]],.26,.18,'sine',false);},0);
        setTimeout(function(){_arp([[659,0],[784,.07],[988,.14],[1047,.22]],.32,.22,'sine',true);},400);
        setTimeout(function(){
          _arp([[784,0],[988,.07],[1175,.14],[1319,.22],[1568,.32]],.36,.26,'sine',true);
          setTimeout(function(){_bell(4186,[[0,1.0],[12,.6],[-12,.6],[24,.35]],.20,.65,true,0);},380);
        },900);break;
      case 'error':
        _tone('square',180,120,.22,.11,300,'lowpass',false,0);
        setTimeout(function(){_tone('square',140,90,.18,.10,250,'lowpass',false,0);},110);break;
      case 'export':
        duck();
        _arp([[523,0],[659,.08],[784,.16],[1047,.26],[1319,.38]],.28,.22,'sine',true);
        setTimeout(function(){_arp([[698,0],[880,.08],[1047,.16],[1319,.26]],.20,.22,'sine',true);},22);
        setTimeout(function(){_bell(2093,[[0,1.0],[7,.55],[12,.35]],.16,.55,true,0);},420);
        setTimeout(function(){_noise(.12,.18,5000,2,true,0);},650);break;
      case 'sort': _tone('sine',660,880,.20,.08,null,null,false,0);break;
      default: _origPA(type);
    }
  }

  /* ─ A8: PER-FACTION ACCORDION ─ */
  function playAccordion(isOpen){
    if(!ctx)init();duck();
    var f=currentFaction;
    if(isOpen){
      if(f==='terran'){_noise(.26,.03,600,6,false,-.2);setTimeout(function(){_tone('sawtooth',700,1050,.20,.09,1200,'lowpass',false,.2);},18);}
      else if(f==='horde'){_grind(.40,.08,180,80,-.3);setTimeout(function(){_grind(.26,.05,400,50,.3);},50);}
      else if(f==='shards'){_bell(1319,[[0,1.0],[8,.55]],.20,.28,true,.25);}
      else if(f==='necro'){_tone('triangle',280,420,.24,.12,500,'lowpass',true,-.15);setTimeout(function(){_noise(.10,.05,1800,8,false,.15);},40);}
      else if(f==='accord'){_tone('sine',880,1047,.22,.10,null,null,false,-.1);setTimeout(function(){_tone('sine',1047,1319,.14,.08,null,null,false,.1);},65);}
      else if(f==='vorax'){_noise(.32,.05,500,10,false,-.2);setTimeout(function(){_noise(.20,.04,200,6,false,.2);},30);}
      else if(f==='guardians'){_bell(369,[[0,1.0],[5,.55],[-4,.45]],.28,.45,true,0);}
      else{_tone('sine',550,.65*550,.20,.09,null,null,false,0);}
    } else {
      if(f==='terran'){_tone('sawtooth',1050,700,.16,.09,1200,'lowpass',false,0);}
      else if(f==='horde'){_grind(.30,.06,180,60,0);}
      else if(f==='shards'){_bell(1319,[[0,1.0],[8,.4]],.14,.22,true,-.2);}
      else if(f==='necro'){_tone('triangle',420,220,.18,.10,400,'lowpass',true,0);}
      else if(f==='accord'){_tone('sine',1047,740,.16,.08,null,null,false,0);}
      else if(f==='vorax'){_noise(.22,.04,500,8,false,0);}
      else if(f==='guardians'){_bell(293,[[0,1.0],[-4,.4]],.22,.38,true,0);}
      else{_tone('sine',550,550*.52,.16,.09,null,null,false,0);}
    }
  }

  /* ─ A10: AUDIO VISUALIZER ─ */
  var _anlz=null,_vizRaf=null,_vizLvl=[0,0,0,0,0,0,0];
  function startViz(){
    if(_anlz||!ctx)return;
    _anlz=ctx.createAnalyser();_anlz.fftSize=64;
    masterGain.connect(_anlz);
    (function tick(){
      _vizRaf=requestAnimationFrame(tick);
      if(!_anlz)return;
      var buf=new Uint8Array(_anlz.frequencyBinCount);
      _anlz.getByteFrequencyData(buf);
      var step=Math.floor(_anlz.frequencyBinCount/7);
      var fmap={terran:'#00b4ff',shards:'#00ffee',horde:'#ff6622',necro:'#44ff66',accord:'#ffaa22',vorax:'#ff2266',guardians:'#cc44ff'};
      var col=fmap[currentFaction]||'#4488ff';
      for(var i=0;i<7;i++){
        var val=0;
        for(var b=i*step;b<(i+1)*step&&b<_anlz.frequencyBinCount;b++)val=Math.max(val,buf[b]);
        val=val/255;_vizLvl[i]+=(val-_vizLvl[i])*.35;
        var bar=document.getElementById('avb'+i);
        if(bar){bar.style.height=Math.max(2,Math.round(_vizLvl[i]*14))+'px';bar.style.background=col;}
      }
    })();
  }

  function setBpm(bpm) {
    _lofi_bpm = Math.max(60, Math.min(95, bpm));
  }
  function toggleBitcrush() { _bitcrushOn = !_bitcrushOn; }
  function isBitcrushOn()   { return _bitcrushOn; }
  return { init, playClick, playHover, playAction, playAccordion, playRarity, onScroll,
    crossfadeToCategory, startCategoryBg, stopCategoryBg, startBg, stopBg, toggle,
    setFaction, setVolume, setMusicVol, setSfxVol, getMusicVol, getSfxVol, startViz, duck,
    setBpm, toggleBitcrush, isBitcrushOn, setTrack,
    toggleHum: function() {
      if(!_hissGn||!_subGn) return false;
      var now2 = ctx ? ctx.currentTime : 0;
      var humOn = _hissGn.gain.value > 0.01;
      if(humOn) {
        _hissGn.gain.cancelScheduledValues(now2);
        _hissGn.gain.linearRampToValueAtTime(0.0001, now2+0.4);
        _subGn.gain.cancelScheduledValues(now2);
        _subGn.gain.linearRampToValueAtTime(0.0001, now2+0.4);
      } else {
        _hissGn.gain.cancelScheduledValues(now2);
        _hissGn.gain.linearRampToValueAtTime(0.55, now2+0.8);
        _subGn.gain.cancelScheduledValues(now2);
        _subGn.gain.linearRampToValueAtTime(0.18, now2+0.8);
      }
      return !humOn;
    },
    toggleReverb: function() {
      if(!reverbSend) return false;
      var now2 = ctx ? ctx.currentTime : 0;
      var revOn = reverbSend.gain.value > 0.01;
      if(revOn) {
        reverbSend.gain.cancelScheduledValues(now2);
        reverbSend.gain.linearRampToValueAtTime(0.0001, now2+0.3);
      } else {
        reverbSend.gain.cancelScheduledValues(now2);
        reverbSend.gain.linearRampToValueAtTime(0.18, now2+0.5);
      }
      return !revOn;
    }
  };
})();
