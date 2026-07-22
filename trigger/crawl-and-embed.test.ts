import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const metadata = { set: vi.fn() };
  metadata.set.mockReturnValue(metadata);
  return {
    chunkMarkdown: vi.fn(),
    crawl: vi.fn(),
    embedMany: vi.fn(),
    ensureCollectionExists: vi.fn(),
    metadata,
    task: vi.fn((definition) => definition),
    upsert: vi.fn(),
  };
});

vi.mock("@trigger.dev/sdk", () => ({
  AbortTaskRunError: class AbortTaskRunError extends Error {},
  metadata: mocks.metadata,
  task: mocks.task,
}));

vi.mock("ai", () => ({
  embedMany: mocks.embedMany,
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: {
    embedding: vi.fn((model) => model),
  },
}));

vi.mock("../src/services/firecrawlService", () => ({
  firecrawlService: { crawl: mocks.crawl },
}));
vi.mock("../src/services/markdownChunker", () => ({
  chunkMarkdown: mocks.chunkMarkdown,
}));
vi.mock("../src/services/qdrantClient", () => ({
  ensureCollectionExists: mocks.ensureCollectionExists,
  qdrantClient: { upsert: mocks.upsert },
}));

import { crawlAndEmbed } from "./crawl-and-embed";

describe("crawlAndEmbedTask", () => {
  it("crawls, checks collection existence, chunks, embeds, and upserts each page in sequence", async () => {
    const page = {
      markdown: "# Page",
      title: "Page",
      url: "https://example.com/page",
    };
    const chunks = [
      { ...page, content: "# Page", index: 0 },
      { ...page, content: "Details", index: 1 },
    ];
    mocks.crawl.mockResolvedValue([page]);
    mocks.chunkMarkdown.mockReturnValue(chunks);
    mocks.embedMany.mockResolvedValue({
      embeddings: [[0.1, 0.2], [0.3, 0.4]],
    });

    await expect(crawlAndEmbed()).resolves.toEqual({
      pages: 1,
      chunks: 2,
    });

    expect(mocks.crawl).toHaveBeenCalledWith();
    expect(mocks.ensureCollectionExists).toHaveBeenCalledWith("website-content");
    expect(mocks.chunkMarkdown).toHaveBeenCalledWith(page.markdown, page);
    expect(mocks.embedMany).toHaveBeenCalledWith({
      model: "text-embedding-3-small",
      values: ["# Page", "Details"],
    });
    expect(mocks.upsert).toHaveBeenCalledWith(
      "website-content",
      expect.objectContaining({
        wait: true,
        points: [
          expect.objectContaining({ vector: [0.1, 0.2], payload: chunks[0] }),
          expect.objectContaining({ vector: [0.3, 0.4], payload: chunks[1] }),
        ],
      }),
    );
  });
});
