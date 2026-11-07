(() => {
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => RM.matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const IMG = '../images/';

/* progress + chapter dots */
const prog = $('#prog'), chaps = $$('[data-chap]'), nav = $('#chapnav');
chaps.forEach(c => { const a = document.createElement('a'); a.href = '#' + c.id; a.title = c.dataset.chap; a.setAttribute('aria-label', c.dataset.chap); nav.appendChild(a); });
const navLinks = $$('a', nav);
let ticking = false;
function onScroll() {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    const h = document.documentElement;
    prog.style.transform = `scaleX(${h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)})`;
    let cur = -1; chaps.forEach((c, i) => { if (c.getBoundingClientRect().top < innerHeight * .5) cur = i; });
    navLinks.forEach((a, i) => a.classList.toggle('on', i === cur));
    ticking = false;
  });
}
addEventListener('scroll', onScroll, { passive: true }); onScroll();

/* pack rip */
const landing = $('#landing'), pack = $('#pack'), burst = $$('.burst-cards img');
let ripped = false;
function rip() {
  if (ripped) return; ripped = true;
  landing.classList.add('ripped');
  burst.forEach((im, i) => {
    const [x, y, r] = im.dataset.t.split(',');
    im.style.transitionDelay = (reduced() ? 0 : .3 + i * .08) + 's';
    im.style.transform = `translate(${x},${y}) rotate(${r}) scale(.6)`;
  });
  $('#hintText').textContent = 'Scroll to begin';
  if (navigator.vibrate && !reduced()) try { navigator.vibrate(18); } catch (e) {}
}
$('#ripbtn').addEventListener('click', rip);
pack.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); rip(); } });
let start = null;
pack.addEventListener('pointerdown', e => { start = { x: e.clientX, y: e.clientY }; try { pack.setPointerCapture(e.pointerId); } catch (_) {} });
pack.addEventListener('pointermove', e => {
  const r = pack.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
  pack.style.setProperty('--hx', px * 100 + '%'); pack.style.setProperty('--hy', py * 100 + '%');
  if (!reduced() && !ripped) pack.style.transform = `rotateY(${(px - .5) * 24}deg) rotateX(${(.5 - py) * 18}deg)`;
  if (start && !ripped && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 50) rip();
});
pack.addEventListener('pointerup', e => { if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 10) rip(); start = null; });
pack.addEventListener('pointerleave', () => { if (!ripped) pack.style.transform = ''; });
if (location.hash && location.hash !== '#landing') rip();
addEventListener('scroll', () => { if (!ripped && scrollY > 40) rip(); }, { passive: true });

/* scrollytelling */
$$('.scrolly').forEach(sc => {
  const figs = $$('figure', sc), steps = $$('.step', sc);
  const show = k => figs.forEach(f => f.classList.toggle('on', f.dataset.k === k));
  show(steps[0].dataset.show);
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { steps.forEach(s => s.classList.toggle('on', s === en.target)); show(en.target.dataset.show); }
  }), { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(s => io.observe(s));
});
const tio = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) en.target.classList.add('on'); }), { rootMargin: '0px 0px -12% 0px' });
$$('#tl li').forEach(li => tio.observe(li));

