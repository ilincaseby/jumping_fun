import { expect, test } from '@playwright/test';
import { blockWorkerWebGL } from './scene-fixtures';

test('homepage prioritizes the catalog without duplicating its model picker', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.model-picker')).toHaveCount(0);
  const cta = page.getByRole('link', { name: 'Vezi catalogul', exact: true });
  await expect(cta).toBeInViewport();
  await expect(page.getByRole('link', { name: 'Cere o ofertă', exact: true })).toBeVisible();
  await expect(cta).toHaveAttribute('href', '/tobogane/');
  const pulse = await cta.evaluate((node) => {
    const style = getComputedStyle(node, '::before');
    return { name: style.animationName, duration: style.animationDuration, iterations: style.animationIterationCount };
  });
  expect(pulse).toEqual({ name: 'catalog-invite', duration: '2s', iterations: '2' });
  await cta.focus();
  expect(await cta.evaluate((node) => getComputedStyle(node, '::before').animationPlayState)).toBe('paused');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/tobogane\/(?:#model-casa)?$/);
  await expect(page.locator('.model-picker [data-model]')).toHaveCount(7);
});

test('catalog attention cue is finite and respects reduced motion', async ({ page }) => {
  await page.goto('/');
  const cta = page.locator('.catalog-cta');
  await page.waitForTimeout(4800);
  expect(await cta.evaluate((node) => getComputedStyle(node, '::before').opacity)).toBe('0');
  await cta.hover();
  await page.mouse.move(0, 0);
  expect(await cta.evaluate((node) => node.getAnimations({ subtree: true })
    .filter((animation) => animation instanceof CSSAnimation && animation.animationName === 'catalog-invite').length)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await cta.evaluate((node) => getComputedStyle(node, '::before').animationName)).toBe('none');
  await expect(cta).toBeVisible();
  await expect(cta).toHaveCSS('color', 'rgb(18, 49, 75)');
});

test('public-facing routes have verified contacts and no demo copy while launch checks remain blocked', async ({ page }) => {
  for (const route of ['/', '/tobogane/', '/galerie/', '/galerie/2/', '/informatii/', '/oferta/', '/confidentialitate/', '/conditii-inchiriere/']) {
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex, nofollow');
    await expect(page.locator('a[href="tel:+40767850085"]').first()).toBeVisible();
    await expect(page.locator('a[href="https://wa.me/40767850085"]').first()).toBeVisible();
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(/demo|preview|contact@example\.com/i);
    await expect(page.locator('.sal-link')).toHaveAttribute('href', 'https://reclamatiisal.anpc.ro/');
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  }
});

