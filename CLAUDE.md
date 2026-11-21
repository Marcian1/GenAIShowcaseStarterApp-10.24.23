# GenAIShowcaseStarterApp

## Test suite (mandatory)
The project has a test suite in `tests/` (see `tests/README.md`). **After every change** (model/MDL, Java, mock server, UI) run:

    powershell -ExecutionPolicy Bypass -File tests/run-all.ps1

and fix anything it breaks before reporting done. Add or update tests for every new behaviour in the same change.
Layers: mock server tests (`bedrock-local-emulator/aws-mock/server.test.js`), MDL microflow tests (`tests/mdl`, helpers in module `BedrockTests` from `mdl-build/40_test_helpers.mdl`), Playwright UI tests (`tests/ui`).

## Notes
- The project is edited through `mxcli` MDL scripts in `mdl-build/`. Studio Pro or a running app locks the .mpr: stop the app (`mxcli run stop`) before `mxcli exec`.
