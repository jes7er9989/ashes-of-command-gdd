#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════
   stamp-version.js — Cache-bust js/ and css/ references
   ───────────────────────────────────────────────────────────
   Part of: Ashes of Command: The Reclamation (PWA)
   Dependencies: none (Node stdlib)

   WHY THIS EXISTS
   A Cloudflare zone-level cache rule serves /js/* and /css/*
   with `Cache-Control: max-age=14400`, which overrides the
   `_headers` file. Those files have stable names, so a deploy
   can ship correctly and still not reach a returning visitor
   for up to four hours. Changing the URL is the only thing the
   repo can do about it on its own.

   WHAT IT DOES
   Reads the version number out of CACHE_NAME in
   service-worker.js (the single source of truth) and stamps
   `?v=<n>` onto every js/ and css/ reference in:
     - index.html          <script src> and <link rel=stylesheet>
     - service-worker.js   PRECACHE_URLS entries for /js/ and /css/
   Both sides must match or the service worker caches a URL the
   page never requests.

   USAGE
     1. bump CACHE_NAME in service-worker.js
     2. node scripts/stamp-version.js
     3. commit both files

   Run it again any time; it is idempotent.
   ═══════════════════════════════════════════════════════════ */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SW = path.join(ROOT, 'service-worker.js');
const HTML = path.join(ROOT, 'index.html');

/* ── Read the version from CACHE_NAME ─────────────────────── */

const swText = fs.readFileSync(SW, 'utf8');
const nameMatch = swText.match(/const CACHE_NAME = 'aoc-gdd-v(\d+)';/);

if (!nameMatch) {
  console.error('stamp-version: could not find CACHE_NAME in service-worker.js');
  process.exit(1);
}

const version = nameMatch[1];

/* ── Stamp index.html ─────────────────────────────────────── */

let html = fs.readFileSync(HTML, 'utf8');
let htmlHits = 0;

html = html.replace(
  /(<script[^>]*\ssrc=")(js\/[^"?]+)(?:\?v=\d+)?(")/g,
  (_, a, file, c) => { htmlHits++; return `${a}${file}?v=${version}${c}`; }
);

html = html.replace(
  /(<link[^>]*\shref=")(css\/[^"?]+)(?:\?v=\d+)?(")/g,
  (_, a, file, c) => { htmlHits++; return `${a}${file}?v=${version}${c}`; }
);

/* ── Stamp the service worker precache list ───────────────────
   ONLY the files index.html references. js/vendor/three.min.js is
   fetched by three-loader.js and js/data-worker.js by `new Worker()`,
   both using unstamped paths — stamping those precache entries would
   cache a URL nothing ever requests and break them offline. */

const stamped = new Set();
for (const m of html.matchAll(/(?:src|href)="((?:js|css)\/[^"?]+)\?v=\d+"/g)) {
  stamped.add('/' + m[1]);
}

let sw = swText;
let swHits = 0;
let swSkipped = [];

sw = sw.replace(
  /'(\/(?:js|css)\/[^'?]+)(?:\?v=\d+)?'/g,
  (whole, file) => {
    if (!stamped.has(file)) { swSkipped.push(file); return `'${file}'`; }
    swHits++;
    return `'${file}?v=${version}'`;
  }
);

/* ── Write only if something changed ──────────────────────── */

let changed = 0;
if (html !== fs.readFileSync(HTML, 'utf8')) { fs.writeFileSync(HTML, html); changed++; }
if (sw !== swText) { fs.writeFileSync(SW, sw); changed++; }

console.log(`stamp-version: v${version} — ${htmlHits} refs in index.html, ${swHits} in service-worker.js, ${changed} file(s) written`);
if (swSkipped.length) console.log(`  left unstamped (fetched at runtime): ${swSkipped.join(", ")}`);
