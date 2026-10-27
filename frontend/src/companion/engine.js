/**
 * DOM-free companion simulation. Positions are viewport pixels at the sprite's
 * top-left; decoration belongs to the renderer, never to these collision values.
 * Call updateCompanion(model, elapsedSeconds, options) from one animation loop.
 * Drag timestamps are milliseconds. Commands return whether they were accepted;
 * update returns sparse events, not a narration of every animation frame.
 */
export const CHARACTER = Object.freeze({ width: 112, height: 152 });

const STEP = 1 / 120;
const EDGE = 8;
const GRAVITY = 1080;
const WALK_ACCELERATION = 145;
const WALK_BRAKING = 225;
const WALK_ANTICIPATION = 0.18;
const TURN_DURATION = 0.26;
const AIR = new Set(['anticipating', 'jumping', 'falling', 'landing']);
const MOVING = new Set(['walking', 'following', 'returning', 'turning', 'stopping']);
const DURATION = {
  greeting: 1.6, waving: 1.8, talking: 2.8, thinking: 2.4,
  observing: 3.4, snacking: 4.6, phone: 5.8, stretching: 3.1,
  anticipating: 0.23, landing: 0.48, waking: 0.9,
};
const COMMAND_STATES = {
  greet: 'greeting', wave: 'waving', talk: 'talking', think: 'thinking',
  sit: 'sitting', snack: 'snacking', phone: 'phone', stretch: 'stretching',
};
const COOLDOWN = { walk: 10, observe: 18, think: 20, stretch: 24, phone: 30, sit: 36, snack: 32, wave: 14, jump: 24, talk: 12 };
const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
const approach = (value, target, step) => value < target
  ? Math.min(value + step, target) : Math.max(value - step, target);
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const minX = () => EDGE;
const maxX = (m) => Math.max(EDGE, m.width - CHARACTER.width - EDGE);
const roamMinX = (m) => clamp(finite(m.roamMinX, EDGE), minX(), maxX(m));
const roamMaxX = (m) => clamp(finite(m.roamMaxX, maxX(m)), roamMinX(m), maxX(m));
const railTarget = (m, value) => clamp(value, roamMinX(m), roamMaxX(m));
const floorY = (m) => Math.max(EDGE, m.groundY - CHARACTER.height);
const randomRange = (m, low, high) => low + clamp(m.random(), 0, 0.999999) * (high - low);

function remember(m, name) {
  m.recentActions = [...m.recentActions.filter((item) => item !== name), name].slice(-5);
  m.cooldowns[name] = m.time + (COOLDOWN[name] ?? 24);
}

function enter(m, state) {
  m.state = state;
  m.stateAge = 0;
  if (state === 'idle') m.decisionAt = m.time + randomRange(m, 2, 6);
}

function idle(m) {
  m.targetX = null;
  m.turnNext = null;
  m.safetyReturn = false;
  m.walkReady = 0;
  m.turnProgress = 0;
  m.turnDirection = null;
  enter(m, 'idle');
}

function updateMood(m) {
  m.mood = m.dizzyFor > 0 ? 'dizzy' : m.energy < 25 ? 'sleepy'
    : m.state === 'snacking' ? 'happy' : m.curiosity > 65 ? 'curious'
      : m.familiarity > 3 ? 'comfortable' : 'thoughtful';
}

export function createCompanion({ width = 1024, height = 768, groundY, roamMinX: railMin = EDGE, roamMaxX: railMax = null, random = Math.random, familiarity = 0 } = {}) {
  const m = {
    width: Math.max(1, width), height: Math.max(1, height), groundY: groundY ?? height - 12,
    random, x: 0, y: 0, vx: 0, vy: 0, state: 'idle', stateAge: 0,
    direction: -1, energy: 78, curiosity: 44, mood: 'thoughtful', attention: 0.25,
    familiarity: clamp(familiarity, 0, 100), distance: 0, lookX: 0, lookY: 0,
    time: 0, accumulator: 0, decisionAt: 0, targetX: null, followTarget: null,
    following: false, turnNext: null, turnDirection: null, turnProgress: 0, queuedCommand: null, drag: null,
    gaitDistance: 0, gaitOrigin: 0, walkBlend: 0, acceleration: 0, walkReady: 0, lastWalkDirection: -1,
    recentActions: [], recentDestinations: [], cooldowns: {}, interactions: 0, dizzyFor: 0,
    impact: 0, landingKind: 'gentle', bounces: 0, autoAction: false,
    pendingEvents: [], restUntil: 0, homeX: 0,
    roamMinX: railMin, roamMaxX: railMax, peakImpact: 0, safetyReturn: false,
  };
  m.homeX = railTarget(m, width - CHARACTER.width - 28);
  m.x = m.homeX;
  m.y = floorY(m);
  m.decisionAt = randomRange(m, 1, 3);
  return m;
}

