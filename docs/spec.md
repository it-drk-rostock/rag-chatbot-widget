# Specification: RAG Chatbot Widget & Indexer

## Problem Statement

Website owners want an easy, secure, and cost-efficient way to add a "Chat-with-your-Website" assistant to their sites (e.g. TYPO3). They need to trigger content indexing on demand and monitor progress, while ensuring the user-facing chat widget loads fast, respects rate limits, isolates styles to prevent layout breakage, and cites sources accurately.

## Solution

A Next.js serverless application hosted on Cloudflare (via OpenNext) paired with Trigger.dev (v4) for background execution. The system features:
1. A secure **Admin Dashboard** route `/admin/[secret]` for triggering and tracking indexing.
2. A **Background Pipeline** task executing Firecrawl recursive scraping, Markdown-aware chunking, OpenAI embeddings generation, and Qdrant vector database storage.
3. A rate-limited `/api/chat` route using Upstash Redis.
4. A lightweight, embeddable **Chat Widget** loaded via a simple script tag that injects a styled floating bubble and an isolated iframe.

All styling and crawler configurations are managed statically in code (`src/config/botConfig.ts`) to avoid database overhead.

---

## User Stories

1. As an administrator, I want to access the **Admin Dashboard** only via a designated secret path parameter, so that unauthorized users cannot discover the admin access point.
2. As an administrator, I want to enter a password to log into the dashboard, so that I can prevent unauthorized triggers of crawls.
3. As an administrator, I want to see a clear error message if I enter the incorrect password, so that I know why access was denied.
4. As an administrator, I want to trigger a new index crawl on demand by clicking a button, so that the chatbot's knowledge matches the latest website updates.
5. As an administrator, I want to see the real-time status of the indexing task (e.g., "queued", "scraping", "embedding", "done") directly on the dashboard, so that I know when the job finishes.
6. As a website visitor, I want to see a floating chat bubble at the bottom right of the page, so that I can click it to open the chat assistant.
7. As a website visitor, I want the chat window to toggle open and closed smoothly when I click the bubble, so that it doesn't block screen real estate when not in use.
8. As a website visitor, I want the chat assistant to stream responses word-by-word, so that I do not have to wait for the entire answer to generate.
9. As a website visitor, I want the assistant to include clickable Markdown links pointing to the source pages, so that I can verify facts and find more details.
10. As a website visitor, I want to see a friendly rate-limit warning message if I spam queries too quickly, so that I understand why the bot is temporarily unavailable.
11. As a developer, I want to configure the chat theme colors, default greetings, system prompts, CORS settings, and crawler targets in a single TypeScript file, so that I can customize the bot without managing a database.
12. As a developer, I want all environment secrets (OpenAI API key, Qdrant token, Firecrawl key, Trigger.dev project secrets) to be managed via environment variables, so that credential security is maintained.

---

## Implementation Decisions

### 1. Central Configuration Module
We will create a central typescript module to store the static **Bot Configuration**. This includes allowed CORS origins, target URLs for scraping, Qdrant collection parameters, and UI custom options (theme colors, titles, greetings). See [ADR 0001: Static Configuration](0001-static-configuration-no-database.md).

### 2. Admin Dashboard & Route Protection
- Route path: `/admin/[secret]`, where `[secret]` matches the environment variable `ADMIN_SECRET_PATH`. If unmatched, the server returns an immediate 404.
- Authentication: Next.js Server Actions verify the submitted password against `ADMIN_PASSWORD`.
- Task Launch: Upon successful auth, the action generates a temporary, scoped Trigger.dev public token and triggers the `crawl-and-embed` task.

### 3. Background Pipeline (Trigger.dev Task)
- Task ID: `crawl-and-embed`.
- Execution:
  1. Recursively scrape the website target (from configuration) using Firecrawl with a configured maximum depth of 2, page limits, and custom excluded paths (e.g. `/impressum`, `/datenschutz`).
  2. Split retrieved Markdown text into chunks at markdown headings (`#`, `##`, `###`) to preserve context.
  3. Generate vector embeddings for each chunk using OpenAI (`text-embedding-3-small` or `text-embedding-3-large`).
  4. Upsert the resulting vectors and metadata (text chunk, source URL, page title) to the Qdrant database.
- See [ADR 0003: Trigger.dev Realtime Task Tracking](0003-triggerdev-realtime-tracking.md).

### 4. Chat Widget Embed & Styling
- Serving: The chat window is served under a dedicated `/widget` route styled via Mantine UI.
- Embedding: Embedded on host sites (such as TYPO3) using a lightweight script wrapper `embed.js`. The script creates the floating bubble in the host page's DOM and controls the iframe dimensions, maintaining full styling isolation. See [ADR 0002: Iframe-based Chat Widget Embedding](0002-iframe-widget-embedding.md).

### 5. Chat API Route
- Route: `/api/chat` (Edge Runtime).
- Operations:
  1. Verify the cross-origin request against the allowed CORS domains.
  2. Retrieve user IP and check rate limits using Upstash Redis. If the rate limit is exceeded, return status 429. If Upstash is down, fail open and log the event.
  3. Embed query, query Qdrant for top 3-5 matches, and build the context.
  4. Prompt the model `gpt-5.4-mini-2026-03-17` to answer based strictly on the context, using inline Markdown links to reference source URLs.

---

## Testing Decisions

### Seams
We will test the system using three high-level testing seams to avoid hitting actual external API endpoints during verification runs:
1. **Admin Action Seam:** The Server Action `triggerCrawlAction` will be tested by mocking the `@trigger.dev/sdk` client, verifying that the action validates credentials correctly and triggers the job.
2. **Pipeline Execution Seam:** The Trigger.dev task execution will be tested by mocking `firecrawl`, the OpenAI embedding client, and the `QdrantClient`. We will verify that text is split at heading boundaries and that the expected payload and dimension vectors are upserted.
3. **Chat API Seam:** The `/api/chat` Edge route handler will be tested by mocking the Upstash Redis rate limiter and the `QdrantClient` vector search. We will verify the CORS header presence, rate-limiting response codes (429), and the synthesized streaming response.

### Test Practices
- Tests must assert observable behaviors (HTTP response status, CORS headers, returned stream structure, server action success results) rather than private implementation details.
- Since the repo does not contain an existing test setup, we will configure **Vitest** for running unit and integration tests.

---

## Out of Scope

- Multi-tenant architecture (supporting different websites and config files from a single deployed instance).
- Dynamic dashboard-based updates to styling or system prompts (these are code changes in `botConfig.ts`).
- Crawling non-HTML elements (such as PDFs, DOCX, or images).
- Chat history persistence in a server database (history will live solely in client React state).

## Further Notes
The TYPO3 integration will only require pasting a single `<script src="https://<our-domain>/embed.js"></script>` block into TYPO3's custom HTML content element.
