import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LEVELS, solveCircuit, applyStep } from '../src/circuit.js';
import { activities, conditions, freshActivity, measureActivity } from '../src/activities.js';
import { starterBoard } from '../src/units.js';
import { canAccessLevel, LESSONS } from '../src/lessons.js';
import { diagram } from '../src/visuals.js';
import { COMPONENT_GUIDES } from '../src/component-guide.js';
import { makeUnitPart, unitRoom, updateDeviceVisual } from '../src/unit-scenes.js';
import { createActivityScene } from '../src/activity-scenes.js';
import { masterActivities, masterProgress } from '../src/master.js';

function bench(id, extraParts = [], initialWires = null) {
  const lesson = activities.find(l => l.id === id);
  const starter = starterBoard(lesson);
  const parts = [...starter.parts, ...extraParts];
  const wires = initialWires ? [...initialWires] : [...starter.wires];
  const activity = freshActivity();
  const wire = (a, b) => wires.push({ a, b });
  function tick(dt = 0.05, powered = true) {
    const env = conditions(parts, activity, id);
    let s = solveCircuit(parts, wires, powered ? dt : 0, env);
    if (powered && Object.keys(s.nextFuses || {}).length) {
      for (const p of parts) if (s.nextFuses[p.id]?.blown) p.blown = true;
      s = solveCircuit(parts, wires, 0, env);
    }
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

test('all 7 Master Challenges exist, unlock without prerequisites, and avoid em dashes', () => {
  assert.equal(masterActivities.length, 7);
  assert.deepEqual(masterActivities.map(l => l.code), ['1', '1.1', '2', '3', '4', '5', '5.1']);
  for (const level of masterActivities) {
    const idx = LEVELS.indexOf(level);
    assert.ok(idx >= 0, `${level.id} missing from LEVELS`);
    assert.equal(canAccessLevel(idx, [], false), true, `${level.id} should be directly accessible`);
    assert.ok(diagram(level.diagram).includes('circuit-diagram'), `${level.id} missing diagram`);
    assert.ok(LESSONS[idx]?.length >= 1, `${level.id} missing LESSONS entry`);
    assert.ok(!`${level.title} ${level.goal} ${level.hint} ${level.ending}`.includes('—'), `Em dash found in ${level.id}`);
  }
  assert.ok(COMPONENT_GUIDES.cannon);
  assert.ok(!JSON.stringify(COMPONENT_GUIDES.cannon).includes('—'));
});

test('Challenge 1 (Basketball) & 1.1 (Free Throw) enforce belt return, voltage aim, and 10 consecutive swishes', () => {
  const b1 = bench('mc-basketball');
  assert.equal(b1.parts.length, 3);
  assert.deepEqual(b1.parts.map(p => p.kind), ['battery', 'cannon', 'motor']);
  assert.equal(b1.parts[1].fixed, true);
  assert.equal(b1.parts[1].locked, true);
  assert.deepEqual([b1.parts[1].x, b1.parts[1].z], [-5.5, -6]);
  assert.equal(b1.lesson.trayParts.includes('battery'), false);
  assert.equal(b1.lesson.trayParts.includes('cannon'), false);
  assert.equal(b1.lesson.trayParts.includes('motor'), false);

  // Challenge 1: potentiometer wiper = 0.3 -> r1w=30, rw2=70 -> 4.2 V + motor forward -> 10 baskets
  const potRun = bench('mc-basketball', [{ id: 'pot1', kind: 'pot', wiper: 0.3 }]);
  potRun.wire('p1:0', 'pot1:0');
  potRun.wire('p1:1', 'pot1:2');
  potRun.wire('pot1:1', 'p2:0');
  potRun.wire('p2:1', 'p1:1');
  potRun.wire('p1:0', 'p3:0');
  potRun.wire('p3:1', 'p1:1');
  for (let i = 0; i < 650; i++) potRun.tick(0.05);
  assert.equal(potRun.activity.passed, true);
  assert.ok(potRun.activity.mc.streak >= 10);
  assert.ok(potRun.tick(0.05).designReading.includes('Belt ← OK'));

  // Direct battery -> cannon bricks and triggers short during discharge (cannot pass)
  const rawShort = bench('mc-basketball');
  rawShort.wire('p1:0', 'p2:0');
  rawShort.wire('p2:1', 'p1:1');
  rawShort.wire('p1:0', 'p3:0');
  rawShort.wire('p3:1', 'p1:1');
  let sawShort = false;
  for (let i = 0; i < 60; i++) {
    const s = rawShort.tick(0.05);
    if (s.short) sawShort = true;
  }
  assert.equal(sawShort, true);
  assert.equal(rawShort.activity.passed, false);

  // Unpowered belt stops after 3 shots (magazine empties)
  const offBelt = bench('mc-basketball', [{ id: 'pot1', kind: 'pot', wiper: 0.3 }]);
  offBelt.wire('p1:0', 'pot1:0');
  offBelt.wire('p1:1', 'pot1:2');
  offBelt.wire('pot1:1', 'p2:0');
  offBelt.wire('p2:1', 'p1:1');
  for (let i = 0; i < 650; i++) offBelt.tick(0.05);
  assert.equal(offBelt.activity.passed, false);
  assert.equal(offBelt.activity.mc.totalMade, 3);
  assert.ok(offBelt.tick(0.05).designReading.includes('Belt OFF'));

  // Reversed motor runs out of 3-ball magazine (max 3 baskets)
  const revBelt = bench('mc-basketball', [{ id: 'pot1', kind: 'pot', wiper: 0.3 }]);
  revBelt.wire('p1:0', 'pot1:0');
  revBelt.wire('p1:1', 'pot1:2');
  revBelt.wire('pot1:1', 'p2:0');
  revBelt.wire('p2:1', 'p1:1');
  revBelt.wire('p1:0', 'p3:1');
  revBelt.wire('p3:0', 'p1:1');
  for (let i = 0; i < 650; i++) revBelt.tick(0.05);
  assert.equal(revBelt.activity.passed, false);
  assert.equal(revBelt.activity.mc.totalMade, 3);
  assert.ok(revBelt.tick(0.05).designReading.includes('Belt → REV'));

  // Challenge 1.1: RC combo (20 ohm resistor + 0.1 F capacitor across cannon) hits ~4.25 V at 2.4 s
  const rcRun = bench('mc-basketball-raw', [
    { id: 'r1', kind: 'resistor', resistance: 20 },
    { id: 'c1', kind: 'capacitor', capacitance: 0.1 }
  ]);
  assert.equal(rcRun.parts.filter(p => !p.id.startsWith('r') && !p.id.startsWith('c')).length, 3);
  assert.equal(rcRun.lesson.trayParts.includes('pot'), false);
  rcRun.wire('p1:0', 'r1:0');
  rcRun.wire('r1:1', 'c1:0');
  rcRun.wire('c1:1', 'p1:1');
  rcRun.wire('c1:0', 'p2:0');
  rcRun.wire('c1:1', 'p2:1');
  rcRun.wire('p1:0', 'p3:0');
  rcRun.wire('p3:1', 'p1:1');
  for (let i = 0; i < 650; i++) rcRun.tick(0.05);
  assert.equal(rcRun.activity.passed, true);

  // Default 30 ohm RC is too slow -> airball ('short')
  const slowRc = bench('mc-basketball-raw', [
    { id: 'r1', kind: 'resistor', resistance: 30 },
    { id: 'c1', kind: 'capacitor', capacitance: 0.1 }
  ]);
  slowRc.wire('p1:0', 'r1:0');
  slowRc.wire('r1:1', 'c1:0');
  slowRc.wire('c1:1', 'p1:1');
  slowRc.wire('c1:0', 'p2:0');
  slowRc.wire('c1:1', 'p2:1');
  slowRc.wire('p1:0', 'p3:0');
  slowRc.wire('p3:1', 'p1:1');
  for (let i = 0; i < 120; i++) slowRc.tick(0.05);
  assert.equal(slowRc.activity.passed, false);
  assert.equal(slowRc.activity.mc.lastOutcome, 'short');

  // Too-small 10 ohm RC overshoots -> brick
  const fastRc = bench('mc-basketball-raw', [
    { id: 'r1', kind: 'resistor', resistance: 10 },
    { id: 'c1', kind: 'capacitor', capacitance: 0.1 }
  ]);
  fastRc.wire('p1:0', 'r1:0');
  fastRc.wire('r1:1', 'c1:0');
  fastRc.wire('c1:1', 'p1:1');
  fastRc.wire('c1:0', 'p2:0');
  fastRc.wire('c1:1', 'p2:1');
  fastRc.wire('p1:0', 'p3:0');
  fastRc.wire('p3:1', 'p1:1');
  for (let i = 0; i < 120; i++) fastRc.tick(0.05);
  assert.equal(fastRc.activity.passed, false);
  assert.equal(fastRc.activity.mc.lastOutcome, 'brick');
});

test('Challenge 2 (Bulbtown) requires exact 0.125 A via nested 20 ohm bulb network', () => {
  // Reject 3 series bulbs (0.100 A)
  const simple = bench('mc-bulbtown', [{ id: 'x1', kind: 'lamp' }]);
  simple.wire('p1:0', 'p2:0');
  simple.wire('p2:1', 'x1:0');
  simple.wire('x1:1', 'p1:1');
  simple.tick();
  assert.equal(simple.activity.passed, false);

  // 5 extra bulbs: target + l1 + (l2 || l3 || (l4 + l5)) = 20 + 20 + 8 = 48 ohm -> 0.125 A
  const extras = ['l1', 'l2', 'l3', 'l4', 'l5'].map(id => ({ id, kind: 'lamp' }));
  const b = bench('mc-bulbtown', extras);
  b.wire('p1:0', 'p2:0');
  b.wire('p2:1', 'l1:0');
  b.wire('l1:1', 'l2:0');
  b.wire('l1:1', 'l3:0');
  b.wire('l1:1', 'l4:0');
  b.wire('l4:1', 'l5:0');
  b.wire('l2:1', 'p1:1');
  b.wire('l3:1', 'p1:1');
  b.wire('l5:1', 'p1:1');
  const s = b.tick();
  assert.ok(Math.abs(s.currents.p2 - 0.125) < 0.0001);
  assert.equal(b.activity.passed, true);
});

test('Challenge 3 (Flip-Proof) passes with 4-diode bridge rectifier and rejects half-wave diode', () => {
  const halfWave = bench('mc-flip-proof', [{ id: 'd1', kind: 'diode' }]);
  halfWave.wire('p1:0', 'd1:0');
  halfWave.wire('d1:1', 'p2:0');
  halfWave.wire('p2:1', 'p1:1');
  for (let i = 0; i < 200; i++) halfWave.tick(0.05);
  assert.equal(halfWave.activity.passed, false);

  const diodes = ['d1', 'd2', 'd3', 'd4'].map(id => ({ id, kind: 'diode' }));
  const bridge = bench('mc-flip-proof', diodes);
  // AC+ = p1:0, AC- = p1:1; DC+ = p2:0, DC- = p2:1
  bridge.wire('p1:0', 'd1:0'); bridge.wire('d1:1', 'p2:0');
  bridge.wire('p1:1', 'd2:0'); bridge.wire('d2:1', 'p2:0');
  bridge.wire('p2:1', 'd3:0'); bridge.wire('d3:1', 'p1:0');
  bridge.wire('p2:1', 'd4:0'); bridge.wire('d4:1', 'p1:1');
  for (let i = 0; i < 180; i++) bridge.tick(0.05);
  assert.equal(bridge.activity.passed, true);
});

test('Challenge 4 (Full adder) passes all 8 binary input states with 5 gates', () => {
  const gates = [
    { id: 'g1', kind: 'gate', gateMode: 'XOR', outputHigh: false },
    { id: 'g2', kind: 'gate', gateMode: 'AND', outputHigh: false },
    { id: 'g3', kind: 'gate', gateMode: 'XOR', outputHigh: false },
    { id: 'g4', kind: 'gate', gateMode: 'AND', outputHigh: false },
    { id: 'g5', kind: 'gate', gateMode: 'OR', outputHigh: false }
  ];
  const b = bench('mc-full-adder', gates);
  // Power switches A, B, Cin
  b.wire('p1:0', 'p2:0'); b.wire('p1:0', 'p3:0'); b.wire('p1:0', 'p4:0');
  // Ground gates & lamps via bus bar p7
  for (const g of gates) b.wire(g.id + ':3', 'p7:1');
  b.wire('p5:1', 'p7:2');
  b.wire('p6:1', 'p7:3');
  // Half adder 1: A, B -> g1 (XOR), g2 (AND)
  b.wire('p2:1', 'g1:0'); b.wire('p3:1', 'g1:1');
  b.wire('p2:1', 'g2:0'); b.wire('p3:1', 'g2:1');
  // Half adder 2: g1, Cin -> g3 (Sum -> p5), g4 (AND)
  b.wire('g1:2', 'g3:0'); b.wire('p4:1', 'g3:1');
  b.wire('g1:2', 'g4:0'); b.wire('p4:1', 'g4:1');
  b.wire('g3:2', 'p5:0');
  // Carry out: g2 OR g4 -> g5 -> p6
  b.wire('g2:2', 'g5:0'); b.wire('g4:2', 'g5:1');
  b.wire('g5:2', 'p6:0');

  for (let mask = 0; mask < 8; mask++) {
    b.parts[1].closed = !!(mask & 1);
    b.parts[2].closed = !!(mask & 2);
    b.parts[3].closed = !!(mask & 4);
    b.settle(5);
  }
  assert.equal(b.activity.passed, true);
});

test('Challenge 5 (Sacrifice) & 5.1 (Double Sacrifice) latch cleanly via deliberate fuse shorts', () => {
  // Challenge 5: fuse across Target lamp behind 20 ohm resistor; button shorts battery + to fuse top
  const b5 = bench('mc-sacrifice', [
    { id: 'f1', kind: 'fuse', fuseRating: 0.35, blown: false },
    { id: 'r1', kind: 'resistor', resistance: 20 }
  ]);
  b5.wire('p1:0', 'r1:0');
  b5.wire('r1:1', 'p2:0');
  b5.wire('r1:1', 'f1:0');
  b5.wire('p2:1', 'p1:1');
  b5.wire('f1:1', 'p1:1');
  b5.wire('p1:0', 'p3:0');
  b5.wire('p3:1', 'f1:0');

  const idle5 = b5.tick();
  assert.equal(idle5.short, false);
  assert.ok(idle5.currents.p2 < 0.01);
  assert.equal(b5.activity.passed, false);

  b5.parts[2].closed = true;
  const press5 = b5.tick();
  assert.equal(press5.short, false);
  assert.equal(b5.parts[3].blown, true);

  b5.parts[2].closed = false;
  const done5 = b5.tick();
  assert.ok(Math.abs(done5.currents.p2 - 0.15) < 0.002);
  assert.equal(b5.activity.passed, true);

  // Challenge 5.1: Lamp 1 via Fuse 1; Lamp 2 bypassed by Fuse 2 + 20 ohm resistor; button shorts f1:1 to f2:0
  const b51 = bench('mc-double-sacrifice', [
    { id: 'f1', kind: 'fuse', fuseRating: 0.35, blown: false },
    { id: 'f2', kind: 'fuse', fuseRating: 0.35, blown: false },
    { id: 'r1', kind: 'resistor', resistance: 20 }
  ]);
  b51.wire('p1:0', 'f1:0'); b51.wire('f1:1', 'p2:0'); b51.wire('p2:1', 'p1:1');
  b51.wire('p1:0', 'r1:0'); b51.wire('r1:1', 'p3:0'); b51.wire('r1:1', 'f2:0');
  b51.wire('p3:1', 'p1:1'); b51.wire('f2:1', 'p1:1');
  b51.wire('f1:1', 'p4:0'); b51.wire('p4:1', 'f2:0');

  const idle51 = b51.tick();
  assert.equal(idle51.short, false);
  assert.ok(idle51.currents.p2 > 0.25);
  assert.ok(idle51.currents.p3 < 0.01);

  b51.parts[3].closed = true;
  const press51 = b51.tick();
  assert.equal(press51.short, false);
  assert.equal(b51.parts[4].blown, true);
  assert.equal(b51.parts[5].blown, true);

  b51.parts[3].closed = false;
  const done51 = b51.tick();
  assert.ok(Math.abs(done51.currents.p2 || 0) < 0.001);
  assert.ok(Math.abs(done51.currents.p3 - 0.15) < 0.002);
  assert.equal(b51.activity.passed, true);
});

test('Proving Ground room, Ball cannon, Basketball Court 3D fixture, and masterProgress build and dispose cleanly', () => {
  const room = unitRoom('proving');
  assert.ok(room && room.texture && typeof room.draw === 'function');
  room.dispose();

  const scene = new THREE.Scene();
  const lesson = activities.find(l => l.id === 'mc-basketball');
  const fixture = createActivityScene(lesson, scene);
  assert.ok(fixture && scene.children.length === 1);

  const cannonPart = { id: 'c1', kind: 'cannon', x: 0, z: 0, discharging: false };
  const cg = new THREE.Group();
  makeUnitPart(cannonPart, cg);
  scene.add(cg);

  updateDeviceVisual(cannonPart, { voltages: { 'c1:0': 4.1, 'c1:1': 0 }, currents: {} }, {}, true, 0.05);
  cannonPart.discharging = true;
  updateDeviceVisual(cannonPart, { voltages: { 'c1:0': 0, 'c1:1': 0 }, currents: {} }, {}, true, 0.05);

  const motorPart = { id: 'p3', kind: 'motor', x: 5.5, z: 1.5, rotation: 0 };
  const mg = new THREE.Group();
  makeUnitPart(motorPart, mg);
  scene.add(mg);

  const mockActivity = {
    mc: {
      ammo: 2,
      streak: 3,
      beltOffset: 0.4,
      balls: [{ phase: 'flight', t: 0.5, shotV: 4.1, outcome: 'swish' }, { phase: 'belt', u: 0.3 }, { phase: 'belt', u: -0.1 }],
      lastArc: { shotV: 4.1, outcome: 'swish' }
    }
  };
  fixture.update(mockActivity, [cannonPart, motorPart], { voltages: { 'p3:0': 6, 'p3:1': 0 }, currents: { p3: 0.2 }, short: false }, true);
  fixture.update(mockActivity, [cannonPart], { voltages: {}, currents: {}, short: false }, false);

  scene.traverse(obj => {
    for (const v of [...obj.position.toArray(), ...obj.quaternion.toArray()]) {
      assert.ok(Number.isFinite(v));
    }
  });
  fixture.dispose();
  assert.equal(scene.children.length, 2);

  const idx1 = LEVELS.findIndex(l => l.id === 'mc-basketball');
  const p = masterProgress([idx1], LEVELS);
  assert.equal(p.doneCount, 1);
  assert.equal(p.totalCount, 7);
});
