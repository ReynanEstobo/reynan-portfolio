import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import portrait from './assets/reynan-pixel-portrait.png';
import laundryPreview from './assets/ic-laundry-ui.png';
import jamaicaPreview from './assets/jamaica-bday-ui.png';
import interroPreview from './assets/interropick-ui.png';
import agotsPreview from './assets/agots-express-ui.png';

const fallbackProfile = { name: 'Reynan Estobo', role: 'AI-driven web developer', location: 'Balayan, Batangas, Philippines', education: 'Fourth-year BSIT student, Batangas State University â€” Balayan Campus', bio: 'I build thoughtful web experiences and practical systems by combining strong development fundamentals with AI-assisted research, iteration, and problem-solving.', email: 'estoboreynan17@gmail.com', schoolEmail: '23-14327@g.batstate-u.edu.ph', github: 'https://github.com/ReynanEstobo', facebook: 'https://web.facebook.com/beysik.111304' };
const fallbackProjects = [
  ['I&C Laundry Management System', 'A centralized multi-branch laundry management system for customer records, orders, payments, inventory, and analytics.', 'Full-stack React interface separated from a server-only Node.js API.', ['React', 'Vite', 'Node.js', 'Supabase'], 'https://github.com/ReynanEstobo/IandCLaundry'],
  ['I&C ETL Pipeline', 'A data pipeline project documenting extraction and transformation stages for laundry-management data.', 'Turning operational records into usable information.', ['Python', 'PostgreSQL', 'psycopg', 'Supabase Cron'], 'https://github.com/ReynanEstobo/I-C-ETL-Pipeline'],
  ['Jamaica Bday', 'A React invitation with an envelope intro, countdown, gallery, RSVP flow, and ambient audio controls.', 'A detail-rich event experience built from reusable components.', ['React', 'Vite', 'Tailwind CSS'], 'https://github.com/ReynanEstobo/Jamaica-Bday'],
  ['InterroPick', 'A theatrical classroom random-name picker with roulette, reveal effects, sound synthesis, history, and fullscreen controls.', 'Interaction-first design, built with CSS animation and Web Audio.', ['React', 'Web Audio API'], 'https://github.com/ReynanEstobo/Interro-Pick'],
  ['Agots Express â€” Frontend', 'The client-side half of the Agots Express project.', 'Paired with a dedicated backend repository.', ['React', 'Vite', 'Tailwind CSS'], 'https://github.com/ReynanEstobo/Agots-Express-frontend'],
  ['Agots Express â€” Backend', 'The server-side half of the Agots Express project.', 'A separate service paired with the frontend.', ['Node.js', 'Express', 'MongoDB', 'Socket.IO'], 'https://github.com/ReynanEstobo/Agots-Express-Backend']
].map(([title, summary, highlight, stack, url], index) => ({ id: index, title, summary, highlight, stack, links: [{ label: 'View repository', url }] }));
const projectPreviews = {
  'I&C Laundry Management System': { image: laundryPreview, label: 'I&C Laundry landing page' },
  'Jamaica Bday': { image: jamaicaPreview, label: 'Jamaica Bday invitation opening screen' },
  InterroPick: { image: interroPreview, label: 'InterroPick selection interface' },
  'Agots Express â€” Frontend': { image: agotsPreview, label: 'Agots Express restaurant landing page' }
};

function Mark() { return <span className="mark" aria-hidden="true">R<span>/</span>E</span>; }
function Arrow() { return <span aria-hidden="true">â†—</span>; }

function QuickView({ project, onClose }) {
  if (!project) return null;
  const preview = projectPreviews[project.title];
  return <div className="quick-view-backdrop" onMouseDown={onClose}>
    <section className="quick-view" role="dialog" aria-modal="true" aria-labelledby="quick-view-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="quick-view-close" onClick={onClose} aria-label="Close quick view">Ã—</button>
      <p className="eyebrow">Project brief <span>Quick view</span></p>
      <h2 id="quick-view-title">{project.title}</h2>
      {preview && <figure className="project-preview"><div className="browser-bar"><i /><i /><i /><span>Live interface capture</span></div><img src={preview.image} alt={preview.label} /></figure>}
      <p className="quick-view-summary">{project.summary}</p>
      <div className="quick-view-detail"><span>Key focus</span><p>{project.highlight}</p></div>
      <div className="quick-view-detail"><span>Tools</span><div className="tags">{project.stack.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
      {project.links?.[0] && <a className="button button-dark" href={project.links[0].url} target="_blank" rel="noreferrer">Open repository <Arrow /></a>}
    </section>
  </div>;
}

function ContactForm() {
  const [state, setState] = useState({ status: 'idle', message: '' });
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    setState({ status: 'loading', message: '' });
    try { const result = await api.contact(payload); event.currentTarget.reset(); setState({ status: 'success', message: result.message }); }
    catch (error) { setState({ status: 'error', message: error.message }); }
  }
  return <form className="contact-form" onSubmit={submit} noValidate>
    <label>Name<input name="name" required minLength="2" placeholder="Your name" /></label>
    <label>Email<input name="email" type="email" required placeholder="you@example.com" /></label>
    <label>Subject<input name="subject" required minLength="3" placeholder="What can I help with?" /></label>
    <label>Message<textarea name="message" required minLength="10" rows="5" placeholder="Tell me a little about your project or opportunity." /></label>
    <input className="honeypot" name="website" tabIndex="-1" autoComplete="off" aria-hidden="true" />
    <button className="button button-dark" disabled={state.status === 'loading'}>{state.status === 'loading' ? 'Sendingâ€¦' : 'Send message'} <Arrow /></button>
    {state.message && <p className={`form-message ${state.status}`} role="status">{state.message}</p>}
  </form>;
}

