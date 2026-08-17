# 01 — Include Vector Payload sources in chatbot context

**What to build:** Make each retrieved website chunk identify its source to the language model by including the existing Vector Payload title and URL alongside its content. Preserve content-only vector similarity, the existing Qdrant schema, and all other Chat Widget behavior.

**Blocked by:** None — can start immediately.

**Status:** complete

- [x] A retrieved result with `title`, `url`, and `content` supplies all three values to the language model's answer context.
- [x] The Vector Payload remains `{ url, title, index, content }`; no migration or Full Re-index is required.
- [x] Stored and query embedding behavior remains unchanged, with semantic matching based on content rather than page metadata.
- [x] The internal chunk `index` is not added to the language-model context.
- [x] The behavior is verified at the existing `POST` chat-route seam using a mocked Qdrant result and assertions against the context passed to the language model.
- [x] Existing Chat Widget streaming, CORS, rate limiting, query extraction, result limit, and retrieval-failure behavior continue to pass their tests.
- [x] No new retrieval module, interface, schema field, payload index, reranker, or other speculative architecture is introduced.
