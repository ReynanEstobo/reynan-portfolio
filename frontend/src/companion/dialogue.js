// This guide is deliberately local: no model, network request, or saved chat log.
// Only public portfolio content and personal facts supplied by Reynan belong here.
// Milliseconds, shared by the controller's schedule and dialogue cooldown.
export const AMBIENT_THOUGHT_TIMING = Object.freeze({ min: 14000, max: 24000 });

const BIO = {
  name: 'Reynan Estobo',
  role: 'AI-driven web developer',
  education: 'Fourth-year BSIT student at Batangas State University, Balayan Campus',
  location: 'Balayan, Batangas',
  email: 'estoboreynan17@gmail.com',
};

const PROJECTS = [
  { title: 'I&C Laundry Management System', summary: 'A centralized multi-branch laundry management system for customer records, orders, payments, inventory, and analytics.', stack: ['React', 'Vite', 'Node.js', 'Supabase'], aliases: ['laundry', 'iandclaundry'] },
  { title: 'I&C ETL Pipeline', summary: 'A data pipeline documenting extraction and transformation stages for laundry-management data.', stack: ['Python', 'PostgreSQL', 'psycopg', 'Supabase Cron'], aliases: ['etl', 'pipeline'] },
  { title: 'Jamaica Bday', summary: 'A React invitation with an envelope intro, countdown, gallery, RSVP flow, and ambient audio controls.', stack: ['React', 'Vite', 'Tailwind CSS'], aliases: ['jamaica', 'bday', 'birthday invitation'] },
  { title: 'InterroPick', summary: 'A classroom random-name picker with roulette, reveal effects, sound synthesis, history, and fullscreen controls.', stack: ['React', 'Vite', 'CSS Animation', 'Web Audio API'], aliases: ['interropick', 'interro pick', 'interro-pick', 'name picker'] },
  { title: 'Agots Express — Frontend', summary: 'The client-side half of Agots Express, paired with a dedicated backend repository.', stack: ['React', 'Vite', 'Tailwind CSS'], aliases: ['agots frontend', 'agots express frontend'] },
  { title: 'Agots Express — Backend', summary: 'The server-side half of Agots Express, paired with the frontend repository.', stack: ['Node.js', 'Express', 'MongoDB', 'Socket.IO'], aliases: ['agots backend', 'agots express backend'] },
];

const guide = (label, section) => ({ label, action: 'guide', section });
const ask = (label, topic) => ({ label, action: `ask:${topic}` });
const TOPICS = [ask('About Reynan', 'about'), ask('His skills', 'skills'), ask('His projects', 'projects'), ask('Get in touch', 'contact')];
const SECTIONS = {
  top: { label: 'the introduction', choices: [guide('Go to introduction', 'top'), ask('About Reynan', 'about')], lines: [
    'This is Reynan’s introduction. Want the short version of what he builds?',
    'The portrait and introduction belong here. I’m the small, mobile edition.',
    'Starting at the top? I can point out the projects when you’re ready.',
  ] },
  work: { label: 'selected work', choices: [ask('Explain the projects', 'projects'), guide('Go to selected work', 'work')], lines: [
    'You’re at selected work. Each project has its own tools and a repository link.',
    'The project previews are here. Pick one and I can explain its focus.',
    'There’s a mix of web interfaces and data work here. Want a quick introduction?',
  ] },
  capabilities: { label: 'skills and workflow', choices: [ask('Explain his skills', 'skills'), guide('Go to skills', 'capabilities')], lines: [
    'This section explains Reynan’s approach: React interfaces, API boundaries, and AI-assisted iteration.',
    'Codex, Claude, and DeepSeek are part of Reynan’s toolkit. He checks the results himself.',
    'Curious about how he works? I can explain the tools listed here.',
  ] },
  about: { label: 'the about section', choices: [ask('About Reynan', 'about'), guide('Go to about', 'about')], lines: [
    'This is the academic profile. Reynan is a fourth-year BSIT student in Balayan.',
    'You’ve reached the personal side of the portfolio. Ask me about Reynan if you like.',
    'I’ll stay out of the way while you read. I can answer a few questions about Reynan.',
  ] },
  contact: { label: 'the contact section', choices: [ask('How do I contact him?', 'contact'), guide('Go to contact', 'contact')], lines: [
    'The contact options are here. I’ll give you some room to write.',
    'Want to talk to Reynan himself? His email and contact form are in this section.',
    'This is where you can send Reynan a message. Chatting with me doesn’t submit that form.',
  ] },
};

