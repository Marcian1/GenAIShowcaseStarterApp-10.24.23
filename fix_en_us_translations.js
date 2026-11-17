// Copies en_GB text translations to en_US where en_US is missing/empty (project default+only language is en_US).
// Usage: node fix_en_us_translations.js <unit.mxunit> [--write]
const fs = require('fs'), crypto = require('crypto');
function parseDoc(b, o) { // returns [entries, end]
  const len = b.readInt32LE(o), end = o + len; let p = o + 4; const e = [];
  while (p < end - 1) {
    const t = b[p++]; let k = p; while (b[p] !== 0) p++; const key = b.toString('utf8', k, p); p++;
    let v;
    switch (t) {
      case 0x01: v = b.readDoubleLE(p); p += 8; break;
      case 0x02: { const l = b.readInt32LE(p); v = b.toString('utf8', p + 4, p + 4 + l - 1); p += 4 + l; break; }
      case 0x03: case 0x04: { const r = parseDoc(b, p); v = r[0]; p = r[1]; break; }
      case 0x05: { const l = b.readInt32LE(p); v = { sub: b[p + 4], data: b.subarray(p + 5, p + 5 + l) }; p += 5 + l; break; }
      case 0x07: v = b.subarray(p, p + 12); p += 12; break;
      case 0x08: v = b[p++]; break;
      case 0x09: case 0x12: v = b.subarray(p, p + 8); p += 8; break;
      case 0x0A: v = null; break;
      case 0x10: v = b.readInt32LE(p); p += 4; break;
      default: throw new Error('bson type ' + t.toString(16) + ' key ' + key);
    }
    e.push({ t, key, v });
  }
  return [e, end];
}
function ser(e) {
  const parts = [];
  for (const { t, key, v } of e) {
    parts.push(Buffer.from([t]), Buffer.from(key + '\0'));
    switch (t) {
      case 0x01: { const x = Buffer.alloc(8); x.writeDoubleLE(v); parts.push(x); break; }
      case 0x02: { const s = Buffer.from(v + '\0'); const l = Buffer.alloc(4); l.writeInt32LE(s.length); parts.push(l, s); break; }
      case 0x03: case 0x04: parts.push(ser(v)); break;
      case 0x05: { const l = Buffer.alloc(5); l.writeInt32LE(v.data.length); l[4] = v.sub; parts.push(l, v.data); break; }
      case 0x07: case 0x09: case 0x12: parts.push(v); break;
      case 0x08: parts.push(Buffer.from([v])); break;
      case 0x0A: break;
      case 0x10: { const x = Buffer.alloc(4); x.writeInt32LE(v); parts.push(x); break; }
    }
  }
  const body = Buffer.concat(parts), h = Buffer.alloc(4); h.writeInt32LE(body.length + 5);
  return Buffer.concat([h, body, Buffer.from([0])]);
}
const get = (e, k) => e.find(x => x.key === k);
let changed = 0;
function walk(e) {
  const type = get(e, '$Type');
  if (type && type.v === 'Texts$Text') {
    const items = get(e, 'Items');
    if (items) {
      const trans = items.v.filter(x => x.t === 0x03);
      const lang = x => get(x.v, 'LanguageCode').v;
      const gb = trans.find(x => lang(x) === 'en_GB'), us = trans.find(x => lang(x) === 'en_US');
      const gbText = gb && get(gb.v, 'Text').v;
      if (gbText) {
        if (!us) {
          const ne = gb.v.map(x => ({ ...x }));
          get(ne, 'LanguageCode').v = 'en_US';
          const id = get(ne, '$ID'); id.v = { sub: id.v.sub, data: crypto.randomBytes(16) };
          const idx = items.v.indexOf(gb);
          items.v.splice(idx + 1, 0, { t: 0x03, key: String(0), v: ne });
          items.v.forEach((x, i) => { x.key = String(i); });
          changed++;
        } else if (!get(us.v, 'Text').v) { get(us.v, 'Text').v = gbText; changed++; }
      }
    }
  }
  for (const x of e) if ((x.t === 0x03 || x.t === 0x04) && Array.isArray(x.v)) walk(x.v);
}
const file = process.argv[2], buf = fs.readFileSync(file);
const [doc] = parseDoc(buf, 0);
const re = ser(doc);
if (!re.equals(buf)) { console.error('ROUNDTRIP MISMATCH', re.length, buf.length); process.exit(2); }
console.log('roundtrip ok');
walk(doc);
console.log('texts fixed:', changed);
if (process.argv.includes('--write') && changed) { fs.writeFileSync(file, ser(doc)); console.log('written'); }
