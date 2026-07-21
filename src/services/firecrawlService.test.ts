import { describe, expect, it, vi } from "vitest";

describe("FirecrawlService", () => {
  it("crawls with fixed constraints, polls, and collects pages", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "firecrawl-key");
    vi.useFakeTimers();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ id: "crawl-1" }))
      .mockResolvedValueOnce(Response.json({ status: "completed", data: [{ markdown: "# One", metadata: { sourceURL: "https://example.com/one", title: "One" } }], next: "https://api.firecrawl.dev/v2/crawl/crawl-1?page=2" }))
      .mockResolvedValueOnce(Response.json({ status: "completed", data: [{ markdown: "# Two", metadata: { sourceURL: "https://example.com/two", title: "Two" } } ] }));
    const { FirecrawlService } = await import("./firecrawlService");

    const crawl = new FirecrawlService().crawl("https://example.com");
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(crawl).resolves.toEqual([
      { markdown: "# One", url: "https://example.com/one", title: "One" },
      { markdown: "# Two", url: "https://example.com/two", title: "Two" },
    ]);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://api.firecrawl.dev/v2/crawl", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      maxDiscoveryDepth: 2,
      limit: 150,
      excludePaths: ["/impressum", "/datenschutz"],
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    });
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });
});