/* card lab */
const CARDS = [
  { no: '#58', name: 'Jubilee', title: 'The Origin of Jubilee', f: 'cards-fx/hd/058.jpg', b: 'backs-fx/hd/058.jpg', s: 'sources-fx/hd/058.jpg',
    source: 'Uncanny X-Men #258 (1990), page 9, panel 1', art: 'Jim Lee / Scott Williams',
    story: 'First matched to the Uncanny X-Men #244 mall page, which was wrong. The real source is Jubilee mid-leap, lighting up the Hand\u2019s ninjas. Flair cropped out a ninja, added color and filled the sky with fireworks. Not flipped.',
    proof: 'The owner of the original art says this panel was used for the card.', link: 'https://www.comicartfans.com/GalleryPiece.asp?GSub=220797&Piece=1779355' },
  { no: '#44', name: 'Hobgoblin', title: 'Hobgoblin Appears', f: 'cards-fx/hd/044.jpg', b: 'backs-fx/hd/044.jpg', s: 'sources-fx/hd/044.jpg',
    source: 'Marvel\u2019s 1987 five-foot Hobgoblin store stand-up', art: 'Unknown',
    story: 'Not from a comic at all. The card crops a cardboard figure made to stand on a comic-shop floor.', proof: 'Matched to a photo of the stand-up from an eBay listing. No signature is visible.' },
  { no: '#85', name: 'Bishop', title: 'The Origin of Bishop', f: 'cards-fx/hd/085.jpg', b: 'backs-fx/hd/085.jpg', s: 'sources-fx/hd/085.jpg',
    source: 'Comic Images T-shirt MVS868 (1993)', art: 'Unknown',
    story: 'Labeled as his origin, but the art is merchandise: Flair kept the pose from a licensed T-shirt and repainted the background.', proof: 'Shirt text: \u201cBISHOP MVS868 \u00a9 1993 MARVEL, Produced by Comic Images.\u201d No signature.' },
  { no: '#93', name: 'Nightstalkers', title: 'The Origin of Nightstalkers', f: 'cards-fx/hd/093.jpg', b: 'backs-fx/hd/093.jpg', s: 'sources-fx/hd/093.jpg',
    source: 'Nightstalkers #1 (1992), bonus mini-poster', art: 'Andy Kubert / Adam Kubert',
    story: 'One of McGrew\u2019s biggest makeovers: blue and purple instead of the original colors, a burst of light behind the team, and no chain or fiery sky.' },
  { no: '#10', name: 'Xavier', title: 'Origin of The X-Men', f: 'cards-fx/hd/010.jpg', b: 'backs-fx/hd/010.jpg', s: 'sources-fx/hd/010.jpg',
    source: 'In-house sketches by Ron Lim', art: 'Ron Lim',
    story: 'Another non-comic source. Marvel kept reusing these sketches: X-Men playing cards (1994), a counter standee (1995) and magnets (1996).' },
  { no: '#57', name: 'The Wedding', title: 'The Wedding', f: 'cards-fx/hd/057.jpg', b: 'backs-fx/hd/057.jpg', s: 'sources-fx/hd/057.jpg',
    source: 'Spider-Man and Mary Jane wedding pin-up, probably first in Web of Spider-Man Annual #4 (1988)', art: 'John Romita Sr., inked by John Romita Jr.',
    story: 'Flair swapped the heart backdrop for a city. The art match is strong; the first appearance is likely but not verified.' },
  { no: '#78', name: 'Deadpool', title: 'Deadpool', f: 'cards-fx/hd/078.jpg', b: 'backs-fx/hd/078.jpg', s: 'sources-fx/hd/078.jpg',
    source: 'Deadpool: The Circle Chase #2, page 5', art: 'Joe Madureira',
    story: 'The crouch, swords, gun blast and rooftop line up, but the head, gun arm and an extra open hand differ: a loose repaint. The card back cites New Mutants #98, his first appearance, which is the story it refers to, not the art.' },
  { no: 'PB #14', name: 'Silver Surfer', title: 'Powerblast', f: 'powerblast-fx/hd/14.jpg', b: 'powerblast-backs-fx/hd/14.jpg', s: 'sources-fx/hd/pb14.jpg', mirror: true,
    source: 'Silver Surfer (Vol. 3) #31 (1989), cover, flipped horizontally', art: 'Not credited on the site',
    story: 'The card is the cover in mirror image. The slider flips the cover back so the two line up.' },
  { no: 'PB #5', name: 'Phoenix', title: 'Powerblast', f: 'powerblast-fx/hd/05.jpg', b: 'powerblast-backs-fx/hd/05.jpg', s: 'sources-fx/hd/pb05.jpg',
    source: 'Closest lead: Toy Biz Dark Phoenix Saga 4-pack box art (item 49050)', art: 'Unknown',
    story: 'Not confirmed. The limbs are close; the head, hair and collar aren\u2019t. FigureRealm dates the 4-pack to 1995, which may be after the cards.' }
];
const card = $('#card'), range = $('#baRange'), dossier = $('#dossier'), dots = $('#dots');
let idx = 0, flipped = false;
CARDS.forEach((c, i) => {
  const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', `${c.no} ${c.name}`);
  b.addEventListener('click', () => go(i, i > idx ? 1 : -1)); dots.appendChild(b);
});
function preload(i) { const c = CARDS[(i + CARDS.length) % CARDS.length]; [c.f, c.b, c.s].forEach(p => { new Image().src = IMG + p; }); }
function setCut(v) { card.style.setProperty('--cut', (100 - v) + '%'); card.style.setProperty('--hop', v > 0 ? 1 : 0); range.value = v; }
function render() {
  const c = CARDS[idx];
  $('#cFront').src = IMG + c.f; $('#cFront').alt = `${c.no} ${c.name}, front`;
  $('#cBack').src = IMG + c.b; $('#cBack').alt = `${c.no} ${c.name}, back`;
  const s = $('#cSrc'); s.src = IMG + c.s; s.alt = `Source: ${c.source}`; s.style.transform = c.mirror ? 'scaleX(-1)' : '';
  dossier.innerHTML = `<div class="no">${c.no} · ${idx + 1} of ${CARDS.length}</div><h3>${c.name}</h3><p>${c.story}</p>
    <dl><dt>Card</dt><dd>${c.title}</dd><dt>Source</dt><dd>${c.source}</dd><dt>Art</dt><dd>${c.art}</dd>${c.proof ? `<dt>Proof</dt><dd>${c.proof}${c.link ? ` <a href="${c.link}" rel="noopener" target="_blank">ComicArtFans ↗</a>` : ''}</dd>` : ''}</dl>`;
  $$('button', dots).forEach((b, i) => b.setAttribute('aria-selected', i === idx));
  card.setAttribute('aria-label', `${c.no} ${c.name}, ${flipped ? 'back' : 'front'}. Enter flips, arrow keys change card, S compares with the source.`);
  preload(idx + 1); preload(idx - 1);
}
function go(i, dir = 0) {
  idx = (i + CARDS.length) % CARDS.length; flipped = false; card.style.setProperty('--flip', '0deg'); setCut(0);
  if (!reduced() && dir && card.animate) card.animate([{ transform: `translateX(${dir * 60}px) rotate(${dir * 5}deg)`, opacity: .1 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.9,.2,1)' });
  render();
}
function flip() {
  flipped = !flipped; card.classList.add('flipping'); card.style.setProperty('--flip', flipped ? '180deg' : '0deg');
  setTimeout(() => card.classList.remove('flipping'), 720); if (flipped) setCut(0); render();
}
$('#flipBtn').addEventListener('click', flip);
$('#prevBtn').addEventListener('click', () => go(idx - 1, -1));
$('#nextBtn').addEventListener('click', () => go(idx + 1, 1));
range.addEventListener('input', () => { if (flipped) flip(); setCut(+range.value); });
card.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') { go(idx + 1, 1); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { go(idx - 1, -1); e.preventDefault(); }
  else if (e.key === 'Enter' || e.key === ' ' || e.key === 'f' || e.key === 'F') { flip(); e.preventDefault(); }
  else if (e.key === 's' || e.key === 'S') { if (flipped) flip(); setCut(+range.value > 50 ? 0 : 100); e.preventDefault(); }
});
function tilt(px, py) {
  if (reduced()) return;
  card.style.setProperty('--ry', ((px - .5) * 26) + 'deg'); card.style.setProperty('--rx', ((.5 - py) * 22) + 'deg');
  card.style.setProperty('--mx', px * 100 + '%'); card.style.setProperty('--my', py * 100 + '%');
}
let drag = null;
card.addEventListener('pointerdown', e => {
  const r = card.getBoundingClientRect(), v = +range.value;
  drag = { x: e.clientX, y: e.clientY, t: performance.now(), wipe: v > 0 && Math.abs((e.clientX - r.left) / r.width - (1 - v / 100)) < .1 };
});
card.addEventListener('pointermove', e => {
  const r = card.getBoundingClientRect();
  const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
  if (drag && drag.wipe) { setCut(Math.round((1 - px) * 100)); return; }
  tilt(px, py);
});
card.addEventListener('pointerup', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.wipe) {
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) go(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    else if (Math.hypot(dx, dy) < 8 && performance.now() - drag.t < 450) flip();
  }
  drag = null;
});
card.addEventListener('pointerleave', () => { drag = null; tilt(.5, .5); });
const gyroBtn = $('#gyroBtn');
function onOrient(e) { if (e.gamma == null) return; tilt(Math.min(1, Math.max(0, .5 + e.gamma / 50)), Math.min(1, Math.max(0, .5 + (e.beta - 45) / 60))); }
if ('DeviceOrientationEvent' in window && matchMedia('(pointer:coarse)').matches) {
  gyroBtn.hidden = false;
  gyroBtn.addEventListener('click', async () => {
    const on = gyroBtn.getAttribute('aria-pressed') !== 'true';
    if (on && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try { if (await DeviceOrientationEvent.requestPermission() !== 'granted') return; } catch (_) { return; }
    }
    gyroBtn.setAttribute('aria-pressed', on);
    if (on) addEventListener('deviceorientation', onOrient); else { removeEventListener('deviceorientation', onOrient); tilt(.5, .5); }
  });
}
render();