// The floating companion has no conversation menu. These thoughts are short,
// self-contained lines tied to a pose, with owner-supplied facts mixed into idle.
const THOUGHTS = {
  idle: [
    'Just me, my sunglasses, and a whole screen to wander.',
    'I love cooking. Even my pixel thoughts end up in the kitchen.',
    'Sinigang is my favorite food. That part is not simulated.',
    'I once dreamed of becoming a lawyer.',
    'Sometimes I imagine being a pilot.',
    'I appreciate people with basic human decency.',
    'Still single. Still here in my little sunglasses.',
    'Five feet six in real life. A little smaller in pixels.',
    'A tiny wanderer from Balayan, Batangas.',
    'One little idea at a time.',
    'I have exactly the right number of pixels for a daydream.',
    'My shoes look ready for another lap.',
    'Curiosity loading. Slowly, thoughtfully.',
    'Small character. Plenty to look at.',
    'I think I will linger here for a moment.',
    'A little pause between adventures.',
  ],
  walking: [
    'One step, then the next. Tiny shoes, steady pace.',
    'Taking the scenic route across the screen.',
    'Stretching my legs, a few pixels at a time.',
    'No rush. I am enjoying this little walk.',
    'Making room, moving along.',
    'Left foot. Right foot. Looking very purposeful.',
    'A small wander helps clear my pixel thoughts.',
    'Going somewhere. Finding out where as I go.',
  ],
  snacking: [
    'Sinigang break. My favorite food deserves a little time.',
    'A tiny bowl of sinigang makes a good pause.',
    'I love cooking. Right now, I am enjoying the eating part.',
    'Small spoon, big appreciation for sinigang.',
    'Even a pixel-sized sinigang break counts.',
    'Let me finish this little bowl first.',
    'Sinigang on the mind. Sinigang in the bowl.',
    'Taking my time with this bite.',
  ],
  sitting: [
    'Taking the weight off my tiny feet.',
    'A good sit is part of a good wander.',
    'Resting here for a little while.',
    'My legs have earned a quiet moment.',
    'Sitting still. Letting the pixels settle.',
    'There is no hurry to stand up again.',
    'A small rest before the next little adventure.',
    'I can enjoy the view from down here.',
  ],
  sleeping: [
    'Zzz... tiny dreams.',
    'Resting my pixels. Zzz...',
    'A little nap between adventures.',
    'Dreaming of a very small bowl of sinigang.',
    'Zzz... one quiet moment more.',
    'Tiny shoes off duty.',
    'Saving my energy for later. Zzz...',
    'A peaceful pixel pause.',
  ],
  phone: [
    'Just checking my tiny phone.',
    'This screen has a screen. Very small, very recursive.',
    'A little phone break between laps.',
    'My pixel thumbs are doing their best.',
    'One small screen is apparently not enough for me.',
    'Looking down for a moment. Still here.',
    'Tiny phone, careful tapping.',
    'Taking a moment to check things.',
  ],
  stretching: [
    'A good stretch, right down to the last pixel.',
    'Reaching up. Loosening those tiny shoulders.',
    'Even a small character needs to stretch.',
    'Arms up. A little room to breathe.',
    'Getting the stiffness out of these pixels.',
    'Just stretching before my next little wander.',
    'A slow stretch feels like a good idea.',
    'Giving these tiny arms a moment.',
  ],
  observing: [
    'There is a lot to notice from down here.',
    'Looking around before I decide where to go.',
    'Something caught my eye behind these sunglasses.',
    'A quiet moment to take it all in.',
    'I wonder where my next tiny idea will lead.',
    'Thinking things through, one pixel at a time.',
    'A little curiosity goes a long way.',
    'Just taking a thoughtful look around.',
  ],
  talking: [
    'My favorite food is sinigang. Somehow my thoughts always find their way back to it.',
    'I love cooking. Recipes and code both reward a little patience.',
    'I once dreamed of becoming a lawyer. Quite a different kind of argument.',
    'Sometimes I imagine being a pilot. For now, I am keeping my tiny feet on this screen.',
    'Fourth-year BSIT student at BSU Balayan. Still learning, still building.',
    'Codex, Claude, and DeepSeek help with my workflow. I still check the results.',
    'I appreciate basic human decency. Small kindnesses matter.',
    'Five feet six outside the screen. A much shorter commute between pixels in here.',
    'A tiny thought can turn into the start of something useful.',
    'I am putting a few pixel thoughts into words.',
  ],
  waving: [
    'A tiny wave from Balayan, Batangas.',
    'Hello over there. Just a little wave as I pass.',
    'Hand up, sunglasses on. Hello from the pixels.',
    'Sending a small hello across the screen.',
    'A wave before my next little wander.',
    'Hello again, from the miniature edition of Reynan.',
    'A little wave between thoughts.',
    'I can spare a tiny hand for a tiny greeting.',
  ],
  dizzy: [
    'Waiting for my pixels to stop spinning.',
    'Finding my balance again. Slowly.',
    'A little wobble. I will take it easy.',
    'Steady now, tiny feet.',
    'Letting the world settle around my sunglasses.',
    'Giving my balance a moment to catch up.',
    'That was quite a turn. Slowly does it.',
    'A quiet moment while my head clears.',
  ],
};

