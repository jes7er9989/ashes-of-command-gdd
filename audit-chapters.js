/**
 * audit-chapters.js — Chapter Content Audit Script
 * Ashes of Command Interactive GDD
 *
 * Reads nav-data.json, checks each chapter HTML for:
 *   1. File exists
 *   2. File size > 100 bytes (not stub/empty)
 *   3. Contains at least one <h2> or <h3> heading
 *   4. No unclosed HTML tags (basic check)
 *   5. No remaining mojibake characters
 *
 * Usage: node audit-chapters.js
 */

const fs = require('fs');
const path = require('path');

const NAV_DATA_PATH = path.join(__dirname, 'data', 'nav', 'nav-data.json');
const CHAPTERS_DIR = path.join(__dirname, 'pages', 'chapters');

/* ── Mojibake patterns ──
   Common UTF-8 → Latin-1 misinterpretation sequences.
   These appear when multi-byte UTF-8 chars are decoded as single-byte. */
const MOJIBAKE_PATTERNS = [
  /â€"/g,    // em dash
  /â€"/g,    // en dash
  /â€™/g,    // right single quote
  /â€˜/g,    // left single quote
  /â€œ/g,    // left double quote
  /â€\u009D/g, // right double quote
  /Ã©/g,    // é
  /Ã¨/g,    // è
  /Ã¼/g,    // ü
  /Ã¶/g,    // ö
  /Ã¤/g,    // ä
  /Ã±/g,    // ñ
  /Â©/g,    // ©
  /Â®/g,    // ®
  /Â°/g,    // °
  /Ã¢/g,    // â
  /ï¿½/g,   // replacement character
];

/* ── Unclosed tag check ──
   Basic: count opening vs closing tags for common block elements.
   Not a full HTML parser — catches obvious mismatches. */
function checkUnclosedTags(html) {
  const issues = [];
  const tags = ['div', 'section', 'table', 'tr', 'td', 'th', 'ul', 'ol', 'li', 'p', 'span', 'a', 'button'];

  for (const tag of tags) {
    /* Match opening tags (not self-closing) */
    const openRegex = new RegExp(`<${tag}[\\s>]`, 'gi');
    const closeRegex = new RegExp(`</${tag}>`, 'gi');
    const selfCloseRegex = new RegExp(`<${tag}[^>]*/\\s*>`, 'gi');

    const openMatches = (html.match(openRegex) || []).length;
    const closeMatches = (html.match(closeRegex) || []).length;
    const selfCloseMatches = (html.match(selfCloseRegex) || []).length;

    const netOpen = openMatches - selfCloseMatches;
    if (netOpen !== closeMatches && Math.abs(netOpen - closeMatches) > 0) {
      issues.push(`<${tag}>: ${netOpen} opened, ${closeMatches} closed (diff: ${netOpen - closeMatches})`);
    }
  }

  return issues;
}

/* ── Main audit ── */
function audit() {
  /* Read nav data */
  let navData;
  try {
    navData = JSON.parse(fs.readFileSync(NAV_DATA_PATH, 'utf-8'));
  } catch (e) {
    console.error(`FATAL: Cannot read nav-data.json: ${e.message}`);
    process.exit(1);
  }

  /* Collect all chapter IDs */
  const chapters = [];
  for (const part of navData) {
    for (const ch of part.chapters) {
      chapters.push(ch);
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log(' CHAPTER CONTENT AUDIT — Ashes of Command Interactive GDD');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total chapters in nav-data.json: ${chapters.length}`);
  console.log(`Chapters directory: ${CHAPTERS_DIR}`);
  console.log('');

  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;
  const results = [];

  for (const ch of chapters) {
    const id = ch.id;
    const title = ch.title;

    /* Map IDs to filenames — special cases */
    let filename;
    if (['appA', 'appB', 'appC', 'appD', 'appE', 'appF'].includes(id)) {
      filename = 'appendices.html';
    } else {
      filename = `${id}.html`;
    }

    const filepath = path.join(CHAPTERS_DIR, filename);
    const checks = { exists: false, size: false, headings: false, tags: true, mojibake: true };
    const issues = [];
    let status = 'PASS';

    /* Check 1: File exists */
    if (!fs.existsSync(filepath)) {
      checks.exists = false;
      issues.push('FILE NOT FOUND');
      status = 'FAIL';
      results.push({ id, title, filename, status, issues });
      failCount++;
      continue;
    }
    checks.exists = true;

    /* Read file */
    const content = fs.readFileSync(filepath, 'utf-8');
    const size = Buffer.byteLength(content, 'utf-8');

    /* Check 2: File size > 100 bytes */
    if (size <= 100) {
      checks.size = false;
      issues.push(`Size too small: ${size} bytes (stub/empty)`);
      status = 'FAIL';
    } else {
      checks.size = true;
    }

    /* Check 3: Contains at least one heading */
    const hasHeading = /<h[23][^>]*>/i.test(content) ||
                       /class="page-title"/i.test(content) ||
                       /class="section-heading"/i.test(content) ||
                       /class="section-label"/i.test(content);
    if (!hasHeading) {
      checks.headings = false;
      issues.push('No <h2>, <h3>, or section heading found');
      if (status !== 'FAIL') status = 'WARN';
    } else {
      checks.headings = true;
    }

    /* Check 4: Unclosed tags */
    const tagIssues = checkUnclosedTags(content);
    if (tagIssues.length > 0) {
      checks.tags = false;
      /* Only fail on significant mismatches (>2 difference) */
      const significant = tagIssues.filter(i => {
        const diff = parseInt(i.match(/diff: (-?\d+)/)?.[1] || '0');
        return Math.abs(diff) > 2;
      });
      if (significant.length > 0) {
        issues.push(`Tag mismatches: ${significant.join('; ')}`);
        if (status !== 'FAIL') status = 'WARN';
      }
    }

    /* Check 5: Mojibake detection */
    const mojibakeFound = [];
    for (const pattern of MOJIBAKE_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        mojibakeFound.push(`"${matches[0]}" ×${matches.length}`);
      }
    }
    if (mojibakeFound.length > 0) {
      checks.mojibake = false;
      issues.push(`Mojibake: ${mojibakeFound.join(', ')}`);
      status = 'FAIL';
    }

    results.push({ id, title, filename, status, issues, size });

    if (status === 'PASS') passCount++;
    else if (status === 'FAIL') failCount++;
    else warnCount++;
  }

  /* ── Output report ── */
  for (const r of results) {
    const icon = r.status === 'PASS' ? '[PASS]' : r.status === 'FAIL' ? '[FAIL]' : '[WARN]';
    const sizeStr = r.size ? ` (${r.size} bytes)` : '';
    console.log(`${icon} ${r.id.padEnd(8)} ${r.title.substring(0, 45).padEnd(47)} ${r.filename}${sizeStr}`);
    if (r.issues.length > 0) {
      for (const issue of r.issues) {
        console.log(`         → ${issue}`);
      }
    }
  }

  console.log('');
  console.log('───────────────────────────────────────────────────────────');
  console.log(` PASS: ${passCount}  |  WARN: ${warnCount}  |  FAIL: ${failCount}  |  TOTAL: ${chapters.length}`);
  console.log('───────────────────────────────────────────────────────────');

  /* Exit with error code if any failures */
  if (failCount > 0) {
    process.exit(1);
  }
}

audit();
