# 15 — Environment-Based Bot Configuration

**What to build:**
Central configuration (`botConfig.ts`) dynamically reads runtime server settings (`crawlerTargetUrl`, `allowedOrigins`, and `vectorCollection`) from environment variables (`CRAWLER_TARGET_URL`, `ALLOWED_ORIGINS`, `QDRANT_COLLECTION`) with fallback defaults, allowing environment customization without modifying TypeScript code.

**Blocked by:** None — can start immediately.

**Status:** complete

- [x] `botConfig.ts` reads `crawlerTargetUrl` from `process.env.CRAWLER_TARGET_URL` (fallback `"https://example.com"`).
- [x] `botConfig.ts` reads `allowedOrigins` from `process.env.ALLOWED_ORIGINS` comma-separated string (fallback `["http://localhost:3000"]`).
- [x] `botConfig.ts` reads `vectorCollection` from `process.env.QDRANT_COLLECTION` (fallback `"website-content"`).
- [x] Existing unit tests in `src/config/botConfig.test.ts` pass and cover environment variable overrides.
