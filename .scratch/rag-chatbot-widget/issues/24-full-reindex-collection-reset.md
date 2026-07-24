# 24 — Full Re-index Vector Collection Reset

**What to build:**
Update the Background Pipeline crawling task so that prior vector points in the collection are reset or cleared before newly crawled chunks are embedded and upserted, preventing stale or orphaned vectors from remaining in search results.

**Blocked by:** 23 — Vector Payload Optimization.

**Status:** complete

- [x] `crawlAndEmbed` clears/resets collection points prior to upserting fresh crawl data.
- [x] Stale vectors from deleted or shortened pages are purged during a Full Re-index.
- [x] Integration and unit tests in `trigger/crawl-and-embed.test.ts` verify collection clearing before upserting.