/** Resize keeps grounded feet on the rail and preserves airborne position when it fits. */
export function resizeCompanion(m, { width, height, groundY, roamMinX: railMin, roamMaxX: railMax } = {}) {
  const wasGrounded = m.state !== 'dragging' && m.vy === 0 && Math.abs(m.y - floorY(m)) < 0.5;
  m.width = Math.max(1, finite(width, m.width));
  m.height = Math.max(1, finite(height, m.height));
  m.groundY = clamp(finite(groundY, m.height - 12), EDGE, m.height);
  if (Number.isFinite(railMin)) m.roamMinX = railMin;
  if (Number.isFinite(railMax)) m.roamMaxX = railMax;
  m.homeX = railTarget(m, m.width - CHARACTER.width - 28);
  const previousX = m.x;
  m.x = wasGrounded ? railTarget(m, m.x) : clamp(m.x, minX(), maxX(m));
  if (m.x !== previousX) m.vx = 0;
  m.y = wasGrounded ? floorY(m) : clamp(m.y, EDGE, floorY(m));
  if (m.targetX !== null) m.targetX = railTarget(m, m.targetX);
  if (m.drag) {
    m.drag.targetX = clamp(m.drag.targetX, minX(), maxX(m));
    m.drag.targetY = clamp(m.drag.targetY, EDGE, floorY(m));
  } else if (!AIR.has(m.state) && m.y < floorY(m) - 0.5) {
    m.vy = 0;
    m.peakImpact = 0;
    m.bounces = 0;
    enter(m, 'falling');
  }
}

/** Pointer-follow is opt-in; calling this only updates the target and gaze. */
export function setFollowTarget(m, { x, y }) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  m.followTarget = { x, y };
  m.lookX = clamp((x - m.x - CHARACTER.width / 2) / 220, -1, 1);
  m.lookY = clamp((y - m.y - 44) / 200, -1, 1);
}

export function commandCompanion(m, action, target = {}) {
  if (action === 'stopFollowing') {
    m.following = false;
    if (m.state === 'following' || m.turnNext === 'following') idle(m);
    if (m.queuedCommand?.action === 'follow') m.queuedCommand = null;
    return true;
  }
  if (!Object.hasOwn(COMMAND_STATES, action) && !['jump', 'home', 'come', 'follow'].includes(action)) return false;
  if (m.state === 'dragging') return false;
  if (AIR.has(m.state) || m.safetyReturn) {
    m.queuedCommand = { action, target };
    return true;
  }
  // A greeting or sitting pose must not replace stepping legs while momentum
  // is still carrying the character. Finish the stop, then perform the latest
  // requested pose. Dragging and new walking commands can still interrupt it.
  const needsStillFeet = Object.hasOwn(COMMAND_STATES, action) || action === 'jump';
  if (needsStillFeet && (Math.abs(m.vx) > 0.01 || m.walkBlend > 0.01)) {
    m.queuedCommand = { action, target };
    m.autoAction = false;
    m.following = false;
    m.targetX = null;
    m.turnNext = null;
    m.turnDirection = null;
    m.turnProgress = 0;
    m.walkReady = 0;
    if (m.state !== 'stopping') enter(m, 'stopping');
    return true;
  }
  m.queuedCommand = null;
  m.interactions += 1;
  m.familiarity = clamp(m.familiarity + 0.12, 0, 100);
  m.attention = 1;
  m.autoAction = false;
  m.following = action === 'follow';
  m.targetX = null;
  m.turnNext = null;
  m.safetyReturn = false;
  m.walkReady = 0;
  m.turnProgress = 0;
  m.turnDirection = null;
  if (action === 'jump') {
    m.vx *= 0.25;
    m.vy = 0;
    m.peakImpact = 0;
    enter(m, 'anticipating');
  } else if (action === 'home' || action === 'come') {
    m.targetX = action === 'home' ? railTarget(m, m.homeX)
      : railTarget(m, finite(target.x, m.homeX + CHARACTER.width / 2) - CHARACTER.width / 2);
    enter(m, action === 'home' ? 'returning' : 'walking');
  } else if (action === 'follow') {
    if (Number.isFinite(target.x)) setFollowTarget(m, { x: target.x, y: finite(target.y, m.y) });
    enter(m, 'following');
  } else {
    enter(m, COMMAND_STATES[action]);
    if (action === 'sit') m.restUntil = m.time + 14;
  }
  remember(m, action);
  return true;
}

