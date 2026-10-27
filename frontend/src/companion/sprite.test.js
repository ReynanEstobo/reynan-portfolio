import test from 'node:test';
import assert from 'node:assert/strict';
import { drawCompanion } from './sprite.js';

const STATES = [
  'idle', 'observing', 'walking', 'following', 'turning', 'greeting', 'waving',
  'talking', 'thinking', 'reacting', 'dragging', 'anticipating', 'jumping',
  'falling', 'landing', 'sitting', 'sleeping', 'waking', 'returning',
  'snacking', 'phone', 'stretching',
];

// Record both drawing commands and paint state, including save/restore. This
// catches pose changes without relying on a browser, canvas package or snapshots.
function render(model, options = {}) {
  const commands = [];
  const stack = [];
  const ctx = { fillStyle: '#000000', globalAlpha: 1, imageSmoothingEnabled: true };
  ctx.save = () => {
    stack.push({
      fillStyle: ctx.fillStyle,
      globalAlpha: ctx.globalAlpha,
      imageSmoothingEnabled: ctx.imageSmoothingEnabled,
    });
    commands.push(['save']);
  };
  ctx.restore = () => {
    assert.ok(stack.length > 0, 'renderer must balance canvas save/restore');
    Object.assign(ctx, stack.pop());
    commands.push(['restore']);
  };
  for (const method of ['setTransform', 'clearRect', 'translate', 'scale']) {
    ctx[method] = (...args) => commands.push([method, ...args]);
  }
  ctx.fillRect = (...args) => commands.push([
    'fillRect', ctx.fillStyle, ctx.globalAlpha, ctx.imageSmoothingEnabled, ...args,
  ]);
  drawCompanion(ctx, model, options);
  assert.equal(stack.length, 0, 'renderer must restore the caller canvas state');
  return commands;
}

function modelFor(state, direction, stateAge) {
  return {
    state, direction, stateAge,
    vx: 37 * direction, vy: -83, distance: 143.2, gaitDistance: 91.7,
    walkBlend: 0.73, walkReady: 1, acceleration: 50 * direction,
    turnProgress: 0.4, turnDirection: -direction,
    lookX: 0.7, lookY: -0.6, energy: 58, mood: 'curious',
  };
}

test('pausing preserves the current pose in every state and direction', () => {
  for (const state of STATES) {
    for (const direction of [-1, 1]) {
      for (const age of [0.1, 0.3, 1.7, 4.2]) {
        const model = modelFor(state, direction, age);
        assert.deepEqual(
          render(model, { paused: true }),
          render(model, { paused: false }),
          `${state}, direction ${direction}, age ${age}: pausing must not reset the pose`,
        );
      }
    }
  }
});

test('rendering is deterministic and never mutates the engine model', () => {
  for (const state of STATES) {
    for (const direction of [-1, 1]) {
      const model = Object.freeze(modelFor(state, direction, 1.7));
      const before = structuredClone(model);
      const firstFrame = render(model);
      // Interleaved rendering must not leave module-level pose state behind.
      render(modelFor('walking', -direction, 0.3));
      assert.deepEqual(render(model), firstFrame, `${state}: identical models must draw identically`);
      assert.deepEqual(model, before, `${state}: renderer must not update physics or behaviour`);
      assert.ok(firstFrame.some((command) => command[0] === 'fillRect'), 'sprite must actually draw');
    }
  }
});
