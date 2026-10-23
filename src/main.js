import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import 'lenis/dist/lenis.css';
import { createScene, sceneState } from './scene.js';

gsap.registerPlugin(ScrollTrigger);

// Always start at the top: no restored scroll position, no jump to a #hash
history.scrollRestoration = 'manual';
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
window.scrollTo(0, 0);

const reduceMotion =window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

// ---------------------------------------------------------------------------
// Smooth scroll (Lenis) driven by GSAP's ticker so ScrollTrigger stays in sync
// ---------------------------------------------------------------------------
const lenis = new Lenis({ duration: 1.2, smoothWheel: !reduceMotion });
lenis.stop(); // locked until the loader finishes

let scene = null;
try {
  scene = createScene(document.getElementById('webgl'));
} catch (err) {
  console.warn('WebGL unavailable, continuing without the 3D scene.', err);
}

lenis.on('scroll', (e) => {
  ScrollTrigger.update();
  scene?.setScroll(e.scroll, e.velocity);
  progressBar.style.transform = `scaleX(${e.progress || 0})`;
  nav.classList.toggle('nav--scrolled', e.scroll > 40);
});

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
  scene?.render();
});
gsap.ticker.lagSmoothing(0);

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
const nav = document.querySelector('.nav');
const progressBar = document.querySelector('.progress span');
const menu = document.querySelector('.menu');
const toggle = document.querySelector('.nav__toggle');

function setMenu(open) {
  document.body.classList.toggle('menu-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-hidden', String(!open));
  open ? lenis.stop() : lenis.start();
}
toggle.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));

document.querySelectorAll('[data-link]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = a.getAttribute('href');
    if (!target?.startsWith('#')) return;
    e.preventDefault();
    if (document.body.classList.contains('menu-open')) setMenu(false);
    lenis.scrollTo(target === '#home' ? 0 : target, { offset: -20, duration: 1.6 });
  });
});

// A pinned section stays on screen for its whole pin-spacer, so measure that.
const sectionBounds = (section) =>
  section.parentElement.classList.contains('pin-spacer') ? section.parentElement : section;

// Highlight current section in the navbar
function setupNavHighlight() {
  document.querySelectorAll('main section[id]').forEach((section) => {
    const link = document.querySelector(`.nav__links a[href="#${section.id}"]`);
    if (!link) return;
    ScrollTrigger.create({
      trigger: sectionBounds(section),
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => link.classList.toggle('active', self.isActive),
    });
  });
}

// ---------------------------------------------------------------------------
// 3D scene keyframes per section
// ---------------------------------------------------------------------------
const sceneKeys = {
  hero:        { x: 2.4,  y: 0,    scale: 1,    amp: 0.28, freq: 0.9, ring: 1,   wire: 0.35, glow: 0.4,  opacity: 1 },
  about:       { x: 2.7,  y: -0.3, scale: 0.75, amp: 0.45, freq: 1.2, ring: 0.6, wire: 0.5,  glow: 0.6,  opacity: 0.9 },
  services:    { x: 2.6,  y: -0.6, scale: 0.6,  amp: 0.35, freq: 1.6, ring: 0.3, wire: 0.6,  glow: 0.5,  opacity: 0.75 },
  stack:       { x: 0,    y: 0,    scale: 1.7,  amp: 0.18, freq: 0.7, ring: 0.8, wire: 0.15, glow: 0.3,  opacity: 0.35 },
  projects:    { x: -2.8, y: 0.8,  scale: 0.55, amp: 0.6,  freq: 1.4, ring: 0.2, wire: 0.6,  glow: 0.7,  opacity: 0.55 },
  approach:    { x: 2.9,  y: 1.7,  scale: 0.45, amp: 0.4,  freq: 1.1, ring: 0.4,  wire: 0.4,  glow: 0.5,  opacity: 0.7 },
  why:         { x: 2.6,  y: -0.4, scale: 0.8,  amp: 0.3,  freq: 0.9, ring: 0.5, wire: 0.3,  glow: 0.4,  opacity: 0.5 },
  experience:  { x: 2.5,  y: 0.3,  scale: 0.7,  amp: 0.5,  freq: 1.3, ring: 0.4, wire: 0.5,  glow: 0.6,  opacity: 0.7 },
  philosophy:  { x: 0,    y: 0,    scale: 2.1,  amp: 0.85, freq: 0.6, ring: 0.2, wire: 0.1,  glow: 0.9,  opacity: 0.45 },
  contact:     { x: 0,    y: 0.4,  scale: 1.05, amp: 0.3,  freq: 1.0, ring: 1,   wire: 0.45, glow: 1,    opacity: 0.6 },
};

