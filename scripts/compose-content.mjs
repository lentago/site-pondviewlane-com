/**
 * Composes src/content/docs/ for the SITE being built.
 *
 * The two skins share one set of facts but (since the Obsequious Document
 * rewrite, issue #15) not one set of words: hand-written prose lives in
 * content/base/ (the pondview voice, neutral third person) with per-page
 * overrides in content/essex/ (the Essex skin's in-character voice). This
 * script materializes the tree Starlight actually reads:
 *
 *   src/content/docs/  =  content/base/  (+ content/essex/ when SITE says so)
 *                         + the sync-generated dirs, which it never touches
 *
 * Run it before each `astro build` / `astro dev` (the npm scripts do). Edit
 * prose in content/base/ or content/essex/ — never in src/content/docs/,
 * which is wholly generated and gitignored. NOTE: relative imports inside
 * MDX (e.g. ../../components/AskWidget.astro) are written for the COMPOSED
 * location, src/content/docs/, not for content/base/.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, cfg } from '../site.config.mjs';

const REPO = join(fileURLToPath(import.meta.url), '..', '..');
const TARGET = join(REPO, 'src/content/docs');
const BASE = join(REPO, 'content/base');

// Paths inside src/content/docs owned by scripts/sync-content.mjs — compose
// must leave them alone (sync runs once per `npm run build`, before both skins).
const GENERATED = new Set(['library', 'timeline.md']);

mkdirSync(TARGET, { recursive: true });
for (const name of readdirSync(TARGET)) {
  if (!GENERATED.has(name)) rmSync(join(TARGET, name), { recursive: true, force: true });
}

cpSync(BASE, TARGET, { recursive: true });

if (cfg.contentOverlay) {
  const overlay = join(REPO, cfg.contentOverlay);
  if (existsSync(overlay)) cpSync(overlay, TARGET, { recursive: true });
}

// Starlight's lastUpdated is git-based, and the composed copies aren't in git —
// left alone, every page would show the BUILD time as "Last updated" on every
// deploy. Inject each page's real git date (of its source file — the overlay
// wins where it overrode) into frontmatter, which Starlight prefers over git.
// Files with uncommitted sources (fresh local edits) are skipped and fall back
// to build time, which is then accurate.
function walkMd(dir) {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && /\.(md|mdx)$/i.test(e.name))
    .map((e) => join(e.parentPath, e.name));
}
function gitDateOf(path) {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cI', '--', path], { cwd: REPO }).toString().trim();
  } catch { /* not a git checkout — fall through */ return ''; }
}

// The URL a composed doc is served at: drop the extension, drop a trailing
// "index" segment, wrap in slashes. index.mdx → /, about.md → /about/,
// guides/trees.md → /guides/trees/, library/index.md → /library/.
function urlFor(relPath) {
  const u = relPath
    .replace(/\\/g, '/')
    .replace(/\.(md|mdx)$/i, '')
    .replace(/(^|\/)index$/, '')
    .replace(/^\/+|\/+$/g, '');
  return u ? `/${u}/` : '/';
}

// { "/path/": "<git ISO date>" } consumed by the sitemap serialize() in
// astro.config.mjs to stamp each URL's <lastmod>. Prose pages track their
// source file; the sync-generated library/timeline pages track the record data
// they render (manifest.json / events.json).
const pageDates = {};

let stamped = 0;
for (const src of walkMd(BASE).map((f) => relative(BASE, f))
  .concat(cfg.contentOverlay && existsSync(join(REPO, cfg.contentOverlay))
    ? walkMd(join(REPO, cfg.contentOverlay)).map((f) => relative(join(REPO, cfg.contentOverlay), f))
    : [])) {
  const sourceFile = cfg.contentOverlay && existsSync(join(REPO, cfg.contentOverlay, src))
    ? join(cfg.contentOverlay, src)
    : join('content/base', src);
  const gitDate = gitDateOf(sourceFile);
  if (!gitDate) continue;
  pageDates[urlFor(src)] = gitDate;
  const target = join(TARGET, src);
  const text = readFileSync(target, 'utf8');
  if (!text.startsWith('---\n') || /^lastUpdated:/m.test(text)) continue;
  writeFileSync(target, text.replace('---\n', `---\nlastUpdated: ${gitDate}\n`), 'utf8');
  stamped++;
}

// Generated pages (the GENERATED set, produced by sync-content.mjs): freshness
// tracks the record data they render, not a prose source.
const manifestDate = gitDateOf('library/manifest.json');
const eventsDate = gitDateOf('timeline/events.json');
for (const src of walkMd(TARGET).map((f) => relative(TARGET, f).replace(/\\/g, '/'))) {
  if (src === 'timeline.md' && eventsDate) pageDates[urlFor(src)] = eventsDate;
  else if (src.startsWith('library/') && manifestDate) pageDates[urlFor(src)] = manifestDate;
}

mkdirSync(join(REPO, 'src/data'), { recursive: true });
writeFileSync(join(REPO, 'src/data/page-dates.json'), `${JSON.stringify(pageDates)}\n`, 'utf8');

console.log(`compose-content: src/content/docs ← content/base${cfg.contentOverlay ? ` + ${cfg.contentOverlay}` : ''} (SITE=${SITE}, ${stamped} pages date-stamped from git, ${Object.keys(pageDates).length} sitemap dates)`);
