# 06 — Firecrawl & Chunking Service

**What to build:** A service class that recursively fetches Markdown pages from the target URL using Firecrawl, and splits the returned page texts at Markdown heading boundaries (`#`, `##`, `###`).

**Blocked by:** 01 — Bot Configuration & Service Clients

**Status:** complete

- [x] A Firecrawl service client wrapper is built, implementing recursive site scraping with configuration constraints (maximum depth of 2, limit of 150 pages, only main content retrieved, and excluded URLs like `/impressum`, `/datenschutz`).
- [x] A Markdown-aware chunking utility is implemented, splitting page content at headings (`#`, `##`, `###`) to maintain structural context. If a single heading section exceeds 1200 characters, it falls back to a sliding window of 1000 characters with a 150-character overlap.
- [x] The output chunks retain metadata: original page URL, page title, and chunk position index.
- [x] Unit tests verify the chunking utility using sample Markdown strings, confirming headings remain grouped with their text and that overflow splitting is applied correctly.
