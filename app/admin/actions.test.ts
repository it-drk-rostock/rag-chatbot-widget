import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookieStore } = vi.hoisted(() => ({
  cookieStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("next/headers", () => ({ cookies: vi.fn(async () => cookieStore) }));

import { login } from "./actions";

describe("admin login", () => {
  beforeEach(() => {
    cookieStore.set.mockReset();
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
});
