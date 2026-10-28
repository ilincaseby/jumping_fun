import EmblaCarousel from 'embla-carousel';
import { catalog, defaultProduct } from '../content/catalog';

const root = document.querySelector<HTMLElement>('[data-carousel]');
if (root) {
  const viewport = root.querySelector<HTMLElement>('.carousel-viewport');
  const previous = root.querySelector<HTMLButtonElement>('[data-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-next]');
  const count = root.querySelector<HTMLElement>('[data-count]');
  const announcement = root.querySelector<HTMLElement>('[data-announcement]');
  const controls = root.querySelector<HTMLElement>('.carousel-controls');
  if (!viewport || !previous || !next || !count || !announcement || !controls) {
    throw new Error('Structura catalogului este incompletă.');
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const transparent = matchMedia('(prefers-reduced-transparency: reduce)');
  const contrast = matchMedia('(prefers-contrast: more)');
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.model-picker [data-model]'));
  const defaultIndex = catalog.findIndex((product) => product.id === defaultProduct);
  const readHash = () => {
    const slug = location.hash.replace(/^#model-/, '');
    const found = catalog.findIndex((product) => product.id === slug);
    if (location.hash && found < 0) {
      const error = document.querySelector<HTMLElement>('[data-catalog-error]');
      if (error) {
        error.hidden = false;
        error.textContent = 'Modelul din link nu există. Poți alege unul dintre modelele de mai sus.';
      }
    }
    return found < 0 ? defaultIndex : found;
  };
  root.classList.add('is-enhanced');
  const embla = EmblaCarousel(viewport, {
    align: 'center',
    containScroll: false,
    loop: false,
    startIndex: readHash(),
    duration: reduced.matches ? 0 : 25,
    dragThreshold: 10,
    watchFocus: false,
  });
  const slides = embla.slideNodes();
  const cards = slides.map((slide) => slide.querySelector<HTMLElement>('.product-card'));
  const abort = new AbortController();
  let paintFrame = 0;
  const paint = () => {
    paintFrame = 0;
    const snaps = embla.scrollSnapList();
    const progress = embla.scrollProgress();
    for (let index = 0; index < cards.length; index++) {
      const card = cards[index];
      if (!card) continue;
      const distance = Math.min(1, Math.abs((snaps[index] ?? 0) - progress) * (snaps.length - 1));
      card.style.setProperty('--card-scale', String(reduced.matches ? 1 : 1 - distance * .1));
      card.style.setProperty('--card-opacity', String(1 - distance * .36));
      card.style.setProperty('--card-blur', `${reduced.matches || transparent.matches || contrast.matches ? 0 : distance * 2.4}px`);
    }
  };
  const schedulePaint = () => {
    if (!paintFrame) paintFrame = requestAnimationFrame(paint);
  };
  const select = () => {
    const selected = embla.selectedScrollSnap();
    const product = catalog[selected];
    if (!product) throw new Error('Index invalid în catalog.');
    previous.disabled = !embla.canScrollPrev();
    next.disabled = !embla.canScrollNext();
    count.textContent = `${selected + 1} / ${catalog.length}`;
    announcement.textContent = `${product.name}, modelul ${selected + 1} din ${catalog.length}.`;
    links.forEach((link) => {
      const active = link.dataset.model === product.id;
      link.classList.toggle('is-selected', active);
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    slides.forEach((slide, index) => {
      const active = selected === index;
      slide.classList.toggle('is-selected', active);
      slide.setAttribute('aria-hidden', String(!active));
      slide.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => { link.tabIndex = active ? 0 : -1; });
    });
    history.replaceState(null, '', `#model-${product.id}`);
    root.dataset.selected = product.id;
    schedulePaint();
  };
  const navigate = (index: number, immediate = false) => embla.scrollTo(index, immediate || reduced.matches);
  links.forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    const index = catalog.findIndex((product) => product.id === link.dataset.model);
    if (index >= 0) navigate(index, event.detail === 0);
  }, { signal: abort.signal }));
  previous.addEventListener('click', (event) => embla.scrollPrev(reduced.matches || event.detail === 0), { signal: abort.signal });
  next.addEventListener('click', (event) => embla.scrollNext(reduced.matches || event.detail === 0), { signal: abort.signal });
  viewport.addEventListener('keydown', (event) => {
    if (event.target !== viewport) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); embla.scrollNext(true); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); embla.scrollPrev(true); }
    if (event.key === 'Home') { event.preventDefault(); navigate(0, true); }
    if (event.key === 'End') { event.preventDefault(); navigate(catalog.length - 1, true); }
  }, { signal: abort.signal });
  slides.forEach((slide, index) => slide.addEventListener('click', (event) => {
    if (index === embla.selectedScrollSnap()) return;
    event.preventDefault();
    navigate(index);
  }, { signal: abort.signal }));
  window.addEventListener('hashchange', () => navigate(readHash(), true), { signal: abort.signal });
  reduced.addEventListener('change', () => {
    embla.reInit({ duration: reduced.matches ? 0 : 25 });
    select();
  }, { signal: abort.signal });
  transparent.addEventListener('change', schedulePaint, { signal: abort.signal });
  contrast.addEventListener('change', schedulePaint, { signal: abort.signal });
  embla.on('scroll', schedulePaint).on('select', select).on('reInit', select);
  controls.hidden = false;
  select();
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    abort.abort();
    cancelAnimationFrame(paintFrame);
    embla.destroy();
  }, { once: true });
}
