# Test suite

Run everything after **every** change (this is a standing project rule, see `CLAUDE.md`):

    powershell -ExecutionPolicy Bypass -File tests/run-all.ps1        # all layers (~5 min; the UI layer alone is ~1 min once the app is up)
    powershell -ExecutionPolicy Bypass -File tests/run-all.ps1 -SkipUi # faster, no browser

| Layer | Where | What it covers |
|---|---|---|
| Mock server | `bedrock-local-emulator/aws-mock/server.test.js` (`node --test`) | STS, SigV4, Claude/GPT/Cohere/Titan/Rerank wire formats |
| Project check | `mxcli docker check` | model consistency, 0 errors expected |
| Domain layout | `tests/domain-layout.test.js` | no overlapping entities in the domain model (keeps it readable) |
| MDL microflow tests | `tests/mdl/*.test.mdl` via `mxcli test --local` | GPT export/import mappings, family dispatch defaults, seeding on a fresh database. Helpers: module `BedrockTests` (`mdl-build/40_test_helpers.mdl`) |
| UI tests | `tests/ui/*.spec.js` (Playwright) | login, models list, Try for every family against the mock, add-model dialog, Ask tickets with Claude and GPT |

How the UI layer runs: `run-all.ps1` starts the mock in `MOCK_BACKEND=hash` mode, enables the demo user `MockTester`
(`bedrock-local-emulator/enable_test_user.mdl`), starts the app on :8091, runs Playwright, then stops the app and removes the demo user.
The .mpr is locked by a running app or Studio Pro, so close Studio Pro first.

The UI tests need the local data to exist: models seeded (Claude, GPT OSS 120B, GPT OSS 20B, Cohere, Titan), tickets and chunks in pgvector (hash embeddings).
Reranking, `search_query` and the Documentation page are covered by `tests/mdl/rerank.test.mdl` (helpers in `mdl-build/41_test_helpers_rerank.mdl`), `tests/ui/rerank-docs.spec.js` and the Rerank tests of the mock.
Results: `tests/mdl-results.xml`, `tests/ui-results.xml`.

Adding tests: new behaviour gets a test in the same change. MDL tests call helper microflows (add them to `mdl-build/40_test_helpers.mdl`).
Note `mdl-build/30_gpt_oss.mdl` must keep every value of `ENUM_ModelFamily` (including `Rerank`) because it recreates the enumeration.

Note: `mxcli test` can leave the temporary module `MxTest` and the after-startup setting behind (it holds its own lock while cleaning up). `run-all.ps1` removes them. If a run is interrupted, run: `mxcli -p GenAIShowcaseStarterApp.mpr -c "ALTER SETTINGS RUNTIME (AfterStartupMicroflow: 'General.ASU_MigrateData')"` and `DROP MODULE MxTest`.
