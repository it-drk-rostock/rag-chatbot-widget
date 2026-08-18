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
vi.mock("../../../src/services/qdrantClient", () => ({ qdrantClient: { search } }));
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

const textMessage = (id: string, role: "user" | "assistant", text: string) => ({
  id,
  role,
  parts: [{ type: "text" as const, text }],
});

const request = (
  body: unknown = { prompt: "Hello" },
  origin: string | null = "https://chat.example",
  headers: Record<string, string> = {},
) =>
  new Request("https://chat.example/api/chat", {
    method: "POST",
    headers: { ...(origin ? { origin } : {}), ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

function expectNoExpensiveCalls() {
  expect(embed).not.toHaveBeenCalled();
  expect(search).not.toHaveBeenCalled();
  expect(convertToModelMessages).not.toHaveBeenCalled();
  expect(streamText).not.toHaveBeenCalled();
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    process.env.ALLOWED_ORIGINS = "https://client.example";
    limit.mockReset().mockResolvedValue({ success: true });
    openai.mockClear();
    embed.mockReset().mockResolvedValue({ embedding: [0.1, 0.2] });
    search.mockReset().mockResolvedValue([{ payload: { content: "Found facts." } }]);
    convertToModelMessages.mockClear();
    streamText.mockReset().mockReturnValue({ stream: "model-stream" });
  });

  it("streams responses for a configured origin", async () => {
    const response = await POST(request(
      { prompt: "Hello" },
      "https://client.example",
      { "cf-connecting-ip": "198.51.100.20" },
    ));

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://client.example");
    expect(limit).toHaveBeenCalledWith("198.51.100.20");
    expect(embed).toHaveBeenCalledWith({ model: "text-embedding-3-small", value: "Hello" });
    expect(search).toHaveBeenCalledWith("website-content", { vector: [0.1, 0.2], limit: 5 });
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({ system: expect.stringContaining("Found facts.") }),
    );
    expect(createUIMessageStreamResponse).toHaveBeenCalled();
  });

  it("includes Vector Payload sources in model context", async () => {
    search.mockResolvedValueOnce([{ payload: {
      title: "Example documentation",
      url: "https://example.com/docs",
      index: 7,
      content: "Source-backed fact.",
    } }]);

    await POST(request());

    expect(streamText).toHaveBeenCalledWith(expect.objectContaining({
      system: `${botConfig.systemPrompt}\n\nKontext:\nTitle: Example documentation\nURL: https://example.com/docs\nContent:\nSource-backed fact.`,
    }));
    expect(streamText.mock.calls[0][0].system).not.toContain("7");
    expect(streamText.mock.calls[0][0].system).toContain(
      "Verlinke immer die spezifischste passende Quellseite",
    );
  });

  it.each([
    ["invalid", "https://invalid.example"],
    ["missing", null],
  ])("returns 403 for %s Origin before downstream work", async (_, origin) => {
    const response = await POST(request(undefined, origin));

    expect(response.status).toBe(403);
    expect(limit).not.toHaveBeenCalled();
    expectNoExpensiveCalls();
  });

  it("allows API own origin", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://chat.example");
  });

  it("answers preflight requests for a configured origin", async () => {
    const response = await OPTIONS(new Request("https://chat.example/api/chat", {
      method: "OPTIONS",
      headers: { origin: "https://client.example" },
    }));

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://client.example");
  });

  it.each([
    ["invalid", "https://invalid.example"],
    ["missing", null],
  ])("returns 403 for %s preflight Origin", async (_, origin) => {
    const response = await OPTIONS(new Request("https://chat.example/api/chat", {
      method: "OPTIONS",
      headers: origin ? { origin } : undefined,
    }));

    expect(response.status).toBe(403);
  });

  it("keeps ten requests per IP per minute policy", () => {
    expect(slidingWindow).toHaveBeenCalledWith(10, "1 m");
  });

  it("returns 429 without expensive work when IP limit is exceeded", async () => {
    limit.mockResolvedValueOnce({ success: false });

    const response = await POST(request());

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({ error: "Too many requests" });
    expectNoExpensiveCalls();
  });

  it("returns 503 without expensive work when rate limiting throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    limit.mockRejectedValueOnce(new Error("Redis unavailable"));

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(consoleError).toHaveBeenCalledWith(
      "Chat rate limiting unavailable: Redis check failed",
      expect.any(Error),
    );
    expectNoExpensiveCalls();
    consoleError.mockRestore();
  });

  it.each([
    ["missing URL", undefined, "redis-token"],
    ["invalid URL", "not-a-url", "redis-token"],
    ["missing token", "https://redis.example", undefined],
  ])("returns 503 in production for %s", async (_, url, token) => {
    vi.stubEnv("NODE_ENV", "production");
    if (url === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = url;
    if (token === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = token;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(limit).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "Chat rate limiting unavailable: invalid production configuration",
    );
    expectNoExpensiveCalls();
    consoleError.mockRestore();
  });

  it("returns 413 for body over 32 KiB without trusting Content-Length", async () => {
    const body = JSON.stringify({ prompt: "Hello", padding: "x".repeat(32_768) });

    const response = await POST(request(body, undefined, { "content-length": "1" }));

    expect(response.status).toBe(413);
    expectNoExpensiveCalls();
  });

  it("accepts body exactly 32 KiB", async () => {
    const prefix = '{"prompt":"Hello","padding":"';
    const suffix = '"}';
    const body = prefix + "x".repeat(32_768 - prefix.length - suffix.length) + suffix;

    const response = await POST(request(body));

    expect(new TextEncoder().encode(body)).toHaveLength(32_768);
    expect(response.status).toBe(200);
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await POST(request("{"));

    expect(response.status).toBe(400);
    expectNoExpensiveCalls();
  });

  it.each([
    ["non-object body", []],
    ["non-string prompt", { prompt: 1 }],
    ["non-array messages", { messages: {} }],
    ["invalid role", { messages: [{ id: "1", role: "system", parts: [{ type: "text", text: "Hi" }] }] }],
    ["invalid part", { messages: [{ id: "1", role: "user", parts: [{ type: "image", url: "x" }] }] }],
    ["invalid text", { messages: [{ id: "1", role: "user", parts: [{ type: "text", text: 1 }] }] }],
  ])("returns 400 for %s", async (_, body) => {
    const response = await POST(request(body));

    expect(response.status).toBe(400);
    expectNoExpensiveCalls();
  });

  it("returns 413 for more than 20 messages", async () => {
    const messages = Array.from({ length: 21 }, (_, index) =>
      textMessage(String(index), index % 2 ? "assistant" : "user", "x"));

    const response = await POST(request({ messages }));

    expect(response.status).toBe(413);
    expectNoExpensiveCalls();
  });

  it("accepts exactly 20 messages", async () => {
    const messages = Array.from({ length: 20 }, (_, index) =>
      textMessage(String(index), index % 2 ? "assistant" : "user", "x"));

    expect((await POST(request({ messages }))).status).toBe(200);
  });

  it("returns 413 for latest user prompt over 2,000 characters", async () => {
    const response = await POST(request({ messages: [textMessage("1", "user", "x".repeat(2_001))] }));

    expect(response.status).toBe(413);
    expectNoExpensiveCalls();
  });

  it("counts whitespace in latest user prompt limit", async () => {
    const response = await POST(request({
      messages: [textMessage("1", "user", `x${" ".repeat(2_000)}`)],
    }));

    expect(response.status).toBe(413);
    expectNoExpensiveCalls();
  });

  it("accepts latest user prompt exactly 2,000 characters", async () => {
    const response = await POST(request({ messages: [textMessage("1", "user", "x".repeat(2_000))] }));

    expect(response.status).toBe(200);
  });

  it("returns 413 for total conversation text over 12,000 characters", async () => {
    const messages = [
      textMessage("1", "assistant", "x".repeat(10_001)),
      textMessage("2", "user", "x".repeat(2_000)),
    ];

    const response = await POST(request({ messages }));

    expect(response.status).toBe(413);
    expectNoExpensiveCalls();
  });

  it("accepts total conversation text exactly 12,000 characters", async () => {
    const messages = Array.from({ length: 6 }, (_, index) =>
      textMessage(String(index), index % 2 ? "assistant" : "user", "x".repeat(2_000)));

    expect((await POST(request({ messages }))).status).toBe(200);
  });

  it("handles UIMessage payload from useChat", async () => {
    const messages = [textMessage("1", "user", "Tell me more")];
    const response = await POST(request({ messages }));

    expect(response.status).toBe(200);
    expect(embed).toHaveBeenCalledWith({ model: "text-embedding-3-small", value: "Tell me more" });
    expect(convertToModelMessages).toHaveBeenCalledWith(messages);
  });

  it("accepts a follow-up after an AI SDK step-start part", async () => {
    const messages = [
      textMessage("1", "user", "What services are available?"),
      {
        id: "2",
        role: "assistant" as const,
        parts: [
          { type: "step-start" as const },
          { type: "text" as const, text: "Several services are available." },
        ],
      },
      textMessage("3", "user", "Tell me more about the first one."),
    ];

    const response = await POST(request({ messages }));

    expect(response.status).toBe(200);
    expect(embed).toHaveBeenCalledWith({
      model: "text-embedding-3-small",
      value: "Tell me more about the first one.",
    });
    expect(convertToModelMessages).toHaveBeenCalledWith(messages);
  });
});
