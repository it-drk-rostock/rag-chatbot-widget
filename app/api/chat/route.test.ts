import { beforeEach, describe, expect, it, vi } from "vitest";

import { botConfig } from "../../../src/config/botConfig";

const limit = vi.hoisted(() => vi.fn());
const slidingWindow = vi.hoisted(() => vi.fn(() => "10-per-minute"));
const openai = vi.hoisted(() => vi.fn(() => "chat-model"));
const streamText = vi.hoisted(() => vi.fn());

vi.mock("../../../src/services/redisClient", () => ({ redisClient: {} }));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = slidingWindow;
    limit = limit;
  },
}));
vi.mock("@ai-sdk/openai", () => ({ openai }));
vi.mock("ai", () => ({ streamText }));

import { OPTIONS, POST } from "./route";

const textStream = (...tokens: string[]) =>
  new ReadableStream<string>({
    start(controller) {
      tokens.forEach((token) => controller.enqueue(token));
      controller.close();
    },
  });
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
    streamText.mockReset().mockReturnValue({ textStream: textStream("Hello ", "world") });
  });

  it("streams OpenAI tokens as SSE with CORS headers", async () => {
    const response = await POST(
      new Request("https://chat.example/api/chat", {
        method: "POST",
        headers: {
          origin: "https://client.example",
          "cf-connecting-ip": "198.51.100.20",
          "x-forwarded-for": "203.0.113.10",
        },
        body: JSON.stringify({ prompt: "Hello" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://client.example",
    );
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    await expect(response.text()).resolves.toBe(
      'data: {"text":"Hello "}\n\ndata: {"text":"world"}\n\nevent: done\ndata: [DONE]\n\n',
    );
    expect(limit).toHaveBeenCalledWith("198.51.100.20");
    expect(slidingWindow).toHaveBeenCalledWith(10, "1 m");
    expect(openai).toHaveBeenCalledWith("gpt-5.4-mini-2026-03-17");
    expect(streamText).toHaveBeenCalledWith({ model: "chat-model", prompt: "Hello" });
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
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "POST, OPTIONS",
    );
    expect(response.headers.get("access-control-allow-headers")).toBe(
      "Content-Type",
    );
  });

  it("returns a 429 JSON response when the IP limit is exceeded", async () => {
    limit.mockResolvedValueOnce({ success: false });

    const response = await POST(request("https://client.example"));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Too many requests",
    });
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://client.example",
    );
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

  it("sends an SSE error when completion streaming fails", async () => {
    const error = new Error("OpenAI unavailable");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    streamText.mockReturnValueOnce({
      textStream: new ReadableStream({
        start(controller) {
          controller.error(error);
        },
      }),
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(
      'event: error\ndata: {"error":"Unable to generate a response"}\n\n',
    );
    expect(consoleError).toHaveBeenCalledWith("Chat completion failed", error);
    consoleError.mockRestore();
  });
});
