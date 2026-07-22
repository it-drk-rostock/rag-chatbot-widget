# 16 — Qdrant Collection Auto-Initialization

**What to build:**
`qdrantClient.ts` provides an `ensureCollectionExists(collectionName)` utility that checks if the Qdrant vector collection exists, and automatically creates it with `vectors: { size: 1536, distance: "Cosine" }` if missing, preventing cold-start 404 errors during index runs.

**Blocked by:** 15 — Environment-Based Bot Configuration.

**Status:** done

- [x] Export `ensureCollectionExists` helper in `src/services/qdrantClient.ts`.
- [x] Check collection existence using `qdrantClient.collectionExists(collectionName)`.
- [x] Call `qdrantClient.createCollection` with vector size 1536 and Cosine distance metric if `collectionExists` returns false.
- [x] Add unit tests verifying `ensureCollectionExists` creates missing collections and skips existing ones.

