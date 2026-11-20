/**
 * Post-build step: rewrites dist/sw.js so it precaches the hashed assets this
 * build actually produced, under a cache name unique to the build.
 *
 * Without this the worker only caches what it happens to intercept, which
 * means a freshly installed app is not offline-capable until its second load.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const SW_FILE = join(DIST, 'sw.js');

/** Files that are either handled separately or never worth precaching. */
const SKIP = new Set(['sw.js', 'index.html', 'manifest.webmanifest', '.vite']);

function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(DIST, full).split(sep).join(posix.sep);
    if (SKIP.has(rel) || SKIP.has(name)) continue;
    if (statSync(full).isDirectory()) entries.push(...walk(full));
    else entries.push(rel);
  }
  return entries;
}

const assets = walk(DIST)
  // The icons are already named in the worker's app shell.
  .filter((file) => !file.startsWith('icons/'))
  .sort();

let sw = readFileSync(SW_FILE, 'utf8');

// The worker's own source counts too, so a change to its logic alone still
// produces a new cache name.
const indexHtml = readFileSync(join(DIST, 'index.html'));
const buildId = createHash('sha256')
  .update(assets.join('|'))
  .update(indexHtml)
  .update(sw)
  .digest('hex')
  .slice(0, 12);

const before = sw;
sw = sw.replace("const BUILD_ID = 'dev';", `const BUILD_ID = '${buildId}';`);
sw = sw.replace(
  'const BUILT_ASSETS = [];',
  `const BUILT_ASSETS = ${JSON.stringify(assets.map((file) => `./${file}`), null, 2)};`,
);

if (sw === before) {
  console.error('inject-precache: placeholders not found in dist/sw.js — did the worker change?');
  process.exit(1);
}

writeFileSync(SW_FILE, sw);
console.log(`inject-precache: build ${buildId}, ${assets.length} asset(s) precached`);
