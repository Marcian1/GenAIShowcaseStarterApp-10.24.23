// Shared minimal BSON reader/writer (same code as bson-patch.js) used by bson-fix-logs.js.
const fs = require('fs');
const text = fs.readFileSync(require('path').join(__dirname, 'bson-patch.js'), 'utf8').split('const [cmd, file')[0];
module.exports = new Function('require', text + ';return { parseDoc, writeDoc, str, strEl, find, visit };')(require);
