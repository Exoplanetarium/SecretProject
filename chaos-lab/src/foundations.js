function nets(wires) {
  const parents = new Map();
  function root(x) { while (parents.has(x)) x = parents.get(x); return x; }
  for (const w of wires) { const a = root(w.a), b = root(w.b); if (a !== b) parents.set(a, b); }
  return (a, b) => root(a) === root(b);
}

const dev = (kind, x, z, settings = {}) => ({ kind, x, z, ...settings });
const fix = (parts, connections = []) => ({
  parts: parts.map((p, i) => ({ resistance: 30, ...p, id: 'p' + (i + 1) })),
  wires: connections.map(([a, b]) => ({ a: 'p' + a, b: 'p' + b }))
});
const leads = (...pairs) => pairs.map(pair => pair.split('-').map(pin => pin.replace('.', ':')));

function level(id, unit, title, goal, hint, layout, parts, extra = {}) {
  return {
    id,
    unit,
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

export const foundationActivities = [
  level(
    'res-divider',
    'Resistors',
    'Split voltage',
    'Measure 6.0 V across the battery first, then move the voltmeter probes across one 30 Ω resistor to see the voltage split to 3.0 V.',
    'Keep the two 30 Ω resistors in one loop with the battery. Touch meter + and − across the battery for 6.0 V, then move them across either resistor for 3.0 V.',
    fix(
      [
        dev('battery', -6, 1),
        dev('resistor', -1, 2, { resistance: 30, role: 'R1 30 Ω' }),
        dev('resistor', 3.5, 2, { resistance: 30, role: 'R2 30 Ω' }),
        dev('meter', 1, -2)
      ],
      leads('1.0-2.0', '2.1-3.0', '3.1-1.1')
    ),
    ['battery', 'resistor', 'meter'],
    {
      unlocks: ['meter'],
      ending: 'Two equal resistors split the 6 V battery cleanly in half, leaving 3 V across each one.'
    }
  ),
  level(
    'res-fuse',
    'Resistors',
    'Safety fuse',
    'Power Lamp 1 safely through the 0.35 A glass fuse, then wire Lamp 2 in parallel with the switch and close it so the fuse blows to protect the circuit.',
    'Lamp 1 is already wired safely through the fuse (0.30 A). Wire the switch and Lamp 2 across Lamp 1, power on with the switch open, then close the switch to overload the 0.35 A fuse.',
    fix(
      [
        dev('battery', -6, 2),
        dev('fuse', -2, 2, { fuseRating: 0.35 }),
        dev('lamp', 3, 2, { role: 'Lamp 1' }),
        dev('switch', -2, -2),
        dev('lamp', 3, -2, { role: 'Lamp 2' })
      ],
      leads('1.0-2.0', '2.1-3.0', '3.1-1.1')
    ),
    ['battery', 'fuse', 'lamp', 'switch'],
    {
      unlocks: ['fuse'],
      ending: 'A glass fuse lets safe current pass, then melts open when too many parallel branches draw over its limit.'
    }
  ),
  level(
    'cap-slow-fade',
    'Capacitors',
    'Slow dim-out',
    'Charge the capacitor above 4.5 V with the switch closed, then open the switch so it dims slowly through the resistor (40 Ω or more) and lamp.',
    'Leave the resistor at 40 Ω or higher. Wire the resistor and lamp in one line across the capacitor. Close the switch above 4.5 V, then open the switch and watch the slow fade.',
    fix(
      [
        dev('battery', -7, 1),
        dev('switch', -4, 2),
        dev('capacitor', 0, 1, { capacitance: 0.1 }),
        dev('resistor', 3.5, 2, { resistance: 40 }),
        dev('lamp', 6.5, 0)
      ],
      leads('1.0-2.0', '2.1-3.0', '3.1-1.1')
    ),
    ['battery', 'switch', 'capacitor', 'resistor', 'lamp'],
    {
      ending: 'Higher resistance slows how fast a capacitor drains, keeping the lamp glowing much longer.'
    }
  ),
  level(
    'cap-parallel',
    'Capacitors',
    'Double tank',
    'Wire the second 0.10 F capacitor alongside the first one. Charge both above 4 V, then open the switch so both tanks power the lamp together.',
    'Connect both terminals of Tank 2 across Tank 1. Close the switch until both pass 4 V, then open the switch and watch them share the lamp load.',
    fix(
      [
        dev('battery', -7, 1),
        dev('switch', -4, 2),
        dev('capacitor', -0.5, 2, { capacitance: 0.1, role: 'Tank 1' }),
        dev('capacitor', -0.5, -2, { capacitance: 0.1, role: 'Tank 2' }),
        dev('lamp', 5, 1)
      ],
      leads('1.0-2.0', '2.1-3.0', '3.1-1.1', '3.0-5.0', '3.1-5.1')
    ),
    ['battery', 'switch', 'capacitor', 'lamp'],
    {
      ending: 'Putting two capacitors side by side adds their storage together like two water tanks.'
    }
  ),
  level(
    'diode-valve',
    'LEDs',
    'One-way valve',
    'Wire the diode (A toward +) and lamp in one loop. Light the lamp forward, then select the battery and reverse polarity to see the diode block current.',
    'Connect K on the diode to the lamp, and the lamp back to battery −. Power on to light the lamp, then click Reverse polarity on the battery.',
    fix(
      [
        dev('battery', -5, 1),
        dev('diode', 0, 1),
        dev('lamp', 5, 1)
      ],
      leads('1.0-2.0')
    ),
    ['battery', 'diode', 'lamp'],
    {
      unlocks: ['diode'],
      ending: 'A diode acts like a one-way door for electricity: it lets current pass from A to K and blocks the other way.'
    }
  ),
  level(
    'diode-shield',
    'LEDs',
    'Backwards shield',
    'Protect the motor with the diode so it spins one way normally and stays stopped at 0 rpm if someone flips the battery backwards.',
    'Put the diode and motor in one loop (battery + to A, K to motor, motor to battery −). Spin forward first, then click Reverse polarity on the battery.',
    fix(
      [
        dev('battery', -5, 1),
        dev('diode', 0, 1),
        dev('motor', 5, 1)
      ]
    ),
    ['battery', 'diode', 'motor'],
    {
      ending: 'Putting a diode in line shields sensitive parts whenever a battery gets hooked up backwards.'
    }
  )
];

function configKey(id, parts, wires) {
  if (id === 'res-divider') return JSON.stringify(parts.map(p => [p.id, p.kind]));
  if (id === 'res-fuse') return JSON.stringify([parts.map(p => [p.id, p.kind, p.fuseRating || 0.35])]);
  return JSON.stringify([parts.map(p => [p.id, p.kind]), wires.map(w => [w.a, w.b])]);
}

export function measureFoundations(lesson, parts, wires, s, a, on, dt = 0) {
  const id = lesson.id;
  const kind = k => parts.filter(p => p.kind === k);
  const amp = p => (on && p ? Math.abs(s.currents[p.id] || 0) : 0);
  const lit = p => amp(p) > 0.025;
  const key = configKey(id, parts, wires);

  if (!a.fnd || a.fnd.key !== key) {
    a.fnd = { key, cases: new Set(), stage: 0, holdTime: 0 };
    a.passed = false;
  }

  const f = a.fnd;
  let reading = '';

  if (id === 'res-divider') {
    const meter = kind('meter')[0];
    const resistors = kind('resistor');
    const vM = meter && on && !s.short ? Math.abs(s.meterVoltages?.[meter.id] ?? 0) : 0;
    const activeSplit = resistors.length >= 2 && resistors.every(r => amp(r) > 0.05);
    if (on && !s.short && meter && activeSplit) {
      if (Math.abs(vM - 6) < 0.25) f.cases.add('6v');
      if (Math.abs(vM - 3) < 0.25) f.cases.add('3v');
      if (f.cases.size === 2) a.passed = true;
    }
    reading = 'Meter ' + vM.toFixed(1) + ' V · Readings ' + f.cases.size + ' / 2 (6.0 V & 3.0 V)';
  } else if (id === 'res-fuse') {
    const fuse = kind('fuse')[0];
    const lamps = kind('lamp');
    const l1 = lamps.find(p => p.role === 'Lamp 1') || lamps[0];
    const l2 = lamps.find(p => p.role === 'Lamp 2') || lamps[1];
    if (on && !s.short && fuse && !fuse.blown && lit(l1) && !lit(l2) && amp(fuse) > 0.25) {
      f.cases.add('safe');
    }
    if (fuse?.blown && f.cases.has('safe')) a.passed = true;
    reading = fuse?.blown
      ? (f.cases.has('safe') ? 'Fuse blown · Safe limit checked' : 'Fuse blown · Replace fuse and run Lamp 1 alone first')
      : 'Fuse ' + amp(fuse).toFixed(2) + ' / ' + (fuse?.fuseRating || 0.35).toFixed(2) + ' A';
  } else if (id === 'cap-slow-fade') {
    const sw = kind('switch')[0];
    const cap = kind('capacitor')[0];
    const res = kind('resistor')[0];
    const lamp = kind('lamp')[0];
    const capV = Math.abs(cap?.charge || 0);
    const seriesLoad = res && lamp && res.resistance >= 40 && Math.abs(amp(res) - amp(lamp)) < 0.005 && lit(lamp);
    if (!on) {
      f.stage = 0;
      f.holdTime = 0;
    } else if (!s.short && sw && cap && res && lamp) {
      if (f.stage === 0 && sw.closed && capV >= 4.5 && res.resistance >= 40) {
        f.stage = 1;
        f.holdTime = 0;
      } else if (f.stage === 1) {
        if (!sw.closed && Math.abs(s.current) < 0.001 && seriesLoad && s.currents[cap.id] * cap.charge < -0.005) {
          f.holdTime += dt;
          if (f.holdTime >= 1.2) {
            f.stage = 2;
            a.passed = true;
          }
        } else if (sw.closed && res.resistance < 40) {
          f.stage = 0;
        }
      }
    }
    const labels = ['Charge above 4.5 V with R ≥ 40 Ω', 'Open switch to slow-dim lamp', 'Slow dim-out complete'];
    reading = (labels[f.stage] || labels[0]) + ' · Cap ' + capV.toFixed(1) + ' V';
  } else if (id === 'cap-parallel') {
    const sw = kind('switch')[0];
    const caps = kind('capacitor');
    const lamp = kind('lamp')[0];
    const bothCharged = caps.length >= 2 && caps.every(c => Math.abs(c.charge || 0) >= 4);
    const bothDraining = caps.length >= 2 && caps.every(c => (s.currents[c.id] || 0) * (c.charge || 0) < -0.005);
    if (!on) {
      f.stage = 0;
      f.holdTime = 0;
    } else if (!s.short && sw && lamp && caps.length >= 2) {
      if (f.stage === 0 && sw.closed && bothCharged) {
        f.stage = 1;
        f.holdTime = 0;
      } else if (f.stage === 1 && !sw.closed && Math.abs(s.current) < 0.001 && lit(lamp) && bothDraining) {
        f.holdTime += dt;
        if (f.holdTime >= 1.0) {
          f.stage = 2;
          a.passed = true;
        }
      }
    }
    const vTxt = caps.map(c => Math.abs(c.charge || 0).toFixed(1) + ' V').join(' · ');
    reading = (f.stage === 2 ? 'Shared drain verified' : f.stage === 1 ? 'Draining together ' + f.holdTime.toFixed(1) + ' s' : 'Charge both above 4 V') + ' · ' + vTxt;
  } else if (id === 'diode-valve' || id === 'diode-shield') {
    const bat = kind('battery')[0];
    const diode = kind('diode')[0];
    const load = id === 'diode-valve' ? kind('lamp')[0] : kind('motor')[0];
    const joined = nets(wires);
    const inLoop = diode && load && bat && (joined(diode.id + ':1', load.id + ':0') || joined(diode.id + ':1', load.id + ':1'));
    const vRev = diode ? (s.voltages[diode.id + ':1'] || 0) - (s.voltages[diode.id + ':0'] || 0) : 0;
    const sameLoop = diode && load && amp(diode) > 0.05 && Math.abs(amp(diode) - amp(load)) < 0.01;
    if (on && !s.short && bat && diode && load && inLoop) {
      if (!bat.reversed && sameLoop) f.cases.add('fwd');
      if (bat.reversed && amp(diode) < 0.001 && amp(load) < 0.001 && vRev > 3) f.cases.add('rev');
      if (f.cases.size === 2) a.passed = true;
    }
    const loadTxt = id === 'diode-valve'
      ? (lit(load) ? 'Lamp ON' : 'Lamp OFF')
      : Math.round(amp(load) * 900) + ' rpm';
    reading = (bat?.reversed ? 'Reverse' : 'Forward') + ' · ' + loadTxt + ' · Tests ' + f.cases.size + ' / 2';
  }

  s.activityPassed = a.passed;
  s.designReading = reading;
  return reading;
}

const fLbl = (x, y, text, cls = 'obs-sm') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="middle">${text}</text>`;
const fDot = (cx, cy) => `<circle class="obs-dot" cx="${cx}" cy="${cy}" r="2.1"/>`;
const fBat = (x = 16, topY = 16, botY = 90) =>
  `<path d="M${x} ${topY}V45M${x - 8} 45h16M${x - 4} 53h8M${x} 53V${botY}"/>${fLbl(x + 11, 40, '+', 'obs-lbl')}${fLbl(x + 11, 64, '−', 'obs-lbl')}`;
const fSw = (x, y, w = 22) => `<path d="M${x} ${y}l${w - 4} -8"/><circle cx="${x}" cy="${y}" r="1.7"/><circle cx="${x + w}" cy="${y}" r="1.7"/>`;
const fResH = (x, y) => `<path d="M${x} ${y}h4l2-5 4 10 4-10 4 10 4-10 2 5h4"/>`;
const fResV = (x, y) => `<path d="M${x} ${y}v3l-4 2 8 3-8 4 8 4-8 3 4 2v3"/>`;
const fCapV = (x, y) => `<path d="M${x} ${y}v6M${x - 7} ${y + 6}h14M${x - 7} ${y + 12}h14M${x} ${y + 12}v6"/>`;
const fLamp = (cx, cy, r = 9) => `<circle class="diagram-lamp" cx="${cx}" cy="${cy}" r="${r}"/><path d="m${cx - 6} ${cy - 6} 12 12m-12 0 12-12"/>`;
const fMot = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="9"/><path d="M${cx - 4} ${cy + 4}v-8l4 5 4-5v8"/>`;
const fDiodeH = (x, y) => `<path d="M${x} ${y - 7}v14l14-7ZM${x + 14} ${y - 7}v14"/>`;

export const foundationSketches = {
  'res-divider': [
    'Two 30 Ω resistors in series with a voltmeter across one resistor',
    `${fBat(18, 16, 88)}<path d="M18 16H54M82 16H108M136 16H168V88H18M95 16V56H100M124 56H168"/>${fDot(95, 16)}${fDot(168, 56)}${fResH(54, 16)}${fResH(108, 16)}<circle cx="112" cy="56" r="12"/>${fLbl(112, 60, 'V', 'obs-lbl')}${fLbl(68, 30, '30Ω')}${fLbl(122, 30, '30Ω')}${fLbl(112, 80, '3.0 V')}`
  ],
  'res-fuse': [
    'Glass fuse feeding Lamp 1 and switched parallel Lamp 2',
    `${fBat(16, 18, 88)}<path d="M16 18H44M72 18H168V42M168 60V88H16M116 18V42M116 60V88M48 18c5-6 11 6 16 0s4 0 4 0"/>${fDot(116, 18)}${fDot(116, 88)}<rect x="44" y="10" width="28" height="16" rx="3"/>${fLamp(116, 51, 9)}${fLamp(168, 51, 9)}${fSw(128, 18, 22)}${fLbl(58, 38, '0.35A')}${fLbl(139, 31, 'Sw')}`
  ],
  'cap-slow-fade': [
    'Switch charging a capacitor with a series resistor and lamp across it',
    `${fBat(14, 16, 88)}<path d="M14 16H36M58 16H166V44M166 62V88H14M92 16V42M92 60V88M114 16H118M146 16H166"/>${fDot(92, 16)}${fDot(92, 88)}${fSw(36, 16, 22)}${fCapV(92, 42)}${fResH(116, 16)}${fLamp(166, 53, 9)}${fLbl(130, 30, '≥40Ω')}${fLbl(71, 55, '0.1F')}`
  ],
  'cap-parallel': [
    'Switch charging two parallel 0.10 F capacitors powering a lamp',
    `${fBat(14, 16, 88)}<path d="M14 16H36M58 16H170V44M170 62V88H14M90 16V42M90 60V88M130 16V42M130 60V88"/>${fDot(90, 16)}${fDot(90, 88)}${fDot(130, 16)}${fDot(130, 88)}${fSw(36, 16, 22)}${fCapV(90, 42)}${fCapV(130, 42)}${fLamp(170, 53, 9)}${fLbl(69, 55, '0.1F')}${fLbl(109, 55, '0.1F')}`
  ],
  'diode-valve': [
    'Battery, one-way diode A to K, and lamp in series',
    `${fBat(18, 18, 86)}<path d="M18 18H80M94 18H166V42M166 60V86H18"/>${fDiodeH(80, 18)}${fLamp(166, 51, 9)}${fLbl(78, 36, 'A')}${fLbl(96, 36, 'K')}`
  ],
  'diode-shield': [
    'Battery, protective diode, and motor in one loop',
    `${fBat(18, 18, 86)}<path d="M18 18H80M94 18H166V42M166 60V86H18"/>${fDiodeH(80, 18)}${fMot(166, 51)}${fLbl(78, 36, 'A')}${fLbl(96, 36, 'K')}`
  ]
};

export const foundationGuides = {
  'res-divider': [
    { title: 'Check the battery first', text: 'Turn power on and touch the voltmeter probes across the battery (+ to + and − to −) to read 6.0 V.', target: '[data-kind="meter"]' },
    { title: 'Measure across one resistor', text: 'Move both voltmeter wires across one 30 Ω resistor to see the 6 V split cleanly down to 3.0 V.', target: '#viewport' }
  ],
  'res-fuse': [
    { title: 'Start with Lamp 1 alone', text: 'Leave the switch open and press power so Lamp 1 runs safely through the 0.35 A fuse.', target: '[data-kind="fuse"]' },
    { title: 'Overload with Lamp 2', text: 'Wire the switch and Lamp 2 across Lamp 1, then close the switch to watch the fuse blow.', target: '#viewport' }
  ],
  'cap-slow-fade': [
    { title: 'Put the resistor in the lamp path', text: 'Keep the resistor at 40 Ω or higher, and wire it in series with the lamp across the capacitor.', target: '[data-kind="resistor"]' },
    { title: 'Charge then slow-dim', text: 'Close the switch past 4.5 V, then open the switch and watch the resistor slow down the fade.', target: '#viewport' }
  ],
  'cap-parallel': [
    { title: 'Join Tank 2 across Tank 1', text: 'Wire both leads of Tank 2 to Tank 1 so both capacitors sit side by side.', target: '[data-kind="capacitor"]' },
    { title: 'Charge both then drain', text: 'Close the switch until both tanks pass 4 V, then open the switch to run the lamp off both.', target: '#viewport' }
  ],
  'diode-valve': [
    { title: 'Wire A toward +', text: 'Connect diode K to the lamp and the lamp back to battery −.', target: '[data-kind="diode"]' },
    { title: 'Flip the battery backwards', text: 'Power on to light the lamp, then select the battery and click Reverse polarity to see the diode block current.', target: '#reverse' }
  ],
  'diode-shield': [
    { title: 'Guard the motor', text: 'Connect battery + to diode A, K to the motor, and the motor back to battery −.', target: '[data-kind="diode"]' },
    { title: 'Test forward and backwards', text: 'Run the motor forward, then select the battery and reverse polarity to verify 0 rpm protection.', target: '#reverse' }
  ]
};
