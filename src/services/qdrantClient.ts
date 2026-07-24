import { QdrantClient } from "@qdrant/js-client-rest";

export function getQdrantClient() {
  const url = process.env.QDRANT_URL;
  return new QdrantClient({
    url,
    apiKey: process.env.QDRANT_API_KEY,
    port: url?.startsWith("https://") ? 443 : undefined,
    checkCompatibility: false,
  });
}

export const qdrantClient = new Proxy({} as QdrantClient, {
  get(_target, prop: keyof QdrantClient) {
    const client = getQdrantClient();
    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export async function ensureCollectionExists(collectionName: string) {
  const response = await qdrantClient.collectionExists(collectionName);
  const exists = typeof response === "boolean" ? response : Boolean(response?.exists);
  if (!exists) {
    await qdrantClient.createCollection(collectionName, {
      vectors: { size: 1536, distance: "Cosine" },
    });
  }
}

export async function resetCollection(collectionName: string) {
  const response = await qdrantClient.collectionExists(collectionName);
  const exists = typeof response === "boolean" ? response : Boolean(response?.exists);
  if (exists) {
    await qdrantClient.deleteCollection(collectionName);
  }
  await qdrantClient.createCollection(collectionName, {
    vectors: { size: 1536, distance: "Cosine" },
  });
}

