import type { SceneCommand, SceneController, SceneEvent, SceneMetrics, SceneSize } from './scene-protocol';

interface ControllerOptions {
  entrance: boolean;
  onState(state: 'ready' | 'lost' | 'restored'): void;
  onMetrics(metrics: SceneMetrics): void;
  onSettled(): void;
  onError(error: Error): void;
}

export function createSceneController(canvas: HTMLCanvasElement, options: ControllerOptions): Omit<SceneController, 'resize'> {
  const stage = canvas.parentElement;
  if (!stage) throw new Error('Containerul scenei lipsește.');
  if (typeof Worker === 'undefined' || typeof canvas.transferControlToOffscreen !== 'function') {
    throw new Error('Browserul nu acceptă randare 3D într-un worker.');
  }
  const size = (): SceneSize => {
    const bounds = stage.getBoundingClientRect();
    return { width: bounds.width, height: bounds.height, pixelRatio: Math.min(devicePixelRatio || 1, 1.5) };
  };
  let lastSize = size();
  if (!lastSize.width || !lastSize.height) throw new Error('Scena nu are dimensiuni vizibile.');
  const worker = new Worker(new URL('./scene.worker.ts', import.meta.url), { type: 'module', name: 'jumping-fun-3d' });
  let disposed = false;
  let running = false;
  const abort = new AbortController();
  const startupTimer = setTimeout(() => fail(new Error('Inițializarea 3D a depășit timpul disponibil.')), 15_000);
  const post = (message: SceneCommand) => { if (!disposed) worker.postMessage(message); };
  const resize = () => {
    const next = size();
    if (!next.width || !next.height || disposed) return;
    if (next.width === lastSize.width && next.height === lastSize.height && next.pixelRatio === lastSize.pixelRatio) return;
    lastSize = next;
    post({ type: 'resize', size: next });
  };
  const observer = new ResizeObserver(resize);
  function cleanup() {
    if (disposed) return;
    disposed = true;
    clearTimeout(startupTimer);
    observer.disconnect();
    abort.abort();
  }
  function fail(error: Error) {
    if (disposed) return;
    cleanup();
    worker.terminate();
    options.onError(error);
  }
  worker.addEventListener('message', (event: MessageEvent<SceneEvent>) => {
    if (disposed) return;
    const message = event.data;
    switch (message.type) {
      case 'state':
        if (message.state !== 'lost') clearTimeout(startupTimer);
        options.onState(message.state);
        break;
      case 'metrics': options.onMetrics(message.metrics); break;
      case 'settled': options.onSettled(); break;
      case 'error': fail(new Error(message.message)); break;
    }
  }, { signal: abort.signal });
  worker.addEventListener('error', (event) => {
    event.preventDefault();
    fail(new Error(event.message || 'Fișierul workerului 3D nu s-a putut încărca.'));
  }, { signal: abort.signal });
  worker.addEventListener('messageerror', () => fail(new Error('Mesajul scenei 3D nu s-a putut citi.')), { signal: abort.signal });
  try {
    const offscreen = canvas.transferControlToOffscreen();
    worker.postMessage({ type: 'init', canvas: offscreen, size: lastSize, entrance: options.entrance } satisfies SceneCommand, [offscreen]);
    observer.observe(stage);
    window.addEventListener('resize', resize, { signal: abort.signal });
  } catch (error) {
    cleanup();
    worker.terminate();
    throw error;
  }
  return {
    pause() {
      if (!running || disposed) return;
      running = false;
      post({ type: 'pause' });
    },
    resume() {
      if (running || disposed) return;
      running = true;
      resize();
      post({ type: 'resume' });
    },
    dispose() {
      if (disposed) return;
      post({ type: 'dispose' });
      cleanup();
      const terminateTimer = setTimeout(() => worker.terminate(), 250);
      worker.addEventListener('message', (event: MessageEvent<SceneEvent>) => {
        if (event.data.type === 'disposed') {
          clearTimeout(terminateTimer);
          worker.terminate();
        }
      }, { once: true });
    },
  };
}
