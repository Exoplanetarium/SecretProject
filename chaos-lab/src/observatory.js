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
  'coil', 'rail', 'button', 'gate', 'clock', 'latch', 'display'
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
  { id: 'feed-power', unit: 'Unit 0', name: 'Power bus', finalId: 'lamp-control-challenge' },
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
        dev('battery', -9, 2),
        dev('switch', -6, 4, { role: 'Bit A' }),
        dev('switch', -6, -1, { role: 'Bit B' }),
        dev('gate', 0, 3, { gateMode: 'XOR', outputHigh: false }),
        dev('gate', 0, -2, { gateMode: 'AND', outputHigh: false }),
        dev('lamp', 6, 3, { role: 'Sum' }),
        dev('lamp', 6, -2, { role: 'Carry' }),
        dev('rail', -2, -5)
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
    const swA = switches.find(p => p.role === 'Input A') || switches[0];
    const swB = switches.find(p => p.role === 'Input B') || switches[1];
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
    const swA = switches.find(p => p.role === 'Bit A') || switches[0];
    const swB = switches.find(p => p.role === 'Bit B') || switches[1];
    const sumLamp = lamps.find(p => p.role === 'Sum') || lamps[0];
    const carryLamp = lamps.find(p => p.role === 'Carry') || lamps[1];
    const aBit = swA?.closed ? 1 : 0;
    const bBit = swB?.closed ? 1 : 0;
    const sumOn = lit(sumLamp);
    const carryOn = lit(carryLamp);
    if (on && !s.short && swA && swB && sumLamp && carryLamp && kind('gate').length >= 1 && settled) {
      const expSum = (aBit ^ bBit) === 1;
      const expCarry = (aBit & bBit) === 1;
      if (sumOn === expSum && carryOn === expCarry) {
        obs.cases.add('' + aBit + bBit);
        if (obs.cases.size === 4) a.passed = true;
      }
    }
    reading = 'A ' + aBit + ' + B ' + bBit + ' = ' + (carryOn ? 1 : 0) + (sumOn ? 1 : 0) + ' · Cases ' + obs.cases.size + ' / 4';
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
  if (signedIn) {
    for (const kind of FREE_BUILD_PARTS) unlocked.add(kind);
    return unlocked;
  }
  const doneIds = new Set(completed.map(i => levels[i]?.id).filter(Boolean));
  for (const item of TOOLBELT_UNLOCKS) {
    if (doneIds.has(item.byLevel)) unlocked.add(item.kind);
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

const pLabel = (x, y, text) => `<text x="${x}" y="${y}" text-anchor="middle">${text}</text>`;
export const observatorySketches = {
  'relay-inverter': [
    'Coil relay switching an NC lamp contact',
    `<rect x="44" y="20" width="112" height="64" rx="4"/><path d="M22 36h26c3-7 8-7 11 0 3-7 8-7 11 0h18M22 68h58"/><path d="M110 42h30l18-10M110 42v26h48M138 24v10"/>${pLabel(32, 30, 'A')}${pLabel(146, 22, 'NC')}`
  ],
  'relay-nand': [
    'Two input switches controlling a coil and NC lamp path',
    `<path d="M22 32h24l18-10M64 32h18l18-10M100 32h32v40H22"/><rect x="122" y="42" width="22" height="22" rx="3"/><circle cx="168" cy="52" r="12"/><path d="m160 44 16 16m-16 0 16-16M144 52h12"/>`
  ],
  'relay-clock': [
    'Coil wired through its own NC contact for rhythmic pulses',
    `<circle cx="64" cy="52" r="24"/><path d="M64 28v10M64 52l14-10M48 64h32M106 52h20l8-18 8 36 8-36 8 18h20"/>`
  ],
  'relay-latch': [
    'Set button, Reset switch, and self-latching relay contact',
    `<path d="M20 34h26l22-10M68 34h24v34H20M92 34h28M106 18v12M120 34h36v34H92"/><circle cx="156" cy="51" r="11"/><path d="m149 44 14 14m-14 0 14-14"/>`
  ],
  'half-adder': [
    'XOR and AND gates producing Sum and Carry',
    `<path d="M26 32h34M26 70h34M60 22h28a14 14 0 0 1 0 28H60ZM60 58h28a14 14 0 0 1 0 28H60Z"/><path d="M102 36h36M102 72h36"/><circle cx="154" cy="36" r="11"/><circle cx="154" cy="72" r="11"/>${pLabel(74, 41, 'XOR')}${pLabel(74, 77, 'AND')}`
  ],
  'mainframe-boot': [
    'Pulse clock driving two memory cells and a four-bit readout',
    `<rect x="20" y="34" width="32" height="36" rx="4"/><path d="M26 58h6V44h8v14h6"/><path d="M52 52h18"/><rect x="70" y="24" width="30" height="24" rx="3"/><rect x="70" y="56" width="30" height="24" rx="3"/><path d="M100 36h32M100 68h32"/><rect x="132" y="24" width="44" height="56" rx="4"/>${pLabel(154, 58, '0..3')}`
  ]
};
