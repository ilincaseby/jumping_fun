import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { installWorkerContextLossControl } from './scene-fixtures';

test('200 percent text scaling and browser visual zoom preserve access', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const route of ['/', '/tobogane/', '/oferta/']) {
    await page.goto(route);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), route).toBe(true);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ofertă', exact: true })).toBeVisible();
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  expect(await page.evaluate(() => visualViewport?.scale)).toBe(2);
  await page.getByRole('link', { name: 'Ofertă', exact: true }).focus();
  await expect(page.getByRole('link', { name: 'Ofertă', exact: true })).toBeFocused();
  await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
});

test('scene context loss, restoration, pausing and repeated route visits remain safe', async ({ page }) => {
  await installWorkerContextLossControl(page);
  await page.goto('/');
  const scene = page.locator('[data-slide-scene]');
  await expect(page.locator('[data-scene-toggle], .scene-controls')).toHaveCount(0);
  await expect(scene).toHaveAttribute('data-scene-state', 'ready');
  await expect(page.locator('canvas')).toHaveAttribute('data-settled', 'true');
  await page.evaluate(() => {
    if (!window.__jfTestWorker) throw new Error('The renderer did not create its worker.');
    window.__jfTestWorker.postMessage({ __test: 'lose-context' });
  });
  await expect(scene).toHaveAttribute('data-scene-state', 'error');
  await expect(page.locator('.scene-poster')).toHaveCSS('opacity', '1');
  await expect(scene).toHaveAttribute('data-scene-state', 'ready');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(scene).toHaveAttribute('data-scene-state', 'poster');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(scene).toHaveAttribute('data-scene-state', 'ready');
  await expect(page.locator('[data-scene-status]')).toHaveText('Concept 3D original, nu un model de închiriat.');
  await page.getByRole('link', { name: 'Catalog', exact: true }).click();
  await page.getByRole('link', { name: 'Acasă', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(scene).toHaveAttribute('data-scene-state', 'ready');
});

test('a failed dynamic scene chunk is explicit and the static page remains usable', async ({ page }) => {
  await page.route(/\/scene\.worker[^/]*\.js/, (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('[data-slide-scene]')).toHaveAttribute('data-scene-state', 'error');
  await expect(page.locator('.scene-poster')).toBeVisible();
  await page.getByRole('link', { name: 'Cere o ofertă' }).click();
  await expect(page.locator('h1')).toContainText('Hai să pregătim');
});

test('pointer movement cannot rotate or restart rendering after the landing', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  const scene = page.locator('[data-slide-scene]');
  await expect(canvas).toHaveAttribute('data-settled', 'true', { timeout: 15_000 });
  const before = await canvas.screenshot();
  const count = await scene.getAttribute('data-render-count');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Missing canvas bounds.');
  await page.mouse.move(bounds.x + bounds.width * .2, bounds.y + 100);
  await page.mouse.move(bounds.x + bounds.width * .8, bounds.y + 100, { steps: 12 });
  await page.waitForTimeout(300);
  expect(await scene.getAttribute('data-render-count')).toBe(count);
  expect(await canvas.screenshot()).toEqual(before);
});

test('unsupported offscreen rendering keeps the explicit static fallback', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(HTMLCanvasElement.prototype, 'transferControlToOffscreen', { value: undefined }));
  await page.goto('/');
  await expect(page.locator('[data-slide-scene]')).toHaveAttribute('data-scene-state', 'error');
  await expect(page.locator('.scene-poster')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cere o ofertă' })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('[data-slide-scene]')).toHaveAttribute('data-scene-state', 'error');
  await expect(page.locator('[data-scene-status]')).toContainText('nu s-a putut încărca');
});

test('changing motion preferences during worker startup never hides the poster prematurely', async ({ page }) => {
  await page.route(/\/scene\.worker[^/]*\.js/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue();
  });
  await page.goto('/');
  const scene = page.locator('[data-slide-scene]');
  await expect(scene).toHaveAttribute('data-renderer', 'worker');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.scene-poster')).toHaveCSS('opacity', '1');
  await expect(scene).not.toHaveAttribute('data-scene-state', 'ready');
  await expect(scene).toHaveAttribute('data-scene-state', 'ready', { timeout: 15_000 });
});

test('maximum accepted request text and absent optional values do not overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/oferta/');
  await page.locator('#date').fill('2099-12-10');
  const locality = 'București — sectorul 3, locație de eveniment cu acces separat; amplasarea exactă va fi confirmată împreună înainte de stabilirea ofertei.';
  const details = Array(12).fill('Avem nevoie să discutăm amplasarea, accesul și intervalul orar. Vă rugăm să confirmați detaliile înainte de închiriere.').join('\n').slice(0, 1500);
  await page.locator('#locality').fill(locality);
  await page.locator('#details').fill(details);
  await page.getByRole('button', { name: 'Previzualizează cererea' }).click();
  await expect(page.locator('[data-preview-panel]')).toBeVisible();
  await expect(page.locator('[data-preview-text]')).toContainText('un tobogan potrivit');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('capture the final static and interactive layouts at required widths', async ({ page }) => {
  const directory = path.resolve('../docs/previews/implementation');
  await mkdir(directory, { recursive: true });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [name, route] of [['home', '/'], ['catalog', '/tobogane/'], ['gallery', '/galerie/'], ['offer', '/oferta/']]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      if (route === '/') await expect(page.locator('canvas')).toHaveAttribute('data-settled', 'true');
      if (route === '/tobogane/') await expect(page.locator('[data-carousel]')).toHaveAttribute('data-selected', 'casa');
      await page.screenshot({ path: path.join(directory, `${name}-${width}.png`), fullPage: true });
    }
  }
});