function thoughtsFor(context) {
  const state = context.state || 'idle';
  const type = context.mood === 'dizzy' ? 'dizzy'
    : ['walking', 'following', 'returning', 'turning'].includes(state) ? 'walking'
      : ['sitting', 'resting'].includes(state) ? 'sitting'
        : ['stretching', 'waking'].includes(state) ? 'stretching'
          : ['observing', 'thinking'].includes(state) ? 'observing'
            : state === 'greeting' ? 'waving'
              : Object.hasOwn(THOUGHTS, state) ? state : 'idle';
  if (type !== 'idle') return THOUGHTS[type];
  const contextual = {
    top: ['That portrait is the bigger edition of me.'],
    work: ['Interfaces, data, and a few experiments. Quite a bit to look around.'],
    capabilities: ['Codex, Claude, and DeepSeek help with the work. I still check the results.'],
    about: ['Fourth-year BSIT student, still learning and building.'],
    contact: ['I will give the contact section a little breathing room.'],
  }[context.section] || [];
  if (context.section === 'work' && clean(context.project?.title, 90)) contextual.push(`Taking a little look at ${clean(context.project.title, 90)}.`);
  return [...THOUGHTS.idle, ...contextual];
}

const LINES = {
  ambientGreeting: ['Hello there. I am just settling into the pixels.', 'A tiny wave before I wander off.', 'Here I am. Sunglasses on, little shoes ready.', 'Hello from the small side of the screen.', 'I will keep myself busy around here.', 'A little hello, then back to exploring.', 'Tiny Reynan, reporting for a leisurely wander.', 'Just passing through with a small wave.'],
  ambientClick: ['Oh, hello! A tiny wave back.', 'Tap received. Sunglasses still in place.', 'You found me. I was just thinking.', 'A small hello between adventures.', 'I noticed that. Here is a little wave.', 'Still here, keeping myself entertained.', 'That deserves a tiny greeting.', 'A quick wave, then back to my pixel business.'],
  greeting: ['Hi! I’m Reynan’s pixel companion. What would you like to explore?', 'Hello there. A wave, a question, or a look at the projects?', 'Hey! I can keep you company or help you find your way around.', 'Hi! There’s room for both of us here. What are you curious about?'],
  returning: ['Welcome back. Shall we explore a little more?', 'Hello again! Good to see you back in this corner of the web.', 'You’re back. I’m ready when you are.', 'Welcome back! A project tour or a quiet browse today?'],
  repeatClick: ['Still here! You can pick an action from my menu.', 'Another tap? I’m listening. Try a question or ask me to wave.', 'You have my attention. What shall we do?', 'I noticed! A small wave back to you.'],
  drag: ['A change of scenery? Easy on the landing.', 'Going somewhere? I’ll tuck my feet in.', 'Lift acquired. Looking for a good landing spot.', 'Okay, you lead. I’ll try to keep my balance.'],
  landed: ['Feet down. Balance restored.', 'New spot, same tiny shoes.', 'There. A little wobble, then I’m ready.', 'Landed. I’ll settle here for a moment.'],
  hardLanding: ['Oof. Give me a moment to steady myself.', 'That was a bumpy landing. I’m taking a small breather.', 'A little too much momentum there. Let me recover.', 'Tiny knees, big landing. Rest first.'],
  dizzy: ['Whoa. Let the screen stop spinning for a second.', 'I need a quiet moment after that tumble.', 'Finding my balance again. Slowly.', 'That was a turn and a half. I’ll sit for a bit.'],
  rest: ['A small rest. You keep exploring.', 'Taking a seat while you read.', 'I’ll catch my breath here. No rush.', 'Quiet moment. Letting my little feet rest.'],
  wake: ['All right. Ready for another little adventure.', 'Rested and looking around again.', 'A stretch, then back to exploring.', 'Back on my feet. What did I miss?'],
  snack: ['Sinigang break! It’s Reynan’s favorite food.', 'Reynan loves cooking. A little sinigang sounds like a good break.', 'A tiny bowl of sinigang? You know Reynan’s favorite.', 'Snack accepted. Reynan would vote for sinigang.'],
  wave: ['Hello over there!', 'A little wave, just for you.', 'Right back at you!', 'Hi! You have my attention.'],
  come: ['On my way. I’ll find a clear spot nearby.', 'Coming closer. I’ll leave you room to read.', 'I can meet you nearby. Small steps.', 'Heading over to a comfortable spot.'],
  follow: ['I’ll follow your pointer with a little space between us.', 'Lead the way. I’ll stop a comfortable distance away.', 'Following along. You can turn this off any time.', 'I’m with you. No need to rush.'],
  stopFollow: ['I’ll stay around here now.', 'Following switched off. Time to settle.', 'You explore; I’ll find my own quiet spot.', 'Got it. I’ll stop tagging along.'],
  quiet: ['Quiet mode. I’ll wait for you to interact.', 'I’ll keep still and leave the reading to you.', 'A quiet companion for a quiet browse.', 'Understood. Call me when you need me.'],
  idle: ['I’ll give you a moment to look around.', 'No hurry. There’s plenty to explore at your own pace.', 'I can point you toward a section whenever you like.', 'Taking in the view from down here.', 'A small stretch while you browse.', 'I’ll wait here for your next move.', 'Looking around, keeping out of the way.', 'Ready when you are. A question or a wave both work.'],
  talk: ['What would you like to know about Reynan?', 'Ask about his work, skills, or a little about him.', 'I can answer a few portfolio questions. What’s on your mind?', 'Let’s talk. I know the information Reynan shared here.'],
  paused: ['Paused. I’ll wait right here.', 'Taking a pause. Resume whenever you’re ready.', 'Holding still for now.', 'Pause accepted. Your reading space is yours.'],
  resumed: ['Ready to move again.', 'Back to exploring at a gentle pace.', 'Resumed. I’ll take it from here.', 'All set. Let’s look around.'],
};

