import { botConfig } from "../config/botConfig";

export type CrawledPage = {
  markdown: string;
  url: string;
  title: string;
};

type CrawlResponse = {
  id?: string;
  success?: boolean;
};

type CrawlStatusResponse = {
  data?: Array<{
    markdown?: string;
    metadata?: { sourceURL?: string; title?: string; url?: string };
  }>;
  next?: string | null;
  status: "scraping" | "completed" | "failed";
};

export class FirecrawlService {
  private readonly apiKey = process.env.FIRECRAWL_API_KEY;
  private readonly baseUrl = "https://api.firecrawl.dev/v2";

  async crawl(url = botConfig.crawlerTargetUrl): Promise<CrawledPage[]> {
    if (!this.apiKey) throw new Error("FIRECRAWL_API_KEY is required");

    const crawl = await this.request<CrawlResponse>("/crawl", {
      method: "POST",
      body: JSON.stringify({
        url,
        maxDiscoveryDepth: 3,
        limit: 10,
        excludePaths: ["/impressum", "/datenschutz"],
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      }),
    });

    if (!crawl.id) throw new Error("Firecrawl did not return a crawl ID");

    let status: CrawlStatusResponse;
    do {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      status = await this.request<CrawlStatusResponse>(`/crawl/${crawl.id}`);
    } while (status.status === "scraping");

    if (status.status === "failed") throw new Error("Firecrawl crawl failed");

    return this.pages(status);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(
      path.startsWith("http") ? path : `${this.baseUrl}${path}`,
      {
        ...init,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...init?.headers,
        },
      },
    );

    if (!response.ok)
      throw new Error(`Firecrawl request failed: ${response.status}`);
    return response.json() as Promise<T>;
  }

  private async pages(status: CrawlStatusResponse): Promise<CrawledPage[]> {
    const pages = (status.data ?? []).flatMap((page) => {
      const url = page.metadata?.sourceURL ?? page.metadata?.url;
      return page.markdown && url
        ? [{ markdown: page.markdown, url, title: page.metadata?.title ?? "" }]
        : [];
    });

    if (!status.next) return pages;
    const next = await this.request<CrawlStatusResponse>(status.next);
    return [...pages, ...(await this.pages(next))];
  }
}

export const firecrawlService = new FirecrawlService();
