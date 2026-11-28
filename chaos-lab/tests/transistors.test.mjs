import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, solveCircuit, applyStep } from '../src/circuit.js';
import { activities, conditions, freshActivity, measureActivity } from '../src/activities.js';
import { starterBoard } from '../src/units.js';
import { LESSONS } from '../src/lessons.js';
import { transistorActivities } from '../src/transistors.js';
import { unlockedToolbelt } from '../src/observatory.js';
import { diagram } from '../src/visuals.js';

function bench(id) {
  const lesson = activities.find(l => l.id === id);
  const starter = starterBoard(lesson);
  const parts = starter.parts.map(p => ({ ...p }));
  const wires = starter.wires.map(w => ({ ...w }));
  const activity = freshActivity();
  function wire(from, to) {
    wires.push({ a: 'p' + from, b: 'p' + to });
  }
  function tick(dt = 0.05, powered = true) {
    const env = conditions(parts, activity, id);
    let s = solveCircuit(parts, wires, powered ? dt : 0, env);
    if (powered && !s.short && applyStep(parts, s)) {
      s = solveCircuit(parts, wires, 0, env);
    }
    measureActivity(lesson, parts, wires, s, activity, powered, dt);
    return s;
  }
  function settle(steps = 4, dt = 0.05) {
    let s;
    for (let i = 0; i < steps; i++) s = tick(dt, true);
    return s;
  }
  return { lesson, parts, wires, activity, wire, tick, settle };
}

test('trans-switch requires both open and closed B control over the motor', () => {
  const b = bench('trans-switch');
  b.wire('1:0', '2:0'); b.wire('2:1', '3:0'); b.wire('3:1', '4:1');
  b.wire('1:0', '5:0'); b.wire('5:1', '4:0');
  b.settle();
  assert.equal(b.activity.passed, false);
  b.parts[1].closed = true;
  const res = b.settle();
  assert.equal(b.parts[3].conducting, true);
  assert.ok(Math.abs(res.currents.p5) > 0.14);
  assert.equal(b.activity.passed, true);

  // Reject motor wired directly across battery bypassing transistor
  const cheat = bench('trans-switch');
  cheat.wire('1:0', '5:0'); cheat.wire('5:1', '1:1');
  cheat.settle();
  cheat.parts[1].closed = true;
  cheat.settle();
  assert.equal(cheat.activity.passed, false);
});

test('trans-amplifier drives motor in bright light and halts in darkness', () => {
  const b = bench('trans-amplifier');
  b.wire('1:0', '2:0'); b.wire('2:1', '3:1');
  b.wire('1:0', '4:0'); b.wire('4:1', '3:0');
  b.settle();
  assert.equal(b.parts[2].conducting, true);
  assert.equal(b.activity.passed, false);
  b.parts[1].lux = 0;
  b.settle();
  assert.equal(b.parts[2].conducting, false);
  assert.equal(b.activity.passed, true);
});

test('trans-dial trips the motor cleanly across Low and High dial positions', () => {
  const b = bench('trans-dial');
  b.wire('1:0', '2:2'); // + -> pot pin 2
  b.wire('2:0', '5:2'); // pot pin 1 -> bus bar (ground)
  b.wire('2:1', '3:1'); // wiper W -> B
  b.wire('1:0', '4:0'); b.wire('4:1', '3:0'); // + -> motor -> C
  b.parts[1].wiper = 0.05;
  let res = b.settle();
  assert.equal(b.parts[2].conducting, false);
  assert.ok(Math.abs(res.currents.p4 || 0) < 0.01);
  assert.equal(b.activity.passed, false);

  b.parts[1].wiper = 0.9;
  res = b.settle();
  assert.equal(b.parts[2].conducting, true);
  assert.ok(Math.abs(res.currents.p4 || 0) > 0.14);
  assert.equal(b.activity.passed, true);

  // Reject pot wired without ground reference
  const noDivider = bench('trans-dial');
  noDivider.wire('1:0', '2:2');
  noDivider.wire('2:1', '3:1');
  noDivider.wire('1:0', '4:0'); noDivider.wire('4:1', '3:0');
  noDivider.parts[1].wiper = 0.05;
  noDivider.settle();
  noDivider.parts[1].wiper = 0.9;
  noDivider.settle();
  assert.equal(noDivider.activity.passed, false);
});

test('trans-timer holds the lamp lit after releasing Start and shuts off automatically', () => {
  const b = bench('trans-timer');
  // 1: bat, 2: Start button, 3: 0.01F cap, 4: 100 ohm R, 5: transistor, 6: lamp, 7: rail
  b.wire('1:0', '2:0');
  b.wire('2:1', '3:0');
  b.wire('3:1', '7:2');
  b.wire('3:0', '4:0');
  b.wire('4:1', '7:3');
  b.wire('3:0', '5:1');
  b.wire('1:0', '6:0');
  b.wire('6:1', '5:0');

  b.settle(2);
  // Press Start for 250ms (5 ticks)
  b.parts[1].closed = true;
  for (let i = 0; i < 5; i++) b.tick(0.05, true);
  assert.equal(b.parts[4].conducting, true);
  assert.equal(b.activity.passed, false);

  // Release Start and advance timer through hold + clean shutoff
  b.parts[1].closed = false;
  let heldWhileReleased = false;
  for (let i = 0; i < 50; i++) {
    const res = b.tick(0.05, true);
    if (i < 6 && b.parts[4].conducting && Math.abs(res.currents.p6 || 0) > 0.025) heldWhileReleased = true;
  }
  assert.equal(heldWhileReleased, true);
  assert.equal(b.parts[4].conducting, false);
  assert.equal(b.activity.passed, true);
});

