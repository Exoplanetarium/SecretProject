import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LEVELS, solveCircuit, applyStep } from '../src/circuit.js';
import { activities, conditions, freshActivity, measureActivity } from '../src/activities.js';
import { starterBoard } from '../src/units.js';
import { makeUnitPart, updateDeviceVisual } from '../src/unit-scenes.js';
import { LESSONS } from '../src/lessons.js';
import { comparatorActivities } from '../src/comparators.js';
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

test('comparator solver physics + 3D chip build cleanly', () => {
  const bat = { id: 'b', kind: 'battery' };
  const pot = { id: 'p', kind: 'pot', wiper: 0.2 };
  const r1 = { id: 'r1', kind: 'resistor', resistance: 30 };
  const r2 = { id: 'r2', kind: 'resistor', resistance: 30 };
  const cmp = { id: 'c', kind: 'comparator', outputHigh: false };
  const lamp = { id: 'l', kind: 'lamp' };
  const wires = [
    { a: 'b:0', b: 'p:2' }, { a: 'p:0', b: 'b:1' }, { a: 'p:1', b: 'c:0' },
    { a: 'b:0', b: 'r1:0' }, { a: 'r1:1', b: 'r2:0' }, { a: 'r2:1', b: 'b:1' }, { a: 'r1:1', b: 'c:1' },
    { a: 'c:2', b: 'l:0' }, { a: 'l:1', b: 'b:1' }, { a: 'c:3', b: 'b:1' }
  ];
  let s = solveCircuit([bat, pot, r1, r2, cmp, lamp], wires, 0.05);
  applyStep([cmp], s);
  assert.equal(cmp.outputHigh, false);

  pot.wiper = 0.8;
  s = solveCircuit([bat, pot, r1, r2, cmp, lamp], wires, 0.05);
  assert.equal(applyStep([cmp], s), true);
  assert.equal(cmp.outputHigh, true);
  s = solveCircuit([bat, pot, r1, r2, cmp, lamp], wires, 0.05);
  assert.ok(s.currents.l > 0.2);

  const scene = new THREE.Scene();
  const g = new THREE.Group();
  makeUnitPart(cmp, g);
  scene.add(g);
  updateDeviceVisual(cmp, s, {}, true, 0.05);
  assert.equal(cmp.compJewel.emissiveIntensity, 3);
  g.traverse(o => o.position.toArray().forEach(v => assert.ok(Number.isFinite(v))));
});

test('comp-scale, comp-light, and comp-low-bat verify threshold triggering', () => {
  const sc = bench('comp-scale');
  sc.wire('1:0', '2:2'); sc.wire('2:0', '7:2'); sc.wire('2:1', '5:0');
  sc.wire('3:1', '5:1'); sc.wire('5:2', '6:0');
  sc.parts[1].wiper = 0.1; sc.settle();
  assert.equal(sc.parts[4].outputHigh, false);
  sc.parts[1].wiper = 0.9; sc.settle();
  assert.equal(sc.parts[4].outputHigh, true);
  assert.equal(sc.activity.passed, true);

  const lt = bench('comp-light');
  lt.wire('1:0', '2:0'); lt.wire('2:1', '3:0'); lt.wire('3:1', '8:2');
  lt.wire('2:1', '6:0'); lt.wire('4:1', '6:1'); lt.wire('6:2', '7:0');
  lt.settle();
  assert.equal(lt.parts[5].outputHigh, true);
  lt.parts[1].lux = 0; lt.parts[2].lux = 100;
  lt.settle();
  assert.equal(lt.parts[5].outputHigh, false);
  assert.equal(lt.activity.passed, true);

  const lb = bench('comp-low-bat');
  lb.wire('5:1', '7:0'); lb.wire('2:1', '7:1'); lb.wire('7:2', '8:0');
  lb.parts[1].closed = true;
  for (let i = 0; i < 80; i++) lb.tick(0.05);
  assert.ok(lb.parts[2].charge >= 4.5);
  assert.equal(lb.parts[6].outputHigh, false);
  lb.parts[1].closed = false;
  for (let i = 0; i < 65; i++) lb.tick(0.05);
  assert.equal(lb.parts[6].outputHigh, true);
  assert.equal(lb.activity.passed, true);
});

