// Adds the documentation text (the /** */ comment) to microflows of AWSBedrockImplementation that have none.
// MDL cannot do it without recreating the microflow, and some of these (import mapping parameter) must not be recreated.
// Usage: node mdl-build/bson-set-docs.js   (run from the project folder, Studio Pro and the app closed)
// Then: mxcli fix hashes -p GenAIShowcaseStarterApp.mpr --repair
// Re-running is safe: it only overwrites the text of the microflows listed here.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./bson-lib.js');

const DOCS = {
  ACT_Ask: 'The Ask button of the Ask tickets tab. Embeds the question (input type search_query), fetches candidate tickets from pgvector, reranks them with the selected reranking model and keeps the best ones (without a reranker: filters by the match strictness), sends the numbered tickets to the chat model and adds the answer and its sources to the session.',
  ACT_Pagehelper_Send_SearchItem: 'Embeds the search text with Cohere input type search_query and fetches the nearest chunks from the pgvector knowledge base into the PageHelper (MaxResults, MinimumSimilarity). Used by the Search and ask tab and by ACT_Ask.',
  ACT_PageHelper_PromptRequest_Send: 'Sends the system prompt, the ticket data and the user prompt to the chat model selected on the Config (Claude or GPT) and stores the answer text on the PageHelper.',
  ACT_TicketList_CreateChunks_StoreInVectorDB: 'Deletes the knowledge base and refills it: reads the tickets in batches of 96 (the Cohere limit per request) and embeds and stores each batch. Called by the Create / Rebuild chunks buttons.',
  SUB_BatchTicketList_CreateChunks_InsertInVectorDB: 'Turns one batch of tickets into chunks (subject, description, reproduction steps), embeds them with Cohere input type search_document and inserts them in the pgvector knowledge base.',
  SUB_96TicketList_CreateEmbeddings_Store: 'Older version of the batch indexing with a fixed database name. Not used by the demo page, which uses SUB_BatchTicketList_CreateChunks_InsertInVectorDB.',
  SUB_BedrockModel_SeedDefaults: 'Creates the default models (Claude, GPT, Cohere Embed, Titan) when there are none, and the Cohere Rerank model when no Rerank model exists and the reranker was not picked before.',
  SUB_Config_PickMissingDefaults: 'Selects a chat model, an embedding model and a vector database on the Config when none is selected, and the default reranker once (RerankPicked), so clearing the reranker afterwards sticks.',
  SUB_TrySession_Dispatch: 'Picks the request builder that matches the family of the model in the Try pop-up. A Rerank model only logs a warning: it is used by the Ask tickets tab.',
  ACT_ListFoundationModels: 'The List models in AWS button: shows the foundation models Bedrock offers in the configured region.',
  ACT_TicketList_RePopulate: 'Replaces all tickets with the sample tickets (the Load sample tickets button). Returns the new list.',
  ACT_AnthropicRequest_Send: 'Building block: sends an AnthropicRequest to the model in the ModelHelper and shows the response. Not used by the demo page, which has the Try and Ask flows.',
  ACT_CohereRequest_Send: 'Building block: sends a CohereRequest (embeddings) to the model in the ModelHelper. Not used by the demo page.',
  ACT_TitalEmbeddingsV2Request_Send: 'Building block: sends a Titan Embeddings V2 request to the model in the ModelHelper. Not used by the demo page.',
  ACT_Text_Create: 'Building block: adds a Text to the Cohere request.',
  ACT_Embedding_type_Create: 'Building block: adds an embedding type to the Cohere request.',
  ACT_EmbeddingType_Create: 'Building block: adds an embedding type to the Titan request.',
  ACT_EmbeddingType_Delete: 'Building block: removes an embedding type from the Titan request.',
  DS_AnthropicRequest: 'Building block: a new AnthropicRequest with default values.',
  DS_Cohere_Request: 'Building block: a new CohereRequest with default values.',
  DS_TitanEmbeddingsV2_Request: 'Building block: a new Titan Embeddings V2 request with default values.',
  DS_ModelHelper: 'Building block: a ModelHelper that carries a model name.',
  DS_PageHelper: 'Data source: a new PageHelper with the default system prompt for the ticket assistant.',
  DS_TicketChunkList: 'Data source: the chunks stored in the knowledge base of the selected database (the chunk grid of the Tickets tab).',
  DS_TicketList: 'Data source: all tickets.',
  SUB_Transaction_End_Start: 'Ends and starts a database transaction, to commit a batch and free memory in long loops.',
};

const names = Object.keys(DOCS).map((n) => `'${n}'`).join(', ');
const out = execFileSync('mxcli', ['-p', 'GenAIShowcaseStarterApp.mpr', '-c',
  `SELECT Id, Name FROM CATALOG.MICROFLOWS WHERE ModuleName = 'AWSBedrockImplementation' AND Name IN (${names})`], { encoding: 'utf8' });
let done = 0;
for (const line of out.split('\n')) {
  const m = /^\|\s*([0-9a-f-]{36})\s*\|\s*(\S+)\s*\|/.exec(line);
  if (!m) continue;
  const [, id, name] = m;
  const file = path.join('mprcontents', id.slice(0, 2), id.slice(2, 4), id + '.mxunit');
  const root = L.parseDoc(fs.readFileSync(file), 0);
  const i = root.els.indexOf(L.find(root.els, 'Documentation'));
  if (i < 0) throw new Error('no Documentation field in ' + file);
  if (L.str(root.els[i]) === DOCS[name]) continue;
  root.els[i] = L.strEl('Documentation', DOCS[name]);
  fs.writeFileSync(file, L.writeDoc(root.els));
  done++;
  console.log('documented', name);
}
console.log(done + ' microflow(s) updated');
