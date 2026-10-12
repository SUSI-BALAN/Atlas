# Stage 5: Grounded AI research

## Scope

Stage 5 adds optional research assistance over persisted Atlas data. It does not add authentication, collaboration, notifications, autonomous actions, arbitrary browsing or URL fetching, model-generated code execution, or production AI infrastructure. Research history is shared within `workspaceKey = "default"` because Atlas has no authentication.

## Providers and status

`AIProvider` exposes only `id`, safe `model`, `health()`, and `generate()`. Adapters support `none`, local Ollama `/api/chat` compatible services, OpenAI Responses, and DeepSeek chat completions. Provider-native objects are normalized into `{ answer, citations, insufficientContext, usage }`. OpenAI requests set `store: false`. No adapter exposes a key, authorization header, raw error body, or provider configuration to the browser.

`AI_PROVIDER=none` is the default. Status reports `disabled`, generation returns `AI_DISABLED`, and every non-AI feature remains independent. Health states are disabled, ready, unavailable, misconfigured, authentication failed, and rate limited. External status represents configuration readiness rather than a billable probe; local health uses its configured model-list endpoint.

## Context and privacy

Sessions store references, not copied datasets. Limits are 5 search jobs, 20 saved repositories, 5 collections, 5 watchlists, 20 changes, and 30 total selections. Expanded repository evidence is capped at 25. Serialized context defaults to 24,000 characters and reports truncation and missing references. Ordering is deterministic.

Allowed repository evidence includes source identity, public URL, description, languages, topics, factual metrics/state, license, and timestamps. Saved evidence may include tags. Saved notes and raw source metadata are always excluded, including for local providers. Change evidence contains factual old/new values. Analytics evidence includes each metric definition. Every workspace-owned lookup matches `workspaceKey = "default"`; legacy search jobs/results keep their documented shared-dataset boundary.

## Grounding and injection defense

Stable evidence IDs use forms such as `saved:<id>`, `repo:<id>`, `collection:<id>`, `watchlist:<id>`, `change:<id>`, and `analytics:summary`. The server discards provider citations absent from supplied context. A substantive answer is fully grounded only when it has citations and every returned ID validates; otherwise it is marked not fully grounded. When no selected evidence resolves, Atlas returns a deterministic insufficient-context response without calling a provider.

The fixed server instruction requires Atlas-only evidence, separation of fact and inference, honest insufficiency, and structured output. Repository names, descriptions, topics, metadata, and user messages are untrusted data. Embedded instructions cannot alter provider configuration, system rules, context selection, or permissions. Providers receive no tools and cannot browse, fetch arbitrary URLs, execute code, or perform actions.

## Generation safety and persistence

Questions are capped at 4,000 characters, history at 20 messages, output at 8,000 characters, and timeout at 60 seconds by default (maximum 120 seconds). `AI_MAX_OUTPUT_TOKENS` is a backend-only integer from 128 to 4,096, defaulting to 1,200. The server sends it as OpenAI Responses `max_output_tokens`, DeepSeek chat `max_tokens`, and Ollama chat `options.num_predict`; `none` makes no generation request. Browser requests cannot set it. The 8,000-character post-response cap remains a second safety layer. Generation has a dedicated 10-per-15-minute limiter. No automatic generation retry is used. Safe token counts are stored when supplied; Atlas makes no price claim.

Successful user and assistant messages are persisted. On provider failure, the user message remains with a safe failure code; raw exceptions are never stored. A unique client request ID makes browser retries return the prior result or a conflict without another call. A unique `inReplyTo` index prevents duplicate assistant replies.

Deleting a session removes AI session/messages but never source records. Without a transaction, session deletion followed by message deletion can leave orphan messages if the second write fails. Assistant insertion and user completion are separate writes; interruption can leave an assistant beside pending user status, though idempotent lookup returns that assistant. These windows are documented instead of silently requiring replica-set transactions.

## Frontend and accessibility

`/ai` shows provider status, sessions, bounded explicit selectors, selection counts/warnings, question-prefill templates, messages, validated citation links, safe usage, grounding/insufficiency notices, and shared-workspace disclosure. Controls have labels and visible text; disabled, loading, empty, and error states are explicit. Streaming is deferred so partial output cannot corrupt persisted messages.

## Indexes

- Sessions: `{ workspaceKey: 1, updatedAt: -1, _id: -1 }`.
- Messages: `{ workspaceKey: 1, sessionId: 1, createdAt: 1, _id: 1 }`.
- Idempotency: unique partial `{ workspaceKey: 1, sessionId: 1, clientRequestId: 1 }`.
- Reply integrity: unique partial `{ workspaceKey: 1, sessionId: 1, inReplyTo: 1 }`.

Each index backs a query or integrity rule. Stage 5 adds no materialized AI context store.

## Known limitations and Stage 6 handoff

- ID validation does not prove semantic entailment; incomplete citations are visibly not fully grounded.
- There is no streaming, export, reconciliation worker, semantic retrieval, authentication, or private ownership.
- External provider health does not make a generation request; failures are classified during generation.
- The local adapter targets Ollama's native `/api/chat` protocol. A custom compatible service may ignore `options.num_predict`; Atlas cannot verify that service's enforcement and still applies the post-response character cap. Token limits do not cap input-token cost.
- Transactional deletion and state reconciliation depend on a future approved deployment topology.

Stage 6 can add authenticated workspace ownership and retention controls without changing provider/context interfaces. Production AI provisioning remains a separate infrastructure and privacy review.
