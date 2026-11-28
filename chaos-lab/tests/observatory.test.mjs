import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LEVELS, solveCircuit, applyStep } from '../src/circuit.js';
import { activities, conditions, freshActivity, measureActivity } from '../src/activities.js';
import { starterBoard } from '../src/units.js';
import { makeUnitPart, updateDeviceVisual } from '../src/unit-scenes.js';
import { createActivityScene } from '../src/activity-scenes.js';
import { createFirstLightScene, FIRST_LIGHT_DURATION } from '../src/first-light.js';
import { diagram } from '../src/visuals.js';
import {
  FREE_BUILD_BASE_PARTS,
  FREE_BUILD_PARTS,
  unlockedToolbelt,
  mainframeProgress,
  mainframeBlueprintSvg
} from '../src/observatory.js';

function bench(id, customParts = null, customWires = null) {
  const lesson = activities.find(l => l.id === id);
  const starter = starterBoard(lesson);
  const parts = customParts ?? starter.parts;
  const wires = customWires ?? starter.wires;
  const activity = freshActivity();
  function wire(from, to) {
    wires.push({ a: 'p' + from, b: 'p' + to });
  }
  function tick(dt = 0.05, powered = true) {
    const env = conditions(parts, activity, id);
    let s = solveCircuit(parts, wires, powered ? dt : 0, env);
    if (powered && !s.short) {
      if (applyStep(parts, s)) {
        s = solveCircuit(parts, wires, 0, env);
      }
    }
    measureActivity(lesson, parts, wires, s, activity, powered, dt);
    return s;
  }
  function settle(steps = 5, dt = 0.05) {
    let s;
    for (let i = 0; i < steps; i++) s = tick(dt, true);
    return s;
  }
  return { lesson, parts, wires, activity, wire, tick, settle };
}

test('connected-component solver matches multi-branch LED circuits and scales on a 20-gate chain', () => {
  const parts = [
    { id: 'b', kind: 'battery' },
    { id: 'l', kind: 'lamp' },
    { id: 'd', kind: 'led' },
    { id: 'r', kind: 'resistor', resistance: 80 }
  ];
  const wires = [
    { a: 'b:0', b: 'l:0' }, { a: 'l:1', b: 'b:1' },
    { a: 'b:0', b: 'r:0' }, { a: 'r:1', b: 'd:0' }, { a: 'd:1', b: 'b:1' }
  ];
  const s = solveCircuit(parts, wires);
  assert.ok(Math.abs(s.currents.l - 0.3) < 0.001);
  assert.ok(Math.abs(s.currents.d - 0.04) < 0.001);

  const chainParts = [{ id: 'b', kind: 'battery' }, { id: 's', kind: 'switch', closed: true }];
  const chainWires = [{ a: 'b:0', b: 's:0' }];
  for (let i = 0; i < 20; i++) {
    chainParts.push({ id: 'g' + i, kind: 'gate', gateMode: 'NOT', outputHigh: false });
    chainWires.push({ a: 'g' + i + ':3', b: 'b:1' });
    chainWires.push({ a: i === 0 ? 's:1' : 'g' + (i - 1) + ':2', b: 'g' + i + ':0' });
  }
  const t0 = performance.now();
  for (let step = 0; step < 30; step++) {
    const res = solveCircuit(chainParts, chainWires, 0.05);
    applyStep(chainParts, res);
  }
  const elapsed = performance.now() - t0;
  assert.ok(elapsed < 500, `20-gate chain took ${elapsed} ms`);
  assert.equal(chainParts.at(-1).outputHigh, true);
  assert.equal(chainParts.at(-2).outputHigh, false);
});

test('coil relay hysteresis and relay-inverter pass/reject cases work accurately', () => {
  const b = bench('relay-inverter');
  // Wire switch -> coil A, coil B -> battery -, battery + -> coil C, coil NC -> lamp 0
  b.wire('2:1', '3:0');
  b.wire('3:1', '1:1');
  b.wire('1:0', '3:2');
  b.wire('3:3', '4:0');

  // Open switch: lamp on, coil idle
  let s = b.settle(4);
  assert.equal(b.parts[2].energized, false);
  assert.ok(s.currents.p4 > 0.25);
  assert.equal(b.activity.passed, false);

  // Close switch: coil picks up after delay, NC opens, lamp goes dark
  b.parts[1].closed = true;
  s = b.settle(4);
  assert.equal(b.parts[2].energized, true);
  assert.ok(Math.abs(s.currents.p4 || 0) < 0.001);
  assert.equal(b.activity.passed, true);

  // Reject a circuit that keeps the lamp on when the switch closes
  const bad = bench('relay-inverter');
  bad.wire('2:1', '3:0');
  bad.wire('3:1', '1:1');
  bad.wire('1:0', '4:0');
  bad.settle(4);
  bad.parts[1].closed = true;
  bad.settle(4);
  assert.equal(bad.activity.passed, false);
});

