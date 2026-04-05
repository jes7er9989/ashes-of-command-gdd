/* ═══════════════════════════════════════════════════════════
   compute-reading-times.js — Build-time reading time calculator
   ───────────────────────────────────────────────────────────
   Scans pages/chapters/*.html, strips tags, counts words,
   and outputs data/nav/chapter-meta.json.

   Usage:
     node scripts/compute-reading-times.js            (writes file)
     node scripts/compute-reading-times.js dry_run     (stdout only)
     node scripts/compute-reading-times.js dryRun      (stdout only)
   ═══════════════════════════════════════════════════════════ */

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WPM = 225;
const CHAPTERS_DIR = path.resolve(__dirname, '..', 'pages', 'chapters');
const OUTPUT_PATH  = path.resolve(__dirname, '..', 'data', 'nav', 'chapter-meta.json');

const dryRun = process.argv.some(a => a === 'dry_run' || a === 'dryRun');

/**
 * Strip HTML tags and non-readable content from raw HTML.
 * Removes <script>, <style>, <template>, <svg> blocks entirely,
 * then strips remaining tags, leaving only text content.
 */
function stripToText(html) {
  // Remove script, style, template, svg blocks (including nested content)
  let text = html;
  text = text.replace(/<script[\s>][\s\S]*?<\/script\s*>/gi, ' ');
  text = text.replace(/<style[\s>][\s\S]*?<\/style\s*>/gi, ' ');
  text = text.replace(/<template[\s>][\s\S]*?<\/template\s*>/gi, ' ');
  text = text.replace(/<svg[\s>][\s\S]*?<\/svg\s*>/gi, ' ');

  // Strip all remaining HTML tags (including self-closing, attributes)
  text = text.replace(/<[^>]*>/g, ' ');

  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&#\d+;/g, ' ');
  text = text.replace(/&\w+;/g, ' ');

  return text;
}

/**
 * Count words in plain text.
 * Splits on whitespace, filters empty strings and pure-punctuation tokens.
 */
function countWords(text) {
  return text
    .split(/\s+/)
    .filter(w => w.length > 0)
    .filter(w => !/^[\p{P}\p{S}]+$/u.test(w))
    .length;
}

/**
 * Get the last git commit date (author date, ISO-8601) for a file.
 * Returns null if the file is untracked or git is unavailable.
 */
function gitLastModified(filePath) {
  try {
    const out = execFileSync(
      'git',
      ['log', '-1', '--format=%aI', '--', filePath],
      { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    return out || null;
  } catch (_e) {
    return null;
  }
}

// --- Main ---

const files = fs.readdirSync(CHAPTERS_DIR).filter(f => f.endsWith('.html')).sort();
const chapters = {};

for (const file of files) {
  const chapterId = file.replace(/\.html$/, '');
  const filePath  = path.join(CHAPTERS_DIR, file);
  const html      = fs.readFileSync(filePath, 'utf8');
  const text      = stripToText(html);
  const words     = countWords(text);
  const minutes   = Math.max(1, Math.round(words / WPM));

  const updated = gitLastModified(filePath);
  chapters[chapterId] = { words, minutes, updated };
}

// Sort chapters alphabetically by key
const sorted = {};
for (const key of Object.keys(chapters).sort()) {
  sorted[key] = chapters[key];
}

const output = {
  wpm: WPM,
  generated: new Date().toISOString(),
  chapters: sorted
};

const json = JSON.stringify(output, null, 2);

if (dryRun) {
  console.log(json);
} else {
  fs.writeFileSync(OUTPUT_PATH, json + '\n', 'utf8');
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Chapters: ${Object.keys(sorted).length}`);
  // Print summary
  for (const [id, meta] of Object.entries(sorted)) {
    const dateStr = meta.updated ? meta.updated.slice(0, 10) : '----------';
    console.log(`  ${id.padEnd(14)} ${String(meta.words).padStart(6)} words  ${String(meta.minutes).padStart(3)} min  ${dateStr}`);
  }
}
