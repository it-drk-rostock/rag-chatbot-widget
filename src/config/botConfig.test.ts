import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { botConfig } from "./botConfig";

describe("botConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("provides default settings when env vars are unset", () => {
    delete process.env.CRAWLER_TARGET_URL;
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.QDRANT_COLLECTION;

    expect(botConfig).toMatchObject({
      colors: expect.any(Object),
      name: expect.any(String),
      welcomeMessage: expect.any(String),
      systemPrompt: expect.any(String),
      crawlerTargetUrl: "https://example.com",
      allowedOrigins: ["http://localhost:3000"],
      embeddingModel: "text-embedding-3-small",
      vectorCollection: "website-content",
    });
  });

  it("overrides settings via environment variables", () => {
    process.env.CRAWLER_TARGET_URL = "https://custom-target.org";
    process.env.ALLOWED_ORIGINS = "https://app1.com, https://app2.com ";
    process.env.QDRANT_COLLECTION = "custom-collection";

    expect(botConfig.crawlerTargetUrl).toBe("https://custom-target.org");
    expect(botConfig.allowedOrigins).toEqual([
      "https://app1.com",
      "https://app2.com",
    ]);
    expect(botConfig.vectorCollection).toBe("custom-collection");
  });
});