test('relay-nand passes with both 1-relay and 2-relay topologies and rejects non-relay shortcut', () => {
  // 1-relay series switches
  const single = bench('relay-nand');
  single.wire('6:1', '2:0');
  single.wire('2:1', '3:0');
  single.wire('3:1', '4:0');
  single.wire('4:1', '1:1');
  single.wire('6:2', '4:2');
  single.wire('4:3', '5:0');
  single.wire('5:1', '1:1');

  for (const [a, b] of [[false, false], [true, false], [false, true], [true, true]]) {
    single.parts[1].closed = a;
    single.parts[2].closed = b;
    single.settle(4);
  }
  assert.equal(single.activity.passed, true);

  // 2-relay parallel NC contacts
  const twoCoil = bench('relay-nand');
  twoCoil.parts.push({ id: 'p7', kind: 'coil', x: 1, z: -2 });
  twoCoil.wire('6:1', '2:0');
  twoCoil.wire('2:1', '4:0');
  twoCoil.wire('4:1', '1:1');
  twoCoil.wire('6:2', '3:0');
  twoCoil.wire('3:1', '7:0');
  twoCoil.wire('7:1', '1:1');
  twoCoil.wire('6:3', '4:2');
  twoCoil.wire('6:3', '7:2');
  twoCoil.wire('4:3', '5:0');
  twoCoil.wire('7:3', '5:0');
  twoCoil.wire('5:1', '1:1');
  for (const [a, b] of [[false, false], [true, false], [false, true], [true, true]]) {
    twoCoil.parts[1].closed = a;
    twoCoil.parts[2].closed = b;
    twoCoil.settle(4);
  }
  assert.equal(twoCoil.activity.passed, true);

  // Non-relay direct lamp wire must not pass
  const shortcut = bench('relay-nand');
  shortcut.wire('6:1', '5:0');
  shortcut.wire('5:1', '1:1');
  for (const [a, b] of [[false, false], [true, false], [false, true], [true, true]]) {
    shortcut.parts[1].closed = a;
    shortcut.parts[2].closed = b;
    shortcut.settle(4);
  }
  assert.equal(shortcut.activity.passed, false);
});

test('relay-clock self-oscillates via its NC contact both bare and with capacitor', () => {
  const bare = bench('relay-clock');
  bare.wire('2:3', '2:0');
  bare.wire('2:1', '1:1');
  bare.wire('2:0', '4:0');
  bare.wire('4:1', '2:1');
  for (let i = 0; i < 30; i++) bare.tick(0.05);
  assert.equal(bare.activity.passed, true);

  const damped = bench('relay-clock');
  damped.wire('2:3', '2:0');
  damped.wire('2:1', '1:1');
  damped.wire('2:0', '3:0');
  damped.wire('3:1', '2:1');
  damped.wire('2:0', '4:0');
  damped.wire('4:1', '2:1');
  for (let i = 0; i < 60; i++) damped.tick(0.05);
  assert.equal(damped.activity.passed, true);
});

test('relay-latch requires latching feedback through NO and clearing via Reset', () => {
  // Missing NO feedback should fail to stay latched
  const unlatched = bench('relay-latch');
  unlatched.wire('6:1', '3:0');
  unlatched.wire('3:1', '4:0');
  unlatched.wire('4:1', '1:1');
  unlatched.wire('4:0', '5:0');
  unlatched.wire('5:1', '1:1');
  unlatched.settle(3);
  unlatched.parts[2].closed = true;
  unlatched.settle(4);
  unlatched.parts[2].closed = false;
  unlatched.settle(4);
  assert.equal(unlatched.activity.passed, false);

  // Full self-latching relay circuit passes full cycle
  const b = bench('relay-latch');
  b.wire('6:1', '3:0');
  b.wire('3:1', '4:0');
  b.wire('6:2', '4:2');
  b.wire('4:4', '4:0');
  b.wire('4:1', '1:1');
  b.wire('4:0', '5:0');
  b.wire('5:1', '1:1');

  b.settle(2);
  b.parts[2].closed = true; // Press Set
  b.settle(4);
  b.parts[2].closed = false; // Release Set -> stays latched
  b.settle(4);
  assert.equal(b.parts[3].energized, true);
  b.parts[1].closed = false; // Open Reset -> clears
  b.settle(4);
  assert.equal(b.parts[3].energized, false);
  b.parts[1].closed = true; // Close Reset -> stays clear
  b.settle(4);
  assert.equal(b.activity.passed, true);
});

