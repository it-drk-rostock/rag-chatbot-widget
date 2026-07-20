# 01 — Bot Configuration & Service Clients

**What to build:** The central bot configuration module and the base client initializers for Qdrant, OpenAI, and Upstash Redis, enabling the rest of the application to access configurations and services in a unified way.

**Blocked by:** None — can start immediately

**Status:** complete

- [x] A central Bot Configuration file (`src/config/botConfig.ts`) is created containing configuration types and exported static configurations (colors, bot name, welcome message, system prompt, crawler target URL, allowed CORS origins, and chosen embedding model).
- [x] Exported initializers for the Qdrant client (`QdrantClient`), OpenAI API client, and Upstash Redis client are created in a services folder, using environment variables for authorization.
- [x] Compiles successfully, and basic client exports are verified with unit tests using Vitest (mocking API connections).
