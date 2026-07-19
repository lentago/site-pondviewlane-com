/**
 * Content hygiene check for the (self-contained, public-record-only) Pond View
 * Lane site. Run after a build: `npm run build && node scripts/check-content.mjs`.
 *
 * Everything in this repo is public by construction, so this is a guardrail, not
 * a firewall: it catches a resident name that slips into a guide, a stray
 * private-source reference, a document that isn't marked public-record, or an
 * attachment that isn't on the allowlist. Hard-fails exit non-zero.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(fileURLToPath(import.meta.url), '..', '..');
let fails = 0, warns = 0;
const fail = (c, m) => { console.error(`  ✗ [${c}] ${m}`); fails++; };
const warn = (c, m) => { console.warn(`  ! [${c}] ${m}`); warns++; };
const ok = (c, m) => console.log(`  ✓ [${c}] ${m}`);
const read = (f) => { try { return readFileSync(f, 'utf8'); } catch { return ''; } };

function walk(dir, skip = []) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = relative(REPO, p);
    if (skip.some((s) => rel === s || rel.startsWith(`${s}/`) || name === s)) continue;
    out.push(...(statSync(p).isDirectory() ? walk(p, skip) : [p]));
  }
  return out;
}
const IDENT = /\b[A-Z][a-z]+\s*\(#\d+\)/g;               // "James (#9)"
const GMAIL = /essexcrossinghoa@gmail\.com/gi;
const IDENTITY = [/cpitzi/gi, /essex-crossing-hoa/gi, /Google Drive/gi, /\blentago\b/gi, /\bsolidago\b/gi, /github\.com/gi];
const isLibDoc = (rel) => rel.includes('/library/') && !rel.endsWith('index.md') && (rel.includes('public/library/') || rel.includes('docs/library/') || /(^|\/)dist[^/]*\/library\//.test(rel));

console.log(`\nCONTENT CHECK  ${REPO}\n`);

// C1 — manifest: all public-record, files present
{
  const man = JSON.parse(read(join(REPO, 'library/manifest.json')));
  const bad = man.documents.filter((d) => d.status !== 'public-record');
  bad.forEach((d) => fail('C1', `manifest doc not public-record: ${d.id} (${d.status})`));
  let missing = 0;
  for (const d of man.documents) if (!existsSync(join(REPO, 'library', d.file))) { fail('C1', `missing source file: ${d.file}`); missing++; }
  if (!bad.length && !missing) ok('C1', `manifest: ${man.documents.length} docs, all public-record, all files present`);
}

// C2 — attachments allow-listed
{
  const gen = read(join(REPO, 'scripts/sync-content.mjs'));
  const am = gen.match(/const PUBLIC_ATTACHMENTS = (\[[\s\S]*?\]);/);
  const allow = new Set(new Function(`return ${am[1]}`)());
  let extra = 0;
  for (const f of walk(join(REPO, 'attachments'))) { const b = f.split('/').pop(); if (!allow.has(b)) { fail('C2', `attachment not allow-listed: ${b}`); extra++; } }
  for (const a of allow) if (!existsSync(join(REPO, 'attachments', a))) { fail('C2', `allowlist entry missing on disk: ${a}`); extra++; }
  if (!extra) ok('C2', `attachments: ${allow.size} files, all allow-listed and present`);
}

// C3 — timeline events render name-clean
{
  const events = JSON.parse(read(join(REPO, 'timeline/events.json')));
  let hits = 0;
  for (const e of events) {
    const s = `${e.t || ''} ${e.x || ''}`;
    if (s.match(IDENT)) { fail('C3', `event ${e.dl}: renders identifier ${s.match(IDENT).join(', ')}`); hits++; }
    if (GMAIL.test(s)) { fail('C3', `event ${e.dl}: renders HOA gmail`); hits++; }
    if (e.src || e.pt || e.px) warn('C3', `event ${e.dl}: carries private field (src/pt/px) — should be stripped`);
  }
  if (!hits) ok('C3', `timeline: ${events.length} events render name-clean`);
}

// C4 — no private source files present
{
  const forbidden = ['docs', 'timeline/index.html', 'library/SANITIZATION.md', 'scripts/build_library.py',
    'scripts/publish-site.mjs', 'scripts/firewall-gate.mjs', '.obsidian', '.gh-token', 'ROADMAP.md'];
  let hits = 0;
  for (const rel of forbidden) if (existsSync(join(REPO, rel))) { fail('C4', `private-repo artifact present: ${rel}`); hits++; }
  if (!hits) ok('C4', 'no private-repo artifacts (docs/, timeline/index.html, build_library.py, publish tooling, …)');
}

// C5 — rendered dists: no source-identity or names outside library docs.
// Two-domain build: BOTH skins must exist and sweep clean. A missing or empty
// dist is a hard failure, not a warning — otherwise the anonymity gate could
// report PASS without ever scanning one skin. The list is explicit (not a
// dist* glob) so a stale legacy dist/ from an old checkout is ignored.
{
  const dists = ['dist-pondview', 'dist-essexcrossing'];
  let hits = 0;
  for (const d of dists) {
    const dist = join(REPO, d);
    if (!existsSync(dist) || !readdirSync(dist).length) { fail('C5', `${d}/ missing or empty — run npm run build`); hits++; continue; }
    // Skip vendored framework/search bundles and the self-hosted font dir — the
    // fonts' OFL licenses legitimately carry the projects' github.com URLs, which
    // are not site content and can't de-anonymize anything.
    for (const f of walk(dist, [`${d}/_astro`, `${d}/pagefind`, `${d}/fonts`]).filter((f) => /\.(html|json|xml|txt)$/i.test(f))) {
      const rel = relative(REPO, f), t = read(f);
      for (const re of IDENTITY) { const m = t.match(re); if (m) { fail('C5', `${rel}: source-identity "${m[0]}"`); hits++; } }
      if (!isLibDoc(rel)) { if (t.match(IDENT)) { fail('C5', `${rel}: identifier`); hits++; } if (GMAIL.test(t)) { fail('C5', `${rel}: HOA gmail`); hits++; } }
    }
  }
  if (!hits) ok('C5', `rendered ${dists.join(', ')} clean of source-identity, Name(#N), HOA gmail`);
}

// C6 — rag-index sweep
{
  const rag = JSON.parse(read(join(REPO, 'public/ask/rag-index.json')) || '{"chunks":[]}');
  let hits = 0;
  for (const c of rag.chunks || []) {
    const s = `${c.title || ''} ${c.text || ''}`, fromLib = (c.page || '').startsWith('/library/');
    if (!fromLib && IDENT.test(s)) { fail('C6', `rag chunk ${c.page}: identifier`); hits++; }
    for (const re of [/cpitzi/i, /essex-crossing-hoa/i, /Google Drive/i, /\blentago\b/i, /\bsolidago\b/i, GMAIL]) if (re.test(s)) { fail('C6', `rag chunk ${c.page}: "${(s.match(re) || [])[0]}"`); hits++; }
  }
  if (!hits) ok('C6', `rag-index: ${(rag.chunks || []).length} chunks clean`);
}

// C7 — facts parity between the base prose and the essex overlay. The Essex
// skin rewrites pages in its own voice (essex-crossing-voice-guide.md), but the
// voice decorates the fact, never replaces it: every fact token found in a base
// page must appear verbatim in its overlay variant. Vacuous pass while no
// overlay exists; a missing token is a hard failure once it does.
{
  const overlayRoot = join(REPO, 'content/essex');
  const baseRoot = join(REPO, 'content/base');
  const files = walk(overlayRoot).filter((f) => /\.(md|mdx)$/i.test(f));
  if (!files.length) { ok('C7', 'facts parity: no essex overlay pages yet (nothing to compare)'); }
  else {
    const FACT_RES = [
      /\$[\d][\d,.]*/g,                       // dollar amounts
      /\b(?:19|20)\d{2}\b/g,                  // years
      /\bchapter\s+\d+[a-z]?\b/gi,            // statute chapters (e.g. Chapter 131)
      /\bsection\s+\d+[a-z]?\b/gi,            // statute sections
      /\b(?:book|bk\.?)\s+\d+\b/gi,           // registry book refs (Book 34576 / Bk 34576)
      /\b(?:page|pg\.?)\s+\d+\b/gi,           // registry page refs (Page 477 / Pg 477)
      /\b\d{4,5}\s*\/\s*\d{3}\b/g,            // bare book/page pairs (34576 / 471)
      /§\s*\d+(?:\.\d+)?/g,                   // covenant/statute section symbols (§2.06)
      /\b\d[\d.]*%/g,                         // percentages (6.25%, 12%)
      /\b\d[\d,.]*\s*(?:feet|foot|ft|acres?)\b/gi, // distances and areas
    ];
    let hits = 0, pages = 0;
    for (const f of files) {
      const rel = relative(overlayRoot, f);
      const baseFile = join(baseRoot, rel);
      if (!existsSync(baseFile)) { warn('C7', `${rel}: no base counterpart (essex-only page — facts unchecked)`); continue; }
      pages++;
      const base = read(baseFile), variant = read(f).toLowerCase();
      for (const re of FACT_RES) {
        for (const m of new Set((base.match(re) || []).map((t) => t.toLowerCase()))) {
          if (!variant.includes(m)) { fail('C7', `${rel}: base fact "${m}" missing from essex variant`); hits++; }
        }
      }
    }
    if (!hits) ok('C7', `facts parity: ${pages} overlay page(s), every base fact token present`);
  }
}

console.log(`\n${fails ? '✗ FAIL' : '✓ PASS'} — ${fails} failure(s), ${warns} warning(s)\n`);
process.exit(fails ? 1 : 0);
