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

Things worth knowing:

- Page expressions cannot follow associations, so `SUB_Config_RefreshStatus` copies names and flags onto the `Config`. Call it after anything that changes the setup.
- `ACT_Pagehelper_Send_SearchItem` and `SUB_BatchTicketList_CreateChunks_InsertInVectorDB` contain an import mapping with the parameter `ChunkCollection`. MDL cannot write that parameter, so it was restored with `bson-patch.js`. Do not drop and recreate these two microflows with MDL.
- After creating pages with Combo box widgets from MDL, run `mxcli fix widgets -p GenAIShowcaseStarterApp.mpr`, otherwise the build reports CE0463.
- `fix-expressions.js`, `fix-text-params.js` and `polish.js` are one-off text fixes applied to the snippet scripts.

## Data-protection patch (`bson-fix-logs.js`)
MDL cannot edit activities inside a loop, so `bson-fix-logs.js` patched the stored microflows directly: the "Creating text and chunks"
log node no longer writes the ticket text (Debug level, chunk index and text length only) and the error pop-ups no longer show the stack trace.
Run `node mdl-build/bson-fix-logs.js mprcontents` with Studio Pro closed; it skips units that are already patched.