export function beginDrag(m, { x, y, time }) {
  if (![x, y, time].every(Number.isFinite)) return false;
  m.following = false;
  m.queuedCommand = null;
  m.targetX = null;
  m.turnNext = null;
  m.turnDirection = null;
  m.turnProgress = 0;
  m.walkReady = 0;
  m.vx = 0;
  m.vy = 0;
  m.bounces = 0;
  m.peakImpact = 0;
  m.safetyReturn = false;
  m.attention = 1;
  m.autoAction = false;
  m.drag = {
    offsetX: x - m.x, offsetY: y - m.y, targetX: m.x, targetY: m.y,
    samples: [{ x, y, time }], lastMovementAt: time,
  };
  enter(m, 'dragging');
  return true;
}

export function moveDrag(m, { x, y, time }) {
  if (!m.drag || ![x, y, time].every(Number.isFinite)) return false;
  const drag = m.drag;
  const previous = drag.samples.at(-1);
  if (time < previous.time) return false;
  if (x !== previous.x || y !== previous.y) drag.lastMovementAt = time;
  drag.samples.push({ x, y, time });
  drag.samples = drag.samples.filter((sample) => time - sample.time <= 110).slice(-12);
  drag.targetX = clamp(x - drag.offsetX, minX(), maxX(m));
  drag.targetY = clamp(y - drag.offsetY, EDGE, floorY(m));
  return true;
}

export function endDrag(m, { x, y, time, cancel = false } = {}) {
  if (!m.drag) return false;
  const drag = m.drag;
  const releaseTime = finite(time, drag.samples.at(-1).time);
  if (Number.isFinite(x) && Number.isFinite(y)) moveDrag(m, { x, y, time: releaseTime });
  const samples = drag.samples.filter((sample) => releaseTime - sample.time <= 110);
  const first = samples[0];
  const last = samples.at(-1);
  let vx = 0;
  let vy = 0;
  if (!cancel && first && last && releaseTime - drag.lastMovementAt < 100 && last.time - first.time >= 8) {
    const elapsed = (last.time - first.time) / 1000;
    vx = clamp((last.x - first.x) / elapsed, -420, 420);
    vy = clamp((last.y - first.y) / elapsed, -520, 520);
    const speed = Math.hypot(vx, vy);
    if (speed > 580) { vx *= 580 / speed; vy *= 580 / speed; }
  }
  // Release at the last drawn location, so pointer-up cannot teleport the body.
  m.drag = null;
  m.vx = vx;
  m.vy = vy;
  m.bounces = 0;
  m.dizzyFor = Math.hypot(vx, vy) > 460 ? 3.5 : 0;
  if (m.dizzyFor) m.pendingEvents.push('dizzy');
  enter(m, 'falling');
  return true;
}

function chooseWalkTarget(m) {
  const low = roamMinX(m), high = roamMaxX(m), span = high - low;
  const minimumTravel = Math.min(96, span * 0.22);
  // Sample across the whole available width, excluding tiny steps and reducing
  // recently visited areas. Both directions can win; there is no center magnet.
  const candidates = Array.from({ length: 6 }, (_, index) => {
    const x = low + span * (index + randomRange(m, 0.12, 0.88)) / 6;
    const recent = m.recentDestinations.some(previous => Math.abs(previous - x) < span * 0.15);
    const distance = Math.abs(x - m.x);
    const rangeWeight = distance <= Math.min(280, span * 0.35) ? 2.4 : distance <= span * 0.65 ? 1.5 : 0.45;
    const directionWeight = Math.sign(x - m.x) === m.lastWalkDirection ? 1.7 : 0.8;
    return { x, weight: rangeWeight * directionWeight * (recent ? 0.25 : 1) };
  }).filter(({ x }) => Math.abs(x - m.x) >= minimumTravel);
  if (!candidates.length) return Math.abs(m.x - low) > Math.abs(m.x - high) ? low : high;
  let pick = randomRange(m, 0, candidates.reduce((sum, item) => sum + item.weight, 0));
  let destination = candidates.at(-1).x;
  for (const candidate of candidates) {
    pick -= candidate.weight;
    if (pick < 0) { destination = candidate.x; break; }
  }
  m.recentDestinations = [...m.recentDestinations, destination].slice(-3);
  m.lastWalkDirection = Math.sign(destination - m.x) || m.lastWalkDirection;
  return destination;
}