export default function App() {
  const [profile, setProfile] = useState(fallbackProfile);
  const [projects, setProjects] = useState(fallbackProjects);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeProject, setActiveProject] = useState(null);
  useEffect(() => { Promise.all([api.profile(), api.projects()]).then(([nextProfile, nextProjects]) => { setProfile(nextProfile); if (nextProjects.length) setProjects(nextProjects); }).catch(() => {}); }, []);
  useEffect(() => { const closeOnEscape = (event) => event.key === 'Escape' && setActiveProject(null); window.addEventListener('keydown', closeOnEscape); return () => window.removeEventListener('keydown', closeOnEscape); }, []);
  useEffect(() => {
    const carousel = document.querySelector('.project-list');
    if (!carousel || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const advance = () => {
      const card = carousel.querySelector('.project');
      if (!card) return;
      const step = card.getBoundingClientRect().width + 20;
      const atEnd = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 8;
      carousel.scrollTo({ left: atEnd ? 0 : carousel.scrollLeft + step, behavior: 'smooth' });
    };
    let timer = window.setInterval(advance, 5000);
    const pause = () => window.clearInterval(timer);
    const resume = () => { window.clearInterval(timer); timer = window.setInterval(advance, 5000); };
    const controls = document.createElement('div');
    controls.className = 'carousel-controls';
    controls.setAttribute('aria-label', 'Project carousel controls');
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.setAttribute('aria-label', 'Show previous project');
    previous.textContent = 'â† Previous';
    const next = document.createElement('button');
    next.type = 'button';
    next.setAttribute('aria-label', 'Show next project');
    next.textContent = 'Next â†’';
    const move = (direction) => {
      const card = carousel.querySelector('.project');
      if (!card) return;
      const step = card.getBoundingClientRect().width + 20;
      const nextPosition = carousel.scrollLeft + (step * direction);
      const atStart = carousel.scrollLeft <= 8;
      const atEnd = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 8;
      carousel.scrollTo({ left: direction < 0 && atStart ? carousel.scrollWidth : direction > 0 && atEnd ? 0 : nextPosition, behavior: 'smooth' });
      resume();
    };
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    controls.append(previous, next);
    carousel.before(controls);
    carousel.addEventListener('mouseenter', pause);
    carousel.addEventListener('mouseleave', resume);
    carousel.addEventListener('focusin', pause);
    carousel.addEventListener('focusout', resume);
    return () => { window.clearInterval(timer); carousel.removeEventListener('mouseenter', pause); carousel.removeEventListener('mouseleave', resume); carousel.removeEventListener('focusin', pause); carousel.removeEventListener('focusout', resume); controls.remove(); };
  }, [projects.length]);
  useEffect(() => {
    const carousel = document.querySelector('.project-list');
    if (!carousel) return undefined;
    const map = document.createElement('aside');
    map.className = 'project-map';
    map.setAttribute('aria-label', 'Project relationships');
    map.innerHTML = `<p class="project-map-label">Project system map</p><div class="project-map-grid"><div><strong>I&amp;C Laundry</strong><span>â†”</span><strong>ETL Pipeline</strong><small>Operational data flows into reporting and transformation work.</small></div><div><strong>Agots Frontend</strong><span>â†”</span><strong>Agots Backend</strong><small>Separated client and service repositories, connected through an API boundary.</small></div><div class="project-map-independent"><strong>Jamaica Bday</strong><strong>InterroPick</strong><small>Standalone interface experiments focused on experience and interaction.</small></div></div>`;
    carousel.before(map);
    return () => map.remove();
  }, []);
  const closeMenu = () => setMenuOpen(false);
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><a href="#top" className="brand" aria-label="Reynan Estobo, top"><Mark /></a><button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="nav">Menu</button><nav id="nav" className={menuOpen ? 'open' : ''}><a onClick={closeMenu} href="#work">Work</a><a onClick={closeMenu} href="#about">About</a><a onClick={closeMenu} href="#contact">Contact</a></nav></header>
    <main id="main">
      <section className="hero" id="top"><div className="eyebrow">Portfolio / 2026 <span>01â€”</span></div><div className="hero-grid"><div><p className="hero-kicker">{profile.role}</p><h1>Websites with<br /><em>purpose,</em> systems<br />with clarity.</h1><p className="hero-copy">{profile.bio}</p><div className="hero-actions"><a className="button button-dark" href={`mailto:${profile.email}`}>Start a conversation <Arrow /></a><a className="text-link" href="#work">See selected work <span>â†“</span></a></div></div><aside className="identity-card"><span>Developer portrait / 01</span><img src={portrait} alt="Pixel-art portrait of Reynan Estobo wearing sunglasses and holding a phone" /><p>Designing useful, memorable interfaces from Balayan to the web.</p><div className="card-line" /><small>React Â· APIs Â· Data</small></aside></div><div className="hero-footer"><span>Available for web opportunities</span><span>Scroll to explore â†“</span></div></section>
      <section className="work" id="work"><div className="section-heading"><p className="eyebrow">Selected work <span>02â€”</span></p><h2>Built to be<br /><em>used.</em></h2><p>Six projects across full-stack systems, data workflows, and expressive interfaces.</p></div><div className="project-list">{projects.map((project, index) => <article className="project" key={project.id ?? project.slug}><div className="project-number">0{index + 1}</div><div className="project-body">{projectPreviews[project.title] && <figure className="project-card-preview"><img src={projectPreviews[project.title].image} alt={projectPreviews[project.title].label} /></figure>}<h3>{project.title}</h3><p>{project.summary}</p><p className="highlight">{project.highlight}</p><div className="tags">{project.stack.map((tag) => <span key={tag}>{tag}</span>)}</div></div><div className="project-link"><button className="quick-view-trigger" onClick={() => setActiveProject(project)}>Quick view <span aria-hidden="true">â†˜</span></button>{project.links?.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label} <Arrow /></a>)}</div></article>)}</div></section>
      <section className="capabilities"><p className="eyebrow">Practice <span>03â€”</span></p><div className="capability-grid"><h2>From rough idea<br />to <em>working</em> web.</h2><div><article><span>01</span><h3>AI-driven workflow</h3><p>I use AI as a practical partner for research, rapid prototyping, debugging, and sharper iterationsâ€”then validate every result with engineering judgment.</p><div className="ai-toolkit"><span>AI toolkit</span><b>Codex</b><b>Claude</b><b>DeepSeek</b></div></article><article><span>02</span><h3>Interface craft</h3><p>Responsive React interfaces that make complex actions feel straightforward.</p></article><article><span>03</span><h3>Full-stack thinking</h3><p>Clear API boundaries, data models, validation, and services that support the experience.</p></article></div></div></section>
      <section className="about" id="about"><p className="eyebrow">About <span>04â€”</span></p><div className="about-layout"><h2>Learning in public.<br />Building with <em>AI.</em></h2><div><p>{profile.education}. Based in {profile.location}.</p><p>Iâ€™m working toward a career in AI-driven web development, pairing curiosity and solid technical foundations with AI tools that help me explore faster and ship more thoughtfully.</p><a className="text-link" href={profile.github} target="_blank" rel="noreferrer">Follow my work on GitHub <Arrow /></a></div></div></section>
      <section className="contact" id="contact"><p className="eyebrow">Contact <span>05â€”</span></p><div className="contact-layout"><div><h2>Have a good<br /><em>idea?</em> Letâ€™s talk.</h2><p>For opportunities, collaborations, or a quick hello, leave a message or send an email directly.</p><a className="email-link" href={`mailto:${profile.email}`}>{profile.email} <Arrow /></a><div className="socials"><a href={profile.github} target="_blank" rel="noreferrer">GitHub</a><a href={profile.facebook} target="_blank" rel="noreferrer">Facebook</a><a href={`mailto:${profile.schoolEmail}`}>School email</a></div></div><ContactForm /></div></section>
    </main><footer><Mark /><span>Â© {new Date().getFullYear()} Reynan Estobo</span><a href="#top">Back to top â†‘</a></footer><QuickView project={activeProject} onClose={() => setActiveProject(null)} />
  </>;
}

