#!/usr/bin/env node
/**
 * build-search-index.js — Generate data/search-index.json
 * Extracts text content from all chapter HTML files and builds
 * a searchable index with titles, section headings, keywords,
 * and content snippets.
 *
 * Run: node build-search-index.js
 */

const fs = require('fs');
const path = require('path');

const CHAPTERS_DIR = path.join(__dirname, 'pages', 'chapters');
const NAV_FILE     = path.join(__dirname, 'data', 'nav', 'nav-data.json');
const OUTPUT       = path.join(__dirname, 'data', 'search-index.json');

// ── Load nav data to get chapter IDs and titles ──────────────
const navData = JSON.parse(fs.readFileSync(NAV_FILE, 'utf8'));
const chapters = [];
for (const part of navData) {
  for (const ch of part.chapters) {
    chapters.push({ id: ch.id, num: ch.num, title: ch.title, part: part.part, color: ch.color || null });
  }
}

// ── HTML text extraction (no DOM parser needed) ──────────────
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/&times;/g, '×')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSectionHeadings(html) {
  const headings = [];
  const re = /class="section-heading"[^>]*>(.*?)<\/div>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    headings.push(stripHtml(m[1]));
  }
  // Also grab section-label
  const re2 = /class="section-label"[^>]*>(.*?)<\/div>/gi;
  while ((m = re2.exec(html)) !== null) {
    headings.push(stripHtml(m[1]));
  }
  return headings;
}

function extractPageTitle(html) {
  const m = html.match(/class="page-title"[^>]*>(.*?)<\/div>/i);
  return m ? stripHtml(m[1]) : '';
}

function extractPageSubtitle(html) {
  const m = html.match(/class="page-subtitle"[^>]*>(.*?)<\/div>/i);
  return m ? stripHtml(m[1]) : '';
}

// ── Build index ──────────────────────────────────────────────
const index = [];

for (const ch of chapters) {
  // Find the HTML file
  const htmlFile = path.join(CHAPTERS_DIR, ch.id + '.html');
  if (!fs.existsSync(htmlFile)) {
    // Try appendices.html for appA-appF
    if (ch.id.startsWith('app') && ch.id.length <= 4) {
      // These are in appendices.html, skip for now (handled separately)
      continue;
    }
    console.warn(`  SKIP: ${ch.id} — no HTML file`);
    continue;
  }

  const html = fs.readFileSync(htmlFile, 'utf8');
  const pageTitle = extractPageTitle(html) || ch.title;
  const subtitle = extractPageSubtitle(html);
  const sections = extractSectionHeadings(html);
  const fullText = stripHtml(html);

  // Extract first ~200 chars as description
  const desc = fullText.substring(0, 300).replace(/\s+/g, ' ').trim();

  index.push({
    id: ch.id,
    num: ch.num,
    title: ch.title,
    pageTitle,
    subtitle,
    part: ch.part,
    color: ch.color,
    sections,
    content: fullText,
    desc
  });
}

// Handle appendices.html (contains appA-appF as sections)
const appFile = path.join(CHAPTERS_DIR, 'appendices.html');
if (fs.existsSync(appFile)) {
  const appHtml = fs.readFileSync(appFile, 'utf8');
  // Split by page divs
  const appIds = ['appA', 'appB', 'appC', 'appD', 'appE', 'appF'];
  for (const appId of appIds) {
    const ch = chapters.find(c => c.id === appId);
    if (!ch) continue;

    // Extract the section for this appendix
    const re = new RegExp(`id="page-${appId}"[\\s\\S]*?(?=<div class="page"|$)`, 'i');
    const m = appHtml.match(re);
    if (m) {
      const sectionHtml = m[0];
      const sections = extractSectionHeadings(sectionHtml);
      const fullText = stripHtml(sectionHtml);
      const desc = fullText.substring(0, 300).replace(/\s+/g, ' ').trim();

      index.push({
        id: ch.id,
        num: ch.num,
        title: ch.title,
        pageTitle: ch.title,
        subtitle: '',
        part: ch.part,
        color: ch.color,
        sections,
        content: fullText,
        desc
      });
    }
  }
}

// ── Write output ─────────────────────────────────────────────
fs.writeFileSync(OUTPUT, JSON.stringify(index), 'utf8');
const sizeKB = (fs.statSync(OUTPUT).size / 1024).toFixed(1);
console.log(`\nBuilt search index: ${index.length} chapters, ${sizeKB} KB`);
console.log(`Output: ${OUTPUT}`);