function chooseAutonomous(m, events, options) {
  const candidates = [
    ['walk', m.energy > 30 && roamMaxX(m) - roamMinX(m) > 12 ? 6 + m.curiosity / 20 : 0],
    ['observe', 1.1 + m.curiosity / 80], ['think', 1.3], ['stretch', 1.8],
    ['phone', 1.5], ['sit', m.energy < 40 ? 8 : 0.7], ['snack', m.energy < 55 ? 2 : 1.2],
    ['wave', 2.4], ['jump', m.energy > 25 ? 1.7 : 0], ['talk', options.talkReady === false ? 0 : 3],
  ].map(([name, weight]) => [name, (m.cooldowns[name] ?? 0) > m.time || name === m.recentActions.at(-1) ? 0
    : weight * (m.recentActions.includes(name) ? 0.45 : 1)]);
  const total = candidates.reduce((sum, [, weight]) => sum + weight, 0);
  if (total === 0) { m.decisionAt = m.time + 5; return; }
  let pick = randomRange(m, 0, total);
  let action = candidates.at(-1)[0];
  for (const [name, weight] of candidates) {
    pick -= weight;
    if (pick < 0) { action = name; break; }
  }
  remember(m, action);
  m.autoAction = true;
  m.following = false;
  m.targetX = null;
  m.turnNext = null;
  m.turnDirection = null;
  m.turnProgress = 0;
  m.walkReady = 0;
  if (action === 'walk') {
    m.targetX = chooseWalkTarget(m);
    enter(m, 'walking');
  } else if (action === 'observe') {
    enter(m, 'observing');
    m.curiosity = Math.max(0, m.curiosity - 12);
  } else if (action === 'jump') {
    m.vx *= 0.25;
    m.vy = 0;
    m.peakImpact = 0;
    m.bounces = 0;
    enter(m, 'anticipating');
  } else {
    enter(m, COMMAND_STATES[action]);
    if (action === 'sit') { m.restUntil = m.time + 18; events.push('rest'); }
  }
  events.push(`activity:${action}`);
}