test('half-adder adds all four binary input combinations using XOR and AND gates', () => {
  const b = bench('half-adder');
  b.wire('1:0', '2:0');
  b.wire('1:0', '3:0');
  b.wire('2:1', '4:0');
  b.wire('2:1', '5:0');
  b.wire('3:1', '4:1');
  b.wire('3:1', '5:1');
  b.wire('4:2', '6:0');
  b.wire('5:2', '7:0');
  b.wire('6:1', '8:3');
  b.wire('7:1', '8:3');

  for (const [a, bitB] of [[false, false], [true, false], [false, true], [true, true]]) {
    b.parts[1].closed = a;
    b.parts[2].closed = bitB;
    b.settle(4);
  }
  assert.equal(b.activity.passed, true);
  assert.ok(b.settle(1).designReading.includes('00✓ 01✓ 10✓ 11✓'));

  // Swapped Sum/Carry on labelled lamps fails and emits a diagnostic hint
  const swapped = bench('half-adder');
  swapped.wire('1:0', '2:0');
  swapped.wire('1:0', '3:0');
  swapped.wire('2:1', '4:0');
  swapped.wire('2:1', '5:0');
  swapped.wire('3:1', '4:1');
  swapped.wire('3:1', '5:1');
  swapped.wire('4:2', '7:0'); // XOR -> Carry
  swapped.wire('5:2', '6:0'); // AND -> Sum
  swapped.wire('6:1', '8:3');
  swapped.wire('7:1', '8:3');
  swapped.parts[1].closed = true;
  swapped.parts[2].closed = false;
  const swapRes = swapped.settle(4);
  assert.equal(swapped.activity.passed, false);
  assert.ok(swapRes.designReading.includes('Swap Sum & Carry'));

  // Replacing Bit A / Sum without roles still distinguishes switches and lamps
  const unlabelled = bench('half-adder');
  delete unlabelled.parts[1].role;
  delete unlabelled.parts[5].role;
  unlabelled.wire('1:0', '2:0');
  unlabelled.wire('1:0', '3:0');
  unlabelled.wire('2:1', '4:0');
  unlabelled.wire('2:1', '5:0');
  unlabelled.wire('3:1', '4:1');
  unlabelled.wire('3:1', '5:1');
  unlabelled.wire('4:2', '6:0');
  unlabelled.wire('5:2', '7:0');
  unlabelled.wire('6:1', '8:3');
  unlabelled.wire('7:1', '8:3');
  for (const [a, bitB] of [[false, false], [true, false], [false, true], [true, true]]) {
    unlabelled.parts[1].closed = a;
    unlabelled.parts[2].closed = bitB;
    unlabelled.settle(4);
  }
  assert.equal(unlabelled.activity.passed, true);
});

test('NOT gate evaluates only input A and ignores pin B', () => {
  const bat = { id: 'b', kind: 'battery' };
  const g = { id: 'g', kind: 'gate', gateMode: 'NOT', outputHigh: true };
  const s = solveCircuit([bat, g], [{ a: 'g:3', b: 'b:1' }, { a: 'g:1', b: 'b:0' }], 0.05);
  applyStep([bat, g], s);
  assert.equal(g.outputHigh, true);
});

