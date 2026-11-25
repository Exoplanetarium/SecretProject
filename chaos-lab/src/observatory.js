import { LIBRARY_UNLOCKS } from './library.js';

export const OBSERVATORY_DEVICE_NAMES = {
  coil: 'Coil relay',
  button: 'Push button',
  rail: 'Bus bar',
  gate: 'Logic gate',
  latch: 'Memory cell',
  clock: 'Pulse clock',
  display: '4-bit readout'
};

export const OBSERVATORY_PINS = {
  coil: ['A', 'B', 'C', 'NC', 'NO'],
  rail: ['1', '2', '3', '4'],
  gate: ['A', 'B', 'Q', '−'],
  latch: ['D', 'CK', 'Q', '−'],
  clock: ['+', '−'],
  display: ['1', '2', '4', '8', '−']
};

export const FREE_BUILD_BASE_PARTS = ['battery', 'lamp', 'switch', 'resistor', 'capacitor', 'led', 'motor'];
export const FREE_BUILD_PARTS = [
  ...FREE_BUILD_BASE_PARTS,
  ...LIBRARY_UNLOCKS.map(u => u.kind)
];

export const TOOLBELT_UNLOCKS = [
  { kind: 'coil', byLevel: 'relay-inverter', label: 'Coil relay' },
  { kind: 'rail', byLevel: 'relay-inverter', label: 'Bus bar' },
  { kind: 'gate', byLevel: 'relay-nand', label: 'Logic gate' },
  { kind: 'clock', byLevel: 'relay-clock', label: 'Pulse clock' },
  { kind: 'button', byLevel: 'relay-latch', label: 'Push button' },
  { kind: 'latch', byLevel: 'relay-latch', label: 'Memory cell' },
  { kind: 'display', byLevel: 'half-adder', label: '4-bit readout' }
];

export const MAINFRAME_FEEDS = [
  { id: 'feed-power', unit: 'Tutorial', name: 'Power bus', finalId: 'lamp-control-challenge' },
  { id: 'feed-reg', unit: 'Resistors', name: 'Current regulation', finalId: 'house-breaker' },
  { id: 'feed-time', unit: 'Capacitors', name: 'Timing bank', finalId: 'timer-bell' },
  { id: 'feed-signal', unit: 'LEDs', name: 'Signal display', finalId: 'cable-tester' },
  { id: 'feed-drive', unit: 'Motors', name: 'Dome drive', finalId: 'dispatch' }
];

const dev = (kind, x, z, settings = {}) => ({ kind, x, z, ...settings });
const fix = (parts, connections = []) => ({
  parts: parts.map((p, i) => ({ resistance: 30, ...p, id: 'p' + (i + 1) })),
  wires: connections.map(([a, b]) => ({ a: 'p' + a, b: 'p' + b }))
});
const leads = (...pairs) => pairs.map(pair => pair.split('-').map(pin => pin.replace('.', ':')));

function moduleLevel(id, title, goal, hint, layout, parts, extra = {}) {
  return {
    id,
    unit: 'Observatory',
    title,
    goal,
    hint,
    parts,
    layout,
    diagram: id,
    activity: true,
    check: s => s.activityPassed === true,
    ending: extra.ending || goal,
    ...extra
  };
}

