import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('../src/assets/scene/slide-poster.png', import.meta.url));
await mkdir(fileURLToPath(new URL('../src/assets/scene/', import.meta.url)), { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1.5 });
  await page.goto(process.argv[2] ?? 'http://127.0.0.1:4327/');
  await page.locator('canvas[data-settled="true"]').waitFor({ timeout: 15_000 });
  await page.addStyleTag({ content: 'html,body{background:transparent!important}.scene-stage::before{display:none!important}.scene-stage{width:600px!important;height:500px!important;aspect-ratio:auto!important}' });
  await page.waitForTimeout(150);
  await page.locator('.scene-canvas').screenshot({ path: output, omitBackground: true });
  console.info(`Poster rendered from the actual procedural model: ${output}`);
} finally {
  await browser.close();
}
