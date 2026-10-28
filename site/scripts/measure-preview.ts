import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

interface BrowserMeasurements {
  lcp: number;
  cls: number;
  longTasks: number[];
}
declare global {
  interface Window { __jfMeasurements: BrowserMeasurements }
}

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.addInitScript(() => {
      window.__jfMeasurements = { lcp: 0, cls: 0, longTasks: [] };
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__jfMeasurements.lcp = entry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ('value' in entry && typeof entry.value === 'number' && 'hadRecentInput' in entry && !entry.hadRecentInput) {
            window.__jfMeasurements.cls += entry.value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__jfMeasurements.longTasks.push(entry.duration);
      }).observe({ type: 'longtask', buffered: true });
    });
    await page.goto(process.argv[2] ?? 'http://127.0.0.1:4327/');
    const intervals = await page.evaluate(async () => {
      const points: number[] = [];
      for (let index = 0; index < 61; index++) {
        points.push(await new Promise<number>((resolve) => requestAnimationFrame(resolve)));
      }
      return points.slice(1).map((time, index) => time - points[index]);
    });
    await page.locator('canvas[data-settled="true"]').waitFor({ timeout: 15_000 });
    await page.waitForTimeout(1200);
    const result = await page.evaluate(() => {
      const samples = window.__jfMeasurements;
      const scene = document.querySelector<HTMLElement>('[data-slide-scene]');
      return {
        viewport: { width: innerWidth, height: innerHeight },
        lcpMs: Math.round(samples.lcp),
        cls: Number(samples.cls.toFixed(5)),
        longTaskCount: samples.longTasks.length,
        longTaskTotalMs: Math.round(samples.longTasks.reduce((sum, duration) => sum + duration, 0)),
        pageHeight: document.documentElement.scrollHeight,
        triangles: Number(scene?.dataset.triangles),
        drawCalls: Number(scene?.dataset.drawCalls),
        dpr: Number(scene?.dataset.pixelRatio),
        resourceTransferBytes: performance.getEntriesByType('resource').reduce((sum, entry) =>
          sum + ('transferSize' in entry && typeof entry.transferSize === 'number' ? entry.transferSize : 0), 0),
      };
    });
    if (pageErrors.length) throw new Error(`Browser measurement errors: ${pageErrors.join('; ')}`);
    if (intervals.length !== 60) throw new Error('Insufficient animation-frame samples.');
    intervals.sort((a, b) => a - b);
    results.push({
      ...result,
      sampledFrameP95Ms: Number(intervals[Math.floor(intervals.length * .95)].toFixed(2)),
      frameSampleCount: intervals.length,
      frameSampleWindow: '60 intervals immediately after the page load event; includes animation and idle time, not a pure GPU benchmark.',
    });
    await context.close();
  }
} finally {
  await browser.close();
}
const directory = fileURLToPath(new URL('../dist/_astro/', import.meta.url));
const bundles = [];
for (const name of (await readdir(directory)).filter((name) => name.endsWith('.js'))) {
  const content = await readFile(`${directory}/${name}`);
  bundles.push({ file: name, bytes: content.length, gzipBytes: gzipSync(content).length });
}
const report = {
  measuredAt: new Date().toISOString(),
  conditions: {
    platform: process.platform,
    node: process.version,
    browser: 'Playwright Chromium, headless, ANGLE SwiftShader software WebGL',
    network: 'localhost, fresh browser contexts, no network/CPU throttling',
    limitations: 'Single local samples, not Lighthouse scores or real mobile hardware. Preview may transfer JS without compression; gzip sizes are calculated separately.',
  },
  results,
  bundles,
};
await writeFile(fileURLToPath(new URL('../../docs/performance.json', import.meta.url)), `${JSON.stringify(report, null, 2)}\n`);
console.info(JSON.stringify(report, null, 2));
