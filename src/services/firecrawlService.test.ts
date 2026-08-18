import { beforeEach, describe, expect, it, vi } from "vitest";

const firecrawlMocks = vi.hoisted(() => ({
  constructor: vi.fn(),
  crawl: vi.fn(),
}));

vi.mock("firecrawl", () => ({
  Firecrawl: class {
    constructor(options: unknown) {
      firecrawlMocks.constructor(options);
    }

    crawl = firecrawlMocks.crawl;
  },
}));

describe("FirecrawlService", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    firecrawlMocks.constructor.mockReset();
    firecrawlMocks.crawl.mockReset();
    vi.stubEnv("FIRECRAWL_API_KEY", "firecrawl-key");
  });

  it("crawls with configured constraints and maps complete pages", async () => {
    vi.stubEnv("CRAWL_LIMIT", "5");
    vi.stubEnv("CRAWL_MAX_DEPTH", "2");
    firecrawlMocks.crawl.mockResolvedValue({
      status: "completed",
      data: [
        {
          markdown: "# One",
          metadata: { sourceURL: "https://example.com/one", title: "One" },
        },
        { markdown: "# Missing URL", metadata: { title: "Skipped" } },
      ],
    });
    const { firecrawlService } = await import("./firecrawlService");

    await expect(firecrawlService.crawl("https://example.com")).resolves.toEqual([
      {
        markdown: "# One",
        url: "https://example.com/one",
        title: "One",
      },
    ]);
    expect(firecrawlMocks.constructor).toHaveBeenCalledWith({
      apiKey: "firecrawl-key",
    });
    expect(firecrawlMocks.crawl).toHaveBeenCalledWith("https://example.com", {
      maxDiscoveryDepth: 2,
      limit: 5,
      pollInterval: 15,
      excludePaths: ["/impressum", "/datenschutz"],
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    });
  });

  it("uses fallback crawl limits when environment variables are unset", async () => {
    firecrawlMocks.crawl.mockResolvedValue({ status: "completed", data: [] });
    const { firecrawlService } = await import("./firecrawlService");

    await firecrawlService.crawl("https://example.com");

    expect(firecrawlMocks.crawl).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ maxDiscoveryDepth: 3, limit: 150 }),
    );
  });

  it.each(["failed", "cancelled"])(
    "rejects a %s crawl instead of returning partial pages",
    async (status) => {
      firecrawlMocks.crawl.mockResolvedValue({ status, data: [] });
      const { firecrawlService } = await import("./firecrawlService");

      await expect(
        firecrawlService.crawl("https://example.com"),
      ).rejects.toThrow(`Firecrawl crawl ${status}`);
    },
  );
});