export const observatoryActivities = [
  moduleLevel(
    'relay-inverter',
    'Relay inverter',
    'Wire the coil relay so closing the switch turns the lamp off and opening it turns the lamp on.',
    'Connect battery + through the switch to coil A and coil B back to battery −. Route the lamp through C and NC.',
    fix(
      [
        dev('battery', -7, 2),
        dev('switch', -3, 2),
        dev('coil', 1, 0),
        dev('lamp', 6, 1),
        dev('rail', -2, -3)
      ],
      leads('1.0-2.0', '4.1-1.1')
    ),
    ['battery', 'switch', 'coil', 'lamp', 'rail'],
    {
      subsystem: 'Inverter bank',
      unlocks: ['coil', 'rail'],
      ending: 'An energized coil opens NC and breaks the lamp circuit. This is a physical NOT gate.'
    }
  ),
  moduleLevel(
    'relay-nand',
    'Relay NAND gate',
    'Wire switches A and B with coil logic so the lamp stays on unless both switches are closed. Test all four switch states.',
    'Put both switches in series with one coil, or wire two relays with their NC contacts in parallel. Route the lamp through NC.',
    fix(
      [
        dev('battery', -8, 2),
        dev('switch', -4, 3, { role: 'Input A' }),
        dev('switch', -4, -1, { role: 'Input B' }),
        dev('coil', 1, 1),
        dev('lamp', 6, 1),
        dev('rail', 0, -3)
      ],
      leads('1.0-6.0')
    ),
    ['battery', 'switch', 'coil', 'lamp', 'rail'],
    {
      subsystem: 'Logic unit',
      unlocks: ['gate'],
      ending: 'The lamp only went dark when both inputs were closed. NAND logic can build any digital gate.'
    }
  ),
  moduleLevel(
    'relay-clock',
    'Relay clock',
    'Wire the relay through its own NC contact so the status lamp pulses on and off by itself.',
    'Connect battery + to C, then NC to coil A, and coil B to battery −. Put the lamp across coil A and B. Add the 0.01 F capacitor across the coil for a slower beat.',
    fix(
      [
        dev('battery', -7, 2),
        dev('coil', -1, 0),
        dev('capacitor', 3, -2, { capacitance: 0.01, role: '0.01 F' }),
        dev('lamp', 6, 2)
      ],
      leads('1.0-2.2')
    ),
    ['battery', 'coil', 'capacitor', 'lamp', 'rail'],
    {
      subsystem: 'Clock oscillator',
      unlocks: ['clock'],
      ending: 'Feeding a coil through its own NC contact creates a self-interrupting clock oscillator.'
    }
  ),
  moduleLevel(
    'relay-latch',
    'One-bit memory',
    'Press Set so the relay holds the lamp on after you release the button. Then open Reset to clear it and close Reset again.',
    'Feed Reset into a bus bar. Wire Set from the bus bar to coil A, and wire C and NO in parallel with Set so the relay latches itself on.',
    fix(
      [
        dev('battery', -8, 2),
        dev('switch', -5, -2, { role: 'Reset', closed: true }),
        dev('button', -2, 3, { role: 'Set' }),
        dev('coil', 2, 0),
        dev('lamp', 7, 1),
        dev('rail', -1, -2)
      ],
      leads('1.0-2.0', '2.1-6.0')
    ),
    ['battery', 'switch', 'button', 'coil', 'lamp', 'rail'],
    {
      subsystem: 'Memory bank',
      unlocks: ['button', 'latch'],
      ending: 'Connecting NO back to the coil seals the relay on until power is broken. This stores one bit of memory.'
    }
  ),
  moduleLevel(
    'half-adder',
    'Binary half adder',
    'Add inputs A and B with logic gates. Light Sum for 1 and Carry for 2 across all four input pairs.',
    'Select each logic gate to set its mode: XOR drives Sum and AND drives Carry. Join every − pin to the bus bar.',
    fix(
      [
        dev('battery', -9, 1),
        dev('switch', -6, -2, { role: 'Bit A' }),
        dev('switch', -6, 3, { role: 'Bit B' }),
        dev('gate', 0, -2, { gateMode: 'XOR', outputHigh: false }),
        dev('gate', 0, 3, { gateMode: 'AND', outputHigh: false }),
        dev('lamp', 6, -2, { role: 'Sum' }),
        dev('lamp', 6, 3, { role: 'Carry' }),
        dev('rail', -2, 6.5)
      ],
      leads('1.1-8.0', '4.3-8.1', '5.3-8.2')
    ),
    ['battery', 'switch', 'gate', 'lamp', 'rail'],
    {
      subsystem: 'Arithmetic unit',
      unlocks: ['display'],
      ending: 'XOR produces the ones bit and AND produces the twos carry. Two gates perform binary addition.'
    }
  ),
  moduleLevel(
    'mainframe-boot',
    'Mainframe boot',
    'Build a two-bit binary counter that steps the 4-bit readout through 0, 1, 2, and 3 to boot the Observatory Mainframe.',
    'Loop each memory cell Q through a NOT gate back to its own D pin. Feed the clock into Bit 1 CK, and feed Bit 1 NOT output into Bit 2 CK. Connect both Q outputs to readout pins 1 and 2.',
    fix(
      [
        dev('clock', -8, 1, { clockHz: 1 }),
        dev('latch', -3, 2, { role: 'Bit 1' }),
        dev('gate', -3, -3, { gateMode: 'NOT', outputHigh: true }),
        dev('latch', 3, 2, { role: 'Bit 2' }),
        dev('gate', 3, -3, { gateMode: 'NOT', outputHigh: true }),
        dev('display', 8, 0),
        dev('rail', 0, 5)
      ],
      leads('1.1-7.0', '2.3-7.1', '3.3-7.1', '4.3-7.2', '5.3-7.2', '6.4-7.3')
    ),
    ['clock', 'battery', 'button', 'switch', 'gate', 'latch', 'display', 'rail', 'lamp', 'led', 'coil'],
    {
      challenge: true,
      target: 'Count 0 · 1 · 2 · 3',
      subsystem: 'Core sequencer',
      ending: 'The Observatory Mainframe is online. Your full computing toolbelt is ready in Free build.'
    }
  )
];

