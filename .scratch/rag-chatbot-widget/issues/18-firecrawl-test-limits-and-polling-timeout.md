# 18 — Firecrawl Test Limits & Polling Timeout

**What to build:**
Update `src/services/firecrawlService.ts` to accept `limit` and `maxDiscoveryDepth` from `process.env.CRAWL_LIMIT` and `process.env.CRAWL_MAX_DEPTH` (defaulting to 1 / 1 for fast dev testing), and add a 180-second status polling timeout safeguard.

**Blocked by:** 15 — Environment-Based Bot Configuration.

**Status:** ready-for-agent

- [ ] `firecrawlService.crawl()` accepts `limit` from `process.env.CRAWL_LIMIT` (default 1) and `maxDiscoveryDepth` from `process.env.CRAWL_MAX_DEPTH` (default 1).
- [ ] Polling status loop caps total retries (e.g. 180s max timeout) and throws a descriptive error if Firecrawl stalls.
- [ ] Unit tests in `src/services/firecrawlService.test.ts` verify limit options and timeout behavior.
