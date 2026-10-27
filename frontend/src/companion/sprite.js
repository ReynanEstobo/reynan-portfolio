/**
 * A hand-drawn, reference-based 112 × 152 pixel character.
 * Every shape is rasterised on the logical pixel grid: there are no rotated
 * textures, canvas text, gradients, network assets, or antialiased paths.
 * Call once per animation frame. The engine owns position and behavioural state;
 * this module only poses the character. stateAge is in seconds.
 */
import { FOOT_CENTERS, getGaitPose } from './gait.js';

const C = Object.freeze({
  ink: '#101c28', hair: '#101921', hairDeep: '#0b1219', hairMid: '#22323e', hairLight: '#344754',
  skin: '#dba16e', skinLight: '#f0bb85', skinShade: '#b67d58', skinDeep: '#855b46',
  navy: '#18334f', navyLight: '#244765', navyShade: '#11263d', cloth: '#345672',
  white: '#ede8d7', whiteShade: '#bcbfac', glasses: '#07151e', lens: '#162b35', glint: '#587381',
  trousers: '#687680', trousersLight: '#89949a', trousersShade: '#45535f',
  sole: '#cdd0c4', shoe: '#14212c', shoeLight: '#293b49',
  soup: '#d9a34e', bowl: '#d7e3d9', bowlShade: '#8ba5a0', leaf: '#5c9955',
});

const round = Math.round;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function rect(ctx, color, x, y, width, height) {
  ctx.fillStyle = color;
  ctx.fillRect(round(x), round(y), Math.max(1, round(width)), Math.max(1, round(height)));
}

