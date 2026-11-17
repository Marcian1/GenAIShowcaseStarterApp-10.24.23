// Generates 08_rewire.mdl: the existing flows that hardcode the model name or the vector database now read both from the Config.
const { execFileSync } = require('child_process');
const fs = require('fs');
const M = 'AWSBedrockImplementation';
const describe = n => execFileSync('mxcli', ['-p', 'GenAIShowcaseStarterApp.mpr', '-c', `describe microflow ${M}.${n}`], { encoding: 'utf8', maxBuffer: 1 << 26 })
  .split('\n').filter(l => !/^WARNING|^Using project|^✓|^Warning: /.test(l)).join('\n');

const DB_RETRIEVE = /retrieve \$DatabaseConfiguration from PgVectorKnowledgeBase\.DatabaseConfiguration\s+where DisplayName = 'atlas-ceba-pp-vectordb'\s+first;/;
const DB_FROM_CONFIG = `$Config = call microflow ${M}.DS_Config();\n  retrieve $DatabaseConfiguration from $Config/${M}.Config_DatabaseConfiguration;`;
const CONFIG_CALL = new RegExp(`\\$Config = call microflow ${M}\\.DS_Config\\(\\);`, 'g');
const EMB = `$Config/${M}.Config_EmbeddingModel/ModelId`;
const CHAT = `$Config/${M}.Config_ChatModel/ModelId`;

const jobs = {
  ACT_TicketList_CreateChunks_StoreInVectorDB: t => t.replace(DB_RETRIEVE, DB_FROM_CONFIG),
  DS_TicketChunkList: t => t.replace(DB_RETRIEVE, DB_FROM_CONFIG),
  ACT_Pagehelper_Send_SearchItem: t => {
    t = t.replace(DB_RETRIEVE, DB_FROM_CONFIG);
    const first = t.indexOf(DB_FROM_CONFIG) + DB_FROM_CONFIG.length;
    t = t.slice(0, first) + t.slice(first).replace(CONFIG_CALL, '');
    return t.replace("ModelName = 'eu.cohere.embed-v4:0'", `ModelName = ${EMB}`);
  },
  SUB_BatchTicketList_CreateChunks_InsertInVectorDB: t => t.replace("ModelName = 'eu.cohere.embed-v4:0'", `ModelName = ${EMB}`),
  ACT_PageHelper_PromptRequest_Send: t => t
    .replace("ModelName = 'eu.anthropic.claude-sonnet-5'", `ModelName = ${CHAT}`)
    .replace('Max_tokens = 5000', `Max_tokens = $Config/${M}.Config_ChatModel/MaxTokens`)
    .replace("Effort = 'high'", `Effort = getKey($Config/${M}.Config_ChatModel/Effort)`),
};

let out = 'mdl 1;\n\n';
for (const [name, fix] of Object.entries(jobs)) {
  const before = describe(name);
  const after = fix(before);
  if (after === before) throw new Error('no change for ' + name);
  out += `drop microflow ${M}.${name};\n` + after.replace(/^mdl 1;\s*/, '') + '\n';
}
fs.writeFileSync('mdl-build/08_rewire.mdl', out);
console.log('written', out.length);
