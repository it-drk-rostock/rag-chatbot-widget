import { QdrantClient } from "@qdrant/js-client-rest";

export const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

export async function ensureCollectionExists(collectionName: string) {
  const exists = await qdrantClient.collectionExists(collectionName);
  if (!exists) {
    await qdrantClient.createCollection(collectionName, {
      vectors: { size: 1536, distance: "Cosine" },
    });
  }
}
