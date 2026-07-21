import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const limit = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/services/redisClient", () => ({ redisClient: {} }));
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
    fetchMock.mockReset().mockResolvedValue(
      new Response(
        [
          'data: {"type":"response.output_text.delta","item_id":"item_1","delta":"Hello "}\n\n',
          'data: {"type":"response.output_text.delta","item_id":"item_1","delta":"world"}\n\n',
          'data: {"type":"response.completed","response":{"usage":{"input_tokens":1,"output_tokens":2}}}\n\n',
          "data: [DONE]\n\n",
        ].join(""),
        { headers: { "Content-Type": "text/event-stream" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("translates an OpenAI token stream into completion SSE events", async () => {
    const response = await POST(
      new Request("https://chat.example/api/chat", {
        method: "POST",
        body: JSON.stringify({ prompt: "Hello" }),
      }),
    );

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    await expect(response.text()).resolves.toBe(
      'data: {"text":"Hello "}\n\ndata: {"text":"world"}\n\nevent: done\ndata: [DONE]\n\n',
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain("/responses");
  });
});
