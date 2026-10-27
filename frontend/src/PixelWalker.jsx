import React, { useEffect, useRef, useState } from 'react';
import { CHARACTER, createCompanion, resizeCompanion, updateCompanion, commandCompanion, setFollowTarget, beginDrag, moveDrag, endDrag } from './companion/engine.js';
import { drawCompanion } from './companion/sprite.js';
import { AMBIENT_THOUGHT_TIMING, createDialogue } from './companion/dialogue.js';

const SETTINGS_KEY = 'reynan-companion-v2';
const SECTIONS = ['top', 'work', 'capabilities', 'about', 'contact'];
const AIRBORNE = new Set(['dragging', 'anticipating', 'jumping', 'falling', 'landing']);
const CHATTY_ACTIVITIES = new Set(['talk', 'wave', 'stretch', 'phone', 'sit', 'snack']);
const nextThoughtDelay = () => (AMBIENT_THOUGHT_TIMING.min + Math.random() * (AMBIENT_THOUGHT_TIMING.max - AMBIENT_THOUGHT_TIMING.min)) / 1000;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return { paused: saved.paused === true, hidden: saved.hidden === true };
  } catch { return { paused: false, hidden: false }; }
}

// An ambient, viewport-positioned sprite. It never reserves space in the page.
export default function PixelWalker({ profile, projects, obscured = false }) {
  const host = useRef(null), canvas = useRef(null), bubble = useRef(null), visibleText = useRef(null);
  const characterButton = useRef(null), model = useRef(null), runtime = useRef(null);
  const dialogue = useRef(createDialogue()), pointer = useRef(null), origin = useRef({ x: 0, y: 0 });
  const context = useRef({ section: 'top' }), speechClock = useRef(null), speakRef = useRef(null);
  const lastInteraction = useRef(0), lastSpeech = useRef(0);
  const [settings, setSettings] = useState(loadSettings);
  const [reduced, setReduced] = useState(false);
  const [speech, setSpeech] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const options = useRef({});
  options.current = { ...settings, reduced, obscured };
  context.current = { ...context.current, profile, projects };

  function dismissThought() {
    speechClock.current = null;
    setSpeech(null);
  }
  function showThought(reply, manual = false) {
    if (!reply || settings.hidden) return false;
    const immediate = reduced || settings.paused;
    speechClock.current = { text: reply.text, elapsed: 0, revealed: immediate ? reply.text.length : 0, duration: Math.max(11, reply.text.length * .09) };
    setSpeech(reply.text);
    if (manual) setAnnouncement(reply.text);
    if (visibleText.current) visibleText.current.textContent = immediate ? reply.text : '';
    lastSpeech.current = performance.now();
    return true;
  }
  speakRef.current = (event, manual = false) => showThought(dialogue.current.say(event, {
    ...context.current, state: model.current?.state, mood: model.current?.mood, now: performance.now(), force: manual,
  }), manual);
  function point(event) {
    return { x: event.clientX - origin.current.x, y: event.clientY - origin.current.y };
  }
  function greet() {
    lastInteraction.current = performance.now();
    if (!settings.paused) commandCompanion(model.current, 'wave');
    speakRef.current('ambientClick', true);
  }
  function togglePause() {
    setSettings(value => ({ ...value, paused: !value.paused }));
  }
  function hide() {
    dismissThought();
    setSettings(value => ({ ...value, hidden: true }));
  }

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefer = () => setReduced(media.matches);
    prefer(); media.addEventListener('change', prefer);
    const viewport = () => {
      const style = getComputedStyle(host.current.parentElement);
      const inset = side => Number.parseFloat(style.getPropertyValue(`--companion-safe-${side}`)) || 0;
      const left = inset('left'), right = inset('right'), top = inset('top'), bottom = inset('bottom');
      origin.current = { x: left, y: top };
      return { width: Math.max(1, document.documentElement.clientWidth - left - right), height: Math.max(1, (window.visualViewport?.height || window.innerHeight) - top - bottom) };
    };
    model.current = createCompanion(viewport());
    const ctx = canvas.current?.getContext('2d');
    let frame = 0, previous = 0, lastDraw = 0, scanTimer = 0, bubbleHeight = 100;
    let nextThought = nextThoughtDelay();
    let tabHidden = document.hidden;
    const place = () => {
      const m = model.current;
      if (!host.current || !m) return;
      host.current.style.transform = `translate3d(${Math.round(m.x + origin.current.x)}px, ${Math.round(m.y + origin.current.y)}px, 0)`;
      host.current.dataset.state = m.state;
      host.current.dataset.controlsSide = m.x > m.width / 2 ? 'left' : 'right';
      if (bubble.current) {
        const width = Math.min(240, m.width - 16);
        const x = clamp(m.x + CHARACTER.width / 2 - width / 2, 8, m.width - width - 8);
        const above = m.y > bubbleHeight + 20;
        const y = clamp(above ? m.y - bubbleHeight - 12 : m.y + CHARACTER.height + 12, 8, Math.max(8, m.height - bubbleHeight - 8));
        bubble.current.style.transform = `translate3d(${Math.round(x + origin.current.x)}px, ${Math.round(y + origin.current.y)}px, 0)`;
        bubble.current.style.setProperty('--tail-x', `${clamp(m.x + CHARACTER.width / 2 - x, 20, width - 24)}px`);
        bubble.current.dataset.side = above ? 'above' : 'below';
      }
    };
    const draw = () => {
      if (ctx) drawCompanion(ctx, model.current, { reduced: options.current.reduced, paused: options.current.paused || tabHidden });
      place();
    };
    const resize = () => { resizeCompanion(model.current, viewport()); draw(); };
    const scanSection = () => {
      const mid = window.innerHeight * .45;
      let best = 'top', distance = Infinity;
      for (const id of SECTIONS) {
        const element = document.getElementById(id);
        if (!element) continue;
        const r = element.getBoundingClientRect();
        const delta = mid < r.top ? r.top - mid : mid > r.bottom ? mid - r.bottom : 0;
        if (delta < distance) { best = id; distance = delta; }
      }
      context.current.section = best;
    };
    const onScroll = () => { clearTimeout(scanTimer); scanTimer = window.setTimeout(scanSection, 180); };
    const observePointer = event => {
      if (event.target instanceof Element && event.target.closest('[data-companion]')) return;
      if (!options.current.paused && !options.current.hidden) setFollowTarget(model.current, point(event));
    };
    const tick = now => {
      frame = 0;
      const opt = options.current;
      if (tabHidden || opt.hidden || opt.paused || opt.obscured) { previous = 0; return; }
      const dt = previous ? Math.min(.1, (now - previous) / 1000) : 0;
      previous = now;
      const talkReady = !opt.reduced && now - lastSpeech.current >= AMBIENT_THOUGHT_TIMING.min && now - lastInteraction.current >= 5000;
      const events = updateCompanion(model.current, dt, { ...opt, talkReady });
      const reaction = events.includes('hardLanding') ? 'hardLanding' : events.includes('landed') ? 'landed' : events.includes('dizzy') ? 'dizzy' : null;
      if (reaction && talkReady) speakRef.current(reaction);
      const activity = events.find(event => event.startsWith('activity:'))?.slice('activity:'.length);
      if (talkReady && now - lastSpeech.current >= AMBIENT_THOUGHT_TIMING.min && !AIRBORNE.has(model.current.state) && (model.current.time >= nextThought || CHATTY_ACTIVITIES.has(activity))) {
        if (speakRef.current('thought')) {
          nextThought = model.current.time + nextThoughtDelay();
          if (['idle', 'observing', 'thinking'].includes(model.current.state)) commandCompanion(model.current, 'talk');
        }
      }
      const line = speechClock.current;
      if (line && visibleText.current) {
        line.elapsed += dt;
        line.revealed = Math.max(line.revealed, opt.reduced ? line.text.length : Math.min(line.text.length, Math.floor(line.elapsed * 38)));
        visibleText.current.textContent = line.text.slice(0, line.revealed);
        if (line.elapsed > line.duration) dismissThought();
      }
      if (now - lastDraw >= (opt.reduced ? 150 : 1000 / 30)) { draw(); lastDraw = now; }
      frame = requestAnimationFrame(tick);
    };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; previous = 0; };
    const start = () => { if (!frame && !document.hidden && !options.current.hidden && !options.current.paused && !options.current.obscured) frame = requestAnimationFrame(tick); };
    const visibility = () => {
      tabHidden = document.hidden;
      if (tabHidden) {
        if (model.current.drag) endDrag(model.current, { time: performance.now(), cancel: true });
        pointer.current = null;
        stop();
      } else start();
    };
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) if (entry.target === bubble.current) bubbleHeight = entry.target.getBoundingClientRect().height;
      place();
    });
    runtime.current = { start, stop, draw, observeBubble: () => { observer.disconnect(); if (bubble.current) observer.observe(bubble.current); place(); } };
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    window.addEventListener('pointermove', observePointer, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    scanSection(); draw(); start();
    if (!media.matches && !options.current.hidden && !options.current.paused) speakRef.current('ambientGreeting');
    return () => {
      stop(); clearTimeout(scanTimer); observer.disconnect(); runtime.current = null;
      media.removeEventListener('change', prefer);
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', observePointer);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* Optional browser storage. */ }
    if (settings.paused || settings.hidden || obscured) {
      runtime.current?.stop();
      if (pointer.current && model.current?.drag) endDrag(model.current, { time: performance.now(), cancel: true });
      pointer.current = null;
    } else runtime.current?.start();
    runtime.current?.draw();
  }, [settings, obscured]);
  useEffect(() => { runtime.current?.observeBubble(); }, [speech, settings.hidden, obscured]);

  function down(event) {
    if (event.button !== 0 || settings.paused || pointer.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = { id: event.pointerId, ...point(event), time: performance.now(), moved: false };
    lastInteraction.current = performance.now();
  }
  function move(event) {
    const p = pointer.current;
    if (!p || p.id !== event.pointerId || settings.paused) return;
    const position = point(event);
    if (!p.moved && Math.hypot(position.x - p.x, position.y - p.y) >= 5) {
      p.moved = true;
      beginDrag(model.current, { x: p.x, y: p.y, time: p.time });
      if (!reduced) speakRef.current('drag');
    }
    if (p.moved) moveDrag(model.current, { ...position, time: performance.now() });
  }
  function release(event) {
    const p = pointer.current;
    if (!p || p.id !== event.pointerId) return;
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (p.moved) endDrag(model.current, { ...point(event), time: performance.now(), cancel: event.type !== 'pointerup' });
    else if (event.type === 'pointerup') { event.currentTarget.focus({ preventScroll: true }); greet(); }
  }
  function reveal() {
    if (!speechClock.current) return;
    speechClock.current.revealed = speechClock.current.text.length;
    if (visibleText.current) visibleText.current.textContent = speechClock.current.text;
  }

  return <div className="companion-root" data-companion="true">
    <div ref={host} className="pixel-walker" hidden={settings.hidden || obscured}>
      <button ref={characterButton} className="walker-character" type="button" aria-label="Reynan mini figure. Tap to greet or drag to move. Arrow keys move, jump, or rest. P pauses; Escape hides."
        onPointerDown={down} onPointerMove={move} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={event => { if (pointer.current) release(event); }}
        onClick={event => { if (event.detail === 0 || settings.paused) greet(); }}
        onKeyDown={event => {
          if (event.key.toLowerCase() === 'p') { event.preventDefault(); togglePause(); return; }
          if (event.key === 'Escape') { event.preventDefault(); hide(); return; }
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
          event.preventDefault();
          if (settings.paused || obscured) return;
          lastInteraction.current = performance.now();
          if (event.key === 'ArrowUp') commandCompanion(model.current, 'jump');
          else if (event.key === 'ArrowDown') commandCompanion(model.current, 'sit');
          else commandCompanion(model.current, 'come', { x: model.current.x + CHARACTER.width / 2 + (event.key === 'ArrowLeft' ? -65 : 65) });
        }}><canvas ref={canvas} width={CHARACTER.width} height={CHARACTER.height} aria-hidden="true" /></button>
      <div className="companion-tools" role="group" aria-label="Mini figure controls">
        <button onClick={togglePause} aria-label={settings.paused ? 'Resume mini figure' : 'Pause mini figure'} title={settings.paused ? 'Resume' : 'Pause'} aria-pressed={settings.paused}><span aria-hidden="true">{settings.paused ? '▶' : 'Ⅱ'}</span></button>
        <button onClick={hide} aria-label="Hide mini figure" title="Hide"><span aria-hidden="true">×</span></button>
      </div>
    </div>
    {speech && !settings.hidden && !obscured && <aside ref={bubble} className="walker-thought" aria-label="Companion thought">
      <button className="thought-message" onClick={reveal} title="Show the full thought">
        <span className="thought-text" aria-hidden="true"><span className="thought-size">{speech}</span><span ref={visibleText}>{reduced || settings.paused ? speech : ''}</span></span>
        <span className="companion-sr-only">{speech}</span>
      </button>
      <button className="thought-close" onClick={dismissThought} aria-label="Dismiss thought">×</button>
    </aside>}
    {settings.hidden && !obscured && <button className="companion-restore" onClick={() => setSettings(value => ({ ...value, hidden: false }))} aria-label="Show mini figure" title="Show mini figure">↺</button>}
    <span className="companion-sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
  </div>;
}
