# 5. Firecrawl Node SDK Integration and Manual Vector Reset

## Context
Previously, `FirecrawlService` relied on raw REST fetch requests to `https://api.firecrawl.dev/v2` with a manual polling loop (`while status === "scraping"`) and hardcoded polling timeout windows. This resulted in potential timeout failures and lacked official client SDK features such as automatic retry, rate limiting, and batching handling. Additionally, while vector collection reset occurred during automated crawls, administrators had no capability to trigger a manual collection wipe on demand from the Admin Dashboard.

## Decision
1. **Firecrawl Node SDK Migration**: Replace raw HTTP fetch implementation in `FirecrawlService` with the official `firecrawl` Node SDK (`FirecrawlApp`). Delegate crawl scheduling, status polling, and retry logic to `firecrawlApp.crawlUrl()`.
2. **Manual Vector Reset Server Action & UI**: Introduce an authenticated Server Action (`resetVectorCollectionAction`) protected by `isAdminAuthenticated()`. Add a "Reset Vector Collection" action on the Admin Dashboard with a Mantine confirmation modal to prevent accidental data loss.
3. **Chunk Batching Strategy**: Process chunk embeddings and Qdrant upserts in fixed-size batches (e.g. 100 chunks) to optimize OpenAI API usage and avoid payload limits.

## Consequences
- **Pros**: Robust scraping stability powered by the official SDK; eliminates custom polling/timeout bugs; gives administrators instant operational control to clear vector databases on demand; optimized batch embedding throughput.
- **Cons**: Requires adding the `firecrawl` dependency to `package.json`.
