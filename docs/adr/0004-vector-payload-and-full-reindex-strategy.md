# 4. Vector Payload Optimization and Full Re-index Strategy

## Context
During indexing, `chunkMarkdown` previously attached the raw, unchunked full-page Markdown to every chunk's payload in Qdrant, resulting in duplicate storage bloat across vector points. Additionally, when re-crawling a website, modified or deleted pages with fewer chunks left orphaned vector points in Qdrant.

## Decision
1. **Vector Payload Optimization**: Store only `{ url, title, index, content }` in each Qdrant point payload. Omit full unchunked page raw text.
2. **Full Re-index Strategy**: Before executing crawl upserts in the Background Pipeline, clear existing points or reset the vector collection to guarantee no stale or orphaned chunks remain.
3. **Production Scope Defaults**: Default production crawl settings to `limit: 150` and `maxDiscoveryDepth: 3` while retaining environment variable overrides for test environments.

## Consequences
- **Pros**: Significantly reduced Qdrant vector storage overhead and payload payload size; eliminates orphaned vectors; standardizes production crawl scope.
- **Cons**: Clearing the collection during a Full Re-index briefly empties vector search data until the new crawl completes.
