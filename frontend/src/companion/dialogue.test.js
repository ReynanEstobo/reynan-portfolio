import test from 'node:test';
import assert from 'node:assert/strict';
import { AMBIENT_THOUGHT_TIMING, createDialogue } from './dialogue.js';

test('a guide request offers navigation, never performs or returns an automatic destination', () => {
  const dialogue = createDialogue();
  const result = dialogue.answer('Take me to his projects');
  assert.equal(result.section, undefined);
  assert.deepEqual(result.choices, [{ label: 'Go to selected work', action: 'guide', section: 'work' }]);
  assert.match(result.text, /Choose the button/);
});

test('unknown answers explicitly acknowledge the local guide limitation', () => {
  const result = createDialogue().answer('What was his last salary and what awards did he win?');
  assert.match(result.text, /don’t have a verified answer/);
  assert.match(result.text, /local, scripted/);
  assert.doesNotMatch(result.text, /award-winning|\$|senior engineer/);
});

test('verified personal facts are available on request, not in idle commentary', () => {
  const dialogue = createDialogue({ random: () => 0 });
  assert.match(dialogue.answer('What is his favorite food?').text, /sinigang/);
  assert.match(dialogue.answer('Does he like cooking?').text, /loves cooking/);
  assert.match(dialogue.answer('How tall is Reynan?').text, /5 feet 6 inches/);
  assert.match(dialogue.answer('What did he dream of doing?').text, /lawyer.*pilot/);
  assert.match(dialogue.answer('Is he single?').text, /is single/);
  for (let index = 0; index < 8; index++) {
    assert.doesNotMatch(dialogue.say('idle', { force: true }).text, /sinigang|single|lawyer|5 feet/);
  }
});

test('line selection avoids the last six lines even with deterministic randomness', () => {
  const dialogue = createDialogue({ random: () => 0 });
  const lines = [];
  for (let index = 0; index < 24; index++) {
    const line = dialogue.say('idle', { force: true }).text;
    assert.equal(lines.slice(-6).includes(line), false);
    lines.push(line);
  }
});

test('a small response pool reuses its oldest line instead of repeating immediately', () => {
  const dialogue = createDialogue({ random: () => 0 });
  const lines = Array.from({ length: 10 }, () => dialogue.say('wave', { force: true }).text);
  for (let index = 1; index < lines.length; index++) assert.notEqual(lines[index], lines[index - 1]);
});

test('cooldowns and the shared autonomous interval prevent unsolicited chatter', () => {
  const dialogue = createDialogue({ random: () => 0 });
  assert.ok(dialogue.say('idle', { now: 0 }));
  assert.equal(dialogue.say('idle', { now: 10000 }), null);
  assert.equal(dialogue.say('section', { now: 20000, section: 'work' }), null);
  assert.ok(dialogue.say('section', { now: 31000, section: 'work' }));
  assert.ok(dialogue.say('greeting', { now: 31001, force: true }));
  assert.ok(dialogue.say('greeting', { now: 31002, force: true }));
});

test('return acknowledgement falls back to a first greeting when memory is disabled', () => {
  const result = createDialogue({ random: () => 0 }).say('returning', { memoryEnabled: false, force: true });
  assert.doesNotMatch(result.text, /back|again/);
  assert.match(result.text, /pixel companion/);
});

test('current project details come from supplied portfolio context', () => {
  const project = { title: 'I&C Laundry Management System', summary: 'The current published project description.', stack: ['React', 'Supabase'] };
  const dialogue = createDialogue();
  const current = dialogue.answer('Explain this project', { project });
  assert.match(current.text, /The current published project description/);
  assert.match(current.text, /React, Supabase/);
  assert.match(dialogue.answer('Tell me about laundry', { projects: [project] }).text, /current published project description/);
});

test('answers distinguish verified projects and their technologies', () => {
  const dialogue = createDialogue();
  assert.match(dialogue.answer('Explain the ETL Pipeline').text, /Python, PostgreSQL, psycopg, Supabase Cron/);
  assert.match(dialogue.answer('What is Jamaica Bday?').text, /invitation.*RSVP/);
  assert.match(dialogue.answer('Tell me about InterroPick').text, /name picker.*Web Audio API/);
  assert.match(dialogue.answer('Tell me about Agots Express backend').text, /Node.js, Express, MongoDB, Socket.IO/);
  assert.match(dialogue.answer('What AI tools does he use?').text, /Codex, Claude, and DeepSeek/);
});

test('contact answers use the published address and offer explicit navigation', () => {
  const result = createDialogue().answer('How can I contact Reynan?');
  assert.match(result.text, /estoboreynan17@gmail.com/);
  assert.ok(result.choices.some((choice) => choice.action === 'guide' && choice.section === 'contact'));
});

test('action requests are explicit choices and section reactions use real sections', () => {
  const dialogue = createDialogue();
  assert.deepEqual(dialogue.answer('jump').choices, [{ label: 'Small jump', action: 'jump' }]);
  assert.match(dialogue.say('section', { section: 'contact', force: true }).text, /contact|email|message/i);
  assert.equal(dialogue.say('section', { section: 'made-up', force: true }), null);
});

