import React, { Component, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Shape, ExtrudeGeometry } from 'three';

// One shared stepped silhouette keeps the character crisp without hundreds of cubes.
const voxelOutline = new Shape();
const corners = [[-.3,-.5],[.3,-.5],[.3,-.4],[.5,-.4],[.5,.4],[.3,.4],[.3,.5],[-.3,.5],[-.3,.4],[-.5,.4],[-.5,-.4],[-.3,-.4]];
corners.forEach(([x,y], index) => index ? voxelOutline.lineTo(x,y) : voxelOutline.moveTo(x,y));
voxelOutline.closePath();
const voxelGeometry = new ExtrudeGeometry(voxelOutline, { depth:1, bevelEnabled:false, steps:1 });
voxelGeometry.translate(0,0,-.5);

const SIZE = { w: 160, h: 220 };
const personalFacts = [
  'My favorite food is sinigang.',
  'I love cooking.',
  'I actually dreamed of becoming a lawyer.',
  'Sometimes I want to be a pilot.',
  'I love people with basic human decency.',
  'Iâ€™m single.',
  'Iâ€™m 5 feet 6 inches tall.',
];
function Box({ at = [0, 0, 0], size, color, rotation }) {
  return <mesh position={at} rotation={rotation}><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.7} /></mesh>;
}
function Form({ at = [0, 0, 0], size, color, rotation, roughness = .7, metalness = 0 }) {
  return <mesh position={at} rotation={rotation} scale={size}><primitive object={voxelGeometry} attach="geometry" dispose={null} /><meshStandardMaterial color={color} roughness={Math.max(.55, roughness)} metalness={Math.min(.12, metalness)} flatShading /></mesh>;
}
function Limb({ side, arm, joints }) {
  const skin = '#c99572';
  return <group ref={el => { joints.current[`${arm ? 'arm' : 'leg'}${side}`] = el; }} position={[side * (arm ? .47 : .22), arm ? 1.58 : .95, 0]}>
    <Form at={[0, -.22, 0]} size={arm ? [.27, .53, .32] : [.34, .57, .39]} color={arm ? '#203854' : '#697078'} />
    {arm && <Box at={[side * .12, -.16, 0]} size={[.025, .35, .29]} color="#ebe8da" />}
    {arm && [-.085, .085].map(z => <Box key={z} at={[side * .125, -.17, z]} size={[.028, .36, .028]} color="#ffffff" />)}
    <group ref={el => { joints.current[`${arm ? 'elbow' : 'knee'}${side}`] = el; }} position={[0, -.43, 0]}>
      <Form at={[0, -.16, 0]} size={arm ? [.2, .45, .23] : [.3, .5, .34]} color={arm ? skin : '#59616a'} />
      {arm ? <Form at={[0, -.4, .015]} size={[.2, .23, .15]} color={skin} /> : <group ref={el => { joints.current[`ankle${side}`] = el; }} position={[0, -.38, 0]}>
        <Form at={[0, -.02, .09]} size={[.34, .22, .52]} color="#172331" />
        <Box at={[0, -.1, .09]} size={[.35, .055, .53]} color="#d6d4c7" />
        {[0, 1, 2].map(i => <Box key={i} at={[0, .035 - i * .025, .21]} size={[.19, .016, .025]} color="#b6bcc1" />)}
      </group>}
      {arm && <><Form at={[-side * .1, -.37, .04]} size={[.07, .14, .08]} rotation={[0, 0, side * .4]} color={skin} />{[0, 1, 2, 3].map(i => <Form key={i} at={[(i - 1.5) * .041, -.49, .025]} size={[.042, .12 - Math.abs(i - 1.5) * .018, .07]} color={skin} />)}</>}
      {arm && side === 1 && <group position={[0, -.4, .15]}>
        <group ref={el => { joints.current.donut = el; }} visible={false} rotation={[Math.PI / 2, 0, 0]}>
          <mesh><torusGeometry args={[.12, .055, 8, 20]} /><meshStandardMaterial color="#d69a54" /></mesh>
          <mesh position={[0, 0, .027]}><torusGeometry args={[.12, .043, 8, 20]} /><meshStandardMaterial color="#ee8ca6" /></mesh>
          {Array.from({ length: 10 }, (_, i) => <Box key={i} at={[Math.cos(i * 2.4) * .12, Math.sin(i * 2.4) * .12, .07]} size={[.035, .012, .012]} rotation={[0, 0, i]} color={['#fff4d4', '#78cabc', '#6a453b'][i % 3]} />)}
        </group>
        <group ref={el => { joints.current.coffee = el; }} visible={false}>
          <mesh><cylinderGeometry args={[.105, .085, .25, 12]} /><meshStandardMaterial color="#fff4d4" /></mesh>
          <mesh position={[0, .13, 0]}><cylinderGeometry args={[.09, .09, .012, 12]} /><meshStandardMaterial color="#513124" /></mesh>
          <mesh position={[.12, 0, 0]}><torusGeometry args={[.07, .019, 6, 12]} /><meshStandardMaterial color="#fff4d4" /></mesh>
          <Box at={[0, -.015, .1]} size={[.12, .09, .02]} color="#b9774e" />
        </group>
      </group>}
    </group>
  </group>;
}
function Model({ motion }) {
  const body = useRef(); const head = useRef(); const joints = useRef({}); const phase = useRef(0);
  const transition = useRef({ mode: 'idle', elapsed: 0, gait: 0 });
  useFrame((_, dt) => {
    const m = motion.current; const active = !m.reduced && !m.paused;
    if (!active) return;
    const animation = transition.current;
    if (animation.mode !== m.mode) { animation.mode = m.mode; animation.elapsed = 0; }
    animation.elapsed += Math.min(dt, .05);
    const oldHead = [head.current.rotation.x, head.current.rotation.y, head.current.rotation.z];
    const previousPose = Object.fromEntries(Object.entries(joints.current).filter(([key]) => /^(arm|leg|knee|elbow|ankle)/.test(key)).map(([key, joint]) => [key, [joint.rotation.x, joint.rotation.z]]));
    const travel = ['walk', 'approach'].includes(m.mode);
    animation.gait += ((travel ? Math.min(1, Math.abs(m.speed || 0) / 29) : 0) - animation.gait) * (1 - Math.exp(-dt * 7));
    phase.current += Math.min(dt, .05) * (travel ? 3 + animation.gait * 5 : m.mode === 'climb' ? 5 : 2);
    const t = phase.current, walking = active && ['walk', 'approach'].includes(m.mode), falling = active && m.mode === 'fall', drag = active && (m.mode === 'drag' || falling), wave = active && m.mode === 'wave';
    body.current.rotation.y += ((walking ? m.direction * .8 : 0) - body.current.rotation.y) * Math.min(dt * 8, 1);
    const sitting = m.mode === 'sit', hurt = m.mode === 'hurt', dizzy = m.mode === 'dizzy';
    const anticipation = Math.sin(Math.min(1, animation.elapsed / .45) * Math.PI);
    const height = sitting ? -.48 : walking ? Math.abs(Math.sin(t)) * .04 * animation.gait - anticipation * .025 : Math.sin(t) * .006;
    body.current.position.y += (height - body.current.position.y) * (1 - Math.exp(-dt * 6));
    body.current.rotation.z += ((drag ? (m.lean || 0) + Math.sin(t * 3) * .06 : walking ? Math.sin(t) * .025 : 0) - body.current.rotation.z) * (1 - Math.exp(-dt * 12));
    const compression = m.mode === 'land' ? (m.impact || .08) : 0;
    body.current.scale.y += ((1 - compression) - body.current.scale.y) * (1 - Math.exp(-dt * 16));
    body.current.scale.x += ((1 + compression * .45) - body.current.scale.x) * (1 - Math.exp(-dt * 16));
    body.current.rotation.x += ((sitting ? .09 : walking ? .045 * animation.gait : 0) - body.current.rotation.x) * (1 - Math.exp(-dt * 6));
    const thinking = m.mode === 'think', scanning = m.mode === 'scan';
    const look = scanning ? Math.sin(t * .9) * .55 : m.lookX || 0;
    head.current.rotation.y += (look - head.current.rotation.y) * (1 - Math.exp(-dt * 5));
    head.current.rotation.z = wave ? -.12 : 0;
    const snack = m.mode === 'donut' || m.mode === 'coffee';
    joints.current.donut.visible = m.mode === 'donut';
    joints.current.coffee.visible = m.mode === 'coffee';
    head.current.rotation.x = active && snack ? Math.sin(t * 2) * .07 : 0;
    if (thinking) { head.current.rotation.z = -.14; head.current.rotation.x = .09; }
    else if (!snack) head.current.rotation.x = m.lookY || 0;
    if (sitting) { head.current.rotation.x = .2 + Math.sin(t * .7) * .04; head.current.rotation.z = .06; }
    if (hurt) { head.current.rotation.x = .26; head.current.rotation.z = -.16; }
    if (dizzy) { head.current.rotation.z = Math.sin(t * 2.5) * .22; head.current.rotation.y = Math.sin(t * 1.6) * .3; }
    for (const s of [-1, 1]) {
      const stride = t + (s === 1 ? Math.PI : 0);
      joints.current[`ankle${s}`].rotation.x = walking ? (-Math.sin(stride) * .2 + Math.max(0, Math.cos(stride)) * .12) * animation.gait : sitting ? -.12 : falling ? .2 : 0;
      joints.current[`leg${s}`].rotation.x = walking ? Math.sin(t + (s === 1 ? Math.PI : 0)) * .48 : drag ? Math.sin(t * 3 + s) * .35 : 0;
      joints.current[`knee${s}`].rotation.x = walking ? Math.max(0, -Math.sin(t + (s === 1 ? Math.PI : 0))) * .65 : .04;
      joints.current[`arm${s}`].rotation.x = walking ? -Math.sin(t + (s === 1 ? Math.PI : 0)) * .35 : 0;
      joints.current[`arm${s}`].rotation.z = wave && s === 1 ? -2.1 + Math.sin(t * 5) * .2 : drag ? -s * 1.5 : -s * .05;
      joints.current[`elbow${s}`].rotation.x = walking ? -.15 : wave && s === 1 ? -.4 : 0;
      if (snack && s === 1) {
        joints.current[`arm${s}`].rotation.x = -.6;
        joints.current[`arm${s}`].rotation.z = .3;
        joints.current[`elbow${s}`].rotation.x = -1.8 + (active ? Math.sin(t * 1.8) * .3 : 0);
      }
      if (thinking && s === 1) {
        joints.current[`arm${s}`].rotation.x = -.5;
        joints.current[`arm${s}`].rotation.z = .4;
        joints.current[`elbow${s}`].rotation.x = -2.1;
      }
      if (m.mode === 'knock' && s === m.direction) {
        joints.current[`arm${s}`].rotation.z = -s * 1.15;
        joints.current[`elbow${s}`].rotation.x = -.6 + Math.sin(t * 7) * .25;
        head.current.rotation.y = s * .55;
      }
      if (sitting) {
        joints.current[`leg${s}`].rotation.x = -1.35;
        joints.current[`knee${s}`].rotation.x = 1.45;
        joints.current[`arm${s}`].rotation.x = -.75;
        joints.current[`arm${s}`].rotation.z = -s * .12;
        joints.current[`elbow${s}`].rotation.x = -.25;
      }
      if (hurt) {
        joints.current[`leg${s}`].rotation.x = -.2;
        joints.current[`knee${s}`].rotation.x = .4;
        joints.current[`arm${s}`].rotation.x = -.65;
        joints.current[`elbow${s}`].rotation.x = -1.8;
      }
      if (dizzy) {
        joints.current[`arm${s}`].rotation.z = -s * .55 + Math.sin(t * 2) * .15;
        joints.current[`knee${s}`].rotation.x = .1 + Math.abs(Math.sin(t + s)) * .15;
      }
      if (m.mode === 'climb') {
        const reach = Math.sin(t + (s === 1 ? Math.PI : 0));
        joints.current[`arm${s}`].rotation.z = -s * (2.35 + reach * .35);
        joints.current[`arm${s}`].rotation.x = -.25;
        joints.current[`elbow${s}`].rotation.x = -.4 - Math.max(0, -reach) * .65;
        joints.current[`leg${s}`].rotation.x = -.35 - Math.max(0, -reach) * .65;
        joints.current[`knee${s}`].rotation.x = .55 + Math.max(0, -reach) * .55;
        head.current.rotation.x = -.18;
      }
      if (walking) {
        joints.current[`leg${s}`].rotation.x *= animation.gait;
        joints.current[`arm${s}`].rotation.x *= animation.gait;
        joints.current[`elbow${s}`].rotation.x = -.18 - Math.max(0, Math.sin(stride)) * .18 * animation.gait;
      }
    }
    // Servo-like easing connects poses instead of snapping between animations.
    const blend = 1 - Math.exp(-Math.min(dt, .05) * 11);
    for (const [key, old] of Object.entries(previousPose)) {
      const joint = joints.current[key];
      joint.rotation.x = old[0] + (joint.rotation.x - old[0]) * blend;
      joint.rotation.z = old[1] + (joint.rotation.z - old[1]) * blend;
    }
    ['x', 'y', 'z'].forEach((axis, index) => { head.current.rotation[axis] = oldHead[index] + (head.current.rotation[axis] - oldHead[index]) * (1 - Math.exp(-dt * 7)); });
  });
  return <group ref={body} position={[0, 0, 0]}>
    <Form at={[0, 1.32, 0]} size={[.88, 1, .52]} color="#203854" />
    <Form at={[0, 1.7, 0]} size={[.25, .3, .28]} color="#c99572" />
    {/* Pixel seams, hem and fabric shading on the navy shirt. */}
    <Box at={[0, .94, .268]} size={[.65, .045, .018]} color="#14283e" />
    {[-1, 1].map(s => <group key={s}>
      <Box at={[s * .34, 1.26, .268]} size={[.035, .47, .016]} color="#172d46" />
      {[0,1,2].map(i => <Box key={i} at={[s * (.29 - i * .035), 1.55 + i * .04, .27]} size={[.034, .095, .02]} color="#eeeee0" />)}
    </group>)}
    {[0,1,2,3].map(i => <Box key={i} at={[-.15 + i * .09, 1.02 + (i % 2) * .035, .268]} size={[.06, .025, .014]} color="#2a4563" />)}
    {[-1, 1].map(s => <Form key={s} at={[s * .26, 1.12, .18]} size={[.035, .3, .08]} rotation={[0, 0, s * .2]} color="#192e48" />)}
    <Box at={[-.13, 1.68, .23]} size={[.3, .055, .025]} rotation={[0, 0, -.42]} color="#f0eee1" />
    <Box at={[.13, 1.68, .23]} size={[.3, .055, .025]} rotation={[0, 0, .42]} color="#f0eee1" />
    <Box at={[.21, 1.4, .224]} size={[.17, .045, .016]} color="#e1e2d9" />
    <Box at={[.21, 1.34, .224]} size={[.12, .025, .016]} color="#aebfc6" />
    <group ref={head} position={[0, 1.96, 0]}>
      <Form size={[.62, .7, .58]} color="#c99572" />
      <Form at={[0, -.19, .025]} size={[.43, .32, .46]} color="#c99572" />
      <Form at={[0, -.04, .29]} size={[.085, .19, .12]} color="#d3a17d" />
      <Form at={[0, -.105, .325]} size={[.11, .065, .085]} color="#ca9978" />
      <Form at={[0, -.205, .242]} size={[.17, .025, .035]} color="#895c50" />
      <Form at={[0, -.225, .236]} size={[.14, .03, .04]} color="#b67d67" />
      <Box at={[0, -.203, .269]} size={[.14, .012, .012]} color="#69483f" />
      {[-1, 1].map(s => <group key={s}>
        <Box at={[s * .065, -.12, .37]} size={[.025, .019, .012]} color="#9c6e55" />
        <Box at={[s * .245, -.13, .298]} size={[.045, .04, .012]} color="#bd8768" />
      </group>)}
      {[-1, 1].map(s => <Form key={s} at={[s * .19, -.105, .225]} size={[.15, .17, .08]} color="#ce9b79" />)}
      {[-1, 1].map(s => <group key={s}>
        <Form at={[s * .31, -.03, 0]} size={[.1, .2, .13]} color="#c99572" />
        <Form at={[s * .345, -.03, .02]} size={[.035, .12, .075]} color="#ab785f" />
        <Form at={[s * .16, .065, .275]} size={[.31, .19, .095]} rotation={[0, s * .12, 0]} color="#101820" roughness={.24} />
        <Form at={[s * .16, .065, .312]} size={[.27, .145, .04]} color="#182b35" roughness={.08} metalness={.35} />
        <Form at={[s * .18, .105, .332]} size={[.16, .018, .012]} rotation={[0, 0, -.15]} color="#718c99" roughness={.15} />
        <Box at={[s * .29, .08, .04]} size={[.035, .05, .5]} color="#101a21" />
      </group>)}
      <Box at={[0, .07, .32]} size={[.09, .04, .05]} color="#101a21" />
      <Box at={[-.39, -.1, .08]} size={[.04, .055, .04]} color="#151b23" />
      <Form at={[0, .23, -.035]} size={[.69, .4, .63]} color="#111e26" />
      {Array.from({ length: 24 }, (_, i) => <Form key={i} at={[(i % 8 - 3.5) * .077, .29 + Math.floor(i / 8) * .045, .24]} size={[.028, .25, .08]} rotation={[.15, 0, -.4]} color={i % 3 ? '#1c2b32' : '#2a3b43'} roughness={.4} />)}
      {Array.from({ length: 18 }, (_, i) => <Form key={i} at={[(i % 6 - 2.5) * .105, .34 + Math.sin(i * 2) * .035, Math.floor(i / 6) * .18 - .2]} size={[.16, .18, .29]} rotation={[.12, (i % 3 - 1) * .2, -.3]} color={['#15232b', '#203039', '#101c24'][i % 3]} />)}
      {Array.from({ length: 9 }, (_, i) => <Form key={i} at={[(i - 4) * .069, .17 - i * .007, .265]} size={[.1, .24 + i * .008, .1]} rotation={[0, 0, -.3]} color="#15232b" roughness={.4} />)}
    </group>
    {[-1, 1].map(s => <React.Fragment key={s}><Limb side={s} arm joints={joints} /><Limb side={s} joints={joints} /></React.Fragment>)}
  </group>;
}
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <span className="walker-fallback">3D unavailable</span> : this.props.children; }
}
export default function PixelWalker() {
  const host = useRef(); const motion = useRef({ mode: 'idle', direction: 1, reduced: false, paused: false });
  const position = useRef({ x: 24, y: 120 }); const drag = useRef(null); const until = useRef(0); const lastThought = useRef(0);
  const factIndex = useRef(0);
  const fall = useRef({ velocity: 0, vx: 0 });
  const brain = useRef({ energy: 80, curiosity: 40, previous: 'idle', planned: null, speed: 0, visits: new Map() });
  const climbTarget = useRef(null);
  const [paused, setPaused] = useState(false); const [hidden, setHidden] = useState(false); const [thought, setThought] = useState('Hey, Iâ€™m Reynan. Click me or drag me somewhere!');
  const shareFact = () => {
    setThought(personalFacts[factIndex.current]);
    factIndex.current = (factIndex.current + 1) % personalFacts.length;
    lastThought.current = performance.now();
  };
  const bounds = () => ({ x: Math.max(0, window.innerWidth - SIZE.w), y: Math.max(0, window.innerHeight - SIZE.h - 62) });
  const place = () => { const b = bounds(); position.current.x = Math.max(0, Math.min(b.x, position.current.x)); position.current.y = Math.max(0, Math.min(b.y, position.current.y)); if (host.current) { host.current.style.transform = `translate3d(${position.current.x}px,${position.current.y}px,0)`; host.current.classList.toggle('walker-near-top', position.current.y < 110); } };
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const preference = () => { motion.current.reduced = media.matches; };
    preference(); media.addEventListener('change', preference);
    position.current.y = bounds().y; place(); window.addEventListener('resize', place);
    let frame, previous = performance.now(); until.current = previous + 6000;
    let lastScroll = window.scrollY, lastKick = -Infinity;
    const observePointer = event => {
      const m = motion.current;
      m.lookX = Math.max(-.5, Math.min(.5, (event.clientX - position.current.x - SIZE.w / 2) / 600));
      m.lookY = Math.max(-.18, Math.min(.18, (event.clientY - position.current.y - 70) / 700));
    };
    window.addEventListener('pointermove', observePointer, { passive: true });
    const chooseClimb = () => {
      brain.current.curiosity = 0;
      const candidates = [...document.querySelectorAll('.project, .identity-card, .project-map')].map(element => ({ element, rect: element.getBoundingClientRect() })).filter(({ rect }) => rect.top > 230 && rect.top < window.innerHeight - 45 && rect.left >= 0 && rect.right <= window.innerWidth && rect.width > 150);
      const candidate = candidates[Math.floor(Math.random() * candidates.length)];
      climbTarget.current = candidate
        ? { element: candidate.element, x: Math.max(0, Math.min(bounds().x, candidate.rect.left - 60)), y: Math.max(0, candidate.rect.top - 200) }
        : { element: null, x: Math.random() < .5 ? 0 : bounds().x, y: Math.max(15, bounds().y * .25) };
      const target = climbTarget.current;
      // Start below the ledge so the action is always an upward climb.
      if (position.current.y <= target.y + 20) { climbTarget.current = { element: null, x: target.x, y: Math.max(0, position.current.y - 150) }; }
      motion.current.mode = 'approach';
    };
    const scroll = () => {
      const delta = window.scrollY - lastScroll; lastScroll = window.scrollY;
      const now = performance.now(), m = motion.current;
      if (Math.abs(delta) < 2 || m.paused || m.reduced || document.hidden || drag.current || now - lastKick < 900) return;
      lastKick = now;
      climbTarget.current = null;
      m.mode = 'fall';
      // A small upward impulse makes the reaction visible even at the viewport floor.
      fall.current = { velocity: delta > 0 ? -260 : -340, vx: brain.current.speed };
    };
    window.addEventListener('scroll', scroll, { passive: true });
    const explain = event => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest('.pixel-walker, .walker-controls') || motion.current.paused) return;
      const control = target.closest('a, button');
      if (!control) return;
      const project = control.closest('.project');
      const href = control.getAttribute('href') || '';
      let message = '';
      if (project) {
        const title = project.querySelector('h3')?.textContent || 'This project';
        const summary = project.querySelector('.project-body > p')?.textContent || '';
        message = control.matches('a') ? `${title}: this link opens its source repository.` : `${title}. ${summary}`;
      } else if (control.closest('.carousel-controls')) message = 'These arrows browse my projects. Quick view opens the screenshots and project details.';
      else if (control.matches('.quick-view-close')) message = 'Back to the portfolio. There are more projects to explore.';
      else if (href === '#work') message = 'Selected work shows my projects, screenshots, tools, and repository links.';
      else if (href === '#about') message = 'This section introduces my studies and approach to web development.';
      else if (href === '#contact') message = 'You can contact me by email or use the message form here.';
      else if (href.startsWith('mailto:')) message = 'This opens your email app to compose a message. Nothing is sent automatically.';
      else if (href.includes('github.com')) message = 'This opens GitHub, where you can explore the source code.';
      else if (href.includes('facebook.com')) message = 'This link opens my Facebook profile.';
      else if (control.closest('.contact-form')) message = 'The form checks your message before submitting. Watch the form for confirmation or errors.';
      if (message) {
        const visits = brain.current.visits;
        const count = visits.get(message) || 0;
        visits.set(message, count + 1);
        setThought(count ? `Back here again? ${message}` : message);
        lastThought.current = performance.now();
        brain.current.curiosity = Math.min(100, brain.current.curiosity + 12);
        if (!['fall', 'drag'].includes(motion.current.mode)) { motion.current.mode = 'wave'; until.current = performance.now() + 6000; }
      }
    };
    document.addEventListener('click', explain);
    const tick = now => {
      const dt = Math.min((now - previous) / 1000, .05); previous = now; const m = motion.current;
      if (!document.hidden && !m.paused && !m.reduced && m.mode !== 'drag') {
        const b = brain.current;
        b.energy = Math.max(0, Math.min(100, b.energy + dt * (m.mode === 'sit' ? 6 : m.mode === 'coffee' ? 5 : m.mode === 'donut' ? 3 : m.mode === 'walk' ? -1.5 : -.25)));
        b.curiosity = Math.min(100, b.curiosity + dt * .9);
        if (m.mode === 'approach' || m.mode === 'climb') {
          const target = climbTarget.current;
          if (target?.element) {
            const rect = target.element.getBoundingClientRect();
            target.x = Math.max(0, Math.min(bounds().x, rect.left - 60)); target.y = rect.top - 200;
            if (!target.element.isConnected || target.y < 0 || target.y > bounds().y || rect.right < 0 || rect.left > window.innerWidth) {
              m.mode = 'fall'; fall.current = { vx: 0, velocity: 0 }; climbTarget.current = null;
            }
          }
          if (target && m.mode === 'approach') {
            const distance = target.x - position.current.x;
            m.direction = distance < 0 ? -1 : 1;
            position.current.x += Math.sign(distance) * Math.min(Math.abs(distance), dt * 45);
            if (Math.abs(distance) < 2) m.mode = 'climb';
          } else if (target && m.mode === 'climb') {
            position.current.y = Math.max(target.y, position.current.y - dt * 36);
            if (position.current.y <= target.y) { m.mode = 'sit'; b.energy = Math.max(0, b.energy - 12); until.current = now + 6000; }
          }
          place();
        } else if (m.mode === 'fall') {
          // Small substeps keep fast throws stable across varying frame rates.
          const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
          const step = dt / steps, edge = bounds(), physics = fall.current;
          for (let i = 0; i < steps && m.mode === 'fall'; i++) {
            physics.velocity = Math.min(1000, physics.velocity + 1050 * step);
            physics.vx *= Math.exp(-.6 * step);
            position.current.x += physics.vx * step;
            position.current.y += physics.velocity * step;
            if (position.current.x < 0 || position.current.x > edge.x) {
              position.current.x = Math.max(0, Math.min(edge.x, position.current.x));
              physics.vx *= -.45;
            }
            if (position.current.y < 0) { position.current.y = 0; physics.velocity = Math.abs(physics.velocity) * .3; }
            if (position.current.y >= edge.y) {
              position.current.y = edge.y;
              m.impact = Math.min(.16, Math.abs(physics.velocity) / 5000);
              physics.hardImpact = physics.hardImpact || physics.velocity > 560;
              if (physics.velocity > 110) { physics.velocity *= -.28; physics.vx *= .68; }
              else {
                physics.velocity = 0; physics.vx *= Math.exp(-16 * step);
                if (Math.abs(physics.vx) < 8) {
                  m.mode = physics.hardImpact ? 'hurt' : physics.dizzy ? 'dizzy' : 'land';
                  until.current = now + (m.mode === 'land' ? 320 : 3200);
                  if (m.mode !== 'land') {
                    b.energy = Math.max(0, b.energy - 10);
                    setThought(m.mode === 'hurt' ? 'Ouch! Give me a moment to recover.' : 'Whoa... the screen is spinning.');
                    lastThought.current = now;
                  }
                  physics.vx = 0;
                }
              }
            }
          }
          m.lean = Math.max(-.22, Math.min(.22, -physics.vx / 1800));
          place();
        } else if (now > until.current) {
          if (m.mode === 'hurt' || m.mode === 'dizzy') {
            m.mode = 'sit'; b.planned = null; until.current = now + 8000;
            setThought('Sitting down for a moment. I will be okay.'); lastThought.current = now;
          } else if (m.mode === 'sit') {
            m.mode = climbTarget.current ? 'fall' : 'idle';
            if (climbTarget.current) { fall.current = { vx: m.direction * 45, velocity: -100 }; climbTarget.current = null; }
            until.current = now + 1800;
            setThought('Feeling better. Ready to explore again!'); lastThought.current = now;
          } else if (m.mode === 'think' && b.planned) {
            m.mode = b.planned; b.previous = m.mode; b.planned = null;
            until.current = now + 5000 + Math.random() * 4000;
            if (m.mode === 'scan') b.curiosity = 0;
            if (m.mode === 'climb') chooseClimb();
            if (m.mode === 'sit') { until.current = now + 10000; setThought('My legs need a break. Time to sit and recharge.'); lastThought.current = now; }
          } else {
            const choices = ['walk', 'climb', 'scan', 'idle', 'donut', 'wave'].filter(mode => mode !== b.previous);
            b.planned = b.energy < 35 ? 'sit' : b.curiosity > 65 ? 'climb' : choices[Math.floor(Math.random() * choices.length)];
            m.mode = 'think'; until.current = now + 1600 + Math.random() * 1000;
          }
          if (m.mode === 'walk') m.direction = Math.random() < .5 ? -1 : 1;
        }
        b.speed += ((m.mode === 'walk' ? 29 * m.direction : 0) - b.speed) * (1 - Math.exp(-dt * 5));
        m.speed = m.mode === 'approach' ? 45 : b.speed;
        if (m.mode === 'walk') { position.current.x += dt * b.speed; const edge = bounds(); if (position.current.x >= edge.x || position.current.x <= 0) { b.speed = 0; m.mode = 'knock'; until.current = now + 2800; } place(); }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); media.removeEventListener('change', preference); window.removeEventListener('resize', place); window.removeEventListener('scroll', scroll); document.removeEventListener('click', explain); window.removeEventListener('pointermove', observePointer); };
  }, []);
  // Keep the bubble present; replace its contents instead of hiding it.
  // Text can cycle even when reduced-motion preferences stop the 3D animation.
  useEffect(() => {
    if (paused || hidden) return undefined;
    const timer = setTimeout(() => {
      if (!document.hidden) shareFact();
    }, Math.max(8000, thought.length * 65));
    const resume = () => { if (!document.hidden) shareFact(); };
    document.addEventListener('visibilitychange', resume);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', resume); };
  }, [thought, paused, hidden]);
  useEffect(() => { motion.current.paused = paused || hidden; }, [paused, hidden]);
  const greet = () => { motion.current.mode = 'wave'; until.current = performance.now() + 3200; shareFact(); };
  const down = e => {
    if (e.button !== 0) return;
    climbTarget.current = null;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, origin: { ...position.current }, moved: false, last: performance.now(), vx: 0, vy: 0 };
    motion.current.mode = 'drag'; fall.current = { velocity: 0, vx: 0 };
  };
  const move = e => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.hypot(dx, dy) > 5) {
      d.moved = true;
      const now = performance.now(), elapsed = Math.max(.008, (now - d.last) / 1000);
      const before = { ...position.current };
      position.current = { x: d.origin.x + dx, y: d.origin.y + dy }; place();
      d.vx = Math.max(-650, Math.min(650, (position.current.x - before.x) / elapsed));
      d.vy = Math.max(-650, Math.min(650, (position.current.y - before.y) / elapsed));
      d.last = now; motion.current.lean = Math.max(-.22, Math.min(.22, -d.vx / 1800));
    }
  };
  const release = e => {
    const d = drag.current; if (!d) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (d.moved) {
      const m = motion.current, fresh = performance.now() - d.last < 100 && e.type !== 'pointercancel';
      fall.current = { vx: fresh ? d.vx : 0, velocity: fresh ? d.vy : 0, dizzy: fresh && Math.hypot(d.vx, d.vy) > 540 };
      m.mode = m.paused || m.reduced ? 'idle' : 'fall';
      until.current = performance.now() + 8000;
    } else greet();
  };
  return <>
    <div ref={host} className="pixel-walker" hidden={hidden}>
      {thought && <div className="walker-thought">{thought}<span aria-hidden="true" /></div>}
      <button className="walker-character" aria-label="Reynan companion. Click to wave, drag to move, or use arrow keys to reposition." onPointerDown={down} onPointerMove={move} onPointerUp={release} onPointerCancel={release} onClick={e => { if (e.detail === 0) greet(); }} onKeyDown={e => { const delta = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[e.key]; if (delta) { e.preventDefault(); position.current.x += delta[0]; position.current.y += delta[1]; motion.current.mode = 'idle'; until.current = performance.now() + 8000; place(); } }}>
        {!hidden && <SceneBoundary><Canvas camera={{ position: [0, 1.25, 6.4], fov: 30 }} onCreated={({ camera }) => { camera.lookAt(0, 1.25, 0); camera.updateProjectionMatrix(); }} dpr={1} gl={{ alpha: true, antialias: false }} fallback={<span>3D unavailable</span>}><ambientLight intensity={1.8} /><directionalLight position={[3, 5, 5]} intensity={2} /><Model motion={motion} /></Canvas></SceneBoundary>}
      </button>
    </div>
    <div className="walker-controls" aria-label="Avatar controls"><button aria-pressed={paused} onClick={() => setPaused(v => !v)}>{paused ? 'Resume' : 'Pause'} avatar</button><button aria-pressed={hidden} onClick={() => setHidden(v => !v)}>{hidden ? 'Show' : 'Hide'}</button></div>
  </>;
}

