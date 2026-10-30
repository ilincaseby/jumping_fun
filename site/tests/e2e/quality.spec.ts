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

test('static photo stays visible across motion preferences and repeated route visits', async ({ page }) => {
  await page.goto('/');
  const photo = page.locator('.scene-photo');
  await expect(photo).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(photo).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(photo).toBeVisible();
  await page.getByRole('link', { name: 'Catalog', exact: true }).click();
  await page.getByRole('link', { name: 'Acasă', exact: true }).click();
  await expect(photo).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('photo is transparent around the product and remains opaque inside it', async ({ page }) => {
  await page.goto('/');
  const alpha = await page.locator('.scene-photo').evaluate(async (node) => {
    const image = node as HTMLImageElement;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Cannot inspect image transparency.');
    context.drawImage(image, 0, 0);
    return [[0, 0], [0.95, 0.05], [0.05, 0.95], [0.95, 0.95], [0.5, 0.5], [0.5, 0.85]]
      .map(([x, y]) => context.getImageData(Math.floor(x * canvas.width), Math.floor(y * canvas.height), 1, 1).data[3]);
  });
  expect(alpha).toEqual([0, 0, 0, 0, 255, 255]);
});

test('photo does not move or animate over time or on pointer movement', async ({ page }) => {
  await page.goto('/');
  const photo = page.locator('.scene-photo');
  await photo.evaluate((node) => (node as HTMLImageElement).decode());
  const before = await photo.screenshot();
  const bounds = await photo.boundingBox();
  if (!bounds) throw new Error('Missing photo bounds.');
  await page.mouse.move(bounds.x + bounds.width * .2, bounds.y + 100);
  await page.mouse.move(bounds.x + bounds.width * .8, bounds.y + 100, { steps: 12 });
  await page.waitForTimeout(300);
  expect(await photo.screenshot()).toEqual(before);
  expect(await page.locator('.scene').evaluate((node) => node.getAnimations({ subtree: true }).length)).toBe(0);
});

test('photo and navigation do not depend on canvas or worker support', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => { throw new Error('Canvas unavailable'); };
    Object.defineProperty(window, 'Worker', { value: undefined });
  });
  await page.goto('/');
  await expect(page.locator('.scene-photo')).toBeVisible();
  await page.getByRole('link', { name: 'Cere o ofertă' }).click();
  await expect(page.locator('h1')).toContainText('Hai să pregătim');
});

test('maximum accepted request text and absent optional values do not overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/oferta/');
  await page.route('https://wa.me/**', (route) => route.fulfill({ status: 200, contentType: 'text/plain', body: 'Intercepted WhatsApp draft.' }));
  await page.locator('#date').fill('2099-12-10');
  const locality = 'București — sectorul 3, locație de eveniment cu acces separat; amplasarea exactă va fi confirmată împreună înainte de stabilirea ofertei.';
  const details = Array(12).fill('Avem nevoie să discutăm amplasarea, accesul și intervalul orar. Vă rugăm să confirmați detaliile înainte de închiriere.').join('\n').slice(0, 1500);
  await page.locator('#locality').fill(locality);
  await page.locator('#details').fill(details);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Continuă pe WhatsApp' }).click();
  await page.waitForURL('https://wa.me/40767850085?**');
  const draft = new URL(page.url()).searchParams.get('text');
  expect(draft).toContain('un tobogan potrivit');
  expect(draft).not.toContain('Număr de copii');
  expect(draft).toContain(details);
});

test('capture the final static and interactive layouts at required widths', async ({ page }) => {
  const directory = path.resolve('../docs/previews/implementation');
  await mkdir(directory, { recursive: true });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [name, route] of [['home', '/'], ['catalog', '/tobogane/'], ['gallery', '/galerie/'], ['offer', '/oferta/']]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      if (route === '/') await page.locator('.scene-photo').evaluate((node) => (node as HTMLImageElement).decode());
      if (route === '/tobogane/') await expect(page.locator('[data-carousel]')).toHaveAttribute('data-selected', 'casa');
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        window.scrollTo(0, 0);
      });
      await page.screenshot({ path: path.join(directory, `${name}-${width}.png`), fullPage: true });
    }
  }
});
