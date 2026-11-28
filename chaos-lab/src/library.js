export const LIBRARY_SHELVES = [
  { id: 'power', title: 'Switches & Power' },
  { id: 'analog', title: 'Analog, Meters & Actuators' },
  { id: 'logic', title: 'Sensors, Relays & Digital Logic' }
];

export const LIBRARY_UNLOCKS = [
  { kind: 'button', label: 'Push button', shelf: 'power', challengeId: 'lib-button', altLevels: ['relay-latch'] },
  { kind: 'spdt', label: '2-way switch', shelf: 'power', challengeId: 'lib-spdt', altLevels: [] },
  { kind: 'rail', label: 'Bus bar', shelf: 'power', challengeId: 'lib-rail', altLevels: ['relay-inverter'] },
  { kind: 'fuse', label: 'Glass fuse', shelf: 'power', challengeId: 'lib-fuse', altLevels: ['res-fuse'] },
  { kind: 'diode', label: 'Diode', shelf: 'analog', challengeId: 'lib-diode', altLevels: ['diode-valve'] },
  { kind: 'pot', label: 'Potentiometer', shelf: 'analog', challengeId: 'lib-pot', altLevels: [] },
  { kind: 'meter', label: 'Voltmeter', shelf: 'analog', challengeId: 'lib-meter', altLevels: ['res-divider'] },
  { kind: 'rgb', label: 'RGB light', shelf: 'analog', challengeId: 'lib-rgb', altLevels: [] },
  { kind: 'bell', label: 'Threshold bell', shelf: 'analog', challengeId: 'lib-bell', altLevels: [] },
  { kind: 'gear', label: 'Geared drive', shelf: 'analog', challengeId: 'lib-gear', altLevels: [] },
  { kind: 'servo', label: 'Servo + controller', shelf: 'analog', challengeId: 'lib-servo', altLevels: [] },
  { kind: 'photo', label: 'Photoresistor', shelf: 'logic', challengeId: 'lib-photo', altLevels: [] },
  { kind: 'relay', label: 'Sensor switch', shelf: 'logic', challengeId: 'lib-relay', altLevels: [] },
  { kind: 'transistor', label: 'NPN transistor', shelf: 'logic', challengeId: 'lib-transistor', altLevels: ['trans-switch'] },
  { kind: 'comparator', label: 'Comparator', shelf: 'logic', challengeId: 'lib-comparator', altLevels: ['comp-scale'] },
  { kind: 'coil', label: 'Coil relay', shelf: 'logic', challengeId: 'lib-coil', altLevels: ['relay-inverter'] },
  { kind: 'gate', label: 'Logic gate', shelf: 'logic', challengeId: 'lib-gate', altLevels: ['relay-nand'] },
  { kind: 'clock', label: 'Pulse clock', shelf: 'logic', challengeId: 'lib-clock', altLevels: ['relay-clock'] },
  { kind: 'latch', label: 'Memory cell', shelf: 'logic', challengeId: 'lib-latch', altLevels: ['relay-latch'] },
  { kind: 'display', label: '4-bit readout', shelf: 'logic', challengeId: 'lib-display', altLevels: ['half-adder'] }
];

const dev = (kind, x, z, settings = {}) => ({ kind, x, z, ...settings });
const fix = (parts, connections = []) => ({
  parts: parts.map((p, i) => ({ resistance: 30, ...p, id: 'p' + (i + 1) })),
  wires: connections.map(([a, b]) => ({ a: 'p' + a, b: 'p' + b }))
});
const leads = (...pairs) => pairs.map(pair => pair.split('-').map(pin => pin.replace('.', ':')));

function libChallenge(id, shelf, unlockKind, title, goal, hint, layout, parts, extra = {}) {
  return {
    id,
    unit: 'Library',
    library: true,
    shelf,
    title,
    goal,
    hint,
    parts,
    layout,
    diagram: id,
    activity: true,
    unlocks: [unlockKind],
    check: s => s.activityPassed === true,
    ending: extra.ending || goal,
    ...extra
  };
}

