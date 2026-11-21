# Build scripts for the AWS Bedrock demo page

These MDL scripts built the new Setup / Models / Tickets / Ask tickets page in `AWSBedrockImplementation`.
They are kept so the changes can be read in one place. The project itself is the source of truth; you do not need to run them again.

| Script | What it did |
|---|---|
| `01`, `02`, `09`, `12`, `13`, `15`, `19` | Domain model: `BedrockModel`, `TrySession`, `AskSession`, `AskEntry`, `AskSource`, new `Config` attributes and associations, layout and annotations |
| `03_java.mdl` | Java actions `JA_BedrockTestConnection` and `JA_EmbeddingResponse_Summary` |
| `04`, `05`, `06`, `07`, `18`, `22`, `24`, `26` | Microflows (config, models, try-out, tickets, ask, status) |
| `08_rewire.mdl` (made by `rewire.js`) | Existing flows now read the model and database from the Config instead of hardcoded names |
| `11`, `14`, `16` | Snippets, pop-up pages and the page itself |
| `10`, `17` | Security grants |
| `42_haiku.mdl` | Seeds Claude Haiku 5.5 as an optional chat model (by ModelId, so existing apps get it too; Sonnet stays the default) |
| `43_model_delete_refresh.mdl` | Deleting a model recomputes the setup status, so the badges and pickers no longer show a deleted model until the page is reloaded |
| `44_try_hide_reranker.mdl` | The Try pop-up no longer lists the reranking model (it cannot be tried) |
| `45_try_empty_model_fix.mdl` | Clearing the model picker in the Try pop-up no longer raises "An error has occurred while handling the request" |
| `46_try_send_needs_model.mdl` | The Try pop-up asks for a model instead of showing an empty result when none is picked |
| `47_pg_test_error_message.mdl` | The Test button of a vector database shows the reason when the test itself fails, instead of the generic error |
| `48_ticket_delimiters.mdl` | Prompt-injection hardening: every ticket sent to the chat model is wrapped in `<ticket number="N">` tags so ticket text is separated from the instructions and the question |
| `34_rerank.mdl`, `36_rerank_pick.mdl` | Reranking: model family Rerank, Config settings, Java action `JA_RerankChunks`, the new `ACT_Ask`, the Models and Ask tickets UI. `36` fixes the selection of the default reranker |
| `bson-fix-query-input-type.js` | The question is embedded with Cohere input type `search_query` (MDL cannot recreate `ACT_Pagehelper_Send_SearchItem`). Run it with Studio Pro closed, then `mxcli fix hashes --repair` |
| `35_documentation.mdl` | The Documentation page, the Documentation button on the demo page and the menu item |

Things worth knowing:

- Page expressions cannot follow associations, so `SUB_Config_RefreshStatus` copies names and flags onto the `Config`. Call it after anything that changes the setup.
- `ACT_Pagehelper_Send_SearchItem` and `SUB_BatchTicketList_CreateChunks_InsertInVectorDB` contain an import mapping with the parameter `ChunkCollection`. MDL cannot write that parameter, so it was restored with `bson-patch.js`. Do not drop and recreate these two microflows with MDL.
- After creating pages with Combo box widgets from MDL, run `mxcli fix widgets -p GenAIShowcaseStarterApp.mpr`, otherwise the build reports CE0463.
- `fix-expressions.js`, `fix-text-params.js` and `polish.js` are one-off text fixes applied to the snippet scripts.

## Data-protection patch (`bson-fix-logs.js`)
MDL cannot edit activities inside a loop, so `bson-fix-logs.js` patched the stored microflows directly: the "Creating text and chunks"
log node no longer writes the ticket text (Debug level, chunk index and text length only) and the error pop-ups no longer show the stack trace.
Run `node mdl-build/bson-fix-logs.js mprcontents` with Studio Pro closed; it skips units that are already patched.
