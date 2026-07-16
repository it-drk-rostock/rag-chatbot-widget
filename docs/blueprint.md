# Blueprint: RAG Chatbot Widget & Indexer (Next.js + Qdrant + Trigger.dev)

## 1. Project Overview

A lightweight, high-performance, and cost-efficient "Chat-with-your-Website" RAG (Retrieval-Augmented Generation) system.
The system consists of three main parts:

1. **Admin Dashboard**: A secure, password-protected single-page UI to trigger background tasks and monitor progress.
2. **Long-Running Background Pipeline**: Triggered via Trigger.dev. It runs the recursive Firecrawl scraper, handles chunking, generates vector embeddings via AI, and upserts them into Qdrant.
3. **Chat Widget & API**: An embeddable chatbot widget running on client sites, querying a Next.js API route protected by Upstash rate-limiting.

---

## 2. Technology Stack & Infrastructure

- **Framework**: Next.js (App Router, running on Cloudflare https://opennext.js.org/cloudflare for serverless hosting).
- **Background Jobs**: Trigger.dev (v4) https://trigger.dev/docs/llms.txt to run long-running crawl/embedding jobs without serverless timeout limits.
- **UI & Styling**: Mantine UI (Core & Hooks) https://mantine.dev/llms.txt.
- **Web Crawler**: Firecrawl (via `firecrawl`) to recursively fetch pages as clean Markdown. https://docs.firecrawl.dev/llms.txt.
- **Vector Database**: Qdrant (Qdrant Cloud Free Tier / local Docker container for Intranet compatibility) https://qdrant.tech/llms.txt.
- **AI & RAG Orchestration**: Vercel AI SDK (`ai`) for streaming LLM responses and generating embeddings. https://sdk.vercel.ai/llms.txt
- **Rate Limiting**: Upstash Redis (Free Tier) to protect the public Chat Widget API route. https://upstash.com/llms.txt.

---

## 3. Core Constraints & Architecture Rules

1. **No Relational Database**: All configurations (colors, bot name, welcome message, system prompt) are statically defined in a central `src/config/botConfig.ts` file to keep latency and dependencies at zero.
2. **Strict Modularization**: Abstract the Vector DB (`QdrantClient`) and Crawling logic into decoupled service classes. Switching from Qdrant Cloud to a local Qdrant instance must only require changing `.env` variables.
3. **Task Delegation**: The Next.js API/Server Action must _never_ execute the crawl itself. It only authenticates the user and triggers the background task on Trigger.dev.
4. **CORS Enabled**: The `/api/chat` route must return appropriate CORS headers to allow requests from designated client domains.

---

## 4. Feature Specifications

### Feature A: Secure Single-Page Admin

- **Path**: `/admin/[secret]` (e.g., `/admin/my-secure-path-123`).
- **Route Protection**: If `[secret]` does not match `ADMIN_SECRET_PATH`, return a 404 page immediately.
- **Authentication**: A simple password input field matching `ADMIN_PASSWORD` checked via Next.js Server Actions.
- **The Action**: Once verified, clicking `"Website jetzt neu indexieren"` triggers a background task on Trigger.dev (`crawl-and-embed`) and immediately returns a success status to the client.
- **Progress Tracking**: (Optional) Use Trigger.dev's real-time run status to show a loading spinner or progress bar in the admin UI while the job runs.

### Feature B: Background Job (Trigger.dev Task)

- **Task ID**: `crawl-and-embed`
- **Workflow**:
  1. Initialize Firecrawl with `maxDepth: 2`, `limit: 150`, `onlyMainContent: true`, and custom `excludePaths` (e.g., `/impressum`, `/datenschutz`).
  2. Crawl the target website recursively to fetch raw Markdown for all subpages.
  3. Chunk the returned Markdown into semantically meaningful pieces.
  4. Generate vector embeddings for each chunk using Vercel AI SDK (e.g., OpenAI `text-embedding-3-small`).
  5. Upsert the vectors into Qdrant. Store the raw text, parent URL, and page title in the payload metadata.

### Feature C: Chat Widget & API

- **API Route**: `/api/chat` (Edge Runtime, CORS enabled).
- **Rate Limiting**: Upstash Redis checks the requester's IP. Limit queries per IP to prevent API abuse.
- **RAG Pipeline**:
  1. Embed the incoming user query.
  2. Perform semantic search on Qdrant (top 3-5 chunks).
  3. Feed the retrieved payload text to the LLM (Vercel AI SDK) as context inside the system prompt.
  4. Stream the text back. Ensure the LLM cites sources as Markdown links using the metadata URLs from the Qdrant payload.
- **Custom Chat Widget**: Serve a lightweight Mantine-styled chat interface that can be embedded on any external website via an `iframe` or a `<script>` bundle.
