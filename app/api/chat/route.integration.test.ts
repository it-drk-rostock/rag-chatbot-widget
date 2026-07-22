import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const limit = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/services/redisClient", () => ({ redisClient: {} }));
vi.mock("../../../src/services/qdrantClient", () => ({
  qdrantClient: {
    search: vi.fn().mockResolvedValue([{ payload: { content: "Fact" } }]),
  },
}));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = vi.fn(() => "10-per-minute");
    limit = limit;
  },
}));

import { POST } from "./route";

describe("POST /api/chat OpenAI integration", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    limit.mockReset().mockResolvedValue({ success: true });
    fetchMock.mockReset().mockImplementation(async (url: string) => {
      if (String(url).includes("/embeddings")) {
        return new Response(
          JSON.stringify({
            data: [{ embedding: [0.1, 0.2] }],
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        [
          'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","created":1677652288,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
          'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","created":1677652288,"model":"gpt-4","choices":[{"index":0,"delta":{"content":" world"},"finish_reason":null}]}\n\n',
          "data: [DONE]\n\n",
        ].join(""),
        { headers: { "Content-Type": "text/event-stream" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("handles prompt request and streams response", async () => {
    const response = await POST(
      new Request("https://chat.example/api/chat", {
        method: "POST",
        body: JSON.stringify({ prompt: "Hello" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(fetchMock).toHaveBeenCalled();
  });
});
