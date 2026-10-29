/**
 * Renders extension icons and Chrome Web Store artwork from assets/store/icon.svg.
 * Uses Playwright with the locally installed Edge (or Chrome) — no browser download.
 *
 *   node scripts/render-store-assets.mjs [--channel=chrome]
 *
 * Outputs:
 *   public/icon/{16,32,48,96,128}.png   toolbar/extension icons (full bleed)
 *   store-assets/store-icon-128.png     store icon: 96px art + 16px transparent padding
 *   store-assets/promo-small-440x280.png
 */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'assets', 'store', 'icon.svg'), 'utf8');
const iconDir = join(root, 'public', 'icon');
const storeDir = join(root, 'store-assets');
mkdirSync(iconDir, { recursive: true });
mkdirSync(storeDir, { recursive: true });

const channel =
  process.argv.find((a) => a.startsWith('--channel='))?.split('=')[1] ?? 'msedge';
const browser = await chromium.launch({ channel });
const page = await browser.newPage();

async function render(html, width, height, path, omitBackground = true) {
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<!doctype html><html><body style="margin:0">${html}</body></html>`,
  );
  await page.screenshot({ path, omitBackground, clip: { x: 0, y: 0, width, height } });
  console.log('wrote', path);
}

const sized = (px) => svg.replace('<svg ', `<svg width="${px}" height="${px}" style="display:block" `);

for (const size of [16, 32, 48, 96, 128]) {
  await render(sized(size), size, size, join(iconDir, `${size}.png`));
}

await render(
  `<div style="padding:16px">${sized(96)}</div>`,
  128,
  128,
  join(storeDir, 'store-icon-128.png'),
);

await render(
  `<div style="width:440px;height:280px;box-sizing:border-box;padding:36px;
      background:linear-gradient(135deg,#0f766e,#134e4a);color:#fff;
      font-family:'Segoe UI',system-ui,sans-serif;display:flex;flex-direction:column;justify-content:center;gap:18px">
    <div style="display:flex;align-items:center;gap:16px">
      ${sized(72)}
      <div style="font-size:34px;font-weight:700;letter-spacing:-0.5px">ProposalPilot</div>
    </div>
    <div style="font-size:21px;line-height:1.35;opacity:.95">
      Tailored freelance proposals from the job post you're reading.
    </div>
    <div style="font-size:15px;opacity:.75">You review, edit and send. Nothing is auto-submitted.</div>
  </div>`,
  440,
  280,
  join(storeDir, 'promo-small-440x280.png'),
  false,
);

await browser.close();
