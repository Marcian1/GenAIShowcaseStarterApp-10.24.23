# Local AWS mock for AWSBedrockImplementation

The mock also answers STS `GetCallerIdentity`, which the page's Test connection button uses.
The Java actions are **unmodified**. They use `WebIdentityTokenFileCredentialsProvider`, so the mock fakes
the AWS side instead: STS `AssumeRoleWithWebIdentity` + Bedrock Runtime `InvokeModel` + Bedrock `ListFoundationModels`
(`aws-mock/server.js`). Bedrock calls are rejected unless SigV4-signed with the key the mock's STS issued.
The SDK is redirected with the standard `AWS_ENDPOINT_URL` env var.

1. `.\bedrock-local-emulator\start-mock.ps1`  (starts the mock; sets AWS_WEB_IDENTITY_TOKEN_FILE / AWS_ROLE_ARN / AWS_REGION / AWS_ENDPOINT_URL)
2. In the same shell: `mxcli run --local --detach --db-type hsqldb -p GenAIShowcaseStarterApp.mpr`
3. Vector DB: Postgres with pgvector (database `bedrock_vectordb`), configured in the app as DatabaseConfiguration
   `atlas-ceba-pp-vectordb` (PgVector DB Config menu item).
4. Login needs a user: `mxcli exec bedrock-local-emulator/enable_test_user.mdl` (temporary demo user; undo with `disable_test_user.mdl`).

Embeddings are deterministic hashed bag-of-words, so similarity reflects word overlap, not true semantics.
Chat replies just echo the prompt.

## Default configuration (Studio Pro / `mxcli run`)
The project's `Default` configuration carries the AWS SDK settings as Extra JVM parameters
(`-Daws.webIdentityTokenFile`, `-Daws.roleArn`, `-Daws.roleSessionName`, `-Daws.region`, `-Daws.endpointUrl`),
so no environment variables are needed. They contain an absolute path to
`bedrock-local-emulator/.runtime/web-identity-token` - adjust them (Project Settings > Configurations > Server) on another machine,
and remove them before deploying. The only thing to do before running is start the mock: `.\bedrock-local-emulator\start-mock.ps1`.
The `default` database already contains the `atlas-ceba-pp-vectordb` configuration and the Bedrock config (eu-central-1).

## Real AI via Ollama (optional)
If Ollama is running on `localhost:11434`, the mock forwards model calls to it instead of returning fake data:
- Anthropic chat -> `OLLAMA_CHAT_MODEL` (default `llama3.2:3b`)
- Cohere / Titan embeddings -> `OLLAMA_EMBED_MODEL` (default `bge-m3`, 1024 dims = what the app and pgvector table use; other sizes are truncated/zero-padded)
- Set `MOCK_BACKEND=hash` to force the old deterministic fake. If Ollama is not reachable it falls back automatically.

Setup: `winget install Ollama.Ollama`, then `ollama pull bge-m3` and `ollama pull llama3.2:3b`, then restart the mock
(stop the node process on port 8787, run `.\bedrock-local-emulator\start-mock.ps1`). CPU-only: ~17 s per 96 embeddings, ~10-20 s per chat reply.
After switching backends, click "Create chunks and store in knowledge base" again so stored vectors match the new model.