function configKey(parts, wires) {
  return JSON.stringify([
    parts.map(p => [p.id, p.kind, p.gateMode || 'NAND', p.clockHz || 1, p.resistance || 30]),
    wires.map(w => [w.a, w.b])
  ]);
}

export function measureObservatory(lesson, parts, wires, s, a, on, dt = 0) {
  const id = lesson.id;
  const kind = k => parts.filter(p => p.kind === k);
  const amp = p => (on && p ? Math.abs(s.currents[p.id] || 0) : 0);
  const lit = p => amp(p) > 0.025;
  const key = configKey(parts, wires);

  if (!a.obs || a.obs.key !== key) {
    a.obs = { key, cases: new Set(), stage: 0, pulses: 0 };
    a.passed = false;
  }

  const obs = a.obs;
  const lamps = kind('lamp');
  const switches = kind('switch');
  const coils = kind('coil');
  const settled = !s.hasPendingTransition;
  let reading = '';

  if (id === 'relay-inverter') {
    const sw = switches[0];
    const coil = coils[0];
    const lamp = lamps[0];
    const lampOn = lit(lamp);
    if (on && !s.short && sw && coil && lamp && settled) {
      if (!sw.closed && !coil.energized && lampOn) obs.seenOpen = true;
      if (sw.closed && coil.energized && !lampOn) obs.seenClosed = true;
      if (obs.seenOpen && obs.seenClosed) a.passed = true;
    }
    const count = (obs.seenOpen ? 1 : 0) + (obs.seenClosed ? 1 : 0);
    reading = 'Switch ' + (sw?.closed ? 'closed' : 'open') + ' · Lamp ' + (lampOn ? 'on' : 'off') + ' · States ' + count + ' / 2';
  } else if (id === 'relay-nand') {
    const swA = switches.find(p => p.role === 'Input A') || switches.find(p => p.role !== 'Input B') || switches[0];
    const swB = switches.find(p => p.role === 'Input B' && p !== swA) || switches.find(p => p !== swA);
    const lamp = lamps[0];
    const aOn = !!swA?.closed;
    const bOn = !!swB?.closed;
    const lampOn = lit(lamp);
    if (on && !s.short && swA && swB && lamp && coils.length > 0 && settled) {
      const expected = !(aOn && bOn);
      const coilUsed = !(aOn && bOn) || coils.some(c => c.energized);
      if (lampOn === expected && coilUsed) {
        obs.cases.add((aOn ? '1' : '0') + (bOn ? '1' : '0'));
        if (obs.cases.size === 4) a.passed = true;
      }
    }
    reading = 'A ' + (aOn ? 1 : 0) + ' · B ' + (bOn ? 1 : 0) + ' · Out ' + (lampOn ? 1 : 0) + ' · Cases ' + obs.cases.size + ' / 4';
  } else if (id === 'relay-clock') {
    const coil = coils[0];
    const lamp = lamps[0];
    const lampAmp = amp(lamp);
    const hasOsc = kind('clock').length === 0;
    if (on && !s.short && coil && lamp && hasOsc) {
      const energized = !!coil.energized;
      obs.minLamp = Math.min(obs.minLamp ?? Infinity, lampAmp);
      obs.maxLamp = Math.max(obs.maxLamp ?? 0, lampAmp);
      if (obs.prevCoil !== undefined && obs.prevCoil !== energized) {
        if (obs.maxLamp > 0.05 && (obs.maxLamp - obs.minLamp > 0.08 || lampAmp <= 0.025)) {
          obs.pulses++;
        }
      }
      obs.prevCoil = energized;
      if (obs.pulses >= 4) a.passed = true;
    } else if (!on) {
      obs.prevCoil = undefined;
      obs.minLamp = undefined;
      obs.maxLamp = undefined;
    }
    reading = 'Pulses: ' + Math.min(4, obs.pulses) + ' / 4 · Lamp ' + (lampAmp > 0.025 ? 'on' : 'off');
  } else if (id === 'relay-latch') {
    const reset = switches.find(p => p.role === 'Reset') || switches[0];
    const setBtn = kind('button').find(p => p.role === 'Set') || kind('button')[0];
    const coil = coils[0];
    const lamp = lamps[0];
    const lampOn = lit(lamp);
    if (on && !s.short && reset && setBtn && coil && lamp) {
      if (setBtn.closed) obs.sawSet = true;
      if (obs.stage === 0 && reset.closed && !setBtn.closed && !lampOn && !coil.energized) {
        obs.stage = 1;
      } else if (obs.stage === 1 && obs.sawSet && coil.energized && lampOn) {
        obs.stage = setBtn.closed ? 2 : 3;
      } else if (obs.stage === 2 && !setBtn.closed && (!coil.energized || !lampOn)) {
        obs.stage = 1;
        obs.sawSet = false;
      } else if (obs.stage === 2 && reset.closed && !setBtn.closed && coil.energized && lampOn) {
        obs.stage = 3;
      } else if (obs.stage === 3 && !reset.closed && !coil.energized && !lampOn) {
        obs.stage = 4;
      } else if (obs.stage === 4 && reset.closed && !setBtn.closed && !coil.energized && !lampOn) {
        a.passed = true;
        obs.stage = 5;
      }
    }
    const labels = [
      'Close Reset to begin',
      'Press Set button',
      'Release Set button',
      'Latched · open Reset',
      'Cleared · close Reset',
      'Memory verified'
    ];
    reading = labels[obs.stage] || labels[0];
  } else if (id === 'half-adder') {
    const swA = switches.find(p => p.role === 'Bit A') || switches.find(p => p.role !== 'Bit B') || switches[0];
    const swB = switches.find(p => p.role === 'Bit B' && p !== swA) || switches.find(p => p !== swA);
    const sumLamp = lamps.find(p => p.role === 'Sum') || lamps.find(p => p.role !== 'Carry') || lamps[0];
    const carryLamp = lamps.find(p => p.role === 'Carry' && p !== sumLamp) || lamps.find(p => p !== sumLamp);
    const aBit = swA?.closed ? 1 : 0;
    const bBit = swB?.closed ? 1 : 0;
    const sumOn = lit(sumLamp);
    const carryOn = lit(carryLamp);
    let swappedHint = false;
    if (on && !s.short && swA && swB && sumLamp && carryLamp && kind('gate').length >= 1 && settled) {
      const expSum = (aBit ^ bBit) === 1;
      const expCarry = (aBit & bBit) === 1;
      const code = '' + aBit + bBit;
      if (sumOn === expSum && carryOn === expCarry) {
        obs.cases.add(code);
        if (obs.cases.size === 4) a.passed = true;
      } else if (sumOn === expCarry && carryOn === expSum) {
        if (!sumLamp.role && !carryLamp.role) {
          obs.swappedCases ??= new Set();
          obs.swappedCases.add(code);
          if (obs.swappedCases.size === 4) a.passed = true;
        } else {
          swappedHint = true;
        }
      }
    }
    const doneCases = (!sumLamp?.role && !carryLamp?.role && (obs.swappedCases?.size || 0) > obs.cases.size)
      ? obs.swappedCases
      : obs.cases;
    const marks = ['00', '01', '10', '11'].map(c => c + (doneCases.has(c) ? '✓' : '○')).join(' ');
    reading = 'A ' + aBit + ' + B ' + bBit + ' = ' + (carryOn ? 1 : 0) + (sumOn ? 1 : 0) + ' · ' + marks + (swappedHint ? ' · Swap Sum & Carry' : '');
  } else if (id === 'mainframe-boot') {
    const latches = kind('latch');
    const disp = kind('display')[0];
    const hasPulse = kind('clock').length > 0 || kind('button').length > 0;
    const val = disp && on ? (s.displayValues?.[disp.id] ?? 0) : 0;
    if (on && !s.short && latches.length >= 2 && disp && hasPulse) {
      if (obs.candidate !== val) {
        obs.candidate = val;
        obs.holdTime = 0;
      } else {
        obs.holdTime = (obs.holdTime || 0) + dt;
      }
      if (obs.holdTime >= 0.12) {
        obs.stable = val;
        if (obs.stage < 4 && obs.stable === obs.stage) {
          obs.stage++;
          if (obs.stage === 4) a.passed = true;
        }
      }
    } else if (!on) {
      obs.candidate = undefined;
      obs.holdTime = 0;
      obs.stage = 0;
    }
    reading = 'Readout: ' + val + ' · Sequence ' + Math.min(4, obs.stage) + ' / 4 (0 → 1 → 2 → 3)';
  }

  s.activityPassed = a.passed;
  s.designReading = reading;
  return reading;
}

