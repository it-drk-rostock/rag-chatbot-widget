import { beforeEach, describe, expect, it, vi } from "vitest";

import { botConfig } from "../../../src/config/botConfig";

const limit = vi.hoisted(() => vi.fn());
const slidingWindow = vi.hoisted(() => vi.fn(() => "10-per-minute"));

vi.mock("../../../src/services/redisClient", () => ({ redisClient: {} }));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = slidingWindow;
    limit = limit;
  },
}));

import { OPTIONS, POST } from "./route";

describe("POST /api/chat", () => {
  beforeEach(() => {
    botConfig.allowedOrigins = ["https://client.example"];
    limit.mockReset().mockResolvedValue({ success: true });
  });

  it("allows a configured origin and returns its CORS header", async () => {
    const response = await POST(
      new Request("https://chat.example/api/chat", {
        method: "POST",
        headers: {
          origin: "https://client.example",
          "cf-connecting-ip": "198.51.100.20",
          "x-forwarded-for": "203.0.113.10",
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://client.example",
    );
    expect(limit).toHaveBeenCalledWith("198.51.100.20");
    expect(slidingWindow).toHaveBeenCalledWith(10, "1 m");
  });

  it("omits the CORS allow-origin header for an invalid origin", async () => {
    const response = await POST(
      new Request("https://chat.example/api/chat", {
        method: "POST",
        headers: { origin: "https://invalid.example" },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("allows the API's own origin", async () => {
    const response = await POST(
      new Request("https://chat.example/api/chat", {
        method: "POST",
        headers: { origin: "https://chat.example" },
      }),
    );

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

    const response = await POST(
      new Request("https://chat.example/api/chat", {
        method: "POST",
        headers: {
          origin: "https://client.example",
          "x-forwarded-for": "203.0.113.10",
        },
      }),
    );

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

    const response = await POST(
      new Request("https://chat.example/api/chat", { method: "POST" }),
    );

    expect(response.status).toBe(204);
    expect(consoleError).toHaveBeenCalledWith("Rate limit check failed", error);
    consoleError.mockRestore();
  });
});
