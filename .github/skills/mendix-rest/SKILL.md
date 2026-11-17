---
name: mendix-rest
description: Consume and publish REST services in Mendix with MDL - OpenAPI import, REST client documents, inline REST CALL, JSON structures, import/export mappings, authentication, error handling. Use for any integration with an HTTP API.
---
# REST in MDL

Syntax: `mxcli syntax rest` (`rest.consumed`, `rest.call`, `rest.published`); also `odata`, `sql`, `business-events`. What the app already has: `LIST CONSUMED REST SERVICES`, `LIST PUBLISHED REST SERVICES`, `LIST EXTERNAL ENTITIES`. Find contracts: `mxcli catalog`, `mxcli marketplace`.

## Pick an approach
| Situation | Use |
|---|---|
| API has an OpenAPI 3.0 spec | Import it: generates the REST client document in one command (fastest, least error-prone) |
| No spec, or you need fine control | Manual REST client document + a microflow that calls it |
| One-off call, dynamic URL, prototype | Inline `REST CALL` in a microflow |
| Map JSON to entities | JSON structure + import/export mapping (or Data Transformer, Mendix 11.9+) |
| Nothing to call yet | Stand up a mock endpoint you control and point the app at it |

## Rules
- Store base URL, keys and credentials in **constants** (`mxcli constant` keeps values local to the machine). Never hardcode secrets in MDL or commit them.
- Every REST operation needs an Accept header (CE7062); POST/PUT/PATCH needs a body (CE7064); `{name}` placeholders must match a parameter (CE7056). The serializer fills the first two.
- **A send-REST-request activity has no custom error handling** (CE6035); it uses abort-on-error. Handle failure by wrapping the call in a microflow whose caller decides, or check the status code from the response.
- Change an existing client with `ALTER`, not `CREATE OR MODIFY` (which rebuilds and drops what you omit).
- Response types: JSON via mapping to entities (non-persistent entities are fine for transfer objects), or `String`/`Binary`. Describe the response shape in a JSON structure so mappings stay in sync.
- Calls belong in microflows (server-side), never nanoflows. Run them as a system or service context deliberately; check which user the entity access applies to.
- Published REST/OData: set authentication and a role mapping deliberately; review what an anonymous caller could read.
- Test against a real or mocked endpoint before wiring pages to it; `mxcli check -p` resolves references but cannot prove the API contract.

## Workflow
Fetch syntax for the exact artifact (`mxcli syntax rest.consumed`, `rest.call` or `rest.published`), write a small script, check, diff, exec, then `mxcli describe` the client and run a test microflow (`mendix-testing`).