const COOLDOWNS = { thought: AMBIENT_THOUGHT_TIMING.min, ambientGreeting: 60000, ambientClick: 5000, idle: 45000, section: 45000, returning: 30000, greeting: 8000, repeatClick: 5000, drag: 12000, landed: 18000, hardLanding: 10000, dizzy: 10000, rest: 20000, wake: 20000 };
const clean = (value, limit = 300) => typeof value === 'string' ? value.trim().replace(/[\u0000-\u001f]/g, ' ').slice(0, limit) : '';
const normalize = (value) => clean(value, 600).toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ');
const reply = (text, choices = TOPICS) => ({ text, choices: choices.map((choice) => ({ ...choice })) });

function describeProject(project) {
  const title = clean(project.title, 90);
  const summary = clean(project.summary, 340);
  const stack = Array.isArray(project.stack) ? project.stack.map((tool) => clean(tool, 30)).filter(Boolean).slice(0, 8) : [];
  return `${title}: ${summary || 'Its repository is linked in selected work.'}${stack.length ? ` Tools: ${stack.join(', ')}.` : ''}`;
}

export function createDialogue({ random = Math.random } = {}) {
  // Only generated lines live here; typed questions are never saved.
  const recent = [];
  const lastEvent = new Map();
  let lastAutonomous = -Infinity;

  function remember(text, choices) {
    recent.push(text);
    if (recent.length > 6) recent.shift();
    return reply(text, choices);
  }

  function pick(lines) {
    const fresh = lines.filter((line) => !recent.includes(line));
    // A small pool may be exhausted. Reuse its oldest line, not the latest one.
    const candidates = fresh.length ? fresh : [...lines].sort((a, b) => recent.lastIndexOf(a) - recent.lastIndexOf(b)).slice(0, 1);
    const sample = Math.min(0.999999, Math.max(0, Number(random()) || 0));
    return candidates[Math.floor(sample * candidates.length)];
  }

  function say(event, context = {}) {
    if (event === 'returning' && context.memoryEnabled === false) event = 'greeting';
    const section = SECTIONS[context.section];
    const lines = event === 'thought' ? thoughtsFor(context) : event === 'section' ? section?.lines : LINES[event];
    if (!lines) return null;
    const now = Number.isFinite(context.now) ? context.now : Date.now();
    const autonomous = ['idle', 'section', 'thought', 'ambientGreeting'].includes(event);
    const autonomousGap = event === 'thought' ? AMBIENT_THOUGHT_TIMING.min : 30000;
    const key = event === 'section' ? `section:${context.section}` : event;
    if (!context.force && (now - (lastEvent.get(key) ?? -Infinity) < (COOLDOWNS[event] ?? 6000) || (autonomous && now - lastAutonomous < autonomousGap))) return null;
    lastEvent.set(key, now);
    if (autonomous) lastAutonomous = now;
    const choices = ['thought', 'ambientGreeting', 'ambientClick'].includes(event) ? [] : event === 'section' ? section.choices
      : event === 'follow' ? [{ label: 'Stop following', action: 'follow' }]
        : event === 'rest' ? [ask('Ask a question', 'about'), { label: 'Wave', action: 'wave' }]
          : event === 'snack' ? [ask('Does Reynan cook?', 'cooking'), { label: 'Rest a little', action: 'sit' }]
            : TOPICS;
    return remember(pick(lines), choices);
  }

  function answer(text, context = {}) {
    const question = normalize(text).replace(/^ask:/, '');
    const profile = { ...BIO, ...context.profile };
    const projects = Array.isArray(context.projects) && context.projects.length ? context.projects : PROJECTS;
    const answerWith = (line, choices) => remember(line, choices);
    if (!question) return answerWith('Pick a topic or ask a short question. I can explain the information Reynan shared here.');

    if (/\b(guide|take me|show me|go to|navigate|bring me)\b/.test(question)) {
      const section = /\b(contact|email|message)\b/.test(question) ? 'contact'
        : /\b(skill|skills|capabilities|workflow)\b/.test(question) ? 'capabilities'
          : /\b(about|bio|education)\b/.test(question) ? 'about'
            : /\b(top|home|intro|introduction)\b/.test(question) ? 'top'
              : /\b(work|project|projects)\b/.test(question) ? 'work' : null;
      return answerWith(section ? `I can guide you to ${SECTIONS[section].label}. Choose the button when you’re ready.` : 'Where would you like to go? Choose a section and I’ll guide you there.', section ? [guide(`Go to ${SECTIONS[section].label}`, section)] : [guide('Selected work', 'work'), guide('About Reynan', 'about'), guide('Contact', 'contact')]);
    }

    if (/\b(conscious|sentient|alive|real ai|ai mind|chatgpt|scripted|local guide|how do you work)\b/.test(question)) return answerWith('I’m a fictional pixel companion with local, scripted replies and animation states. I don’t have a live AI connection or real feelings. I can explain Reynan’s published portfolio.');
    if (/\b(privacy|private|store|stored|save|saved|send my|data)\b/.test(question) && !/\b(project|pipeline|database)\b/.test(question)) return answerWith('These companion replies run locally. Your typed questions aren’t sent to an AI service or stored as a chat history. Optional local memory only remembers companion preferences and a visit marker.');
    if (/^(hi|hello|hey|good morning|good evening|greetings)[!. ]*$/.test(question)) return say('greeting', { ...context, force: true });
    if (/\b(thanks|thank you)\b/.test(question)) return answerWith(pick(['You’re welcome. Enjoy exploring!', 'Any time. I’ll be nearby.', 'Glad to help. Take your time looking around.']));

    if (/^(wave|wave at me|say hi|jump|do a trick|sit|rest|come here|follow me|follow|snack|feed you)[!. ]*$/.test(question)) {
      const action = /wave|say hi/.test(question) ? 'wave' : /jump|trick/.test(question) ? 'jump' : /sit|rest/.test(question) ? 'sit' : /come/.test(question) ? 'come' : /follow/.test(question) ? 'follow' : 'snack';
      const labels = { wave: 'Wave', jump: 'Small jump', sit: 'Take a seat', come: 'Come here', follow: 'Toggle following', snack: 'Share a snack' };
      return answerWith('Choose the action below and I’ll give it a try.', [{ label: labels[action], action }]);
    }

    if (/\b(favorite food|favourite food|food|sinigang|favorite meal|favourite meal)\b/.test(question)) return answerWith('Reynan’s favorite food is sinigang. He also loves cooking.', [{ label: 'Share a snack', action: 'snack' }, ask('More about Reynan', 'about')]);
    if (/\b(cook|cooks|cooking|hobby|hobbies)\b/.test(question)) return answerWith('Reynan has shared that he loves cooking. His favorite food is sinigang.');
    if (/\b(lawyer|pilot|dream|dreams|dreamed)\b/.test(question)) return answerWith('Reynan once dreamed of becoming a lawyer, and sometimes imagines being a pilot. His current career goal is web development.');
    if (/\b(decency|values|what kind of people)\b/.test(question)) return answerWith('Reynan says he appreciates people with basic human decency.');
    if (/\b(single|relationship|dating|married)\b/.test(question)) return answerWith('Reynan has shared that he is single. That’s the relationship detail he provided.');
    if (/\b(height|tall|how high)\b/.test(question)) return answerWith('Reynan has shared that he is 5 feet 6 inches tall.');

    if (/\b(contact|email|hire|hiring|collaborate|reach|message him|socials|facebook|github)\b/.test(question)) return answerWith(`You can reach Reynan at ${clean(profile.email, 100) || BIO.email}. The contact section also has his GitHub, Facebook, and school email.`, [guide('Go to contact', 'contact'), ask('See his projects', 'projects')]);
    if (/\b(skill|skills|stack|tech|technologies|technology|framework|frameworks|tool|tools|codex|claude|deepseek|ai|workflow|react)\b/.test(question) && !/\b(laundry|etl|pipeline|jamaica|interro|agots|project)\b/.test(question)) return answerWith('Reynan builds React web interfaces and works with APIs and data models. He uses Codex, Claude, and DeepSeek for AI-assisted research, prototyping, debugging, and iteration, then validates the results.', [guide('Go to skills', 'capabilities'), ask('Which projects use those?', 'projects')]);
    if (/\b(study|studies|student|school|university|college|education|course|bsit|bsu|academic)\b/.test(question)) return answerWith(`${clean(profile.education, 230) || BIO.education}.`, [guide('Go to about', 'about')]);
    if (/\b(live|lives|location|based|from|balayan|batangas)\b/.test(question)) return answerWith('Reynan is based in Balayan, Batangas, Philippines.', [guide('Go to about', 'about')]);

    if (/\b(this project|selected project|current project|clicked|selected)\b/.test(question) && context.project?.title) return answerWith(describeProject(context.project), [guide('Go to selected work', 'work'), ask('Other projects', 'projects')]);
    const namedProject = PROJECTS.find((project) => project.aliases.some((alias) => question.includes(alias)));
    if (namedProject) {
      const current = projects.find((project) => normalize(project.title) === normalize(namedProject.title)) || namedProject;
      return answerWith(describeProject(current), [guide('Go to selected work', 'work'), ask('Other projects', 'projects')]);
    }
    if (/\bagots\b/.test(question)) return answerWith('Agots Express is presented as a linked frontend and backend pair. The frontend uses React, Vite, and Tailwind CSS; the backend lists Node.js, Express, MongoDB, and Socket.IO. I don’t have verified project outcomes to add.', [guide('Go to selected work', 'work')]);
    if (/\b(project|projects|portfolio|work|built|builds)\b/.test(question)) return answerWith('The selected work includes I&C Laundry, its ETL Pipeline, Jamaica Bday, InterroPick, and the Agots Express frontend/backend pair. Ask me about one by name.', [ask('I&C Laundry', 'laundry'), ask('Jamaica Bday', 'jamaica'), ask('InterroPick', 'interropick'), guide('Explore all projects', 'work')]);
    if (/\b(about|who|name|introduce|yourself|bio)\b/.test(question) || question === 'reynan') return answerWith(`${clean(profile.name, 70) || BIO.name} is an ${clean(profile.role, 90) || BIO.role} based in Balayan, Batangas. He’s a fourth-year BSIT student at Batangas State University’s Balayan Campus.`, [ask('His skills', 'skills'), ask('His projects', 'projects'), guide('Go to about', 'about')]);

    return answerWith('I don’t have a verified answer for that. I’m a local, scripted portfolio guide, without a live AI service. Try asking about Reynan, his skills, a named project, or how to contact him.');
  }

  return { say, answer };
}
