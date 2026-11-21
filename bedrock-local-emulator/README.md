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
4. Login needs a user: `mxcli exec bedrock-local-emulator/enable_test_user.mdl` (temporary demo users; undo with `disable_test_user.mdl`).
   `MockTester` has the **Administrator** app role and can use the AWS Bedrock Implementation page; `MockUser` has only the
   plain **User** role and is denied (the page is hidden and a direct link returns 403). Never run this against a deployed app.

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

## GPT (OpenAI gpt-oss) via Bedrock
The mock also serves `openai.gpt-oss-120b-1:0` and `openai.gpt-oss-20b-1:0` in the OpenAI chat-completions format
(`messages`, `max_tokens`, `reasoning_effort` in; `choices[0].message.content`, `usage.prompt_tokens/completion_tokens` out).
In the app add a model with family "OpenAI GPT via Bedrock (chat)" and one of those ids. With Ollama running the reply is real, otherwise it echoes the prompt.

## Cohere Rerank
The mock also serves `cohere.rerank-v3-5:0` (InvokeModel with `query`, `documents`, `top_n`, `api_version`; answers `results[].index/relevance_score`).
Scores are the cosine similarity of the (hashed or Ollama) embeddings, so they are not a real reranker. The log line `cohere embeddings ... input_type` shows `search_document` while indexing and `search_query` for questions.
