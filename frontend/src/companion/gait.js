/** Distance-based footsteps. A planted foot cancels the body's ground travel. */
export const GAIT_CYCLE = 42;
export const STANCE_FRACTION = 0.6;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = value => value * value * (3 - 2 * value);
const LOCOMOTION = new Set(['walking', 'following', 'returning', 'turning', 'idle']);

export function sampleFoot(distance, offset = 0) {
  const phase = ((distance / GAIT_CYCLE + offset) % 1 + 1) % 1;
  const halfStep = GAIT_CYCLE * STANCE_FRACTION / 2;
  if (phase <= STANCE_FRACTION) {
    return { x: halfStep - phase * GAIT_CYCLE, lift: 0, planted: true, phase };
  }
  const t = (phase - STANCE_FRACTION) / (1 - STANCE_FRACTION);
  // Match the ground velocity at toe-off and heel strike, then swing forward.
  // This avoids the sudden reversal of a plain sine-wave leg animation.
  const tangent = -GAIT_CYCLE * (1 - STANCE_FRACTION);
  const x = -halfStep * (2 * t ** 3 - 3 * t ** 2 + 1)
    + tangent * (t ** 3 - 2 * t ** 2 + t)
    + halfStep * (-2 * t ** 3 + 3 * t ** 2)
    + tangent * (t ** 3 - t ** 2);
  return { x, lift: 8 * Math.sin(Math.PI * t) ** 1.5, planted: false, phase };
}

export function getGaitPose(model, { reduced = false } = {}) {
  const speed = Math.abs(model.vx || 0);
  const enabled = !reduced && LOCOMOTION.has(model.state);
  const blend = enabled ? clamp(model.walkBlend ?? (speed > 0 ? 1 : 0), 0, 1) : 0;
  const distance = model.gaitDistance ?? model.distance ?? 0;
  const rawFeet = [sampleFoot(distance, 0.1), sampleFoot(distance, 0.6)];
  const settling = speed < 0.01 && (model.state === 'idle' || model.state === 'turning');
  // At rest, place the swing foot first, then collect the other foot. Moving
  // feet lift during this final adjustment instead of sliding along the floor.
  const first = rawFeet[0].lift >= rawFeet[1].lift ? 0 : 1;
  const feet = rawFeet.map((foot, index) => {
    if (blend === 0) return { ...foot, x: 0, lift: 0, planted: true };
    if (settling) {
      const t = clamp(((1 - blend) - (index === first ? 0 : 0.45)) / 0.55, 0, 1);
      return { ...foot, x: foot.x * (1 - smooth(t)),
        lift: foot.lift * (1 - smooth(t)) + Math.sin(Math.PI * t) * 4,
        planted: (t === 0 && foot.planted) || t === 1 };
    }
    return { ...foot, x: foot.x * blend,
      lift: foot.lift * blend + Math.sin(Math.PI * blend) * 3, planted: blend === 1 && foot.planted };
  });
  const travelPhase = distance / GAIT_CYCLE * Math.PI * 2;
  const facing = model.direction < 0 ? -1 : 1;
  const acceleration = clamp((model.acceleration || 0) * facing / 225, -1, 1);
  const turn = model.state === 'turning' ? Math.sin(Math.PI * (model.turnProgress || 0)) : 0;
  return {
    feet,
    blend,
    // Opposite arm/leg motion, subtle weight transfer and acceleration lean.
    armSwing: Math.sin(travelPhase + 0.2 * Math.PI) * 7 * blend,
    bob: (1 - Math.cos(travelPhase * 2)) * 0.65 * blend,
    lean: clamp(speed / 68 * 1.6 + acceleration * 1.2, -1.5, 3) * blend,
    turn,
  };
}
