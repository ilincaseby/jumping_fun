import type { SceneController } from '../lib/three/scene-protocol';

function saveDataEnabled(): boolean {
  if (!('connection' in navigator) || !navigator.connection || typeof navigator.connection !== 'object') return false;
  return 'saveData' in navigator.connection && navigator.connection.saveData === true;
}

const host = document.querySelector<HTMLElement>('[data-slide-scene]');
if (host) {
  const canvas = host.querySelector<HTMLCanvasElement>('canvas');
  const poster = host.querySelector<HTMLImageElement>('.scene-poster');
  const status = host.querySelector<HTMLElement>('[data-scene-status]');
  if (!canvas || !poster || !status) throw new Error('Structura scenei este incompletă.');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController();
  let controller: Omit<SceneController, 'resize'> | undefined;
  let loading = false;
  let failed = false;
  let visible = false;
  let disposed = false;
  let rendererReady = false;
  const unavailableMessage = 'Versiunea 3D nu s-a putut încărca în acest browser. Imaginea statică și toate paginile rămân accesibile.';
  const showPoster = (message: string) => {
    host.dataset.sceneState = 'poster';
    status.textContent = message;
  };
  const showReady = () => {
    host.dataset.sceneState = 'ready';
    status.textContent = 'Concept 3D original, nu un model de închiriat.';
  };
  const synchronize = () => {
    if (document.hidden || !visible || reduced.matches) controller?.pause();
    else controller?.resume();
  };
  const showError = (error: unknown) => {
    if (disposed) return;
    failed = true;
    rendererReady = false;
    host.dataset.sceneState = 'error';
    status.textContent = unavailableMessage;
    console.error('Scena 3D nu s-a putut inițializa.', error);
  };
  const load = async () => {
    if (loading || controller || failed || disposed || reduced.matches || saveDataEnabled()) return;
    loading = true;
    host.dataset.sceneState = 'loading';
    try {
      try {
        await poster.decode();
      } catch (error) {
        console.warn('Posterul 3D nu s-a putut decoda; încercăm scena.', error);
        status.textContent = 'Imaginea statică nu s-a putut încărca. Se pregătește varianta 3D.';
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (disposed || reduced.matches) {
        host.dataset.sceneState = 'poster';
        return;
      }
      const { createSceneController } = await import('../lib/three/scene-controller');
      if (disposed || reduced.matches) return;
      controller = createSceneController(canvas, {
        entrance: visible && !document.hidden,
        onState(state) {
          if (state === 'lost') {
            rendererReady = false;
            host.dataset.sceneState = 'error';
            status.textContent = 'Versiunea 3D nu este disponibilă momentan. Imaginea și oferta rămân accesibile.';
          } else {
            rendererReady = true;
            if (reduced.matches) showPoster('Mișcare redusă: imagine statică, fără cădere sau salt.');
            else showReady();
          }
        },
        onMetrics(metrics) {
          host.dataset.triangles = String(metrics.triangles);
          host.dataset.drawCalls = String(metrics.drawCalls);
          host.dataset.pixelRatio = String(metrics.pixelRatio);
          host.dataset.renderCount = String(metrics.renderCount);
        },
        onSettled() { canvas.dataset.settled = 'true'; },
        onError: showError,
      });
      host.dataset.renderer = 'worker';
      synchronize();
    } catch (error) {
      showError(error);
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
  reduced.addEventListener('change', () => {
    if (reduced.matches) showPoster('Mișcare redusă: imagine statică, fără cădere sau salt.');
    else if (failed) {
      host.dataset.sceneState = 'error';
      status.textContent = unavailableMessage;
    }
    else if (!controller) void load();
    else if (rendererReady) showReady();
    else showPoster('Imagine statică. Varianta 3D nu este disponibilă momentan.');
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
