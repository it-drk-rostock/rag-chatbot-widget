import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const metadata = { set: vi.fn() };
  metadata.set.mockReturnValue(metadata);
  return {
    chunkMarkdown: vi.fn(),
    crawl: vi.fn(),
    embedMany: vi.fn(),
    resetCollection: vi.fn(),
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

const mockEmbedding = vi.hoisted(() => vi.fn((model) => model));

vi.mock("@ai-sdk/openai", () => ({
  openai: {
    embedding: mockEmbedding,
  },
  createOpenAI: vi.fn(() => ({
    embedding: mockEmbedding,
  })),
}));

vi.mock("../src/services/firecrawlService", () => ({
  firecrawlService: { crawl: mocks.crawl },
}));
vi.mock("../src/services/markdownChunker", () => ({
  chunkMarkdown: mocks.chunkMarkdown,
}));
vi.mock("../src/services/qdrantClient", () => ({
  resetCollection: mocks.resetCollection,
  qdrantClient: { upsert: mocks.upsert },
}));

import { crawlAndEmbed } from "./crawl-and-embed";

describe("crawlAndEmbedTask", () => {
  it("crawls, resets collection, chunks, embeds, and upserts each page in sequence", async () => {
    const page = {
      markdown: "# Page\nFull page raw content",
      title: "Page",
      url: "https://example.com/page",
    };
    const chunks = [
      { url: page.url, title: page.title, content: "# Page", index: 0 },
      { url: page.url, title: page.title, content: "Details", index: 1 },
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
    expect(mocks.resetCollection).toHaveBeenCalledWith("website-content");
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

    // Verify resetCollection was called before upsert
    const resetCallOrder = mocks.resetCollection.mock.invocationCallOrder[0];
    const upsertCallOrder = mocks.upsert.mock.invocationCallOrder[0];
    expect(resetCallOrder).toBeLessThan(upsertCallOrder);

    // Verify payload does NOT contain raw markdown and matches exact target shape
    const upsertPayload = mocks.upsert.mock.calls[0][1].points[0].payload;
    expect(upsertPayload).not.toHaveProperty("markdown");
    expect(upsertPayload).toEqual({
      url: page.url,
      title: page.title,
      index: 0,
      content: "# Page",
    });
  });
});

