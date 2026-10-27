import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHARACTER, createCompanion, resizeCompanion, updateCompanion, commandCompanion,
  beginDrag, moveDrag, endDrag, setFollowTarget,
} from './engine.js';

const create = () => createCompanion({ width: 1024, height: 768, random: () => 0.42 });
function seededRandom(initial = 17) {
  let seed = initial;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function run(model, seconds, fps = 60, options = {}) {
  const events = [];
  for (let i = 0; i < Math.round(seconds * fps); i += 1) events.push(...updateCompanion(model, 1 / fps, options));
  return events;
}

test('walking has matching positions and energy at 30, 60 and 144 Hz', () => {
  const models = [30, 60, 144].map((fps) => {
    const m = create();
    commandCompanion(m, 'come', { x: 280 });
    run(m, 5, fps);
    return m;
  });
  for (const model of models.slice(1)) {
    assert.ok(Math.abs(model.x - models[0].x) < 0.001);
    assert.ok(Math.abs(model.energy - models[0].energy) < 0.001);
    assert.equal(model.state, models[0].state);
  }
});

test('short and long walks prepare, arrive exactly, and stop without reversing or overshooting', () => {
  for (const direction of [-1, 1]) {
    for (const distance of [3, 65, 280]) {
      const m = create();
      m.x = 450;
      m.direction = direction;
      const destination = m.x + direction * distance;
      commandCompanion(m, 'come', { x: destination + CHARACTER.width / 2 });
      run(m, 0.1, 120, { quiet: true });
      assert.equal(m.x, 450, 'weight shifts before the first step');
      assert.equal(m.vx, 0);
      let previousX = m.x;
      for (let frame = 0; frame < 1200; frame += 1) {
        updateCompanion(m, 1 / 120, { quiet: true });
        assert.ok((m.x - previousX) * direction >= -1e-8, 'no backtracking near the destination');
        assert.ok((destination - m.x) * direction >= -1e-8, 'no overshoot');
        previousX = m.x;
      }
      assert.equal(m.x, destination);
      assert.equal(m.vx, 0);
      assert.equal(m.state, 'idle');
      assert.equal(m.walkBlend, 0);
    }
  }
});

test('reversing at walking speed brakes completely and plants the feet before pivoting', () => {
  const m = create();
  m.x = 400;
  m.direction = 1;
  commandCompanion(m, 'come', { x: 850 });
  run(m, 1, 120, { quiet: true });
  assert.equal(m.vx, 68);
  commandCompanion(m, 'come', { x: 200 });
  let flipped = false, wasPivoting = false, lastX = m.x;
  for (let frame = 0; frame < 180; frame += 1) {
    const before = m.direction;
    updateCompanion(m, 1 / 120, { quiet: true });
    if (m.turnProgress > 0) {
      assert.equal(m.vx, 0);
      assert.ok(m.walkBlend < 0.02);
      if (wasPivoting) assert.equal(m.x, lastX);
      wasPivoting = true;
    }
    if (before !== m.direction) {
      assert.equal(m.vx, 0);
      assert.ok(m.turnProgress >= 0.5);
      flipped = true;
    }
    if (m.vx > 0) assert.equal(m.direction, 1);
    if (m.vx < 0) assert.equal(m.direction, -1);
    lastX = m.x;
  }
  assert.ok(flipped);
  assert.ok(m.vx < 0);
});

test('dragging and airborne travel do not advance the walking cycle', () => {
  const m = create();
  commandCompanion(m, 'come', { x: 300 });
  run(m, 1);
  const walked = m.gaitDistance;
  assert.ok(walked > 0);
  beginDrag(m, { x: m.x, y: m.y, time: 0 });
  moveDrag(m, { x: 200, y: 100, time: 20 });
  run(m, 0.3);
  assert.equal(m.gaitDistance, walked);
  endDrag(m, { time: 25 });
  let airborneFrames = 0;
  while (['falling', 'jumping'].includes(m.state) && airborneFrames < 600) {
    updateCompanion(m, 1 / 120);
    assert.equal(m.gaitDistance, walked);
    airborneFrames += 1;
  }
  assert.ok(airborneFrames > 10);
});

test('an autonomous route stays committed when the pointer moves', () => {
  const m = createCompanion({ width: 1024, height: 768, random: () => 0 });
  m.decisionAt = 0;
  updateCompanion(m, 1 / 120);
  assert.equal(m.state, 'walking');
  const destination = m.targetX;
  for (let frame = 0; frame < 120; frame += 1) {
    setFollowTarget(m, { x: frame % 2 ? 100 : 900, y: 200 });
    updateCompanion(m, 1 / 120);
    assert.equal(m.targetX, destination);
    assert.equal(m.following, false);
  }
});

test('pose commands brake and settle before replacing the walking pose', () => {
  const poses = { greet: 'greeting', wave: 'waving', talk: 'talking', think: 'thinking',
    sit: 'sitting', snack: 'snacking', phone: 'phone', stretch: 'stretching', jump: 'anticipating' };
  for (const direction of [-1, 1]) {
    for (const [action, pose] of Object.entries(poses)) {
      const m = create();
      m.x = 450;
      m.direction = direction;
      commandCompanion(m, 'come', { x: m.x + 56 + direction * 350 });
      run(m, 1, 120, { quiet: true });
      assert.equal(Math.abs(m.vx), 68);
      commandCompanion(m, action);
      assert.equal(m.state, 'stopping', `${action} must first finish the walk`);
      let started = false;
      for (let frame = 0; frame < 180; frame += 1) {
        updateCompanion(m, 1 / 120, { quiet: true });
        if (m.state === pose) {
          assert.equal(m.vx, 0, `${pose} must not slide`);
          assert.equal(m.walkBlend, 0, `${pose} starts with the feet settled`);
          started = true;
          break;
        }
        assert.equal(m.state, 'stopping');
      }
      assert.ok(started, `${pose} must eventually execute`);
      const stoppedX = m.x;
      run(m, 0.15, 120, { quiet: true });
      assert.equal(m.x, stoppedX, `${pose} remains still`);
    }
  }
});

test('the latest reaction replaces the queued pose, and a new route cancels it', () => {
  const m = create();
  commandCompanion(m, 'come', { x: 300 });
  run(m, 1, 120, { quiet: true });
  commandCompanion(m, 'wave');
  run(m, 0.1, 120, { quiet: true });
  commandCompanion(m, 'sit');
  run(m, 1, 120, { quiet: true });
  assert.equal(m.state, 'sitting');
  assert.equal(m.queuedCommand, null);
  assert.equal(m.recentActions.at(-1), 'sit');

  commandCompanion(m, 'come', { x: 300 });
  run(m, 1, 120, { quiet: true });
  commandCompanion(m, 'wave');
  assert.equal(m.state, 'stopping');
  commandCompanion(m, 'come', { x: 850 });
  assert.equal(m.queuedCommand, null);
  for (let frame = 0; frame < 600; frame += 1) {
    updateCompanion(m, 1 / 120, { quiet: true });
    assert.notEqual(m.state, 'waving');
  }
});

test('a queued stop respects pause and reduced motion, and dragging cancels it', () => {
  for (const interrupt of ['paused', 'reduced', 'drag']) {
    const m = create();
    commandCompanion(m, 'come', { x: 300 });
    run(m, 1, 120, { quiet: true });
    commandCompanion(m, 'wave');
    if (interrupt === 'paused') {
      const before = [m.x, m.vx, m.walkBlend, m.stateAge];
      run(m, 2, 120, { paused: true });
      assert.deepEqual([m.x, m.vx, m.walkBlend, m.stateAge], before);
      run(m, 1, 120, { quiet: true });
      assert.equal(m.state, 'waving');
    } else if (interrupt === 'reduced') {
      const x = m.x;
      updateCompanion(m, 1 / 120, { reduced: true });
      assert.equal(m.state, 'waving');
      assert.equal(m.x, x);
      assert.equal(m.vx, 0);
    } else {
      beginDrag(m, { x: m.x, y: m.y, time: 0 });
      assert.equal(m.state, 'dragging');
      assert.equal(m.queuedCommand, null);
      endDrag(m, { time: 500, cancel: true });
      run(m, 2, 120, { quiet: true });
      assert.equal(m.state, 'idle');
    }
  }
});

test('a stationary follower releases its walking blend instead of holding a raised foot', () => {
  const m = create();
  commandCompanion(m, 'follow', { x: 350, y: 120 });
  run(m, 15);
  assert.equal(m.state, 'following');
  assert.equal(m.vx, 0);
  assert.equal(m.walkReady, 0);
  assert.equal(m.walkBlend, 0);
});

test('a direction change slows and turns before walking the other way', () => {
  const m = create();
  m.x = 400;
  commandCompanion(m, 'come', { x: 800 });
  run(m, 0.1);
  assert.equal(m.state, 'turning');
  assert.equal(m.direction, -1);
  run(m, 0.2);
  assert.equal(m.direction, 1);
  assert.equal(m.vx, 0, 'he shifts his weight after the pivot before stepping');
  run(m, 0.25);
  assert.ok(m.vx > 0 && m.vx < 68);
});

test('jump anticipation, airtime and landing are consistent across refresh rates', () => {
  for (const fps of [30, 60, 144]) {
    const m = create();
    commandCompanion(m, 'jump');
    assert.equal(m.state, 'anticipating');
    run(m, 0.1, fps);
    assert.equal(m.y, 768 - 12 - CHARACTER.height);
    const events = run(m, 2, fps, { quiet: true });
    assert.ok(events.includes('jumped'));
    assert.ok(events.includes('landed'));
    assert.ok(events.includes('recovered'));
    assert.equal(m.state, 'idle');
    assert.equal(m.vy, 0);
  }
});

test('walking commands queue while airborne and landing completes first', () => {
  const m = create();
  commandCompanion(m, 'jump');
  run(m, 0.3);
  commandCompanion(m, 'come', { x: 300 });
  assert.equal(m.state, 'jumping');
  let sawLanding = false;
  for (let i = 0; i < 180; i += 1) {
    const before = m.state;
    const age = m.stateAge;
    updateCompanion(m, 1 / 120, { quiet: true });
    if (m.state === 'landing') sawLanding = true;
    if (before === 'landing' && age < 0.47) assert.equal(m.state, 'landing');
  }
  assert.ok(sawLanding);
  assert.ok(['walking', 'turning'].includes(m.state));
});

test('dragging interrupts any mode and smooths toward the pointer without a teleport', () => {
  const m = create();
  commandCompanion(m, 'jump');
  run(m, 0.4);
  beginDrag(m, { x: m.x + 20, y: m.y + 20, time: 0 });
  const initial = m.x;
  moveDrag(m, { x: initial - 200 + 20, y: 200, time: 16 });
  assert.equal(m.x, initial);
  updateCompanion(m, 1 / 60);
  assert.equal(m.state, 'dragging');
  assert.ok(m.x < initial && m.x > initial - 200);
});

test('recent release velocity is capped and a throw settles inside the viewport', () => {
  const m = create();
  beginDrag(m, { x: m.x + 30, y: m.y + 30, time: 0 });
  moveDrag(m, { x: 500, y: 170, time: 20 });
  run(m, 0.15);
  moveDrag(m, { x: 100, y: 20, time: 40 });
  endDrag(m, { time: 45 });
  assert.ok(Math.hypot(m.vx, m.vy) <= 580.00001);
  const events = run(m, 8, 60, { quiet: true });
  assert.ok(events.includes('landed'));
  assert.equal(m.state, 'idle');
  assert.equal(m.y, 768 - 12 - CHARACTER.height);
  assert.equal(m.vx, 0);
  assert.ok(m.x >= 8 && m.x <= 1024 - CHARACTER.width - 8);
});

test('stationary holds and cancelled drags do not launch with stale velocity', () => {
  for (const cancel of [true, false]) {
    const m = create();
    beginDrag(m, { x: 800, y: 600, time: 0 });
    moveDrag(m, { x: 400, y: 200, time: 30 });
    run(m, 0.2);
    endDrag(m, { x: 400, y: 200, time: cancel ? 40 : 500, cancel });
    assert.equal(m.vx, 0);
    assert.equal(m.vy, 0);
  }
});

test('pause, hiding and background tabs freeze state, energy and position', () => {
  for (const option of ['paused', 'hidden', 'tabHidden']) {
    const m = create();
    commandCompanion(m, 'jump');
    run(m, 0.4);
    const before = [m.x, m.y, m.vy, m.time, m.stateAge, m.energy];
    run(m, 30, 60, { [option]: true });
    assert.deepEqual([m.x, m.y, m.vy, m.time, m.stateAge, m.energy], before);
  }
});

test('quiet mode stops autonomous wandering but accepts a manual wave and come-here', () => {
  const m = create();
  const x = m.x;
  run(m, 60, 60, { quiet: true });
  assert.equal(m.state, 'idle');
  assert.equal(m.x, x);
  commandCompanion(m, 'wave');
  assert.equal(m.state, 'waving');
  run(m, 2, 60, { quiet: true });
  assert.equal(m.state, 'idle');
  commandCompanion(m, 'come', { x: 300 });
  run(m, 1, 60, { quiet: true });
  assert.ok(m.x < x);
});

test('reduced motion prevents wandering, following and jumping but manual poses expire', () => {
  const m = create();
  const before = [m.x, m.y];
  commandCompanion(m, 'follow', { x: 100, y: 100 });
  run(m, 10, 60, { reduced: true });
  assert.deepEqual([m.x, m.y], before);
  assert.equal(m.following, false);
  commandCompanion(m, 'jump');
  run(m, 1, 60, { reduced: true });
  assert.deepEqual([m.x, m.y], before);
  commandCompanion(m, 'wave');
  assert.equal(m.state, 'waving');
  run(m, 2, 60, { reduced: true });
  assert.equal(m.state, 'idle');
});

test('follow remains on the designated rail and keeps a comfortable stopping distance', () => {
  const m = create();
  commandCompanion(m, 'follow', { x: 350, y: 120 });
  run(m, 15);
  const center = m.x + CHARACTER.width / 2;
  assert.ok(Math.abs(center - 350) < 74);
  assert.ok(Math.abs(center - 350) > 60);
  assert.equal(m.y, 768 - 12 - CHARACTER.height);
  setFollowTarget(m, { x: 700, y: 20 });
  run(m, 10);
  assert.ok(Math.abs(m.x + CHARACTER.width / 2 - 700) < 74);
  commandCompanion(m, 'stopFollowing');
  assert.equal(m.following, false);
});

test('resize keeps grounded feet on the rail and clamps positions that no longer fit', () => {
  const m = create();
  m.x = 200;
  resizeCompanion(m, { width: 1200, height: 900 });
  assert.equal(m.x, 200);
  assert.equal(m.y, 900 - 12 - CHARACTER.height);
  assert.equal(m.state, 'idle');
  resizeCompanion(m, { width: 180, height: 300 });
  assert.ok(m.x <= 180 - CHARACTER.width - 8);
  assert.ok(m.y <= 300 - 12 - CHARACTER.height);
});

test('resize preserves airborne positions when the new viewport still contains them', () => {
  const m = create();
  commandCompanion(m, 'jump');
  run(m, 0.5);
  const position = [m.x, m.y];
  resizeCompanion(m, { width: 1200, height: 900 });
  assert.deepEqual([m.x, m.y], position);
  assert.equal(m.state, 'jumping');
});

test('cooldowns and recent memory prevent immediately repeating autonomous actions', () => {
  const m = create();
  m.random = () => 0;
  const actions = [];
  for (let i = 0; i < 4; i += 1) {
    m.state = 'idle';
    m.decisionAt = m.time;
    updateCompanion(m, 1 / 60);
    actions.push(m.recentActions.at(-1));
  }
  assert.equal(new Set(actions).size, 4);
  assert.ok(m.recentActions.length <= 5);
});

test('low energy leads to sleep and waking while restoring energy', () => {
  const m = create();
  m.energy = 10;
  commandCompanion(m, 'sit');
  const events = run(m, 25, 60, { quiet: true });
  assert.ok(events.includes('sleep'));
  assert.ok(events.includes('wake'));
  assert.ok(m.energy > 20);
  assert.equal(m.state, 'idle');
});

test('designated rail limits navigation without restricting manual dragging', () => {
  const m = createCompanion({ width: 1024, height: 768, roamMinX: 30, roamMaxX: 650 });
  assert.equal(m.x, 650);
  commandCompanion(m, 'come', { x: 1000 });
  run(m, 1, 60, { quiet: true });
  assert.ok(m.x <= 650);
  beginDrag(m, { x: m.x, y: m.y, time: 0 });
  moveDrag(m, { x: 850, y: 300, time: 20 });
  run(m, 0.3);
  assert.ok(m.x > 800);
  endDrag(m, { time: 500, cancel: true });
  run(m, 2, 60, { quiet: true });
  commandCompanion(m, 'home');
  run(m, 6, 60, { quiet: true });
  assert.ok(m.x <= 652);
});

test('a high drop emits one hard landing after its damped bounce', () => {
  const m = create();
  m.y = 30;
  m.state = 'falling';
  const events = run(m, 4, 60, { quiet: true });
  assert.equal(events.filter((event) => event === 'hardLanding').length, 1);
  assert.equal(events.filter((event) => event === 'landed').length, 1);
  assert.equal(m.state, 'idle');
  assert.equal(m.vy, 0);
});

test('enabling reduced motion during a walk immediately stops positional animation', () => {
  const m = create();
  commandCompanion(m, 'come', { x: 200 });
  run(m, 1);
  assert.notEqual(m.vx, 0);
  const x = m.x;
  run(m, 3, 60, { reduced: true });
  assert.equal(m.x, x);
  assert.equal(m.vx, 0);
});

test('an open interaction menu allows explicit come-here but pauses autonomous walking', () => {
  const manual = create();
  const x = manual.x;
  commandCompanion(manual, 'come', { x: 200 });
  run(manual, 1, 60, { menuOpen: true });
  assert.ok(manual.x < x);
  const autonomous = create();
  autonomous.state = 'walking';
  autonomous.autoAction = true;
  autonomous.targetX = 200;
  run(autonomous, 1, 60, { menuOpen: true });
  assert.equal(autonomous.state, 'idle');
  assert.equal(autonomous.x, x);
});

test('opening the menu holds follow mode in place so it can resume or be stopped explicitly', () => {
  const m = create();
  commandCompanion(m, 'follow', { x: 200, y: 100 });
  run(m, 1);
  const x = m.x;
  const state = m.state;
  assert.notEqual(m.vx, 0);
  run(m, 4, 60, { menuOpen: true });
  assert.equal(m.x, x);
  assert.equal(m.vx, 0);
  assert.equal(m.state, state);
  assert.equal(m.following, true);
  run(m, 1);
  assert.ok(m.x < x);
  run(m, 1, 60, { menuOpen: true });
  commandCompanion(m, 'stopFollowing');
  assert.equal(m.following, false);
  assert.equal(m.state, 'idle');
});

test('quiet and reduced-motion settings still disable follow while its menu is open', () => {
  for (const option of ['quiet', 'reduced']) {
    const m = create();
    commandCompanion(m, 'follow', { x: 200, y: 100 });
    run(m, 1);
    run(m, 1, 60, { menuOpen: true, [option]: true });
    assert.equal(m.following, false);
    assert.equal(m.state, 'idle');
  }
});

test('desktop-to-mobile resize keeps even a paused grounded character outside the control dock', () => {
  const m = createCompanion({ width: 1440, height: 900, roamMaxX: 1146 });
  assert.equal(m.x, 1146);
  run(m, 1, 60, { paused: true });
  resizeCompanion(m, { width: 390, height: 844, roamMaxX: 96 });
  assert.equal(m.x, 96);
  assert.equal(m.y, 844 - 12 - CHARACTER.height);
  assert.ok(m.x + CHARACTER.width < 222);
  assert.equal(m.state, 'idle');
  assert.equal(m.vx, 0);
});

test('a drop beyond the safe rail lands completely before returning away from the dock', () => {
  const m = createCompanion({ width: 390, height: 844, roamMaxX: 96 });
  beginDrag(m, { x: m.x, y: m.y, time: 0 });
  moveDrag(m, { x: 260, y: 300, time: 20 });
  run(m, 0.3);
  assert.ok(m.x > 250);
  endDrag(m, { time: 500, cancel: true });
  let sawLanding = false;
  let sawReturn = false;
  for (let i = 0; i < 1200; i += 1) {
    const previousState = m.state;
    const previousAge = m.stateAge;
    updateCompanion(m, 1 / 120, { quiet: true });
    if (m.state === 'landing') sawLanding = true;
    if (m.state === 'returning') {
      assert.ok(sawLanding);
      sawReturn = true;
    }
    if (previousState === 'landing' && previousAge < 0.47) assert.equal(m.state, 'landing');
  }
  assert.ok(sawReturn);
  assert.equal(m.state, 'idle');
  assert.ok(m.x <= 96);
  assert.ok(m.x + CHARACTER.width < 222);
  assert.equal(m.safetyReturn, false);
});

test('safe return respects pause and keeps a queued reaction until the character is safe', () => {
  const m = createCompanion({ width: 390, height: 844, roamMaxX: 96 });
  m.x = 260;
  m.y = 300;
  m.state = 'falling';
  run(m, 2, 60, { quiet: true });
  assert.ok(m.safetyReturn);
  commandCompanion(m, 'wave');
  assert.notEqual(m.state, 'waving');
  const x = m.x;
  run(m, 5, 60, { paused: true });
  assert.equal(m.x, x);
  let waved = false;
  for (let i = 0; i < 300; i += 1) {
    updateCompanion(m, 1 / 60, { quiet: true });
    if (m.state === 'waving') { waved = true; assert.ok(m.x <= 96); }
  }
  assert.ok(waved);
});

test('reduced-motion release settles directly in the safe rail without an animated return', () => {
  const m = createCompanion({ width: 390, height: 844, roamMaxX: 96 });
  beginDrag(m, { x: m.x, y: m.y, time: 0 });
  moveDrag(m, { x: 260, y: 300, time: 20 });
  updateCompanion(m, 1 / 60, { reduced: true });
  assert.equal(m.x, 260);
  endDrag(m, { time: 500, cancel: true });
  updateCompanion(m, 1 / 60, { reduced: true });
  assert.equal(m.x, 96);
  assert.equal(m.y, 844 - 12 - CHARACTER.height);
  assert.equal(m.state, 'idle');
});

test('the first autonomous activity begins between one and three seconds', () => {
  for (const sample of [0, 0.5, 0.999]) {
    const m = createCompanion({ width: 1024, height: 768, random: () => sample });
    let first = null;
    for (let i = 0; i < 200 && first === null; i += 1) {
      const events = updateCompanion(m, 1 / 60);
      if (events.some(event => event.startsWith('activity:'))) first = m.time;
    }
    assert.ok(first >= 1 - 1e-6 && first <= 3.02, `First activity at ${first}`);
    assert.notEqual(m.state, 'idle');
  }
});

test('autonomous wandering visits broad, varied destinations in both directions without tiny steps', () => {
  for (const width of [390, 1440]) {
    const m = createCompanion({ width, height: 844, random: seededRandom() });
    const walks = [];
    const span = width - CHARACTER.width - 16;
    for (let i = 0; i < 18000; i += 1) {
      const events = updateCompanion(m, 1 / 30);
      if (events.includes('activity:walk')) walks.push({ from: m.x, to: m.targetX });
      assert.ok(m.x >= 8 && m.x <= width - CHARACTER.width - 8);
    }
    assert.ok(walks.length >= 8);
    assert.ok(Math.min(...walks.map(walk => walk.to)) < 8 + span * 0.2);
    assert.ok(Math.max(...walks.map(walk => walk.to)) > 8 + span * 0.8);
    assert.ok(walks.some(walk => walk.to < walk.from));
    assert.ok(walks.some(walk => walk.to > walk.from));
    assert.ok(walks.some(walk => walk.from < width / 2 && walk.to < walk.from));
    for (const walk of walks) assert.ok(Math.abs(walk.to - walk.from) >= Math.min(96, span * 0.22) - 1);
  }
});

test('autonomy includes spontaneous waving, jumping and talking with varied nonrepeating activities', () => {
  const m = createCompanion({ width: 390, height: 844, random: seededRandom() });
  const events = run(m, 600, 30);
  const activities = events.filter(event => event.startsWith('activity:'));
  const expected = ['walk', 'observe', 'think', 'stretch', 'phone', 'sit', 'snack', 'wave', 'jump', 'talk'];
  for (const activity of expected) assert.ok(activities.includes(`activity:${activity}`), activity);
  assert.ok(activities.length > 50);
  for (let i = 1; i < activities.length; i += 1) assert.notEqual(activities[i], activities[i - 1]);
  assert.equal(events.filter(event => event === 'activity:jump').length, events.filter(event => event === 'jumped').length);
});

test('faster autonomy remains suppressed by pause, hide, quiet, reduced motion and an open menu', () => {
  for (const option of ['paused', 'hidden', 'tabHidden', 'quiet', 'reduced', 'menuOpen']) {
    const m = createCompanion({ width: 390, height: 844, random: seededRandom() });
    const x = m.x;
    const events = run(m, 90, 30, { [option]: true });
    assert.equal(events.some(event => event.startsWith('activity:')), false, option);
    assert.equal(m.state, 'idle', option);
    assert.equal(m.x, x, option);
  }
});

test('speech readiness gates spontaneous talking without suppressing other activities', () => {
  const m = createCompanion({ width: 390, height: 844, random: seededRandom() });
  const gated = run(m, 300, 30, { talkReady: false });
  assert.equal(gated.includes('activity:talk'), false);
  assert.ok(gated.includes('activity:walk'));
  assert.ok(gated.includes('activity:wave'));
  const ready = run(m, 300, 30, { talkReady: true });
  assert.ok(ready.includes('activity:talk'));
});

test('new autonomy keeps short idle pauses while completing sitting and landing before a new activity', () => {
  const m = createCompanion({ width: 390, height: 844, random: seededRandom() });
  commandCompanion(m, 'sit');
  assert.equal(run(m, 10, 60).some(event => event.startsWith('activity:')), false);
  assert.equal(m.state, 'sitting');
  for (let i = 0; i < 600 && m.state !== 'idle'; i += 1) updateCompanion(m, 1 / 120);
  assert.equal(m.state, 'idle');
  assert.ok(m.decisionAt - m.time >= 2 && m.decisionAt - m.time <= 6);
  commandCompanion(m, 'jump');
  assert.equal(run(m, 1, 60).some(event => event.startsWith('activity:')), false);
  assert.ok(['falling', 'landing'].includes(m.state));
});
