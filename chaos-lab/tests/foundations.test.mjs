import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, solveCircuit, applyStep } from '../src/circuit.js';
import { activities, conditions, freshActivity, measureActivity } from '../src/activities.js';
import { starterBoard } from '../src/units.js';
import { LESSONS } from '../src/lessons.js';
import { foundationActivities } from '../src/foundations.js';
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

test('res-divider reads 6 V across battery and 3 V across one 30 ohm resistor', () => {
  const b = bench('res-divider');
  b.wire('1:0', '4:0'); b.wire('1:1', '4:1');
  b.tick();
  assert.equal(b.activity.passed, false);
  b.wires.splice(-2, 2);
  b.wire('2:0', '4:0'); b.wire('2:1', '4:1');
  b.tick();
  assert.equal(b.activity.passed, true);
});

test('res-fuse runs Lamp 1 safely then blows when Lamp 2 parallels in', () => {
  const b = bench('res-fuse');
  b.wire('2:1', '4:0'); b.wire('4:1', '5:0'); b.wire('5:1', '1:1');
  b.tick();
  assert.equal(b.activity.passed, false);
  b.parts[3].closed = true;
  b.tick();
  assert.equal(b.parts[1].blown, true);
  assert.equal(b.activity.passed, true);
});

test('cap-slow-fade and cap-parallel contain zero LEDs and pass smooth capacitor discharge', () => {
  for (const id of ['cap-slow-fade', 'cap-parallel']) {
    const l = foundationActivities.find(item => item.id === id);
    assert.ok(!l.parts.includes('led'), `${id} should not use LEDs before Chapter 3`);
  }

  const slow = bench('cap-slow-fade');
  slow.wire('3:0', '4:0'); slow.wire('4:1', '5:0'); slow.wire('5:1', '3:1');
  slow.parts[1].closed = true;
  for (let i = 0; i < 60; i++) slow.tick(0.05, true);
  assert.ok(slow.parts[2].charge >= 4.5);
  assert.equal(slow.activity.passed, false);
  slow.parts[1].closed = false;
  for (let i = 0; i < 30; i++) slow.tick(0.05, true);
  assert.equal(slow.activity.passed, true);

  const par = bench('cap-parallel');
  par.wire('3:0', '4:0'); par.wire('3:1', '4:1');
  par.parts[1].closed = true;
  for (let i = 0; i < 40; i++) par.tick(0.05, true);
  assert.ok(par.parts[2].charge >= 4 && par.parts[3].charge >= 4);
  par.parts[1].closed = false;
  for (let i = 0; i < 25; i++) par.tick(0.05, true);
  assert.equal(par.activity.passed, true);
});

test('diode-valve and diode-shield conduct forward and block reverse polarity', () => {
  const dv = bench('diode-valve');
  dv.wire('2:1', '3:0'); dv.wire('3:1', '1:1');
  let res = dv.tick();
  assert.ok(res.currents.p3 > 0.1);
  assert.equal(dv.activity.passed, false);
  dv.parts[0].reversed = true;
  res = dv.tick();
  assert.ok(Math.abs(res.currents.p3 || 0) < 0.001);
  assert.equal(dv.activity.passed, true);

  const ds = bench('diode-shield');
  ds.wire('1:0', '2:0'); ds.wire('2:1', '3:0'); ds.wire('3:1', '1:1');
  res = ds.tick();
  assert.ok(res.currents.p3 > 0.1);
  ds.parts[0].reversed = true;
  res = ds.tick();
  assert.ok(Math.abs(res.currents.p3 || 0) < 0.001);
  assert.equal(ds.activity.passed, true);
});

test('Chapters 1-3 foundation additions validate metadata, diagrams, guides, and toolbelt unlocks', () => {
  assert.equal(foundationActivities.length, 6);
  const meterIdx = LEVELS.findIndex(l => l.id === 'res-divider');
  const fuseIdx = LEVELS.findIndex(l => l.id === 'res-fuse');
  const diodeIdx = LEVELS.findIndex(l => l.id === 'diode-valve');
  const belt = unlockedToolbelt([meterIdx, fuseIdx, diodeIdx], LEVELS, false);
  assert.ok(belt.has('meter') && belt.has('fuse') && belt.has('diode'));

  for (const l of foundationActivities) {
    assert.ok(!`${l.title} ${l.goal} ${l.hint} ${l.ending}`.includes('—'), `Em dash in ${l.id}`);
    const svg = diagram(l.diagram);
    assert.ok(svg.includes('class="circuit-diagram"') && svg.includes('>+') && svg.includes('>−'), `${l.id} diagram issue`);
    const idx = LEVELS.indexOf(l);
    assert.ok(idx >= 0);
    assert.ok(LESSONS[idx].length >= 2, `${l.id} missing teaching steps`);
  }
});
