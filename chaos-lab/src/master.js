export const MASTER_DEVICE_NAMES = {
  cannon: 'Ball cannon'
};

export const MASTER_PINS = {
  cannon: ['+', '−']
};

const dev = (kind, x, z, settings = {}) => ({ kind, x, z, ...settings });
const fix = (parts, connections = []) => ({
  parts: parts.map((p, i) => ({ resistance: 30, ...p, id: 'p' + (i + 1) })),
  wires: connections.map(([a, b]) => ({ a: 'p' + a, b: 'p' + b }))
});
const leads = (...pairs) => pairs.map(pair => pair.split('-').map(pin => pin.replace('.', ':')));

function masterChallenge(id, code, difficulty, title, goal, hint, layout, parts, trayParts, extra = {}) {
  return {
    id,
    unit: 'Master',
    master: true,
    activity: true,
    code,
    difficulty,
    title,
    goal,
    hint,
    parts,
    trayParts,
    layout,
    diagram: id,
    check: s => s.activityPassed === true,
    ending: extra.ending || goal,
    ...extra
  };
}

export const masterActivities = [
  masterChallenge(
    'mc-basketball',
    '1',
    'Medium',
    'Basketball',
    'Score 10 baskets in a row hands-off. Tune cannon voltage for a swish and run the return belt to keep the 3-ball magazine loaded.',
    'Pair a resistor with the capacitor (an RC combo) or trim with the potentiometer so voltage lands in the sweet spot each cycle. Keep the return belt spinning the right way.',
    fix([
      dev('battery', -6, 3.5, { fixed: true }),
      dev('cannon', -5.5, -6, { fixed: true, locked: true }),
      dev('motor', 5.5, 1.5, { fixed: true, role: 'Belt motor' })
    ]),
    ['battery', 'cannon', 'motor', 'resistor', 'capacitor', 'pot', 'meter', 'rail'],
    ['resistor', 'capacitor', 'pot', 'meter', 'rail'],
    {
      target: '10 baskets in a row · hands-off',
      ending: 'Balanced launch voltage and continuous belt return turned three balls into an endless loop.'
    }
  ),
  masterChallenge(
    'mc-basketball-raw',
    '1.1',
    'Medium-Hard',
    'Free Throw',
    'Score 10 baskets in a row hands-off with no potentiometer.',
    'Without a dial, shape the launch voltage using an RC combo charge rate or split the 6 V supply across resistors.',
    fix([
      dev('battery', -6, 3.5, { fixed: true }),
      dev('cannon', -5.5, -6, { fixed: true, locked: true }),
      dev('motor', 5.5, 1.5, { fixed: true, role: 'Belt motor' })
    ]),
    ['battery', 'cannon', 'motor', 'resistor', 'capacitor', 'meter', 'rail'],
    ['resistor', 'capacitor', 'meter', 'rail'],
    {
      parentId: 'mc-basketball',
      target: '10 baskets in a row · no potentiometer',
      ending: 'RC timing and resistor math hit the sweet spot cleanly without a dial.'
    }
  ),
  masterChallenge(
    'mc-bulbtown',
    '2',
    'Hard',
    'Bulbtown',
    'Drive the fixed Target bulb (20 Ω) at exactly 0.125 A using only extra lightbulbs.',
    'Each bulb is 20 Ω. Series: R_total = R1 + R2. Parallel: 1 / R_total = 1/R1 + 1/R2.',
    fix([
      dev('battery', -6, 1, { fixed: true }),
      dev('lamp', 5, 1, { fixed: true, role: 'Target bulb' })
    ]),
    ['battery', 'lamp'],
    ['lamp'],
    {
      target: 'Target bulb: 0.125 A',
      ending: 'Nesting series and parallel 20 Ω bulbs hit 48 Ω total (0.125 A) from a single resistor value.'
    }
  ),
  masterChallenge(
    'mc-flip-proof',
    '3',
    'Medium-Hard',
    'Flip-Proof',
    'Keep the fixed DC motor spinning continuously clockwise through 4 automatic battery polarity flips.',
    'A single one-way diode stalls on every other flip. Arrange four one-way paths in a bridge so both polarities enter the motor side.',
    fix([
      dev('battery', -6, 1, { fixed: true, role: 'Auto-flip 6 V', rogue: true }),
      dev('motor', 6, 1, { fixed: true, role: 'Target motor' })
    ]),
    ['battery', 'motor', 'diode', 'rail'],
    ['diode', 'rail'],
    {
      target: 'Clockwise through 4 auto-flips',
      ending: 'Four diodes in a full-wave bridge keep current flowing one way through the motor no matter which way the supply points.'
    }
  ),
  masterChallenge(
    'mc-full-adder',
    '4',
    'Medium-Hard',
    'Full adder',
    'Add Bit A, Bit B, and Carry in with logic gates so Sum and Carry out are right for all 8 input states.',
    "Didn't you make a half adder somewhere?",
    fix(
      [
        dev('battery', -9, 2, { fixed: true }),
        dev('switch', -6, 4, { fixed: true, role: 'Bit A' }),
        dev('switch', -6, 1, { fixed: true, role: 'Bit B' }),
        dev('switch', -6, -2, { fixed: true, role: 'Carry in' }),
        dev('lamp', 7, 3, { fixed: true, role: 'Sum' }),
        dev('lamp', 7, -2, { fixed: true, role: 'Carry out' }),
        dev('rail', -1, -5)
      ],
      leads('1.1-7.0')
    ),
    ['battery', 'switch', 'lamp', 'gate', 'rail'],
    ['gate', 'rail'],
    {
      target: 'All 8 input states (000 to 111)',
      ending: 'Two half adders and an OR gate combine three binary bits into Sum and Carry out.'
    }
  ),
  masterChallenge(
    'mc-sacrifice',
    '5',
    'Medium-Hard',
    'Sacrifice',
    'Start with Target lamp OFF. Press and release the Push button once so Target lamp stays permanently ON.',
    'An intact fuse holds its two terminals at almost the same voltage. Blowing it turns it into a permanent open switch.',
    fix([
      dev('battery', -6, 1, { fixed: true }),
      dev('lamp', 5, 1, { fixed: true, role: 'Target lamp' }),
      dev('button', -1, -2, { fixed: true })
    ]),
    ['battery', 'lamp', 'button', 'fuse', 'resistor'],
    ['fuse', 'resistor'],
    {
      target: 'Start OFF · press once · stay ON',
      ending: 'Sending a deliberate surge through the sacrificial fuse blew it open and latched the lamp permanently ON.'
    }
  ),
  masterChallenge(
    'mc-double-sacrifice',
    '5.1',
    'Hard',
    'Double Sacrifice',
    'Start with Lamp 1 ON and Lamp 2 OFF. Press and release the Push button once to flip Lamp 1 permanently OFF and Lamp 2 permanently ON.',
    'A fuse in series breaks a path when blown. A fuse across a lamp hides it until blown. One short can claim two victims.',
    fix([
      dev('battery', -7, 1, { fixed: true }),
      dev('lamp', 5, 3, { fixed: true, role: 'Lamp 1' }),
      dev('lamp', 5, -2, { fixed: true, role: 'Lamp 2' }),
      dev('button', -1, 1, { fixed: true })
    ]),
    ['battery', 'lamp', 'button', 'fuse', 'resistor'],
    ['fuse', 'resistor'],
    {
      parentId: 'mc-sacrifice',
      target: 'Lamp 1 ON → OFF and Lamp 2 OFF → ON',
      ending: 'One deliberate short blew both the series fuse and the bypass fuse at once.'
    }
  )
];