test('floating companion thoughts vary without directing visitors to removed menus', () => {
  const dialogue = createDialogue({ random: () => 0.35 });
  const lines = [];
  for (let index = 0; index < 28; index++) {
    const result = dialogue.say('thought', { state: 'idle', force: true });
    assert.equal(lines.slice(-6).includes(result.text), false);
    assert.deepEqual(result.choices, []);
    assert.doesNotMatch(result.text, /\b(menu|button|ask me|choose an action|reply)\b/i);
    lines.push(result.text);
  }
});

test('thoughts match the current action instead of mixing in unrelated activities', () => {
  const samples = {
    snacking: /sinigang|bowl|cooking|spoon|bite/i,
    sitting: /sit|rest|feet|legs|stand|view/i,
    sleeping: /zzz|nap|dream|quiet|duty|pause/i,
    walking: /step|walk|legs|pace|moving|foot|wander|going|route/i,
    phone: /phone|screen|thumb|tapping|check|down/i,
    stretching: /stretch|shoulder|arms|stiffness/i,
  };
  for (const [state, pattern] of Object.entries(samples)) {
    const dialogue = createDialogue({ random: () => 0 });
    const recent = [];
    for (let index = 0; index < 16; index++) {
      const result = dialogue.say('thought', { state, force: true });
      assert.match(result.text, pattern, `${state}: ${result.text}`);
      assert.equal(recent.slice(-6).includes(result.text), false);
      recent.push(result.text);
    }
  }
  assert.match(createDialogue({ random: () => 0 }).say('thought', { state: 'idle', mood: 'dizzy', force: true }).text, /spinning/);
});

test('ambient thoughts can share supplied personal facts without inventing achievements', () => {
  // Each independent instance samples one entry so the entire idle pool is covered.
  const lines = Array.from({ length: 16 }, (_, index) => createDialogue({ random: () => index / 16 }).say('thought', { state: 'idle', force: true }).text).join(' ');
  assert.match(lines, /Sinigang.*favorite food/);
  assert.match(lines, /love cooking/);
  assert.match(lines, /dreamed of becoming a lawyer/);
  assert.match(lines, /being a pilot/);
  assert.match(lines, /basic human decency/);
  assert.match(lines, /Still single/);
  assert.match(lines, /Five feet six/);
  assert.doesNotMatch(lines, /award|graduate|senior engineer|client revenue/i);
});

test('thoughts use known page context and allow the shared 14-second minimum', () => {
  const dialogue = createDialogue({ random: () => 0.999 });
  assert.match(dialogue.say('thought', { now: 0, section: 'work', project: { title: 'InterroPick' } }).text, /InterroPick/);
  assert.equal(dialogue.say('thought', { now: AMBIENT_THOUGHT_TIMING.min - 1, state: 'snacking' }), null);
  assert.equal(dialogue.say('section', { now: AMBIENT_THOUGHT_TIMING.min - 1, section: 'about' }), null);
  assert.ok(dialogue.say('thought', { now: AMBIENT_THOUGHT_TIMING.min, state: 'snacking' }));
});

test('ambient greetings and tap reactions have no question or navigation choices', () => {
  const dialogue = createDialogue({ random: () => 0 });
  for (const event of ['ambientGreeting', 'ambientClick']) {
    for (let index = 0; index < 8; index++) {
      const result = dialogue.say(event, { force: true });
      assert.deepEqual(result.choices, []);
      assert.doesNotMatch(result.text, /\?|\b(menu|button|ask me|choose|reply)\b/i);
    }
  }
});

test('the first spontaneous thought is available 14 seconds after the greeting', () => {
  assert.deepEqual(AMBIENT_THOUGHT_TIMING, { min: 14000, max: 24000 });
  assert.equal(Object.isFrozen(AMBIENT_THOUGHT_TIMING), true);
  const dialogue = createDialogue({ random: () => 0 });
  assert.ok(dialogue.say('ambientGreeting', { now: 0 }));
  assert.equal(dialogue.say('thought', { state: 'walking', now: 13999 }), null);
  assert.ok(dialogue.say('thought', { state: 'walking', now: 14000 }));
  assert.equal(dialogue.say('thought', { state: 'talking', now: 14001 }), null);
  assert.ok(dialogue.say('thought', { state: 'talking', now: 28000 }));
  // Legacy section narration still waits 30 seconds after the latest thought.
  assert.equal(dialogue.say('section', { section: 'work', now: 57999 }), null);
  assert.ok(dialogue.say('section', { section: 'work', now: 58000 }));
});

test('talking and waving thoughts stay varied without prompts for absent controls', () => {
  for (const state of ['talking', 'waving', 'greeting']) {
    const dialogue = createDialogue({ random: () => 0 });
    const lines = [];
    for (let index = 0; index < 24; index++) {
      const result = dialogue.say('thought', { state, now: index * AMBIENT_THOUGHT_TIMING.max });
      assert.ok(result);
      assert.equal(lines.slice(-6).includes(result.text), false);
      assert.deepEqual(result.choices, []);
      assert.doesNotMatch(result.text, /\?|\b(menu|button|ask me|choose|reply)\b/i);
      if (state !== 'talking') assert.match(result.text, /wave|hand|hello|greeting/i);
      lines.push(result.text);
    }
    if (state === 'talking') {
      assert.match(lines.join(' '), /sinigang.*love cooking.*lawyer.*pilot/i);
      assert.match(lines.join(' '), /Codex, Claude, and DeepSeek/);
    }
  }
});
