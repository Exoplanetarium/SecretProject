import test from 'node:test';
import assert from 'node:assert/strict';
import { activities, freshActivity, measureActivity } from '../src/activities.js';
import { solveCircuit } from '../src/circuit.js';
import { starterBoard } from '../src/units.js';
import { SFX_NAMES, createSoundEngine } from '../src/sound.js';

function createMockAudioCtx() {
  const created = { contexts: 0, oscs: 0, buffers: 0, closed: 0, resumed: 0 };
  class MockAudioContext {
    constructor() {
      created.contexts++;
      this.currentTime = 1.0;
      this.sampleRate = 44100;
      this.state = 'suspended';
      this.destination = {};
    }
    resume() {
      created.resumed++;
      this.state = 'running';
      return Promise.resolve();
    }
    createGain() {
      return {
        gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect(target) { return target; }
      };
    }
    createBuffer(channels, length) {
      const data = new Float32Array(length);
      return { channels, length, getChannelData: () => data };
    }
    createBufferSource() {
      created.buffers++;
      return { buffer: null, connect(target) { return target; }, start() {}, stop() {} };
    }
    createOscillator() {
      created.oscs++;
      return {
        type: 'sine',
        frequency: { value: 440, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect(target) { return target; },
        start() {},
        stop() {}
      };
    }
    createBiquadFilter() {
      return {
        type: 'bandpass',
        frequency: { value: 1000, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        Q: { value: 1 },
        connect(target) { return target; }
      };
    }
    close() {
      created.closed++;
    }
  }
  return { MockAudioContext, created };
}

test('createSoundEngine synthesizes every SFX cleanly on one shared AudioContext', () => {
  const { MockAudioContext, created } = createMockAudioCtx();
  const sfx = createSoundEngine({ enabled: true, AudioCtx: MockAudioContext });

  for (const name of SFX_NAMES) {
    assert.equal(sfx.play(name), true, `Expected ${name} to play`);
  }
  assert.equal(created.contexts, 1);
  assert.ok(created.oscs >= SFX_NAMES.length);
  assert.ok(created.buffers >= 4);
  assert.equal(created.resumed, 1);

  // Rapid relay bursts should be rate-limited within the cooldown window
  assert.equal(sfx.play('relay'), false);

  sfx.dispose();
  assert.equal(created.closed, 1);
});

test('createSoundEngine respects mute toggle and no-ops safely without Web Audio', () => {
  const { MockAudioContext, created } = createMockAudioCtx();
  const muted = createSoundEngine({ enabled: false, AudioCtx: MockAudioContext });
  assert.equal(muted.play('place'), false);
  assert.equal(created.contexts, 0);

  muted.setEnabled(true);
  assert.equal(muted.play('switchOn'), true);
  assert.equal(created.contexts, 1);

  const headless = createSoundEngine({ enabled: true });
  assert.equal(headless.play('win'), false);
  headless.dispose();
});

test('Master Challenges emit audio events for Basketball shots and Flip-Proof polarity reversals', () => {
  const bball = activities.find(l => l.id === 'mc-basketball');
  const starter = starterBoard(bball);
  const parts = [...starter.parts, { id: 'pot1', kind: 'pot', wiper: 0.3 }];
  const wires = [
    { a: 'p1:0', b: 'pot1:0' },
    { a: 'p1:1', b: 'pot1:2' },
    { a: 'pot1:1', b: 'p2:0' },
    { a: 'p2:1', b: 'p1:1' },
    { a: 'p1:0', b: 'p3:0' },
    { a: 'p3:1', b: 'p1:1' }
  ];
  const act = freshActivity();
  const emitted = [];
  for (let i = 0; i < 80; i++) {
    const s = solveCircuit(parts, wires, 0.05);
    measureActivity(bball, parts, wires, s, act, true, 0.05);
    if (act.mc?.events?.length) {
      emitted.push(...act.mc.events);
      act.mc.events.length = 0;
    }
  }
  assert.ok(emitted.includes('cannonFire'));
  assert.ok(emitted.includes('swish'));

  const flipLesson = activities.find(l => l.id === 'mc-flip-proof');
  const flipStarter = starterBoard(flipLesson);
  const diodes = ['d1', 'd2', 'd3', 'd4'].map(id => ({ id, kind: 'diode' }));
  const flipParts = [...flipStarter.parts, ...diodes];
  const flipWires = [
    { a: 'p1:0', b: 'd1:0' }, { a: 'd1:1', b: 'p2:0' },
    { a: 'p1:1', b: 'd2:0' }, { a: 'd2:1', b: 'p2:0' },
    { a: 'p2:1', b: 'd3:0' }, { a: 'd3:1', b: 'p1:0' },
    { a: 'p2:1', b: 'd4:0' }, { a: 'd4:1', b: 'p1:1' }
  ];
  const flipAct = freshActivity();
  const flipEvents = [];
  for (let i = 0; i < 45; i++) {
    const s = solveCircuit(flipParts, flipWires, 0.05);
    measureActivity(flipLesson, flipParts, flipWires, s, flipAct, true, 0.05);
    if (flipAct.mc?.events?.length) {
      flipEvents.push(...flipAct.mc.events);
      flipAct.mc.events.length = 0;
    }
  }
  assert.ok(flipEvents.includes('flip'));
});

test('startFirstLightScore schedules the 5-act orchestral score and stops cleanly', () => {
  const { MockAudioContext, created } = createMockAudioCtx();
  const sfx = createSoundEngine({ enabled: true, AudioCtx: MockAudioContext });
  const score = sfx.startFirstLightScore();
  assert.equal(score.active, true);
  assert.ok(created.oscs >= 25);
  assert.ok(created.buffers >= 2);

  score.stop();
  assert.equal(score.active, false);

  const muted = createSoundEngine({ enabled: false, AudioCtx: MockAudioContext });
  assert.equal(muted.startFirstLightScore().active, false);

  sfx.dispose();
});
