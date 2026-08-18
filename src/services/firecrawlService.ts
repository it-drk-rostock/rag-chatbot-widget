import { Firecrawl } from "firecrawl";
import { botConfig } from "../config/botConfig";

export type CrawledPage = {
  markdown: string;
  url: string;
  title: string;
};

export class FirecrawlService {
  private readonly apiKey = process.env.FIRECRAWL_API_KEY;
  private readonly firecrawl = new Firecrawl({ apiKey: this.apiKey });

  async crawl(url = botConfig.crawlerTargetUrl): Promise<CrawledPage[]> {
    if (!this.apiKey) throw new Error("FIRECRAWL_API_KEY is required");

    const result = await this.firecrawl.crawl(url, {
      maxDiscoveryDepth: botConfig.crawlMaxDepth,
      limit: botConfig.crawlLimit,
      pollInterval: 15,
      excludePaths: ["/impressum", "/datenschutz"],
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    });
    if (result.status !== "completed") {
      throw new Error(`Firecrawl crawl ${result.status}`);
    }

    return result.data.flatMap((page) => {
      const pageUrl = page.metadata?.sourceURL ?? page.metadata?.url;
      return page.markdown && pageUrl
        ? [
            {
              markdown: page.markdown,
              url: pageUrl,
              title: page.metadata?.title ?? "",
            },
          ]
        : [];
    });
  }
}

export const firecrawlService = new FirecrawlService();