test('mainframe-boot passes with both 2-bit ripple and synchronous counters', () => {
  // 2-bit ripple counter from starter board
  const ripple = bench('mainframe-boot');
  ripple.wire('1:0', '2:1'); // clock -> Bit 1 CK
  ripple.wire('2:2', '3:0'); // Bit 1 Q -> NOT 1 A
  ripple.wire('3:2', '2:0'); // NOT 1 Q -> Bit 1 D
  ripple.wire('3:2', '4:1'); // NOT 1 Q -> Bit 2 CK
  ripple.wire('4:2', '5:0'); // Bit 2 Q -> NOT 2 A
  ripple.wire('5:2', '4:0'); // NOT 2 Q -> Bit 2 D
  ripple.wire('2:2', '6:0'); // Bit 1 Q -> readout 1
  ripple.wire('4:2', '6:1'); // Bit 2 Q -> readout 2

  for (let i = 0; i < 85; i++) ripple.tick(0.05);
  assert.equal(ripple.activity.passed, true);

  // 2-bit synchronous counter: D1 = ~Q1, D2 = Q1 XOR Q2, both clocked by clock
  const sync = bench('mainframe-boot');
  sync.parts[4].gateMode = 'XOR';
  sync.parts[4].outputHigh = false;
  sync.wire('1:0', '2:1'); // clock -> Bit 1 CK
  sync.wire('1:0', '4:1'); // clock -> Bit 2 CK
  sync.wire('2:2', '3:0'); // Q1 -> NOT 1 A
  sync.wire('3:2', '2:0'); // NOT 1 Q -> Bit 1 D
  sync.wire('2:2', '5:0'); // Q1 -> XOR A
  sync.wire('4:2', '5:1'); // Q2 -> XOR B
  sync.wire('5:2', '4:0'); // XOR Q -> Bit 2 D
  sync.wire('2:2', '6:0'); // Q1 -> readout 1
  sync.wire('4:2', '6:1'); // Q2 -> readout 2

  for (let i = 0; i < 85; i++) sync.tick(0.05);
  assert.equal(sync.activity.passed, true);
});

test('Toolbelt unlocks, Mainframe progress, and Blueprint SVG track completion accurately', () => {
  const guestEmpty = unlockedToolbelt([], LEVELS, false);
  assert.deepEqual([...guestEmpty], FREE_BUILD_BASE_PARTS);
  const signedIn = unlockedToolbelt([], LEVELS, true);
  assert.deepEqual([...signedIn], FREE_BUILD_BASE_PARTS);
  assert.equal(FREE_BUILD_PARTS.length, 27);

  const invIdx = LEVELS.findIndex(l => l.id === 'relay-inverter');
  const nandIdx = LEVELS.findIndex(l => l.id === 'relay-nand');
  const potIdx = LEVELS.findIndex(l => l.id === 'lib-pot');
  const bootIdx = LEVELS.findIndex(l => l.id === 'mainframe-boot');
  const lampFinal = LEVELS.findIndex(l => l.id === 'lamp-control-challenge');

  const partialBelt = unlockedToolbelt([invIdx, nandIdx, potIdx], LEVELS, false);
  assert.ok(partialBelt.has('coil') && partialBelt.has('rail') && partialBelt.has('gate') && partialBelt.has('pot'));
  assert.equal(partialBelt.has('latch'), false);

  const prog = mainframeProgress([lampFinal, invIdx, bootIdx], LEVELS);
  assert.equal(prog.feedsOnline, 1);
  assert.equal(prog.coresOnline, 1);
  assert.equal(prog.onlineCount, 2);
  assert.equal(prog.totalCount, 15);
  assert.equal(prog.coreBooted, true);

  const svg = mainframeBlueprintSvg(prog);
  assert.ok(svg.includes('bp-dome online') && svg.includes('2 of 15 systems online'));
});

test('3D Observatory cabinet and all 7 new part models build, update, and dispose cleanly', () => {
  const lesson = activities.find(l => l.id === 'mainframe-boot');
  const scene = new THREE.Scene();
  const fixture = createActivityScene(lesson, scene);
  assert.ok(fixture && scene.children.length === 1);

  const parts = ['coil', 'button', 'rail', 'gate', 'latch', 'clock', 'display'].map((kind, i) => ({
    id: 'p' + (i + 1),
    kind,
    x: i * 3,
    z: 0,
    energized: true,
    closed: true,
    gateMode: 'XOR',
    outputHigh: true,
    bit: 1,
    clockHz: 2,
    phase: 0.25,
    high: true
  }));

  for (const p of parts) {
    const g = new THREE.Group();
    makeUnitPart(p, g);
    scene.add(g);
  }

  const state = { voltages: {}, currents: {}, displayValues: { p7: 11 } };
  const prog = mainframeProgress([], LEVELS);
  for (const p of parts) updateDeviceVisual(p, state, {}, true, 0.05);
  fixture.update({}, parts, state, true, prog);

  scene.traverse(obj => {
    for (const value of [...obj.position.toArray(), ...obj.quaternion.toArray()]) {
      assert.ok(Number.isFinite(value));
    }
  });
  fixture.dispose();
  assert.equal(scene.children.length, 7);
});

