// Minimal BSON reader/writer that keeps every element's type and bytes, used to restore the one field mxcli cannot write:
// the parameter variable of an import mapping call. Usage: node bson-patch.js show <unit> | set <unit> <mapping> <variable>
const fs = require('fs');

function parseDoc(buf, off) {
  const len = buf.readInt32LE(off);
  const end = off + len;
  let p = off + 4;
  const els = [];
  while (p < end - 1) {
    const type = buf[p++];
    let q = p;
    while (buf[q] !== 0) q++;
    const name = buf.toString('utf8', p, q);
    p = q + 1;
    const el = { type, name };
    if (type === 0x03 || type === 0x04) { const sub = parseDoc(buf, p); el.doc = sub.els; el.array = type === 0x04; p = sub.end; }
    else {
      let size;
      switch (type) {
        case 0x01: case 0x09: case 0x11: case 0x12: size = 8; break;
        case 0x02: case 0x0D: case 0x0E: size = 4 + buf.readInt32LE(p); break;
        case 0x05: size = 4 + 1 + buf.readInt32LE(p); break;
        case 0x07: size = 12; break;
        case 0x08: size = 1; break;
        case 0x0A: size = 0; break;
        case 0x10: size = 4; break;
        case 0x13: size = 16; break;
        default: throw new Error('unsupported bson type 0x' + type.toString(16) + ' at ' + p);
      }
      el.raw = buf.subarray(p, p + size);
      p += size;
    }
    els.push(el);
  }
  return { els, end };
}

function writeDoc(els) {
  const parts = [];
  for (const el of els) {
    parts.push(Buffer.from([el.type]), Buffer.from(el.name + '\0', 'utf8'));
    parts.push(el.doc ? writeDoc(el.doc) : el.raw);
  }
  const body = Buffer.concat(parts);
  const head = Buffer.alloc(4);
  head.writeInt32LE(body.length + 5);
  return Buffer.concat([head, body, Buffer.from([0])]);
}

const str = el => el.raw.toString('utf8', 4, el.raw.length - 1);
const strEl = (name, value) => { const b = Buffer.from(value + '\0', 'utf8'); const l = Buffer.alloc(4); l.writeInt32LE(b.length); return { type: 0x02, name, raw: Buffer.concat([l, b]) }; };
const find = (els, name) => els.find(e => e.name === name);

function visit(els, fn) {
  for (const el of els) { if (el.doc) { fn(el.doc); visit(el.doc, fn); } }
}

const [cmd, file, mapping, variable] = process.argv.slice(2);
const buf = fs.readFileSync(file);
const root = parseDoc(buf, 0);
let n = 0;
visit(root.els, doc => {
  const t = find(doc, '$Type');
  if (!t || str(t) !== 'Microflows$ImportMappingCall') return;
  const m = find(doc, 'ReturnValueMapping');
  if (!m || (mapping && str(m) !== mapping)) return;
  const p = find(doc, 'ParameterVariableName');
  n++;
  if (cmd === 'show') console.log(str(m), '=> ParameterVariableName =', JSON.stringify(p ? str(p) : null));
  if (cmd === 'set') { const i = doc.indexOf(p); doc[i] = strEl('ParameterVariableName', variable); }
});
if (cmd === 'set') {
  if (!n) throw new Error('no import mapping call patched');
  fs.writeFileSync(file, writeDoc(root.els));
  console.log('patched', n, 'call(s) in', file);
}
