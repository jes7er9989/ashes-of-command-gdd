const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'reference', 'ashes-gdd-v5.9.1-LATEST.html'), 'utf8');

function extractVar(varName) {
  const re = new RegExp('(?:const|var|let)\\s+' + varName + '\\s*=\\s*\\[');
  const match = re.exec(src);
  if (!match) return null;
  let pos = match.index + match[0].length - 1;
  let depth = 1;
  pos++;
  while (pos < src.length && depth > 0) {
    const ch = src[pos];
    if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') depth--;
    else if (ch === "'" || ch === '"' || ch === '`') {
      const q = ch;
      pos++;
      while (pos < src.length && src[pos] !== q) {
        if (src[pos] === '\\') pos++;
        pos++;
      }
    }
    pos++;
  }
  const raw = src.substring(match.index + match[0].length - 1, pos);
  return new Function('return ' + raw)();
}

// Fix Guardians equipment
const geq = extractVar('GUARDIAN_EQUIPMENT');
if (geq) {
  fs.writeFileSync(path.join(__dirname, 'data', 'equipment', 'core-guardians.json'), JSON.stringify(geq, null, 2));
  console.log('Guardians equipment: ' + geq.length);
}

// Fix Guardians tech
const gtech = extractVar('GUARDIAN_TECH');
if (gtech) {
  fs.writeFileSync(path.join(__dirname, 'data', 'tech', 'core-guardians.json'), JSON.stringify(gtech, null, 2));
  console.log('Guardians tech: ' + gtech.length);
} else {
  console.log('GUARDIAN_TECH not found');
}

// Final totals
let te = 0, tt = 0;
const eqDir = path.join(__dirname, 'data', 'equipment');
const techDir = path.join(__dirname, 'data', 'tech');
fs.readdirSync(eqDir).filter(f => f.endsWith('.json')).forEach(f => {
  const d = JSON.parse(fs.readFileSync(path.join(eqDir, f)));
  console.log('  equip/' + f + ': ' + d.length);
  te += d.length;
});
fs.readdirSync(techDir).filter(f => f.endsWith('.json')).forEach(f => {
  const d = JSON.parse(fs.readFileSync(path.join(techDir, f)));
  console.log('  tech/' + f + ': ' + d.length);
  tt += d.length;
});
console.log('TOTAL EQUIPMENT: ' + te);
console.log('TOTAL TECH: ' + tt);
