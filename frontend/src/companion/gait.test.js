import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleFoot, getGaitPose, FOOT_CENTERS, GAIT_CYCLE, STANCE_FRACTION } from './gait.js';
import { createCompanion, commandCompanion, updateCompanion } from './engine.js';

test('a supporting foot stays in the same world position in either travel direction', () => {
  for (const direction of [-1, 1]) {
    for (const speed of [18, 46, 68]) {
      for (const fps of [30, 60, 144]) {
        let previous = null, contacts = 0;
        for (let frame = 0; frame < fps * 4; frame += 1) {
          const distance = frame / fps * speed;
          const foot = sampleFoot(distance);
          const x = 500 + direction * distance + direction * foot.x;
          if (previous?.foot.planted && foot.planted && foot.phase > previous.foot.phase) {
            assert.ok(Math.abs(x - previous.x) < 1e-8, 'the supporting sole must not slide');
            contacts += 1;
          }
          previous = { x, foot };
        }
        assert.ok(contacts > fps);
      }
    }
  }
});

test('feet alternate support with toe clearance and continuous heel strike', () => {
  for (let distance = 0; distance < GAIT_CYCLE; distance += 0.1) {
    const left = sampleFoot(distance), right = sampleFoot(distance, 0.5);
    assert.ok(left.planted || right.planted, 'walking always has a supporting foot');
    for (const foot of [left, right]) {
      assert.ok(foot.lift >= 0 && foot.lift <= 8.001);
      if (foot.planted) assert.equal(foot.lift, 0);
    }
  }
  assert.ok(sampleFoot(GAIT_CYCLE * 0.8).lift > 7);
  for (const boundary of [GAIT_CYCLE * STANCE_FRACTION, GAIT_CYCLE]) {
    const before = sampleFoot(boundary - 1e-5), after = sampleFoot(boundary + 1e-5);
    assert.ok(Math.abs(before.x - after.x) < 0.001);
    assert.ok(Math.abs(before.lift - after.lift) < 0.001);
  }
});

test('engine acceleration and braking retain foot contact at different frame rates', () => {
  for (const direction of [-1, 1]) {
    for (const fps of [30, 60, 144]) {
      const m = createCompanion({ width: 1200, height: 800 });
      m.x = direction === 1 ? 150 : 850;
      m.direction = direction;
      commandCompanion(m, 'come', { x: m.x + 56 + direction * 300 });
      let previous = null, contacts = 0;
      for (let i = 0; i < fps * 7; i += 1) {
        updateCompanion(m, 1 / fps, { quiet: true });
        const pose = getGaitPose(m);
        if (previous?.blend === 1 && pose.blend === 1 && m.state === 'walking') {
          pose.feet.forEach((foot, index) => {
            const old = previous.feet[index];
            if (old.planted && foot.planted && foot.phase > old.phase) {
              const worldX = m.x + direction * foot.x;
              const oldX = previous.x + direction * old.x;
              assert.ok(Math.abs(worldX - oldX) < 1e-7);
              contacts += 1;
            }
          });
        }
        previous = { ...pose, x: m.x };
      }
      assert.ok(contacts > fps);
      assert.equal(m.state, 'idle');
      assert.equal(m.walkBlend, 0);
    }
  }
});

test('rest, airborne poses and reduced motion do not continue cycling feet', () => {
  for (const state of ['idle', 'dragging', 'falling', 'jumping', 'sitting', 'sleeping']) {
    const m = { state, walkBlend: state === 'idle' ? 0 : 1, vx: 0, gaitDistance: 71 };
    const pose = getGaitPose(m);
    assert.deepEqual(pose.feet.map(({ x, lift }) => [x, lift]), [[0, 0], [0, 0]]);
  }
  const quiet = getGaitPose({ state: 'walking', walkBlend: 1, vx: 68, gaitDistance: 37 }, { reduced: true });
  assert.equal(quiet.blend, 0);
  assert.deepEqual(quiet.feet.map(({ x, lift }) => [x, lift]), [[0, 0], [0, 0]]);
});

test('departures, walking and collecting the feet always keep one sole on the ground', () => {
  for (const direction of [-1, 1]) {
    for (const fps of [30, 60, 144]) {
      const m = createCompanion({ width: 1200, height: 800 });
      m.x = 500; m.direction = direction;
      // Begin after a previous route, not at the convenient phase-zero fixture.
      m.gaitDistance = 79;
      commandCompanion(m, 'come', { x: 556 + direction * 140 });
      for (let frame = 0; frame < fps * 7; frame += 1) {
        if (frame === fps * 2) commandCompanion(m, 'wave');
        updateCompanion(m, 1 / fps, { quiet: true });
        const { feet } = getGaitPose(m);
        assert.ok(feet.some(foot => foot.lift < 1e-7), `no floating in ${m.state} at ${m.time}`);
        if (frame / fps < 0.15) {
          assert.ok(Math.abs(feet[0].x) < 1e-7, 'the first support foot stays under the hip');
          assert.ok(Math.abs(feet[1].x) < 1e-7, 'preparation lifts one foot without sliding it');
        }
      }
    }
  }
});

test('settling steps do not overlap in any phase or stopping state', () => {
  for (const state of ['idle', 'stopping', 'turning', 'following']) {
    for (let distance = 0; distance < GAIT_CYCLE; distance += 0.5) {
      for (let step = 0; step <= 40; step += 1) {
        const { feet } = getGaitPose({ state, vx: 0, gaitDistance: distance, walkBlend: step / 40, walkReady: 0 });
        assert.ok(feet.some(foot => foot.lift < 1e-7), `${state}: at least one supporting foot`);
      }
    }
  }
});

test('feet retain their front-view order and arms oppose their own leg through a full cycle', () => {
  for (let distance = 0; distance < GAIT_CYCLE; distance += 0.1) {
    const { feet, armOffsets } = getGaitPose({ state: 'walking', vx: 46, gaitDistance: distance, walkBlend: 1 });
    assert.ok(FOOT_CENTERS[0] + feet[0].x + 2 < FOOT_CENTERS[1] + feet[1].x,
      'ankles must not swap sides and make an X-shaped step');
    feet.forEach((foot, index) => {
      assert.ok(foot.x * armOffsets[index] <= 0, 'each arm counters its own leg');
      assert.ok(Math.abs(armOffsets[index]) < 8);
    });
  }
});