export function unlockedToolbelt(completed, levels, signedIn = false) {
  const unlocked = new Set(FREE_BUILD_BASE_PARTS);
  const doneIds = new Set(completed.map(i => levels[i]?.id).filter(Boolean));
  for (const item of LIBRARY_UNLOCKS) {
    if (doneIds.has(item.challengeId) || item.altLevels?.some(id => doneIds.has(id))) {
      unlocked.add(item.kind);
    }
  }
  return unlocked;
}

export function mainframeProgress(completed, levels) {
  const doneIds = new Set(completed.map(i => levels[i]?.id).filter(Boolean));
  const feeds = MAINFRAME_FEEDS.map(feed => {
    const unitIndexes = [];
    levels.forEach((l, idx) => {
      if (l.unit === feed.unit) unitIndexes.push(idx);
    });
    const doneCount = unitIndexes.filter(idx => completed.includes(idx)).length;
    const nextUnfinished = unitIndexes.find(idx => !completed.includes(idx));
    const finalIndex = levels.findIndex(l => l.id === feed.finalId);
    return {
      ...feed,
      online: doneIds.has(feed.finalId),
      doneCount,
      totalCount: unitIndexes.length,
      nextLevelIndex: nextUnfinished ?? (finalIndex >= 0 ? finalIndex : unitIndexes[0] ?? 0)
    };
  });

  const cores = observatoryActivities.map(act => {
    const levelIndex = levels.findIndex(l => l.id === act.id);
    return {
      id: act.id,
      title: act.title,
      subsystem: act.subsystem,
      unlocks: act.unlocks || [],
      online: doneIds.has(act.id),
      levelIndex: levelIndex >= 0 ? levelIndex : 0
    };
  });

  const feedsOnline = feeds.filter(f => f.online).length;
  const coresOnline = cores.filter(c => c.online).length;
  const onlineCount = feedsOnline + coresOnline;
  const totalCount = feeds.length + cores.length;
  const coreBooted = doneIds.has('mainframe-boot');
  return {
    feeds,
    cores,
    feedsOnline,
    coresOnline,
    onlineCount,
    totalCount,
    coreBooted,
    fullyOnline: onlineCount === totalCount
  };
}

