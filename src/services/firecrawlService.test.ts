import { beforeEach, describe, expect, it, vi } from "vitest";

describe("FirecrawlService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });
  it("crawls with configured constraints, polls, and collects pages", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "firecrawl-key");
    vi.stubEnv("CRAWL_LIMIT", "5");
    vi.stubEnv("CRAWL_MAX_DEPTH", "2");
    vi.useFakeTimers();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ id: "crawl-1" }))
      .mockResolvedValueOnce(Response.json({ status: "completed", data: [{ markdown: "# One", metadata: { sourceURL: "https://example.com/one", title: "One" } }], next: "https://api.firecrawl.dev/v2/crawl/crawl-1?page=2" }))
      .mockResolvedValueOnce(Response.json({ status: "completed", data: [{ markdown: "# Two", metadata: { sourceURL: "https://example.com/two", title: "Two" } }] }));
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
      limit: 5,
      excludePaths: ["/impressum", "/datenschutz"],
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    });
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("defaults limit and maxDiscoveryDepth to 1 when env vars unset", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("FIRECRAWL_API_KEY", "firecrawl-key");
    vi.useFakeTimers();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ id: "crawl-2" }))
      .mockResolvedValueOnce(Response.json({ status: "completed", data: [] }));
    const { FirecrawlService } = await import("./firecrawlService");

    const crawl = new FirecrawlService().crawl("https://example.com");
    await vi.advanceTimersByTimeAsync(1_000);
    await crawl;

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      maxDiscoveryDepth: 1,
      limit: 1,
    });
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("throws timeout error when polling exceeds 180 seconds", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "firecrawl-key");
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (url === "https://api.firecrawl.dev/v2/crawl") {
        return Response.json({ id: "crawl-timeout" });
      }
      return Response.json({ status: "scraping" });
    });
    const { FirecrawlService } = await import("./firecrawlService");

    const crawlPromise = new FirecrawlService().crawl("https://example.com");
    const testPromise = expect(crawlPromise).rejects.toThrow("Firecrawl crawl timed out after 180 seconds");
    await vi.advanceTimersByTimeAsync(181_000);

    await testPromise;
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("retries on 429 rate limit status code and succeeds after backoff", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "firecrawl-key");
    vi.useFakeTimers();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("Too Many Requests", { status: 429 }))
      .mockResolvedValueOnce(Response.json({ id: "crawl-retry" }))
      .mockResolvedValueOnce(Response.json({ status: "completed", data: [] }));

    const { FirecrawlService } = await import("./firecrawlService");
    const crawlPromise = new FirecrawlService().crawl("https://example.com");
    await vi.advanceTimersByTimeAsync(5_000);
    const pages = await crawlPromise;

    expect(pages).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });
});

