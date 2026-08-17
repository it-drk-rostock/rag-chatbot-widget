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
    delete process.env.CRAWL_LIMIT;
    delete process.env.CRAWL_MAX_DEPTH;
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.QDRANT_COLLECTION;

    expect(botConfig).toMatchObject({
      colors: expect.any(Object),
      name: expect.any(String),
      welcomeMessage: expect.any(String),
      systemPrompt: expect.any(String),
      crawlerTargetUrl: "https://example.com",
      crawlLimit: 150,
      crawlMaxDepth: 3,
      allowedOrigins: ["http://localhost:3000"],
      embeddingModel: "text-embedding-3-small",
      vectorCollection: "website-content",
    });
  });

  it("overrides settings via environment variables", () => {
    process.env.CRAWLER_TARGET_URL = "https://custom-target.org";
    process.env.CRAWL_LIMIT = "5";
    process.env.CRAWL_MAX_DEPTH = "2";
    process.env.ALLOWED_ORIGINS = "https://app1.com, https://app2.com ";
    process.env.QDRANT_COLLECTION = "custom-collection";

    expect(botConfig.crawlerTargetUrl).toBe("https://custom-target.org");
    expect(botConfig.crawlLimit).toBe(5);
    expect(botConfig.crawlMaxDepth).toBe(2);

    process.env.CRAWL_LIMIT = "0";
    process.env.CRAWL_MAX_DEPTH = "0";

    expect(botConfig.crawlLimit).toBe(0);
    expect(botConfig.crawlMaxDepth).toBe(0);
    expect(botConfig.allowedOrigins).toEqual([
      "https://app1.com",
      "https://app2.com",
    ]);
    expect(botConfig.vectorCollection).toBe("custom-collection");
  });

  it.each([
    "example.com",
    "https://example.com/path",
    "https://*.example.com",
    "https://example.com/",
    "not an origin",
  ])("rejects invalid allowed origin %s", (origin) => {
    process.env.ALLOWED_ORIGINS = origin;

    expect(() => botConfig.allowedOrigins).toThrow("Invalid ALLOWED_ORIGINS entry");
  });

  it("rejects empty production allowed origins", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.ALLOWED_ORIGINS;

    expect(() => botConfig.allowedOrigins).toThrow(
      "ALLOWED_ORIGINS is required in production",
    );
  });
});
