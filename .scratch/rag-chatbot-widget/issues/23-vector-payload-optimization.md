# 23 — Vector Payload Optimization

**What to build:**
Refactor markdown chunking and point creation so Qdrant vector point payloads contain only chunk-specific data (`url`, `title`, `index`, `content`) without duplicating the full unchunked page raw Markdown on every point.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] `chunkMarkdown` returns chunks where `content` contains chunk text without `markdown` property attached.
- [x] `crawlAndEmbed` constructs Qdrant point payloads with `{ url, title, index, content }`.
- [x] Unit tests for `chunkMarkdown` and `crawlAndEmbed` pass, verifying vector point payloads exclude full page raw text.
