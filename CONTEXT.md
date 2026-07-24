# RAG Chatbot Widget & Indexer

A retrieval-augmented generation chatbot widget that can be embedded on client websites, powered by background scraping and indexing tasks.

## Language

**Bot Configuration**:
Statically defined settings (e.g. colors, bot name, welcome message, system prompt, crawler target URL) stored in code.
_Avoid_: Dynamic settings, database config

**Admin Dashboard**:
A secure, password-protected single-page interface used to trigger website crawling and monitor indexing status.
_Avoid_: Admin portal, control panel

**Background Pipeline**:
The long-running indexing process executed asynchronously to crawl a website, chunk the content, generate embeddings, and upsert them to the vector database.
_Avoid_: Ingest pipeline, scraper task

**Chat Widget**:
The user-facing embeddable chat interface loaded on external websites to interact with the assistant.
_Avoid_: Bot UI, chat frame

**Vector Payload**:
The payload attached to a point in Qdrant storing chunk metadata (`url`, `title`, `index`) and `content` (the chunk's specific Markdown text).
_Avoid_: Storing full-page unchunked raw markdown in payloads

**Full Re-index**:
Clearing or resetting existing vectors prior to crawling and embedding to guarantee no orphaned or stale chunks remain in Qdrant.
_Avoid_: Partial upserts without stale chunk cleanup


