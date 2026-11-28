const dev = (kind, x, z, settings = {}) => ({ kind, x, z, ...settings });
const fix = (parts, connections = []) => ({
  parts: parts.map((p, i) => ({ resistance: 30, ...p, id: 'p' + (i + 1) })),
  wires: connections.map(([a, b]) => ({ a: 'p' + a, b: 'p' + b }))
});
const leads = (...pairs) => pairs.map(pair => pair.split('-').map(pin => pin.replace('.', ':')));

function compLevel(id, title, goal, hint, layout, parts, extra = {}) {
  return {
    id,
    unit: 'Comparators',
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

export const comparatorActivities = [
  compLevel(
    'comp-scale',
    'Voltage scale',
    'Use the Comparator like a voltage scale: turn the lamp OFF when Dial is low and ON when Dial goes past 3 V.',
    'The two 30 Ω resistors make 3 V between them: wire that midpoint to comparator −. Connect Dial across + and the bus bar, wire W to comparator +, and connect Q to the lamp.',
    fix(
      [
        dev('battery', -9, 1),
        dev('pot', -5.5, 3, { wiper: 0.1, role: 'Dial' }),
        dev('resistor', -5.5, -1, { resistance: 30, role: 'Top 30 Ω' }),
        dev('resistor', -2, -1, { resistance: 30, role: 'Bot 30 Ω' }),
        dev('comparator', 2, 1),
        dev('lamp', 6.5, 1),
        dev('rail', -2, -4.5),
        dev('rail', 3.5, -4.5)
      ],
      leads('1.1-7.0', '7.3-8.0', '5.3-8.1', '6.1-8.2', '1.0-3.0', '3.1-4.0', '4.1-7.1')
    ),
    ['battery', 'pot', 'resistor', 'comparator', 'lamp', 'rail'],
    {
      unlocks: ['comparator'],
      ending: 'Whenever + climbs higher than −, comparator Q snaps cleanly ON (6 V).'
    }
  ),
  compLevel(
    'comp-light',
    'Light balancer',
    'Put the two light sensors in a tug-of-war on +. Light the lamp when Left is Bright and Right is Dark, and turn it off when Right is Bright and Left is Dark.',
    'Wire battery + through Left sensor to a midpoint, then through Right sensor to the bus bar (−). Send that midpoint to comparator + and the 3 V resistor midpoint to −, then wire Q to the lamp.',
    fix(
      [
        dev('battery', -9, 1),
        dev('photo', -5.5, 3.5, { lux: 100, role: 'Left' }),
        dev('photo', -5.5, -0.5, { lux: 0, role: 'Right' }),
        dev('resistor', -1.5, -2.5, { resistance: 30 }),
        dev('resistor', 2, -2.5, { resistance: 30 }),
        dev('comparator', 2, 1.5),
        dev('lamp', 6.5, 1.5),
        dev('rail', -1.5, -5.5),
        dev('rail', 4, -5.5)
      ],
      leads('1.1-8.0', '8.3-9.0', '6.3-9.1', '7.1-9.2', '1.0-4.0', '4.1-5.0', '5.1-8.1')
    ),
    ['battery', 'photo', 'resistor', 'comparator', 'lamp', 'rail'],
    {
      ending: 'Two sensors in series turn brightness difference into a clean voltage signal for the comparator.'
    }
  ),
  compLevel(
    'comp-low-bat',
    'Low-battery warning',
    'Charge the capacitor above 4.5 V so the red warning LED stays off, then open the switch so the warning LED lights as the charge drops below 3 V.',
    'Connect the 3 V resistor midpoint to comparator + and the capacitor top to comparator − (so + beats − when the tank falls under 3 V). Wire Q to the red LED anode A.',
    fix(
      [
        dev('battery', -9, 1),
        dev('switch', -6.5, 3, { role: 'Charger' }),
        dev('capacitor', -3, 2, { capacitance: 0.1, role: 'Tank 0.10 F' }),
        dev('lamp', -3, -1.5, { role: 'Drain' }),
        dev('resistor', 0.5, -3, { resistance: 30 }),
        dev('resistor', 3.5, -3, { resistance: 30 }),
        dev('comparator', 2.5, 1.5),
        dev('led', 7, 1.5, { color: 'red', role: 'Warning' }),
        dev('rail', -1, -5.5),
        dev('rail', 4.5, -5.5)
      ],
      leads('1.1-9.0', '9.3-10.0', '1.0-2.0', '2.1-3.0', '3.1-9.1', '3.0-4.0', '4.1-9.2', '1.0-5.0', '5.1-6.0', '6.1-10.1', '7.3-10.2', '8.1-10.3')
    ),
    ['battery', 'switch', 'capacitor', 'lamp', 'resistor', 'comparator', 'led', 'rail'],
    {
      ending: 'Putting the fixed 3 V on + and the battery tank on − flips the comparator to trigger a low-voltage alarm.'
    }
  ),
  compLevel(
    'comp-two-step',
    'Two-level meter',
    'Wire two comparators to the 2 V and 4 V resistor steps so turning Dial up lights 0 lamps, then 1 lamp, then both lamps.',
    'Connect Dial W to + on both comparators. Send the 2 V step (between R2 and R3) to Low 2V −, send the 4 V step (between R1 and R2) to High 4V −, and wire each Q to its lamp.',
    fix(
      [
        dev('battery', -9, 1),
        dev('pot', -6, 3.5, { wiper: 0.1, role: 'Dial' }),
        dev('resistor', -6, -0.5, { resistance: 30, role: 'R1' }),
        dev('resistor', -3, -0.5, { resistance: 30, role: 'R2' }),
        dev('resistor', 0, -0.5, { resistance: 30, role: 'R3' }),
        dev('comparator', 2.5, 3.5, { role: 'Low 2V' }),
        dev('comparator', 2.5, -1, { role: 'High 4V' }),
        dev('lamp', 7, 3.5, { role: 'Lamp 1' }),
        dev('lamp', 7, -1, { role: 'Lamp 2' }),
        dev('rail', -2, -5),
        dev('rail', 4, -5)
      ],
      leads('1.1-10.0', '10.3-11.0', '1.0-2.2', '2.0-10.1', '1.0-3.0', '3.1-4.0', '4.1-5.0', '5.1-10.2', '6.3-11.1', '7.3-11.2', '8.1-11.3', '9.1-11.3')
    ),
    ['battery', 'pot', 'resistor', 'comparator', 'lamp', 'rail'],
    {
      ending: 'Stacking comparators along a resistor ladder builds a step-by-step level meter.'
    }
  ),
  compLevel(
    'comp-window',
    'Safe zone',
    'Light the green Safe LED ONLY when Dial sits in the middle zone (between 2 V and 4 V). Test Low, Safe middle, and High.',
    'Wire Dial W to + on both comparators, 2 V to Low 2V −, and 4 V to High 4V −. Bridge the green LED from Low 2V Q (anode A) to High 4V Q (cathode K).',
    fix(
      [
        dev('battery', -9, 1),
        dev('pot', -6, 3.5, { wiper: 0.1, role: 'Dial' }),
        dev('resistor', -6, -0.5, { resistance: 30, role: 'R1' }),
        dev('resistor', -3, -0.5, { resistance: 30, role: 'R2' }),
        dev('resistor', 0, -0.5, { resistance: 30, role: 'R3' }),
        dev('comparator', 2.5, 3.5, { role: 'Low 2V' }),
        dev('comparator', 2.5, -1, { role: 'High 4V' }),
        dev('led', 7, 1, { color: 'green', role: 'Safe' }),
        dev('rail', -2, -5),
        dev('rail', 4, -5)
      ],
      leads('1.1-9.0', '9.3-10.0', '1.0-2.2', '2.0-9.1', '1.0-3.0', '3.1-4.0', '4.1-5.0', '5.1-9.2', '6.3-10.1', '7.3-10.2')
    ),
    ['battery', 'pot', 'resistor', 'comparator', 'led', 'rail'],
    {
      ending: 'In the middle zone, Q1 is 6 V and Q2 is 0 V so the LED glows. Above 4 V both outputs hit 6 V and the LED turns off.'
    }
  ),
  compLevel(
    'comp-blinker',
    'Auto-blinker',
    'Wire the 0.01 F capacitor and resistors into the comparator so the lamp blinks on and off by itself four times.',
    'Connect Feedback 60 Ω between Q and comparator +. Connect Timer 60 Ω from Q to −, put the 0.01 F capacitor between − and the bus bar, and wire Q to the lamp.',
    fix(
      [
        dev('battery', -9, 1),
        dev('resistor', -5.5, 4, { resistance: 60, role: 'Top 60 Ω' }),
        dev('resistor', -5.5, 1, { resistance: 60, role: 'Bot 60 Ω' }),
        dev('resistor', -5.5, -2, { resistance: 60, role: 'Feedback 60 Ω' }),
        dev('resistor', -1, -2, { resistance: 60, role: 'Timer 60 Ω' }),
        dev('capacitor', -1, 3.5, { capacitance: 0.01, role: '0.01 F' }),
        dev('comparator', 3, 1),
        dev('lamp', 7, 1),
        dev('rail', -1, -5)
      ],
      leads('1.1-9.0', '1.0-2.0', '2.1-7.0', '3.0-7.0', '3.1-9.1', '7.3-9.2', '8.1-9.3')
    ),
    ['battery', 'resistor', 'capacitor', 'comparator', 'lamp', 'rail'],
    {
      ending: 'Charging and draining a capacitor against two switching trip points creates a steady electronic blinker.'
    }
  ),
  compLevel(
    'comp-boss',
    'Smart greenhouse',
    'Turn on the Heater lamp when Temp is Cold (< 2 V), turn both off in Comfort (2–4 V), and spin the Fan motor when Hot (> 4 V).',
    'Use the 2 V and 4 V points on the resistor ladder as your two trip levels. One comparator watches for Cold (< 2 V) and the other watches for Hot (> 4 V).',
    fix(
      [
        dev('battery', -9, 1),
        dev('pot', -6, 3.5, { wiper: 0.5, role: 'Temp' }),
        dev('resistor', -6, -0.5, { resistance: 30, role: 'R1' }),
        dev('resistor', -3, -0.5, { resistance: 30, role: 'R2' }),
        dev('resistor', 0, -0.5, { resistance: 30, role: 'R3' }),
        dev('comparator', 2.5, 3.5, { role: 'Heater' }),
        dev('comparator', 2.5, -1, { role: 'Fan' }),
        dev('lamp', 7, 3.5, { role: 'Heater' }),
        dev('motor', 7, -1, { role: 'Fan' }),
        dev('rail', -2, -5),
        dev('rail', 4, -5)
      ],
      leads('1.1-10.0', '10.3-11.0', '1.0-2.2', '2.0-10.1', '1.0-3.0', '3.1-4.0', '4.1-5.0', '5.1-10.2', '6.3-11.1', '7.3-11.2', '8.1-11.3', '9.1-11.3')
    ),
    ['battery', 'pot', 'resistor', 'comparator', 'lamp', 'motor', 'rail'],
    {
      challenge: true,
      target: 'Cold: Heater · Mid: Off · Hot: Fan',
      ending: 'You built a complete temperature controller with a dead band where neither heater nor fan wastes power.'
    }
  )
];

function configKey(parts, wires) {
  return JSON.stringify([
    parts.map(p => [p.id, p.kind, p.resistance || 30]),
    wires.map(w => [w.a, w.b])
  ]);
}

export function measureComparators(lesson, parts, wires, s, a, on) {
  const id = lesson.id;
  const kind = k => parts.filter(p => p.kind === k);
  const amp = p => (on && p ? Math.abs(s.currents[p.id] || 0) : 0);
  const lit = p => amp(p) > 0.025;
  const key = configKey(parts, wires);

  if (!a.cmp || a.cmp.key !== key) {
    a.cmp = { key, zones: new Set(), pulses: 0 };
    a.passed = false;
  }

  const cmp = a.cmp;
  const settled = !s.hasPendingTransition;
  const comps = kind('comparator');
  const lamps = kind('lamp');
  const motors = kind('motor');
  const leds = kind('led');
  const pots = kind('pot');
  let reading = '';

  if (id === 'comp-scale') {
    const pot = pots[0];
    const c1 = comps[0];
    const lamp = lamps[0];
    const dialOk = pot && Math.abs((s.voltages[pot.id + ':0'] || 0) - (s.voltages[pot.id + ':2'] || 0)) > 4.5;
    const lampOn = lit(lamp);
    if (on && !s.short && pot && c1 && lamp && dialOk && settled) {
      if (!c1.outputHigh && !lampOn) cmp.zones.add('low');
      if (c1.outputHigh && lampOn && Math.abs(amp(c1) - amp(lamp)) < 0.01) cmp.zones.add('high');
      if (cmp.zones.size === 2) a.passed = true;
    }
    reading = 'Dial ' + Math.round((pot?.wiper ?? 0.5) * 100) + '% · Lamp ' + (lampOn ? 'ON' : 'OFF') + ' · States ' + cmp.zones.size + ' / 2';
  } else if (id === 'comp-light') {
    const left = kind('photo').find(p => p.role === 'Left') || kind('photo')[0];
    const right = kind('photo').find(p => p.role === 'Right' && p !== left) || kind('photo')[1];
    const c1 = comps[0];
    const lamp = lamps[0];
    const lLux = left?.lux ?? 100;
    const rLux = right?.lux ?? 100;
    const lampOn = lit(lamp);
    if (on && !s.short && left && right && c1 && lamp && settled) {
      if (lLux >= 75 && rLux <= 20 && c1.outputHigh && lampOn && Math.abs(amp(c1) - amp(lamp)) < 0.01) cmp.zones.add('left');
      if (lLux <= 20 && rLux >= 75 && !c1.outputHigh && !lampOn) cmp.zones.add('right');
      if (cmp.zones.size === 2) a.passed = true;
    }
    reading = `L ${lLux}% · R ${rLux}% · Lamp ${lampOn ? 'ON' : 'OFF'} · Tests ${cmp.zones.size} / 2`;
  } else if (id === 'comp-low-bat') {
    const sw = kind('switch')[0];
    const cap = kind('capacitor')[0];
    const c1 = comps[0];
    const led = leds[0];
    const capV = Math.abs(cap?.charge || 0);
    const ledOn = amp(led) > 0.01;
    if (!on) {
      cmp.stage = 0;
    } else if (!s.short && sw && cap && c1 && led && settled) {
      if (cmp.stage !== 1 && cmp.stage !== 2 && sw.closed && capV >= 4.5 && !c1.outputHigh && !ledOn) {
        cmp.stage = 1;
      } else if (cmp.stage === 1 && !sw.closed && capV < 2.9 && c1.outputHigh && ledOn && Math.abs(amp(c1) - amp(led)) < 0.01) {
        cmp.stage = 2;
        a.passed = true;
      }
    }
    const labels = ['Charge tank above 4.5 V', 'Open switch and let drain below 3 V', 'Low-battery alarm verified'];
    reading = (labels[cmp.stage || 0]) + ' · Tank ' + capV.toFixed(1) + ' V';
  } else if (id === 'comp-two-step') {
    const pot = pots[0];
    const l1 = lamps.find(p => p.role === 'Lamp 1') || lamps[0];
    const l2 = lamps.find(p => p.role === 'Lamp 2' && p !== l1) || lamps[1];
    const n1 = lit(l1);
    const n2 = lit(l2);
    const dialOk = pot && Math.abs((s.voltages[pot.id + ':0'] || 0) - (s.voltages[pot.id + ':2'] || 0)) > 4.5;
    if (on && !s.short && pot && comps.length >= 2 && l1 && l2 && dialOk && settled) {
      if (!n1 && !n2) cmp.zones.add('low');
      if (n1 && !n2) cmp.zones.add('mid');
      if (n1 && n2) cmp.zones.add('high');
      if (cmp.zones.size === 3) a.passed = true;
    }
    reading = 'Dial ' + Math.round((pot?.wiper ?? 0.5) * 100) + '% · Lit ' + ((n1 ? 1 : 0) + (n2 ? 1 : 0)) + ' / 2 · Zones ' + cmp.zones.size + ' / 3';
  } else if (id === 'comp-window') {
    const pot = pots[0];
    const led = leds[0];
    const cLow = comps.find(p => p.role === 'Low 2V') || comps[0];
    const cHigh = comps.find(p => p.role === 'High 4V' && p !== cLow) || comps[1];
    const dialOk = pot && Math.abs((s.voltages[pot.id + ':0'] || 0) - (s.voltages[pot.id + ':2'] || 0)) > 4.5;
    const ledOn = amp(led) > 0.01;
    if (on && !s.short && pot && cLow && cHigh && led && dialOk && settled) {
      if (!cLow.outputHigh && !cHigh.outputHigh && !ledOn) cmp.zones.add('low');
      if (cLow.outputHigh && !cHigh.outputHigh && ledOn) cmp.zones.add('safe');
      if (cLow.outputHigh && cHigh.outputHigh && !ledOn) cmp.zones.add('high');
      if (cmp.zones.size === 3) a.passed = true;
    }
    reading = 'Dial ' + Math.round((pot?.wiper ?? 0.5) * 100) + '% · Safe LED ' + (ledOn ? 'ON' : 'OFF') + ' · Zones ' + cmp.zones.size + ' / 3';
  } else if (id === 'comp-blinker') {
    const c1 = comps[0];
    const lamp = lamps[0];
    const lampOn = lit(lamp);
    const noClk = kind('clock').length === 0;
    if (on && !s.short && c1 && lamp && noClk) {
      const high = !!c1.outputHigh;
      if (cmp.prevHigh !== undefined && cmp.prevHigh !== high && lampOn === high) {
        cmp.pulses++;
      }
      cmp.prevHigh = high;
      if (cmp.pulses >= 4) a.passed = true;
    } else if (!on) {
      cmp.prevHigh = undefined;
    }
    reading = 'Blinks: ' + Math.min(4, cmp.pulses) + ' / 4 · Lamp ' + (lampOn ? 'ON' : 'OFF');
  } else if (id === 'comp-boss') {
    const pot = pots[0];
    const heater = lamps[0];
    const fan = motors[0];
    const dialOk = pot && Math.abs((s.voltages[pot.id + ':0'] || 0) - (s.voltages[pot.id + ':2'] || 0)) > 4.5;
    const heatOn = lit(heater);
    const fanOn = amp(fan) > 0.1;
    if (on && !s.short && pot && comps.length >= 2 && heater && fan && dialOk && settled) {
      const vW = s.voltages[pot.id + ':1'] || 0;
      if (vW < 1.9 && heatOn && !fanOn) cmp.zones.add('cold');
      if (vW > 2.15 && vW < 3.85 && !heatOn && !fanOn) cmp.zones.add('mid');
      if (vW > 4.1 && !heatOn && fanOn) cmp.zones.add('hot');
      if (cmp.zones.size === 3) a.passed = true;
    }
    const mode = heatOn ? 'Heating' : fanOn ? 'Cooling' : 'Idle';
    reading = 'Temp ' + Math.round((pot?.wiper ?? 0.5) * 100) + '% · ' + mode + ' · Zones ' + cmp.zones.size + ' / 3';
  }

  s.activityPassed = a.passed;
  s.designReading = reading;
  return reading;
}

const cLbl = (x, y, text, cls = 'obs-sm') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="middle">${text}</text>`;
const cDot = (cx, cy) => `<circle class="obs-dot" cx="${cx}" cy="${cy}" r="2.1"/>`;
const cBat = (x = 14, topY = 14, botY = 92) =>
  `<path d="M${x} ${topY}V44M${x - 8} 44h16M${x - 4} 52h8M${x} 52V${botY}"/>${cLbl(x + 11, 39, '+', 'obs-lbl')}${cLbl(x + 11, 63, '−', 'obs-lbl')}`;
const cSw = (x, y, w = 18) => `<path d="M${x} ${y}l${w - 3} -7"/><circle cx="${x}" cy="${y}" r="1.6"/><circle cx="${x + w}" cy="${y}" r="1.6"/>`;
const cResV = (x, y) => `<path d="M${x} ${y}v3l-4 2 8 3-8 4 8 4-8 3 4 2v3"/>`;
const cResH = (x, y) => `<path d="M${x} ${y}h4l2-5 4 10 4-10 4 10 4-10 2 5h4"/>`;
const cPotV = (x, y) => `<path d="M${x} ${y}v5l-4 2 8 4-8 4 8 4-8 4 8 4-4 2v5"/><path d="M${x + 13} ${y + 17}H${x + 4}m4-3-4 3 4 3"/>`;
const cCapV = (x, y) => `<path d="M${x} ${y}v6M${x - 7} ${y + 6}h14M${x - 7} ${y + 12}h14M${x} ${y + 12}v6"/>`;
const cPhotoV = (x, y) => `${cResV(x, y)}<path d="M${x - 14} ${y + 5}l6 5m-3-1h3v-3M${x - 14} ${y + 13}l6 5m-3-1h3v-3"/>`;
const cCmp = (x, y) =>
  `<path d="M${x} ${y}l34 15-34 15Z"/>${cLbl(x + 7, y + 12, '+')}${cLbl(x + 7, y + 24, '−')}`;
const cLamp = (cx, cy, r = 8) => {
  const k = Math.round(r * 0.6);
  return `<circle class="diagram-lamp" cx="${cx}" cy="${cy}" r="${r}"/><path d="m${cx - k} ${cy - k} ${k * 2} ${k * 2}m-${k * 2} 0 ${k * 2}-${k * 2}"/>`;
};
const cMot = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="8"/><path d="M${cx - 3.5} ${cy + 3.5}v-7l3.5 4.5 3.5-4.5v7"/>`;
const cLedV = (cx, cy) =>
  `<path d="M${cx} ${cy - 10}v5M${cx - 6} ${cy - 5}H${cx + 6}L${cx} ${cy + 5}ZM${cx - 6} ${cy + 5}H${cx + 6}M${cx} ${cy + 5}v5M${cx + 7} ${cy - 2}l5-4m-3 0h3v3M${cx + 7} ${cy + 4}l5-4m-3 0h3v3"/>`;
const cLedVUp = (cx, cy) =>
  `<path d="M${cx} ${cy + 10}v-5M${cx - 6} ${cy + 5}H${cx + 6}L${cx} ${cy - 5}ZM${cx - 6} ${cy - 5}H${cx + 6}M${cx} ${cy - 5}v-5M${cx + 7} ${cy - 2}l5-4m-3 0h3v3M${cx + 7} ${cy + 4}l5-4m-3 0h3v3"/>`;

export const comparatorSketches = {
  'comp-scale': [
    'Potentiometer dial compared against a 3 V divider to switch a lamp',
    `${cBat(14, 14, 92)}<path d="M14 14H74M14 92H174M46 14V32M46 66V92M74 14V18M74 42V60M74 84V92M74 56H104"/><path class="paper-cut" d="M68 49h12"/><path d="M59 49H94V44H104M138 50H174V58M174 74V92"/>${cDot(46, 14)}${cDot(46, 92)}${cDot(74, 56)}${cPotV(46, 32)}${cResV(74, 18)}${cResV(74, 60)}${cCmp(104, 35)}${cLamp(174, 66, 8)}${cLbl(32, 52, 'Dial')}${cLbl(88, 69, '3V')}${cLbl(146, 44, 'Q')}`
  ],
  'comp-light': [
    'Two light sensors in a voltage divider compared against 3 V',
    `${cBat(14, 14, 92)}<path d="M14 14H78M14 92H174M46 14V18M46 42V60M46 84V92M78 14V18M78 42V60M78 84V92M78 56H104"/><path class="paper-cut" d="M72 49h12"/><path d="M46 49H94V44H104M138 50H174V58M174 74V92"/>${cDot(46, 14)}${cDot(46, 49)}${cDot(46, 92)}${cDot(78, 56)}${cPhotoV(46, 18)}${cPhotoV(46, 60)}${cResV(78, 18)}${cResV(78, 60)}${cCmp(104, 35)}${cLamp(174, 66, 8)}${cLbl(60, 29, 'L')}${cLbl(60, 72, 'R')}${cLbl(92, 69, '3V')}`
  ],
  'comp-low-bat': [
    'Switched capacitor tank drained by a lamp triggers a warning LED below 3 V',
    `${cBat(12, 14, 92)}<path d="M12 14H50M68 14H100V59M100 73V92M12 92H174M32 14V18M32 42V60M32 84V92M76 14V56M76 74V92M100 56H118M152 50H174V56M174 76V92"/><path class="paper-cut" d="M70 44h12M94 44h12"/><path d="M32 44H118"/>${cDot(32, 14)}${cDot(32, 44)}${cDot(32, 92)}${cDot(76, 14)}${cDot(76, 92)}${cDot(100, 56)}${cDot(100, 92)}${cSw(50, 14, 18)}${cResV(32, 18)}${cResV(32, 60)}${cCapV(76, 56)}${cLamp(100, 66, 7)}${cCmp(118, 35)}${cLedV(174, 66)}${cLbl(44, 57, '3V')}${cLbl(156, 68, 'LED')}`
  ],
  'comp-two-step': [
    'Dial compared against 2 V and 4 V steps lighting two lamps in sequence',
    `${cBat(12, 14, 92)}<path d="M12 14H68M12 92H184M40 14V32M40 66V92M68 14V18M68 38V44M68 64V70M68 90V92M68 41H100V39H108M68 67H100V77H108"/><path class="paper-cut" d="M62 49h12M90 36v10"/><path d="M53 49H90V27H108M90 49V65H108M142 33H160M176 33H184V92M142 71H160M176 71H184"/>${cDot(40, 14)}${cDot(40, 92)}${cDot(68, 41)}${cDot(68, 67)}${cDot(90, 49)}${cDot(184, 71)}${cPotV(40, 32)}${cResV(68, 16)}${cResV(68, 42)}${cResV(68, 68)}${cCmp(108, 18)}${cCmp(108, 56)}${cLamp(168, 33, 7)}${cLamp(168, 71, 7)}${cLbl(27, 52, 'Dial')}${cLbl(79, 37, '4V')}${cLbl(79, 77, '2V')}`
  ],
  'comp-window': [
    'Two comparators bridging a green LED on only when Dial sits between 2 V and 4 V',
    `${cBat(12, 14, 92)}<path d="M12 14H68M12 92H68M40 14V32M40 66V92M68 14V18M68 38V44M68 64V70M68 90V92M68 41H100V39H108M68 67H100V77H108"/><path class="paper-cut" d="M62 49h12M90 36v10"/><path d="M53 49H90V27H108M90 49V65H108M142 33H170V42M142 71H170V62"/>${cDot(40, 14)}${cDot(40, 92)}${cDot(68, 41)}${cDot(68, 67)}${cDot(90, 49)}${cPotV(40, 32)}${cResV(68, 16)}${cResV(68, 42)}${cResV(68, 68)}${cCmp(108, 18)}${cCmp(108, 56)}${cLedVUp(170, 52)}${cLbl(27, 52, 'Dial')}${cLbl(79, 37, '4V')}${cLbl(79, 77, '2V')}${cLbl(150, 55, 'Safe')}`
  ],
  'comp-blinker': [
    'Comparator oscillator with feedback and timing RC network',
    `${cBat(12, 14, 92)}<path d="M12 14H40M12 92H178M40 14V18M40 42V60M40 84V92M40 45H112M82 57H112M82 57V58M82 76V92M146 51H178V58M178 74V92M154 51V20H138M110 20H96V45M154 51V79H138M110 79H96V57"/>${cDot(40, 45)}${cDot(82, 57)}${cDot(82, 92)}${cDot(96, 45)}${cDot(96, 57)}${cDot(154, 51)}${cResV(40, 18)}${cResV(40, 60)}${cCapV(82, 58)}${cResH(110, 20)}${cResH(110, 79)}${cCmp(112, 36)}${cLamp(178, 66, 8)}${cLbl(60, 71, '0.01F')}`
  ],
  'comp-boss': [
    'Three temperature zones: Heater on below 2 V, both off between 2 V and 4 V, Fan on above 4 V',
    `<rect x="10" y="16" width="56" height="62" rx="5"/><rect x="72" y="16" width="56" height="62" rx="5"/><rect x="134" y="16" width="56" height="62" rx="5"/>${cLamp(38, 43, 8)}${cMot(162, 43)}${cLbl(38, 28, 'Cold')}${cLbl(38, 66, 'Heat ON')}${cLbl(100, 28, 'Comfort')}${cLbl(100, 50, 'Both OFF')}${cLbl(162, 28, 'Hot')}${cLbl(162, 66, 'Fan ON')}${cLbl(38, 92, '&lt; 2 V')}${cLbl(100, 92, '2–4 V')}${cLbl(162, 92, '&gt; 4 V')}`
  ]
};

export const comparatorGuides = {
  'comp-scale': [
    { title: 'Build the 3 V reference', text: 'Wire the midpoint between the two 30 Ω resistors to comparator −, and wire Dial across + and the bus bar with W to comparator +.', target: '[data-kind="comparator"]' },
    { title: 'Cross the 3 V line', text: 'Wire Q to the lamp, power on, and turn Dial from low to high until the lamp snaps on past 50%.', target: '#pot-label' }
  ],
  'comp-light': [
    { title: 'Compare Left and Right light', text: 'Wire battery + through Left to Right to the bus bar, send their midpoint to comparator +, send the 3 V resistor midpoint to −, and wire Q to the lamp.', target: '[data-kind="photo"]' },
    { title: 'Test both sides', text: 'Test Left bright / Right dark (lamp ON), then swap them to Left dark / Right bright (lamp OFF).', target: '#photo-lux-label' }
  ],
  'comp-low-bat': [
    { title: 'Set up the 3 V trip point', text: 'Send the 3 V resistor midpoint to comparator +, send the capacitor top to comparator −, and wire Q to the red warning LED.', target: '[data-kind="led"]' },
    { title: 'Charge then drain', text: 'Close Charger past 4.5 V so the warning stays off, then open Charger until the voltage drops under 3 V and triggers the red LED.', target: '#viewport' }
  ],
  'comp-two-step': [
    { title: 'Connect Dial and 2 V / 4 V steps', text: 'Wire Dial W to + on both comparators, wire 2 V to Low 2V −, 4 V to High 4V −, and each Q to its lamp.', target: '[data-kind="comparator"]' },
    { title: 'Sweep Low, Mid, and High', text: 'Turn Dial through all three zones so 0, then 1, then both lamps light up.', target: '#pot-label' }
  ],
  'comp-window': [
    { title: 'Bridge the green LED between outputs', text: 'Wire Dial W to + on both comparators (2 V and 4 V to −), then wire Safe LED A to Low 2V Q and K to High 4V Q.', target: '[data-kind="led"]' },
    { title: 'Verify all 3 zones', text: 'Sweep Dial from low (< 2 V, off) to middle (2–4 V, green ON) to high (> 4 V, off).', target: '#pot-label' }
  ],
  'comp-blinker': [
    { title: 'Add feedback and capacitor timer', text: 'Connect Feedback 60 Ω from Q to +, Timer 60 Ω from Q to −, the 0.01 F capacitor from − to the bus bar, and the lamp from Q to the bus bar.', target: '[data-kind="capacitor"]' },
    { title: 'Watch it blink', text: 'Turn power on and let the lamp blink on and off four times on its own.', target: '#power' }
  ],
  'comp-boss': [
    { title: 'Set Cold and Hot triggers', text: 'Compare Temp against the 2 V and 4 V steps so Heater turns on below 2 V, Fan spins above 4 V, and both rest in between.', target: '[data-kind="comparator"]' },
    { title: 'Test Cold, Comfort, and Hot', text: 'Turn Temp through Cold (Heater on), middle Comfort (both off), and Hot (Fan spinning).', target: '#pot-label' }
  ]
};
