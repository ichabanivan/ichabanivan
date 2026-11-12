#!/usr/bin/env node
// Renders the profile banner and the auto-updated panel (light + dark SVGs) and refreshes the
// README block between <!-- PANEL:START --> and <!-- PANEL:END -->.
//
// Data: public GitHub repos (latest pushed).
// Text is outlined from scripts/glyphs.json (the CV site's fonts), so the SVGs render the same
// everywhere. No npm dependencies; needs Node 20+.
//
//   node scripts/render.mjs                 # live data
//   node scripts/render.mjs --fixture=x.json  # test data: { repos: [{ name, language, pushed }] }

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const USER = 'ichabanivan';
const SINCE = { year: 2016, month: 9 };
const ATLAS = JSON.parse(readFileSync(join(ROOT, 'scripts/glyphs.json'), 'utf8')).styles;

const THEMES = {
  dark: {
    bg: '#0b0b0c', surface: '#131315', surface2: '#1b1b1e', line: '#ffffff1a', line2: '#ffffff2e',
    text: '#ececee', muted: '#a1a1aa', accent: '#cd0d2e', accentText: '#ff4d67',
  },
  light: {
    bg: '#ffffff', surface: '#f6f8fa', surface2: '#e6eaef', line: '#d1d9e0', line2: '#c1c9d2',
    text: '#1f2328', muted: '#59636e', accent: '#cd0d2e', accentText: '#cd0d2e',
  },
};

const EASE = 'cubic-bezier(.16,1,.3,1)';
const CSS = [
  `.f{animation:f .8s ${EASE} backwards}`,
  `.u{animation:u .9s ${EASE} backwards}`,
  `.s{transform-box:fill-box;transform-origin:50% 100%;animation:s .6s ${EASE} backwards}`,
  `.x{transform-box:fill-box;transform-origin:0 50%;animation:x 1s ${EASE} backwards}`,
  `.a{stroke-dasharray:1;animation:a .9s ${EASE} .3s backwards}`,
  '@keyframes f{from{opacity:0;transform:translateY(8px)}}',
  '@keyframes u{from{transform:translateY(105%)}}',
  '@keyframes s{from{transform:scaleY(0)}}',
  '@keyframes x{from{transform:scaleX(0)}}',
  '@keyframes a{from{stroke-dashoffset:1}}',
  '@media (prefers-reduced-motion:reduce){*{animation:none!important}}',
].join('');

// ------------------------------------------------------------------ text
class Doc {
  used = new Map();

  /** Outlined text. Returns { svg, width }. tracking in em. */
  text(style, str, x, y, size, { fill, tracking = 0, anchor = 'start', cls, delay } = {}) {
    const { upem, glyphs, kern } = ATLAS[style];
    const k = size / upem;
    const track = tracking * upem;
    const chars = [...str];
    let pen = 0;
    const uses = [];
    chars.forEach((ch, i) => {
      const g = glyphs[ch] ?? glyphs['?'];
      if (g[1]) {
        const id = `${style[0]}${ch.codePointAt(0).toString(36)}`;
        this.used.set(id, g[1]);
        uses.push(`<use href="#${id}" x="${Math.round(pen)}"/>`);
      }
      pen += g[0] + (kern[ch + chars[i + 1]] ?? 0) + (i < chars.length - 1 ? track : 0);
    });
    const width = pen * k;
    const x0 = anchor === 'end' ? x - width : anchor === 'middle' ? x - width / 2 : x;
    const attrs = [cls && `class="${cls}"`, delay != null && `style="animation-delay:${delay}s"`]
      .filter(Boolean).join(' ');
    const inner = `<g fill="${fill}" transform="translate(${r(x0)} ${r(y)}) scale(${+k.toFixed(5)})">${uses.join('')}</g>`;
    return { svg: attrs ? `<g ${attrs}>${inner}</g>` : inner, width };
  }