function groundedMovement(m, dt, options) {
  if (options.reduced && m.safetyReturn) m.x = railTarget(m, m.x);
  const inhibited = options.reduced || options.quiet && (m.autoAction || m.following)
    || options.menuOpen && m.autoAction;
  if (inhibited && MOVING.has(m.state)) { m.following = false; idle(m); }
  if (options.reduced) { m.vx = 0; return; }
  // The interaction menu exposes Stop following. Hold position without clearing
  // that mode, so opening the menu never silently changes the toggle's meaning.
  if (options.menuOpen && m.following) { m.vx = 0; return; }
  const previousVelocity = m.vx;
  let arrivalX = null;
  if (m.state === 'stopping') {
    m.walkReady = 0;
    m.vx = approach(m.vx, 0, WALK_BRAKING * dt);
    if (m.vx === 0 && m.walkBlend === 0) {
      idle(m);
      return;
    }
  } else if (m.state === 'turning') {
    // Finish braking in the old direction, then pivot with both feet down.
    // Facing must never flip while momentum still carries him the other way.
    m.vx = approach(m.vx, 0, WALK_BRAKING * dt);
    if (m.vx === 0 && (m.walkBlend < 0.02 || m.turnProgress > 0)) {
      m.turnProgress = Math.min(1, m.turnProgress + dt / TURN_DURATION);
      if (m.turnProgress >= 0.5 && m.turnDirection !== null) m.direction = m.turnDirection;
      if (m.turnProgress === 1) {
        const next = m.turnNext || 'walking';
        m.turnNext = null;
        m.turnDirection = null;
        m.turnProgress = 0;
        m.walkReady = 0;
        enter(m, next);
      }
    }
  } else if (MOVING.has(m.state)) {
    let target = m.targetX === null ? null : railTarget(m, m.targetX);
    let stoppingDistance = 0;
    if (m.state === 'following') {
      target = m.followTarget ? railTarget(m, m.followTarget.x - CHARACTER.width / 2) : m.x;
      stoppingDistance = 70;
    }
    const delta = target === null ? 0 : target - m.x;
    if (Math.abs(delta) <= stoppingDistance + 0.08) {
      m.vx = approach(m.vx, 0, WALK_BRAKING * dt);
      if (m.vx === 0 && m.state !== 'following') {
        if (target !== null) m.x = target;
        idle(m);
        return;
      }
      if (m.vx === 0) m.walkReady = 0;
    } else {
      const direction = Math.sign(delta);
      if (direction !== m.direction) {
        m.turnNext = m.state;
        m.turnDirection = direction;
        m.turnProgress = 0;
        enter(m, 'turning');
        m.vx = approach(m.vx, 0, WALK_BRAKING * dt);
      } else {
        if (m.walkReady === 0 && m.vx === 0 && m.walkBlend === 0) m.gaitOrigin = m.gaitDistance;
        m.walkReady = Math.min(1, m.walkReady + dt / WALK_ANTICIPATION);
        const speed = m.autoAction ? 46 : m.state === 'following' ? 54 : 68;
        const remaining = Math.max(0, Math.abs(delta) - stoppingDistance);
        // Use a conservative braking envelope with a short, smooth final step.
        // The same acceleration units drive both the envelope and the integrator.
        const wanted = m.walkReady < 1 && Math.abs(m.vx) < 0.01 ? 0
          : Math.min(speed, Math.sqrt(2 * WALK_BRAKING * 0.78 * remaining), remaining * 8);
        const rate = wanted < Math.abs(m.vx) ? WALK_BRAKING : WALK_ACCELERATION;
        m.vx = approach(m.vx, wanted === 0 ? 0 : direction * wanted, rate * dt);
        arrivalX = target - direction * stoppingDistance;
      }
    }
  } else {
    m.vx = approach(m.vx, 0, 280 * dt);
  }
  const nextX = m.x + (previousVelocity + m.vx) * 0.5 * dt;
  if (arrivalX !== null && (arrivalX - m.x) * (arrivalX - nextX) <= 0) {
    m.x = arrivalX;
    m.vx = 0;
    if (m.state !== 'following') idle(m);
  } else m.x = clamp(nextX, minX(), maxX(m));
  if (m.x === minX() && m.vx < 0 || m.x === maxX(m) && m.vx > 0) m.vx = 0;
}

function airborne(m, dt, events) {
  m.vy = Math.min(950, m.vy + GRAVITY * dt);
  m.vx *= Math.exp(-0.65 * dt);
  m.x += m.vx * dt;
  m.y += m.vy * dt;
  if (m.x < minX() || m.x > maxX(m)) {
    m.x = clamp(m.x, minX(), maxX(m));
    m.vx *= -0.28;
  }
  if (m.y < EDGE) { m.y = EDGE; m.vy = Math.abs(m.vy) * 0.18; }
  if (m.state === 'jumping' && m.vy >= 0) enter(m, 'falling');
  if (m.y >= floorY(m)) {
    m.y = floorY(m);
    const impact = Math.max(0, m.vy);
    m.peakImpact = Math.max(m.peakImpact, impact);
    m.impact = clamp(m.peakImpact / 950, 0, 1);
    m.vx *= 0.58;
    if (impact > 420 && m.bounces === 0) {
      m.vy = -Math.min(82, impact * 0.13);
      m.bounces += 1;
      return;
    }
    m.vy = 0;
    m.landingKind = m.impact > 0.6 ? 'heavy' : 'gentle';
    enter(m, 'landing');
    events.push('landed');
    if (m.peakImpact > 560) events.push('hardLanding');
  }
}

