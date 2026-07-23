import { beforeEach, describe, expect, it, vi } from "vitest";

const clientConstructors = vi.hoisted(() => ({
  qdrant: vi.fn(),
  redis: vi.fn(),
}));

vi.mock("@qdrant/js-client-rest", () => ({
  QdrantClient: class {
    constructor(options: unknown) {
      clientConstructors.qdrant(options);
    }
  },
}));

vi.mock("@upstash/redis", () => ({
  Redis: class {
    constructor(options: unknown) {
      clientConstructors.redis(options);
    }
  },
}));

beforeEach(() => {
  clientConstructors.qdrant.mockReset();
  clientConstructors.redis.mockReset();
  process.env.QDRANT_URL = "https://qdrant.example.com";
  process.env.QDRANT_API_KEY = "qdrant-key";
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
  process.env.UPSTASH_REDIS_REST_TOKEN = "redis-token";
  vi.resetModules();
});

describe("service clients", () => {
  it("exports clients configured from environment credentials", async () => {
    const { qdrantClient } = await import("./qdrantClient");
    const { redisClient } = await import("./redisClient");

    // Accessing property on proxy triggers lazy client instantiation
    void qdrantClient.collectionExists;
    expect(clientConstructors.qdrant).toHaveBeenCalledWith({
      url: "https://qdrant.example.com",
      apiKey: "qdrant-key",
      port: 443,
      checkCompatibility: false,
    });
    expect(clientConstructors.redis).toHaveBeenCalledWith({
      url: "https://redis.example.com",
      token: "redis-token",
    });
  });
});
