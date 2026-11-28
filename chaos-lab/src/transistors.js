const dev = (kind, x, z, settings = {}) => ({ kind, x, z, ...settings });
const fix = (parts, connections = []) => ({
  parts: parts.map((p, i) => ({ resistance: 30, ...p, id: 'p' + (i + 1) })),
  wires: connections.map(([a, b]) => ({ a: 'p' + a, b: 'p' + b }))
});
const leads = (...pairs) => pairs.map(pair => pair.split('-').map(pin => pin.replace('.', ':')));

function transistorLevel(id, title, goal, hint, layout, parts, extra = {}) {
  return {
    id,
    unit: 'Transistors',
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

export const transistorActivities = [
  transistorLevel(
    'trans-switch',
    'Electronic switch',
    'Use a tiny trickle into B through the 100 Ω resistor so the transistor spins the motor. Test the switch open and closed.',
    'Keep E connected to battery − through the bus bar. Wire battery + through the motor into C, then wire battery + through the switch and 100 Ω resistor into B.',
    fix(
      [
        dev('battery', -7, 2),
        dev('switch', -4, 3),
        dev('resistor', -1, 3, { resistance: 100 }),
        dev('transistor', 2, 0),
        dev('motor', 6, -1),
        dev('rail', -1, -3)
      ],
      leads('1.1-6.0', '4.2-6.1')
    ),
    ['battery', 'switch', 'resistor', 'transistor', 'motor', 'rail'],
    {
      unlocks: ['transistor'],
      ending: 'A tiny signal into B turns on the big path between C and E with no moving parts.'
    }
  ),
  transistorLevel(
    'trans-amplifier',
    'Sunlight fan',
    'Connect the light sensor to B so bright light spins the motor and darkness stops it. Test Bright (100%) and Dark (0%).',
    'Wire battery + through the photoresistor into B (E stays wired to the bus bar). Put the motor between battery + and C, then slide Light down to 0% (Dark).',
    fix(
      [
        dev('battery', -7, 2),
        dev('photo', -3, 3, { lux: 100 }),
        dev('transistor', 1, 0),
        dev('motor', 6, -1),
        dev('rail', -1, -3)
      ],
      leads('1.1-5.0', '3.2-5.1')
    ),
    ['battery', 'photo', 'transistor', 'motor', 'rail'],
    {
      ending: 'A light sensor is too weak to spin a motor on its own, so the transistor boosts its weak signal.'
    }
  ),
  transistorLevel(
    'trans-dial',
    'Dial trigger',
    'Wire the dial into B so turning the dial past the trip point snaps the motor from stopped to full speed. Test both Low and High dial settings.',
    'Connect dial pin 2 to battery +, pin 1 to battery − (via the bus bar), and middle pin W to B. Wire battery + through the motor into C, then turn the dial up and down.',
    fix(
      [
        dev('battery', -7, 2),
        dev('pot', -3, 3, { wiper: 0.1, role: 'Dial' }),
        dev('transistor', 1.5, 0),
        dev('motor', 6, -1),
        dev('rail', -1, -3)
      ],
      leads('1.1-5.0', '3.2-5.1')
    ),
    ['battery', 'pot', 'transistor', 'motor', 'rail'],
    {
      ending: 'As soon as the dial raises pin B past 0.7 V, the transistor snaps the motor cleanly to full speed.'
    }
  ),
  transistorLevel(
    'trans-timer',
    'Hallway timer light',
    'Press and release the Start button so the capacitor keeps the lamp shining through the transistor, then shuts it off on its own.',
    'Wire battery + through Start to the 0.01 F capacitor and B (other capacitor pin to bus bar). Put the 100 Ω resistor across the capacitor to drain it smoothly, and wire the lamp between battery + and C.',
    fix(
      [
        dev('battery', -8, 2),
        dev('button', -5, 3, { role: 'Start' }),
        dev('capacitor', -1.5, 3, { capacitance: 0.01, role: '0.01 F' }),
        dev('resistor', -1.5, -0.5, { resistance: 100, role: '100 Ω' }),
        dev('transistor', 2.5, 0.5),
        dev('lamp', 6.5, 0.5),
        dev('rail', 0, -4)
      ],
      leads('1.1-7.0', '5.2-7.1')
    ),
    ['battery', 'button', 'capacitor', 'resistor', 'transistor', 'lamp', 'rail'],
    {
      ending: 'Instead of dimming right away, the transistor held the lamp bright until the capacitor dropped below its trigger point.'
    }
  ),
  transistorLevel(
    'trans-not',
    'Fridge door light',
    'Make the LED stay on when the Door switch is open, and turn off when the Door switch closes.',
    'Send battery + through the 60 Ω resistor to both LED A and transistor C (K and E go to the bus bar). Wire battery + through the Door switch and 100 Ω resistor into B.',
    fix(
      [
        dev('battery', -8, 2),
        dev('switch', -5, 3, { role: 'Door' }),
        dev('resistor', -2, 3, { resistance: 100, role: '100 Ω' }),
        dev('resistor', 0, -2, { resistance: 60, role: '60 Ω' }),
        dev('transistor', 1, 1),
        dev('led', 6, 0),
        dev('rail', 0, -5)
      ],
      leads('1.1-7.0', '5.2-7.1', '6.1-7.2')
    ),
    ['battery', 'switch', 'resistor', 'transistor', 'led', 'rail'],
    {
      ending: 'Closing the Door switch turns on the transistor, giving electricity an easy shortcut past the LED so it goes dark.'
    }
  ),
  transistorLevel(
    'trans-nightlight',
    'Automatic nightlight',
    'Connect two transistors so the lamp stays off in Bright light (100%) and turns on by itself in Darkness (0%).',
    'Wire the light sensor from battery + to T1:B. Feed battery + through the 60 Ω resistor to both T1:C and T2:B. Finally wire the lamp between battery + and T2:C, with both E pins on the bus bar.',
    fix(
      [
        dev('battery', -8, 2),
        dev('photo', -4.5, 3, { lux: 100 }),
        dev('resistor', -0.5, 4, { resistance: 60, role: '60 Ω' }),
        dev('transistor', -0.5, 0, { role: 'T1' }),
        dev('transistor', 3.5, 0, { role: 'T2' }),
        dev('lamp', 7.5, 0),
        dev('rail', 1, -3.5)
      ],
      leads('1.1-7.0', '4.2-7.1', '5.2-7.2')
    ),
    ['battery', 'photo', 'resistor', 'transistor', 'lamp', 'rail'],
    {
      ending: 'In bright light T1 steals the signal away from T2. In the dark, T1 shuts off so T2 turns the lamp on.'
    }
  ),
  transistorLevel(
    'trans-nand',
    'Inside a logic chip',
    'Stack two transistors with the 60 Ω resistor and LED so the LED stays on unless both A and B are closed. Test all four states.',
    'Route battery + through the 60 Ω resistor to LED A and T1:C. Stack T1:E into T2:C with T2:E on the bus bar. Feed T1:B from A and T2:B from B through the 100 Ω resistors.',
    fix(
      [
        dev('battery', -8.5, 2),
        dev('switch', -5.5, 3.5, { role: 'Input A' }),
        dev('switch', -5.5, -0.5, { role: 'Input B' }),
        dev('resistor', -2.5, 3.5, { resistance: 100 }),
        dev('resistor', -2.5, -0.5, { resistance: 100 }),
        dev('resistor', 1, 5, { resistance: 60, role: '60 Ω' }),
        dev('transistor', 1.5, 2, { role: 'T1' }),
        dev('transistor', 1.5, -1.5, { role: 'T2' }),
        dev('led', 6.5, 1.5),
        dev('rail', 0, -4.5)
      ],
      leads('1.1-10.0', '8.2-10.1', '9.1-10.2')
    ),
    ['battery', 'switch', 'resistor', 'transistor', 'led', 'rail'],
    {
      ending: 'This stacked pair is what sits inside a real NAND logic chip in the next chapter.'
    }
  ),
  transistorLevel(
    'trans-boss',
    'Night guard light',
    'Build a guard light that turns on ONLY when Arm is closed and Light is 0% (Dark). Test all four combinations.',
    'Start from the two-transistor nightlight you just built, then think about where the Arm switch can cut power to the guard lamp.',
    fix(
      [
        dev('battery', -8.5, 2),
        dev('switch', -5, -1, { role: 'Arm' }),
        dev('photo', -5, 3.5, { lux: 100 }),
        dev('resistor', -0.5, 4, { resistance: 60, role: '60 Ω' }),
        dev('transistor', -0.5, 0.5, { role: 'T1' }),
        dev('transistor', 3.5, 0.5, { role: 'T2' }),
        dev('lamp', 7.5, 0.5, { role: 'Guard lamp' }),
        dev('rail', 1, -3.5)
      ],
      leads('1.1-8.0', '5.2-8.1', '6.2-8.2')
    ),
    ['battery', 'switch', 'photo', 'resistor', 'transistor', 'lamp', 'rail'],
    {
      challenge: true,
      target: 'Armed AND Dark only',
      ending: 'You combined light sensing, an inverter, and an arm switch on one board.'
    }
  )
];

function configKey(parts, wires) {
  return JSON.stringify([
    parts.map(p => [p.id, p.kind, p.resistance || 30]),
    wires.map(w => [w.a, w.b])
  ]);
}

export function measureTransistors(lesson, parts, wires, s, a, on, dt = 0) {
  const id = lesson.id;
  const kind = k => parts.filter(p => p.kind === k);
  const amp = p => (on && p ? Math.abs(s.currents[p.id] || 0) : 0);
  const lit = p => amp(p) > 0.025;
  const key = configKey(parts, wires);

  if (!a.trans || a.trans.key !== key) {
    a.trans = { key, cases: new Set(), drivers: new Set(), stage: 0, holdTime: 0, sawPress: false };
    a.passed = false;
  }

  const tr = a.trans;
  const settled = !s.hasPendingTransition;
  const transistors = kind('transistor');
  const switches = kind('switch');
  const lamps = kind('lamp');
  const leds = kind('led');
  const photos = kind('photo');
  const motors = kind('motor');
  let reading = '';

  if (id === 'trans-switch') {
    const sw = switches[0];
    const t1 = transistors[0];
    const motor = motors[0];
    const rpm = Math.round(amp(motor) * 900);
    if (on && !s.short && sw && t1 && motor && settled) {
      if (!sw.closed && !t1.conducting && rpm < 10) tr.cases.add('open');
      if (sw.closed && t1.conducting && rpm > 120 && Math.abs(amp(t1) - amp(motor)) < 0.01) tr.cases.add('closed');
      if (tr.cases.size === 2) a.passed = true;
    }
    reading = 'Switch ' + (sw?.closed ? 'closed' : 'open') + ' · ' + rpm + ' rpm · States ' + tr.cases.size + ' / 2';
  } else if (id === 'trans-amplifier') {
    const photo = photos[0];
    const t1 = transistors[0];
    const motor = motors[0];
    const lux = photo ? (photo.lux ?? 100) : 100;
    const rpm = Math.round(amp(motor) * 900);
    if (on && !s.short && photo && t1 && motor && settled) {
      if (lux >= 75 && t1.conducting && rpm > 120 && Math.abs(amp(t1) - amp(motor)) < 0.01) tr.cases.add('bright');
      if (lux === 0 && !t1.conducting && rpm < 10) tr.cases.add('dark');
      if (tr.cases.size === 2) a.passed = true;
    }
    reading = 'Light ' + lux + '% · ' + rpm + ' rpm · States ' + tr.cases.size + ' / 2';
  } else if (id === 'trans-dial') {
    const pot = kind('pot')[0];
    const t1 = transistors[0];
    const motor = motors[0];
    const rpm = Math.round(amp(motor) * 900);
    const dialPct = Math.round((pot?.wiper ?? 0.5) * 100);
    const potSpan = pot ? Math.abs((s.voltages[pot.id + ':0'] || 0) - (s.voltages[pot.id + ':2'] || 0)) : 0;
    if (on && !s.short && pot && t1 && motor && potSpan > 4.5 && settled) {
      if (!t1.conducting && rpm < 10) tr.cases.add('off');
      if (t1.conducting && rpm > 120 && Math.abs(amp(t1) - amp(motor)) < 0.01) tr.cases.add('on');
      if (tr.cases.size === 2) a.passed = true;
    }
    reading = 'Dial ' + dialPct + '% · ' + rpm + ' rpm · States ' + tr.cases.size + ' / 2';
  } else if (id === 'trans-timer') {
    const btn = kind('button')[0];
    const cap = kind('capacitor')[0];
    const res = kind('resistor')[0];
    const t1 = transistors[0];
    const lamp = lamps[0];
    const capV = cap ? Math.abs(cap.charge || 0) : 0;
    const lampOn = lit(lamp);
    const transActive = t1 && lamp && t1.conducting && lampOn && Math.abs(amp(t1) - amp(lamp)) < 0.01;
    if (!on) {
      tr.stage = 0;
      tr.holdTime = 0;
      tr.sawPress = false;
    } else if (!s.short && btn && cap && res && t1 && lamp) {
      if (btn.closed) tr.sawPress = true;
      if (tr.stage === 0 && tr.sawPress) {
        if (btn.closed && transActive && capV >= 2.5) {
          tr.stage = 1;
          tr.holdTime = 0;
        } else if (!btn.closed && transActive && capV >= 2.0) {
          tr.stage = 2;
          tr.holdTime = dt;
        }
      } else if (tr.stage === 1 && !btn.closed && transActive) {
        tr.stage = 2;
        tr.holdTime = dt;
      } else if (tr.stage === 2) {
        if (btn.closed) {
          tr.stage = 1;
          tr.holdTime = 0;
        } else if (transActive) {
          tr.holdTime += dt;
        } else if (!t1.conducting && !lampOn && settled) {
          if (tr.holdTime >= 0.35) {
            tr.stage = 3;
            a.passed = true;
          } else {
            tr.stage = 0;
            tr.holdTime = 0;
            tr.sawPress = false;
          }
        }
      }
    }
    const labels = [
      'Press Start to charge timer',
      'Charging · release Start',
      'Holding lamp on (' + tr.holdTime.toFixed(1) + ' s)',
      'Timed shutoff complete'
    ];
    reading = (labels[tr.stage] || labels[0]) + ' · Cap ' + capV.toFixed(1) + ' V';
  } else if (id === 'trans-not') {
    const sw = switches[0];
    const t1 = transistors[0];
    const led = leds[0];
    const ledOn = amp(led) > 0.01;
    if (on && !s.short && sw && t1 && led && settled) {
      if (!sw.closed && !t1.conducting && ledOn) tr.cases.add('open');
      if (sw.closed && t1.conducting && amp(led) < 0.002 && amp(t1) > 0.05) tr.cases.add('closed');
      if (tr.cases.size === 2) a.passed = true;
    }
    reading = 'Door ' + (sw?.closed ? 'closed' : 'open') + ' · LED ' + (ledOn ? 'ON' : 'OFF') + ' · States ' + tr.cases.size + ' / 2';
  } else if (id === 'trans-nand') {
    const swA = switches.find(p => p.role === 'Input A') || switches.find(p => p.role !== 'Input B') || switches[0];
    const swB = switches.find(p => p.role === 'Input B' && p !== swA) || switches.find(p => p !== swA);
    const outPart = leds[0];
    const outOn = amp(outPart) > 0.01;
    const aOn = !!swA?.closed;
    const bOn = !!swB?.closed;
    const expected = !(aOn && bOn);
    if (on && !s.short && swA && swB && outPart && transistors.length >= 2 && settled) {
      for (const q of transistors) if (q.conducting) tr.drivers.add(q.id);
      const activeUsed = !expected ? transistors.every(q => q.conducting) : true;
      if (outOn === expected && activeUsed) {
        tr.cases.add((aOn ? '1' : '0') + (bOn ? '1' : '0'));
        if (tr.cases.size === 4 && tr.drivers.size >= 2) a.passed = true;
      }
    }
    reading = 'A ' + (aOn ? 1 : 0) + ' · B ' + (bOn ? 1 : 0) + ' · LED ' + (outOn ? 'ON' : 'OFF') + ' · Cases ' + tr.cases.size + ' / 4';
  } else if (id === 'trans-nightlight') {
    const photo = photos[0];
    const lamp = lamps[0];
    const lux = photo ? (photo.lux ?? 100) : 100;
    const lampOn = lit(lamp);
    if (on && !s.short && photo && lamp && transistors.length >= 2 && settled) {
      if (lux >= 75 && !lampOn && transistors.some(t => t.conducting)) tr.cases.add('bright');
      if (lux === 0 && lampOn && transistors.some(t => t.conducting && Math.abs(amp(t) - amp(lamp)) < 0.01)) tr.cases.add('dark');
      if (tr.cases.size === 2) a.passed = true;
    }
    reading = 'Light ' + lux + '% · Lamp ' + (lampOn ? 'ON' : 'OFF') + ' · States ' + tr.cases.size + ' / 2';
  } else if (id === 'trans-boss') {
    const arm = switches.find(p => p.role === 'Arm') || switches[0];
    const photo = photos[0];
    const lamp = lamps[0];
    const armOn = !!arm?.closed;
    const lux = photo ? (photo.lux ?? 100) : 100;
    const isBright = lux >= 75;
    const isDark = lux === 0;
    const lampOn = lit(lamp);
    if (on && !s.short && arm && photo && lamp && transistors.length >= 2 && settled && (isBright || isDark)) {
      const expected = armOn && isDark;
      const transOk = (!isBright || transistors.some(t => t.conducting)) && (!expected || transistors.some(t => t.conducting && Math.abs(amp(t) - amp(lamp)) < 0.01));
      if (lampOn === expected && transOk) {
        tr.cases.add((armOn ? 'A' : 'a') + (isDark ? 'D' : 'B'));
        if (tr.cases.size === 4) a.passed = true;
      }
    }
    reading = (armOn ? 'Armed' : 'Disarmed') + ' · Light ' + lux + '% · Lamp ' + (lampOn ? 'ON' : 'OFF') + ' · Cases ' + tr.cases.size + ' / 4';
  }

  s.activityPassed = a.passed;
  s.designReading = reading;
  return reading;
}

const tLbl = (x, y, text, cls = 'obs-sm') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="middle">${text}</text>`;
const tDot = (cx, cy) => `<circle class="obs-dot" cx="${cx}" cy="${cy}" r="2.1"/>`;
const tBat = (x = 16, topY = 14, botY = 92) =>
  `<path d="M${x} ${topY}V44M${x - 8} 44h16M${x - 4} 52h8M${x} 52V${botY}"/>${tLbl(x + 11, 39, '+', 'obs-lbl')}${tLbl(x + 11, 63, '−', 'obs-lbl')}`;
const tSw = (x, y, w = 22) =>
  `<path d="M${x} ${y}l${w - 4} -8"/><circle cx="${x}" cy="${y}" r="1.7"/><circle cx="${x + w}" cy="${y}" r="1.7"/>`;
const tBtn = (x, y, w = 22) =>
  `<circle cx="${x}" cy="${y}" r="1.7"/><circle cx="${x + w}" cy="${y}" r="1.7"/><path d="M${x + 2} ${y - 6}h${w - 4}M${x + w / 2} ${y - 6}v-5m-5 0h10"/>`;
const tResH = (x, y) => `<path d="M${x} ${y}h4l2-5 4 10 4-10 4 10 4-10 2 5h4"/>`;
const tResV = (x, y) => `<path d="M${x} ${y}v3l-4 2 8 3-8 4 8 4-8 3 4 2v3"/>`;
const tCapV = (x, y) => `<path d="M${x} ${y}v6M${x - 7} ${y + 6}h14M${x - 7} ${y + 12}h14M${x} ${y + 12}v6"/>`;
const tPhotoH = (x, y) =>
  `${tResH(x, y)}<path d="M${x + 5} ${y - 15}l5 6m-4 0h4v-4M${x + 13} ${y - 15}l5 6m-4 0h4v-4"/>`;
const tPotV = (x, y) =>
  `<path d="M${x} ${y}v5l-4 2 8 4-8 4 8 4-8 4 8 4-4 2v5"/><path d="M${x + 13} ${y + 17}H${x + 4}m4-3-4 3 4 3"/>`;
// Exact terminals: B = (cx - 12, cy), C = (cx + 4, cy - 12), E = (cx + 4, cy + 12)
const tNpn = (cx, cy) =>
  `<circle cx="${cx}" cy="${cy}" r="12"/><path d="M${cx - 4} ${cy - 6}v12M${cx - 12} ${cy}h8M${cx - 4} ${cy - 3}L${cx + 4} ${cy - 9}V${cy - 12}M${cx - 4} ${cy + 3}L${cx + 4} ${cy + 9}V${cy + 12}M${cx} ${cy + 9}l4 0-1-4"/>`;
const tLamp = (cx, cy, r = 9) =>
  `<circle class="diagram-lamp" cx="${cx}" cy="${cy}" r="${r}"/><path d="m${cx - 6} ${cy - 6} 12 12m-12 0 12-12"/>`;
const tMot = (cx, cy) =>
  `<circle cx="${cx}" cy="${cy}" r="9"/><path d="M${cx - 4} ${cy + 4}v-8l4 5 4-5v8"/>`;
const tLedV = (cx, cy) =>
  `<path d="M${cx} ${cy - 10}v5M${cx - 6} ${cy - 5}H${cx + 6}L${cx} ${cy + 5}ZM${cx - 6} ${cy + 5}H${cx + 6}M${cx} ${cy + 5}v5M${cx + 7} ${cy - 2}l5-4m-3 0h3v3M${cx + 7} ${cy + 4}l5-4m-3 0h3v3"/>`;

export const transistorSketches = {
  'trans-switch': [
    'Switch and 100 Ω resistor into B spin the motor between C and E',
    `${tBat(16, 14, 92)}<path d="M16 14H152V21M152 39V48M152 72V92H16M42 14V60M64 60H76M104 60H136"/>${tDot(42, 14)}${tSw(42, 60, 22)}${tResH(76, 60)}${tNpn(148, 60)}${tMot(152, 30)}${tLbl(90, 74, '100Ω')}${tLbl(132, 53, 'B')}${tLbl(164, 46, 'C')}${tLbl(164, 79, 'E')}`
  ],
  'trans-amplifier': [
    'Light sensor into B switches the motor on in bright light and off in darkness',
    `${tBat(16, 14, 92)}<path d="M16 14H152V21M152 39V48M152 72V92H16M52 14V60H64M92 60H136"/>${tDot(52, 14)}${tPhotoH(64, 60)}${tNpn(148, 60)}${tMot(152, 30)}${tLbl(78, 76, 'Light')}${tLbl(132, 53, 'B')}${tLbl(164, 46, 'C')}${tLbl(164, 79, 'E')}`
  ],
  'trans-dial': [
    'Potentiometer dial across + and − feeds pin B from wiper W to run the motor',
    `${tBat(16, 14, 92)}<path d="M16 14H156V21M156 39V48M156 72V92H16M56 14V37M56 71V92M69 54H112V60H140"/>${tDot(56, 14)}${tDot(56, 92)}${tPotV(56, 37)}${tNpn(152, 60)}${tMot(156, 30)}${tLbl(40, 57, 'Dial')}${tLbl(64, 28, '2')}${tLbl(64, 84, '1')}${tLbl(80, 49, 'W')}${tLbl(135, 53, 'B')}${tLbl(168, 46, 'C')}`
  ],
  'trans-timer': [
    'Push button charges a capacitor and 100 Ω resistor feeding B to hold the lamp on',
    `${tBat(16, 14, 92)}<path d="M16 14H162V21M162 39V48M162 72V92H16M34 14V42M56 42H124V60H146M70 42V58M70 76V92M106 42V55M106 79V92"/>${tDot(34, 14)}${tDot(70, 42)}${tDot(70, 92)}${tDot(106, 42)}${tDot(106, 92)}${tBtn(34, 42, 22)}${tCapV(70, 58)}${tResV(106, 55)}${tNpn(158, 60)}${tLamp(162, 30)}${tLbl(45, 28, 'Start')}${tLbl(48, 70, '0.01F')}${tLbl(124, 72, '100Ω')}`
  ],
  'trans-not': [
    'Door switch turns the transistor on so current skips past the LED',
    `${tBat(14, 14, 92)}<path d="M14 14H124V18M124 42V48M124 72V92M14 92H172V74M124 45H172V54M38 14V60M60 60H68M96 60H108"/>${tDot(38, 14)}${tDot(124, 45)}${tDot(124, 92)}${tSw(38, 60, 22)}${tResH(68, 60)}${tResV(124, 18)}${tNpn(120, 60)}${tLedV(172, 64)}${tLbl(49, 74, 'Door')}${tLbl(82, 74, '100Ω')}${tLbl(141, 32, '60Ω')}${tLbl(154, 68, 'LED')}`
  ],
  'trans-nightlight': [
    'Two transistors: daylight stops T2, darkness lets T2 light the lamp',
    `${tBat(14, 14, 92)}<path d="M14 14H174V21M174 39V48M174 72V92H14M32 14V60H42M70 60H80M96 14V18M96 42V48M96 72V92M96 45H136V60H158"/>${tDot(32, 14)}${tDot(96, 14)}${tDot(96, 45)}${tDot(96, 92)}${tPhotoH(42, 60)}${tResV(96, 18)}${tNpn(92, 60)}${tNpn(170, 60)}${tLamp(174, 30)}${tLbl(56, 76, 'Light')}${tLbl(112, 32, '60Ω')}${tLbl(76, 84, 'T1')}${tLbl(154, 84, 'T2')}`
  ],
  'trans-nand': [
    'Two stacked transistors with a 60 Ω resistor and LED make a NAND gate',
    `${tBat(12, 14, 92)}<path d="M12 14H86M114 14H164V43M164 63V92H12M34 14V72M34 42H38M56 42H64M92 42H116M34 72H38M56 72H64M92 72H116M132 14V30M132 54V60M132 84V92"/>${tDot(34, 14)}${tDot(34, 42)}${tDot(132, 14)}${tDot(132, 92)}${tResH(86, 14)}${tSw(38, 42, 18)}${tResH(64, 42)}${tSw(38, 72, 18)}${tResH(64, 72)}${tNpn(128, 42)}${tNpn(128, 72)}${tLedV(164, 53)}${tLbl(100, 27, '60Ω')}${tLbl(47, 54, 'A')}${tLbl(47, 84, 'B')}${tLbl(147, 36, 'T1')}${tLbl(147, 74, 'T2')}${tLbl(186, 56, 'LED')}`
  ],
  'trans-boss': [
    'Behavior goal: guard lamp turns on only when Arm is ON and Light is Dark',
    `<rect x="14" y="10" width="172" height="84" rx="5"/><path d="M14 29h172M14 50h172M14 71h172M70 10v84M128 10v84"/>${tLbl(42, 23, 'Arm')}${tLbl(99, 23, 'Light')}${tLbl(157, 23, 'Lamp')}${tLbl(42, 43, 'OFF')}${tLbl(99, 43, 'Any')}${tLbl(157, 43, 'OFF')}${tLbl(42, 64, 'ON')}${tLbl(99, 64, 'Bright')}${tLbl(157, 64, 'OFF')}${tLbl(42, 85, 'ON')}${tLbl(99, 85, 'Dark')}${tLbl(157, 85, 'ON ★')}`
  ]
};

export const transistorGuides = {
  'trans-switch': [
    { title: 'Wire B and C', text: 'Connect battery + through the switch and 100 Ω resistor to B, and connect battery + through the motor to C (E stays wired to the bus bar).', target: '[data-kind="transistor"]' },
    { title: 'Test open then closed', text: 'Power on with the switch open so the motor stays still, then close the switch to spin it.', target: '#viewport' }
  ],
  'trans-amplifier': [
    { title: 'Sensor drives B', text: 'Wire the photoresistor between battery + and B, and put the motor between battery + and C.', target: '[data-kind="photo"]' },
    { title: 'Test Bright and Dark', text: 'Power on at 100% Bright to spin the motor, then select the photoresistor and slide Light down to 0% Dark to stop it.', target: '#photo-lux-label' }
  ],
  'trans-dial': [
    { title: 'Wire the dial to B', text: 'Connect dial pin 2 to battery + and pin 1 to the bus bar (−), wire middle pin W to B, and put the motor between battery + and C.', target: '[data-kind="pot"]' },
    { title: 'Turn past the trip point', text: 'Power on with the dial low (stopped), then turn the dial up until the motor snaps to full speed.', target: '#pot-label' }
  ],
  'trans-timer': [
    { title: 'Build the timer branch', text: 'Wire battery + through Start to the 0.01 F capacitor and B (other capacitor pin to bus bar). Put the 100 Ω resistor across the capacitor and wire the lamp between + and C.', target: '[data-kind="capacitor"]' },
    { title: 'Press and watch it hold', text: 'Power on, press Start once, and watch the lamp stay lit after release before shutting off cleanly.', target: '#viewport' }
  ],
  'trans-not': [
    { title: 'Wire the LED and 60 Ω resistor', text: 'Run battery + through the 60 Ω resistor to both LED A and transistor C. Ground K and E through the bus bar.', target: '[data-kind="resistor"]' },
    { title: 'Test the Door switch', text: 'Feed B from the Door switch and 100 Ω resistor, then power on and toggle Door open and closed.', target: '#viewport' }
  ],
  'trans-nightlight': [
    { title: 'Chain T1 into T2', text: 'Wire the photoresistor from + to T1:B, wire the 60 Ω resistor from + to T1:C and T2:B, and put the lamp between + and T2:C.', target: '#viewport' },
    { title: 'Test Bright and 0% Dark', text: 'Power on at 100% Bright (lamp off), then select the photoresistor and slide Light to 0% Dark (lamp on).', target: '#photo-lux-label' }
  ],
  'trans-nand': [
    { title: 'Stack T1 above T2', text: 'Feed the 60 Ω resistor to LED A and T1:C, connect T1:E into T2:C (T2:E to bus bar), and wire switches A and B through 100 Ω resistors to B.', target: '#viewport' },
    { title: 'Test all four pairs', text: 'Power on and flip A and B through all four combinations so the LED goes dark only when both are closed.', target: '#viewport' }
  ],
  'trans-boss': [
    { title: 'Combine nightlight and Arm', text: 'Use what you learned in the nightlight lesson, and add the Arm switch so disarmed mode always keeps the guard lamp off.', target: '#viewport' },
    { title: 'Test all 4 combinations', text: 'Power on and test Arm open and closed in both 100% Bright and 0% Dark.', target: '#photo-lux-label' }
  ]
};