const CHARGE_WINDOW = 2.4;
const DISCHARGE_WINDOW = 0.2;

function connectedNets(parts, wires) {
  const parent = new Map();
  const root = x => {
    while (parent.has(x)) x = parent.get(x);
    return x;
  };
  const join = (a, b) => {
    const ra = root(a);
    const rb = root(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const w of wires) join(w.a, w.b);
  for (const p of parts) {
    if (p.kind === 'rail') {
      join(p.id + ':0', p.id + ':1');
      join(p.id + ':1', p.id + ':2');
      join(p.id + ':2', p.id + ':3');
    }
  }
  return (a, b) => root(a) === root(b);
}

function basketballKey(parts, wires) {
  return JSON.stringify([
    parts.map(p => [p.id, p.kind, p.resistance || 30, p.wiper ?? 0.5, p.capacitance || 0.1, p.closed ? 1 : 0, p.gateMode || 'NAND']),
    wires.map(w => [w.a, w.b])
  ]);
}

function circuitKey(parts, wires, includeClosed = false) {
  return JSON.stringify([
    parts.map(p => [p.id, p.kind, p.resistance || 30, p.wiper ?? 0.5, p.fuseRating || 0.35, p.gateMode || 'NAND', includeClosed ? !!p.closed : 0]),
    wires.map(w => [w.a, w.b])
  ]);
}

export function measureMaster(lesson, parts, wires, s, a, on, dt = 0) {
  const id = lesson.id;
  const kind = k => parts.filter(p => p.kind === k);
  const amp = p => (on && p ? Math.abs(s.currents[p.id] || 0) : 0);
  const lit = p => amp(p) > 0.025;
  const voltage = p => (on && p ? (s.voltages[p.id + ':0'] || 0) - (s.voltages[p.id + ':1'] || 0) : 0);
  let reading = '';

  if (id === 'mc-basketball' || id === 'mc-basketball-raw') {
    const key = basketballKey(parts, wires);
    if (!a.mc || a.mc.key !== key) {
      a.mc = {
        key,
        ammo: 3,
        streak: 0,
        totalMade: 0,
        chargeTimer: 0,
        dischargeTimer: 0,
        balls: [],
        beltOffset: 0,
        lastOutcome: '',
        lastShotV: 0,
        lastArc: null,
        motorVoltage: 0,
        events: []
      };
      a.passed = false;
    }
    const mc = a.mc;
    const emit = ev => { mc.events.push(ev); if (mc.events.length > 8) mc.events.shift(); };
    const cannon = kind('cannon')[0];
    const motor = kind('motor')[0];
    const vCannon = cannon ? voltage(cannon) : 0;
    const absCannon = Math.abs(vCannon);
    const vMotor = motor ? voltage(motor) : 0;
    mc.motorVoltage = vMotor;

    if (on && !s.short) {
      const beltSpeed = motor ? (vMotor / 6) * 0.65 : 0;
      mc.beltOffset = (mc.beltOffset || 0) + beltSpeed * dt;

      const remainingBalls = [];
      for (const ball of mc.balls) {
        if (ball.phase === 'flight') {
          ball.t += dt / 0.95;
          if (ball.t >= 1) {
            emit(ball.outcome === 'short' ? 'airball' : ball.outcome);
            if (ball.outcome === 'swish') {
              ball.phase = 'belt';
              ball.u = 0;
              mc.streak++;
              mc.totalMade++;
              if (mc.streak >= 10) a.passed = true;
              remainingBalls.push(ball);
            } else {
              mc.streak = 0;
            }
          } else {
            remainingBalls.push(ball);
          }
        } else if (ball.phase === 'belt') {
          ball.u += beltSpeed * dt;
          if (ball.u >= 1) {
            mc.ammo = Math.min(3, mc.ammo + 1);
          } else if (ball.u < -0.05) {
            mc.streak = 0;
            if (ball.u >= -0.25) remainingBalls.push(ball);
          } else {
            remainingBalls.push(ball);
          }
        }
      }
      mc.balls = remainingBalls;

      if (mc.dischargeTimer > 0) {
        mc.dischargeTimer = Math.max(0, mc.dischargeTimer - dt);
        if (cannon) cannon.discharging = mc.dischargeTimer > 0;
      } else if (cannon && absCannon >= 1 && mc.ammo > 0) {
        mc.chargeTimer += dt;
        if (mc.chargeTimer >= CHARGE_WINDOW) {
          mc.ammo--;
          mc.chargeTimer = 0;
          mc.dischargeTimer = DISCHARGE_WINDOW;
          cannon.discharging = true;
          const shotV = absCannon;
          const outcome = shotV < 3.8 ? 'short' : shotV > 4.7 ? 'brick' : 'swish';
          mc.lastShotV = shotV;
          mc.lastOutcome = outcome;
          mc.lastArc = { shotV, outcome };
          mc.balls.push({ phase: 'flight', t: 0, shotV, outcome });
          emit('cannonFire');

          const joined = connectedNets(parts, wires);
          for (const cap of kind('capacitor')) {
            const direct =
              (joined(cap.id + ':0', cannon.id + ':0') && joined(cap.id + ':1', cannon.id + ':1')) ||
              (joined(cap.id + ':0', cannon.id + ':1') && joined(cap.id + ':1', cannon.id + ':0'));
            if (direct) cap.charge = 0;
          }
          if (outcome !== 'swish') mc.streak = 0;
        }
      }
    } else {
      if (cannon) cannon.discharging = false;
      mc.ammo = 3;
      mc.streak = 0;
      mc.chargeTimer = 0;
      mc.dischargeTimer = 0;
      mc.balls = [];
    }

    const beltLabel = !on || Math.abs(vMotor) < 0.2 ? 'Belt OFF' : vMotor > 0 ? 'Belt ← OK' : 'Belt → REV';
    reading = 'Baskets ' + mc.streak + ' / 10 · Ammo ' + mc.ammo + ' / 3 · Cannon ' + absCannon.toFixed(2) + ' V · ' + beltLabel + (mc.lastOutcome ? ' · ' + mc.lastOutcome : '');
  } else if (id === 'mc-bulbtown') {
    const target = kind('lamp').find(p => p.role === 'Target bulb') || kind('lamp')[0];
    const iTarget = on && !s.short && target ? amp(target) : 0;
    if (on && !s.short && target && Math.abs(iTarget - 0.125) <= 0.0005) {
      a.passed = true;
    }
    reading = 'Target bulb: ' + iTarget.toFixed(3) + ' A · Goal: 0.125 A';
  } else if (id === 'mc-flip-proof') {
    const key = circuitKey(parts, wires, true);
    if (!a.mc || a.mc.key !== key) {
      a.mc = { key, flips: 0, flipTimer: 0, windowGood: true, polarities: new Set(), events: [] };
      a.passed = false;
    }
    const mc = a.mc;
    const bat = kind('battery')[0];
    const motor = kind('motor')[0];
    const rpm = on && !s.short && motor ? Math.round((s.currents[motor.id] || 0) * 900) : 0;

    if (on && !s.short && bat && motor) {
      mc.polarities.add(bat.reversed ? 'R' : 'F');
      if (rpm < 45) {
        mc.windowGood = false;
        mc.flips = 0;
        mc.polarities = new Set([bat.reversed ? 'R' : 'F']);
      } else if (rpm < 60) {
        mc.windowGood = false;
      }
      mc.flipTimer += dt;
      if (mc.flipTimer >= 2.0) {
        mc.flipTimer -= 2.0;
        if (mc.windowGood && rpm >= 60) {
          mc.flips++;
          if (mc.flips >= 4 && mc.polarities.size === 2) a.passed = true;
        } else {
          mc.flips = 0;
        }
        mc.windowGood = true;
        bat.reversed = !bat.reversed;
        mc.events.push('flip');
        if (mc.events.length > 8) mc.events.shift();
      }
    } else {
      mc.flipTimer = 0;
      mc.flips = 0;
      mc.windowGood = true;
      mc.polarities = new Set();
    }
    reading = 'Motor ' + rpm + ' rpm · ' + (bat?.reversed ? 'Reversed' : 'Forward') + ' · Flips ' + Math.min(4, mc.flips || 0) + ' / 4';
  } else if (id === 'mc-full-adder') {
    const key = circuitKey(parts, wires, false);
    if (!a.mc || a.mc.key !== key) {
      a.mc = { key, cases: new Set() };
      a.passed = false;
    }
    const mc = a.mc;
    const switches = kind('switch');
    const lamps = kind('lamp');
    const swA = switches.find(p => p.role === 'Bit A') || switches[0];
    const swB = switches.find(p => p.role === 'Bit B') || switches[1];
    const swC = switches.find(p => p.role === 'Carry in') || switches[2];
    const sumLamp = lamps.find(p => p.role === 'Sum') || lamps[0];
    const carryLamp = lamps.find(p => p.role === 'Carry out') || lamps[1];
    const aBit = swA?.closed ? 1 : 0;
    const bBit = swB?.closed ? 1 : 0;
    const cBit = swC?.closed ? 1 : 0;
    const sumOn = lit(sumLamp);
    const carryOn = lit(carryLamp);
    const settled = !s.hasPendingTransition;

    if (on && !s.short && swA && swB && swC && sumLamp && carryLamp && kind('gate').length >= 1 && settled) {
      const total = aBit + bBit + cBit;
      const expSum = (total & 1) === 1;
      const expCarry = total >= 2;
      if (sumOn === expSum && carryOn === expCarry) {
        mc.cases.add('' + aBit + bBit + cBit);
        if (mc.cases.size === 8) a.passed = true;
      }
    }
    reading = 'A ' + aBit + ' + B ' + bBit + ' + Cin ' + cBit + ' = ' + (carryOn ? 1 : 0) + (sumOn ? 1 : 0) + ' · Cases ' + mc.cases.size + ' / 8';
  } else if (id === 'mc-sacrifice') {
    const key = circuitKey(parts, wires, false);
    if (!a.mc || a.mc.key !== key) {
      a.mc = { key, sawOff: false, sawPress: false };
      a.passed = false;
    }
    const mc = a.mc;
    const target = kind('lamp').find(p => p.role === 'Target lamp') || kind('lamp')[0];
    const btn = kind('button')[0];
    const fuses = kind('fuse');

    if (on && !s.short && target && btn && fuses.length >= 1) {
      if (!btn.closed && !lit(target) && fuses.some(f => !f.blown)) mc.sawOff = true;
      if (mc.sawOff && btn.closed) mc.sawPress = true;
      if (mc.sawOff && mc.sawPress && !btn.closed && lit(target) && fuses.some(f => f.blown)) a.passed = true;
    }
    reading = a.passed
      ? 'Target lamp latched ON'
      : mc.sawPress
        ? 'Release button'
        : mc.sawOff
          ? 'Press and release button'
          : 'Start with Target lamp OFF';
  } else if (id === 'mc-double-sacrifice') {
    const key = circuitKey(parts, wires, false);
    if (!a.mc || a.mc.key !== key) {
      a.mc = { key, sawStart: false, sawPress: false };
      a.passed = false;
    }
    const mc = a.mc;
    const lamps = kind('lamp');
    const l1 = lamps.find(p => p.role === 'Lamp 1') || lamps[0];
    const l2 = lamps.find(p => p.role === 'Lamp 2') || lamps[1];
    const btn = kind('button')[0];
    const fuses = kind('fuse');
    const intact = fuses.filter(f => !f.blown).length;
    const blown = fuses.filter(f => f.blown).length;

    if (on && !s.short && l1 && l2 && btn && fuses.length >= 2) {
      if (!btn.closed && lit(l1) && !lit(l2) && intact >= 2) mc.sawStart = true;
      if (mc.sawStart && btn.closed) mc.sawPress = true;
      if (mc.sawStart && mc.sawPress && !btn.closed && !lit(l1) && lit(l2) && blown >= 2) a.passed = true;
    }
    reading = 'Lamp 1 ' + (lit(l1) ? 'ON' : 'OFF') + ' · Lamp 2 ' + (lit(l2) ? 'ON' : 'OFF') + ' · Blown ' + Math.min(2, blown) + ' / 2';
  }

  s.activityPassed = a.passed;
  s.designReading = reading;
  return reading;
}

export function masterProgress(completed, levels) {
  const doneIds = new Set(completed.map(i => levels[i]?.id).filter(Boolean));
  const items = masterActivities.map(act => {
    const levelIndex = levels.findIndex(l => l.id === act.id);
    return {
      ...act,
      done: doneIds.has(act.id),
      levelIndex: levelIndex >= 0 ? levelIndex : 0
    };
  });
  return {
    items,
    doneCount: items.filter(i => i.done).length,
    totalCount: items.length
  };
}

const mLabel = (x, y, text, cls = 'obs-lbl') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="middle">${text}</text>`;
export const masterSketches = {
  'mc-basketball': [
    'Parabolic cannon trajectory aimed into a fixed hoop with a belt return',
    `<rect x="16" y="64" width="30" height="20" rx="3"/><path d="M40 66 56 54M44 74 60 62M20 84h150"/><path d="M56 56Q108 8 158 46" stroke-dasharray="4 3"/><path d="M168 18v34M150 46h18M44 88h118l-6 5m6-5-6-5"/>${mLabel(104, 18, '3.8 - 4.7 V', 'obs-sm')}${mLabel(110, 99, '10x', 'obs-lbl')}`
  ],
  'mc-basketball-raw': [
    'Parabolic cannon trajectory aimed into a fixed hoop without a potentiometer',
    `<rect x="16" y="64" width="30" height="20" rx="3"/><path d="M40 66 56 54M44 74 60 62M20 84h150"/><path d="M56 56Q108 8 158 46" stroke-dasharray="4 3"/><path d="M168 18v34M150 46h18"/>${mLabel(104, 18, 'RC / DIV', 'obs-sm')}${mLabel(110, 99, '10x', 'obs-lbl')}`
  ],
  'mc-bulbtown': [
    'Series and parallel equations for 20 ohm bulbs hitting 0.125 A',
    `<circle class="diagram-lamp" cx="100" cy="30" r="13"/><path d="m92 22 16 16m-16 0 16-16M58 30h29M113 30h29"/>${mLabel(100, 61, 'Target: 0.125 A (48 Ω)', 'obs-sm')}${mLabel(100, 77, 'Series: R1 + R2', 'obs-sm')}${mLabel(100, 93, 'Parallel: 1/R1 + 1/R2', 'obs-sm')}`
  ],
  'mc-flip-proof': [
    'Auto-reversing battery feeding a constant clockwise motor',
    `<path d="M36 28V44M27 44h18M31 52h10M36 52v18"/><path d="M22 44a14 14 0 0 1 28 0" stroke-dasharray="3 2"/><path d="M68 48h40l-5-4m5 4-5 4"/><circle cx="144" cy="48" r="18"/><path d="M136 56V39l8 10 8-10v17"/>${mLabel(36, 86, 'Flip 2 s', 'obs-sm')}${mLabel(144, 86, 'CW only', 'obs-sm')}`
  ],
  'mc-full-adder': [
    'Three-bit adder inputs A, B, and Cin to Sum and Carry out',
    `<rect x="64" y="20" width="72" height="64" rx="5"/><path d="M32 32h32M32 52h32M32 72h32M136 38h32M136 66h32"/>${mLabel(24, 35, 'A', 'obs-sm')}${mLabel(24, 55, 'B', 'obs-sm')}${mLabel(22, 75, 'Cin', 'obs-sm')}${mLabel(100, 56, 'ADD')}${mLabel(178, 41, 'Sum', 'obs-sm')}${mLabel(178, 69, 'Cout', 'obs-sm')}`
  ],
  'mc-sacrifice': [
    'Target lamp transitions from off to permanently on after a single button press',
    `<rect x="28" y="34" width="24" height="12" rx="4"/><path d="M16 40h12M52 40h18M82 40h28"/><circle class="diagram-lamp off" cx="132" cy="40" r="12"/><path d="m124 32 16 16m-16 0 16-16M144 40h28"/>${mLabel(40, 25, 'Fuse', 'obs-sm')}${mLabel(96, 68, 'OFF → ON', 'obs-sm')}`
  ],
  'mc-double-sacrifice': [
    'Lamp 1 swaps off while Lamp 2 swaps on after one button press',
    `<circle class="diagram-lamp" cx="56" cy="30" r="11"/><path d="m49 23 14 14m-14 0 14-14M82 30h34l-5-4m5 4-5 4"/><circle class="diagram-lamp off" cx="144" cy="30" r="11"/><path d="m137 23 14 14m-14 0 14-14"/><circle class="diagram-lamp off" cx="56" cy="74" r="11"/><path d="m49 67 14 14m-14 0 14-14M82 74h34l-5-4m5 4-5 4"/><circle class="diagram-lamp" cx="144" cy="74" r="11"/><path d="m137 67 14 14m-14 0 14-14"/>${mLabel(24, 34, 'L1', 'obs-sm')}${mLabel(24, 78, 'L2', 'obs-sm')}`
  ]
};
