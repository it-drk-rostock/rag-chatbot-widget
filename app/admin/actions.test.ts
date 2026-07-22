import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookieStore, trigger, createPublicToken } = vi.hoisted(() => ({
  cookieStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
  trigger: vi.fn(),
  createPublicToken: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: vi.fn(async () => cookieStore) }));
vi.mock("@trigger.dev/sdk", () => ({
  tasks: { trigger },
  auth: { createPublicToken },
}));

import { login, triggerCrawl } from "./actions";

describe("admin login", () => {
  let currentCookie: string | undefined;

  beforeEach(() => {
    currentCookie = undefined;
    cookieStore.set.mockReset();
    cookieStore.get.mockReset();
    cookieStore.get.mockImplementation((name: string) =>
      name === "admin-session" && currentCookie
        ? { value: currentCookie }
        : undefined,
    );
    cookieStore.set.mockImplementation((name: string, value: string) => {
      if (name === "admin-session") currentCookie = value;
    });
    trigger.mockReset();
    createPublicToken.mockReset();
    vi.stubEnv("ADMIN_PASSWORD", "correct-password");
    vi.stubEnv("ADMIN_SESSION_SECRET", "independent-high-entropy-test-secret");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("rejects an incorrect password without creating a session", async () => {
    const formData = new FormData();
    formData.set("password", "wrong-password");

    await expect(login({}, formData)).resolves.toEqual({
      error: "Incorrect password",
    });
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("creates a secure session cookie for the configured password", async () => {
    const formData = new FormData();
    formData.set("password", "correct-password");

    await expect(login({}, formData)).resolves.toEqual({});
    expect(cookieStore.set).toHaveBeenCalledWith(
      "admin-session",
      expect.stringMatching(/^[\w-]+\.[\w-]+$/),
      expect.objectContaining({
        httpOnly: true,
        sameSite: "strict",
        path: "/admin",
        maxAge: 8 * 60 * 60,
      }),
    );
  });

  it("triggers crawl task and returns run ID with public token when authenticated", async () => {
    const formData = new FormData();
    formData.set("password", "correct-password");
    await login({}, formData);

    trigger.mockResolvedValue({ id: "run_crawl_123" });
    createPublicToken.mockResolvedValue("pk_test_token_123");

    const result = await triggerCrawl();
    expect(result).toEqual({
      runId: "run_crawl_123",
      publicToken: "pk_test_token_123",
    });
    expect(trigger).toHaveBeenCalledWith("crawl-and-embed", undefined);
    expect(createPublicToken).toHaveBeenCalledWith({
      scopes: { read: { runs: ["run_crawl_123"] } },
    });
  });

  it("throws when unauthenticated", async () => {
    cookieStore.get.mockReturnValue(undefined);
    await expect(triggerCrawl()).rejects.toThrow("Unauthorized");
  });
});
