export type BotColors = {
  primary: string;
  surface: string;
  text: string;
};

export type BotConfig = {
  colors: BotColors;
  name: string;
  welcomeMessage: string;
  systemPrompt: string;
  crawlerTargetUrl: string;
  readonly crawlLimit: number;
  readonly crawlMaxDepth: number;
  allowedOrigins: string[];
  embeddingModel: "text-embedding-3-small";
  vectorCollection: string;
};

let overrideCrawlerTargetUrl: string | undefined;
let overrideAllowedOrigins: string[] | undefined;
let overrideVectorCollection: string | undefined;

export const botConfig: BotConfig = {
  colors: {
    primary: "#228be6",
    surface: "#ffffff",
    text: "#212529",
  },
  name: "Website-Assistent",
  welcomeMessage: "Hallo! Wie kann ich Ihnen helfen?",
  systemPrompt:
    "Beantworte Fragen ausschließlich anhand des bereitgestellten Kontexts und verlinke die verwendeten Quellen als Markdown.",
  get crawlerTargetUrl() {
    return overrideCrawlerTargetUrl ?? process.env.CRAWLER_TARGET_URL ?? "https://example.com";
  },
  set crawlerTargetUrl(val: string) {
    overrideCrawlerTargetUrl = val;
  },
  get crawlLimit() {
    return Number(process.env.CRAWL_LIMIT ?? 150);
  },
  get crawlMaxDepth() {
    return Number(process.env.CRAWL_MAX_DEPTH ?? 3);
  },
  get allowedOrigins() {
    if (overrideAllowedOrigins !== undefined) {
      return overrideAllowedOrigins;
    }
    return process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
      : ["http://localhost:3000"];
  },
  set allowedOrigins(val: string[]) {
    overrideAllowedOrigins = val;
  },
  embeddingModel: "text-embedding-3-small",
  get vectorCollection() {
    return overrideVectorCollection ?? process.env.QDRANT_COLLECTION ?? "website-content";
  },
  set vectorCollection(val: string) {
    overrideVectorCollection = val;
  },
};
