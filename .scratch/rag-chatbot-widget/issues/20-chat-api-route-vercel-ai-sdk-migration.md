# 20 — Chat API Route Vercel AI SDK Migration

**What to build:**
Refactor `/api/chat` route handler to accept `UIMessage[]` payloads, search Qdrant vector context using Vercel AI SDK `embed`, convert messages with `convertToModelMessages`, and stream model outputs using `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })`, retaining CORS headers and Upstash rate-limiting.

**Blocked by:** 15 — Environment-Based Bot Configuration, 16 — Qdrant Collection Auto-Initialization.

**Status:** ready-for-agent

- [ ] `/api/chat` receives `messages: UIMessage[]` body payload.
- [ ] Query vector context in Qdrant using Vercel AI SDK `embed({ model: openai.embedding("text-embedding-3-small"), value: userPrompt })`.
- [ ] Pass retrieved Qdrant payload text as `system` prompt context.
- [ ] Return `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })` with CORS headers.
- [ ] Preserve Upstash Redis rate-limiting (status 429 on limit exceeded).
- [ ] Update `app/api/chat/route.test.ts` to test stream creation, CORS, and rate-limiting.
