#!/usr/bin/env node
// Writes assets/icons/<slug>-dark.svg and -light.svg: tiles in the skillicons.dev style for the
// techs that skillicons does not have. Logos come from Simple Icons (CC0), pinned below.
// Run once when the list changes (needs network); scripts/build.mjs then uses the files offline.
//
//   node scripts/icons.mjs

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = '16.37.0';
const CDN = `https://cdn.jsdelivr.net/npm/simple-icons@${VERSION}`;

// Simple Icons slugs used by the STACK list in scripts/build.mjs (as `si:<slug>`)
export const SLUGS = [
  'gsap', 'reactquery', 'reduxsaga', 'reacthookform', 'formik', 'zod', 'axios', 'lodash', 'antdesign',
  'handlebarsdotjs', 'postcss', 'googlebigquery', 'consul', 'circleci', 'eslint', 'prettier',
  'mixpanel', 'jira', 'asana', 'claude', 'cursor',
];

// skillicons.dev tile: 256 x 256, radius 60
const BG = { dark: '#242938', light: '#F4F2ED' };
const FALLBACK = { dark: '#ffffff', light: '#1f2328' };

const lum = (hex) => {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i + 1, i + 3), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const data = await (await fetch(`${CDN}/data/simple-icons.json`)).json();
const bySlug = new Map(data.map((d) => [d.slug ?? d.title.toLowerCase().replace(/[^a-z0-9]/g, ''), d]));

for (const slug of SLUGS) {
  const res = await fetch(`${CDN}/icons/${slug}.svg`);
  if (!res.ok) throw new Error(`${slug}: ${res.status}`);
  const svg = await res.text();
  const paths = [...svg.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
  const meta = bySlug.get(slug) ?? data.find((d) => d.title.toLowerCase().replace(/[^a-z0-9]/g, '') === slug);
  const brand = `#${meta?.hex ?? 'ffffff'}`;
  for (const theme of ['dark', 'light']) {
    // brand colour when it reads on the tile, otherwise white (dark) / ink (light)
    const fg = contrast(brand, BG[theme]) >= 2.5 ? brand : FALLBACK[theme];
    const out = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 256 256" fill="none">`
      + `<rect width="256" height="256" rx="60" fill="${BG[theme]}"/>`
      + `<g transform="translate(56 56) scale(6)" fill="${fg}">${paths.map((d) => `<path d="${d}"/>`).join('')}</g></svg>\n`;
    writeFileSync(join(ROOT, `assets/icons/${slug}-${theme}.svg`), out);
  }
  console.log(`${slug.padEnd(16)} ${brand}`);
}