function tick(m, dt, options, events) {
  m.time += dt;
  m.stateAge += dt;
  m.dizzyFor = Math.max(0, m.dizzyFor - dt);
  m.attention = Math.max(0.15, m.attention - dt * 0.035);
  m.curiosity = clamp(m.curiosity + dt * 0.13, 0, 100);
  const resting = ['sitting', 'sleeping', 'snacking'].includes(m.state);
  m.energy = clamp(m.energy + dt * (resting ? 0.8 : MOVING.has(m.state) ? -0.15 : -0.025), 0, 100);
  const previousX = m.x;
  const previousVelocity = m.vx;
  const grounded = !AIR.has(m.state) && m.state !== 'dragging';

  if (m.state === 'dragging' && m.drag) {
    const smoothing = options.reduced ? 1 : 1 - Math.exp(-32 * dt);
    m.x += (m.drag.targetX - m.x) * smoothing;
    m.y += (m.drag.targetY - m.y) * smoothing;
  } else if (options.reduced && AIR.has(m.state)) {
    m.x = railTarget(m, m.x);
    m.y = floorY(m);
    m.vx = 0;
    m.vy = 0;
    idle(m);
  } else if (m.state === 'jumping' || m.state === 'falling') {
    airborne(m, dt, events);
  } else if (m.state === 'anticipating') {
    m.vx = approach(m.vx, 0, dt * 280);
    if (m.stateAge >= DURATION.anticipating) {
      m.vy = -350;
      m.bounces = 0;
      enter(m, 'jumping');
      events.push('jumped');
    }
  } else if (m.state === 'landing') {
    m.vx = approach(m.vx, 0, 450 * dt);
    m.x = clamp(m.x + m.vx * dt, minX(), maxX(m));
    if (m.stateAge >= DURATION.landing) {
      m.impact = 0;
      const safeX = railTarget(m, m.x);
      if (Math.abs(safeX - m.x) > 0.5) {
        // Landing always completes before a safe return. Manual drops may use
        // the whole viewport, but resting must not cover the control dock.
        m.safetyReturn = true;
        m.autoAction = false;
        m.following = false;
        m.targetX = safeX;
        m.turnNext = null;
        enter(m, 'returning');
      } else idle(m);
      events.push('recovered');
    }
  } else {
    groundedMovement(m, dt, options);
    if (DURATION[m.state] && m.stateAge >= DURATION[m.state]) {
      if (m.state === 'waking') events.push('wake');
      idle(m);
    } else if (m.state === 'sitting' && m.energy < 25 && m.stateAge > 6) {
      enter(m, 'sleeping');
      m.restUntil = m.time + 14;
      events.push('sleep');
    } else if (['sitting', 'sleeping'].includes(m.state) && m.time >= m.restUntil) {
      enter(m, 'waking');
    }
  }

  m.distance += Math.abs(m.x - previousX);
  // Only steps along the ground advance the gait; throws, drops and resizing
  // cannot secretly cycle the legs. Preparation and settling blend separately.
  if (grounded) m.gaitDistance += Math.abs(m.x - previousX);
  m.acceleration = grounded ? (m.vx - previousVelocity) / dt : 0;
  const stepping = grounded && Math.abs(m.vx) > 0.01;
  const preparing = grounded && MOVING.has(m.state) && m.state !== 'turning' && m.walkReady > 0;
  const desiredBlend = options.reduced ? 0 : stepping ? 1 : preparing ? m.walkReady : 0;
  m.walkBlend = options.reduced ? 0 : approach(m.walkBlend, desiredBlend, dt / (desiredBlend > m.walkBlend ? WALK_ANTICIPATION : 0.36));
  if (m.state === 'idle' && m.queuedCommand) {
    const queued = m.queuedCommand;
    m.queuedCommand = null;
    commandCompanion(m, queued.action, queued.target);
  }
  if (!options.reduced && !options.quiet && !options.menuOpen && m.state === 'idle' && m.time >= m.decisionAt) {
    chooseAutonomous(m, events, options);
  }
  updateMood(m);
}

export function updateCompanion(m, dt, options = {}) {
  if (options.paused || options.hidden || options.tabHidden) {
    m.accumulator = 0;
    return [];
  }
  const events = m.pendingEvents.splice(0);
  if (Number.isFinite(options.roamMinX)) m.roamMinX = options.roamMinX;
  if (Number.isFinite(options.roamMaxX)) m.roamMaxX = options.roamMaxX;
  // Discard suspension/backlogged frames rather than advancing a hidden lifetime.
  m.accumulator += clamp(finite(dt, 0), 0, 0.25);
  while (m.accumulator + 1e-9 >= STEP) {
    tick(m, STEP, options, events);
    m.accumulator -= STEP;
  }
  return events;
}
