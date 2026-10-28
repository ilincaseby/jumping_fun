import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

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
  await page.goto('/');
  const scene = page.locator('[data-slide-scene]');
  await expect(scene).toHaveAttribute('data-scene-state', 'ready');
  await expect(page.locator('canvas')).toHaveAttribute('data-settled', 'true');
  const canLoseContext = await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
    const extension = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');
    if (!extension) return false;
    extension.loseContext();
    setTimeout(() => extension.restoreContext(), 700);
    return true;
  });
  expect(canLoseContext).toBe(true);
  await expect(scene).toHaveAttribute('data-scene-state', 'error');
  await expect(page.locator('.scene-poster')).toHaveCSS('opacity', '1');
  await expect(scene).toHaveAttribute('data-scene-state', 'ready');
  await page.getByRole('button', { name: 'Oprește interacțiunea 3D' }).click();
  await expect(scene).toHaveAttribute('data-scene-state', 'poster');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Pornește interacțiunea 3D' }).click();
  await expect(scene).toHaveAttribute('data-scene-state', 'ready');
  await page.getByRole('link', { name: 'Catalog', exact: true }).click();
  await page.getByRole('link', { name: 'Acasă', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(scene).toHaveAttribute('data-scene-state', 'ready');
});

test('a failed dynamic scene chunk is explicit and the static page remains usable', async ({ page }) => {
  await page.route(/\/scene\.[^/]+\.js/, (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('[data-slide-scene]')).toHaveAttribute('data-scene-state', 'error');
  await expect(page.locator('.scene-poster')).toBeVisible();
  await page.getByRole('link', { name: 'Cere o ofertă' }).click();
  await expect(page.locator('h1')).toContainText('Hai să pregătim');
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
