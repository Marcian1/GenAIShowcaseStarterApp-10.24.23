// The question must be embedded with Cohere input_type "search_query" (documents stay "search_document").
// MDL cannot recreate ACT_Pagehelper_Send_SearchItem (its import mapping parameter is lost), so this patches the stored microflow.
// Usage: node bson-fix-query-input-type.js <mprcontents dir>   (Studio Pro closed). Re-running is safe.
const fs = require('fs');
const path = require('path');
const L = require('./bson-lib.js');

function patchUnit(file) {
  const buf = fs.readFileSync(file);
  if (!buf.includes('ACT_Pagehelper_Send_SearchItem') || !buf.includes('search_document')) return;
  const root = L.parseDoc(buf, 0);
  const name = L.find(root.els, 'Name');
  if (!name || L.str(name) !== 'ACT_Pagehelper_Send_SearchItem') return;
  let n = 0;
  const fix = els => {
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      if (el.doc) fix(el.doc);
      else if (el.type === 0x02 && L.str(el).includes("'search_document'")) {
        els[i] = L.strEl(el.name, L.str(el).replace("'search_document'", "'search_query'"));
        n++;
      }
    }
  };
  fix(root.els);
  if (!n) return;
  fs.writeFileSync(file, L.writeDoc(root.els));
  console.log(`patched ${path.basename(file)}: ${n} value(s)`);
}
function walk(p) {
  if (fs.statSync(p).isDirectory()) fs.readdirSync(p).forEach(f => walk(path.join(p, f)));
  else if (p.endsWith('.mxunit')) patchUnit(p);
}
process.argv.slice(2).forEach(walk);
