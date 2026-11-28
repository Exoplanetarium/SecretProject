const dev = (kind, x, z, settings = {}) => ({ kind, x, z, ...settings });
const fix = (parts, connections = []) => ({
  parts: parts.map((p, i) => ({ resistance: 30, ...p, id: 'p' + (i + 1) })),
  wires: connections.map(([a, b]) => ({ a: 'p' + a, b: 'p' + b }))
});
const leads = (...pairs) => pairs.map(pair => pair.split('-').map(pin => pin.replace('.', ':')));

function logicLevel(id, title, goal, hint, layout, parts, extra = {}) {
  return {
    id,
    unit: 'Logic',
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

export const logicActivities = [
  logicLevel(
    'logic-and-or',
    'AND & OR chips',
    'Send switches A and B into both logic chips: light Both when A and B are both closed, and Either when A or B is closed. Test all four pairs.',
    'Connect A and B into both logic chips (leave one set to AND and switch the other to OR). Join every − pin to the bus bar, then test 00, 01, 10, and 11.',
    fix(
      [
        dev('battery', -9, 1),
        dev('switch', -6, 3, { role: 'Input A' }),
        dev('switch', -6, -1.5, { role: 'Input B' }),
        dev('gate', 0, 3, { gateMode: 'AND', outputHigh: false }),
        dev('gate', 0, -1.5, { gateMode: 'OR', outputHigh: false }),
        dev('lamp', 6, 3, { role: 'Both' }),
        dev('lamp', 6, -1.5, { role: 'Either' }),
        dev('rail', -1, -5)
      ],
      leads('1.1-8.0', '4.3-8.1', '5.3-8.2', '6.1-8.3', '7.1-8.3')
    ),
    ['battery', 'switch', 'gate', 'lamp', 'rail'],
    {
      unlocks: ['gate'],
      ending: 'AND needs both switches closed; OR lights if either switch or both are closed.'
    }
  ),
  logicLevel(
    'logic-lock',
    'Secret door lock',
    'Light the Unlock lamp ONLY when Key A is closed and Alarm B is open. Test all four switch combinations.',
    'Flip Alarm B with the NOT chip first, then send Key A and the flipped Alarm B into the AND chip wired to Unlock.',
    fix(
      [
        dev('battery', -9, 1),
        dev('switch', -6, 3, { role: 'Key A' }),
        dev('switch', -6, -1.5, { role: 'Alarm B' }),
        dev('gate', -1.5, -1.5, { gateMode: 'NOT', outputHigh: true }),
        dev('gate', 3, 1, { gateMode: 'AND', outputHigh: false }),
        dev('lamp', 7.5, 1, { role: 'Unlock' }),
        dev('rail', -1, -5)
      ],
      leads('1.1-7.0', '4.3-7.1', '5.3-7.2', '6.1-7.3')
    ),
    ['battery', 'switch', 'gate', 'lamp', 'rail'],
    {
      ending: 'Combining NOT and AND lets you build rules that require one switch on and another off.'
    }
  ),
  logicLevel(
    'logic-nand-or',
    'Build OR from NAND',
    'Build an OR circuit using only three NAND chips. Test all four pairs for Input A and Input B.',
    'Flip Input A by wiring it into both A and B on the first NAND chip, flip Input B on the second NAND chip, then join both outputs into the third NAND chip. Keep all three set to NAND.',
    fix(
      [
        dev('battery', -8, 1),
        dev('switch', -5, 3, { role: 'Input A' }),
        dev('switch', -5, -1, { role: 'Input B' }),
        dev('gate', -1, 3, { gateMode: 'NAND', outputHigh: true }),
        dev('gate', -1, -1, { gateMode: 'NAND', outputHigh: true }),
        dev('gate', 3.5, 1, { gateMode: 'NAND', outputHigh: true }),
        dev('lamp', 7.5, 1),
        dev('rail', 0, -4.5)
      ],
      leads('1.1-8.0', '4.3-8.1', '5.3-8.1', '6.3-8.2', '7.1-8.3')
    ),
    ['battery', 'switch', 'gate', 'lamp', 'rail'],
    {
      ending: 'Even with only NAND chips, you can build every other logic chip inside a computer.'
    }
  ),
  logicLevel(
    'logic-splitter',
    'Room splitter',
    'Use Power and Room switches to steer power: when Power is closed, light Room A (Room open) or Room B (Room closed). Test all four combinations.',
    'Keep the chips set to NOT, AND, and AND. Send Power into both AND chips; send NOT(Room) to the Room A AND chip and Room directly to the Room B AND chip.',
    fix(
      [
        dev('battery', -9, 1),
        dev('switch', -6, 3, { role: 'Power' }),
        dev('switch', -6, -1.5, { role: 'Room' }),
        dev('gate', -2, -1.5, { gateMode: 'NOT', outputHigh: true }),
        dev('gate', 2.5, 3, { gateMode: 'AND', outputHigh: false }),
        dev('gate', 2.5, -1.5, { gateMode: 'AND', outputHigh: false }),
        dev('lamp', 7, 3, { role: 'Room A' }),
        dev('lamp', 7, -1.5, { role: 'Room B' }),
        dev('rail', -1, -5),
        dev('rail', 4.5, -5)
      ],
      leads('1.1-9.0', '9.3-10.0', '4.3-9.1', '5.3-10.1', '6.3-10.2', '7.1-10.3', '8.1-10.3')
    ),
    ['battery', 'switch', 'gate', 'lamp', 'rail'],
    {
      ending: 'A splitter sends one power line to whichever destination your selector switch picks.'
    }
  ),
  logicLevel(
    'logic-mux',
    'Signal switcher',
    'Use Switch S to pick whether Input A (S open) or Input B (S closed) runs the lamp. Test all eight combinations.',
    'Leave the chips set to NOT, AND, AND, and OR. Wire Input A with NOT(S) into one AND chip, Input B with S into the other AND chip, and join both through the OR chip.',
    fix(
      [
        dev('battery', -9, 1),
        dev('switch', -6.5, 4, { role: 'Select S' }),
        dev('switch', -6.5, 0.5, { role: 'Input A' }),
        dev('switch', -6.5, -3, { role: 'Input B' }),
        dev('gate', -2.5, 4, { gateMode: 'NOT', outputHigh: true }),
        dev('gate', 1.5, 2.5, { gateMode: 'AND', outputHigh: false }),
        dev('gate', 1.5, -2, { gateMode: 'AND', outputHigh: false }),
        dev('gate', 5, 0.5, { gateMode: 'OR', outputHigh: false }),
        dev('lamp', 8.5, 0.5),
        dev('rail', -2.5, -5.5),
        dev('rail', 3.5, -5.5)
      ],
      leads('1.1-10.0', '5.3-10.1', '6.3-10.2', '10.3-11.0', '7.3-11.1', '8.3-11.2', '9.1-11.3')
    ),
    ['battery', 'switch', 'gate', 'lamp', 'rail'],
    {
      ending: 'Switch S picks which input gets passed to the lamp.'
    }
  ),
  logicLevel(
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
      unlocks: ['display'],
      ending: 'XOR gives the ones place and AND gives the twos carry. Two logic chips add binary numbers.'
    }
  ),
  logicLevel(
    'logic-comparator',
    'Code matcher',
    'Light the Match lamp only when the two A switches match the two B switches. Test all 4 matches and at least 4 mismatches.',
    'Compare A1 with B1 in one XOR chip, and A0 with B0 in the other XOR chip (XOR turns off only when both inputs match). Send both into the NOR chip to light Match when neither pair differs.',
    fix(
      [
        dev('battery', -9.5, 1),
        dev('switch', -6.5, 4.5, { role: 'A1' }),
        dev('switch', -6.5, 2, { role: 'A0' }),
        dev('switch', -6.5, -1, { role: 'B1' }),
        dev('switch', -6.5, -3.5, { role: 'B0' }),
        dev('gate', -1, 3, { gateMode: 'XOR', outputHigh: false }),
        dev('gate', -1, -2, { gateMode: 'XOR', outputHigh: false }),
        dev('gate', 3.5, 0.5, { gateMode: 'NOR', outputHigh: true }),
        dev('lamp', 7.5, 0.5, { role: 'Match' }),
        dev('rail', -2, -6),
        dev('rail', 3.5, -6)
      ],
      leads('1.1-10.0', '6.3-10.1', '7.3-10.2', '10.3-11.0', '8.3-11.1', '9.1-11.2')
    ),
    ['battery', 'switch', 'gate', 'lamp', 'rail'],
    {
      ending: 'XOR spots any mismatch, and NOR lights Match when every pair agrees.'
    }
  ),
  logicLevel(
    'logic-majority',
    'Majority vote',
    'Light the Pass lamp whenever at least two of the three vote switches (A, B, C) are closed. Test all 8 combinations.',
    'Think about every pair of voters that could agree: (A, B), (B, C), or (A, C). If any pair is both ON, Pass should light up.',
    fix(
      [
        dev('battery', -9.5, 1),
        dev('switch', -6.5, 4, { role: 'Vote A' }),
        dev('switch', -6.5, 0.5, { role: 'Vote B' }),
        dev('switch', -6.5, -3, { role: 'Vote C' }),
        dev('gate', -2, 4, { gateMode: 'AND', outputHigh: false }),
        dev('gate', -2, 0.5, { gateMode: 'AND', outputHigh: false }),
        dev('gate', -2, -3, { gateMode: 'AND', outputHigh: false }),
        dev('gate', 2.5, 2.5, { gateMode: 'OR', outputHigh: false }),
        dev('gate', 5.5, 0, { gateMode: 'OR', outputHigh: false }),
        dev('lamp', 8.5, 0, { role: 'Pass' }),
        dev('rail', -2, -6),
        dev('rail', 4, -6)
      ],
      leads('1.1-11.0', '11.3-12.0', '5.3-11.1', '6.3-11.2', '7.3-11.3', '8.3-12.1', '9.3-12.2', '10.1-12.3')
    ),
    ['battery', 'switch', 'gate', 'lamp', 'rail'],
    {
      challenge: true,
      target: 'At least 2 of 3 closed',
      ending: 'Checking every pair with AND and joining them with OR solves a majority vote in hardware.'
    }
  )
];

function configKey(parts, wires) {
  return JSON.stringify([
    parts.map(p => [p.id, p.kind, p.gateMode || 'NAND']),
    wires.map(w => [w.a, w.b])
  ]);
}

export function measureLogic(lesson, parts, wires, s, a, on) {
  const id = lesson.id;
  const kind = k => parts.filter(p => p.kind === k);
  const amp = p => (on && p ? Math.abs(s.currents[p.id] || 0) : 0);
  const lit = p => amp(p) > 0.025;
  const key = configKey(parts, wires);

  if (!a.log || a.log.key !== key) {
    a.log = { key, cases: new Set(), eqCases: new Set(), neqCases: new Set() };
    a.passed = false;
  }

  const log = a.log;
  const switches = kind('switch');
  const lamps = kind('lamp');
  const gates = kind('gate');
  const settled = !s.hasPendingTransition;
  let reading = '';

  if (id === 'logic-and-or') {
    const swA = switches.find(p => p.role === 'Input A') || switches[0];
    const swB = switches.find(p => p.role === 'Input B' && p !== swA) || switches[1];
    const lBoth = lamps.find(p => p.role === 'Both') || lamps[0];
    const lEither = lamps.find(p => p.role === 'Either' && p !== lBoth) || lamps[1];
    const aOn = !!swA?.closed;
    const bOn = !!swB?.closed;
    const bothOn = lit(lBoth);
    const eitherOn = lit(lEither);
    if (on && !s.short && swA && swB && lBoth && lEither && gates.length >= 2 && settled) {
      if (bothOn === (aOn && bOn) && eitherOn === (aOn || bOn)) {
        log.cases.add(`${aOn ? 1 : 0}${bOn ? 1 : 0}`);
        if (log.cases.size === 4) a.passed = true;
      }
    }
    reading = `A ${aOn ? 1 : 0} · B ${bOn ? 1 : 0} · Both ${bothOn ? 1 : 0} · Either ${eitherOn ? 1 : 0} · Cases ${log.cases.size} / 4`;
  } else if (id === 'logic-lock') {
    const swA = switches.find(p => p.role === 'Key A') || switches[0];
    const swB = switches.find(p => p.role === 'Alarm B' && p !== swA) || switches[1];
    const lamp = lamps[0];
    const aOn = !!swA?.closed;
    const bOn = !!swB?.closed;
    const lampOn = lit(lamp);
    if (on && !s.short && swA && swB && lamp && gates.length >= 2 && settled) {
      if (lampOn === (aOn && !bOn)) {
        log.cases.add(`${aOn ? 1 : 0}${bOn ? 1 : 0}`);
        if (log.cases.size === 4) a.passed = true;
      }
    }
    reading = `Key ${aOn ? 1 : 0} · Alarm ${bOn ? 1 : 0} · Unlock ${lampOn ? 'ON' : 'OFF'} · Cases ${log.cases.size} / 4`;
  } else if (id === 'logic-nand-or') {
    const swA = switches.find(p => p.role === 'Input A') || switches[0];
    const swB = switches.find(p => p.role === 'Input B' && p !== swA) || switches[1];
    const lamp = lamps[0];
    const allNand = gates.length >= 3 && gates.every(g => (g.gateMode || 'NAND') === 'NAND');
    const aOn = !!swA?.closed;
    const bOn = !!swB?.closed;
    const lampOn = lit(lamp);
    if (on && !s.short && swA && swB && lamp && allNand && settled) {
      if (lampOn === (aOn || bOn)) {
        log.cases.add((aOn ? '1' : '0') + (bOn ? '1' : '0'));
        if (log.cases.size === 4) a.passed = true;
      }
    }
    reading = (allNand ? 'NAND-only ' : 'Use 3 NAND gates · ') + 'A ' + (aOn ? 1 : 0) + ' · B ' + (bOn ? 1 : 0) + ' · Out ' + (lampOn ? 1 : 0) + ' · Cases ' + log.cases.size + ' / 4';
  } else if (id === 'logic-splitter') {
    const swP = switches.find(p => p.role === 'Power') || switches[0];
    const swR = switches.find(p => p.role === 'Room' && p !== swP) || switches[1];
    const lA = lamps.find(p => p.role === 'Room A') || lamps[0];
    const lB = lamps.find(p => p.role === 'Room B' && p !== lA) || lamps[1];
    const pOn = !!swP?.closed;
    const rOn = !!swR?.closed;
    const aLit = lit(lA);
    const bLit = lit(lB);
    if (on && !s.short && swP && swR && lA && lB && gates.length >= 3 && settled) {
      if (aLit === (pOn && !rOn) && bLit === (pOn && rOn)) {
        log.cases.add(`${pOn ? 1 : 0}${rOn ? 1 : 0}`);
        if (log.cases.size === 4) a.passed = true;
      }
    }
    reading = `Power ${pOn ? 1 : 0} · Room ${rOn ? 'B' : 'A'} · A=${aLit ? 1 : 0} B=${bLit ? 1 : 0} · Cases ${log.cases.size} / 4`;
  } else if (id === 'logic-mux') {
    const swS = switches.find(p => p.role === 'Select S') || switches[0];
    const swA = switches.find(p => p.role === 'Input A') || switches.find(p => p !== swS);
    const swB = switches.find(p => p.role === 'Input B' && p !== swS && p !== swA) || switches.find(p => p !== swS && p !== swA);
    const lamp = lamps[0];
    const sOn = !!swS?.closed;
    const aOn = !!swA?.closed;
    const bOn = !!swB?.closed;
    const lampOn = lit(lamp);
    if (on && !s.short && swS && swA && swB && lamp && gates.length >= 4 && settled) {
      if (lampOn === (sOn ? bOn : aOn)) {
        log.cases.add((sOn ? '1' : '0') + (aOn ? '1' : '0') + (bOn ? '1' : '0'));
        if (log.cases.size === 8) a.passed = true;
      }
    }
    reading = 'S ' + (sOn ? 1 : 0) + ' · A ' + (aOn ? 1 : 0) + ' · B ' + (bOn ? 1 : 0) + ' · Out ' + (lampOn ? 1 : 0) + ' · Cases ' + log.cases.size + ' / 8';
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
    if (on && !s.short && swA && swB && sumLamp && carryLamp && gates.length >= 1 && settled) {
      const expSum = (aBit ^ bBit) === 1;
      const expCarry = (aBit & bBit) === 1;
      const code = '' + aBit + bBit;
      if (sumOn === expSum && carryOn === expCarry) {
        log.cases.add(code);
        if (log.cases.size === 4) a.passed = true;
      } else if (sumOn === expCarry && carryOn === expSum) {
        if (!sumLamp.role && !carryLamp.role) {
          log.swappedCases ??= new Set();
          log.swappedCases.add(code);
          if (log.swappedCases.size === 4) a.passed = true;
        } else {
          swappedHint = true;
        }
      }
    }
    const doneCases = (!sumLamp?.role && !carryLamp?.role && (log.swappedCases?.size || 0) > log.cases.size)
      ? log.swappedCases
      : log.cases;
    const marks = ['00', '01', '10', '11'].map(c => c + (doneCases.has(c) ? '✓' : '○')).join(' ');
    reading = 'A ' + aBit + ' + B ' + bBit + ' = ' + (carryOn ? 1 : 0) + (sumOn ? 1 : 0) + ' · ' + marks + (swappedHint ? ' · Swap Sum & Carry' : '');
  } else if (id === 'logic-comparator') {
    const swA1 = switches.find(p => p.role === 'A1') || switches[0];
    const swA0 = switches.find(p => p.role === 'A0') || switches[1];
    const swB1 = switches.find(p => p.role === 'B1') || switches[2];
    const swB0 = switches.find(p => p.role === 'B0') || switches[3];
    const lamp = lamps[0];
    const a1 = swA1?.closed ? 1 : 0;
    const a0 = swA0?.closed ? 1 : 0;
    const b1 = swB1?.closed ? 1 : 0;
    const b0 = swB0?.closed ? 1 : 0;
    const lampOn = lit(lamp);
    let wrongNote = '';
    if (on && !s.short && swA1 && swA0 && swB1 && swB0 && lamp && gates.length >= 3 && settled) {
      const equal = a1 === b1 && a0 === b0;
      if (lampOn === equal) {
        if (equal) log.eqCases.add(`${a1}${a0}`);
        else log.neqCases.add(`${a1}${a0}${b1}${b0}`);
        if (log.eqCases.size === 4 && log.neqCases.size >= 4) a.passed = true;
      } else {
        wrongNote = ' · Output wrong';
      }
    }
    reading = `A=${a1}${a0} B=${b1}${b0} · Match=${log.eqCases.size}/4 · Mismatch=${Math.min(4, log.neqCases.size)}/4${wrongNote}`;
  } else if (id === 'logic-majority') {
    const swA = switches.find(p => p.role === 'Vote A') || switches[0];
    const swB = switches.find(p => p.role === 'Vote B' && p !== swA) || switches[1];
    const swC = switches.find(p => p.role === 'Vote C' && p !== swA && p !== swB) || switches[2];
    const lamp = lamps[0];
    const aBit = swA?.closed ? 1 : 0;
    const bBit = swB?.closed ? 1 : 0;
    const cBit = swC?.closed ? 1 : 0;
    const lampOn = lit(lamp);
    if (on && !s.short && swA && swB && swC && lamp && gates.length >= 4 && settled) {
      if (lampOn === (aBit + bBit + cBit >= 2)) {
        log.cases.add(`${aBit}${bBit}${cBit}`);
        if (log.cases.size === 8) a.passed = true;
      }
    }
    reading = `Votes ${aBit}${bBit}${cBit} · Pass ${lampOn ? 'ON' : 'OFF'} · Cases ${log.cases.size} / 8`;
  }

  s.activityPassed = a.passed;
  s.designReading = reading;
  return reading;
}

const lLbl = (x, y, text, cls = 'obs-lbl') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="middle">${text}</text>`;
const lDot = (cx, cy) => `<circle class="obs-dot" cx="${cx}" cy="${cy}" r="2.1"/>`;
const lBat = (x = 14, topY = 16, botY = 92) =>
  `<path d="M${x} ${topY}V45M${x - 8} 45h16M${x - 4} 53h8M${x} 53V${botY}"/>${lLbl(x + 11, 40, '+')}${lLbl(x + 11, 64, '−')}`;
const lSw = (x, y, w = 18) => `<path d="M${x} ${y}l${w - 3} -7"/><circle cx="${x}" cy="${y}" r="1.6"/><circle cx="${x + w}" cy="${y}" r="1.6"/>`;
const lLamp = (cx, cy, r = 8) => {
  const k = Math.round(r * 0.6);
  return `<circle class="diagram-lamp" cx="${cx}" cy="${cy}" r="${r}"/><path d="m${cx - k} ${cy - k} ${k * 2} ${k * 2}m-${k * 2} 0 ${k * 2}-${k * 2}"/>`;
};
const lNot = (x, y) => `<path d="M${x} ${y}l16 9-16 9Z"/><circle cx="${x + 18.2}" cy="${y + 9}" r="2.2"/>`;
function lGate(x, y, mode) {
  if (mode === 'AND') return `<path d="M${x} ${y}h15a11 11 0 0 1 0 22H${x}Z"/>${lLbl(x + 12, y + 13.5, 'AND', 'obs-sm')}`;
  if (mode === 'NAND') return `<path d="M${x} ${y}h13a11 11 0 0 1 0 22H${x}Z"/><circle cx="${x + 26.2}" cy="${y + 11}" r="2.2"/>${lLbl(x + 11.5, y + 13.5, 'NAND', 'obs-sm')}`;
  if (mode === 'OR') return `<path d="M${x} ${y}q6 11 0 22h12q10 0 14-11-4-11-14-11Z"/>${lLbl(x + 13.5, y + 13.5, 'OR', 'obs-sm')}`;
  if (mode === 'NOR') return `<path d="M${x} ${y}q6 11 0 22h10q10 0 14-11-4-11-14-11Z"/><circle cx="${x + 26.2}" cy="${y + 11}" r="2.2"/>${lLbl(x + 12, y + 13.5, 'NOR', 'obs-sm')}`;
  return `<path d="M${x - 3} ${y}q6 11 0 22M${x} ${y}q6 11 0 22h12q10 0 14-11-4-11-14-11Z"/>${lLbl(x + 13.5, y + 13.5, 'XOR', 'obs-sm')}`;
}

export const logicSketches = {
  'logic-and-or': [
    'Switches A and B feeding an AND gate and an OR gate in parallel',
    `${lBat(14, 18, 92)}<path d="M14 92H184M14 18H32V70M32 24H36M54 24H92M64 24V64H95M54 70H74V74H95M74 70V34H92"/><path class="paper-cut" d="M64 46v14"/><path d="M64 44v18"/><path d="M118 29H158M174 29H184V92M118 69H158M174 69H184"/>${lDot(32, 24)}${lDot(64, 24)}${lDot(74, 70)}${lDot(184, 69)}${lSw(36, 24, 18)}${lSw(36, 70, 18)}${lGate(92, 18, 'AND')}${lGate(92, 58, 'OR')}${lLamp(166, 29, 8)}${lLamp(166, 69, 8)}${lLbl(45, 13, 'A', 'obs-sm')}${lLbl(45, 59, 'B', 'obs-sm')}${lLbl(166, 15, 'Both', 'obs-sm')}${lLbl(166, 55, 'Either', 'obs-sm')}`
  ],
  'logic-lock': [
    'Key A and inverted Alarm B feeding an AND gate to light Unlock',
    `${lBat(14, 18, 92)}<path d="M14 92H184M14 18H32V68M32 24H36M54 24H96V42H112M54 68H66M86.4 68H96V52H112M138 47H158M174 47H184V92"/>${lDot(32, 24)}${lSw(36, 24, 18)}${lSw(36, 68, 18)}${lNot(66, 59)}${lGate(112, 36, 'AND')}${lLamp(166, 47, 8)}${lLbl(45, 13, 'Key A', 'obs-sm')}${lLbl(45, 81, 'Alrm B', 'obs-sm')}${lLbl(75, 86, 'NOT', 'obs-sm')}${lLbl(166, 33, 'Unlock', 'obs-sm')}`
  ],
  'logic-nand-or': [
    'Three NAND gates wired as inverters feeding a third NAND gate to form OR',
    `${lBat(14, 18, 92)}<path d="M14 92H186M14 18H34V72M34 24H38M56 24H64M64 19v10M64 19h8M64 29h8M56 72H64M64 67v10M64 67h8M64 77h8M100.4 24H112V43H124M100.4 72H112V53H124M152.4 48H165M181 48H186V92"/>${lDot(34, 24)}${lDot(64, 24)}${lDot(64, 72)}${lSw(38, 24, 18)}${lSw(38, 72, 18)}${lGate(72, 13, 'NAND')}${lGate(72, 61, 'NAND')}${lGate(124, 37, 'NAND')}${lLamp(173, 48, 8)}${lLbl(47, 13, 'A', 'obs-sm')}${lLbl(47, 61, 'B', 'obs-sm')}`
  ],
  'logic-splitter': [
    'Power and Room selector steering power through NOT and two AND gates',
    `${lBat(12, 14, 94)}<path d="M12 94H186M12 14H32V68M32 24H36M54 24H96M62 24V64H96M54 68H66M86.4 68H92V74H96M88 68V34H96"/><path class="paper-cut" d="M88 46v12"/><path d="M88 44v16M122 29H158M174 29H186V94M122 69H158M174 69H186"/>${lDot(32, 24)}${lDot(62, 24)}${lDot(88, 68)}${lDot(186, 69)}${lSw(36, 24, 18)}${lSw(36, 68, 18)}${lNot(66, 59)}${lGate(96, 18, 'AND')}${lGate(96, 58, 'AND')}${lLamp(166, 29, 8)}${lLamp(166, 69, 8)}${lLbl(45, 13, 'Pow', 'obs-sm')}${lLbl(45, 81, 'Room', 'obs-sm')}${lLbl(166, 15, 'Rm A', 'obs-sm')}${lLbl(166, 55, 'Rm B', 'obs-sm')}`
  ],
  'logic-mux': [
    'Select switch S chooses Input A or Input B through NOT, AND, and OR gates',
    `${lBat(12, 14, 94)}<path d="M12 94H190M12 14H32V80M32 20h4M32 52h4M54 20H66M86.4 20H92V36H100M60 20V68H100M54 80H92V78H100"/><path class="paper-cut" d="M55 52h10"/><path d="M54 52H92V46H100M126 41H133V50H143M126 73H133V60H143M166 55H170M186 55H190V94"/>${lDot(32, 20)}${lDot(32, 52)}${lDot(60, 20)}${lSw(36, 20, 18)}${lSw(36, 52, 18)}${lSw(36, 80, 18)}${lNot(66, 11)}${lGate(100, 30, 'AND')}${lGate(100, 62, 'AND')}${lGate(140, 44, 'OR')}${lLamp(178, 55, 8)}${lLbl(45, 11, 'S', 'obs-sm')}${lLbl(45, 43, 'A', 'obs-sm')}${lLbl(45, 71, 'B', 'obs-sm')}${lLbl(75, 38, 'NOT', 'obs-sm')}`
  ],
  'half-adder': [
    'Battery, input switches A and B, XOR and AND gates, Sum and Carry lamps',
    `${lBat(16, 22, 92)}<path d="M16 92H184M16 22h14V66M30 22l20-8M30 66l20-8M54 22h30M62 22V58h22M54 66h18M72 66v8h12M72 66V38h12"/><path class="paper-cut" d="M72 54v8"/><path d="M72 52v12"/><path d="M84 16h20a14 14 0 0 1 0 28H84ZM84 52h20a14 14 0 0 1 0 28H84ZM118 30h29M165 30h19v62M118 66h29M165 66h9v26"/>${lDot(30, 22)}${lDot(62, 22)}${lDot(72, 66)}${lDot(174, 92)}${lLamp(156, 30, 9)}${lLamp(156, 66, 9)}${lLbl(42, 12, 'A', 'obs-sm')}${lLbl(42, 56, 'B', 'obs-sm')}${lLbl(99, 33, 'XOR')}${lLbl(99, 69, 'AND')}${lLbl(156, 15, 'Sum', 'obs-sm')}${lLbl(156, 52, 'Carry', 'obs-sm')}`
  ],
  'logic-comparator': [
    'Two XOR bit comparators feeding a NOR gate to light Match',
    `${lBat(12, 14, 94)}<path d="M12 94H188M12 14H32V79M32 18h4M32 34h4M32 62h4M32 79h4M54 18H66V21H75M54 34H66V31H75M54 62H66V63H75M54 79H66V73H75M102 26H113V42H123M102 68H113V52H123M148.4 47H161M177 47H188V94"/>${lDot(32, 18)}${lDot(32, 34)}${lDot(32, 62)}${lSw(36, 18, 18)}${lSw(36, 34, 18)}${lSw(36, 62, 18)}${lSw(36, 79, 18)}${lGate(76, 15, 'XOR')}${lGate(76, 57, 'XOR')}${lGate(120, 36, 'NOR')}${lLamp(169, 47, 8)}${lLbl(45, 10, 'A1', 'obs-sm')}${lLbl(45, 43, 'B1', 'obs-sm')}${lLbl(45, 52, 'A0', 'obs-sm')}${lLbl(45, 89, 'B0', 'obs-sm')}${lLbl(169, 34, 'Match', 'obs-sm')}`
  ],
  'logic-majority': [
    'Voting goal: Pass lights only when at least two of switches A, B, and C are closed',
    `<rect x="14" y="12" width="28" height="22" rx="4"/><rect x="50" y="12" width="28" height="22" rx="4"/><rect x="86" y="12" width="28" height="22" rx="4"/>${lLbl(28, 26, 'A', 'obs-sm')}${lLbl(64, 26, 'B', 'obs-sm')}${lLbl(100, 26, 'C', 'obs-sm')}<path d="M122 23h24m-5-4 5 4-5 4"/>${lLamp(166, 23, 9)}<rect x="14" y="48" width="80" height="44" rx="5"/><rect x="106" y="48" width="80" height="44" rx="5"/>${lLbl(54, 65, '0 or 1 ON', 'obs-sm')}${lLbl(54, 81, 'Pass OFF', 'obs-sm')}${lLbl(146, 65, '2 or 3 ON', 'obs-sm')}${lLbl(146, 81, 'Pass ON ★', 'obs-sm')}`
  ]
};

export const logicGuides = {
  'logic-and-or': [
    { title: 'Wire A and B to both chips', text: 'Send Input A and Input B into both logic chips (one set to AND, the other to OR). Join all − pins to the bus bar.', target: '[data-kind="gate"]' },
    { title: 'Test all four combinations', text: 'Wire Both to the AND chip and Either to the OR chip, then test 00, 01, 10, and 11.', target: '#viewport' }
  ],
  'logic-lock': [
    { title: 'Invert Alarm B first', text: 'Run Alarm B through the NOT chip so Key A and NOT(Alarm B) meet at the AND chip.', target: '[data-kind="gate"]' },
    { title: 'Test every switch state', text: 'Wire Unlock to the AND output and test all four states so it lights only with Key closed and Alarm open.', target: '#viewport' }
  ],
  'logic-nand-or': [
    { title: 'Flip a signal with NAND', text: 'Wiring the same input into both A and B on a NAND chip makes it work as an inverter. Do this for both A and B.', target: '[data-kind="gate"]' },
    { title: 'Join them in a third NAND', text: 'Send both flipped wires into the third NAND chip (keep all three set to NAND) and test 00, 01, 10, and 11.', target: '#viewport' }
  ],
  'logic-splitter': [
    { title: 'Set up NOT and two AND chips', text: 'Send Power to both AND chips, NOT(Room) to the Room A AND chip, and Room directly to the Room B AND chip.', target: '[data-kind="gate"]' },
    { title: 'Steer power to A or B', text: 'Wire each AND output to Room A and Room B lamps and test all four switch combinations.', target: '#viewport' }
  ],
  'logic-mux': [
    { title: 'Build the selector', text: 'Wire Switch S straight into one AND chip and through the NOT chip into the other AND chip.', target: '[data-kind="gate"]' },
    { title: 'Route A, B, and OR', text: 'Connect A to the NOT(S) AND chip, B to the S AND chip, join both through OR into the lamp, and test all 8 combinations.', target: '#viewport' }
  ],
  'half-adder': [
    { title: 'Multi-pin logic chips', text: 'Every logic chip needs its − pin joined to battery − through the bus bar. Select a chip to pick XOR or AND.', target: '[data-kind="gate"]' },
    { title: 'Wire Sum and Carry', text: 'Send switches A and B into both chips: XOR drives Sum and AND drives Carry. Test all four pairs.', target: '#viewport' }
  ],
  'logic-comparator': [
    { title: 'Check each pair with XOR', text: 'Wire A1 and B1 into one XOR chip, and A0 and B0 into the other XOR chip.', target: '[data-kind="gate"]' },
    { title: 'Light Match with NOR', text: 'Send both XOR outputs into the NOR chip wired to Match, then verify all 4 matches and 4 mismatches.', target: '#viewport' }
  ],
  'logic-majority': [
    { title: 'Detect any two votes', text: 'Use your AND and OR chips so the output turns on whenever at least two of switches A, B, and C are closed.', target: '[data-kind="gate"]' },
    { title: 'Test all 8 vote combos', text: 'Wire the final output to Pass and flip A, B, and C through all 8 combinations.', target: '#viewport' }
  ]
};
