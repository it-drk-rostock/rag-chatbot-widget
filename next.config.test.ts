import { afterEach, beforeEach, describe, expect, it } from "vitest";

import nextConfig from "./next.config";

describe("Chat Widget response headers", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ALLOWED_ORIGINS: "https://client.example,https://portal.example:8443",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("allows framing only by configured client origins and sends baseline headers", async () => {
    const routes = await nextConfig.headers!();
    const widget = routes.find((route) => route.source === "/widget");
    const headers = new Headers(
      widget?.headers.map(({ key, value }) => [key, value]),
    );

    expect(headers.get("Content-Security-Policy")).toBe(
      "frame-ancestors https://client.example https://portal.example:8443",
    );
    expect(headers.get("Content-Security-Policy")).not.toContain("evil.example");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=()",
    );
  });
});