export const libraryActivities = [
  libChallenge(
    'lib-button',
    'power',
    'button',
    'Push button',
    'Wire the push button and lamp in a loop. Press the button to flash the lamp, then release it.',
    'Connect battery + to the button, the button to the lamp, and the lamp back to battery −. Hold or click the button to close the loop briefly.',
    fix([dev('battery', -4, 1), dev('button', 0, 2), dev('lamp', 4, 0)]),
    ['battery', 'button', 'lamp'],
    { ending: 'A push button closes a circuit only while it is held down.' }
  ),
  libChallenge(
    'lib-spdt',
    'power',
    'spdt',
    '2-way switch',
    'Wire C to battery + and route A and B through two lamps. Flip the 2-way switch to light each lamp in turn.',
    'Connect battery + to C on the 2-way switch. Wire A to one lamp, B to the other, and both lamps back to battery −.',
    fix([dev('battery', -5, 1), dev('spdt', -1, 1), dev('lamp', 4, 3, { role: 'Lamp A' }), dev('lamp', 4, -2, { role: 'Lamp B' })]),
    ['battery', 'spdt', 'lamp'],
    { ending: 'A 2-way switch sends current from common C to either A or B.' }
  ),
  libChallenge(
    'lib-rail',
    'power',
    'rail',
    'Bus bar',
    'Feed battery + into the bus bar and wire three lamps off it so all three glow at once.',
    'Every pin on the bus bar connects inside. Run one wire from battery + to pin 1, then wire pins 2, 3, and 4 to the three lamps.',
    fix([dev('battery', -6, 1), dev('rail', -1, 1), dev('lamp', 4, 3), dev('lamp', 4, 0), dev('lamp', 4, -3)]),
    ['battery', 'rail', 'lamp'],
    { ending: 'A bus bar distributes one supply or return line across multiple branches.' }
  ),
  libChallenge(
    'lib-fuse',
    'power',
    'fuse',
    'Glass fuse',
    'Power Lamp 1 safely through the 0.35 A glass fuse, then close the switch to overload the fuse with Lamp 2.',
    'Wire battery + through the fuse to Lamp 1 and back to −. Wire the switch and Lamp 2 across Lamp 1, power on with the switch open, then close the switch.',
    fix([dev('battery', -6, 2), dev('fuse', -2, 2, { fuseRating: 0.35 }), dev('lamp', 3, 2, { role: 'Lamp 1' }), dev('switch', -2, -2), dev('lamp', 3, -2, { role: 'Lamp 2' })]),
    ['battery', 'fuse', 'lamp', 'switch'],
    { ending: 'When current stays above its rating, the glass fuse filament opens to protect the circuit.' }
  ),
  libChallenge(
    'lib-diode',
    'analog',
    'diode',
    'Diode',
    'Light the lamp through the diode, then reverse battery polarity to confirm current is blocked.',
    'Connect battery + to anode A, cathode K to the lamp, and the lamp back to battery −. Power on, then select the battery and reverse polarity.',
    fix([dev('battery', -4, 1), dev('diode', 0, 1), dev('lamp', 4, 1)]),
    ['battery', 'diode', 'lamp'],
    { ending: 'A diode conducts from A to K and blocks reverse current.' }
  ),
  libChallenge(
    'lib-pot',
    'analog',
    'pot',
    'Potentiometer',
    'Wire the potentiometer to dim and brighten the lamp. Turn its dial to test both a dim state and a bright state.',
    'Connect terminal 1 and wiper W in series with the lamp, then select the potentiometer and sweep its Dial slider.',
    fix([dev('battery', -4, 1), dev('pot', 0, 1, { wiper: 0.5 }), dev('lamp', 4, 1)]),
    ['battery', 'pot', 'lamp'],
    { ending: 'Turning the wiper varies the resistance between W and each end terminal.' }
  ),
  libChallenge(
    'lib-meter',
    'analog',
    'meter',
    'Voltmeter',
    'Measure the 6.0 V battery voltage first, then move the probes to measure 3.0 V across one series lamp.',
    'Power on, connect meter + and − across the battery for 6.0 V, then move both wires across Lamp 1 to read 3.0 V.',
    fix(
      [dev('battery', -6, 1), dev('lamp', 0, 2, { role: 'Lamp 1' }), dev('lamp', 4, 2, { role: 'Lamp 2' }), dev('meter', 0, -2)],
      leads('1.0-2.0', '2.1-3.0', '3.1-1.1')
    ),
    ['battery', 'lamp', 'meter'],
    { ending: 'A voltmeter reads the voltage across any two terminals without loading the circuit.' }
  ),
  libChallenge(
    'lib-rgb',
    'analog',
    'rgb',
    'RGB light',
    'Wire the stage light to mix a yellow cue on the lens using only Red and Green.',
    'Connect − to battery −, then wire both R and G to battery +.',
    fix([dev('battery', -4, 0), dev('rgb', 3, 0)], leads('2.3-1.1')),
    ['battery', 'rgb'],
    { ending: 'Each RGB channel drives its own emitter through a shared − return.' }
  ),
  libChallenge(
    'lib-bell',
    'analog',
    'bell',
    'Threshold bell',
    'Wire the bell through the switch and close it to supply over 3 V and ring the gong.',
    'Connect battery + to the switch, the switch to bell +, and bell − to battery −. Power on and close the switch.',
    fix([dev('battery', -5, 1), dev('switch', -1, 1), dev('bell', 4, 1)]),
    ['battery', 'switch', 'bell'],
    { ending: 'The threshold bell strikes whenever its terminal voltage reaches 3 V or higher.' }
  ),
  libChallenge(
    'lib-gear',
    'analog',
    'gear',
    'Geared drive',
    'Run the geared drive forward, then reverse battery polarity so it turns the other way.',
    'Connect + and − across the battery, turn power on, then select the battery and click Reverse polarity.',
    fix([dev('battery', -4, 1), dev('gear', 3, 1)]),
    ['battery', 'gear'],
    { ending: 'The reduction gearbox turns slower than the DC motor with greater torque.' }
  ),
  libChallenge(
    'lib-servo',
    'analog',
    'servo',
    'Servo + controller',
    'Power the servo controller and turn its Angle dial past +30° and −30°.',
    'Connect + and − to the battery, power on, select the servo, and sweep its Angle slider to both extremes.',
    fix([dev('battery', -4, 1), dev('servo', 3, 1)]),
    ['battery', 'servo'],
    { ending: 'Above 3 V, the controller holds the servo horn at the dialed angle.' }
  ),
  libChallenge(
    'lib-photo',
    'logic',
    'photo',
    'Photoresistor',
    'Wire the photoresistor in series with the LED. Light the LED in bright light, then dim the Light slider until the LED goes dark.',
    'Connect battery + to the photoresistor, photoresistor to LED A, and LED K to battery −. Select the photoresistor to adjust Light.',
    fix([dev('battery', -5, 1), dev('photo', 0, 1, { lux: 100 }), dev('led', 5, 1)]),
    ['battery', 'photo', 'led'],
    { ending: 'A photoresistor drops to 600 Ω in bright light and rises to 10,000 Ω in the dark.' }
  ),
  libChallenge(
    'lib-relay',
    'logic',
    'relay',
    'Sensor switch',
    'Connect the photoresistor to L1 and L2 so darkness closes C to NO and lights the lamp.',
    'Wire the photoresistor to L1 and L2, and wire the lamp in a loop with battery +, C, NO, and battery −. Lower Light on the photoresistor to trigger the switch.',
    fix([dev('battery', -6, 1), dev('photo', -2, 3, { lux: 100 }), dev('relay', 2, 1), dev('lamp', 6, 1)]),
    ['battery', 'photo', 'relay', 'lamp'],
    { ending: 'When sensor resistance between L1 and L2 rises above 5,000 Ω, the relay closes C to NO.' }
  ),
  libChallenge(
    'lib-transistor',
    'logic',
    'transistor',
    'NPN transistor',
    'Switch the lamp through the NPN transistor using a small Base current through the 100 Ω resistor.',
    'Connect Emitter E to battery −, lamp between battery + and Collector C, and battery + through the switch and 100 Ω resistor into Base B. Toggle the switch.',
    fix([dev('battery', -6, 1), dev('switch', -3, 3), dev('resistor', 0, 3, { resistance: 100 }), dev('transistor', 2, -1), dev('lamp', 6, -1)]),
    ['battery', 'switch', 'resistor', 'transistor', 'lamp'],
    { ending: 'A small Base-to-Emitter current lets the transistor conduct larger current from C to E.' }
  ),
  libChallenge(
    'lib-comparator',
    'logic',
    'comparator',
    'Comparator',
    'Compare the Dial against a 3 V split so Q lights the lamp whenever Dial is above 3 V.',
    'Keep the two 30 Ω resistors across + and − (joined at 0V) to make 3 V on −. Wire Dial across + and 0V with W to +, and wire Q to the lamp.',
    fix(
      [
        dev('battery', -8, 1),
        dev('pot', -4.5, 3, { wiper: 0.1, role: 'Dial' }),
        dev('resistor', -4.5, -1, { resistance: 30 }),
        dev('resistor', -1, -1, { resistance: 30 }),
        dev('comparator', 2.5, 1),
        dev('lamp', 6.5, 1),
        dev('rail', 0, -4.5)
      ],
      leads('1.1-7.0', '5.3-7.1', '6.1-7.2', '1.0-3.0', '3.1-4.0', '4.1-7.3')
    ),
    ['battery', 'pot', 'resistor', 'comparator', 'lamp', 'rail'],
    { ending: 'A comparator watches + and − and turns Q ON (6 V) whenever + is higher than −.' }
  ),
  libChallenge(
    'lib-coil',
    'logic',
    'coil',
    'Coil relay',
    'Use the switch to energize coil A–B and snap power from the NC lamp to the NO lamp.',
    'Connect battery + through the switch to coil A and coil B to −. Connect battery + to C, NC to one lamp, NO to the other, and both lamps back to −.',
    fix([
      dev('battery', -7, 2),
      dev('switch', -3, 3),
      dev('coil', 1, 1),
      dev('lamp', 6, 3, { role: 'NC lamp' }),
      dev('lamp', 6, -1, { role: 'NO lamp' }),
      dev('rail', -2, -2)
    ]),
    ['battery', 'switch', 'coil', 'lamp', 'rail'],
    { ending: 'Energizing A–B switches common C from NC (normally closed) to NO (normally open).' }
  ),
  libChallenge(
    'lib-gate',
    'logic',
    'gate',
    'Logic gate',
    'Wire inputs A and B to the AND gate and Q to the lamp. Show the lamp off at first, then close both switches to light it.',
    'Connect battery + through each switch to A and B, connect Q to the lamp, and keep every − pin tied to the bus bar.',
    fix(
      [
        dev('battery', -7, 1),
        dev('switch', -4, 3, { role: 'Input A' }),
        dev('switch', -4, -1, { role: 'Input B' }),
        dev('gate', 0, 1, { gateMode: 'AND', outputHigh: false }),
        dev('lamp', 5, 1),
        dev('rail', -1, -3)
      ],
      leads('1.1-6.0', '4.3-6.1', '5.1-6.2')
    ),
    ['battery', 'switch', 'gate', 'lamp', 'rail'],
    { ending: 'A logic gate checks A and B against 3 V and drives Q to 6 V or 0 V.' }
  ),
  libChallenge(
    'lib-clock',
    'logic',
    'clock',
    'Pulse clock',
    'Connect the lamp across the pulse clock (+ and −) and power on to blink the lamp three times.',
    'Wire clock + and − to the two lamp terminals, then press power.',
    fix([dev('clock', -3, 0, { clockHz: 1 }), dev('lamp', 3, 0)]),
    ['clock', 'lamp'],
    { ending: 'The pulse clock alternates between 6 V and 0 V at the selected rate.' }
  ),
  libChallenge(
    'lib-latch',
    'logic',
    'latch',
    'Memory cell',
    'Close Data, press Clock to store a 1 in the memory cell, then open Data so Q stays on.',
    'Wire battery + through Data to D and through Clock to CK. Wire Q to the lamp. Close Data, click the Clock button, then open Data.',
    fix(
      [
        dev('battery', -8, 2),
        dev('switch', -5, 3, { role: 'Data' }),
        dev('button', -4, -1, { role: 'Clock' }),
        dev('latch', 1, 1),
        dev('lamp', 6, 1),
        dev('rail', -1, -3)
      ],
      leads('1.1-6.0', '4.3-6.1', '5.1-6.2')
    ),
    ['battery', 'switch', 'button', 'latch', 'lamp', 'rail'],
    { ending: 'On each rising Clock edge, the memory cell captures D and holds it on Q.' }
  ),
  libChallenge(
    'lib-display',
    'logic',
    'display',
    '4-bit readout',
    'Wire four switches to the 1, 2, 4, and 8 pins of the 4-bit readout. Display 5 and then 10.',
    'Feed battery + into each switch and connect the switches to pins 1, 2, 4, and 8. Close 1 + 4 for 5, then close 2 + 8 for 10.',
    fix(
      [
        dev('battery', -8, 1),
        dev('switch', -4, 4, { role: 'Bit 1' }),
        dev('switch', -4, 1, { role: 'Bit 2' }),
        dev('switch', -4, -2, { role: 'Bit 4' }),
        dev('switch', -4, -5, { role: 'Bit 8' }),
        dev('display', 3, 0),
        dev('rail', 0, -5)
      ],
      leads('1.1-7.0', '6.4-7.1')
    ),
    ['battery', 'switch', 'display', 'rail'],
    { ending: 'Four binary weights (1, 2, 4, 8) add together to show numbers 0 through 15.' }
  )
];

