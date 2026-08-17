import { beforeEach, describe, expect, it, vi } from "vitest";

import { botConfig } from "../../../src/config/botConfig";

const limit = vi.hoisted(() => vi.fn());
const slidingWindow = vi.hoisted(() => vi.fn(() => "10-per-minute"));
const openai = vi.hoisted(() => vi.fn(() => "chat-model"));
const embed = vi.hoisted(() => vi.fn());
const convertToModelMessages = vi.hoisted(() => vi.fn((m) => Promise.resolve(m)));
const streamText = vi.hoisted(() => vi.fn());
const toUIMessageStream = vi.hoisted(() => vi.fn(() => "ui-stream"));
const createUIMessageStreamResponse = vi.hoisted(() => vi.fn(({ stream, headers }) =>
  new Response(stream as BodyInit, { headers }),
));
const search = vi.hoisted(() => vi.fn());

vi.mock("../../../src/services/redisClient", () => ({ redisClient: {} }));
vi.mock("../../../src/services/qdrantClient", () => ({
  qdrantClient: { search },
}));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = slidingWindow;
    limit = limit;
  },
}));
vi.mock("@ai-sdk/openai", () => ({
  openai: Object.assign(openai, { embedding: vi.fn((model) => model) }),
}));
vi.mock("ai", () => ({
  convertToModelMessages,
  createUIMessageStreamResponse,
  embed,
  streamText,
  toUIMessageStream,
}));

import { OPTIONS, POST } from "./route";

const request = (origin?: string, prompt = "Hello") =>
  new Request("https://chat.example/api/chat", {
    method: "POST",
    headers: origin ? { origin } : undefined,
    body: JSON.stringify({ prompt }),
  });

describe("POST /api/chat", () => {
  beforeEach(() => {
    botConfig.allowedOrigins = ["https://client.example"];
    limit.mockReset().mockResolvedValue({ success: true });
    openai.mockClear();
    embed.mockReset().mockResolvedValue({ embedding: [0.1, 0.2] });
    search.mockReset().mockResolvedValue([{ payload: { content: "Found facts." } }]);
    streamText.mockReset().mockReturnValue({ stream: "model-stream" });
  });

  it("streams response via createUIMessageStreamResponse with CORS headers", async () => {
    const response = await POST(
      new Request("https://chat.example/api/chat", {
        method: "POST",
        headers: {
          origin: "https://client.example",
          "cf-connecting-ip": "198.51.100.20",
        },
        body: JSON.stringify({ prompt: "Hello" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://client.example",
    );
    expect(limit).toHaveBeenCalledWith("198.51.100.20");
    expect(embed).toHaveBeenCalledWith({
      model: "text-embedding-3-small",
      value: "Hello",
    });
    expect(search).toHaveBeenCalledWith("website-content", {
      vector: [0.1, 0.2],
      limit: 5,
    });
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("Found facts."),
      }),
    );
    expect(createUIMessageStreamResponse).toHaveBeenCalled();
  });

  it("includes Vector Payload sources in the model context", async () => {
    search.mockResolvedValueOnce([
      {
        payload: {
          title: "Example documentation",
          url: "https://example.com/docs",
          index: 7,
          content: "Source-backed fact.",
        },
      },
    ]);

    await POST(request());

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: `${botConfig.systemPrompt}\n\nKontext:\nTitle: Example documentation\nURL: https://example.com/docs\nContent:\nSource-backed fact.`,
      }),
    );
    expect(streamText.mock.calls[0][0].system).not.toContain("7");
  });

  it("omits the CORS allow-origin header for an invalid origin", async () => {
    const response = await POST(request("https://invalid.example"));

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("allows the API's own origin", async () => {
    const response = await POST(request("https://chat.example"));

    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://chat.example",
    );
  });

  it("answers preflight requests for a configured origin", async () => {
    const response = await OPTIONS(
      new Request("https://chat.example/api/chat", {
        method: "OPTIONS",
        headers: { origin: "https://client.example" },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://client.example",
    );
  });

  it("returns a 429 JSON response when the IP limit is exceeded", async () => {
    limit.mockResolvedValueOnce({ success: false });

    const response = await POST(request("https://client.example"));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Too many requests",
    });
  });

  it("logs rate-limit failures and allows the request", async () => {
    const error = new Error("Redis unavailable");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    limit.mockRejectedValueOnce(error);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(consoleError).toHaveBeenCalledWith("Rate limit check failed", error);
    consoleError.mockRestore();
  });

  it("rejects missing prompts", async () => {
    const response = await POST(
      new Request("https://chat.example/api/chat", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "A prompt is required" });
  });

  it("handles UIMessage[] payload from useChat", async () => {
    const messages = [
      { id: "1", role: "user" as const, parts: [{ type: "text" as const, text: "Tell me more" }] },
    ];
    const response = await POST(
      new Request("https://chat.example/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages }),
      }),
    );

    expect(response.status).toBe(200);
    expect(embed).toHaveBeenCalledWith({
      model: "text-embedding-3-small",
      value: "Tell me more",
    });
    expect(convertToModelMessages).toHaveBeenCalledWith(messages);
  });
});
