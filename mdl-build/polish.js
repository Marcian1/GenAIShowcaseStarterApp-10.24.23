// UI polish found while testing in the browser: vertical forms, no column selector icon, correct singular/plural.
const fs = require('fs');
const plural = (n, one, many) => `toString(${n}) + (if ${n} = 1 then ' ${one}' else ' ${many}')`;

function edit(file, fn) { const t = fs.readFileSync(file, 'utf8'); const r = fn(t); fs.writeFileSync(file, r); }

edit('mdl-build/11_snippets_setup.mdl', t => t
  .replace('dataview dvAws (DataSource: $Config)', 'dataview dvAws (DataSource: $Config, FormOrientation: Vertical)')
  .replace('dataview dvDbPicker (DataSource: $Config)', 'dataview dvDbPicker (DataSource: $Config, FormOrientation: Vertical)')
  .replace('dataview dvModelsInUse (DataSource: $Config)', 'dataview dvModelsInUse (DataSource: $Config, FormOrientation: Vertical)')
  .replace('datagrid dgDatabases (DataSource:', 'datagrid dgDatabases (columnsHidable: false, DataSource:')
  .replace('datagrid dgModels (DataSource:', 'datagrid dgModels (columnsHidable: false, DataSource:')
  .replace("toString($Config/TicketCount) + ' tickets loaded'", `${plural('$Config/TicketCount', 'ticket', 'tickets')} + ' loaded'`)
  .replace("toString($Config/ChunkCount) + ' chunks stored'", `${plural('$Config/ChunkCount', 'chunk', 'chunks')} + ' stored'`)
  .replace("toString($Config/StaleTicketCount) + ' tickets changed since it was built. Rebuild.'", `${plural('$Config/StaleTicketCount', 'ticket', 'tickets')} + ' changed since it was built. Rebuild.'`));

edit('mdl-build/14_snippets_demo.mdl', t => t
  .replace('datagrid dgTickets (DataSource:', 'datagrid dgTickets (columnsHidable: false, DataSource:')
  .replace('dataview dvKnowledgeBase (DataSource: $Config)', 'dataview dvKnowledgeBase (DataSource: $Config, FormOrientation: Vertical)')
  .replace('dataview dvPageHelper (DataSource: microflow AWSBedrockImplementation.DS_PageHelper)', 'dataview dvPageHelper (DataSource: microflow AWSBedrockImplementation.DS_PageHelper, FormOrientation: Vertical)')
  .replace('dataview dvAskSession (DataSource: microflow AWSBedrockImplementation.DS_AskSession)', 'dataview dvAskSession (DataSource: microflow AWSBedrockImplementation.DS_AskSession, FormOrientation: Vertical)')
  .replace("Content: '{1} tickets changed since the knowledge base was built. Rebuild to include the changes.', ContentParams: ({1} = toString($Config/StaleTicketCount))", `Content: '{1} changed since the knowledge base was built. Rebuild to include the changes.', ContentParams: ({1} = ${plural('$Config/StaleTicketCount', 'ticket', 'tickets')})`)
  .replace("Content: '{1} chunks stored in {2} with {3}. Search and ask is ready.', ContentParams: ({1} = toString($Config/ChunkCount),", `Content: '{1} stored in {2} with {3}. Search and ask is ready.', ContentParams: ({1} = ${plural('$Config/ChunkCount', 'chunk', 'chunks')},`)
  .replace("Content: '{1} tickets indexed', ContentParams: ({1} = toString($Config/ChunkCount))", `Content: '{1} indexed', ContentParams: ({1} = ${plural('$Config/ChunkCount', 'ticket', 'tickets')})`)
  .replace("Content: '{1} tickets changed since indexing. Answers do not include the changes yet.', ContentParams: ({1} = toString($Config/StaleTicketCount))", `Content: '{1} changed since indexing. Answers do not include the changes yet.', ContentParams: ({1} = ${plural('$Config/StaleTicketCount', 'ticket', 'tickets')})`)
  .replace("Content: '{1} tickets · {2} s · {3}', ContentParams: ({1} = toString($currentObject/SourceCount),", `Content: '{1} · {2} s · {3}', ContentParams: ({1} = ${plural('$currentObject/SourceCount', 'ticket', 'tickets')},`));

for (const f of ['mdl-build/11_snippets_setup.mdl', 'mdl-build/14_snippets_demo.mdl']) {
  const t = fs.readFileSync(f, 'utf8');
  console.log(f, 'FormOrientation:', (t.match(/FormOrientation: Vertical/g) || []).length, 'columnsHidable:', (t.match(/columnsHidable: false/g) || []).length, "plural:", (t.match(/then ' ticket'|then ' chunk'/g) || []).length);
}