test('Relay levels form Chapter 5 Relays ending with relay-boss, Motors has 8 levels, Logic Chips has 8 levels, and Memory & Counters has 6 levels', () => {
  const motorLevels = LEVELS.filter(l => l.unit === 'Motors');
  assert.equal(motorLevels.length, 8);
  assert.equal(motorLevels.at(-1).id, 'dispatch');

  const relayLevels = LEVELS.filter(l => l.unit === 'Relays');
  assert.equal(relayLevels.length, 5);
  assert.equal(relayLevels.at(-1).id, 'relay-boss');
  assert.equal(relayLevels.at(-1).challenge, true);
  for (const id of ['relay-inverter', 'relay-nand', 'relay-clock', 'relay-latch', 'relay-boss']) {
    assert.ok(relayLevels.some(l => l.id === id), `${id} missing from Relays`);
    const svg = diagram(id);
    assert.ok(
      svg.includes('class="circuit-diagram"') && (id === 'relay-boss' ? svg.includes('Tap Start') && svg.includes('Open Stop') : svg.includes('>+') && svg.includes('>−')),
      `${id} diagram issue`
    );
  }

  const logicLevels = LEVELS.filter(l => l.unit === 'Logic');
  assert.equal(logicLevels.length, 8);
  assert.equal(logicLevels.at(-1).id, 'logic-majority');
  for (const level of logicLevels) {
    assert.ok(!`${level.title} ${level.goal} ${level.hint} ${level.ending}`.includes('—'), `Em dash in ${level.id}`);
    const svg = diagram(level.diagram);
    assert.ok(svg.includes('class="circuit-diagram"') && (level.challenge ? svg.includes('Pass') : svg.includes('>+') && svg.includes('>−')), `${level.id} diagram issue`);
  }

  const obsLevels = LEVELS.filter(l => l.unit === 'Observatory');
  assert.equal(obsLevels.length, 6);
  assert.equal(obsLevels.at(-1).id, 'mainframe-boot');
  for (const level of obsLevels) {
    assert.ok(!`${level.title} ${level.goal} ${level.hint} ${level.ending}`.includes('—'), `Em dash in ${level.id}`);
    const svg = diagram(level.diagram);
    assert.ok(svg.includes('class="circuit-diagram"'), `${level.id} missing circuit-diagram`);
    if (level.id === 'mainframe-boot') {
      for (const token of ['CLK', '0', '1', '2', '3', 'Auto 2-bit count']) {
        assert.ok(svg.includes(token), `mainframe-boot missing ${token}`);
      }
    } else {
      assert.ok(svg.includes('>+'), `${level.id} missing battery +`);
      assert.ok(svg.includes('>−'), `${level.id} missing battery −`);
    }
  }
});

test('Observatory First Light cinema animates across all 5 acts, stays finite, avoids em dashes, and disposes cleanly', () => {
  const fl = createFirstLightScene({ onlineCount: 11, totalCount: 11 });
  assert.equal(FIRST_LIGHT_DURATION, 23);
  assert.equal(fl.state.phaseIndex, 0);
  assert.equal(fl.state.finished, false);

  const phasesSeen = new Set();
  let peakFlash = 0;
  for (let i = 0; i < 260; i++) {
    const s = fl.update(0.1);
    phasesSeen.add(s.phaseIndex);
    peakFlash = Math.max(peakFlash, s.flash);
    assert.ok(!s.eyebrow.includes('—') && !s.title.includes('—') && !s.sub.includes('—'));
  }

  assert.deepEqual([...phasesSeen].sort(), [0, 1, 2, 3, 4]);
  assert.ok(fl.state.shutterOpen > 0.99);
  assert.ok(fl.state.telescopePitch > 0.9);
  assert.ok(peakFlash > 0.2);
  assert.equal(fl.state.finished, true);

  fl.scene.traverse(obj => {
    for (const v of [...obj.position.toArray(), ...obj.quaternion.toArray(), ...fl.camera.position.toArray()]) {
      assert.ok(Number.isFinite(v));
    }
  });
  fl.dispose();
});

