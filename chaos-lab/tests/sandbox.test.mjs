import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LEVELS, solveCircuit } from '../src/circuit.js';
import { FREE_BUILD_PARTS } from '../src/observatory.js';
import { units } from '../src/units.js';
import { BOARD, FREE_BOARD, partFits, findSpace } from '../src/workbench.js';
import { unitRoom } from '../src/unit-scenes.js';
import { createBoardHistory } from '../src/history.js';
import { encodeProgress, restoreProgress } from '../src/lessons.js';
import {
  LAYER_HEIGHT,
  MAX_LAYERS,
  SANDBOX_CATEGORIES,
  SANDBOX_SLOT_COUNT,
  clampLayer,
  layerY,
  filterSandboxParts,
  normalizeSandboxSlots,
  mergeSandboxSlots,
  probePartReading
} from '../src/sandbox.js';

test('Sandbox categories cover all Free build parts cleanly', () => {
  const categorized = new Set(SANDBOX_CATEGORIES.flatMap(c => c.kinds || []));
  for (const kind of FREE_BUILD_PARTS) {
    assert.ok(categorized.has(kind), `${kind} missing from SANDBOX_CATEGORIES`);
  }
  assert.deepEqual(filterSandboxParts(FREE_BUILD_PARTS, 'all'), FREE_BUILD_PARTS);
  const basic = filterSandboxParts(FREE_BUILD_PARTS, 'basic');
  assert.ok(basic.includes('battery') && basic.includes('lamp'));
  assert.equal(basic.includes('gate'), false);
  const logic = filterSandboxParts(FREE_BUILD_PARTS, 'logic');
  assert.ok(logic.includes('gate') && logic.includes('display'));
});

test('Multi-layer collision isolates parts across layers 1, 2, and 3', () => {
  assert.equal(MAX_LAYERS, 3);
  assert.equal(clampLayer(-2), 0);
  assert.equal(clampLayer(9), 2);
  assert.equal(layerY(0), 0.14);
  assert.equal(layerY(1), 0.14 + LAYER_HEIGHT);

  const p0 = { id: 'p1', kind: 'lamp', x: 0, z: 0, layer: 0, rotation: 0 };
  const p1 = { id: 'p2', kind: 'lamp', x: 0, z: 0, layer: 1, rotation: 0 };
  assert.equal(partFits([p0], 0, 0, 'lamp', false, null, 0, 0), false);
  assert.equal(partFits([p0], 0, 0, 'lamp', false, null, 0, 1), true);
  assert.equal(partFits([p0, p1], 0, 0, 'lamp', false, null, 0, 2), true);

  const posL2 = findSpace([p0, p1], { x: 0, z: 0 }, true, 'lamp', false, 0, 2);
  assert.deepEqual(posL2, { x: 0, z: 0 });
});

test('Adjustable battery voltage (3-12 V) scales circuit physics and hover probe readings accurately', () => {
  const lamp = { id: 'l1', kind: 'lamp', x: 2, z: 0, layer: 1 };
  const bat9 = { id: 'b1', kind: 'battery', voltage: 9, x: -2, z: 0, layer: 0 };
  const wires = [{ a: 'b1:0', b: 'l1:0' }, { a: 'l1:1', b: 'b1:1' }];
  const s9 = solveCircuit([bat9, lamp], wires);
  assert.equal(s9.short, false);
  assert.ok(Math.abs(s9.current - 0.45) < 0.002);

  const probeOff = probePartReading(lamp, s9, false, 'Lamp');
  assert.equal(probeOff.detail, 'Power off');
  assert.equal(probeOff.meta, 'L2');

  const probeOn = probePartReading(lamp, s9, true, 'Lamp');
  assert.ok(Math.abs(parseFloat(probeOn.voltage) - 9.0) < 0.02);
  assert.ok(Math.abs(parseFloat(probeOn.current) - 0.45) < 0.005);
  assert.ok(Math.abs(parseFloat(probeOn.power) - 4.05) < 0.03);

  const bat12 = { ...bat9, voltage: 12 };
  const res = { id: 'r1', kind: 'resistor', resistance: 100 };
  const s12 = solveCircuit([bat12, res], [{ a: 'b1:0', b: 'r1:0' }, { a: 'r1:1', b: 'b1:1' }]);
  const probeBat = probePartReading(bat12, s12, true, 'Battery');
  assert.equal(probeBat.detail, 'Supply 12 V');
  assert.equal(probeBat.current, '0.120 A');
});

test('Save slot normalization handles empty, invalid, and multi-slot Sandbox builds', () => {
  const def = normalizeSandboxSlots(null);
  assert.equal(def.slots.length, SANDBOX_SLOT_COUNT);
  assert.equal(def.active, 0);
  assert.equal(def.slots[0].name, 'Build 1');

  const custom = normalizeSandboxSlots({
    active: 3,
    slots: [
      { name: 'Ring Osc', parts: [{ id: 'p1', kind: 'battery', voltage: 9, layer: 2 }], wires: [] },
      { name: '   ', parts: 'bad' }
    ]
  });
  assert.equal(custom.active, 3);
  assert.equal(custom.slots[0].name, 'Ring Osc');
  assert.equal(custom.slots[0].parts[0].layer, 2);
  assert.equal(custom.slots[0].parts[0].voltage, 9);
  assert.equal(custom.slots[1].name, 'Build 2');
  assert.deepEqual(custom.slots[1].parts, []);
});

