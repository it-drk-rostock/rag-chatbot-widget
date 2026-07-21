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
  allowedOrigins: string[];
  embeddingModel: "text-embedding-3-small";
  vectorCollection: string;
};

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
  crawlerTargetUrl: "https://example.com",
  allowedOrigins: ["http://localhost:3000"],
  embeddingModel: "text-embedding-3-small",
  vectorCollection: "website-content",
};
