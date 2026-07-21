import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { trigger, isAdminAuthenticated } = vi.hoisted(() => ({
  trigger: vi.fn(),
  isAdminAuthenticated: vi.fn(),
}));

vi.mock("@trigger.dev/sdk", () => ({ tasks: { trigger } }));
vi.mock("./admin/actions", () => ({ isAdminAuthenticated }));

import { triggerHelloWorld } from "./actions";

describe("triggerHelloWorld", () => {
  beforeEach(() => {
    trigger.mockReset();
    isAdminAuthenticated.mockReset();
    isAdminAuthenticated.mockResolvedValue(true);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("triggers hello-world and returns its run ID", async () => {
    trigger.mockResolvedValue({ id: "run_123456789" });

    await expect(triggerHelloWorld()).resolves.toEqual({
      runId: "run_123456789",
    });
    expect(trigger).toHaveBeenCalledWith("hello-world", undefined);
  });

  it("blocks requests without a valid admin session", async () => {
    isAdminAuthenticated.mockResolvedValue(false);

    await expect(triggerHelloWorld()).rejects.toThrow("Unauthorized");
    expect(trigger).not.toHaveBeenCalled();
  });

  it("does not expose the test task in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(triggerHelloWorld()).rejects.toThrow(
      "hello-world is only available in development",
    );
    expect(trigger).not.toHaveBeenCalled();
  });
});
