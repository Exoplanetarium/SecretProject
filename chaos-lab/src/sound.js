export const SFX_NAMES = [
  'place',
  'rotate',
  'remove',
  'wireStart',
  'wireConnect',
  'wireSnip',
  'switchOn',
  'switchOff',
  'buttonPress',
  'powerOn',
  'powerOff',
  'relay',
  'fuseBlow',
  'fuseReplace',
  'bell',
  'cannonFire',
  'swish',
  'brick',
  'airball',
  'flip',
  'win',
  'ui'
];

const COOLDOWNS = {
  relay: 0.055,
  bell: 0.12
};

export function createSoundEngine({ enabled = true, AudioCtx = null } = {}) {
  let active = !!enabled;
  let ctx = null;
  let masterGain = null;
  let noiseBuffer = null;
  let activeScore = null;
  const lastPlayed = new Map();

  function ensureContext() {
    if (!active) return null;
    try {
      const Ctor = AudioCtx || globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Ctor) return null;
      if (!ctx) {
        ctx = new Ctor();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.85;
        masterGain.connect(ctx.destination);
      }
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        void ctx.resume().catch(() => {});
      }
      if (!noiseBuffer) {
        const sr = ctx.sampleRate || 44100;
        noiseBuffer = ctx.createBuffer(1, sr, sr);
        const ch = noiseBuffer.getChannelData(0);
        for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      }
      return ctx;
    } catch {
      return null;
    }
  }

  function tone(c, {
    type = 'sine',
    start = c.currentTime,
    duration = 0.08,
    freq = 440,
    endFreq = null,
    gain = 0.08,
    attack = 0.004
  }) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), start);
    if (endFreq && endFreq > 0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + Math.max(0.01, duration));
    }
    const peak = Math.max(0.001, gain);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(peak, start + Math.min(attack, duration * 0.4));
    g.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(0.015, duration));
    osc.connect(g).connect(masterGain);
    osc.start(start);
    osc.stop(start + Math.max(0.02, duration) + 0.01);
  }

  function noiseBurst(c, {
    start = c.currentTime,
    duration = 0.06,
    filterType = 'bandpass',
    freq = 1600,
    endFreq = null,
    q = 1.4,
    gain = 0.08
  }) {
    const src = c.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = c.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(Math.max(40, freq), start);
    if (endFreq && endFreq > 0) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), start + Math.max(0.01, duration));
    }
    if (filter.Q) filter.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(Math.max(0.001, gain), start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(0.012, duration));
    src.connect(filter).connect(g).connect(masterGain);
    src.start(start);
    src.stop(start + Math.max(0.015, duration) + 0.01);
  }

  function play(name) {
    if (!active) return false;
    const c = ensureContext();
    if (!c) return false;
    try {
      const now = c.currentTime || 0;
      const cooldown = COOLDOWNS[name] || 0;
      if (cooldown > 0) {
        const prev = lastPlayed.get(name);
        if (prev !== undefined && now - prev < cooldown) return false;
      }
      lastPlayed.set(name, now);

      switch (name) {
        case 'place':
          tone(c, { type: 'triangle', start: now, duration: 0.075, freq: 185, endFreq: 95, gain: 0.14 });
          tone(c, { type: 'sine', start: now, duration: 0.032, freq: 620, endFreq: 420, gain: 0.055 });
          break;
        case 'rotate':
          tone(c, { type: 'triangle', start: now, duration: 0.04, freq: 520, endFreq: 740, gain: 0.085 });
          noiseBurst(c, { start: now, duration: 0.025, filterType: 'highpass', freq: 2200, gain: 0.04 });
          break;
        case 'remove':
          tone(c, { type: 'triangle', start: now, duration: 0.085, freq: 290, endFreq: 130, gain: 0.11 });
          break;
        case 'wireStart':
          tone(c, { type: 'sine', start: now, duration: 0.045, freq: 720, endFreq: 860, gain: 0.075 });
          break;
        case 'wireConnect':
          tone(c, { type: 'sine', start: now, duration: 0.04, freq: 680, endFreq: 920, gain: 0.075 });
          tone(c, { type: 'triangle', start: now + 0.035, duration: 0.06, freq: 990, endFreq: 1120, gain: 0.08 });
          break;
        case 'wireSnip':
          noiseBurst(c, { start: now, duration: 0.048, filterType: 'bandpass', freq: 3200, endFreq: 1400, q: 1.8, gain: 0.12 });
          tone(c, { type: 'triangle', start: now, duration: 0.05, freq: 1350, endFreq: 520, gain: 0.06 });
          break;
        case 'switchOn':
          noiseBurst(c, { start: now, duration: 0.028, filterType: 'bandpass', freq: 2400, q: 2.2, gain: 0.09 });
          tone(c, { type: 'square', start: now, duration: 0.038, freq: 440, endFreq: 690, gain: 0.05 });
          break;
        case 'switchOff':
          noiseBurst(c, { start: now, duration: 0.028, filterType: 'bandpass', freq: 1650, q: 2.0, gain: 0.085 });
          tone(c, { type: 'square', start: now, duration: 0.038, freq: 520, endFreq: 310, gain: 0.048 });
          break;
        case 'buttonPress':
          noiseBurst(c, { start: now, duration: 0.02, filterType: 'highpass', freq: 2600, gain: 0.065 });
          tone(c, { type: 'sine', start: now, duration: 0.032, freq: 880, endFreq: 660, gain: 0.055 });
          break;
        case 'powerOn':
          noiseBurst(c, { start: now, duration: 0.035, filterType: 'bandpass', freq: 1800, q: 1.5, gain: 0.08 });
          tone(c, { type: 'triangle', start: now, duration: 0.15, freq: 220, endFreq: 440, gain: 0.095 });
          tone(c, { type: 'sine', start: now + 0.04, duration: 0.14, freq: 554.37, endFreq: 659.25, gain: 0.07 });
          break;
        case 'powerOff':
          noiseBurst(c, { start: now, duration: 0.03, filterType: 'lowpass', freq: 1100, gain: 0.07 });
          tone(c, { type: 'triangle', start: now, duration: 0.15, freq: 390, endFreq: 165, gain: 0.09 });
          break;
        case 'relay':
          noiseBurst(c, { start: now, duration: 0.022, filterType: 'bandpass', freq: 2750, q: 3.0, gain: 0.085 });
          tone(c, { type: 'square', start: now, duration: 0.026, freq: 1080, endFreq: 760, gain: 0.038 });
          break;
        case 'fuseBlow':
          tone(c, { type: 'sawtooth', start: now, duration: 0.08, freq: 920, endFreq: 140, gain: 0.09 });
          noiseBurst(c, { start: now, duration: 0.14, filterType: 'bandpass', freq: 2400, endFreq: 700, q: 1.4, gain: 0.13 });
          break;
        case 'fuseReplace':
          tone(c, { type: 'sine', start: now, duration: 0.045, freq: 980, endFreq: 1280, gain: 0.07 });
          noiseBurst(c, { start: now, duration: 0.02, filterType: 'highpass', freq: 3000, gain: 0.045 });
          break;
        case 'bell':
          tone(c, { type: 'sine', start: now, duration: 0.58, freq: 880, gain: 0.11, attack: 0.002 });
          tone(c, { type: 'sine', start: now, duration: 0.44, freq: 1760, gain: 0.055, attack: 0.002 });
          tone(c, { type: 'sine', start: now, duration: 0.30, freq: 2420, gain: 0.035, attack: 0.002 });
          tone(c, { type: 'sine', start: now, duration: 0.22, freq: 3180, gain: 0.022, attack: 0.002 });
          break;
        case 'cannonFire':
          tone(c, { type: 'sine', start: now, duration: 0.14, freq: 195, endFreq: 58, gain: 0.18 });
          noiseBurst(c, { start: now, duration: 0.12, filterType: 'bandpass', freq: 820, endFreq: 320, q: 1.0, gain: 0.11 });
          break;
        case 'swish':
          noiseBurst(c, { start: now, duration: 0.17, filterType: 'bandpass', freq: 3400, endFreq: 1500, q: 1.3, gain: 0.1 });
          tone(c, { type: 'sine', start: now + 0.05, duration: 0.14, freq: 1046.5, endFreq: 1318.5, gain: 0.065 });
          break;
        case 'brick':
          tone(c, { type: 'triangle', start: now, duration: 0.09, freq: 245, endFreq: 135, gain: 0.13 });
          tone(c, { type: 'square', start: now + 0.07, duration: 0.07, freq: 185, endFreq: 110, gain: 0.055 });
          noiseBurst(c, { start: now, duration: 0.05, filterType: 'bandpass', freq: 950, q: 2.0, gain: 0.065 });
          break;
        case 'airball':
          noiseBurst(c, { start: now, duration: 0.18, filterType: 'lowpass', freq: 900, endFreq: 260, gain: 0.08 });
          tone(c, { type: 'sine', start: now, duration: 0.18, freq: 340, endFreq: 180, gain: 0.055 });
          break;
        case 'flip':
          tone(c, { type: 'sawtooth', start: now, duration: 0.075, freq: 320, endFreq: 680, gain: 0.055 });
          tone(c, { type: 'sine', start: now + 0.035, duration: 0.05, freq: 720, endFreq: 480, gain: 0.055 });
          break;
        case 'win':
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
            tone(c, { type: 'triangle', start: now + idx * 0.085, duration: idx === 3 ? 0.36 : 0.18, freq, gain: 0.095 });
          });
          break;
        case 'ui':
        default:
          tone(c, { type: 'sine', start: now, duration: 0.04, freq: 580, endFreq: 640, gain: 0.055 });
          break;
      }
      return true;
    } catch {
      return false;
    }
  }

  function startFirstLightScore() {
    if (activeScore) {
      activeScore.stop();
      activeScore = null;
    }
    if (!active) return { active: false, stop() {} };
    const c = ensureContext();
    if (!c) return { active: false, stop() {} };

    const t0 = c.currentTime || 0;
    const scoreGain = c.createGain();
    scoreGain.gain.setValueAtTime(0.0001, t0);
    scoreGain.gain.linearRampToValueAtTime(0.95, t0 + 0.15);
    scoreGain.connect(masterGain);

    const nodes = [];
    let stopped = false;

    const addTone = ({ type = 'sine', start, duration, freq, endFreq = null, gain = 0.08, attack = 0.02 }) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freq), start);
      if (endFreq && endFreq > 0) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + Math.max(0.02, duration));
      }
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(Math.max(0.001, gain), start + Math.min(attack, duration * 0.45));
      g.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(0.03, duration));
      osc.connect(g).connect(scoreGain);
      osc.start(start);
      osc.stop(start + Math.max(0.04, duration) + 0.04);
      nodes.push(osc);
    };

    const addNoise = ({ start, duration, filterType = 'bandpass', freq = 1000, endFreq = null, q = 1.4, gain = 0.08 }) => {
      const src = c.createBufferSource();
      src.buffer = noiseBuffer;
      const filter = c.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(Math.max(40, freq), start);
      if (endFreq && endFreq > 0) {
        filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), start + Math.max(0.04, duration));
      }
      if (filter.Q) filter.Q.value = q;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(Math.max(0.001, gain), start + Math.min(0.18, duration * 0.25));
      g.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(0.04, duration));
      src.connect(filter).connect(g).connect(scoreGain);
      src.start(start);
      src.stop(start + Math.max(0.05, duration) + 0.04);
      nodes.push(src);
    };

    // Act 1 (0.0-3.8s): Deep D2 warm drone + relay telemetry ticks + 0->1->2->3 lock chimes
    addTone({ type: 'triangle', start: t0, duration: 4.4, freq: 73.42, gain: 0.11, attack: 0.4 });
    addTone({ type: 'sine', start: t0, duration: 4.4, freq: 146.83, gain: 0.06, attack: 0.5 });
    for (let i = 0; i < 11; i++) {
      addTone({ type: 'square', start: t0 + 0.25 + i * 0.25, duration: 0.025, freq: 880 + i * 35, gain: 0.018, attack: 0.003 });
    }
    [587.33, 659.25, 739.99, 880.0].forEach((f, idx) => {
      addTone({ type: 'sine', start: t0 + idx * 0.8, duration: 0.55, freq: f, gain: 0.065, attack: 0.01 });
    });

    // Act 2 (3.8-7.8s): 5 ascending conduit power swells
    [
      [146.83, 220.0],
      [164.81, 246.94],
      [185.0, 277.18],
      [196.0, 293.66],
      [220.0, 329.63]
    ].forEach(([root, fifth], i) => {
      const s = t0 + 3.8 + i * 0.65;
      addTone({ type: 'triangle', start: s, duration: 1.5, freq: root, gain: 0.065, attack: 0.12 });
      addTone({ type: 'sine', start: s + 0.04, duration: 1.4, freq: fifth, gain: 0.045, attack: 0.15 });
    });

    // Act 3 (7.8-12.6s): Mechanical shutter rumble sweep + rising G-A-F# tension swell
    addNoise({ start: t0 + 7.8, duration: 4.6, filterType: 'bandpass', freq: 85, endFreq: 240, q: 2.2, gain: 0.07 });
    [98.0, 146.83, 220.0, 246.94, 369.99].forEach(f => {
      addTone({ type: 'triangle', start: t0 + 7.9, duration: 4.8, freq: f, gain: 0.042, attack: 1.4 });
    });

    // Act 4 (12.6s): First Light lush Dmaj9 chord swell + crystalline chime arpeggio + comet whoosh
    [73.42, 110.0, 146.83, 185.0, 220.0, 329.63, 369.99, 440.0, 587.33].forEach((f, idx) => {
      addTone({ type: idx < 3 ? 'triangle' : 'sine', start: t0 + 12.6, duration: 5.8, freq: f, gain: idx < 2 ? 0.08 : 0.048, attack: 0.35 });
    });
    [587.33, 659.25, 739.99, 880.0, 987.77, 1174.66, 1479.98, 1760.0].forEach((f, idx) => {
      addTone({ type: 'sine', start: t0 + 12.65 + idx * 0.14, duration: 1.35, freq: f, gain: 0.042, attack: 0.015 });
    });
    addNoise({ start: t0 + 13.4, duration: 2.2, filterType: 'bandpass', freq: 1850, endFreq: 420, q: 1.3, gain: 0.05 });

    // Act 5 (17.8-23.0s): Luminous open fifth sustain fading softly
    [146.83, 220.0, 369.99, 587.33].forEach(f => {
      addTone({ type: 'sine', start: t0 + 17.5, duration: 5.5, freq: f, gain: 0.036, attack: 0.6 });
    });

    const handle = {
      active: true,
      stop() {
        if (stopped) return;
        stopped = true;
        handle.active = false;
        try {
          const now = c.currentTime || 0;
          if (typeof scoreGain.gain.cancelScheduledValues === 'function') {
            scoreGain.gain.cancelScheduledValues(now);
          }
          scoreGain.gain.setValueAtTime(0.0001, now);
        } catch { }
        for (const n of nodes) {
          try { n.stop(); } catch { }
        }
        if (activeScore === handle) activeScore = null;
      }
    };
    activeScore = handle;
    return handle;
  }

  return {
    get enabled() { return active; },
    setEnabled(next) {
      active = !!next;
      if (!active && activeScore) {
        activeScore.stop();
      }
    },
    play,
    startFirstLightScore,
    dispose() {
      if (activeScore) {
        activeScore.stop();
        activeScore = null;
      }
      lastPlayed.clear();
      if (ctx && typeof ctx.close === 'function') {
        try { void ctx.close(); } catch { }
      }
      ctx = null;
      masterGain = null;
      noiseBuffer = null;
    }
  };
}
