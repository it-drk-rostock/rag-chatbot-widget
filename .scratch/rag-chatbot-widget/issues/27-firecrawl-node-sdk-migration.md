# 27 — Firecrawl Node SDK Migration

**What to build:**
Upgrade `FirecrawlService` to use the official `firecrawl` Node SDK (`FirecrawlApp`), eliminating custom fetch polling loops and manual status timeout logic while maintaining environment-configurable crawl scope limits (`limit`, `maxDepth`, `scrapeOptions`, `excludePaths`).

**Blocked by:** None — can start immediately.

**Status:** complete

- [x] Install `firecrawl` dependency in `package.json`.
- [x] Refactor `FirecrawlService` in `src/services/firecrawlService.ts` to instantiate `FirecrawlApp` and call `crawlUrl()`.
- [x] Map SDK crawl response data to `CrawledPage[]` structure cleanly.
- [x] Update `src/services/firecrawlService.test.ts` to mock `FirecrawlApp` methods and verify SDK parameters and fallback options.
- [x] All Vitest tests pass cleanly.
