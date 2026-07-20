# 10 — RAG Integration on Chat API

**What to build:** Integrating semantic search and prompt synthesis into `/api/chat`. The API embeds the query, searches Qdrant for top 3-5 matches, formats the context, and instructs the LLM to write answers citing sources using Markdown links.

**Blocked by:**
- 08 — Chat API Streaming LLM
- 09 — Trigger.dev Crawl Task Integration

**Status:** ready-for-agent

- [ ] The `/api/chat` Edge route is modified to generate a query vector embedding on incoming user prompts using the configured OpenAI embedding model.
- [ ] The Qdrant client performs a semantic search to fetch the top 3-5 matching text chunks from the `website_chunks` collection.
- [ ] A strict system prompt compiles the retrieved text chunks as context and instructs the LLM (`gpt-5.4-mini-2026-03-17`) to answer based *only* on this context, returning inline markdown links pointing to the exact source URLs in the payload.
- [ ] Integration tests verify that the model correctly uses the retrieved context and formats citations properly when replying.
