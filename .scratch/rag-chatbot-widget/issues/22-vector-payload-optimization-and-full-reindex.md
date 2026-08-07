# 22 — Vector Payload Optimization and Full Re-index Strategy

**Labels:** `ready-for-agent`
**Status:** complete

## Problem Statement

When the Background Pipeline indexes website content, every point stored in the Qdrant vector database duplicates the entire raw, unchunked page Markdown alongside the chunk's specific text segment. This bloats vector storage and increases network payload size. Furthermore, when re-crawling updated websites, pages with fewer chunks or deleted subpages leave stale and orphaned vector points in Qdrant. Finally, crawl limits default to single-page test values rather than production scale defaults.

## Solution

Optimize the Vector Payload shape to contain strictly the chunk-specific content (`url`, `title`, `index`, `content`), omitting full unchunked page raw Markdown. Implement a Full Re-index cleanup mechanism in the Background Pipeline that clears/resets vector collection data prior to upserting newly crawled chunks. Configure production-ready default fallbacks for crawler depth and limit parameters.

## User Stories

1. As a system administrator, I want each vector point in Qdrant to store only its specific chunk text, so that vector storage overhead and payload sizes are minimized.
2. As a website owner, I want a Full Re-index to clear prior vector entries before saving fresh content, so that obsolete or deleted page chunks are removed from search results.
3. As a developer, I want sensible production defaults for crawl depth (3 levels deep) and page limit (150 pages), so that the Background Pipeline indexes target sites fully without requiring manual environment tweaks in production.
4. As a developer running tests locally, I want environment variable overrides for crawl depth and limits, so that local automated test runs remain fast.

## Implementation Decisions

- **Markdown Chunker Module**: Update the chunker service interface so that page-level raw Markdown is stripped from generated chunk objects, leaving only `url`, `title`, `index`, and `content`.
- **Background Pipeline Task**: Modify the `crawl-and-embed` task flow to execute a collection clearing/reset step before embedding and upserting newly crawled pages.
- **Crawler Service Configuration**: Update default fallback values for `limit` (default: 150) and `maxDiscoveryDepth` (default: 3) in the crawler service, keeping `CRAWL_LIMIT` and `CRAWL_MAX_DEPTH` environment variable overrides intact.
- **Architectural Alignment**: Adhere to ADR 0004 ("Vector Payload Optimization and Full Re-index Strategy") and domain vocabulary defined in `CONTEXT.md`.

## Testing Decisions

- **Testing Philosophy**: Test external behavior at the highest single seam rather than internal implementation details.
- **Target Seam**: Execute tests at the `crawlAndEmbed` pipeline function seam (`trigger/crawl-and-embed.test.ts`) with mocked external services (Firecrawl and OpenAI embeddings).
- **Assertions**:
  - Verify that collection reset/clearing is invoked prior to upserts.
  - Verify that upserted point payloads contain only `{ url, title, index, content }` and do NOT contain full page raw Markdown.
  - Verify chunker unit test outputs in `markdownChunker.test.ts`.
- **Prior Art**: Follow existing test patterns established in `trigger/crawl-and-embed.test.ts` and `src/services/markdownChunker.test.ts`.

## Out of Scope

- Incremental delta-crawling with per-page payload filtering (full collection reset is selected per ADR 0004).
- Multi-collection indexing per target domain (uses single configured vector collection).

## Further Notes

- Documented in ADR 0004 (`docs/adr/0004-vector-payload-and-full-reindex-strategy.md`).
