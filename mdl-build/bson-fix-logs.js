// Data-protection fixes that MDL cannot make (activities inside loops, or in microflows that must not be recreated):
//  1. The "Creating text and chunks" log node wrote the full ticket text ($NewText/Value) at Info level once per chunk.
//     It now logs at Debug level, only the chunk index and the text length.
//  2. Error pop-ups showed $latestError/Stacktrace to the user. The stack trace is removed from the message
//     (the Java actions log the error code and AWS request id; the stack trace is available at Debug level).
// Usage: node bson-fix-logs.js <mprcontents dir | unit.mxunit>...
// Close Studio Pro first, then re-open the project. Re-running is safe (already patched units are skipped).
const fs = require('fs');
const path = require('path');
const L = require('./bson-lib.js');

const set = (els, name, value) => { els[els.indexOf(L.find(els, name))] = L.strEl(name, value); };
const exprOf = e => { const x = L.find(e.doc, 'Expression'); return x ? L.str(x) : ''; };
const STACK = /\s*Stacktrace:\s*\{2\}/;

function patchUnit(file) {
  const buf = fs.readFileSync(file);
  if (!buf.includes('Creating text and chunks') && !buf.includes('latestError/Stacktrace')) return;
  const root = L.parseDoc(buf, 0);
  let logs = 0, msgs = 0;
  L.visit(root.els, d => {
    const t = L.find(d, '$Type');
    if (!t) return;
    const type = L.str(t);
    if (type === 'Microflows$LogMessageAction') {
      const tpl = L.find(d, 'MessageTemplate');
      const text = L.find(tpl.doc, 'Text');
      if (!text || !L.str(text).startsWith('Creating text and chunks')) return;
      set(d, 'Level', 'Debug');
      set(d, 'Node', "'AWSBedrockImplementation'");
      set(tpl.doc, 'Text', 'Created chunk {1} ({2} characters)');
      const params = L.find(tpl.doc, 'Parameters').doc.filter(e => e.doc);
      if (params.length !== 2) throw new Error('unexpected log parameters in ' + file);
      set(params[0].doc, 'Expression', 'toString($currentIndex)');
      set(params[1].doc, 'Expression', 'toString(length($NewText/Value))');
      logs++;
    } else if (type === 'Microflows$ShowMessageAction') {
      const tpl = L.find(d, 'Template');
      const params = L.find(tpl.doc, 'Parameters');
      const list = params.doc.filter(e => e.doc);
      if (list.length !== 2 || exprOf(list[1]) !== '$latestError/Stacktrace') return;
      for (const item of L.find(L.find(tpl.doc, 'Text').doc, 'Items').doc.filter(e => e.doc)) {
        const tx = L.find(item.doc, 'Text');
        if (!STACK.test(L.str(tx))) throw new Error('unexpected message text in ' + file);
        set(item.doc, 'Text', L.str(tx).replace(STACK, ''));
      }
      params.doc.splice(params.doc.indexOf(list[1]), 1);
      msgs++;
    }
  });
  if (!logs && !msgs) return;
  fs.writeFileSync(file, L.writeDoc(root.els));
  console.log(`patched ${path.basename(file)}: ${logs} log node(s), ${msgs} message(s)`);
}

function walk(p) {
  if (fs.statSync(p).isDirectory()) fs.readdirSync(p).forEach(f => walk(path.join(p, f)));
  else if (p.endsWith('.mxunit')) patchUnit(p);
}
process.argv.slice(2).forEach(walk);
