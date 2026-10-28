import { expect, test } from '@playwright/test';

test('demo routes remain readable, noindex and free of active contact destinations', async ({ page }) => {
  for (const route of ['/', '/tobogane/', '/galerie/', '/informatii/', '/oferta/', '/confidentialitate/']) {
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex, nofollow');
    await expect(page.locator('a[href^="tel:"], a[href^="mailto:"], a[href*="wa.me"]')).toHaveCount(0);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  }
});

test('compact routes have no horizontal overflow at all required widths', async ({ page }) => {
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/', '/tobogane/', '/galerie/', '/informatii/', '/oferta/']) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      const bounds = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
        height: document.documentElement.scrollHeight,
      }));
      expect(bounds.document, `${route} at ${width}px`).toBeLessThanOrEqual(bounds.viewport + 1);
      if (width === 390 && ['/', '/tobogane/'].includes(route)) expect(bounds.height).toBeLessThanOrEqual(1300);
    }
  }
});

test('catalog selection, arrows, keyboard and drag reveal the correct model', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tobogane/#model-casa');
  const carousel = page.locator('[data-carousel]');
  await expect(carousel).toHaveAttribute('data-selected', 'casa');
  await page.getByRole('link', { name: 'Unicorn', exact: true }).click();
  await expect(carousel).toHaveAttribute('data-selected', 'unicorn');
  await page.getByRole('button', { name: 'Modelul următor' }).click();
  await expect(carousel).toHaveAttribute('data-selected', 'tren');
  const viewport = page.locator('.carousel-viewport');
  await viewport.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(carousel).toHaveAttribute('data-selected', 'unicorn');
  const bounds = await viewport.boundingBox();
  if (!bounds) throw new Error('Carousel has no bounds');
  await page.mouse.move(bounds.x + bounds.width * .8, bounds.y + 110);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .15, bounds.y + 110, { steps: 14 });
  await page.mouse.up();
  await expect(carousel).not.toHaveAttribute('data-selected', 'unicorn');
  await page.getByRole('link', { name: 'Mini-Monstru', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Modelul următor' })).toBeDisabled();
});

test('request errors are visible and valid input produces only a local preview', async ({ page }) => {
  const submissions: string[] = [];
  page.on('request', (request) => { if (request.method() === 'POST') submissions.push(request.url()); });
  await page.goto('/oferta/?model=casa');
  await expect(page.locator('#model')).toHaveValue('casa');
  await page.getByRole('button', { name: 'Previzualizează cererea' }).click();
  await expect(page.locator('[data-error-summary]')).toBeVisible();
  await expect(page.locator('#date')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('#date').fill('2099-06-15');
  await page.locator('#locality').fill('București, sector 3');
  await page.locator('#details').fill('<img src=x onerror=alert(1)> Detalii pentru ofertă.');
  await page.getByRole('button', { name: 'Previzualizează cererea' }).click();
  await expect(page.getByRole('heading', { name: 'Mesaj pregătit. Nu trimis.' })).toBeVisible();
  await expect(page.locator('[data-preview-text]')).toContainText('2 în 1 Casă');
  await expect(page.locator('[data-preview-text]')).toContainText('<img src=x');
  await expect(page.locator('[data-preview-text] img')).toHaveCount(0);
  expect(submissions).toEqual([]);
  await page.getByRole('button', { name: 'Modifică detaliile' }).click();
  await expect(page.locator('#model')).toBeFocused();
});

test('gallery and FAQ work with keyboard, including closing the dialog', async ({ page }) => {
  await page.goto('/galerie/');
  await page.locator('[data-gallery-image]').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto('/informatii/');
  await page.locator('summary').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('details').first()).toHaveAttribute('open', '');
});

test('without JavaScript all static content, models and navigation remain available', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4322/');
  await expect(page.locator('h1')).toContainText('Bucurie');
  await expect(page.locator('.scene-poster')).toBeVisible();
  await page.getByRole('link', { name: 'Catalog', exact: true }).click();
  await expect(page.locator('.product-slide')).toHaveCount(7);
  await page.getByRole('link', { name: 'Unicorn', exact: true }).click();
  await expect(page.locator('#model-unicorn h2')).toBeVisible();
  await context.close();
});

test('reduced motion and save-data keep the poster without downloading the scene', async ({ browser }) => {
  for (const saveData of [false, true]) {
    const context = await browser.newContext({ reducedMotion: saveData ? 'no-preference' : 'reduce' });
    if (saveData) await context.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }));
    const page = await context.newPage();
    const sceneRequests: string[] = [];
    page.on('request', (r) => { if (/\/scene\.[^/]+\.js/.test(r.url())) sceneRequests.push(r.url()); });
    await page.goto('http://127.0.0.1:4322/');
    await expect(page.locator('[data-slide-scene]')).toHaveAttribute('data-scene-state', 'poster');
    await expect(page.locator('.scene-poster')).toBeVisible();
    await page.waitForTimeout(500);
    expect(sceneRequests).toEqual([]);
    await context.close();
  }
});

test('WebGL failure displays an explicit static fallback without blocking the CTA', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
        return type.includes('webgl') ? null : Reflect.apply(original, this, [type, ...args]);
      },
    });
  });
  await page.goto('/');
  await expect(page.locator('[data-slide-scene]')).toHaveAttribute('data-scene-state', 'error');
  await expect(page.locator('[data-scene-status]')).toContainText('nu s-a putut încărca');
  await expect(page.getByRole('link', { name: 'Cere o ofertă' })).toBeVisible();
});

test('scene is real geometry, settles, respects budgets, and is absent on other routes', async ({ page }) => {
  await page.goto('/');
  const scene = page.locator('[data-slide-scene]');
  await expect(scene).toHaveAttribute('data-scene-state', 'ready');
  await expect(page.locator('canvas')).toHaveAttribute('data-settled', 'true', { timeout: 10_000 });
  expect(Number(await scene.getAttribute('data-triangles'))).toBeLessThanOrEqual(25000);
  expect(Number(await scene.getAttribute('data-draw-calls'))).toBeLessThanOrEqual(20);
  expect(Number(await scene.getAttribute('data-pixel-ratio'))).toBeLessThanOrEqual(1.5);
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('/galerie/');
  expect(requests.some((url) => /\/scene\.[^/]+\.js/.test(url))).toBe(false);
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('missing photos surface a message and unknown products are not silently accepted', async ({ page }) => {
  await page.route(/\/_astro\/.*\.webp/, (route) => route.abort());
  await page.goto('/tobogane/#model-does-not-exist');
  await expect(page.locator('[data-catalog-error]')).toBeVisible();
  await expect(page.locator('.is-selected .media-error')).toBeVisible();
  await page.goto('/oferta/?model=does-not-exist');
  await expect(page.locator('[data-error-summary]')).toContainText('nu există');
});
