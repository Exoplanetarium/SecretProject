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
  { id: 'feed-drive', unit: 'Motors', name: 'Dome drive', finalId: 'dispatch' },
  { id: 'feed-relay', unit: 'Relays', name: 'Relay switches', finalId: 'relay-boss' },
  { id: 'feed-trans', unit: 'Transistors', name: 'Transistor stage', finalId: 'trans-boss' },
  { id: 'feed-cmp', unit: 'Comparators', name: 'Smart triggers', finalId: 'comp-boss' },
  { id: 'feed-logic', unit: 'Logic', name: 'Logic chips', finalId: 'logic-majority' }
];

const dev = (kind, x, z, settings = {}) => ({ kind, x, z, ...settings });
const fix = (parts, connections = []) => ({
  parts: parts.map((p, i) => ({ resistance: 30, ...p, id: 'p' + (i + 1) })),
  wires: connections.map(([a, b]) => ({ a: 'p' + a, b: 'p' + b }))
});
const leads = (...pairs) => pairs.map(pair => pair.split('-').map(pin => pin.replace('.', ':')));

function relayLevel(id, title, goal, hint, layout, parts, extra = {}) {
  return {
    id,
    unit: 'Relays',
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

export const relayActivities = [
  relayLevel(
    'relay-inverter',
    'Relay switch',
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
      ending: 'Turning on the coil pulls C away from NC, breaking the lamp loop. That flips the switch signal upside down.'
    }
  ),
  relayLevel(
    'relay-nand',
    'Two-switch relay',
    'Wire switches A and B with the coil relay so the lamp stays on unless both switches are closed. Test all four switch states.',
    'Put both switches in a row feeding one coil, or use two relays side by side. Route the lamp through C and NC.',
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
      ending: 'The lamp stayed lit until both switches were closed together.'
    }
  ),
  relayLevel(
    'relay-clock',
    'Relay blinker',
    'Wire the relay through its own NC pin so the lamp blinks on and off by itself.',
    'Connect battery + to C, NC to coil A, and coil B to battery −. Put the lamp across coil A and B. Add the 0.01 F capacitor across the coil to slow down the blink.',
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
      ending: 'Feeding a coil through its own NC pin makes it turn itself off and on like a steady blinker.'
    }
  ),
  relayLevel(
    'relay-latch',
    'Hold-on button',
    'Press Set once so the relay holds the lamp on after you let go. Then open Reset to clear it and close Reset again.',
    'Wire Reset into a bus bar. Connect Set from the bus bar to coil A, and wire C and NO across Set so the relay holds itself on.',
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
      ending: 'Routing NO back into the coil keeps power locked on after a quick tap until Reset breaks the loop.'
    }
  ),
  relayLevel(
    'relay-boss',
    'Motor starter',
    'Build a real start/stop motor starter with one coil relay: Stopped lamp lights while idle, tapping Start latches Machine on, and opening Stop halts Machine and relights Stopped.',
    'Wire Stopped through NC and Machine through NO, then latch NO back into the coil so tapping Start keeps it running. Put Stop in the coil return (pin B) or latch path so opening Stop halts the motor and relights Stopped.',
    fix(
      [
        dev('battery', -8.5, 1.5),
        dev('switch', -5, -2.5, { role: 'Stop', closed: true }),
        dev('button', -5, 3, { role: 'Start' }),
        dev('coil', 0, 0.5),
        dev('motor', 6, 3, { role: 'Machine' }),
        dev('lamp', 6, -2, { role: 'Stopped' }),
        dev('rail', 0, -4.5)
      ],
      leads('1.1-7.0', '5.1-7.1', '6.1-7.2')
    ),
    ['battery', 'switch', 'button', 'coil', 'motor', 'lamp', 'rail'],
    {
      challenge: true,
      target: 'Idle: Stopped · Tap Start: Latched · Stop: Halted',
      subsystem: 'Motor starter',
      ending: 'One coil relay handled start latching, emergency stop, and a status lamp all at once.'
    }
  )
];

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
    'mem-save',
    'Save one bit',
    'Store Data inside one memory cell: close Data, press Save so the lamp stays lit after you open Data, then press Save again to clear it.',
    'Connect Data switch to D, Save button to CK, Q to the lamp, and the − pin to the bus bar.',
    fix(
      [
        dev('battery', -8, 1.5),
        dev('switch', -5, 3, { role: 'Data' }),
        dev('button', -4.5, -1, { role: 'Save' }),
        dev('latch', 0.5, 1),
        dev('lamp', 6, 1),
        dev('rail', -1, -4)
      ],
      leads('1.1-6.0', '4.3-6.1', '5.1-6.2')
    ),
    ['battery', 'switch', 'button', 'latch', 'lamp', 'rail'],
    {
      subsystem: 'Bit store',
      ending: 'A memory cell takes a snapshot of D whenever CK gets a pulse, then holds that bit even if D changes.'
    }
  ),
  moduleLevel(
    'mem-toggle',
    'Toggle button',
    'Loop one memory cell through a NOT gate so pressing Tap toggles the lamp ON, OFF, and back ON.',
    'Connect Tap button to CK and Q to the lamp. Also run Q into the NOT gate, and loop NOT Q back into D. Join both − pins to the bus bar.',
    fix(
      [
        dev('battery', -7.5, 1),
        dev('button', -4.5, 1, { role: 'Tap' }),
        dev('latch', 0.5, 1.5),
        dev('gate', 0.5, -2.5, { gateMode: 'NOT', outputHigh: true }),
        dev('lamp', 6, 1.5),
        dev('rail', -1.5, -5.5)
      ],
      leads('1.1-6.0', '3.3-6.1', '4.3-6.2', '5.1-6.3')
    ),
    ['battery', 'button', 'latch', 'gate', 'lamp', 'rail'],
    {
      subsystem: 'Flip-flop',
      ending: 'Sending the opposite of Q back to D turns a push button into a click-on, click-off toggle switch.'
    }
  ),
  moduleLevel(
    'logic-shift-reg',
    'Light chaser',
    'Chain three memory cells so each press of Step moves your signal across Bit 1, Bit 2, and Bit 3.',
    'Connect Data to Stage 1 D, Stage 1 Q to Stage 2 D, and Stage 2 Q to Stage 3 D. Wire Step to every CK pin and each Q to its lamp, then close Data and press Step three times.',
    fix(
      [
        dev('battery', -9.5, 1.5),
        dev('switch', -6.5, 3.5, { role: 'Data' }),
        dev('button', -6.5, -1, { role: 'Step' }),
        dev('latch', -2.5, 2.5, { role: 'Stage 1' }),
        dev('latch', 2, 2.5, { role: 'Stage 2' }),
        dev('latch', 6.5, 2.5, { role: 'Stage 3' }),
        dev('lamp', -2.5, -2.5, { role: 'Bit 1' }),
        dev('lamp', 2, -2.5, { role: 'Bit 2' }),
        dev('lamp', 6.5, -2.5, { role: 'Bit 3' }),
        dev('rail', -1, -5.5),
        dev('rail', 4.5, -5.5)
      ],
      leads('1.1-10.0', '4.3-10.1', '7.1-10.1', '5.3-10.2', '8.1-10.2', '10.3-11.0', '6.3-11.1', '9.1-11.1')
    ),
    ['battery', 'switch', 'button', 'clock', 'latch', 'lamp', 'rail'],
    {
      subsystem: 'Light chaser',
      ending: 'Wiring Q into the next D walks your signal down the row one button press at a time.'
    }
  ),
  moduleLevel(
    'mem-ring',
    'Runway loop',
    'Loop Stage 3 back into Stage 1 through the OR chip: close Load, press Step once, open Load, then tap Step to chase the lit lamp around in a circle.',
    'Feed Load switch and Stage 3 Q into the OR chip wired to Stage 1 D. Chain Stage 1 Q → Stage 2 D → Stage 3 D, wire Step to all three CK pins, and wire Q outputs to lamps 1, 2, 3.',
    fix(
      [
        dev('battery', -9.5, 1),
        dev('switch', -7, 4, { role: 'Load' }),
        dev('button', -7, -1, { role: 'Step' }),
        dev('gate', -3.5, 4, { gateMode: 'OR', outputHigh: false }),
        dev('latch', 0.5, 3, { role: 'Stage 1' }),
        dev('latch', 4.5, 3, { role: 'Stage 2' }),
        dev('latch', 8.5, 3, { role: 'Stage 3' }),
        dev('lamp', 0.5, -2, { role: 'Bit 1' }),
        dev('lamp', 4.5, -2, { role: 'Bit 2' }),
        dev('lamp', 8.5, -2, { role: 'Bit 3' }),
        dev('rail', -2.5, -5),
        dev('rail', 4.5, -5)
      ],
      leads('1.1-11.0', '4.3-11.1', '5.3-11.2', '8.1-11.2', '11.3-12.0', '6.3-12.1', '9.1-12.1', '7.3-12.2', '10.1-12.2')
    ),
    ['battery', 'switch', 'button', 'gate', 'latch', 'lamp', 'rail'],
    {
      subsystem: 'Ring chaser',
      ending: 'Feeding the last stage back into the first turns a shift register into a never-ending light loop.'
    }
  ),
  moduleLevel(
    'mem-counter',
    'Button counter',
    'Build a 2-bit counter driven by the Step push button so each press counts 0, 1, 2, 3 on the 4-bit readout.',
    'Loop each cell Q through a NOT gate back to its own D pin. Feed Step into Bit 1 CK, feed Bit 1 NOT output into Bit 2 CK, and wire Q1 and Q2 to readout pins 1 and 2.',
    fix(
      [
        dev('battery', -9.5, 1),
        dev('button', -6.5, 1, { role: 'Step' }),
        dev('latch', -2, 2, { role: 'Bit 1' }),
        dev('gate', -2, -3, { gateMode: 'NOT', outputHigh: true }),
        dev('latch', 3.5, 2, { role: 'Bit 2' }),
        dev('gate', 3.5, -3, { gateMode: 'NOT', outputHigh: true }),
        dev('display', 8.5, 0),
        dev('rail', 0, 5.5)
      ],
      leads('1.1-8.0', '3.3-8.1', '4.3-8.1', '5.3-8.2', '6.3-8.2', '7.4-8.3')
    ),
    ['battery', 'button', 'gate', 'latch', 'display', 'rail'],
    {
      subsystem: 'Step counter',
      ending: 'Every tap counts up by one in binary across the two memory cells.'
    }
  ),
  moduleLevel(
    'mainframe-boot',
    'Mainframe boot',
    'Build a two-bit binary counter that steps the 4-bit readout through 0, 1, 2, and 3 to boot the Observatory Mainframe.',
    'Use the same 2-bit counter idea from Button counter, but drive it automatically from the pulse clock instead of a hand button.',
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
  } else if (id === 'relay-boss') {
    const stop = switches.find(p => p.role === 'Stop') || switches[0];
    const startBtn = kind('button').find(p => p.role === 'Start') || kind('button')[0];
    const coil = coils[0];
    const motor = kind('motor')[0];
    const lamp = lamps[0];
    const motorRunning = amp(motor) > 0.1;
    const lampOn = lit(lamp);
    if (!on) {
      obs.stage = 0;
      obs.sawStart = false;
      obs.latchHold = 0;
    } else if (!s.short && stop && startBtn && coil && motor && lamp) {
      if (startBtn.closed) obs.sawStart = true;
      if (obs.stage === 0 && stop.closed && !startBtn.closed && !coil.energized && !motorRunning && lampOn) {
        obs.stage = 1;
      } else if (obs.stage === 1 && obs.sawStart && coil.energized && motorRunning && !lampOn) {
        obs.stage = 2;
        obs.latchHold = 0;
      } else if (obs.stage === 2 && !startBtn.closed && (!coil.energized || !motorRunning || lampOn)) {
        obs.stage = 1;
        obs.sawStart = false;
        obs.latchHold = 0;
      } else if (obs.stage === 2 && stop.closed && !startBtn.closed && coil.energized && motorRunning && !lampOn) {
        obs.latchHold = (obs.latchHold || 0) + dt;
        if (obs.latchHold >= 0.2) obs.stage = 3;
      } else if (obs.stage === 3 && !stop.closed && !startBtn.closed && !coil.energized && !motorRunning && lampOn) {
        obs.stage = 4;
      } else if (obs.stage === 4 && stop.closed && !startBtn.closed && !coil.energized && !motorRunning && lampOn) {
        obs.stage = 5;
        a.passed = true;
      }
    }
    const labels = [
      'Close Stop & verify Stopped lamp',
      'Tap Start to latch Machine',
      'Release Start button',
      'Latched ON · open Stop to halt',
      'Halted · close Stop to reset',
      'Motor starter verified'
    ];
    reading = labels[obs.stage] || labels[0];
  } else if (id === 'mem-save') {
    const sw = switches[0];
    const btn = kind('button')[0];
    const latch = kind('latch')[0];
    const lamp = lamps[0];
    const lampOn = lit(lamp);
    if (on && !s.short && sw && btn && latch && lamp && settled) {
      const heldOn = !sw.closed && !btn.closed && latch.bit && lampOn && Math.abs(amp(latch) - amp(lamp)) < 0.01;
      if (obs.stage === 0 && sw.closed && latch.bit && lampOn && Math.abs(amp(latch) - amp(lamp)) < 0.01) obs.stage = 1;
      if (obs.stage <= 1 && heldOn) obs.stage = 2;
      if (obs.stage === 2 && !sw.closed && !latch.bit && !lampOn) {
        obs.stage = 3;
        a.passed = true;
      }
    }
    const labels = ['Close Data and press Save', 'Open Data so lamp stays lit', 'Keep Data open and press Save to clear', 'Bit save & clear verified'];
    reading = labels[obs.stage] || labels[0];
  } else if (id === 'mem-toggle') {
    const btn = kind('button')[0];
    const latch = kind('latch')[0];
    const lamp = lamps[0];
    const lampOn = lit(lamp);
    if (on && !s.short && btn && latch && kind('gate').length >= 1 && lamp && settled) {
      const bitOn = Boolean(latch.bit && lampOn && Math.abs(amp(latch) - amp(lamp)) < 0.01);
      const validOff = !latch.bit && !lampOn;
      if (obs.stage === 0 && !btn.closed && bitOn) obs.stage = 1;
      else if (obs.stage === 1 && !btn.closed && validOff) obs.stage = 2;
      else if (obs.stage === 2 && !btn.closed && bitOn) {
        obs.stage = 3;
        a.passed = true;
      }
    }
    reading = 'Lamp ' + (lit(lamp) ? 'ON' : 'OFF') + ' · Toggles ' + Math.min(3, obs.stage) + ' / 3';
  } else if (id === 'logic-shift-reg') {
    const latches = kind('latch');
    const l1 = lamps.find(p => p.role === 'Bit 1') || lamps[0];
    const l2 = lamps.find(p => p.role === 'Bit 2') || lamps[1];
    const l3 = lamps.find(p => p.role === 'Bit 3') || lamps[2];
    const b1 = lit(l1) ? 1 : 0;
    const b2 = lit(l2) ? 1 : 0;
    const b3 = lit(l3) ? 1 : 0;
    if (on && !s.short && latches.length >= 3 && l1 && l2 && l3 && settled) {
      if (obs.stage === 0 && b1 === 1 && b2 === 0 && b3 === 0) obs.stage = 1;
      else if (obs.stage === 1 && b2 === 1 && b3 === 0) obs.stage = 2;
      else if (obs.stage === 2 && b3 === 1) {
        obs.stage = 3;
        a.passed = true;
      }
    } else if (!on) {
      obs.stage = 0;
    }
    reading = `Bits: ${b1}${b2}${b3} · Shift stage ${Math.min(3, obs.stage)} / 3`;
  } else if (id === 'mem-ring') {
    const latches = kind('latch');
    const l1 = lamps.find(p => p.role === 'Bit 1') || lamps[0];
    const l2 = lamps.find(p => p.role === 'Bit 2') || lamps[1];
    const l3 = lamps.find(p => p.role === 'Bit 3') || lamps[2];
    const b1 = lit(l1) ? 1 : 0;
    const b2 = lit(l2) ? 1 : 0;
    const b3 = lit(l3) ? 1 : 0;
    const sw = switches[0];
    if (on && !s.short && latches.length >= 3 && l1 && l2 && l3 && kind('gate').length >= 1 && settled) {
      if (obs.stage === 0 && b1 === 1 && b2 === 0 && b3 === 0) obs.stage = 1;
      else if (obs.stage === 1 && !sw?.closed && b1 === 0 && b2 === 1 && b3 === 0) obs.stage = 2;
      else if (obs.stage === 2 && !sw?.closed && b1 === 0 && b2 === 0 && b3 === 1) obs.stage = 3;
      else if (obs.stage === 3 && !sw?.closed && b1 === 1 && b2 === 0 && b3 === 0) {
        obs.stage = 4;
        a.passed = true;
      }
    } else if (!on) {
      obs.stage = 0;
    }
    reading = `Loop: ${b1}${b2}${b3} · Orbit ${Math.min(4, obs.stage)} / 4 (100 → 010 → 001 → 100)`;
  } else if (id === 'mem-counter' || id === 'mainframe-boot') {
    const latches = kind('latch');
    const disp = kind('display')[0];
    const hasPulse = kind('clock').length > 0 || kind('button').length > 0;
    const val = disp && on ? (s.displayValues?.[disp.id] ?? 0) : 0;
    const minHold = id === 'mem-counter' ? 0.04 : 0.12;
    if (on && !s.short && latches.length >= 2 && disp && hasPulse) {
      if (obs.candidate !== val) {
        obs.candidate = val;
        obs.holdTime = 0;
      } else {
        obs.holdTime = (obs.holdTime || 0) + dt;
      }
      if (obs.holdTime >= minHold) {
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
  const coreCount = Math.max(1, progress.cores.length);
  const coreSpan = 492;
  const coreW = Math.min(68, Math.floor((coreSpan - (coreCount - 1) * 4) / coreCount));
  const coreStep = coreCount > 1 ? (coreSpan - coreW) / (coreCount - 1) : 0;
  const coreCols = progress.cores.map((c, i) => {
    const x = Math.round(34 + i * coreStep);
    const cx = Math.round(x + coreW / 2);
    const cls = c.online ? 'bp-node online' : 'bp-node';
    return `<g class="${cls}"><rect x="${x}" y="94" width="${coreW}" height="44" rx="4"/><line x1="${cx}" y1="74" x2="${cx}" y2="94"/><line x1="${cx}" y1="138" x2="${cx}" y2="158"/><circle cx="${cx}" cy="108" r="4.5"/><text x="${cx}" y="128" text-anchor="middle">${i + 1}. ${c.subsystem.split(' ')[0]}</text></g>`;
  }).join('');

  const feedCount = Math.max(1, progress.feeds.length);
  const feedSpan = 492;
  const feedW = Math.min(84, Math.floor((feedSpan - (feedCount - 1) * 6) / feedCount));
  const feedStep = feedCount > 1 ? (feedSpan - feedW) / (feedCount - 1) : 0;
  const feedCols = progress.feeds.map((f, i) => {
    const x = Math.round(34 + i * feedStep);
    const cx = Math.round(x + feedW / 2);
    const cls = f.online ? 'bp-node online' : 'bp-node';
    return `<g class="${cls}"><rect x="${x}" y="168" width="${feedW}" height="42" rx="4"/><line x1="${cx}" y1="158" x2="${cx}" y2="168"/><circle cx="${cx}" cy="181" r="4"/><text x="${cx}" y="199" text-anchor="middle">${f.name.split(' ')[0]}</text></g>`;
  }).join('');

  const domeClass = progress.coreBooted ? 'bp-dome online' : 'bp-dome';
  return `<svg class="mainframe-svg" viewBox="0 0 560 226" role="img" aria-label="Observatory Mainframe blueprint: ${progress.onlineCount} of ${progress.totalCount} systems online">
    <g class="${domeClass}">
      <path d="M180 74 A100 58 0 0 1 380 74 Z"/>
      <circle cx="280" cy="46" r="14"/>
      <path d="M280 26v40M260 46h40M267 33l26 26M293 33l-26 26"/>
    </g>
    <line class="bp-bus" x1="34" y1="74" x2="526" y2="74"/>
    <line class="bp-bus" x1="34" y1="158" x2="526" y2="158"/>
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
const obsSwitch = (x, y, w = 18) =>
  `<path d="M${x} ${y}l${w - 3} -7"/><circle cx="${x}" cy="${y}" r="1.6"/><circle cx="${x + w}" cy="${y}" r="1.6"/>`;
const obsPushBtn = (x, y, w = 18) =>
  `<circle cx="${x}" cy="${y}" r="1.6"/><circle cx="${x + w}" cy="${y}" r="1.6"/><path d="M${x + 2} ${y - 5}h${w - 4}M${x + w / 2} ${y - 5}v-4m-4 0h8"/>`;
const obsNotGate = (x, y) =>
  `<path d="M${x} ${y}l16 9-16 9Z"/><circle cx="${x + 18.2}" cy="${y + 9}" r="2.2"/>`;
function obsGate(x, y, mode) {
  if (mode === 'AND') {
    return `<path d="M${x} ${y}h15a11 11 0 0 1 0 22H${x}Z"/>${obsLbl(x + 12, y + 13.5, 'AND', 'obs-sm')}`;
  }
  if (mode === 'NAND') {
    return `<path d="M${x} ${y}h13a11 11 0 0 1 0 22H${x}Z"/><circle cx="${x + 26.2}" cy="${y + 11}" r="2.2"/>${obsLbl(x + 11.5, y + 13.5, 'NAND', 'obs-sm')}`;
  }
  if (mode === 'OR') {
    return `<path d="M${x} ${y}q6 11 0 22h12q10 0 14-11-4-11-14-11Z"/>${obsLbl(x + 13.5, y + 13.5, 'OR', 'obs-sm')}`;
  }
  if (mode === 'NOR') {
    return `<path d="M${x} ${y}q6 11 0 22h10q10 0 14-11-4-11-14-11Z"/><circle cx="${x + 26.2}" cy="${y + 11}" r="2.2"/>${obsLbl(x + 12, y + 13.5, 'NOR', 'obs-sm')}`;
  }
  return `<path d="M${x - 3} ${y}q6 11 0 22M${x} ${y}q6 11 0 22h12q10 0 14-11-4-11-14-11Z"/>${obsLbl(x + 13.5, y + 13.5, 'XOR', 'obs-sm')}`;
}

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
  'relay-boss': [
    'Goal: Idle lights Stopped lamp, tapping Start latches Machine motor on, opening Stop halts it and relights Stopped',
    `<rect x="8" y="14" width="54" height="66" rx="5"/><rect x="73" y="14" width="54" height="66" rx="5"/><rect x="138" y="14" width="54" height="66" rx="5"/><path d="M62 47h11m-3-3 3 3-3 3M127 47h11m-3-3 3 3-3 3"/>${obsLamp(35, 45, 7)}<circle cx="100" cy="45" r="7"/><path d="M96.5 48.5v-7l3.5 4.5 3.5-4.5v7"/>${obsLamp(165, 45, 7)}${obsLbl(35, 27, 'Idle', 'obs-sm')}${obsLbl(35, 69, 'Stopped ON', 'obs-sm')}${obsLbl(100, 27, 'Tap Start', 'obs-sm')}${obsLbl(100, 69, 'Stays ON', 'obs-sm')}${obsLbl(165, 27, 'Open Stop', 'obs-sm')}${obsLbl(165, 69, 'Motor OFF', 'obs-sm')}${obsLbl(100, 95, '1 coil relay · latches until Stop opens', 'obs-sm')}`
  ],
  'mem-save': [
    'Data switch and Save button feeding a memory cell and output lamp',
    `${obsBattery(14, 16, 92)}<path d="M14 92H172M14 16H34V66M34 32H38M56 32H88M34 66H38M56 66H88M124 44H172V48M172 64V92"/>${obsDot(34, 32)}${obsSwitch(38, 32, 18)}${obsPushBtn(38, 66, 18)}<rect x="88" y="22" width="36" height="54" rx="4"/>${obsLamp(172, 56, 8)}${obsLbl(47, 21, 'Data', 'obs-sm')}${obsLbl(47, 79, 'Save', 'obs-sm')}${obsLbl(78, 29, 'D', 'obs-sm')}${obsLbl(77, 63, 'CK', 'obs-sm')}${obsLbl(134, 41, 'Q', 'obs-sm')}${obsLbl(106, 52, 'MEM', 'obs-sm')}`
  ],
  'mem-toggle': [
    'Memory cell feeding Q through a NOT gate back to D with a Tap button on CK',
    `${obsBattery(14, 16, 92)}<path d="M14 92H174M14 16H36M36 16V68H40M58 68H80M116 56H174V58M174 74V92M128 56V22H122M101.6 22H68V52H80"/>${obsDot(128, 56)}${obsPushBtn(40, 68, 18)}<rect x="80" y="42" width="36" height="36" rx="4"/><path d="M122 13l-16 9 16 9Z"/><circle cx="103.8" cy="22" r="2.2"/>${obsLamp(174, 66, 8)}${obsLbl(49, 81, 'Tap', 'obs-sm')}${obsLbl(98, 63, 'MEM', 'obs-sm')}${obsLbl(112, 39, 'NOT', 'obs-sm')}${obsLbl(72, 49, 'D', 'obs-sm')}${obsLbl(71, 76, 'CK', 'obs-sm')}`
  ],
  'logic-shift-reg': [
    'Three memory cells chained Q to D sharing one Step pulse line',
    `${obsBattery(12, 16, 92)}<path d="M12 92H184M12 16H34M52 16H160M76 16V28M118 16V28M160 16V28M30 16V40H34M52 40H64M88 40H106M130 40H148M172 40H184V64M95 40V64M95 76V92M137 40V64M137 76V92M184 76V92"/>${obsDot(30, 16)}${obsDot(76, 16)}${obsDot(118, 16)}${obsDot(95, 40)}${obsDot(137, 40)}${obsDot(95, 92)}${obsDot(137, 92)}${obsPushBtn(34, 16, 18)}${obsSwitch(34, 40, 18)}<rect x="64" y="28" width="24" height="28" rx="3"/><rect x="106" y="28" width="24" height="28" rx="3"/><rect x="148" y="28" width="24" height="28" rx="3"/>${obsLamp(95, 70, 6)}${obsLamp(137, 70, 6)}${obsLamp(184, 70, 6)}${obsLbl(43, 7, 'Step', 'obs-sm')}${obsLbl(43, 53, 'Data', 'obs-sm')}${obsLbl(76, 45, 'S1', 'obs-sm')}${obsLbl(118, 45, 'S2', 'obs-sm')}${obsLbl(160, 45, 'S3', 'obs-sm')}${obsLbl(84, 73, '1', 'obs-sm')}${obsLbl(126, 73, '2', 'obs-sm')}${obsLbl(173, 73, '3', 'obs-sm')}`
  ],
  'mem-ring': [
    'Three chained memory cells with Stage 3 looped back through OR into Stage 1',
    `${obsBattery(12, 16, 94)}<path d="M12 94H188M12 16H32M50 16H164M90 16V34M126 16V34M164 16V34M26 16V42H30M46 42H57M81 45H82M102 45H118M138 45H156M176 45H186V68M109 45V68M109 80V94M147 45V68M147 80V94M186 80V94"/><path class="paper-cut" d="M86 26h8M122 26h8M160 26h8"/><path d="M186 45V26H52V50H57"/>${obsDot(26, 16)}${obsDot(90, 16)}${obsDot(126, 16)}${obsDot(109, 45)}${obsDot(147, 45)}${obsDot(109, 94)}${obsDot(147, 94)}${obsDot(186, 45)}${obsPushBtn(32, 16, 18)}${obsSwitch(30, 42, 16)}${obsGate(54, 34, 'OR')}<rect x="82" y="34" width="20" height="24" rx="3"/><rect x="118" y="34" width="20" height="24" rx="3"/><rect x="156" y="34" width="20" height="24" rx="3"/>${obsLamp(109, 74, 6)}${obsLamp(147, 74, 6)}${obsLamp(186, 74, 6)}${obsLbl(41, 7, 'Step', 'obs-sm')}${obsLbl(38, 55, 'Load', 'obs-sm')}${obsLbl(92, 49, 'S1', 'obs-sm')}${obsLbl(128, 49, 'S2', 'obs-sm')}${obsLbl(166, 49, 'S3', 'obs-sm')}`
  ],
  'mem-counter': [
    'Step button driving two toggling memory cells into a four-bit readout',
    `${obsBattery(12, 16, 92)}<path d="M12 92H178V78M12 16H20M36 16V66H52"/><rect x="52" y="44" width="26" height="32" rx="3"/><path d="M78 56h4M82 56V22h4M86 15l11 7-11 7Z"/><circle cx="99.5" cy="22" r="2.2"/><path d="M102 22V8H46V52h6M102 22V66h8M82 56V84H154V50H162"/><rect x="110" y="44" width="26" height="32" rx="3"/><path d="M136 56h6v6h20M142 56V22h-6M136 15l-11 7 11 7Z"/><circle cx="122.5" cy="22" r="2.2"/><path d="M120 22H106V52h4"/><rect x="162" y="38" width="32" height="40" rx="4"/>${obsPushBtn(20, 16, 16)}${obsDot(82, 56)}${obsDot(102, 22)}${obsDot(142, 56)}${obsLbl(28, 7, 'Step', 'obs-sm')}${obsLbl(65, 63, 'B1')}${obsLbl(123, 63, 'B2')}${obsLbl(93, 38, 'NOT', 'obs-sm')}${obsLbl(129, 38, 'NOT', 'obs-sm')}${obsLbl(157, 46, '1', 'obs-sm')}${obsLbl(157, 68, '2', 'obs-sm')}${obsLbl(178, 62, '0..3')}`
  ],
  'mainframe-boot': [
    'Goal: pulse clock automatically steps the readout through 0, 1, 2, and 3',
    `<rect x="10" y="28" width="34" height="32" rx="4"/><path d="M15 49h4v-10h5v10h5v-10h4M44 44h16m-4-4 4 4-4 4"/><rect x="64" y="30" width="24" height="28" rx="4"/><rect x="98" y="30" width="24" height="28" rx="4"/><rect x="132" y="30" width="24" height="28" rx="4"/><rect x="166" y="30" width="24" height="28" rx="4"/><path d="M88 44h10m-3-3 3 3-3 3M122 44h10m-3-3 3 3-3 3M156 44h10m-3-3 3 3-3 3M178 58v16H76V58m-3 4 3-4 3 4"/>${obsLbl(27, 22, 'CLK', 'obs-sm')}${obsLbl(76, 48, '0')}${obsLbl(110, 48, '1')}${obsLbl(144, 48, '2')}${obsLbl(178, 48, '3')}${obsLbl(127, 90, 'Auto 2-bit count', 'obs-sm')}`
  ]
};
