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
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
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

console.log(`compose-content: src/content/docs ← content/base${cfg.contentOverlay ? ` + ${cfg.contentOverlay}` : ''} (SITE=${SITE})`);
