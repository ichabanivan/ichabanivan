#!/usr/bin/env node
// Builds the profile graphics and the tech-stack block of README.md. No npm dependencies.
//   assets/header-dark.svg, assets/header-light.svg  animated banner (brand kit, GitHub concept + glass pane)
//   README.md between <!-- STACK:START --> and <!-- STACK:END -->  icon rows, each icon links to the official site
// Text is outlined from scripts/glyphs.json, because an SVG shown through <img> cannot load fonts.
//
//   node scripts/build.mjs

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ATLAS = JSON.parse(readFileSync(join(ROOT, 'scripts/glyphs.json'), 'utf8')).styles;
const r = (n) => Math.round(n * 100) / 100;

// ------------------------------------------------------------------ header
// Brand kit, GitHub concept (Mix): white stem (the I), Bebas name, giant C bleeding off the right edge.
// Dark: ink field, red C. Light: red field, ink C. Type is always white.
// Between the text and the C a frosted glass pane with a </> mark drifts back and forth.
const THEMES = {
  dark: { field: '#0b0b0c', arc: '#cd0d2e', type: '#ffffff', glass: 0.06, edgeHi: 0.4, edgeLo: 0.06 },
  light: { field: '#cd0d2e', arc: '#0b0b0c', type: '#ffffff', glass: 0.14, edgeHi: 0.6, edgeLo: 0.12 },
};
const W = 1280, H = 320;
const ARC = 'M48 23v-4a8 8 0 0 0-8-8h-4a8 8 0 0 0-8 8v26a8 8 0 0 0 8 8h4a8 8 0 0 0 8-8v-4';
const ARC_LEN = 93; // 42 straight + four quarter circles of r=8 ≈ 92.3, rounded up
const E = 'cubic-bezier(.16,1,.3,1)', IO = 'cubic-bezier(.45,0,.55,1)';
const ROLE = 'Senior Software Engineer at Fiverr';
const STACK_LINE = 'React / TypeScript / Node.js / NestJS / Next.js';

function textWidth(style, str, size) {
  const { upem, glyphs, kern } = ATLAS[style];
  const ch = [...str];
  return (ch.reduce((w, c, i) => w + glyphs[c][0] + (kern[c + ch[i + 1]] ?? 0), 0) * size) / upem;
}

// Glass pane: drifts in the gap between the end of the text and the C (never over either).
const TEXT_RIGHT = Math.max(256 + textWidth('display', 'IVAN CHABAN', 112), 259.4 + textWidth('medium', STACK_LINE, 22));
const C_LEFT = 1104, C_W = 176;                          // the C's outer left edge and visible width
const PW = 190, PH = 252, PY = 34, PR = 28;
const PX = Math.round(TEXT_RIGHT + 82);                  // left stop: 82 px clear of the text
const TRAVEL = Math.round(C_LEFT - 0.1 * C_W - PW - PX); // right stop: 10% of the C width before the C
const LOOP_AT = 2.2;                                     // the pane starts drifting after the intro

// Intro plays once on load (stem rises, C draws itself, name rises, lines fade in, pane fades in),
// then the pane drifts forever (8 s each way). Everything rests in its final state, so reduced
// motion and still renderers show the full banner.
const CSS = [
  `.s{transform-box:fill-box;transform-origin:50% 100%;animation:s .8s ${E} backwards}`,
  `.c{stroke-dasharray:${ARC_LEN};animation:c 1.4s ${E} .25s backwards}`,
  `.u{animation:u .9s ${E} .35s backwards}`,
  `.f{animation:f .8s ${E} backwards}`,
  `.gf{animation:gf 1s ease 1.4s backwards}`,
  // the pane moves right; the blurred copy inside it moves left by the same amount, so it stays put
  `.gp{animation:gp 8s ${IO} ${LOOP_AT}s infinite alternate backwards}`,
  `.gi{animation:gi 8s ${IO} ${LOOP_AT}s infinite alternate backwards}`,
  '@keyframes s{from{transform:scaleY(0)}}',
  `@keyframes c{from{stroke-dashoffset:${ARC_LEN}}}`,
  '@keyframes u{from{transform:translateY(130px)}}',
  '@keyframes f{from{opacity:0;transform:translateY(10px)}}',
  '@keyframes gf{from{opacity:0}}',
  `@keyframes gp{to{transform:translateX(${TRAVEL}px)}}`,
  `@keyframes gi{to{transform:translateX(-${TRAVEL}px)}}`,
  '@media (prefers-reduced-motion:reduce){*{animation:none!important}}',
].join('');

