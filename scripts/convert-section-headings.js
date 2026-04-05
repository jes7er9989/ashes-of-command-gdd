/**
 * convert-section-headings.js
 * Converts <div class="section-heading"> to <h2 class="section-heading">
 * in all chapter HTML files for proper document outline and screen-reader support.
 *
 * Idempotent — safe to run multiple times; already-converted files are unchanged.
 *
 * Usage:  node scripts/convert-section-headings.js [--dry-run]
 */

const fs   = require('fs');
const path = require('path');

const CHAPTERS_DIR = path.resolve(__dirname, '..', 'pages', 'chapters');
const dryRun       = process.argv.includes('--dry-run');

const OPEN_RE  = /<div(\s+class=["']section-heading["'])/g;
const CLOSE_RE = /<\/div>([\t ]*<!--\s*\/section-heading\s*-->)?/;

let totalFiles   = 0;
let changedFiles = 0;
let totalSwaps   = 0;

const files = fs.readdirSync(CHAPTERS_DIR)
  .filter(f => f.endsWith('.html'))
  .sort();

for (const file of files) {
  const filePath = path.join(CHAPTERS_DIR, file);
  const original = fs.readFileSync(filePath, 'utf8');
  let changed    = false;
  let fileSwaps  = 0;

  const result = original.replace(
    /<div(\s+class=["']section-heading["'][^>]*)>(.*?)<\/div>/g,
    (match, attrs, content) => {
      changed = true;
      fileSwaps++;
      return `<h2${attrs}>${content}</h2>`;
    }
  );

  totalFiles++;

  if (changed) {
    changedFiles++;
    totalSwaps += fileSwaps;
    if (!dryRun) {
      fs.writeFileSync(filePath, result, 'utf8');
    }
    console.log(`  ${dryRun ? '[dry-run] ' : ''}${file}: ${fileSwaps} heading(s) converted`);
  }
}

console.log(`\nDone. ${totalSwaps} headings converted across ${changedFiles}/${totalFiles} files.${dryRun ? ' (dry-run — no files written)' : ''}`);
