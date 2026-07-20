# 07 — Embedding & Qdrant Service

**What to build:** A service class that converts text chunks into embeddings via OpenAI (`text-embedding-3-small` or `text-embedding-3-large`) and stores them in Qdrant's `website_chunks` collection.

**Blocked by:** 01 — Bot Configuration & Service Clients

**Status:** ready-for-agent

- [ ] A vector service class is created to generate embeddings for chunks using OpenAI's API (`text-embedding-3-small` / `text-embedding-3-large`).
- [ ] A Qdrant helper is created to check if the `website_chunks` collection exists on start, creating it automatically with the correct dimension sizes (1536 for small, 3072 for large) and Cosine similarity if missing.
- [ ] Logic is added to perform upsert operations to Qdrant, saving the generated vector along with its payload metadata (text chunk, URL, page title, chunk index).
- [ ] Integration tests verify the embedding generator and Qdrant client mocks, checking that upsert payload structures match the vector schema.