export function mainframeBlueprintSvg(progress) {
  const coreCols = progress.cores.map((c, i) => {
    const x = 44 + i * 82;
    const cls = c.online ? 'bp-node online' : 'bp-node';
    return `<g class="${cls}"><rect x="${x}" y="94" width="70" height="44" rx="4"/><line x1="${x + 35}" y1="74" x2="${x + 35}" y2="94"/><line x1="${x + 35}" y1="138" x2="${x + 35}" y2="158"/><circle cx="${x + 35}" cy="108" r="5"/><text x="${x + 35}" y="128" text-anchor="middle">${i + 1}. ${c.subsystem.split(' ')[0]}</text></g>`;
  }).join('');

  const feedCols = progress.feeds.map((f, i) => {
    const x = 44 + i * 98;
    const cls = f.online ? 'bp-node online' : 'bp-node';
    return `<g class="${cls}"><rect x="${x}" y="168" width="84" height="42" rx="4"/><line x1="${x + 42}" y1="158" x2="${x + 42}" y2="168"/><circle cx="${x + 42}" cy="181" r="4"/><text x="${x + 42}" y="199" text-anchor="middle">${f.name.split(' ')[0]}</text></g>`;
  }).join('');

  const domeClass = progress.coreBooted ? 'bp-dome online' : 'bp-dome';
  return `<svg class="mainframe-svg" viewBox="0 0 560 226" role="img" aria-label="Observatory Mainframe blueprint: ${progress.onlineCount} of ${progress.totalCount} systems online">
    <g class="${domeClass}">
      <path d="M180 74 A100 58 0 0 1 380 74 Z"/>
      <circle cx="280" cy="46" r="14"/>
      <path d="M280 26v40M260 46h40M267 33l26 26M293 33l-26 26"/>
    </g>
    <line class="bp-bus" x1="44" y1="74" x2="516" y2="74"/>
    <line class="bp-bus" x1="44" y1="158" x2="516" y2="158"/>
    ${coreCols}
    ${feedCols}
  </svg>`;
}