function text(used, style, str, x, y, size, fill, anchor = 'start') {
  const { upem, glyphs, kern } = ATLAS[style];
  const chars = [...str];
  let pen = 0;
  const uses = chars.map((ch, i) => {
    const g = glyphs[ch];
    if (!g) throw new Error(`No "${ch}" glyph in style ${style}`);
    const at = Math.round(pen);
    pen += g[0] + (kern[ch + chars[i + 1]] ?? 0);
    if (!g[1]) return '';
    const id = `${style[0]}${ch.codePointAt(0).toString(36)}`;
    used.set(id, g[1]);
    return `<use href="#${id}" x="${at}"/>`;
  });
  const k = size / upem;
  const x0 = anchor === 'middle' ? x - (pen * k) / 2 : x;
  return `<g fill="${fill}" transform="translate(${r(x0)} ${r(y)}) scale(${+k.toFixed(5)})">${uses.join('')}</g>`;
}

function header(c) {
  const used = new Map();
  const name = text(used, 'display', 'IVAN CHABAN', 256, 140, 112, c.type);
  const role = text(used, 'medium', ROLE, 259.4, 194, 22, c.type);
  const stack = text(used, 'medium', STACK_LINE, 259.4, 228.1, 22, c.type);
  const mark = text(used, 'display', '</>', PX + PW / 2, PY + PH / 2 + 40, 112, c.type, 'middle');
  const arc = `<path d="${ARC}" fill="none" stroke="${c.arc}" stroke-width="8"/>`;
  const defs = [...used].map(([id, d]) => `<path id="${id}" d="${d}"/>`).join('')
    // what the glass blurs: the banner without type
    + `<g id="scene"><rect width="${W}" height="${H}" fill="${c.field}"/><rect x="64" y="0" width="64" height="${H}" fill="${c.type}"/><g transform="translate(912 -96) scale(8)">${arc}</g></g>`
    + `<filter id="bl" filterUnits="userSpaceOnUse" x="-100" y="-100" width="${W + 200}" height="${H + 200}"><feGaussianBlur stdDeviation="14"/></filter>`
    + `<linearGradient id="edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${c.edgeHi}"/><stop offset=".5" stop-color="#fff" stop-opacity="${c.edgeLo}"/><stop offset="1" stop-color="#fff" stop-opacity="${r(c.edgeHi * 0.6)}"/></linearGradient>`
    + `<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>`
    + `<clipPath id="pc"><rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="${PR}"/></clipPath>`
    + `<clipPath id="n"><rect x="240" y="0" width="800" height="146"/></clipPath>`
    + `<clipPath id="frame"><rect width="${W}" height="${H}"/></clipPath>`;
  const pane = `<g class="gf"><g class="gp">`
    + `<g clip-path="url(#pc)"><g class="gi"><use href="#scene" filter="url(#bl)"/></g>`
    + `<rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" fill="#fff" opacity="${c.glass}"/>${mark}`
    + `<rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" fill="url(#sheen)"/></g>`
    + `<rect x="${PX + 0.75}" y="${PY + 0.75}" width="${PW - 1.5}" height="${PH - 1.5}" rx="${PR}" fill="none" stroke="url(#edge)" stroke-width="1.5"/>`
    + `</g></g>`;
  const body = [
    `<rect width="${W}" height="${H}" fill="${c.field}"/>`,
    `<rect class="s" x="64" y="0" width="64" height="${H}" fill="${c.type}"/>`,
    `<g transform="translate(912 -96) scale(8)"><path class="c" d="${ARC}" fill="none" stroke="${c.arc}" stroke-width="8"/></g>`,
    pane,
    `<g clip-path="url(#n)"><g class="u">${name}</g></g>`,
    `<g class="f" style="animation-delay:.7s">${role}</g>`,
    `<g class="f" style="animation-delay:.85s">${stack}</g>`,
  ].join('');
  const title = 'Ivan Chaban. Senior Software Engineer at Fiverr. React, TypeScript, Node.js, NestJS, Next.js';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${title}"><title>${title}</title><style>${CSS}</style><defs>${defs}</defs><g clip-path="url(#frame)">${body}</g></svg>\n`;
}

for (const [theme, c] of Object.entries(THEMES)) {
  const svg = header(c);
  writeFileSync(join(ROOT, `assets/header-${theme}.svg`), svg);
  console.log(`assets/header-${theme}.svg ${(svg.length / 1024).toFixed(1)} KB`);
}

// ------------------------------------------------------------------ tech stack
// [icon, name, official site]. icon is a skillicons.dev id, or `si:<slug>` for a local tile in
// assets/icons/ (made by scripts/icons.mjs from Simple Icons, for techs skillicons does not have).
// Skillicons with their own dark/light artwork are listed in THEMED; those and all local tiles get one
// link per theme (GitHub hides the other one), the rest a single link.
const STACK = {
  'Languages': [
    ['ts', 'TypeScript', 'https://www.typescriptlang.org/'],
    ['js', 'JavaScript', 'https://developer.mozilla.org/docs/Web/JavaScript'],
    ['dart', 'Dart', 'https://dart.dev/'],
  ],
  'Frameworks & runtimes': [
    ['react', 'React / React Native', 'https://react.dev/'],
    ['nextjs', 'Next.js', 'https://nextjs.org/'],
    ['nodejs', 'Node.js', 'https://nodejs.org/'],
    ['nestjs', 'NestJS', 'https://nestjs.com/'],
    ['angular', 'Angular', 'https://angular.dev/'],
    ['astro', 'Astro', 'https://astro.build/'],
    ['flutter', 'Flutter', 'https://flutter.dev/'],
    ['prisma', 'Prisma', 'https://www.prisma.io/'],
  ],
  'Libraries': [
    ['redux', 'Redux / Redux Toolkit', 'https://redux.js.org/'],
    ['si:reduxsaga', 'Redux-Saga', 'https://redux-saga.js.org/'],
    ['si:reactquery', 'React Query', 'https://tanstack.com/query'],
    ['graphql', 'GraphQL', 'https://graphql.org/'],
    ['apollo', 'Apollo', 'https://www.apollographql.com/'],
    ['materialui', 'MUI', 'https://mui.com/'],
    ['si:antdesign', 'Ant Design', 'https://ant.design/'],
    ['bootstrap', 'Bootstrap / Reactstrap', 'https://getbootstrap.com/'],
    ['si:gsap', 'GSAP', 'https://gsap.com/'],
    ['si:reacthookform', 'React Hook Form', 'https://react-hook-form.com/'],
    ['si:formik', 'Formik', 'https://formik.org/'],
    ['si:zod', 'Zod', 'https://zod.dev/'],
    ['si:axios', 'Axios', 'https://axios-http.com/'],
    ['si:lodash', 'Lodash', 'https://lodash.com/'],
    ['jquery', 'jQuery', 'https://jquery.com/'],
  ],
  'Markup & styling': [
    ['html', 'HTML', 'https://developer.mozilla.org/docs/Web/HTML'],
    ['css', 'CSS', 'https://developer.mozilla.org/docs/Web/CSS'],
    ['sass', 'Sass / SCSS', 'https://sass-lang.com/'],
    ['si:postcss', 'PostCSS', 'https://postcss.org/'],
    ['tailwind', 'Tailwind CSS', 'https://tailwindcss.com/'],
    ['styledcomponents', 'styled-components', 'https://styled-components.com/'],
    ['pug', 'Pug', 'https://pugjs.org/'],
    ['si:handlebarsdotjs', 'Handlebars', 'https://handlebarsjs.com/'],
  ],
  'Databases & data': [
    ['postgres', 'PostgreSQL', 'https://www.postgresql.org/'],
    ['mongodb', 'MongoDB', 'https://www.mongodb.com/'],
    ['sqlite', 'SQLite', 'https://sqlite.org/'],
    ['si:googlebigquery', 'BigQuery', 'https://cloud.google.com/bigquery'],
  ],
  'Cloud & DevOps': [
    ['aws', 'AWS', 'https://aws.amazon.com/'],
    ['gcp', 'Google Cloud', 'https://cloud.google.com/'],
    ['docker', 'Docker', 'https://www.docker.com/'],
    ['kubernetes', 'Kubernetes', 'https://kubernetes.io/'],
    ['si:consul', 'Consul', 'https://developer.hashicorp.com/consul'],
    ['jenkins', 'Jenkins', 'https://www.jenkins.io/'],
    ['si:circleci', 'CircleCI', 'https://circleci.com/'],
  ],
  'Build tools': [
    ['npm', 'npm', 'https://www.npmjs.com/'],
    ['pnpm', 'pnpm', 'https://pnpm.io/'],
    ['vite', 'Vite', 'https://vite.dev/'],
    ['webpack', 'webpack', 'https://webpack.js.org/'],
    ['rollupjs', 'Rollup', 'https://rollupjs.org/'],
    ['gulp', 'gulp', 'https://gulpjs.com/'],
  ],
  'Testing & code quality': [
    ['jest', 'Jest', 'https://jestjs.io/'],
    ['si:eslint', 'ESLint', 'https://eslint.org/'],
    ['si:prettier', 'Prettier', 'https://prettier.io/'],
  ],
  'Monitoring & analytics': [
    ['grafana', 'Grafana', 'https://grafana.com/'],
    ['si:mixpanel', 'Mixpanel', 'https://mixpanel.com/'],
  ],
  'Version control & collaboration': [
    ['git', 'Git', 'https://git-scm.com/'],
    ['github', 'GitHub', 'https://github.com/'],
    ['gitlab', 'GitLab', 'https://about.gitlab.com/'],
    ['bitbucket', 'Bitbucket', 'https://bitbucket.org/'],
    ['si:jira', 'Jira', 'https://www.atlassian.com/software/jira'],
    ['si:asana', 'Asana', 'https://asana.com/'],
  ],
  'Design': [
    ['figma', 'Figma', 'https://www.figma.com/'],
    ['ps', 'Photoshop', 'https://www.adobe.com/products/photoshop.html'],
  ],
  'AI-assisted development': [
    ['si:claude', 'Claude / Claude Code', 'https://www.anthropic.com/claude'],
    ['si:cursor', 'Cursor', 'https://cursor.com/'],
  ],
  'Editors & OS': [
    ['vscode', 'VS Code', 'https://code.visualstudio.com/'],
    ['webstorm', 'WebStorm', 'https://www.jetbrains.com/webstorm/'],
    ['idea', 'IntelliJ IDEA', 'https://www.jetbrains.com/idea/'],
    ['apple', 'macOS', 'https://www.apple.com/macos/'],
    ['windows', 'Windows', 'https://www.microsoft.com/windows'],
    ['linux', 'Linux', 'https://www.kernel.org/'],
  ],
};
const THEMED = new Set(('dart react nextjs angular flutter tailwind materialui pug nodejs nestjs graphql postgres '
  + 'aws gcp github gitlab bitbucket npm pnpm vite webpack rollupjs jenkins grafana figma vscode webstorm idea apple windows linux').split(' '));

const icon = ([id, name, url]) => {
  const local = id.startsWith('si:') && id.slice(3);
  if (local && !existsSync(join(ROOT, `assets/icons/${local}-dark.svg`))) throw new Error(`Missing tile for ${local}: run node scripts/icons.mjs`);
  const src = (theme) => (local ? `assets/icons/${local}-${theme}.svg` : `https://skillicons.dev/icons?i=${id}&theme=${theme}`);
  const img = (theme, mode) => `<a href="${url}${mode ? `#gh-${mode}-mode-only` : ''}"><img src="${src(theme)}${mode ? `#gh-${mode}-mode-only` : ''}" alt="${name}" title="${name}" width="40" height="40"></a>`;
  return local || THEMED.has(id) ? [img('dark', 'dark'), img('light', 'light')] : [img('dark')];
};
// One group per table row (GitHub keeps <table>), in this order.
const LAYOUT = [
  'Languages', 'Frameworks & runtimes', 'Libraries', 'Markup & styling', 'Databases & data', 'Cloud & DevOps',
  'Build tools', 'Testing & code quality', 'Monitoring & analytics', 'Version control & collaboration',
  'Design', 'AI-assisted development', 'Editors & OS',
];
const missing = Object.keys(STACK).filter((g) => !LAYOUT.includes(g));
if (missing.length || LAYOUT.some((g) => !STACK[g])) throw new Error(`LAYOUT and STACK groups differ: ${missing.join(', ')}`);
const row = (group) => `<tr><td>\n<b>${group}</b><br>\n${STACK[group].flatMap(icon).join('\n')}\n</td></tr>`;
const block = '<!-- STACK:START -->\n<table>\n' + LAYOUT.map(row).join('\n') + '\n</table>\n<!-- STACK:END -->';

const readmePath = join(ROOT, 'README.md');
const readme = readFileSync(readmePath, 'utf8');
if (!readme.includes('<!-- STACK:START -->')) throw new Error('STACK markers missing in README.md');
writeFileSync(readmePath, readme.replace(/<!-- STACK:START -->[\s\S]*?<!-- STACK:END -->/, block));
console.log(`README.md stack: ${Object.values(STACK).flat().length} icons`);