function setupSceneKeys() {
  document.querySelectorAll('[data-scene]').forEach((section) => {
    const key = sceneKeys[section.dataset.scene];
    ScrollTrigger.create({
      trigger: sectionBounds(section),
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (self) => self.isActive && Object.assign(sceneState, key),
    });
  });
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------
function splitWords(el) {
  const walk = (node) => {
    const frag = document.createDocumentFragment();
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.append(' ');
          const outer = document.createElement('span');
          outer.className = 'word';
          const inner = document.createElement('span');
          inner.textContent = part;
          outer.append(inner);
          frag.append(outer);
        });
      } else {
        const clone = child.cloneNode(false);
        clone.append(walk(child));
        frag.append(clone);
      }
    });
    return frag;
  };
  el.setAttribute('aria-label', el.textContent);
  const content = walk(el);
  el.replaceChildren(content);
  return el.querySelectorAll('.word > span');
}

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------
const splits = [...document.querySelectorAll('[data-split]')].map((el) => ({ el, words: splitWords(el) }));
const heroSplit = splits.find((s) => s.el.closest('.hero'));

function heroIntro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from(heroSplit.words, { yPercent: 115, rotate: 4, duration: 1.4, stagger: 0.05 })
    .from('[data-hero]', { y: 30, autoAlpha: 0, duration: 1.2, stagger: 0.1 }, 0.35)
    .from('.nav', { y: -30, autoAlpha: 0, duration: 1 }, 0.4);
  if (scene) {
    const p = { v: 0 };
    tl.to(p, { v: 1, duration: 2.4, ease: 'power3.out', onUpdate: () => scene.setIntro(p.v) }, 0);
  }
  return tl;
}