function configKey(parts, wires) {
  return JSON.stringify([
    parts.map(p => [p.id, p.kind, p.gateMode || 'NAND', p.clockHz || 1, p.fuseRating || 0.35]),
    wires.map(w => [w.a, w.b])
  ]);
}

function wireNets(wires) {
  const parent = new Map();
  const root = x => {
    while (parent.has(x)) x = parent.get(x);
    return x;
  };
  for (const w of wires) {
    const a = root(w.a);
    const b = root(w.b);
    if (a !== b) parent.set(a, b);
  }
  return (a, b) => root(a) === root(b);
}

export function measureLibrary(lesson, parts, wires, s, a, on) {
  const id = lesson.id;
  const kind = k => parts.filter(p => p.kind === k);
  const amp = p => (on && p ? Math.abs(s.currents[p.id] || 0) : 0);
  const lit = p => amp(p) > 0.025;
  const settled = !s.hasPendingTransition;
  const key = id === 'lib-meter'
    ? JSON.stringify(parts.map(p => [p.id, p.kind]))
    : id === 'lib-fuse'
      ? JSON.stringify(parts.map(p => [p.id, p.kind, p.fuseRating || 0.35]))
      : configKey(parts, wires);

  if (!a.lib || a.lib.key !== key) {
    a.lib = { key, pulses: 0 };
    a.passed = false;
  }

  const lib = a.lib;
  const lamps = kind('lamp');
  const switches = kind('switch');
  const bat = kind('battery')[0];
  let reading = '';

  if (id === 'lib-button') {
    const btn = kind('button')[0];
    const lamp = lamps[0];
    const lampOn = lit(lamp);
    if (on && !s.short && btn && lamp) {
      if (btn.closed && lampOn) lib.pressed = true;
      if (lib.pressed && !btn.closed && !lampOn) a.passed = true;
    }
    reading = lib.pressed ? (a.passed ? 'Button tested' : 'Release button') : 'Press the button';
  } else if (id === 'lib-spdt') {
    const sw = kind('spdt')[0];
    const litLamps = lamps.filter(lit);
    if (on && !s.short && sw && lamps.length >= 2 && litLamps.length === 1) {
      if (!sw.throwB) lib.posA = litLamps[0].id;
      else lib.posB = litLamps[0].id;
      if (lib.posA && lib.posB && lib.posA !== lib.posB) a.passed = true;
    }
    reading = 'Throw ' + (sw?.throwB ? 'B' : 'A') + ' · Lit ' + litLamps.length + ' · Sides ' + ((lib.posA ? 1 : 0) + (lib.posB ? 1 : 0)) + ' / 2';
  } else if (id === 'lib-rail') {
    const rail = kind('rail')[0];
    const j = wireNets(wires);
    const onRail = p => [0, 1].some(pi => [0, 1, 2, 3].some(ri => j(p.id + ':' + pi, rail.id + ':' + ri)));
    if (on && !s.short && rail && bat && lamps.length >= 3 && lamps.every(lit) && onRail(bat) && lamps.every(onRail)) {
      a.passed = true;
    }
    reading = 'Lit lamps: ' + lamps.filter(lit).length + ' / 3';
  } else if (id === 'lib-fuse') {
    const fuse = kind('fuse')[0];
    const safeLit = lamps.filter(lit);
    if (on && !s.short && fuse && !fuse.blown && safeLit.length >= 1 && amp(fuse) > 0.25 && amp(fuse) <= (fuse.fuseRating || 0.35)) {
      lib.safeSeen = true;
    }
    if (fuse?.blown && lib.safeSeen) a.passed = true;
    reading = fuse?.blown
      ? (lib.safeSeen ? 'Fuse blown · Circuit protected' : 'Blown · Replace fuse and test 1 lamp first')
      : 'Fuse ' + amp(fuse).toFixed(2) + ' / ' + (fuse?.fuseRating || 0.35).toFixed(2) + ' A' + (lib.safeSeen ? ' · Safe load verified' : '');
  } else if (id === 'lib-diode') {
    const diode = kind('diode')[0];
    const lamp = lamps[0];
    if (on && !s.short && diode && lamp) {
      if (lit(lamp) && amp(diode) > 0.05 && Math.abs(amp(diode) - amp(lamp)) < 0.02) lib.forward = true;
      const vRev = (s.voltages[diode.id + ':1'] || 0) - (s.voltages[diode.id + ':0'] || 0);
      if (!lit(lamp) && amp(diode) < 0.001 && vRev > 3) lib.reverse = true;
      if (lib.forward && lib.reverse) a.passed = true;
    }
    reading = 'Forward ' + (lib.forward ? 'yes' : 'no') + ' · Reverse blocked ' + (lib.reverse ? 'yes' : 'no');
  } else if (id === 'lib-pot') {
    const pot = kind('pot')[0];
    const lamp = lamps[0];
    const aLamp = amp(lamp);
    const aPot = pot ? Math.abs(s.currents[pot.id + '/1'] || 0) + Math.abs(s.currents[pot.id + '/2'] || 0) : 0;
    if (on && !s.short && pot && lamp && aPot > 0.02) {
      if (aLamp > 0.025 && aLamp <= 0.145) lib.dim = true;
      if (aLamp >= 0.215) lib.bright = true;
      if (lib.dim && lib.bright) a.passed = true;
    }
    reading = 'Lamp ' + aLamp.toFixed(2) + ' A · Dim ' + (lib.dim ? 'yes' : 'no') + ' · Bright ' + (lib.bright ? 'yes' : 'no');
  } else if (id === 'lib-meter') {
    const meter = kind('meter')[0];
    const v = meter && on && !s.short ? Math.abs(s.meterVoltages?.[meter.id] ?? 0) : 0;
    if (on && !s.short && meter) {
      if (Math.abs(v - 6) <= 0.3) lib.full = true;
      if (Math.abs(v - 3) <= 0.3) lib.half = true;
      if (lib.full && lib.half) a.passed = true;
    }
    reading = 'Meter ' + v.toFixed(1) + ' V · 6 V ' + (lib.full ? 'yes' : 'no') + ' · 3 V ' + (lib.half ? 'yes' : 'no');
  } else if (id === 'lib-rgb') {
    const rgb = kind('rgb')[0];
    const [r, g, b] = [0, 1, 2].map(i => (on && rgb ? s.currents[rgb.id + '/' + i] || 0 : 0));
    if (on && !s.short && r > 0.003 && g > 0.003 && b < 0.0005) a.passed = true;
    reading = 'R ' + (1000 * r).toFixed(0) + ' mA · G ' + (1000 * g).toFixed(0) + ' mA · B ' + (1000 * b).toFixed(0) + ' mA';
  } else if (id === 'lib-bell') {
    const bell = kind('bell')[0];
    const v = on && bell && !s.short ? Math.abs((s.voltages[bell.id + ':0'] || 0) - (s.voltages[bell.id + ':1'] || 0)) : 0;
    if (on && !s.short && v >= 3) a.passed = true;
    reading = 'Bell ' + v.toFixed(1) + ' V' + (v >= 3 ? ' · Ringing' : ' · Needs 3 V');
  } else if (id === 'lib-gear') {
    const gear = kind('gear')[0];
    const v = on && gear && !s.short ? (s.voltages[gear.id + ':0'] || 0) - (s.voltages[gear.id + ':1'] || 0) : 0;
    if (v > 3) lib.fwd = true;
    if (v < -3) lib.rev = true;
    if (lib.fwd && lib.rev) a.passed = true;
    reading = 'Drive ' + v.toFixed(1) + ' V · Forward ' + (lib.fwd ? 'yes' : 'no') + ' · Reverse ' + (lib.rev ? 'yes' : 'no');
  } else if (id === 'lib-servo') {
    const servo = kind('servo')[0];
    const v = on && servo && !s.short ? Math.abs((s.voltages[servo.id + ':0'] || 0) - (s.voltages[servo.id + ':1'] || 0)) : 0;
    const dial = servo?.dial ?? 0;
    if (v > 3) {
      if (dial >= 30) lib.pos = true;
      if (dial <= -30) lib.neg = true;
      if (lib.pos && lib.neg) a.passed = true;
    }
    reading = (v > 3 ? 'Servo ' + dial + '°' : 'Needs power') + ' · Sides ' + ((lib.pos ? 1 : 0) + (lib.neg ? 1 : 0)) + ' / 2';
  } else if (id === 'lib-photo') {
    const photo = kind('photo')[0];
    const led = kind('led')[0];
    const lux = photo?.lux ?? 100;
    const iLed = amp(led);
    const samePath = photo && led && Math.abs(iLed - amp(photo)) < 0.0005 && iLed > 0.0001;
    if (on && !s.short && samePath) {
      if (lux >= 70 && iLed > 0.003) lib.bright = true;
      if (lux <= 25 && iLed < 0.002) lib.dark = true;
      if (lib.bright && lib.dark) a.passed = true;
    }
    reading = 'Light ' + lux + '% · LED ' + (iLed * 1000).toFixed(1) + ' mA · ' + ((lib.bright ? 1 : 0) + (lib.dark ? 1 : 0)) + ' / 2';
  } else if (id === 'lib-relay') {
    const photo = kind('photo')[0];
    const relay = kind('relay')[0];
    const lamp = lamps[0];
    const closed = !!(relay && s.relayContacts?.[relay.id]);
    if (on && !s.short && photo && relay && lamp) {
      if (!closed && !lit(lamp)) lib.brightOff = true;
      if (closed && lit(lamp) && Math.abs(amp(relay) - amp(lamp)) < 0.002) lib.darkOn = true;
      if (lib.brightOff && lib.darkOn) a.passed = true;
    }
    reading = 'Contacts ' + (closed ? 'closed' : 'open') + ' · Lamp ' + (lit(lamp) ? 'on' : 'off');
  } else if (id === 'lib-transistor') {
    const tr = kind('transistor')[0];
    const sw = switches[0];
    const lamp = lamps[0];
    if (on && !s.short && sw && tr && lamp && settled) {
      if (!sw.closed && !tr.conducting && !lit(lamp)) lib.off = true;
      if (sw.closed && tr.conducting && lit(lamp) && Math.abs(amp(tr) - amp(lamp)) < 0.01) lib.on = true;
      if (lib.off && lib.on) a.passed = true;
    }
    reading = 'Base ' + (tr?.conducting ? 'conducting' : 'off') + ' · States ' + ((lib.off ? 1 : 0) + (lib.on ? 1 : 0)) + ' / 2';
  } else if (id === 'lib-comparator') {
    const pot = kind('pot')[0];
    const cmp = kind('comparator')[0];
    const lamp = lamps[0];
    const dialOk = pot && Math.abs((s.voltages[pot.id + ':0'] || 0) - (s.voltages[pot.id + ':2'] || 0)) > 4.5;
    if (on && !s.short && pot && cmp && lamp && dialOk && settled) {
      if (!cmp.outputHigh && !lit(lamp)) lib.low = true;
      if (cmp.outputHigh && lit(lamp) && Math.abs(amp(cmp) - amp(lamp)) < 0.01) lib.high = true;
      if (lib.low && lib.high) a.passed = true;
    }
    reading = 'Out ' + (cmp?.outputHigh ? 'ON (6 V)' : 'OFF') + ' · States ' + ((lib.low ? 1 : 0) + (lib.high ? 1 : 0)) + ' / 2';
  } else if (id === 'lib-coil') {
    const coil = kind('coil')[0];
    const litLamps = lamps.filter(lit);
    if (on && !s.short && coil && lamps.length >= 2 && settled && litLamps.length === 1) {
      if (!coil.energized) lib.ncLamp = litLamps[0].id;
      else lib.noLamp = litLamps[0].id;
      if (lib.ncLamp && lib.noLamp && lib.ncLamp !== lib.noLamp) a.passed = true;
    }
    reading = 'Coil ' + (coil?.energized ? 'energized (NO)' : 'idle (NC)') + ' · States ' + ((lib.ncLamp ? 1 : 0) + (lib.noLamp ? 1 : 0)) + ' / 2';
  } else if (id === 'lib-gate') {
    const swA = switches.find(p => p.role === 'Input A') || switches[0];
    const swB = switches.find(p => p.role === 'Input B') || switches[1];
    const gate = kind('gate')[0];
    const lamp = lamps[0];
    const lampOn = lit(lamp);
    if (on && !s.short && swA && swB && gate && lamp && settled) {
      const both = !!(swA.closed && swB.closed);
      if (!both && !gate.outputHigh && !lampOn) lib.low = true;
      if (both && gate.outputHigh && lampOn && Math.abs(amp(gate) - amp(lamp)) < 0.01) lib.high = true;
      if (lib.low && lib.high) a.passed = true;
    }
    reading = 'A ' + (swA?.closed ? 1 : 0) + ' · B ' + (swB?.closed ? 1 : 0) + ' · Lamp ' + (lampOn ? 'on' : 'off');
  } else if (id === 'lib-clock') {
    const clk = kind('clock')[0];
    const lamp = lamps[0];
    const lampOn = lit(lamp);
    if (on && !s.short && clk && lamp) {
      const high = !!clk.high;
      if (lib.prevHigh !== undefined && lib.prevHigh !== high && lampOn === high) lib.pulses++;
      lib.prevHigh = high;
      if (lib.pulses >= 3) a.passed = true;
    } else if (!on) {
      lib.prevHigh = undefined;
    }
    reading = 'Pulses: ' + Math.min(3, lib.pulses) + ' / 3';
  } else if (id === 'lib-latch') {
    const sw = switches[0];
    const btn = kind('button')[0];
    const latch = kind('latch')[0];
    const lamp = lamps[0];
    const lampOn = lit(lamp);
    if (on && !s.short && sw && btn && latch && lamp) {
      if (sw.closed && btn.closed && latch.bit && lampOn && Math.abs(amp(latch) - amp(lamp)) < 0.01) {
        lib.latched = true;
      }
      if (lib.latched && !sw.closed && !btn.closed && latch.bit && lampOn && Math.abs(amp(latch) - amp(lamp)) < 0.01) {
        a.passed = true;
      }
    }
    reading = !lib.latched ? 'Close Data and press Clock' : (a.passed ? 'Bit stored' : 'Open Data to verify hold');
  } else if (id === 'lib-display') {
    const disp = kind('display')[0];
    const val = on && !s.short && disp ? (s.displayValues?.[disp.id] ?? 0) : 0;
    if (on && !s.short && disp && settled) {
      if (val === 5) lib.seen5 = true;
      if (val === 10) lib.seen10 = true;
      if (lib.seen5 && lib.seen10) a.passed = true;
    }
    reading = 'Readout: ' + val + ' · 5 ' + (lib.seen5 ? 'yes' : 'no') + ' · 10 ' + (lib.seen10 ? 'yes' : 'no');
  }

  s.activityPassed = a.passed;
  s.designReading = reading;
  return reading;
}

