import { describe, expect, it } from "vitest";

import { botConfig } from "./botConfig";

describe("botConfig", () => {
  it("provides the static settings needed by the chat widget and crawler", () => {
    expect(botConfig).toMatchObject({
      colors: expect.any(Object),
      name: expect.any(String),
      welcomeMessage: expect.any(String),
      systemPrompt: expect.any(String),
      crawlerTargetUrl: expect.any(String),
      allowedOrigins: expect.any(Array),
      embeddingModel: expect.any(String),
    });
  });
});
