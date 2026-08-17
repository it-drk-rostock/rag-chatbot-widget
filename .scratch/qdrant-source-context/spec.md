# Include Qdrant source metadata in chatbot retrieval context

## Problem Statement

The Chat Widget retrieves relevant Vector Payload records from Qdrant, but its answer context currently includes only each result's content. Although every Vector Payload already stores `url` and `title` metadata, that source information is discarded before the language model generates an answer.

As a result, the assistant is asked to provide Markdown source links without receiving the source URLs or titles needed to ground those citations. Website visitors may receive useful information but cannot reliably identify or verify its source.

## Solution

Include the existing `title` and `url` from each retrieved Vector Payload alongside its `content` when assembling the language model's retrieval context.

The Qdrant schema remains unchanged: each Vector Payload continues to store `url`, `title`, `index`, and `content`. Vector similarity continues to use embeddings produced from `content` only. No Full Re-index or Background Pipeline change is required.

## User Stories

1. As a Chat Widget visitor, I want answers to include links to their source pages, so that I can verify the information.
2. As a Chat Widget visitor, I want a human-readable source title with each retrieved source, so that I can understand where a claim came from before opening the link.
3. As a Chat Widget visitor, I want citations to use the URL stored with the retrieved content, so that links correspond to the indexed website.
4. As a website owner, I want the chatbot to use source metadata already present in Qdrant, so that grounded citations do not require another crawl or Full Re-index.
5. As a website owner, I want semantic matching to remain focused on chunk content, so that generic page titles do not add noise to vector similarity.
6. As a maintainer, I want the existing Vector Payload shape preserved, so that this correction does not require a schema migration.
7. As a maintainer, I want the Background Pipeline and embedding process left unchanged, so that indexing behavior and storage costs remain stable.
8. As a maintainer, I want retrieval-context behavior verified through the chat route's existing interface, so that the test covers the behavior callers depend on.
9. As a maintainer, I want chunk index metadata to remain available in Qdrant but absent from the language-model prompt, so that internal positional data does not consume answer context.
10. As a product owner, I want the smallest change that enables grounded source links, so that additional retrieval architecture is introduced only in response to measured quality problems.

## Implementation Decisions

- Preserve the existing Vector Payload fields: `url`, `title`, `index`, and `content`.
- Continue generating stored vectors from `content` only. The title does not participate in vector similarity.
- Modify retrieval-context assembly so that every retrieved chunk supplied to the language model includes its `title`, `url`, and `content`.
- Keep `index` as stored chunk metadata; do not include it in the language-model context.
- Use the existing chat route as the implementation seam. Do not introduce a new module or interface solely for this formatting change.
- Preserve the existing Qdrant collection configuration, result limit, query embedding behavior, and graceful retrieval-failure behavior.
- Require no Full Re-index because the necessary metadata is already stored.
- Treat `title` as the crawled page title under the existing Vector Payload contract; do not introduce `pageTitle`, `sectionTitle`, or `chunkHeading` fields in this change.

## Testing Decisions

- Test the feature at the existing `POST` chat-route seam, which is the highest established seam covering Qdrant retrieval and language-model prompt assembly.
- Mock a Qdrant search result containing representative `title`, `url`, and `content` values.
- Invoke the chat route and assert that the system context passed to the language model contains all three values.
- Keep assertions focused on externally relevant prompt content rather than exact internal formatting, unless formatting is part of the source-link contract.
- Retain the existing assertion that the query is embedded and Qdrant is searched with the configured collection and result limit.
- Use the existing chat route tests and their mocked Qdrant client and language-model call as prior art.
- Do not add direct tests of Qdrant internals or the Background Pipeline because neither changes.

## Out of Scope

- Changing the Vector Payload schema.
- Adding `pageTitle`, `sectionTitle`, `chunkHeading`, tenant, site, language, crawl-version, or timestamp fields.
- Embedding title or URL metadata.
- Re-indexing the website.
- Adding payload indexes, named vectors, sparse vectors, hybrid search, reranking, grouping, or multi-tenant filtering.
- Changing crawling or chunking behavior for homepage cards and linked articles.
- Adding a relevance threshold or changing the number of retrieved chunks.
- Redesigning citation rendering beyond supplying existing source metadata to the language model.
- Creating a new retrieval module or speculative abstraction.

## Further Notes

The current design is appropriate for a simple single-website information chatbot. This spec corrects the mismatch between the source-link requirement and the context actually supplied to the language model while deliberately preserving the minimal architecture.

If future retrieval evaluations reveal a specific quality problem, richer chunk headings or other metadata can be considered in a separate decision.
