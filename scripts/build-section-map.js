/**
 * build-section-map.js
 * Scans pages/chapters/*.html, extracts every id="sec-*" anchor with its
 * adjacent heading text, and writes data/nav/section-map.json.
 *
 * Usage:  node scripts/build-section-map.js
 */

const fs   = require('fs');
const path = require('path');

const CHAPTERS_DIR = path.resolve(__dirname, '..', 'pages', 'chapters');
const OUTPUT_FILE  = path.resolve(__dirname, '..', 'data', 'nav', 'section-map.json');

// Files to skip (no meaningful section content)
const SKIP_FILES = new Set([
  'placeholder.html'
]);

// HTML entity map for decoding title text
const ENTITIES = {
  '&amp;':    '&',
  '&lt;':     '<',
  '&gt;':     '>',
  '&quot;':   '"',
  '&#39;':    "'",
  '&apos;':   "'",
  '&mdash;':  '\u2014',
  '&ndash;':  '\u2013',
  '&middot;': '\u00B7',
  '&bull;':   '\u2022',
  '&rsquo;':  '\u2019',
  '&lsquo;':  '\u2018',
  '&rdquo;':  '\u201D',
  '&ldquo;':  '\u201C',
  '&hellip;': '\u2026',
  '&times;':  '\u00D7',
  '&nbsp;':   ' ',
  '&rarr;':   '\u2192',
  '&larr;':   '\u2190',
  '&darr;':   '\u2193',
  '&uarr;':   '\u2191',
  '&trade;':  '\u2122',
  '&copy;':   '\u00A9',
  '&reg;':    '\u00AE',
  '&deg;':    '\u00B0',
  '&micro;':  '\u00B5',
  '&frac12;': '\u00BD',
  '&frac14;': '\u00BC',
  '&frac34;': '\u00BE'
};

function decodeEntities(str) {
  // Named entities
  let out = str.replace(/&[a-zA-Z0-9]+;/g, match => ENTITIES[match] || match);
  // Numeric entities (decimal)
  out = out.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  // Numeric entities (hex)
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return out;
}

function stripTags(str) {
  // Remove proto-badge spans and their content before stripping other tags
  let out = str.replace(/<span\s+class="proto-badge"[^>]*>.*?<\/span>/gi, '');
  return out.replace(/<[^>]*>/g, '').trim();
}

function deriveKey(filename) {
  return filename.replace(/\.html$/, '');
}

/**
 * Extract sections from a single HTML file.
 * Matches both section-heading and section-label elements with id="sec-*".
 */
function extractSections(html) {
  const sections = [];
  // Match: <div class="section-heading" id="sec-...">...</div>
  //   and: <div class="section-label" id="sec-...">...</div>
  // The id and class can appear in either order.
  const pattern = /<div\s+[^>]*?class="section-(?:heading|label)"[^>]*?id="(sec-[^"]+)"[^>]*>(.*?)<\/div>/gi;
  // Also handle id before class
  const pattern2 = /<div\s+[^>]*?id="(sec-[^"]+)"[^>]*?class="section-(?:heading|label)"[^>]*>(.*?)<\/div>/gi;

  const seen = new Set();

  for (const pat of [pattern, pattern2]) {
    let match;
    while ((match = pat.exec(html)) !== null) {
      const id = match[1];
      if (seen.has(id)) continue;
      seen.add(id);
      const rawLabel = stripTags(match[2]);
      const label = decodeEntities(rawLabel).replace(/\s+/g, ' ').trim();
      sections.push({ id, label });
    }
  }

  // Sort by order of appearance (by position in source)
  // Re-scan to get positions
  if (sections.length > 1) {
    sections.sort((a, b) => {
      const posA = html.indexOf(`id="${a.id}"`);
      const posB = html.indexOf(`id="${b.id}"`);
      return posA - posB;
    });
  }

  return sections;
}

// --- Main ---
const files = fs.readdirSync(CHAPTERS_DIR)
  .filter(f => f.endsWith('.html') && !SKIP_FILES.has(f))
  .sort((a, b) => {
    // Natural sort: ch1 < ch2 < ch10 < ch19b < ch20 < appendices < appL < appM < dashboard < suppG
    const extract = name => {
      const m = name.replace('.html', '').match(/^(ch|app|supp|dashboard|appendices)(\d*)(.*)/);
      if (!m) return [name, 0, ''];
      return [m[1], m[2] ? Number(m[2]) : 0, m[3]];
    };
    const order = { ch: 0, appendices: 1, app: 2, dashboard: 3, supp: 4 };
    const [prefA, numA, sufA] = extract(a);
    const [prefB, numB, sufB] = extract(b);
    const oA = order[prefA] ?? 5;
    const oB = order[prefB] ?? 5;
    if (oA !== oB) return oA - oB;
    if (numA !== numB) return numA - numB;
    return sufA.localeCompare(sufB);
  });

const sectionMap = {};
let totalSections = 0;
const emptyChs = [];

for (const file of files) {
  const html = fs.readFileSync(path.join(CHAPTERS_DIR, file), 'utf-8');
  const key = deriveKey(file);
  const sections = extractSections(html);

  if (sections.length === 0) {
    emptyChs.push(key);
    continue; // omit chapters with 0 sections from the map
  }

  sectionMap[key] = sections;
  totalSections += sections.length;
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sectionMap, null, 2) + '\n', 'utf-8');

// Summary
const chapterCount = Object.keys(sectionMap).length;
console.log(`section-map.json written successfully.`);
console.log(`  Chapters with sections: ${chapterCount}`);
console.log(`  Total section entries:  ${totalSections}`);
if (emptyChs.length) {
  console.log(`  Chapters with 0 sections (omitted): ${emptyChs.join(', ')}`);
}