/* spread */
const SPREAD = ['001','003','005','010','014','021','025','031','032','037','044','057','058','061','075','078','085','091','093','100','120','150'];
const spread = $('#spread');
const scs = SPREAD.map((n, i) => {
  const a = document.createElement('a'); a.className = 'sc'; a.href = '../'; a.setAttribute('aria-label', `Card #${+n}, open the checklist`); a.draggable = false;
  a.innerHTML = `<img src="${IMG}cards-fx/hd/${n}.jpg" alt="" loading="lazy" draggable="false">`; a.style.zIndex = i; spread.appendChild(a); return a;
});
const pos = scs.map(() => ({ x: 0, y: 0, r: 0 }));
const place = i => { const p = pos[i]; scs[i].style.transform = `translate(${p.x}px,${p.y}px) rotate(${p.r}deg)`; };
function layout(mode) {
  const W = spread.clientWidth, H = spread.clientHeight, n = scs.length;
  scs.forEach((el, i) => {
    if (mode === 'stack') pos[i] = { x: i * .6 - 6, y: -i * .8 + 8, r: (i % 5 - 2) * 1.5 };
    else if (mode === 'fan') { const t = i / (n - 1) - .5; pos[i] = { x: t * Math.min(W * .8, 900), y: Math.abs(t) * 120 - 30, r: t * 60 }; }
    else pos[i] = { x: (Math.random() - .5) * W * .75, y: (Math.random() - .5) * H * .6, r: (Math.random() - .5) * 50 };
    el.style.transitionDelay = reduced() ? '0s' : (i * .018) + 's'; place(i);
  });
}
layout('stack');
$('#scatterBtn').addEventListener('click', () => layout('scatter'));
$('#fanBtn').addEventListener('click', () => layout('fan'));
$('#stackBtn').addEventListener('click', () => layout('stack'));
let topZ = scs.length, sd = null;
scs.forEach((el, i) => {
  el.addEventListener('pointerdown', e => { sd = { i, x: e.clientX, y: e.clientY, ox: pos[i].x, oy: pos[i].y, moved: false }; try { el.setPointerCapture(e.pointerId); } catch (_) {} el.style.zIndex = ++topZ; el.classList.add('dragging'); });
  el.addEventListener('pointermove', e => { if (!sd || sd.i !== i) return; const dx = e.clientX - sd.x, dy = e.clientY - sd.y; if (Math.hypot(dx, dy) > 6) sd.moved = true; pos[i].x = sd.ox + dx; pos[i].y = sd.oy + dy; pos[i].r = dx / 20; place(i); });
  el.addEventListener('pointerup', () => el.classList.remove('dragging'));
  el.addEventListener('click', e => { if (sd && sd.moved) e.preventDefault(); sd = null; });
});
const sio = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { layout('scatter'); sio.disconnect(); } }), { threshold: .4 });
sio.observe(spread);
})();