test('Skylight Greenhouse room builds cleanly with finite geometry, Workshop theme, and larger bounded bench', () => {
  assert.ok(FREE_BOARD.width > BOARD.width && FREE_BOARD.depth > BOARD.depth);
  const workshopUnit = units.find(u => u.name === 'Workshop');
  assert.equal(workshopUnit.theme, 'greenhouse');
  const freeLevel = LEVELS[LEVELS.length - 1];
  assert.equal(freeLevel.id, 'sandbox');

  const room = unitRoom('greenhouse');
  assert.ok(room && room.texture && typeof room.draw === 'function');
  room.dispose();
});

test('Board history supports undo/redo, ignores camera/transient state, and coalesces rapid slider edits', () => {
  const hist = createBoardHistory(3);
  const s0 = { parts: [{ id: 'p1', kind: 'battery', x: -2, z: 0, layer: 0, charge: 0 }], wires: [], view: { camera: [0, 10, 10] } };
  hist.reset(s0);
  assert.equal(hist.canUndo(), false);
  assert.equal(hist.canRedo(), false);

  // Camera view and transient charge changes do not create history entries
  assert.equal(hist.record({ parts: [{ id: 'p1', kind: 'battery', x: -2, z: 0, layer: 0, charge: 4.5 }], wires: [], view: { camera: [5, 12, 12] } }, null, 1000), false);
  assert.equal(hist.size(), 1);

  const s1 = { parts: [...s0.parts, { id: 'p2', kind: 'resistor', x: 2, z: 0, layer: 0, resistance: 30 }], wires: [] };
  assert.equal(hist.record(s1, null, 2000), true);
  assert.equal(hist.canUndo(), true);

  // Coalesce rapid slider drags (<750ms) into one undo step
  assert.equal(hist.record({ parts: [s0.parts[0], { ...s1.parts[1], resistance: 40 }], wires: [] }, 'resistor-value:p2', 3000), true);
  assert.equal(hist.record({ parts: [s0.parts[0], { ...s1.parts[1], resistance: 60 }], wires: [] }, 'resistor-value:p2', 3200), true);
  assert.equal(hist.size(), 3);

  const undone1 = hist.undo();
  assert.equal(undone1.parts[1].resistance, 30);
  const redone = hist.redo();
  assert.equal(redone.parts[1].resistance, 60);

  // Max capacity drops oldest entries and new edit clears redo branch
  assert.equal(hist.undo().parts[1].resistance, 30);
  assert.equal(hist.canRedo(), true);
  assert.equal(hist.record({ parts: s1.parts, wires: [{ a: 'p1:0', b: 'p2:0' }] }, null, 4000), true);
  assert.equal(hist.canRedo(), false);
  assert.equal(hist.size(), 3);
  assert.equal(hist.record({ parts: s1.parts, wires: [{ a: 'p1:0', b: 'p2:0' }, { a: 'p2:1', b: 'p1:1' }] }, null, 5000), true);
  assert.equal(hist.size(), 3);
});

test('Free build save slots round-trip through cloud progress and merge by newest updatedAt', () => {
  const slots = normalizeSandboxSlots({
    active: 2,
    slots: [
      { name: 'Blinker', parts: [{ id: 'p1', kind: 'clock', clockHz: 2, layer: 1 }], wires: [], updatedAt: 100 },
      { name: 'Build 2', parts: [], wires: [], updatedAt: 0 },
      { name: 'Logic Box', parts: [{ id: 'p2', kind: 'gate', gateMode: 'XOR', layer: 2 }], wires: [], updatedAt: 250 }
    ]
  });

  const encoded = encodeProgress([0], { 0: { parts: [], wires: [] } }, slots);
  assert.equal(encoded.version, 5);
  assert.equal(encoded.sandboxSlots.active, 2);
  assert.equal(encoded.sandboxSlots.slots[0].name, 'Blinker');

  const restored = restoreProgress(encoded);
  assert.deepEqual(restored.completed, [0]);
  assert.equal(restored.sandboxSlots.active, 2);
  assert.equal(restored.sandboxSlots.slots[2].name, 'Logic Box');
  assert.equal(restored.sandboxSlots.slots[2].parts[0].layer, 2);

  // Legacy progress without sandboxSlots still restores cleanly
  const noSlots = restoreProgress({ version: 5, completed: ['complete-circuit'], boards: {} });
  assert.equal(noSlots.sandboxSlots, null);

  // Per-slot merge keeps newer updatedAt across cloud and local copies
  const cloud = normalizeSandboxSlots({
    active: 0,
    slots: [
      { name: 'Cloud Newer', parts: [{ id: 'p1', kind: 'lamp' }], wires: [], updatedAt: 500 },
      { name: 'Local Newer', parts: [{ id: 'p2', kind: 'lamp' }], wires: [], updatedAt: 100 }
    ]
  });
  const local = normalizeSandboxSlots({
    active: 1,
    slots: [
      { name: 'Local Older', parts: [], wires: [], updatedAt: 200 },
      { name: 'Local Fresh', parts: [{ id: 'p3', kind: 'battery', voltage: 9 }], wires: [], updatedAt: 800 }
    ]
  });
  const merged = mergeSandboxSlots(cloud, local);
  assert.equal(merged.slots[0].name, 'Cloud Newer');
  assert.equal(merged.slots[1].name, 'Local Fresh');
  assert.equal(merged.active, 1);
});