test('trans-not inverts Door switch onto LED via 60 ohm resistor', () => {
  const b = bench('trans-not');
  b.wire('1:0', '2:0'); b.wire('2:1', '3:0'); b.wire('3:1', '5:1');
  b.wire('1:0', '4:0'); b.wire('4:1', '6:0'); b.wire('5:0', '6:0');
  let s = b.settle();
  assert.ok(s.currents.p6 > 0.04);
  assert.equal(b.activity.passed, false);
  b.parts[1].closed = true;
  s = b.settle();
  assert.equal(b.parts[4].conducting, true);
  assert.ok(Math.abs(s.currents.p6 || 0) < 0.002);
  assert.equal(b.activity.passed, true);
});

test('trans-nand satisfies full 4-state truth table', () => {
  const nandB = bench('trans-nand');
  nandB.wire('1:0', '2:0'); nandB.wire('2:1', '4:0'); nandB.wire('4:1', '7:1');
  nandB.wire('1:0', '3:0'); nandB.wire('3:1', '5:0'); nandB.wire('5:1', '8:1');
  nandB.wire('1:0', '6:0'); nandB.wire('6:1', '9:0');
  nandB.wire('7:0', '9:0'); nandB.wire('7:2', '8:0');
  for (const [a, c] of [[false, false], [true, false], [false, true], [true, true]]) {
    nandB.parts[1].closed = a; nandB.parts[2].closed = c;
    const res = nandB.settle();
    assert.equal(Math.abs(res.currents.p9 || 0) > 0.01, !(a && c));
  }
  assert.equal(nandB.activity.passed, true);
});

test('trans-nightlight and trans-boss work in Bright and 0% Dark combinations', () => {
  const nl = bench('trans-nightlight');
  nl.wire('1:0', '2:0'); nl.wire('2:1', '4:1');
  nl.wire('1:0', '3:0'); nl.wire('3:1', '4:0'); nl.wire('4:0', '5:1');
  nl.wire('1:0', '6:0'); nl.wire('6:1', '5:0');
  let s = nl.settle();
  assert.ok(Math.abs(s.currents.p6 || 0) < 0.005);
  nl.parts[1].lux = 0;
  s = nl.settle();
  assert.ok(Math.abs(s.currents.p6 || 0) > 0.15);
  assert.equal(nl.activity.passed, true);

  // trans-boss: 1: bat, 2: Arm switch, 3: photo, 4: 60R, 5: T1, 6: T2, 7: Guard lamp, 8: rail
  const boss = bench('trans-boss');
  boss.wire('1:0', '3:0'); boss.wire('3:1', '5:1');
  boss.wire('1:0', '4:0'); boss.wire('4:1', '5:0'); boss.wire('5:0', '6:1');
  boss.wire('1:0', '2:0'); boss.wire('2:1', '7:0'); boss.wire('7:1', '6:0');
  for (const [arm, lux] of [[false, 100], [false, 0], [true, 100], [true, 0]]) {
    boss.parts[1].closed = arm;
    boss.parts[2].lux = lux;
    const res = boss.settle();
    assert.equal(Math.abs(res.currents.p7 || 0) > 0.025, arm && lux === 0);
  }
  assert.equal(boss.activity.passed, true);
});

test('Chapter 5 Transistors metadata, diagrams, guides, and toolbelt unlock validate cleanly', () => {
  assert.equal(transistorActivities.length, 8);
  assert.equal(transistorActivities.at(-1).challenge, true);

  const swIdx = LEVELS.findIndex(l => l.id === 'trans-switch');
  assert.ok(unlockedToolbelt([swIdx], LEVELS, true).has('transistor'));

  for (const l of transistorActivities) {
    assert.ok(!`${l.title} ${l.goal} ${l.hint} ${l.ending}`.includes('—'), `Em dash in ${l.id}`);
    const svg = diagram(l.diagram);
    assert.ok(svg.includes('class="circuit-diagram"') && (l.challenge ? svg.includes('Arm') && svg.includes('Dark') : svg.includes('>+') && svg.includes('>−')), `${l.id} diagram issue`);
    const idx = LEVELS.findIndex(item => item.id === l.id);
    assert.ok(idx >= 0, `${l.id} missing from LEVELS`);
    assert.ok(LESSONS[idx].length >= 2, `${l.id} missing teaching guide`);
    for (const s of LESSONS[idx]) assert.ok(!`${s.title} ${s.text}`.includes('—'));
  }
});
