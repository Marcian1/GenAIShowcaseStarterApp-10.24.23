// mxcli cannot set the role of the built-in administrator account (ProjectSecurity.AdminUserRole), so patch it directly.
// Usage: node set-admin-role.js <ProjectSecurity .mxunit file> <role name>
// The unit is the one containing "Security$ProjectSecurity" (grep -rla 'Security\$ProjectSecurity' mprcontents).
const fs = require('fs');
const text = fs.readFileSync(require('path').join(__dirname, 'bson-patch.js'), 'utf8').split('const [cmd, file')[0];
const { parseDoc, writeDoc, str, strEl, find } = new Function('require', text + ';return { parseDoc, writeDoc, str, strEl, find };')(require);

const [file, role] = process.argv.slice(2);
if (!file || !role) throw new Error('usage: node set-admin-role.js <unit file> <role name>');
const root = parseDoc(fs.readFileSync(file), 0);
const type = find(root.els, '$Type');
if (!type || str(type) !== 'Security$ProjectSecurity') throw new Error('not a Security$ProjectSecurity unit');
const el = find(root.els, 'AdminUserRole');
if (!el) throw new Error('AdminUserRole not found');
console.log('AdminUserRole:', JSON.stringify(str(el)), '->', JSON.stringify(role));
root.els[root.els.indexOf(el)] = strEl('AdminUserRole', role);
fs.writeFileSync(file, writeDoc(root.els));