// Fill pixel rows ourselves so even diagonal silhouettes have deliberate steps.
function poly(ctx, color, points) {
  const p = points.map(([x, y]) => [round(x), round(y)]);
  const minY = Math.min(...p.map((v) => v[1]));
  const maxY = Math.max(...p.map((v) => v[1]));
  ctx.fillStyle = color;
  for (let y = minY; y < maxY; y += 1) {
    const intersections = [];
    for (let i = 0; i < p.length; i += 1) {
      const a = p[i];
      const b = p[(i + 1) % p.length];
      if ((a[1] <= y + 0.5 && b[1] > y + 0.5) || (b[1] <= y + 0.5 && a[1] > y + 0.5)) {
        intersections.push(a[0] + ((y + 0.5 - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i < intersections.length - 1; i += 2) {
      const x = Math.ceil(intersections[i] - 0.5);
      ctx.fillRect(x, y, Math.max(1, Math.ceil(intersections[i + 1] - 0.5) - x), 1);
    }
  }
}

function segment(ctx, color, a, b, width, endWidth = width) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  poly(ctx, color, [
    [a[0] + nx * width / 2, a[1] + ny * width / 2],
    [b[0] + nx * endWidth / 2, b[1] + ny * endWidth / 2],
    [b[0] - nx * endWidth / 2, b[1] - ny * endWidth / 2],
    [a[0] - nx * width / 2, a[1] - ny * width / 2],
  ]);
}

function pixelLine(ctx, color, x0, y0, x1, y1, width = 1) {
  let x = round(x0);
  let y = round(y0);
  const endX = round(x1);
  const endY = round(y1);
  const dx = Math.abs(endX - x);
  const dy = -Math.abs(endY - y);
  const sx = x < endX ? 1 : -1;
  const sy = y < endY ? 1 : -1;
  let error = dx + dy;
  while (true) {
    rect(ctx, color, x, y, width, width);
    if (x === endX && y === endY) break;
    const twice = 2 * error;
    if (twice >= dy) { error += dy; x += sx; }
    if (twice <= dx) { error += dx; y += sy; }
  }
}

function hand(ctx, position, open = false) {
  const [x, y] = position;
  rect(ctx, C.ink, x - 4, y - 2, 8, 10);
  rect(ctx, C.skin, x - 3, y - 2, 6, 8);
  rect(ctx, C.skinLight, x - 2, y - 1, 3, 5);
  rect(ctx, C.skinShade, x + 1, y + 2, 2, 4);
  rect(ctx, C.skinShade, x - 3, y + 5, 3, 1);
  if (open) {
    rect(ctx, C.skin, x - 4, y - 6, 2, 5);
    rect(ctx, C.skinLight, x - 1, y - 8, 2, 6);
    rect(ctx, C.skin, x + 2, y - 6, 2, 5);
    rect(ctx, C.skinShade, x + 4, y - 3, 2, 5);
  }
}

function arm(ctx, shoulder, elbow, wrist, { far = false, open = false } = {}) {
  segment(ctx, C.ink, shoulder, elbow, 13, 11);
  segment(ctx, far ? C.navyShade : C.navy, shoulder, elbow, 11, 9);
  const cuff = [shoulder[0] + (elbow[0] - shoulder[0]) * 0.72, shoulder[1] + (elbow[1] - shoulder[1]) * 0.72];
  segment(ctx, C.ink, cuff, wrist, 9, 7);
  segment(ctx, far ? C.skinShade : C.skin, cuff, wrist, 7, 5);
  if (!far) segment(ctx, C.skinLight, [cuff[0] - 1, cuff[1]], [wrist[0] - 1, wrist[1] - 1], 2, 2);
  // The same three shirt stripes stay attached to the upper arm in every pose.
  for (let i = -1; i <= 1; i += 1) {
    const dx = elbow[0] - shoulder[0];
    const dy = elbow[1] - shoulder[1];
    const length = Math.hypot(dx, dy) || 1;
    const shiftX = (-dy / length) * i * 3;
    const shiftY = (dx / length) * i * 3;
    pixelLine(ctx, far ? C.whiteShade : C.white,
      shoulder[0] + shiftX, shoulder[1] + shiftY,
      cuff[0] + shiftX, cuff[1] + shiftY, 1);
  }
  hand(ctx, wrist, open);
}

function shoe(ctx, ankle, direction, lifted = false) {
  const [x, y] = ankle;
  const toe = x + direction * 8;
  poly(ctx, C.ink, [[x - 7, y - 4], [x + 5, y - 4], [x + 7, y], [toe + 6, y + 1], [toe + 6, y + 7], [x - 8, y + 7]]);
  rect(ctx, C.shoe, x - 6, y - 3, 11, 7);
  rect(ctx, C.shoeLight, Math.min(x - 5, toe - 3), y + 1, 12, 3);
  rect(ctx, C.sole, Math.min(x - 7, toe - 3), y + 5 - (lifted ? 1 : 0), Math.abs(toe - x) + 9, 2);
  rect(ctx, C.whiteShade, x - 2, y - 1, 5, 1);
  rect(ctx, C.whiteShade, x - 2, y + 1, 4, 1);
}

function leg(ctx, hip, knee, ankle, direction, far = false, lifted = false) {
  segment(ctx, C.ink, hip, knee, 16, 14);
  segment(ctx, far ? C.trousersShade : C.trousers, hip, knee, 14, 12);
  segment(ctx, C.ink, knee, ankle, 14, 12);
  segment(ctx, far ? C.trousersShade : C.trousers, knee, ankle, 12, 10);
  segment(ctx, far ? C.trousers : C.trousersLight,
    [hip[0] - 3, hip[1]], [knee[0] - 3, knee[1] - 1], 3, 2);
  segment(ctx, C.trousersShade, [knee[0] + 3, knee[1]], [ankle[0] + 3, ankle[1]], 2);
  pixelLine(ctx, C.trousersLight, knee[0] - 3, knee[1], knee[0] + 2, knee[1] + 1);
  shoe(ctx, ankle, direction, lifted);
}

function walkingKnee(hip, ankle, rest, blend) {
  const dx = ankle[0] - hip[0], dy = ankle[1] - hip[1];
  const distance = Math.max(0.01, Math.hypot(dx, dy));
  const reach = Math.min(distance, 45.99);
  const along = (22 ** 2 - 24 ** 2 + reach ** 2) / (2 * reach);
  const bend = Math.sqrt(Math.max(0, 22 ** 2 - along ** 2));
  const knee = [hip[0] + dx / distance * along + dy / distance * bend,
    hip[1] + dy / distance * along - dx / distance * bend];
  return rest.map((value, index) => value + (knee[index] - value) * blend);
}

function torso(ctx, x, y, seated, breath) {
  const height = seated ? 32 : 43;
  poly(ctx, C.ink, [[x - 14, y], [x + 13, y], [x + 21, y + 8], [x + 18, y + height], [x - 20, y + height], [x - 21, y + 9]]);
  poly(ctx, C.navy, [[x - 13, y + 1], [x + 12, y + 1], [x + 19, y + 8], [x + 16, y + height - 2], [x - 18, y + height - 2], [x - 19, y + 9]]);
  poly(ctx, C.navyLight, [[x - 13, y + 3], [x - 4, y + 7], [x - 8, y + height - 5], [x - 17, y + height - 3]]);
  poly(ctx, C.navyShade, [[x + 13, y + 9], [x + 18, y + 9], [x + 16, y + height - 2], [x + 4, y + height - 2], [x + 10, y + 22]]);
  // V-neck collar, not an invented logo. Small chest stitches echo the reference.
  poly(ctx, C.whiteShade, [[x - 12, y + 1], [x - 7, y], [x, y + 8], [x + 8, y], [x + 13, y + 2], [x + 1, y + 15]]);
  poly(ctx, C.white, [[x - 11, y], [x - 7, y], [x, y + 8], [x + 7, y], [x + 11, y + 1], [x, y + 12]]);
  rect(ctx, C.whiteShade, x + 7, y + 19 + breath, 7, 1);
  rect(ctx, C.whiteShade, x + 8, y + 21 + breath, 5, 1);
  pixelLine(ctx, C.cloth, x - 13, y + height - 9, x - 5, y + height - 7);
  pixelLine(ctx, C.navyShade, x - 16, y + height - 4, x + 13, y + height - 3);
  pixelLine(ctx, C.cloth, x - 16, y + 20, x - 13, y + 24);
}

function face(ctx, x, y, { lookX = 0, lookY = 0, speaking = false, sleepy = false, hurt = false } = {}) {
  const rx = round(x - 56 + clamp(lookX, -1, 1));
  const ry = round(y - 12 + clamp(lookY, -1, 1));
  ctx.save();
  ctx.translate(rx, ry);
  // Neck and jaw are visible below a recognisable swept fringe and wraparound frames.
  rect(ctx, C.ink, 49, 51, 16, 15);
  rect(ctx, C.skinShade, 50, 52, 14, 12);
  poly(ctx, C.skin, [[49, 53], [64, 51], [65, 61], [56, 66], [48, 60]]);
  poly(ctx, C.ink, [[36, 26], [44, 20], [66, 22], [74, 30], [73, 49], [65, 59], [54, 63], [43, 58], [36, 49]]);
  poly(ctx, C.skin, [[38, 28], [45, 23], [65, 24], [71, 31], [70, 49], [63, 57], [54, 60], [44, 55], [38, 47]]);
  poly(ctx, C.skinLight, [[40, 32], [50, 27], [62, 30], [64, 48], [57, 56], [46, 53], [40, 45]]);
  poly(ctx, C.skinShade, [[67, 30], [71, 31], [70, 49], [63, 57], [54, 60], [54, 57], [63, 52], [65, 43]]);
  // Visible ear, inner ear and the small dark stud from the supplied portrait.
  poly(ctx, C.ink, [[70, 32], [76, 31], [79, 35], [76, 45], [71, 49], [69, 42]]);
  poly(ctx, C.skin, [[71, 34], [76, 33], [77, 36], [74, 44], [71, 46]]);
  pixelLine(ctx, C.skinDeep, 74, 35, 72, 40);
  rect(ctx, C.skinLight, 74, 34, 2, 2);
  rect(ctx, C.ink, 72, 43, 2, 2);
  rect(ctx, C.whiteShade, 72, 43, 1, 1);

  // Hair silhouette and a small number of staggered highlight clusters.
  poly(ctx, C.hairDeep, [[34, 36], [32, 26], [34, 19], [37, 19], [37, 13], [42, 13], [42, 9], [48, 10], [48, 7], [57, 9], [61, 7], [66, 11], [72, 11], [72, 16], [76, 18], [77, 29], [73, 37], [67, 36], [64, 32], [58, 38], [53, 37], [49, 40], [45, 38], [39, 40]]);
  poly(ctx, C.hair, [[35, 25], [39, 16], [47, 12], [57, 11], [66, 15], [72, 20], [72, 29], [65, 30], [58, 35], [49, 36], [40, 37], [35, 32]]);
  const strands = [
    [40, 21, 49, 15], [36, 29, 50, 19], [39, 33, 53, 21],
    [45, 34, 58, 21], [51, 32, 61, 20], [58, 29, 65, 21],
    [57, 13, 64, 17], [65, 15, 70, 21], [69, 24, 69, 30],
  ];
  for (const [x1, y1, x2, y2] of strands) pixelLine(ctx, C.hairMid, x1, y1, x2, y2, 2);
  pixelLine(ctx, C.hairLight, 37, 26, 43, 21);
  pixelLine(ctx, C.hairLight, 43, 30, 49, 24);
  pixelLine(ctx, C.hairLight, 54, 28, 58, 24);
  rect(ctx, C.hairLight, 58, 13, 3, 1);
  rect(ctx, C.hairDeep, 47, 33, 3, 5);
  rect(ctx, C.hairDeep, 60, 30, 3, 4);

  poly(ctx, C.glasses, [[35, 38], [44, 40], [54, 40], [63, 39], [71, 35], [69, 43], [63, 49], [56, 49], [52, 44], [49, 49], [41, 48], [37, 44]]);
  poly(ctx, C.lens, [[38, 40], [48, 42], [48, 46], [42, 46], [39, 43]]);
  poly(ctx, C.lens, [[55, 42], [65, 40], [63, 46], [57, 47]]);
  pixelLine(ctx, C.glint, 38, 39, 45, 40);
  pixelLine(ctx, C.glint, 58, 40, 63, 39);
  pixelLine(ctx, C.ink, 68, 39, 74, 34, 2);
  poly(ctx, C.skinShade, [[52, 44], [51, 50], [55, 52], [58, 50], [56, 49]]);
  rect(ctx, C.skinLight, 53, 46, 2, 4);
  rect(ctx, C.skinDeep, 52, 51, 4, 1);
  if (speaking) {
    rect(ctx, C.skinDeep, 50, 54, 9, 3);
    rect(ctx, C.whiteShade, 52, 54, 5, 1);
  } else {
    pixelLine(ctx, C.skinDeep, 49, hurt ? 55 : 54, 57, hurt ? 53 : 55);
    rect(ctx, C.skinLight, 51, 56, 5, 1);
  }
  if (sleepy) rect(ctx, C.skinShade, 48, 52, 3, 1);
  rect(ctx, C.skinShade, 44, 50, 3, 1);
  rect(ctx, C.skinLight, 56, 58, 3, 1);
  ctx.restore();
}

function soup(ctx, x, y, spoonX, spoonY) {
  poly(ctx, C.ink, [[x - 13, y - 3], [x + 13, y - 3], [x + 10, y + 8], [x - 9, y + 8]]);
  poly(ctx, C.bowlShade, [[x - 12, y - 2], [x + 12, y - 2], [x + 8, y + 6], [x - 8, y + 6]]);
  rect(ctx, C.bowl, x - 11, y - 3, 22, 3);
  rect(ctx, C.soup, x - 9, y - 3, 18, 2);
  rect(ctx, C.leaf, x - 5, y - 3, 4, 2);
  rect(ctx, C.leaf, x + 4, y - 3, 3, 2);
  rect(ctx, C.skinLight, x - 1, y - 3, 3, 2);
  pixelLine(ctx, C.whiteShade, spoonX, spoonY + 3, spoonX - 5, spoonY - 3);
  rect(ctx, C.bowl, spoonX - 7, spoonY - 5, 5, 3);
  rect(ctx, C.soup, spoonX - 6, spoonY - 5, 3, 1);
}

/**
 * Draws into a 112 × 152 canvas; does not mutate model or schedule work.
 * Pausing is handled by the engine freezing model time, distance and gaze. Keep
 * rendering that exact pose when paused; only reduced motion selects a quiet pose.
 */
export function drawCompanion(ctx, model, { reduced = false } = {}) {
  if (!ctx || !model) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, 112, 152);
  ctx.imageSmoothingEnabled = false;
  const state = model.state || 'idle';
  const still = reduced;
  const age = still ? 0 : Math.max(0, Number(model.stateAge) || 0);
  const direction = model.direction < 0 ? -1 : 1;
  const gait = getGaitPose(model, { reduced: still });
  const moving = ['walking', 'following', 'returning', 'turning', 'stopping'].includes(state) && !still;
  const seated = ['sitting', 'sleeping', 'waking'].includes(state);
  const airborne = ['falling', 'jumping', 'dragging'].includes(state);
  const wave = ['greeting', 'waving'].includes(state);
  const talking = state === 'talking';
  const sleeping = state === 'sleeping';
  const breath = still ? 0 : round(Math.sin(age * (sleeping ? 1.4 : 1.8)) * 0.7 * (1 - gait.blend));
  const impact = ['landing', 'reacting', 'hurt'].includes(state) ? Math.max(0, 1 - age / 0.55) : 0;
  const crouch = state === 'anticipating' ? 5 : round(impact * 6);
  const bob = round(gait.bob);
  const lean = gait.lean + gait.turn * 1.5 + (state === 'phone' ? 1 : 0);
  const center = 56 + lean;
  const faceCenter = direction < 0 ? 112 - center : center;
  const shoulderY = (seated ? 91 : 62) + breath + crouch - bob;
  const hipY = shoulderY + (seated ? 30 : 40);
  const headY = shoulderY - 50 + (sleeping ? 4 : 0);

  // Compact stepped contact shadow stays independent of facing direction.
  if (!airborne) {
    ctx.globalAlpha = seated ? 0.18 : 0.14;
    rect(ctx, C.ink, seated ? 24 : 34, 148, seated ? 64 : 46, 2);
    rect(ctx, C.ink, seated ? 30 : 40, 150, seated ? 52 : 34, 1);
    ctx.globalAlpha = 1;
  }

  const [leftFoot, rightFoot] = gait.feet;
  let leftAnkle = [FOOT_CENTERS[0] + leftFoot.x, 143 - leftFoot.lift];
  let rightAnkle = [FOOT_CENTERS[1] + rightFoot.x, 143 - rightFoot.lift];
  let leftKnee = walkingKnee([center - 8, hipY - 3], leftAnkle, [44, 124 + crouch / 2], gait.blend);
  let rightKnee = walkingKnee([center + 8, hipY - 3], rightAnkle, [67, 124 + crouch / 2], gait.blend);
  if (seated) {
    leftKnee = [34, 129]; rightKnee = [77, 129];
    leftAnkle = [33, 143]; rightAnkle = [79, 143];
  } else if (airborne) {
    const drift = still ? 0 : Math.sin(age * 5) * 2;
    leftKnee = [43 + drift, 124]; rightKnee = [71 - drift, 120];
    leftAnkle = [36 + drift, 139]; rightAnkle = [76 - drift, 135];
  }

  // Mirroring the body preserves a clean side lead while the portrait face stays readable.
  ctx.save();
  if (direction < 0) { ctx.translate(112, 0); ctx.scale(-1, 1); }
  leg(ctx, [center - 8, hipY - 3], leftKnee, leftAnkle, 1, true, leftFoot.lift > 1);
  leg(ctx, [center + 8, hipY - 3], rightKnee, rightAnkle, 1, false, rightFoot.lift > 1);
  const leftShoulder = [center - 18 + gait.turn * 3, shoulderY + 7];
  const rightShoulder = [center + 17 - gait.turn * 3, shoulderY + 7];
  const [leftSwing, rightSwing] = gait.armOffsets;
  let leftElbow = [center - 21 + leftSwing * 0.5, shoulderY + 24];
  let leftWrist = [center - 22 + leftSwing, shoulderY + 37 - Math.abs(leftSwing) * 0.25];
  let rightElbow = [center + 21 + rightSwing * 0.5, shoulderY + 24];
  let rightWrist = [center + 21 + rightSwing, shoulderY + 37 - Math.abs(rightSwing) * 0.25];
  let openLeft = false;
  let openRight = false;
  if (wave) {
    rightElbow = [center + 31, shoulderY + 2];
    rightWrist = [center + 31 + (still ? 0 : round(Math.sin(age * 10) * 4)), shoulderY - 16];
    openRight = true;
  } else if (state === 'dragging') {
    leftElbow = [31, 49]; leftWrist = [36, 24];
    rightElbow = [82, 49]; rightWrist = [78, 23];
    openLeft = true; openRight = true;
  } else if (airborne) {
    leftElbow = [30, shoulderY + 3]; leftWrist = [20, shoulderY - 7];
    rightElbow = [82, shoulderY + 4]; rightWrist = [94, shoulderY - 5];
    openLeft = true; openRight = true;
  } else if (state === 'thinking' || state === 'observing') {
    rightElbow = [center + 23, shoulderY + 19];
    rightWrist = [center + 7, shoulderY - 2];
  } else if (seated) {
    leftElbow = [center - 26, shoulderY + 19]; leftWrist = [36, 128];
    rightElbow = [center + 25, shoulderY + 19]; rightWrist = [77, 128];
    if (sleeping) { rightElbow = [center + 23, shoulderY + 10]; rightWrist = [center + 14, shoulderY - 4]; }
    if (state === 'waking') {
      leftElbow = [center - 27, shoulderY - 3]; leftWrist = [center - 20, shoulderY - 20];
      rightElbow = [center + 27, shoulderY - 3]; rightWrist = [center + 18, shoulderY - 20];
      openLeft = true; openRight = true;
    }
  } else if (state === 'snacking') {
    const bite = still ? 0 : Math.max(0, Math.sin(age * 1.7));
    leftElbow = [center - 22, shoulderY + 23]; leftWrist = [center - 4, shoulderY + 25];
    rightElbow = [center + 24, shoulderY + 20]; rightWrist = [center + 13 - bite * 5, shoulderY + 20 - bite * 21];
  } else if (state === 'phone') {
    leftElbow = [center - 21, shoulderY + 20]; leftWrist = [center - 1, shoulderY + 18];
    rightElbow = [center + 21, shoulderY + 21]; rightWrist = [center + 6, shoulderY + 16 + (still ? 0 : round(Math.sin(age * 4)))];
  } else if (state === 'stretching') {
    leftElbow = [center - 27, shoulderY - 3]; leftWrist = [center - 20, shoulderY - 20];
    rightElbow = [center + 27, shoulderY - 3]; rightWrist = [center + 18, shoulderY - 20];
    openLeft = true; openRight = true;
  } else if (talking) {
    rightElbow = [center + 24, shoulderY + 20];
    rightWrist = [center + 34, shoulderY + 9 + (still ? 0 : round(Math.sin(age * 3) * 2))];
    openRight = true;
  }
  arm(ctx, leftShoulder, leftElbow, leftWrist, { far: true, open: openLeft });
  torso(ctx, center, shoulderY, seated, breath);
  ctx.restore();

  face(ctx, faceCenter + (sleeping ? 3 : 0), headY, {
    lookX: still ? 0 : moving ? (model.turnDirection ?? direction) * 0.8 : model.lookX || 0,
    lookY: sleeping ? 1 : still || moving ? 0 : model.lookY || 0,
    speaking: talking && !still && Math.sin(age * 9) > 0.15,
    sleepy: sleeping,
    hurt: state === 'reacting' || state === 'hurt',
  });

  ctx.save();
  if (direction < 0) { ctx.translate(112, 0); ctx.scale(-1, 1); }
  arm(ctx, rightShoulder, rightElbow, rightWrist, { open: openRight });
  // Props are deliberately associated with the owner's actual interests.
  if (state === 'snacking') soup(ctx, center - 2, shoulderY + 24, rightWrist[0], rightWrist[1]);
  if (state === 'phone') {
    rect(ctx, C.ink, center - 6, shoulderY + 8, 12, 19);
    rect(ctx, C.glint, center - 4, shoulderY + 10, 8, 14);
    rect(ctx, C.bowl, center - 3, shoulderY + 12, 5, 1);
    rect(ctx, C.leaf, center - 3, shoulderY + 15, 6, 3);
    rect(ctx, C.skin, rightWrist[0] - 4, rightWrist[1], 5, 3);
  }
  ctx.restore();
  ctx.restore();
}
