---
name: mendix-testing
description: Test Mendix microflow logic with mxcli test (.test.mdl and .test.md files), run it locally or with Docker, read failures, and add regression tests for changes. Use when asked to test, verify behaviour, or prove a microflow works.
---
# Testing microflows

Options: `mxcli test --help`. Check a test file without running it: `mxcli check suite.test.mdl` (fast, finds most mistakes, including bad `@expect`/`@verify` as MDL-TEST01).

## Test file (`.test.mdl`)
Blocks end with a line containing only `/`. One `@test` per block, otherwise one test is silently dropped.
```mdl
/**
 * @test Concatenate names
 * @expect $result = 'John Doe'
 */
$result = CALL MICROFLOW Shop.SUB_ConcatNames(FirstName = 'John', LastName = 'Doe');
/
```
A header comment at the top of the file may carry `@setup` for every test. Run `mxcli fmt --upgrade -w <file>` to modernise spelling.

## Run
```
mxcli test tests/ -p app.mpr --list          # list only
mxcli test tests/suite.test.mdl -p app.mpr   # run one file
mxcli test tests/ -p app.mpr --junit out.xml # CI report
```
It needs a way to run the app: `--local` (mxcli boots the runtime itself; the only option without a Docker daemon) or Docker (`mxcli docker init`, buildable app). Add `--skip-build` to reuse a deployment, `--verbose` for runtime logs.

## Writing good tests
- One behaviour per test. Cover: the normal path, each branch, empty/null input, validation failure, error handler.
- Test entity operations: create, change, commit, then retrieve and assert.
- Test the microflow, not the page. UI testing is a different tool (`mxcli playwright`).
- Microflows that use `[%CurrentUser%]` or `$currentUser` fail under test (system context, no user): pass the user or account as a parameter and test that flow.
- `retrieve ... first` binds one object; do not `head()` it in a test (MDL-RETRIEVE01, CE0097).
- Prefer asserting on returned values and committed data over log text.

## Reading failures
| Failure | Meaning | Fix |
|---|---|---|
| exception during execution: <msg> | runtime error in the flow | read the message; check entity references and attribute types |
| Expected X but got Y | logic wrong | fix the flow |
| Test was not executed | runtime died earlier | read earlier failures and logs |
| port already in use | another process holds a `--local` port | rerun with `--app-port 9081` |

After a fix, rerun the failing test, then the whole suite, then `mxcli lint`.