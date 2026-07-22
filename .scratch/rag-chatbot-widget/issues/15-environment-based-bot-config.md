# 15 — Environment-Based Bot Configuration

**What to build:**
Central configuration (`botConfig.ts`) dynamically reads runtime server settings (`crawlerTargetUrl`, `allowedOrigins`, and `vectorCollection`) from environment variables (`CRAWLER_TARGET_URL`, `ALLOWED_ORIGINS`, `QDRANT_COLLECTION`) with fallback defaults, allowing environment customization without modifying TypeScript code.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `botConfig.ts` reads `crawlerTargetUrl` from `process.env.CRAWLER_TARGET_URL` (fallback `"https://example.com"`).
- [ ] `botConfig.ts` reads `allowedOrigins` from `process.env.ALLOWED_ORIGINS` comma-separated string (fallback `["http://localhost:3000"]`).
- [ ] `botConfig.ts` reads `vectorCollection` from `process.env.QDRANT_COLLECTION` (fallback `"website-content"`).
- [ ] Existing unit tests in `src/config/botConfig.test.ts` pass and cover environment variable overrides.
