import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const metadata = { set: vi.fn() };
  metadata.set.mockReturnValue(metadata);
  return {
    chunkMarkdown: vi.fn(),
    crawl: vi.fn(),
    createEmbedding: vi.fn(),
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

vi.mock("../src/services/firecrawlService", () => ({
  firecrawlService: { crawl: mocks.crawl },
}));
vi.mock("../src/services/markdownChunker", () => ({
  chunkMarkdown: mocks.chunkMarkdown,
}));
vi.mock("../src/services/openaiClient", () => ({
  openaiClient: { embeddings: { create: mocks.createEmbedding } },
}));
vi.mock("../src/services/qdrantClient", () => ({
  qdrantClient: { upsert: mocks.upsert },
}));

import { crawlAndEmbed } from "./crawl-and-embed";

describe("crawlAndEmbedTask", () => {
  it("crawls, chunks, embeds, and upserts each page in sequence", async () => {
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
    mocks.createEmbedding.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2] }, { embedding: [0.3, 0.4] }],
    });

    await expect(crawlAndEmbed()).resolves.toEqual({
      pages: 1,
      chunks: 2,
    });

    expect(mocks.crawl).toHaveBeenCalledWith();
    expect(mocks.chunkMarkdown).toHaveBeenCalledWith(page.markdown, page);
    expect(mocks.createEmbedding).toHaveBeenCalledWith({
      model: "text-embedding-3-small",
      input: ["# Page", "Details"],
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
    expect(mocks.crawl.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.chunkMarkdown.mock.invocationCallOrder[0],
    );
    expect(mocks.createEmbedding.mock.invocationCallOrder[0]).toBeLessThan(mocks.upsert.mock.invocationCallOrder[0]);
    expect(mocks.chunkMarkdown.mock.invocationCallOrder[0]).toBeLessThan(mocks.createEmbedding.mock.invocationCallOrder[0]);
    expect(mocks.metadata.set.mock.calls).toEqual([
      ["status", "queued"],
      ["status", "crawling"],
      ["status", "embedding"],
      ["status", "upserting"],
      ["status", "completed"],
    ]);
  });
});