test('Chapter 6 Logic expansions (NAND-OR, 2-to-1 Mux, 2-bit Comparator, 3-bit Shift Register) pass valid circuits and reject invalid ones', () => {
  // 1. Universal NAND -> OR
  const nor = bench('logic-nand-or');
  nor.wire('1:0', '2:0'); nor.wire('1:0', '3:0');
  nor.wire('2:1', '4:0'); nor.wire('2:1', '4:1');
  nor.wire('3:1', '5:0'); nor.wire('3:1', '5:1');
  nor.wire('4:2', '6:0'); nor.wire('5:2', '6:1');
  nor.wire('6:2', '7:0');
  for (const [a, b] of [[false, false], [true, false], [false, true], [true, true]]) {
    nor.parts[1].closed = a; nor.parts[2].closed = b;
    const s = nor.settle(4);
    assert.equal(Math.abs(s.currents.p7 || 0) > 0.025, a || b);
  }
  assert.equal(nor.activity.passed, true);

  // Reject cheating with an OR gate mode on logic-nand-or
  const cheat = bench('logic-nand-or');
  cheat.parts[5].gateMode = 'OR';
  cheat.wire('1:0', '2:0'); cheat.wire('1:0', '3:0');
  cheat.wire('2:1', '6:0'); cheat.wire('3:1', '6:1'); cheat.wire('6:2', '7:0');
  for (const [a, b] of [[false, false], [true, false], [false, true], [true, true]]) {
    cheat.parts[1].closed = a; cheat.parts[2].closed = b;
    cheat.settle(4);
  }
  assert.equal(cheat.activity.passed, false);

  // 2. 2-to-1 Multiplexer
  const mux = bench('logic-mux');
  mux.wire('1:0', '2:0'); mux.wire('1:0', '3:0'); mux.wire('1:0', '4:0');
  mux.wire('2:1', '5:0'); // NOT(S)
  mux.wire('5:2', '6:0'); mux.wire('3:1', '6:1'); // ~S & A
  mux.wire('2:1', '7:0'); mux.wire('4:1', '7:1'); // S & B
  mux.wire('6:2', '8:0'); mux.wire('7:2', '8:1'); // OR
  mux.wire('8:2', '9:0');
  for (const sBit of [false, true]) {
    for (const aBit of [false, true]) {
      for (const bBit of [false, true]) {
        mux.parts[1].closed = sBit;
        mux.parts[2].closed = aBit;
        mux.parts[3].closed = bBit;
        const res = mux.settle(5);
        assert.equal(Math.abs(res.currents.p9 || 0) > 0.025, sBit ? bBit : aBit);
      }
    }
  }
  assert.equal(mux.activity.passed, true);

  // 3. 2-bit Equality Comparator
  const cmp = bench('logic-comparator');
  cmp.wire('1:0', '2:0'); cmp.wire('1:0', '3:0'); cmp.wire('1:0', '4:0'); cmp.wire('1:0', '5:0');
  cmp.wire('2:1', '6:0'); cmp.wire('4:1', '6:1'); // XOR(A1, B1)
  cmp.wire('3:1', '7:0'); cmp.wire('5:1', '7:1'); // XOR(A0, B0)
  cmp.wire('6:2', '8:0'); cmp.wire('7:2', '8:1'); // NOR
  cmp.wire('8:2', '9:0');
  const states = [
    [0, 0, 0, 0], [0, 1, 0, 1], [1, 0, 1, 0], [1, 1, 1, 1],
    [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]
  ];
  for (const [a1, a0, b1, b0] of states) {
    cmp.parts[1].closed = !!a1; cmp.parts[2].closed = !!a0;
    cmp.parts[3].closed = !!b1; cmp.parts[4].closed = !!b0;
    const res = cmp.settle(5);
    assert.equal(Math.abs(res.currents.p9 || 0) > 0.025, a1 === b1 && a0 === b0);
  }
  assert.equal(cmp.activity.passed, true);

  // 4. 3-bit Shift Register
  const sr = bench('logic-shift-reg');
  sr.wire('1:0', '2:0'); sr.wire('1:0', '3:0'); // + -> Data, + -> Step
  sr.wire('2:1', '4:0'); sr.wire('4:2', '5:0'); sr.wire('5:2', '6:0'); // Data -> S1 -> S2 -> S3
  sr.wire('3:1', '4:1'); sr.wire('3:1', '5:1'); sr.wire('3:1', '6:1'); // Step -> CKs
  sr.wire('4:2', '7:0'); sr.wire('5:2', '8:0'); sr.wire('6:2', '9:0'); // Qs -> Lamps
  sr.parts[1].closed = true; // Data = 1
  sr.settle(2); // Initial idle frame before pressing Step
  for (let pulse = 0; pulse < 3; pulse++) {
    sr.parts[2].closed = true;
    sr.settle(3);
    sr.parts[2].closed = false;
    sr.settle(3);
  }
  assert.equal(sr.parts[3].bit, 1);
  assert.equal(sr.parts[4].bit, 1);
  assert.equal(sr.parts[5].bit, 1);
  assert.equal(sr.activity.passed, true);

  // 5. Chapter 7 new logic levels: AND/OR, Lock, Splitter, Majority
  const ao = bench('logic-and-or');
  ao.wire('1:0', '2:0'); ao.wire('1:0', '3:0');
  ao.wire('2:1', '4:0'); ao.wire('3:1', '4:1');
  ao.wire('2:1', '5:0'); ao.wire('3:1', '5:1');
  ao.wire('4:2', '6:0'); ao.wire('5:2', '7:0');
  for (const [a, b] of [[false, false], [true, false], [false, true], [true, true]]) {
    ao.parts[1].closed = a; ao.parts[2].closed = b;
    const res = ao.settle(5);
    assert.equal(Math.abs(res.currents.p6 || 0) > 0.025, a && b);
    assert.equal(Math.abs(res.currents.p7 || 0) > 0.025, a || b);
  }
  assert.equal(ao.activity.passed, true);

  const lk = bench('logic-lock');
  lk.wire('1:0', '2:0'); lk.wire('1:0', '3:0');
  lk.wire('3:1', '4:0'); lk.wire('2:1', '5:0'); lk.wire('4:2', '5:1'); lk.wire('5:2', '6:0');
  for (const [a, b] of [[false, false], [true, false], [false, true], [true, true]]) {
    lk.parts[1].closed = a; lk.parts[2].closed = b;
    const res = lk.settle(5);
    assert.equal(Math.abs(res.currents.p6 || 0) > 0.025, a && !b);
  }
  assert.equal(lk.activity.passed, true);

  const sp = bench('logic-splitter');
  sp.wire('1:0', '2:0'); sp.wire('1:0', '3:0');
  sp.wire('3:1', '4:0');
  sp.wire('2:1', '5:0'); sp.wire('4:2', '5:1');
  sp.wire('2:1', '6:0'); sp.wire('3:1', '6:1');
  sp.wire('5:2', '7:0'); sp.wire('6:2', '8:0');
  for (const [p, r] of [[false, false], [true, false], [false, true], [true, true]]) {
    sp.parts[1].closed = p; sp.parts[2].closed = r;
    const res = sp.settle(5);
    assert.equal(Math.abs(res.currents.p7 || 0) > 0.025, p && !r);
    assert.equal(Math.abs(res.currents.p8 || 0) > 0.025, p && r);
  }
  assert.equal(sp.activity.passed, true);

  const maj = bench('logic-majority');
  maj.wire('1:0', '2:0'); maj.wire('1:0', '3:0'); maj.wire('1:0', '4:0');
  maj.wire('2:1', '5:0'); maj.wire('3:1', '5:1'); // A & B
  maj.wire('3:1', '6:0'); maj.wire('4:1', '6:1'); // B & C
  maj.wire('2:1', '7:0'); maj.wire('4:1', '7:1'); // A & C
  maj.wire('5:2', '8:0'); maj.wire('6:2', '8:1');
  maj.wire('8:2', '9:0'); maj.wire('7:2', '9:1');
  maj.wire('9:2', '10:0');
  for (const aBit of [false, true]) {
    for (const bBit of [false, true]) {
      for (const cBit of [false, true]) {
        maj.parts[1].closed = aBit; maj.parts[2].closed = bBit; maj.parts[3].closed = cBit;
        const res = maj.settle(6);
        assert.equal(Math.abs(res.currents.p10 || 0) > 0.025, (aBit + bBit + cBit) >= 2);
      }
    }
  }
  assert.equal(maj.activity.passed, true);

  // 6. Chapter 8 Memory & Counters: Save, Toggle, Runway Ring, Button Counter
  const sv = bench('mem-save');
  sv.wire('1:0', '2:0'); sv.wire('1:0', '3:0');
  sv.wire('2:1', '4:0'); sv.wire('3:1', '4:1'); sv.wire('4:2', '5:0');
  sv.settle(2);
  sv.parts[1].closed = true; sv.parts[2].closed = true; sv.settle(3);
  sv.parts[2].closed = false; sv.parts[1].closed = false; sv.settle(3);
  assert.equal(sv.parts[3].bit, 1);
  sv.parts[2].closed = true; sv.settle(3);
  sv.parts[2].closed = false; sv.settle(3);
  assert.equal(sv.parts[3].bit, 0);
  assert.equal(sv.activity.passed, true);

  const tg = bench('mem-toggle');
  tg.wire('1:0', '2:0'); tg.wire('2:1', '3:1');
  tg.wire('3:2', '4:0'); tg.wire('4:2', '3:0'); tg.wire('3:2', '5:0');
  tg.settle(2);
  for (let p = 0; p < 3; p++) {
    tg.parts[1].closed = true; tg.settle(3);
    tg.parts[1].closed = false; tg.settle(3);
  }
  assert.equal(tg.activity.passed, true);

  const rg = bench('mem-ring');
  rg.wire('1:0', '2:0'); rg.wire('1:0', '3:0');
  rg.wire('2:1', '4:0'); rg.wire('7:2', '4:1'); rg.wire('4:2', '5:0');
  rg.wire('5:2', '6:0'); rg.wire('6:2', '7:0');
  rg.wire('3:1', '5:1'); rg.wire('3:1', '6:1'); rg.wire('3:1', '7:1');
  rg.wire('5:2', '8:0'); rg.wire('6:2', '9:0'); rg.wire('7:2', '10:0');
  rg.settle(2);
  rg.parts[1].closed = true; rg.settle(2);
  rg.parts[2].closed = true; rg.settle(3);
  rg.parts[2].closed = false; rg.parts[1].closed = false; rg.settle(3);
  for (let step = 0; step < 3; step++) {
    rg.parts[2].closed = true; rg.settle(3);
    rg.parts[2].closed = false; rg.settle(3);
  }
  assert.equal(rg.activity.passed, true);

  const cnt = bench('mem-counter');
  cnt.wire('1:0', '2:0'); cnt.wire('2:1', '3:1');
  cnt.wire('3:2', '4:0'); cnt.wire('4:2', '3:0');
  cnt.wire('4:2', '5:1');
  cnt.wire('5:2', '6:0'); cnt.wire('6:2', '5:0');
  cnt.wire('3:2', '7:0'); cnt.wire('5:2', '7:1');
  cnt.settle(3);
  for (let p = 0; p < 3; p++) {
    cnt.parts[1].closed = true; cnt.settle(3);
    cnt.parts[1].closed = false; cnt.settle(3);
  }
  assert.equal(cnt.activity.passed, true);
});

