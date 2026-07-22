# 08 — Chat API Streaming LLM

**What to build:** Streaming LLM completion capabilities on the `/api/chat` route using Vercel AI SDK and the `gpt-5.4-mini-2026-03-17` model (direct chat response, no vector retrieval context yet).

**Blocked by:** 04 — Chat API CORS & Rate Limiter

**Status:** complete

- [x] Vercel AI SDK packages (`ai`, `@ai-sdk/openai`) are configured.
- [x] The `/api/chat` Edge route is modified to accept user prompts, query `gpt-5.4-mini-2026-03-17` via the Vercel AI SDK, and stream the generated response tokens back to the caller in real time.
- [x] Proper error handling is implemented to catch LLM API failures and return appropriate client responses.
- [x] Integration tests verify that POSTing a user query returns a `text/event-stream` type response carrying valid streamed completion tokens.