test('compact routes have no horizontal overflow at all required widths', async ({ page }) => {
  // 308px also covers a 320px window with a persistent 12px scrollbar.
  for (const width of [1440, 768, 390, 320, 308]) {
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
      if (route === '/') {
        await expect(page.getByRole('link', { name: 'Vezi catalogul', exact: true })).toBeInViewport();
        await expect(page.getByRole('link', { name: 'Cere o ofertă', exact: true })).toBeVisible();
      }
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
  await expect(carousel).toHaveAttribute('data-selected', 'castel');
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

test('request validates fields and opens only a prefilled WhatsApp draft without sending', async ({ page }) => {
  const submissions: string[] = [];
  page.on('request', (request) => { if (request.method() === 'POST') submissions.push(request.url()); });
  await page.route('https://wa.me/**', (route) => route.fulfill({ status: 200, contentType: 'text/plain', body: 'External navigation intercepted; no real WhatsApp request.' }));
  await page.goto('/oferta/?model=casa');
  await expect(page.locator('#model')).toHaveValue('casa');
  await page.getByRole('button', { name: 'Continuă pe WhatsApp' }).click();
  await expect(page.locator('[data-error-summary]')).toBeVisible();
  await expect(page.locator('#date')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('#date').fill('2099-06-15');
  await page.locator('#locality').fill('București, sector 3');
  await page.locator('#details').fill('<img src=x onerror=alert(1)> Detalii pentru ofertă.');
  await page.locator('#children').fill('0');
  await page.getByRole('button', { name: 'Continuă pe WhatsApp' }).click();
  await expect(page.locator('#children-error')).toBeVisible();
  await page.locator('#children').fill('12');
  await page.getByRole('button', { name: 'Continuă pe WhatsApp' }).click();
  await page.waitForURL('https://wa.me/40767850085?**');
  const draft = new URL(page.url()).searchParams.get('text');
  expect(draft).toContain('Tobogan 2 în 1 Casă');
  expect(draft).toContain('Număr de copii: 12');
  expect(draft).toContain('<img src=x');
  expect(draft).not.toContain('example.com');
  expect(submissions).toEqual([]);
});

test('catalog dimensions and the new white-background XXXL image are visible', async ({ page }) => {
  await page.goto('/tobogane/#model-patrula');
  const card = page.locator('#model-patrula');
  await expect(card.getByRole('heading')).toHaveText('Patrula Cățelușilor Uriaș XXXL');
  await expect(card.locator('.product-specs')).toContainText('8,00 m');
  await expect(card.locator('.product-specs')).toContainText('5,00 m');
  await expect(card.locator('.product-specs')).toContainText('6,00 m');
  await expect(card.locator('.product-age')).toContainText('3–14 ani');
  await expect(card.locator('img')).toHaveAttribute('alt', /fundal alb/);
});

test('gallery and FAQ work with keyboard, including closing the dialog', async ({ page }) => {
  await page.goto('/galerie/');
  await page.locator('[data-gallery-image]').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('[data-gallery-image]')).toHaveCount(9);
  await page.getByRole('link', { name: 'Mai multe fotografii' }).click();
  await expect(page).toHaveURL(/\/galerie\/2\/$/);
  await expect(page.locator('[data-gallery-image]')).toHaveCount(9);
  await page.getByRole('link', { name: 'Mai multe fotografii' }).click();
  await expect(page).toHaveURL(/\/galerie\/3\/$/);
  await expect(page.locator('[data-gallery-image]')).toHaveCount(9);
  await expect(page.getByRole('link', { name: 'Mai multe fotografii' })).toHaveCount(0);
  await page.goto('/informatii/');
  await page.locator('summary').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('details').first()).toHaveAttribute('open', '');
});

test('without JavaScript all static content, models and navigation remain available', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Bucurie');
  await expect(page.locator('.scene-poster')).toBeVisible();
  await page.getByRole('link', { name: 'Vezi catalogul', exact: true }).click();
  await expect(page.locator('.product-slide')).toHaveCount(7);
  await page.getByRole('link', { name: 'Unicorn', exact: true }).click();
  await expect(page.locator('#model-unicorn h2')).toBeVisible();
  await context.close();
});

test('reduced motion and save-data keep the poster without downloading the scene', async ({ browser, baseURL }) => {
  for (const saveData of [false, true]) {
    const context = await browser.newContext({ reducedMotion: saveData ? 'no-preference' : 'reduce', baseURL });
    if (saveData) await context.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }));
    const page = await context.newPage();
    const sceneRequests: string[] = [];
    page.on('request', (r) => { if (/\/scene[.-][^/]+\.js/.test(r.url())) sceneRequests.push(r.url()); });
    await page.goto('/');
    await expect(page.locator('[data-slide-scene]')).toHaveAttribute('data-scene-state', 'poster');
    await expect(page.locator('.scene-poster')).toBeVisible();
    await page.waitForTimeout(500);
    expect(sceneRequests).toEqual([]);
    await context.close();
  }
});

test('WebGL failure displays an explicit static fallback without blocking the CTA', async ({ page }) => {
  await blockWorkerWebGL(page);
  await page.goto('/');
  await expect(page.locator('[data-slide-scene]')).toHaveAttribute('data-scene-state', 'error');
  await expect(page.locator('[data-scene-status]')).toContainText('nu s-a putut încărca');
  await expect(page.getByRole('link', { name: 'Cere o ofertă' })).toBeVisible();
});

test('scene is real geometry, settles, respects budgets, and is absent on other routes', async ({ page }) => {
  await page.goto('/');
  const scene = page.locator('[data-slide-scene]');
  await expect(scene).toHaveAttribute('data-scene-state', 'ready');
  await expect(scene).toHaveAttribute('data-renderer', 'worker');
  await expect(page.locator('canvas')).toHaveAttribute('data-settled', 'true', { timeout: 10_000 });
  expect(Number(await scene.getAttribute('data-triangles'))).toBeLessThanOrEqual(25000);
  expect(Number(await scene.getAttribute('data-draw-calls'))).toBeLessThanOrEqual(20);
  expect(Number(await scene.getAttribute('data-pixel-ratio'))).toBeLessThanOrEqual(1.5);
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('/galerie/');
  expect(requests.some((url) => /\/scene[.-][^/]+\.js/.test(url))).toBe(false);
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