test('relay-boss motor starter latches through NO, runs Machine, halts cleanly on Stop, and rejects non-latching builds', () => {
  const b = bench('relay-boss');
  b.wire('1:0', '4:2'); b.wire('1:0', '3:0');
  b.wire('3:1', '4:0'); b.wire('4:4', '4:0');
  b.wire('4:4', '5:0'); b.wire('4:3', '6:0');
  b.wire('4:1', '2:0'); b.wire('2:1', '7:3');
  let s = b.settle(3);
  assert.ok(Math.abs(s.currents.p6 || 0) > 0.1, 'Stopped lamp should light while idle');
  assert.ok(Math.abs(s.currents.p5 || 0) < 0.01, 'Machine motor should be stopped initially');

  b.parts[2].closed = true; s = b.settle(3);
  assert.ok(Math.abs(s.currents.p5 || 0) > 0.1, 'Machine motor should spin on Start');
  b.parts[2].closed = false; s = b.settle(6);
  assert.ok(Math.abs(s.currents.p5 || 0) > 0.1, 'Machine motor should stay latched after Start release');
  assert.equal(b.activity.passed, false);

  b.parts[1].closed = false; s = b.settle(3);
  assert.ok(Math.abs(s.currents.p5 || 0) < 0.01, 'Opening Stop should halt Machine');
  assert.ok(Math.abs(s.currents.p6 || 0) > 0.1, 'Opening Stop should relight Stopped lamp');

  b.parts[1].closed = true; b.settle(3);
  assert.equal(b.activity.passed, true);

  const bad = bench('relay-boss');
  bad.wire('1:0', '4:2'); bad.wire('1:0', '3:0');
  bad.wire('3:1', '4:0');
  bad.wire('4:4', '5:0'); bad.wire('4:3', '6:0');
  bad.wire('4:1', '2:0'); bad.wire('2:1', '7:3');
  bad.settle(3);
  bad.parts[2].closed = true; bad.settle(3);
  bad.parts[2].closed = false; bad.settle(6);
  bad.parts[1].closed = false; bad.settle(3);
  bad.parts[1].closed = true; bad.settle(3);
  assert.equal(bad.activity.passed, false);
});
