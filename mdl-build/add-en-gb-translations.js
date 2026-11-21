// Finds (and with --write fixes) Texts$Text objects of module units that have an en_US text but no en_GB text.
// Usage (project folder, Studio Pro and the app closed): node mdl-build/add-en-gb-translations.js . AWSBedrockImplementation [--write]
// Then run: mxcli fix hashes --repair -p GenAIShowcaseStarterApp.mpr
// Why: text created from MDL only gets the project's default language. An app that imports the module with English UK as default
// language reports CE4899 "Empty caption" for every text without an en_GB translation.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const src = fs.readFileSync(path.join(path.resolve(process.argv[2]), 'fix_en_us_translations.js'), 'utf8');
const libSrc = src.slice(src.indexOf('function parseDoc'), src.indexOf('const get = '));
const { parseDoc, ser } = new Function('crypto', libSrc + '\nreturn {parseDoc, ser};')(crypto);
const get = (e, k) => e.find(x => x.key === k);

const projectDir = path.resolve(process.argv[2]), moduleName = process.argv[3], write = process.argv.includes('--write');
const db = new DatabaseSync(path.join(projectDir, 'GenAIShowcaseStarterApp.mpr'), { readOnly: true });
const guid = (b) => {
  const h = Buffer.from(b).toString('hex');
  const le = (s) => s.match(/../g).reverse().join('');
  return `${le(h.slice(0, 8))}-${le(h.slice(8, 12))}-${le(h.slice(12, 16))}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};
const units = new Map();
for (const r of db.prepare('select UnitID, ContainerID, ContainmentName from Unit').all()) {
  units.set(guid(r.UnitID), { container: r.ContainerID ? guid(r.ContainerID) : null, name: r.ContainmentName });
}
const file = (g) => path.join(projectDir, 'mprcontents', g.slice(0, 2), g.slice(2, 4), g + '.mxunit');
const top = new Map();
for (const g of units.keys()) {
  const f = file(g);
  if (!fs.existsSync(f)) continue;
  try {
    const [doc] = parseDoc(fs.readFileSync(f), 0);
    top.set(g, { type: (get(doc, '$Type') || {}).v, name: (get(doc, 'Name') || {}).v });
  } catch (e) { /* ignore */ }
}
const moduleOf = (g) => {
  const seen = new Set();
  while (g && !seen.has(g)) {
    seen.add(g);
    const t = top.get(g);
    if (t && t.type === 'Projects$ModuleImpl') return t.name;
    const u = units.get(g);
    g = u && u.container;
  }
  return null;
};

let totalFixed = 0; const perType = {};
function walk(e, ctx) {
  const type = get(e, '$Type');
  if (type && type.v === 'Texts$Text') {
    const items = get(e, 'Items');
    if (items) {
      const trans = items.v.filter(x => x.t === 0x03);
      const lang = x => get(x.v, 'LanguageCode').v;
      const gb = trans.find(x => lang(x) === 'en_GB'), us = trans.find(x => lang(x) === 'en_US');
      const usText = us && get(us.v, 'Text').v;
      const gbText = gb && get(gb.v, 'Text').v;
      if (usText && !gbText) {
        if (!gb) {
          const ne = us.v.map(x => ({ ...x }));
          get(ne, 'LanguageCode').v = 'en_GB';
          const id = get(ne, '$ID'); id.v = { sub: id.v.sub, data: crypto.randomBytes(16) };
          items.v.splice(items.v.indexOf(us) + 1, 0, { t: 0x03, key: '0', v: ne });
          items.v.forEach((x, i) => { x.key = String(i); });
        } else {
          get(gb.v, 'Text').v = usText;
        }
        ctx.count++;
      }
    }
  }
  for (const x of e) if ((x.t === 0x03 || x.t === 0x04) && Array.isArray(x.v)) walk(x.v, ctx);
}
const samples = [];
for (const [g] of units) {
  if (moduleOf(g) !== moduleName) continue;
  const f = file(g);
  if (!fs.existsSync(f)) continue;
  const buf = fs.readFileSync(f);
  let doc; try { [doc] = parseDoc(buf, 0); } catch (e) { continue; }
  if (!ser(doc).equals(buf)) { console.error('roundtrip mismatch, skipping', g); continue; }
  const ctx = { count: 0 };
  walk(doc, ctx);
  if (ctx.count) {
    const t = top.get(g) || {};
    perType[t.type] = (perType[t.type] || 0) + ctx.count;
    totalFixed += ctx.count;
    if (samples.length < 12) samples.push(`${t.type} ${t.name || ''}: ${ctx.count}`);
    if (write) fs.writeFileSync(f, ser(doc));
  }
}
console.log(JSON.stringify({ module: moduleName, textsMissingEnGB: totalFixed, perType, samples, written: write }, null, 1));