function setupScrollAnimations() {
  // Generic reveal
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 50,
      autoAlpha: 0,
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  // Split headings (outside the hero)
  splits.filter((s) => s !== heroSplit).forEach(({ el, words }) => {
    gsap.from(words, {
      yPercent: 115,
      duration: 1.2,
      ease: 'expo.out',
      stagger: 0.06,
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  // Hero content drifts away on scroll
  gsap.to('.hero .container:first-child', {
    yPercent: -18,
    autoAlpha: 0.15,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  // Philosophy: word-by-word highlight, scrubbed
  document.querySelectorAll('[data-words]').forEach((el) => {
    const words = splitWords(el);
    gsap.fromTo(
      words,
      { opacity: 0.12 },
      {
        opacity: 1,
        stagger: 0.1,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true },
      },
    );
  });

  // Marquee speeds up with scroll velocity
  const tracks = gsap.utils.toArray('.marquee__track').map((track, i) =>
    gsap.to(track, { xPercent: i % 2 ? 50 : -50, duration: 40, ease: 'none', repeat: -1 }).progress(i % 2 ? 0.5 : 0),
  );
  lenis.on('scroll', (e) => {
    const boost = 1 + Math.min(Math.abs(e.velocity) / 8, 5);
    tracks.forEach((tw) => gsap.to(tw, { timeScale: boost, duration: 0.3, overwrite: true }));
  });

  // Projects: stacked sticky cards that recede as the next one arrives
  const cards = gsap.utils.toArray('.project');
  cards.forEach((card, i) => {
    gsap.from(card, {
      y: 120,
      rotateX: -12,
      autoAlpha: 0,
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: { trigger: card, start: 'top 92%' },
    });
    const next = cards[i + 1];
    if (!next) return;
    gsap.to(card, {
      scale: 0.9,
      filter: 'brightness(0.45)',
      ease: 'none',
      scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 15%', scrub: true },
    });
  });

  // Approach: pinned timeline on desktop, simple reveals on mobile
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const steps = gsap.utils.toArray('.step');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '.approach', start: 'top top', end: '+=160%', scrub: 0.8, pin: true },
    });
    tl.fromTo('.steps__line span', { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: steps.length });
    steps.forEach((step, i) => {
      tl.fromTo(step, { autoAlpha: 0.15, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, i);
      tl.to(step.querySelector('.step__num'), { color: '#c8ff3e', borderColor: '#c8ff3e', duration: 0.3 }, i);
    });
  });
  mm.add('(max-width: 899px)', () => {
    gsap.utils.toArray('.step').forEach((step) => {
      gsap.from(step, { x: -30, autoAlpha: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: step, start: 'top 88%' } });
    });
  });

  // Service pipeline "flows" in
  gsap.from('.pipeline > *', {
    autoAlpha: 0,
    x: -20,
    stagger: 0.12,
    duration: 0.6,
    ease: 'power2.out',
    scrollTrigger: { trigger: '.pipeline', start: 'top 90%' },
  });

  // Footer reveal
  gsap.from('.footer__inner > *', {
    y: 30,
    autoAlpha: 0,
    stagger: 0.1,
    duration: 1,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.footer', start: 'top 95%' },
  });
}

// ---------------------------------------------------------------------------
// Micro-interactions
// ---------------------------------------------------------------------------
function setupInteractions() {
  // Spotlight that follows the pointer inside cards
  document.querySelectorAll('.glow-card, .project').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  if (!finePointer) return;

  // Magnetic buttons
  document.querySelectorAll('.magnetic').forEach((btn) => {
    const xTo = gsap.quickTo(btn, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(btn, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.35);
      yTo((e.clientY - r.top - r.height / 2) * 0.35);
    });
    btn.addEventListener('pointerleave', () => {
      xTo(0);
      yTo(0);
    });
  });

  // Custom cursor
  const cursor = document.querySelector('.cursor');
  document.body.classList.add('has-cursor');
  const cx = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3.out' });
  const cy = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3.out' });
  window.addEventListener('pointermove', (e) => {
    cx(e.clientX);
    cy(e.clientY);
  });
  document.querySelectorAll('a, button').forEach((el) => {
    el.addEventListener('pointerenter', () => cursor.classList.add('cursor--hover'));
    el.addEventListener('pointerleave', () => cursor.classList.remove('cursor--hover'));
  });
}

// ---------------------------------------------------------------------------
// Loader → intro
// ---------------------------------------------------------------------------
function runLoader() {
  const count = document.querySelector('.loader__count');
  const counter = { v: 0 };
  const tl = gsap.timeline({
    onComplete: () => {
      document.querySelector('.loader').remove();
      lenis.start();
      ScrollTrigger.refresh();
    },
  });
  tl.to(counter, {
    v: 100,
    duration: reduceMotion ? 0.2 : 1.4,
    ease: 'power2.inOut',
    onUpdate: () => (count.textContent = String(Math.round(counter.v)).padStart(3, '0')),
  })
    .to('.loader__bar span', { scaleX: 1, duration: reduceMotion ? 0.2 : 1.4, ease: 'power2.inOut' }, 0)
    .to('.loader__inner', { yPercent: -40, autoAlpha: 0, duration: 0.6, ease: 'power3.in' })
    .to('.loader', { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, '-=0.2')
    .add(heroIntro(), '-=0.5');
}

if (!reduceMotion) setupScrollAnimations();
setupNavHighlight();
setupSceneKeys();
setupInteractions();
document.fonts.ready.then(runLoader);