const obsLbl = (x, y, text, cls = 'obs-lbl') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="middle">${text}</text>`;
const obsDot = (cx, cy) => `<circle class="obs-dot" cx="${cx}" cy="${cy}" r="2.1"/>`;
const obsBattery = (x = 20, topY = 14, botY = 88) =>
  `<path d="M${x} ${topY}V45M${x - 9} 45h18M${x - 5} 53h10M${x} 53V${botY}"/>${obsLbl(x + 11, 40, '+')}${obsLbl(x + 11, 64, '−')}`;
const obsCoil = (x, yTop) =>
  `<path d="M${x} ${yTop}c7 0 7 10 0 10c7 0 7 10 0 10c7 0 7 10 0 10"/>`;
const obsLamp = (cx, cy, r = 10) => {
  const k = Math.round(r * 0.6);
  return `<circle class="diagram-lamp" cx="${cx}" cy="${cy}" r="${r}"/><path d="m${cx - k} ${cy - k} ${k * 2} ${k * 2}m-${k * 2} 0 ${k * 2}-${k * 2}"/>`;
};

export const observatorySketches = {
  'relay-inverter': [
    'Battery, switch, coil relay, NC contact, and lamp',
    `${obsBattery(20, 14, 88)}<path d="M20 14H164M20 88H164M42 14V30M42 30l22-9M68 30h20v10M88 70v18"/><circle cx="42" cy="30" r="1.8"/><circle cx="68" cy="30" r="1.8"/>${obsDot(42, 14)}${obsDot(88, 88)}${obsCoil(88, 40)}<path class="obs-link" d="M98 55H142V38H156"/><path d="M164 14V26M158 28h6M164 48l-6-21M164 48v10M164 78v10"/>${obsLamp(164, 68, 10)}${obsLbl(78, 43, 'A', 'obs-sm')}${obsLbl(78, 72, 'B', 'obs-sm')}${obsLbl(174, 25, 'C', 'obs-sm')}${obsLbl(146, 31, 'NC', 'obs-sm')}`
  ],
  'relay-nand': [
    'Battery, two series switches A and B, coil relay, NC contact, and lamp',
    `${obsBattery(18, 14, 88)}<path d="M18 14H166M18 88H166M34 14V34M34 34l19-8M56 34h10M66 34l19-8M88 34h16v8M104 72v16"/><circle cx="34" cy="34" r="1.6"/><circle cx="56" cy="34" r="1.6"/><circle cx="66" cy="34" r="1.6"/><circle cx="88" cy="34" r="1.6"/>${obsDot(34, 14)}${obsDot(104, 88)}${obsCoil(104, 42)}<path class="obs-link" d="M114 57H144V38H158"/><path d="M166 14V26M160 28h6M166 48l-6-21M166 48v10M166 78v10"/>${obsLamp(166, 68, 10)}${obsLbl(45, 46, 'A', 'obs-sm')}${obsLbl(77, 46, 'B', 'obs-sm')}${obsLbl(176, 25, 'C', 'obs-sm')}${obsLbl(148, 31, 'NC', 'obs-sm')}`
  ],
  'relay-clock': [
    'Battery feeding a coil and lamp in parallel through the coil NC contact',
    `${obsBattery(22, 18, 88)}<path d="M22 88H158M22 18h28M50 18l30 5M78 18v7M80 18h78M106 18v20M106 68v20M158 18v25M158 63v25"/>${obsDot(106, 18)}${obsDot(106, 88)}${obsCoil(106, 38)}<path class="obs-link" d="M102 53H65V25m-3 4 3-4 3 4"/>${obsLamp(158, 53, 10)}${obsLbl(49, 11, 'C', 'obs-sm')}${obsLbl(80, 11, 'NC', 'obs-sm')}${obsLbl(96, 41, 'A', 'obs-sm')}${obsLbl(96, 70, 'B', 'obs-sm')}`
  ],
  'relay-latch': [
    'Battery, Reset switch, parallel Set button and NO relay contact, coil, and lamp',
    `${obsBattery(18, 18, 88)}<path d="M18 88H172M18 18h16M34 18l22-3M56 18h18M76 13h22M87 13V6M82 6h10M100 18h72M66 18V46h8M74 46l22-9M100 46h12V18M132 18v20M132 68v20M172 18v25M172 63v25"/>${obsDot(66, 18)}${obsDot(112, 18)}${obsDot(132, 18)}${obsDot(132, 88)}${obsCoil(132, 38)}<path class="obs-link" d="M129 66H92V46"/>${obsLamp(172, 53, 10)}${obsLbl(45, 11, 'Rst', 'obs-sm')}${obsLbl(87, 29, 'Set', 'obs-sm')}${obsLbl(75, 58, 'NO', 'obs-sm')}`
  ],
  'half-adder': [
    'Battery, input switches A and B, XOR and AND gates, Sum and Carry lamps',
    `${obsBattery(16, 22, 92)}<path d="M16 92H184M16 22h14V66M30 22l20-8M30 66l20-8M54 22h30M62 22V58h22M54 66h18M72 66v8h12M72 66V38h12"/><path class="paper-cut" d="M72 54v8"/><path d="M72 52v12"/><path d="M84 16h20a14 14 0 0 1 0 28H84ZM84 52h20a14 14 0 0 1 0 28H84ZM118 30h29M165 30h19v62M118 66h29M165 66h9v26"/>${obsDot(30, 22)}${obsDot(62, 22)}${obsDot(72, 66)}${obsDot(174, 92)}${obsLamp(156, 30, 9)}${obsLamp(156, 66, 9)}${obsLbl(42, 12, 'A', 'obs-sm')}${obsLbl(42, 56, 'B', 'obs-sm')}${obsLbl(99, 33, 'XOR')}${obsLbl(99, 69, 'AND')}${obsLbl(156, 15, 'Sum', 'obs-sm')}${obsLbl(156, 52, 'Carry', 'obs-sm')}`
  ],
  'mainframe-boot': [
    'Pulse clock driving two toggling memory cells with NOT feedback into a four-bit readout',
    `<rect x="8" y="46" width="26" height="28" rx="3"/><path d="M12 65h4v-10h5v10h5v-10h4M34 66h14"/><rect x="48" y="44" width="28" height="32" rx="3"/><path d="M76 56h4M80 56V22h4M84 15l11 7-11 7Z"/><circle cx="97.5" cy="22" r="2.2"/><path d="M100 22V8H42V52h6M100 22V66h8M80 56V88h72V50h8"/><rect x="108" y="44" width="28" height="32" rx="3"/><path d="M136 56h6v6h18M142 56V22h-8M134 15l-11 7 11 7Z"/><circle cx="120.5" cy="22" r="2.2"/><path d="M118 22H104V52h4"/><rect x="160" y="38" width="34" height="40" rx="4"/>${obsDot(80, 56)}${obsDot(100, 22)}${obsDot(142, 56)}${obsLbl(21, 41, 'CLK')}${obsLbl(62, 63, 'B1')}${obsLbl(122, 63, 'B2')}${obsLbl(42, 47, 'D', 'obs-sm')}${obsLbl(40, 74, 'CK', 'obs-sm')}${obsLbl(91, 38, 'NOT', 'obs-sm')}${obsLbl(127, 38, 'NOT', 'obs-sm')}${obsLbl(155, 46, '1', 'obs-sm')}${obsLbl(155, 72, '2', 'obs-sm')}${obsLbl(177, 62, '0..3')}`
  ]
};
