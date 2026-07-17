import { beforeEach, describe, expect, it, vi } from "vitest";

const clientConstructors = vi.hoisted(() => ({
  openai: vi.fn(),
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

vi.mock("openai", () => ({
  default: class {
    constructor(options: unknown) {
      clientConstructors.openai(options);
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
  clientConstructors.openai.mockReset();
  clientConstructors.qdrant.mockReset();
  clientConstructors.redis.mockReset();
  process.env.OPENAI_API_KEY = "openai-key";
  process.env.QDRANT_URL = "https://qdrant.example.com";
  process.env.QDRANT_API_KEY = "qdrant-key";
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
  process.env.UPSTASH_REDIS_REST_TOKEN = "redis-token";
  vi.resetModules();
});

describe("service clients", () => {
  it("exports clients configured from environment credentials", async () => {
    const { openaiClient } = await import("./openaiClient");
    const { qdrantClient } = await import("./qdrantClient");
    const { redisClient } = await import("./redisClient");

    expect(openaiClient).toBeDefined();
    expect(qdrantClient).toBeDefined();
    expect(redisClient).toBeDefined();
    expect(clientConstructors.openai).toHaveBeenCalledWith({
      apiKey: "openai-key",
    });
    expect(clientConstructors.qdrant).toHaveBeenCalledWith({
      url: "https://qdrant.example.com",
      apiKey: "qdrant-key",
    });
    expect(clientConstructors.redis).toHaveBeenCalledWith({
      url: "https://redis.example.com",
      token: "redis-token",
    });
  });
});