const lbl = (x, y, text, cls = 'obs-lbl') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="middle">${text}</text>`;
const dot = (cx, cy) => `<circle class="obs-dot" cx="${cx}" cy="${cy}" r="2.1"/>`;
const batSketch = (x = 22, topY = 18, botY = 86) =>
  `<path d="M${x} ${topY}V45M${x - 9} 45h18M${x - 5} 53h10M${x} 53V${botY}"/>${lbl(x + 11, 40, '+')}${lbl(x + 11, 64, '−')}`;
const lampSketch = (cx, cy, r = 10) => {
  const k = Math.round(r * 0.6);
  return `<circle class="diagram-lamp" cx="${cx}" cy="${cy}" r="${r}"/><path d="m${cx - k} ${cy - k} ${k * 2} ${k * 2}m-${k * 2} 0 ${k * 2}-${k * 2}"/>`;
};

export const librarySketches = {
  'lib-button': [
    'Battery, momentary push button, and lamp in one loop',
    `${batSketch()}<path d="M22 18h58M22 86h142V63m0-20V18h-44M80 12h40M100 12V5m-6 0h12"/><circle cx="80" cy="18" r="1.8"/><circle cx="120" cy="18" r="1.8"/>${lampSketch(164, 53)}`
  ],
  'lib-spdt': [
    'Battery feeding common terminal C to select between Lamp A and Lamp B',
    `${batSketch(20, 18, 86)}<path d="M20 18h46l24-8M90 12h78v16M168 48v38H20M90 42h44v6M134 68v18"/>${dot(134, 86)}<circle cx="66" cy="18" r="1.8"/><circle cx="90" cy="12" r="1.8"/><circle cx="90" cy="42" r="1.8"/>${lampSketch(168, 38, 9)}${lampSketch(134, 58, 9)}${lbl(62, 12, 'C', 'obs-sm')}${lbl(98, 9, 'A', 'obs-sm')}${lbl(98, 52, 'B', 'obs-sm')}`
  ],
  'lib-rail': [
    'Battery connected to a four-terminal bus bar feeding three lamps',
    `${batSketch(20, 18, 88)}<path d="M20 18h36M56 14h26v12H56ZM82 18h86v25M168 63v25H20M104 18v25m0 20v25M136 18v25m0 20v25"/>${dot(104, 18)}${dot(136, 18)}${dot(104, 88)}${dot(136, 88)}${lampSketch(104, 53, 8)}${lampSketch(136, 53, 8)}${lampSketch(168, 53, 8)}`
  ],
  'lib-fuse': [
    'Glass fuse protecting two parallel lamps on a battery supply',
    `${batSketch(20, 18, 86)}<path d="M20 18h34M54 18c6-7 14 7 20 0M74 18h92v24M166 62v24H20M124 18v12m0 14v3m0 20v19"/>${dot(124, 18)}${dot(124, 86)}<rect x="48" y="10" width="32" height="16" rx="3"/>${lampSketch(124, 57, 9)}${lampSketch(166, 52, 9)}${lbl(64, 38, '0.35 A', 'obs-sm')}`
  ],
  'lib-diode': [
    'Battery, diode symbol, and lamp in series',
    `${batSketch()}<path d="M22 18h64M86 9v18l16-9ZM102 9v18M102 18h62v25m0 20v23H22"/>${lampSketch(164, 53)}${lbl(84, 37, 'A', 'obs-sm')}${lbl(104, 37, 'K', 'obs-sm')}`
  ],
  'lib-pot': [
    'Three-terminal potentiometer wiring a wiper in series with a lamp',
    `${batSketch()}<path d="M22 18h44l5-6 6 12 6-12 6 12 6-12 5 6h22M92 34V22m-4 5 4-5 4 5M92 34h72v9m0 20v23H22"/>${lampSketch(164, 53)}${lbl(64, 34, '1', 'obs-sm')}${lbl(92, 46, 'W', 'obs-sm')}${lbl(124, 34, '2', 'obs-sm')}`
  ],
  'lib-meter': [
    'Battery across two series lamps with a voltmeter probing across one lamp',
    `${batSketch(20, 18, 86)}<path d="M20 18h144v10M164 48v10M164 78v8H20M76 18h-2v26M116 44h48"/>${dot(76, 18)}${dot(164, 53)}<circle cx="96" cy="44" r="13"/>${lbl(96, 48, 'V')}${lampSketch(164, 38, 9)}${lampSketch(164, 68, 9)}`
  ],
  'lib-rgb': [
    'Battery driving R and G channels on the RGB stage light',
    `${batSketch(24, 18, 86)}<path d="M24 18h70M94 18v12m0-12h28v12M150 30V18M24 86h154V72"/><rect x="82" y="30" width="96" height="42" rx="4"/>${lbl(94, 46, 'R', 'obs-sm')}${lbl(122, 46, 'G', 'obs-sm')}${lbl(150, 46, 'B', 'obs-sm')}${lbl(170, 62, '−', 'obs-sm')}`
  ],
  'lib-bell': [
    'Battery, switch, and threshold bell symbol',
    `${batSketch()}<path d="M22 18h46l24-10M94 18h70v18m0 28v22H22"/><circle cx="68" cy="18" r="1.8"/><circle cx="94" cy="18" r="1.8"/><path d="M148 56c4-4 4-8 4-14a12 12 0 0 1 24 0c0 6 0 10 4 14Zm12 4q4 6 8 0"/>${lbl(172, 29, '3 V', 'obs-sm')}`
  ],
  'lib-gear': [
    'Battery driving a geared motor unit',
    `${batSketch()}<path d="M22 18h118v18m0 32v18H22"/><circle cx="140" cy="52" r="16"/><circle cx="164" cy="52" r="9"/>${lbl(140, 56, 'M')}`
  ],
  'lib-servo': [
    'Battery connected to servo controller + and −',
    `${batSketch()}<path d="M22 18h98v16M120 66v20H22"/><rect x="92" y="34" width="66" height="32" rx="4"/><path d="m125 34 18-13"/><circle cx="125" cy="34" r="2.2"/>${lbl(125, 54, 'SERVO', 'obs-sm')}`
  ],
  'lib-photo': [
    'Battery, photoresistor under light arrows, and LED',
    `${batSketch()}<path d="M22 18h36l4-6 5 12 5-12 5 12 5-6h68v18M150 64v22H22"/><circle cx="72" cy="18" r="16"/><path d="M140 36h20l-10 14Zm-10 14h20M52 2l8 8m4-10 8 8"/>`
  ],
  'lib-relay': [
    'Photoresistor sensing on L1 and L2 switching lamp through C and NO',
    `${batSketch(20, 18, 86)}<path d="M20 18h146v22M166 60v26H20"/><rect x="44" y="34" width="38" height="32" rx="3"/><path d="M82 42h38l22-10"/><circle cx="120" cy="42" r="1.8"/><circle cx="144" cy="42" r="1.8"/>${lampSketch(166, 50, 9)}${lbl(63, 54, 'LDR', 'obs-sm')}`
  ],
  'lib-transistor': [
    'NPN transistor with Base resistor, Collector lamp, and grounded Emitter',
    `${batSketch(20, 18, 86)}<path d="M20 18h140v8M160 46v8l-18 10M116 64v16m0-8H96l-4-5-4 10-4-5H60l-16-8M20 58h24M142 64v22H20"/><circle cx="126" cy="72" r="14"/>${lampSketch(160, 36, 9)}${lbl(148, 57, 'C', 'obs-sm')}${lbl(104, 83, 'B', 'obs-sm')}${lbl(150, 82, 'E', 'obs-sm')}`
  ],
  'lib-comparator': [
    'Comparator comparing a potentiometer dial against a 3 V split to drive a lamp',
    `${batSketch(14, 14, 92)}<path d="M14 14H72M14 92H172M50 14V32M50 68V92M72 14V18M72 42V60M72 84V92M72 60H104M140 52H172V54M172 72V92"/><path class="paper-cut" d="M66 50h12"/><path d="M63 50H94V44H104"/>${dot(50, 14)}${dot(50, 92)}${dot(72, 60)}${dot(72, 92)}<path d="M50 32v5l-4 2 8 4-8 4 8 4-8 4 8 4-4 2v7M63 50h-9m4-3-4 3 4 3M72 18v3l-4 2 8 3-8 4 8 4-8 3 4 2v3M72 60v3l-4 2 8 3-8 4 8 4-8 3 4 2v3M104 34l36 18-36 18Z"/>${lampSketch(172, 63, 9)}${lbl(112, 47, '+', 'obs-sm')}${lbl(112, 61, '−', 'obs-sm')}${lbl(34, 53, 'Dial', 'obs-sm')}${lbl(86, 68, '3V', 'obs-sm')}`
  ],
  'lib-coil': [
    'Coil relay switching common C between NC and NO lamps',
    `${batSketch(18, 16, 88)}<path d="M18 16h148M18 88h148M36 16v14l20-8M58 30h24v12M82 70v18"/><path d="M82 42c7 0 7 9 0 9c7 0 7 9 0 9c7 0 7 9 0 9"/><path d="M124 16v28l22-7M146 32h20v8M166 56v32M146 46h-10v14m0 18v10"/>${dot(136, 88)}${lampSketch(166, 48, 7)}${lampSketch(136, 69, 7)}${lbl(120, 38, 'C', 'obs-sm')}`
  ],
  'lib-gate': [
    'Two switches into an AND gate driving a lamp',
    `${batSketch(20, 18, 88)}<path d="M20 18h18M38 18v18l18-7M38 18v52l18-7M58 36h28M58 70h28M86 28h20a18 18 0 0 1 0 36H86ZM124 46h40v2M164 68v20H20"/>${lampSketch(164, 58, 9)}${lbl(103, 50, 'AND', 'obs-sm')}`
  ],
  'lib-clock': [
    'Pulse clock wired directly to a blinking lamp',
    `<rect x="28" y="34" width="38" height="36" rx="4"/><path d="M34 58h5v-10h6v10h6v-10h5M66 42h84v2M150 64v12H66V62"/>${lampSketch(150, 54, 10)}${lbl(47, 27, 'CLK', 'obs-sm')}`
  ],
  'lib-latch': [
    'Data switch and Clock button connected to a D-latch and output lamp',
    `${batSketch(18, 18, 88)}<path d="M18 18h18M36 18v14l18-6M36 18v48h16M54 32h32M54 66h32"/><rect x="86" y="24" width="38" height="50" rx="4"/><path d="M124 46h42v2M166 68v20H18"/>${lampSketch(166, 58, 9)}${lbl(105, 52, 'LATCH', 'obs-sm')}${lbl(76, 39, 'D', 'obs-sm')}${lbl(74, 74, 'CK', 'obs-sm')}`
  ],
  'lib-display': [
    'Four bit switches driving pins 1, 2, 4, and 8 of the 4-bit readout',
    `${batSketch(18, 16, 88)}<path d="M18 16h26M44 16v64M44 26h16l14-5M44 42h16l14-5M44 58h16l14-5M44 74h16l14-5M76 26h50M76 42h50M76 58h50M76 74h50M126 88H18"/><rect x="126" y="18" width="44" height="64" rx="4"/>${lbl(148, 54, '0..15')}${lbl(118, 24, '1', 'obs-sm')}${lbl(118, 40, '2', 'obs-sm')}${lbl(118, 56, '4', 'obs-sm')}${lbl(118, 72, '8', 'obs-sm')}`
  ]
};
