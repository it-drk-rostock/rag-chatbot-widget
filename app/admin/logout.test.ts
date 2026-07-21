import { describe, expect, it, vi } from "vitest";

const { cookieStore } = vi.hoisted(() => ({
  cookieStore: { delete: vi.fn() },
}));

vi.mock("next/headers", () => ({ cookies: vi.fn(async () => cookieStore) }));

import { logout } from "./actions";

describe("admin logout", () => {
  it("clears the session cookie", async () => {
    await logout();
    expect(cookieStore.delete).toHaveBeenCalledWith("admin-session");
  });
});
