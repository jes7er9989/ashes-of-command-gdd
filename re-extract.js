/**
 * Re-extract equipment and tech data from the monolith GDD.
 * Reads the JS variable declarations directly and outputs JSON files.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, 'reference', 'ashes-gdd-v5.9.1-LATEST.html'),
  'utf8'
);

const factions = [
  { varPrefix: 'TERRAN',    fileKey: 'terran-league' },
  { varPrefix: 'SHARDS',    fileKey: 'eternal-shards' },
  { varPrefix: 'HORDE',     fileKey: 'scrap-horde' },
  { varPrefix: 'NECRO',     fileKey: 'necro-legion' },
  { varPrefix: 'ACCORD',    fileKey: 'unity-accord' },
  { varPrefix: 'VORAX',     fileKey: 'vorax' },
  { varPrefix: 'GUARDIANS', fileKey: 'core-guardians' },
];

/**
 * Extract a JS array variable from the source.
 * Finds `const NAME = [...]` and parses it.
 */
function extractArray(varName) {
  const startPattern = new RegExp('(?:const|var|let)\\s+' + varName + '\\s*=\\s*\\[');
  const match = startPattern.exec(src);
  if (!match) {
    console.log('  NOT FOUND: ' + varName);
    return null;
  }

  let pos = match.index + match[0].length - 1; // at the '['
  let depth = 1;
  let start = pos;

  pos++; // move past '['
  while (pos < src.length && depth > 0) {
    const ch = src[pos];
    if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') depth--;
    // Skip strings
    else if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      pos++;
      while (pos < src.length && src[pos] !== quote) {
        if (src[pos] === '\\') pos++; // skip escaped chars
        pos++;
      }
    }
    pos++;
  }

  const raw = src.substring(start, pos);

  // Convert JS object literals to valid JSON:
  // - Replace single quotes with double quotes
  // - Add quotes around unquoted property names
  // - Remove trailing commas
  // - Handle template literals and function calls
  try {
    // Use Function constructor to evaluate the JS array safely
    const fn = new Function('return ' + raw);
    return fn();
  } catch (e) {
    console.log('  PARSE ERROR for ' + varName + ': ' + e.message);
    // Try a more aggressive cleanup
    try {
      let cleaned = raw
        // Remove any HTML template literals (backtick strings)
        .replace(/`[^`]*`/g, '""')
        // Remove function calls like makeEquipIcon(...)
        .replace(/[a-zA-Z_$][a-zA-Z0-9_$]*\([^)]*\)/g, '""')
        // Remove Object.entries etc
        .replace(/Object\.\w+\([^)]*\)/g, '""');
      const fn2 = new Function('return ' + cleaned);
      return fn2();
    } catch (e2) {
      console.log('  CLEANUP ALSO FAILED: ' + e2.message);
      return null;
    }
  }
}

// Extract equipment
console.log('=== EQUIPMENT ===');
let totalEquip = 0;
for (const f of factions) {
  const varName = f.varPrefix + '_EQUIPMENT';
  const data = extractArray(varName);
  if (data) {
    const outPath = path.join(__dirname, 'data', 'equipment', f.fileKey + '.json');
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('  ' + f.fileKey + ': ' + data.length + ' items');
    totalEquip += data.length;
  }
}
console.log('  TOTAL EQUIPMENT: ' + totalEquip);

// Extract tech
console.log('\n=== TECH TREES ===');
let totalTech = 0;
for (const f of factions) {
  const varName = f.varPrefix + '_TECH';
  const data = extractArray(varName);
  if (data) {
    const outPath = path.join(__dirname, 'data', 'tech', f.fileKey + '.json');
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('  ' + f.fileKey + ': ' + data.length + ' nodes');
    totalTech += data.length;
  }
}
console.log('  TOTAL TECH: ' + totalTech);

// Also check for GUARDIANS equipment/tech which might use different var name
if (totalEquip < 200) {
  console.log('\nChecking alternate guardian var names...');
  const altNames = ['GUARDIAN_EQUIPMENT', 'CG_EQUIPMENT', 'CORE_GUARDIANS_EQUIPMENT'];
  for (const name of altNames) {
    const data = extractArray(name);
    if (data) console.log('  Found ' + name + ': ' + data.length);
  }
}
