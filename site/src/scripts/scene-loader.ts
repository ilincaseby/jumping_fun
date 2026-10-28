import type { SceneController } from '../lib/three/scene';

function saveDataEnabled(): boolean {
  if (!('connection' in navigator) || !navigator.connection || typeof navigator.connection !== 'object') return false;
  return 'saveData' in navigator.connection && navigator.connection.saveData === true;
}

const host = document.querySelector<HTMLElement>('[data-slide-scene]');
if (host) {
  const canvas = host.querySelector<HTMLCanvasElement>('canvas');
  const status = host.querySelector<HTMLElement>('[data-scene-status]');
  const toggle = host.querySelector<HTMLButtonElement>('[data-scene-toggle]');
  const label = toggle?.querySelector('span');
  if (!canvas || !status || !toggle || !label) throw new Error('Structura scenei este incompletă.');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController();
  let controller: SceneController | undefined;
  let loading = false;
  let failed = false;
  let visible = false;
  let enabled = true;
  let disposed = false;
  const showPoster = (message: string) => {
    host.dataset.sceneState = 'poster';
    status.textContent = message;
  };
  const synchronize = () => {
    if (document.hidden || !visible || !enabled || reduced.matches) controller?.pause();
    else controller?.resume();
  };
  const load = async () => {
    if (loading || controller || failed || disposed || reduced.matches || saveDataEnabled()) return;
    loading = true;
    host.dataset.sceneState = 'loading';
    const started = performance.now();
    try {
      const { createScene } = await import('../lib/three/scene');
      if (disposed || reduced.matches || !enabled) {
        loading = false;
        host.dataset.sceneState = 'poster';
        return;
      }
      controller = createScene(canvas, {
        entrance: performance.now() - started < 1200 && visible && !document.hidden,
        onState(state) {
          if (state === 'lost') {
            host.dataset.sceneState = 'error';
            status.textContent = 'Versiunea 3D nu este disponibilă momentan. Imaginea și oferta rămân accesibile.';
          } else {
            host.dataset.sceneState = enabled && !reduced.matches ? 'ready' : 'poster';
            status.textContent = 'Concept 3D original, nu un model de închiriat.';
          }
        },
        onMetrics(metrics) {
          host.dataset.triangles = String(metrics.triangles);
          host.dataset.drawCalls = String(metrics.drawCalls);
          host.dataset.pixelRatio = String(metrics.pixelRatio);
        },
      });
      toggle.hidden = reduced.matches;
      synchronize();
    } catch (error) {
      failed = true;
      host.dataset.sceneState = 'error';
      status.textContent = 'Versiunea 3D nu s-a putut încărca. Poți folosi imaginea statică și toate paginile site-ului.';
      console.error('Scena 3D nu s-a putut inițializa.', error);
    } finally {
      loading = false;
    }
  };
  if (reduced.matches || saveDataEnabled()) {
    showPoster('Variantă statică pentru preferințele dispozitivului. Oferta rămâne accesibilă.');
  }
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) void load();
  }, { rootMargin: '180px' });
  observer.observe(host);
  const visibilityObserver = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    synchronize();
  });
  visibilityObserver.observe(host);
  toggle.setAttribute('aria-pressed', 'true');
  toggle.addEventListener('click', () => {
    enabled = !enabled;
    label.textContent = enabled ? 'Oprește interacțiunea 3D' : 'Pornește interacțiunea 3D';
    toggle.setAttribute('aria-pressed', String(enabled));
    host.dataset.sceneState = enabled && controller ? 'ready' : 'poster';
    synchronize();
  }, { signal: abort.signal });
  reduced.addEventListener('change', () => {
    toggle.hidden = reduced.matches || !controller;
    if (reduced.matches) showPoster('Mișcare redusă: imagine statică, fără cădere sau salt.');
    else if (!controller) void load();
    else host.dataset.sceneState = enabled ? 'ready' : 'poster';
    synchronize();
  }, { signal: abort.signal });
  document.addEventListener('visibilitychange', synchronize, { signal: abort.signal });
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) { controller?.pause(); return; }
    disposed = true;
    observer.disconnect();
    visibilityObserver.disconnect();
    abort.abort();
    controller?.dispose();
  }, { signal: abort.signal });
  window.addEventListener('pageshow', synchronize, { signal: abort.signal });
}
