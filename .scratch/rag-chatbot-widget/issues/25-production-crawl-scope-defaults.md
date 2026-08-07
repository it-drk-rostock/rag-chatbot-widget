# 25 — Production Crawl Scope Defaults

**What to build:**
Configure production fallback defaults for crawling limit (`CRAWL_LIMIT=150`) and discovery depth (`CRAWL_MAX_DEPTH=3`) in `FirecrawlService` and `botConfig`, while preserving environment variable overrides for fast automated test runs.

**Blocked by:** 24 — Full Re-index Vector Collection Reset.

**Status:** complete

- [x] `firecrawlService` uses fallback defaults of `150` for limit and `3` for max depth when environment variables are omitted.
- [x] Environment variable overrides (`CRAWL_LIMIT`, `CRAWL_MAX_DEPTH`) continue to take precedence when explicitly set.
- [x] Unit tests verify fallback behavior and environment variable override support.
