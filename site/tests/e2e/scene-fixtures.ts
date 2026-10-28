import type { Page } from '@playwright/test';

declare global {
  interface Window { __jfTestWorker?: Worker }
}

export async function blockWorkerWebGL(page: Page) {
  await page.route(/\/scene\.worker[^/]*\.js/, async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    await route.fulfill({
      response,
      body: `const __jfGetContext = OffscreenCanvas.prototype.getContext;
OffscreenCanvas.prototype.getContext = function(type, ...args) {
  return type.includes('webgl') ? null : Reflect.apply(__jfGetContext, this, [type, ...args]);
};
${source}`,
    });
  });
}

export async function installWorkerContextLossControl(page: Page) {
  await page.addInitScript(() => {
    const OriginalWorker = window.Worker;
    window.Worker = new Proxy(OriginalWorker, {
      construct(target, args) {
        const worker = Reflect.construct(target, args);
        if (!(worker instanceof OriginalWorker)) throw new Error('Invalid test worker.');
        if (String(args[0]).includes('scene.worker')) window.__jfTestWorker = worker;
        return worker;
      },
    });
  });
  await page.route(/\/scene\.worker[^/]*\.js/, async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    await route.fulfill({
      response,
      body: `const __jfGetContext = OffscreenCanvas.prototype.getContext;
let __jfWebGL;
OffscreenCanvas.prototype.getContext = function(type, ...args) {
  const context = Reflect.apply(__jfGetContext, this, [type, ...args]);
  if (type === 'webgl2') __jfWebGL = context;
  return context;
};
self.addEventListener('message', (event) => {
  if (event.data.__test !== 'lose-context') return;
  const extension = __jfWebGL && __jfWebGL.getExtension('WEBGL_lose_context');
  if (!extension) throw new Error('Context-loss extension unavailable.');
  extension.loseContext();
  setTimeout(() => extension.restoreContext(), 700);
});
${source}`,
    });
  });
}
