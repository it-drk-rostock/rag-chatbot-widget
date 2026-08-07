# 26 — Firecrawl Node SDK Integration & Manual Vector Reset

## Problem Statement

Currently, `FirecrawlService` relies on raw HTTP `fetch` calls to `https://api.firecrawl.dev/v2` with custom polling loops (`while status === "scraping"`) and hardcoded timeout limits. This approach is brittle, prone to request timeouts during large site crawls, and duplicates error/retry logic already handled by Firecrawl's official client libraries.

Additionally, while vector collections are automatically reset during automated crawl runs, administrators have no mechanism to clear stale or corrupt vectors on demand directly from the Admin Dashboard without triggering a full re-crawl. Furthermore, chunk embeddings and upserts during indexing require batched processing to prevent payload overflow errors against OpenAI and Qdrant.

## Solution

1. **Firecrawl Node SDK Migration**: Replace raw HTTP fetch implementation in `FirecrawlService` with the official `firecrawl` Node SDK (`FirecrawlApp`), delegating crawl initiation, status polling, rate limiting, and retries to `firecrawlApp.crawlUrl()`.
2. **Manual Vector Reset Server Action & UI**: Provide an authenticated Server Action `resetVectorCollectionAction()` guarded by `isAdminAuthenticated()`, and add a "Reset Vector DB" action with a Mantine confirmation modal on the Admin Dashboard `/admin/[secret]`.
3. **Batched Pipeline Indexing**: Refactor `crawlAndEmbed` to process chunk embeddings and Qdrant point upserts in fixed-size batches (e.g., ~100 chunks) while updating Trigger.dev task metadata.

## User Stories

1. As an administrator, I want to click a "Reset Vector DB" button on the Admin Dashboard, so that I can purge all vectors from Qdrant on demand without starting a new crawl.
2. As an administrator, I want a confirmation modal to appear when I click "Reset Vector DB", so that I don't accidentally wipe vector data by misclicking.
3. As an administrator, I want an unauthorized or unauthenticated request to the reset server action to fail with an error, so that public users cannot erase the chatbot's knowledge base.
4. As a developer, I want `FirecrawlService` to use the official `firecrawl` Node SDK (`firecrawlApp.crawlUrl()`), so that application code is free of custom fetch polling loops and status timeouts.
5. As a developer, I want `crawlAndEmbedTask` to process chunk embeddings (`embedMany`) and vector database upserts (`qdrantClient.upsert`) in batched groups of ~100 chunks, so that API payload limits and memory pressure are controlled.
6. As a developer, I want unit tests for `FirecrawlService` to mock `FirecrawlApp` methods, so that we can verify crawl scope options (`limit`, `maxDiscoveryDepth`, `scrapeOptions`, `excludePaths`) without making live network requests.
7. As a developer, I want the project's domain model (`CONTEXT.md`) and architectural decision records (`docs/adr/0005-firecrawl-node-sdk-and-manual-vector-reset.md`) to reflect the new SDK wrapper and manual reset operations.

## Implementation Decisions

- **SDK Package**: Use official `firecrawl` package from npm. Instantiate `new FirecrawlApp({ apiKey })` inside `FirecrawlService`.
- **Crawl Invocation**: Call `firecrawl.crawlUrl(url, { limit, maxDepth: maxDiscoveryDepth, scrapeOptions: { formats: ["markdown"], onlyMainContent: true }, excludePaths: ["/impressum", "/datenschutz"] })`.
- **Server Action**: Add `resetVectorCollectionAction()` to `app/admin/actions.ts`, checking `isAdminAuthenticated()` before calling `resetCollection(botConfig.vectorCollection)`.
- **Admin Dashboard UI**: Add a "Reset Vector DB" button in `app/admin/crawl-progress.tsx` with a Mantine `Modal` asking "Are you sure you want to delete all vectors from Qdrant?" before invoking `resetVectorCollectionAction()`.
- **Pipeline Batching**: Flatten all Markdown chunks in `trigger/crawl-and-embed.ts` and slice into batches of 100 before calling `embedMany` and `qdrantClient.upsert`.

## Testing Decisions

### Test Seams
1. **Firecrawl Service Seam (`src/services/firecrawlService.ts`):** Tested via Vitest by mocking `FirecrawlApp`, verifying `crawl()` correctly constructs parameters and maps `CrawledPage[]` outputs.
2. **Admin Actions Seam (`app/admin/actions.ts`):** Tested via Vitest by mocking session cookies and `qdrantClient`, asserting unauthenticated calls throw "Unauthorized" and authenticated calls trigger `resetCollection`.
3. **Admin Dashboard UI Seam (`app/admin/crawl-progress.tsx`):** Tested via `@testing-library/react`, verifying modal open/close interaction and server action dispatch upon user confirmation.
4. **Crawl & Embed Pipeline Seam (`trigger/crawl-and-embed.ts`):** Tested via Vitest by mocking `firecrawlService`, `embedMany`, and `qdrantClient`, verifying chunk batching and upsert execution.

### Prior Art
- `src/services/firecrawlService.test.ts`
- `app/admin/actions.test.ts`
- `app/admin/crawl-progress.test.tsx`
- `trigger/crawl-and-embed.test.ts`

## Out of Scope
- Dynamic batch size UI sliders on the Admin Dashboard.
- Selective URL deletion from Qdrant (deleting points matching a specific domain/URL pattern); reset applies to the target vector collection.

## Further Notes
Triage label: `ready-for-agent`
ADR `docs/adr/0005-firecrawl-node-sdk-and-manual-vector-reset.md` and domain terms in `CONTEXT.md` have been established and cross-referenced.
