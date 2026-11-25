import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LEVELS, solveCircuit, applyStep } from '../src/circuit.js';
import { activities, conditions, freshActivity, measureActivity, pins } from '../src/activities.js';
import { starterBoard, units } from '../src/units.js';
import { makeUnitPart, updateDeviceVisual } from '../src/unit-scenes.js';
import { diagram } from '../src/visuals.js';
import { LIBRARY_UNLOCKS, libraryActivities } from '../src/library.js';
import { FREE_BUILD_PARTS, observatoryActivities, unlockedToolbelt } from '../src/observatory.js';
import { LESSONS, canAccessLevel } from '../src/lessons.js';
import { COMPONENT_GUIDES, getComponentGuide } from '../src/component-guide.js';

function bench(id) {
  const lesson = activities.find(l => l.id === id);
  const { parts, wires } = starterBoard(lesson);
  const activity = freshActivity();
  function wire(from, to) {
    wires.push({ a: 'p' + from, b: 'p' + to });
  }
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

test('new component solver physics: diode, spdt, pot, fuse, meter, and transistor', () => {
  // Diode forward vs reverse
  const bat = { id: 'b', kind: 'battery' };
  const lamp = { id: 'l', kind: 'lamp' };
  const diode = { id: 'd', kind: 'diode' };
  const fwd = solveCircuit([bat, diode, lamp], [{ a: 'b:0', b: 'd:0' }, { a: 'd:1', b: 'l:0' }, { a: 'l:1', b: 'b:1' }]);
  assert.ok(Math.abs(fwd.currents.l - 5.3 / 25) < 0.002);
  const rev = solveCircuit([{ ...bat, reversed: true }, diode, lamp], [{ a: 'b:0', b: 'd:0' }, { a: 'd:1', b: 'l:0' }, { a: 'l:1', b: 'b:1' }]);
  assert.ok(Math.abs(rev.currents.l || 0) < 0.001);

  // SPDT routing
  const spdt = { id: 's', kind: 'spdt', throwB: false };
  const l2 = { id: 'l2', kind: 'lamp' };
  const swWires = [{ a: 'b:0', b: 's:0' }, { a: 's:1', b: 'l:0' }, { a: 'l:1', b: 'b:1' }, { a: 's:2', b: 'l2:0' }, { a: 'l2:1', b: 'b:1' }];
  const throwA = solveCircuit([bat, spdt, lamp, l2], swWires);
  assert.ok(throwA.currents.l > 0.25 && Math.abs(throwA.currents.l2 || 0) < 0.001);
  spdt.throwB = true;
  const throwB = solveCircuit([bat, spdt, lamp, l2], swWires);
  assert.ok(throwB.currents.l2 > 0.25 && Math.abs(throwB.currents.l || 0) < 0.001);

  // Potentiometer divider
  const pot = { id: 'p', kind: 'pot', wiper: 0.5 };
  const meter = { id: 'm', kind: 'meter' };
  const div = solveCircuit([bat, pot, meter], [{ a: 'b:0', b: 'p:0' }, { a: 'p:2', b: 'b:1' }, { a: 'p:1', b: 'm:0' }, { a: 'b:1', b: 'm:1' }]);
  assert.ok(Math.abs(div.meterVoltages.m - 3) < 0.05);

  // Glass fuse safe pass & overload blow
  const fuse = { id: 'f', kind: 'fuse', fuseRating: 0.35, blown: false };
  const safe = solveCircuit([bat, fuse, lamp], [{ a: 'b:0', b: 'f:0' }, { a: 'f:1', b: 'l:0' }, { a: 'l:1', b: 'b:1' }]);
  assert.equal(Object.keys(safe.nextFuses).length, 0);
  const overload = solveCircuit([bat, fuse, lamp, l2], [
    { a: 'b:0', b: 'f:0' }, { a: 'f:1', b: 'l:0' }, { a: 'l:1', b: 'b:1' },
    { a: 'f:1', b: 'l2:0' }, { a: 'l2:1', b: 'b:1' }
  ]);
  assert.equal(overload.nextFuses.f.blown, true);

  // NPN transistor switching
  const res = { id: 'r', kind: 'resistor', resistance: 100 };
  const tr = { id: 't', kind: 'transistor', conducting: false };
  const trWires = [{ a: 'b:0', b: 'l:0' }, { a: 'l:1', b: 't:0' }, { a: 't:2', b: 'b:1' }, { a: 'b:0', b: 'r:0' }, { a: 'r:1', b: 't:1' }];
  let ts = solveCircuit([bat, res, tr, lamp], trWires, 0.05);
  assert.equal(applyStep([bat, res, tr, lamp], ts), true);
  ts = solveCircuit([bat, res, tr, lamp], trWires, 0.05);
  assert.ok(ts.currents.l > 0.2);
});

test('all 19 The Library builds are accessible, verifiable, and unlock Free build tools', () => {
  assert.equal(units.find(u => u.name === 'Library')?.label, 'The Library');
  assert.equal(libraryActivities.length, 19);
  assert.equal(LIBRARY_UNLOCKS.length, 19);
  for (const level of libraryActivities) {
    const idx = LEVELS.indexOf(level);
    assert.ok(idx >= 0);
    assert.equal(canAccessLevel(idx, [], false), true, `${level.id} should be accessible`);
    assert.ok(LESSONS[idx]?.length >= 2, `${level.id} missing teaching steps`);
    assert.ok(diagram(level.diagram).includes('circuit-diagram'), `${level.id} missing diagram`);
  }

  // Test representative challenges across all shelves
  const btn = bench('lib-button');
  btn.wire('1:0', '2:0'); btn.wire('2:1', '3:0'); btn.wire('3:1', '1:1');
  btn.parts[1].closed = true; btn.tick();
  assert.equal(btn.activity.passed, false);
  btn.parts[1].closed = false; btn.tick();
  assert.equal(btn.activity.passed, true);

  const spdt = bench('lib-spdt');
  spdt.wire('1:0', '2:0'); spdt.wire('2:1', '3:0'); spdt.wire('3:1', '1:1'); spdt.wire('2:2', '4:0'); spdt.wire('4:1', '1:1');
  spdt.tick(); assert.equal(spdt.activity.passed, false);
  spdt.parts[1].throwB = true; spdt.tick();
  assert.equal(spdt.activity.passed, true);

  const rail = bench('lib-rail');
  rail.wire('1:0', '2:0');
  rail.wire('2:1', '3:0'); rail.wire('3:1', '1:1');
  rail.wire('2:2', '4:0'); rail.wire('4:1', '1:1');
  rail.wire('2:3', '5:0'); rail.wire('5:1', '1:1');
  rail.tick();
  assert.equal(rail.activity.passed, true);

  const fuse = bench('lib-fuse');
  fuse.wire('1:0', '2:0'); fuse.wire('2:1', '3:0'); fuse.wire('3:1', '1:1');
  fuse.wire('2:1', '4:0'); fuse.wire('4:1', '5:0'); fuse.wire('5:1', '1:1');
  fuse.tick(); assert.equal(fuse.activity.passed, false);
  fuse.parts[3].closed = true; fuse.tick();
  assert.equal(fuse.parts[1].blown, true);
  assert.equal(fuse.activity.passed, true);

  const diode = bench('lib-diode');
  diode.wire('1:0', '2:0'); diode.wire('2:1', '3:0'); diode.wire('3:1', '1:1');
  diode.tick(); diode.parts[0].reversed = true; diode.tick();
  assert.equal(diode.activity.passed, true);

  const pot = bench('lib-pot');
  pot.wire('1:0', '2:0'); pot.wire('2:1', '3:0'); pot.wire('3:1', '1:1');
  pot.parts[1].wiper = 0.8; pot.tick();
  pot.parts[1].wiper = 0.05; pot.tick();
  assert.equal(pot.activity.passed, true);

  const meter = bench('lib-meter');
  meter.wire('1:0', '4:0'); meter.wire('1:1', '4:1');
  meter.tick();
  meter.wires.splice(-2, 2);
  meter.wire('2:0', '4:0'); meter.wire('2:1', '4:1');
  meter.tick();
  assert.equal(meter.activity.passed, true);

  const rgb = bench('lib-rgb');
  rgb.wire('1:0', '2:0'); rgb.wire('1:0', '2:1');
  rgb.tick(); assert.equal(rgb.activity.passed, true);

  const bell = bench('lib-bell');
  bell.wire('1:0', '2:0'); bell.wire('2:1', '3:0'); bell.wire('3:1', '1:1');
  bell.parts[1].closed = true; bell.tick();
  assert.equal(bell.activity.passed, true);

  const gear = bench('lib-gear');
  gear.wire('1:0', '2:0'); gear.wire('2:1', '1:1');
  gear.tick(); gear.parts[0].reversed = true; gear.tick();
  assert.equal(gear.activity.passed, true);

  const servo = bench('lib-servo');
  servo.wire('1:0', '2:0'); servo.wire('2:1', '1:1');
  servo.parts[1].dial = 35; servo.tick();
  servo.parts[1].dial = -35; servo.tick();
  assert.equal(servo.activity.passed, true);

  const photo = bench('lib-photo');
  photo.wire('1:0', '2:0'); photo.wire('2:1', '3:0'); photo.wire('3:1', '1:1');
  photo.parts[1].lux = 100; photo.tick();
  photo.parts[1].lux = 0; photo.tick();
  assert.equal(photo.activity.passed, true);

  const relay = bench('lib-relay');
  relay.wire('2:0', '3:0'); relay.wire('2:1', '3:1');
  relay.wire('1:0', '3:2'); relay.wire('3:3', '4:0'); relay.wire('4:1', '1:1');
  relay.parts[1].lux = 100; relay.tick();
  relay.parts[1].lux = 0; relay.tick();
  assert.equal(relay.activity.passed, true);

  const tr = bench('lib-transistor');
  tr.wire('1:0', '2:0'); tr.wire('2:1', '3:0'); tr.wire('3:1', '4:1');
  tr.wire('1:0', '5:0'); tr.wire('5:1', '4:0'); tr.wire('4:2', '1:1');
  tr.settle();
  tr.parts[1].closed = true; tr.settle();
  assert.equal(tr.activity.passed, true);

  const coil = bench('lib-coil');
  coil.wire('1:0', '6:0'); coil.wire('6:1', '2:0'); coil.wire('2:1', '3:0'); coil.wire('3:1', '1:1');
  coil.wire('6:2', '3:2'); coil.wire('3:3', '4:0'); coil.wire('4:1', '1:1');
  coil.wire('3:4', '5:0'); coil.wire('5:1', '1:1');
  coil.settle();
  coil.parts[1].closed = true; coil.settle();
  assert.equal(coil.activity.passed, true);

  const gate = bench('lib-gate');
  gate.wire('1:0', '2:0'); gate.wire('2:1', '4:0');
  gate.wire('1:0', '3:0'); gate.wire('3:1', '4:1');
  gate.wire('4:2', '5:0');
  gate.settle();
  gate.parts[1].closed = true; gate.parts[2].closed = true; gate.settle();
  assert.equal(gate.activity.passed, true);

  const clk = bench('lib-clock');
  clk.wire('1:0', '2:0'); clk.wire('1:1', '2:1');
  for (let i = 0; i < 40; i++) clk.tick(0.05);
  assert.equal(clk.activity.passed, true);

  const latch = bench('lib-latch');
  latch.wire('1:0', '2:0'); latch.wire('2:1', '4:0');
  latch.wire('1:0', '3:0'); latch.wire('3:1', '4:1');
  latch.wire('4:2', '5:0');
  latch.tick();
  latch.parts[1].closed = true; latch.parts[2].closed = true; latch.tick();
  latch.parts[1].closed = false; latch.parts[2].closed = false; latch.tick();
  assert.equal(latch.activity.passed, true);

  const disp = bench('lib-display');
  for (let idx = 0; idx < 4; idx++) {
    disp.wire('1:0', (idx + 2) + ':0');
    disp.wire((idx + 2) + ':1', '6:' + idx);
  }
  disp.parts[1].closed = true; disp.parts[3].closed = true; disp.settle();
  disp.parts[1].closed = false; disp.parts[3].closed = false;
  disp.parts[2].closed = true; disp.parts[4].closed = true; disp.settle();
  assert.equal(disp.activity.passed, true);

  // Verify unlock mapping for every single library challenge
  for (const item of LIBRARY_UNLOCKS) {
    const chIdx = LEVELS.findIndex(l => l.id === item.challengeId);
    const unlocked = unlockedToolbelt([chIdx], LEVELS, false);
    assert.ok(unlocked.has(item.kind), `${item.challengeId} failed to unlock ${item.kind}`);
  }
});

test('all 6 new 3D component models build, update, and produce finite transforms', () => {
  const scene = new THREE.Scene();
  const kinds = ['diode', 'spdt', 'pot', 'fuse', 'meter', 'transistor'];
  const parts = kinds.map((kind, i) => ({
    id: 'p' + (i + 1),
    kind,
    x: i * 3,
    z: 0,
    throwB: true,
    wiper: 0.75,
    blown: false,
    fuseRating: 0.35,
    conducting: true
  }));
  for (const p of parts) {
    const g = new THREE.Group();
    makeUnitPart(p, g);
    scene.add(g);
  }
  const state = {
    voltages: { 'p1:0': 6, 'p1:1': 5.3, 'p5:0': 6, 'p5:1': 3 },
    currents: { p1: 0.2, p4: 0.3 },
    meterVoltages: { p5: 3.0 }
  };
  for (const p of parts) updateDeviceVisual(p, state, {}, true, 0.05);
  parts[3].blown = true;
  updateDeviceVisual(parts[3], state, {}, true, 0.05);

  scene.traverse(obj => {
    for (const v of [...obj.position.toArray(), ...obj.quaternion.toArray()]) {
      assert.ok(Number.isFinite(v));
    }
  });
});

test('Component guides cover every component cleanly without em dashes', () => {
  const allKinds = [...new Set([...FREE_BUILD_PARTS, 'jack'])];
  for (const kind of allKinds) {
    const g = COMPONENT_GUIDES[kind];
    assert.ok(g, `Missing component guide for ${kind}`);
    assert.ok(getComponentGuide(kind) === g);
    assert.ok(g.name && g.spec && g.summary);
    assert.ok(g.howToUse.length >= 2);
    assert.ok(g.diagramSvg.includes('<svg') && g.illustrationSvg.includes('<svg'));
    const expectedCount = pins[kind]?.length ?? 2;
    assert.equal(g.terminals.length, expectedCount, `${kind} terminal count mismatch`);
    const combined = JSON.stringify(g);
    assert.ok(!combined.includes('—'), `Em dash found in guide for ${kind}`);
  }
  for (const l of [...libraryActivities, ...observatoryActivities]) {
    assert.ok(!`${l.title} ${l.goal} ${l.hint} ${l.ending}`.includes('—'), `Em dash found in ${l.id}`);
  }
  for (const steps of LESSONS) {
    for (const s of steps) {
      assert.ok(!`${s.title} ${s.text}`.includes('—'), `Em dash found in step ${s.title}`);
    }
  }
});
