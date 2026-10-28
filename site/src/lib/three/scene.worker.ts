import { createScene } from './scene';
import type { SceneCommand, SceneController, SceneEvent, SceneSize } from './scene-protocol';

let controller: SceneController | undefined;
let initializing = false;
let running = false;
let disposed = false;
let latestSize: SceneSize | undefined;

const send = (message: SceneEvent) => self.postMessage(message);
const fail = (error: unknown) => {
  if (disposed) return;
  controller?.dispose();
  disposed = true;
  send({ type: 'error', message: error instanceof Error ? error.message : 'Randarea 3D a eșuat.' });
  self.close();
};

self.addEventListener('message', (event: MessageEvent<SceneCommand>) => {
  const message = event.data;
  if (disposed) return;
  switch (message.type) {
    case 'init':
      if (initializing || controller) { fail(new Error('Workerul 3D a fost inițializat de două ori.')); return; }
      initializing = true;
      latestSize = message.size;
      void createScene(message.canvas, {
        size: message.size,
        entrance: message.entrance,
        onState: (state) => send({ type: 'state', state }),
        onMetrics: (metrics) => send({ type: 'metrics', metrics }),
        onSettled: () => send({ type: 'settled' }),
        onError: fail,
      }).then((scene) => {
        initializing = false;
        if (disposed) { scene.dispose(); return; }
        controller = scene;
        if (latestSize) scene.resize(latestSize);
        if (running) scene.resume();
      }).catch(fail);
      break;
    case 'resize':
      latestSize = message.size;
      controller?.resize(message.size);
      break;
    case 'pause':
      running = false;
      controller?.pause();
      break;
    case 'resume':
      running = true;
      controller?.resume();
      break;
    case 'dispose':
      disposed = true;
      controller?.dispose();
      send({ type: 'disposed' });
      self.close();
      break;
  }
});