  render(w, h, title, body) {
    const defs = [...this.used].map(([id, d]) => `<path id="${id}" d="${d}"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><style>${CSS}</style><defs>${defs}</defs>${body}</svg>\n`;
  }
}

const r = (n) => Math.round(n * 10) / 10;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// ------------------------------------------------------------------ banner
const ARC = 'M48 23v-4a8 8 0 0 0-8-8h-4a8 8 0 0 0-8 8v26a8 8 0 0 0 8 8h4a8 8 0 0 0 8-8v-4';

function monogram(x, y, size, c) {
  const k = size / 64;
  return `<g transform="translate(${x} ${y}) scale(${k})"><rect x=".5" y=".5" width="63" height="63" rx="15.5" fill="${c.surface}" stroke="${c.line2}"/><rect class="s" style="animation-delay:.05s" x="12" y="8" width="8" height="48" fill="${c.text}"/><path class="a" d="${ARC}" pathLength="1" fill="none" stroke="${c.accent}" stroke-width="8"/></g>`;
}

function banner(c) {
  const W = 1000, H = 220;
  const doc = new Doc();
  const name = doc.text('display', 'IVAN CHABAN', 172, 128, 104, { fill: c.text, tracking: 0.02 });
  const role = doc.text('semibold', 'SENIOR SOFTWARE ENGINEER · FIVERR', 174, 172, 22, { fill: c.accentText, tracking: 0.14 });
  const site = doc.text('medium', 'ichabanivan.github.io', 924, 172, 20, { fill: c.muted, anchor: 'end' });
  const body = [
    `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="24" fill="${c.bg}" stroke="${c.line}" stroke-width="2"/>`,
    monogram(48, 58, 100, c),
    `<clipPath id="n"><rect x="160" y="20" width="800" height="110"/></clipPath>`,
    `<g clip-path="url(#n)"><g class="u" style="animation-delay:.15s">${name.svg}</g></g>`,
    `<g class="f" style="animation-delay:.5s">${role.svg}${site.svg}`,
    `<path d="M934 170l11-11m-8 0h8v8" fill="none" stroke="${c.accentText}" stroke-width="2.4" stroke-linecap="round"/></g>`,
  ];
  return doc.render(W, H, 'Ivan Chaban, Senior Software Engineer at Fiverr', body.join(''));
}

// ------------------------------------------------------------------ panel
function yearsSince(now = new Date()) {
  const months = (now.getUTCFullYear() - SINCE.year) * 12 + (now.getUTCMonth() + 1 - SINCE.month);
  return Math.floor(months / 12);
}

const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
const monthYear = (iso) => { const d = new Date(iso); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

function panel(c, data) {
  const W = 1000, GAP = 14;
  const doc = new Doc();
  const out = [];
  let i = 0;
  const tile = (x, y, w, h) =>
    out.push(`<rect class="f" style="animation-delay:${(i++ * 0.07).toFixed(2)}s" x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" rx="18" fill="${c.surface}" stroke="${c.line}" stroke-width="2"/>`);
  const eyebrow = (s, x, y, o = {}) => doc.text('semibold', s, x, y, 15, { fill: c.muted, tracking: 0.14, ...o }).svg;

  // row 1: stats
  const tw = (W - GAP * 2) / 3;
  const stats = [
    ['IN THE INDUSTRY', `${data.years}+ YEARS`, 'Since September 2016'],
    ['NOW', 'FIVERR', 'Senior Software Engineer'],
    ['FOCUS', 'FRONT END', 'Architecture · design systems'],
  ];
  stats.forEach(([k, v, sub], n) => {
    const x = n * (tw + GAP);
    tile(x, 0, tw, 168);
    out.push(`<g class="f" style="animation-delay:${(0.1 + n * 0.07).toFixed(2)}s">`
      + eyebrow(k, x + 28, 46)
      + doc.text('display', v, x + 28, 116, 62, { fill: c.text, tracking: 0.02 }).svg
      + doc.text('regular', sub, x + 28, 146, 18, { fill: c.muted }).svg + '</g>');
  });

  const y2 = 168 + GAP;
  const H2 = 200;
  // latest public work
  tile(0, y2, W, H2);
  out.push(eyebrow('LATEST PUBLIC WORK', 28, y2 + 46));
  const cw = (W - 56) / 3;
  data.repos.forEach((repo, n) => {
    const x = 28 + n * cw;
    if (n) out.push(`<path d="M${r(x - 20)} ${y2 + 84}V${y2 + 172}" stroke="${c.line}" stroke-width="2"/>`);
    // shrink long repo names to fit their column
    const fit = Math.min(34, (34 * (cw - 44)) / doc.text('display', repo.name.toUpperCase(), 0, 0, 34).width);
    out.push(`<g class="f" style="animation-delay:${(0.25 + n * 0.08).toFixed(2)}s">`
      + doc.text('display', repo.name.toUpperCase(), x, y2 + 128, fit, { fill: c.text, tracking: 0.02 }).svg
      + doc.text('regular', [repo.language, monthYear(repo.pushed)].filter(Boolean).join(' · '), x, y2 + 162, 18, { fill: c.muted }).svg
      + '</g>');
  });
  const H = y2 + H2;
  return doc.render(W, H, alt(data), out.join(''));
}

function alt(data) {
  const parts = [`${data.years}+ years in the industry`, 'now Senior Software Engineer at Fiverr', 'focus: front-end architecture and design systems'];
  parts.push(`latest public work: ${data.repos.map((x) => x.name).join(', ')}`);
  const s = parts.join('; ');
  return s[0].toUpperCase() + s.slice(1) + '.';
}

// ------------------------------------------------------------------ data
async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers: { 'user-agent': 'profile-readme-renderer', ...headers } });
  if (!res.ok) {
    // Include a short, single-line body excerpt so failures are diagnosable.
    const body = (await res.text()).replace(/\s+/g, ' ').slice(0, 200);
    throw new Error(`${url} -> ${res.status} ${res.statusText} ${body}`);
  }
  return res.json();
}

async function load() {
  const fixture = process.argv.find((a) => a.startsWith('--fixture='));
  if (fixture) {
    const f = JSON.parse(readFileSync(fixture.split('=')[1], 'utf8'));
    return { years: yearsSince(), repos: f.repos };
  }
  const gh = process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
  const all = await getJson(`https://api.github.com/users/${USER}/repos?sort=pushed&per_page=30&type=owner`, gh);
  const repos = all
    .filter((x) => !x.fork && !x.archived && x.name !== USER)
    .slice(0, 3)
    .map((x) => ({ name: x.name, language: x.language, pushed: x.pushed_at }));

  return { years: yearsSince(), repos };
}

// ------------------------------------------------------------------ main
const data = await load();
for (const [theme, c] of Object.entries(THEMES)) {
  writeFileSync(join(ROOT, `assets/banner-${theme}.svg`), banner(c));
  writeFileSync(join(ROOT, `assets/panel-${theme}.svg`), panel(c, data));
}

const readmePath = join(ROOT, 'README.md');
const readme = readFileSync(readmePath, 'utf8');
const block = `<!-- PANEL:START -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/panel-dark.svg">
  <img src="assets/panel-light.svg" alt="${esc(alt(data))}" width="100%">
</picture>
<!-- PANEL:END -->`;
const next = readme.replace(/<!-- PANEL:START -->[\s\S]*?<!-- PANEL:END -->/, block);
if (next === readme && !readme.includes('<!-- PANEL:START -->')) throw new Error('PANEL markers missing in README.md');
writeFileSync(readmePath, next);
console.log(alt(data));
