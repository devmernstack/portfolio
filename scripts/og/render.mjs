// Renders the share image and app icons into public/.
// Usage: node scripts/og/render.mjs  (needs Playwright + Chromium available)
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../public');

const browser = await chromium.launch();
const page = await browser.newPage();

async function shot(file, width, height, target, opts = {}) {
  await page.setViewportSize({ width, height });
  await page.goto('file://' + path.join(here, file));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(out, target), omitBackground: opts.transparent ?? false });
}

await shot('og-image.html', 1200, 630, 'og-image.png');
await page.setViewportSize({ width: 512, height: 512 });
for (const [size, name] of [[512, 'icon-512.png'], [192, 'icon-192.png'], [180, 'apple-touch-icon.png']]) {
  await page.setViewportSize({ width: size, height: size });
  await page.goto('file://' + path.join(here, 'icon.html'));
  await page.evaluate((s) => { document.body.style.zoom = s / 512; }, size);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(out, name), omitBackground: true });
}

await browser.close();