test('comp-two-step, comp-window, comp-blinker, and comp-boss work end-to-end', () => {
  const ts = bench('comp-two-step');
  ts.wire('2:1', '6:0'); ts.wire('2:1', '7:0');
  ts.wire('4:1', '6:1'); ts.wire('3:1', '7:1');
  ts.wire('6:2', '8:0'); ts.wire('7:2', '9:0');
  for (const w of [0.1, 0.5, 0.9]) {
    ts.parts[1].wiper = w;
    ts.settle();
  }
  assert.equal(ts.activity.passed, true);

  const win = bench('comp-window');
  win.wire('2:1', '6:0'); win.wire('2:1', '7:0');
  win.wire('4:1', '6:1'); win.wire('3:1', '7:1');
  win.wire('6:2', '8:0'); win.wire('7:2', '8:1');
  win.parts[1].wiper = 0.1;
  let r = win.settle();
  assert.ok(Math.abs(r.currents.p8 || 0) < 0.002);
  win.parts[1].wiper = 0.5;
  r = win.settle();
  assert.equal(r.short, false);
  assert.ok(r.currents.p8 > 0.05);
  win.parts[1].wiper = 0.9;
  r = win.settle();
  assert.ok(Math.abs(r.currents.p8 || 0) < 0.002);
  assert.equal(win.activity.passed, true);

  const blk = bench('comp-blinker');
  blk.wire('7:2', '4:0'); blk.wire('4:1', '7:0');
  blk.wire('7:2', '5:0'); blk.wire('5:1', '7:1');
  blk.wire('7:1', '6:0'); blk.wire('6:1', '9:2');
  blk.wire('7:2', '8:0');
  for (let i = 0; i < 80; i++) blk.tick(0.05);
  assert.equal(blk.activity.passed, true);

  const boss = bench('comp-boss');
  boss.wire('4:1', '6:0'); boss.wire('2:1', '6:1'); boss.wire('6:2', '8:0');
  boss.wire('2:1', '7:0'); boss.wire('3:1', '7:1'); boss.wire('7:2', '9:0');
  boss.parts[1].wiper = 0.1; boss.settle(); // Cold
  boss.parts[1].wiper = 0.5; boss.settle(); // Comfort
  boss.parts[1].wiper = 0.9; boss.settle(); // Hot
  assert.equal(boss.activity.passed, true);
});

test('Chapter 6 Smart Triggers metadata, diagrams, guides, and toolbelt unlock validate cleanly', () => {
  assert.equal(comparatorActivities.length, 7);
  assert.equal(comparatorActivities.at(-1).challenge, true);
  const scaleIdx = LEVELS.findIndex(l => l.id === 'comp-scale');
  assert.ok(unlockedToolbelt([scaleIdx], LEVELS, true).has('comparator'));

  for (const l of comparatorActivities) {
    assert.ok(!`${l.title} ${l.goal} ${l.hint} ${l.ending}`.includes('—'), `Em dash in ${l.id}`);
    const svg = diagram(l.diagram);
    assert.ok(svg.includes('class="circuit-diagram"') && (l.challenge ? svg.includes('Cold') && svg.includes('Hot') : svg.includes('>+') && svg.includes('>−')), `${l.id} diagram issue`);
    const idx = LEVELS.findIndex(item => item.id === l.id);
    assert.ok(idx >= 0);
    assert.ok(LESSONS[idx].length >= 2, `${l.id} missing teaching guide`);
    for (const s of LESSONS[idx]) assert.ok(!`${s.title} ${s.text}`.includes('—'));
  }
});
