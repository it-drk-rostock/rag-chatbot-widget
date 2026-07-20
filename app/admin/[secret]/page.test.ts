import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let server: ChildProcess;
let baseUrl: string;

async function getFreePort() {
  return new Promise<number>((resolve) => {
    const probe = createServer().listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") throw new Error("No test port");
      probe.close(() => resolve(address.port));
    });
  });
}

beforeAll(async () => {
  const port = await getFreePort();
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      env: { ...process.env, ADMIN_SECRET_PATH: "correct-secret" },
      stdio: "ignore",
    },
  );

  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      await fetch(baseUrl);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error("Next.js test server did not start");
}, 15_000);

afterAll(() => server?.kill());

describe("admin path", () => {
  it("returns 404 for the wrong secret and login UI for the configured secret", async () => {
    const missing = await fetch(`${baseUrl}/admin/wrong-secret`);
    expect(missing.status).toBe(404);

    const login = await fetch(`${baseUrl}/admin/correct-secret`);
    expect(login.status).toBe(200);
    expect(await login.text()).toContain("Admin password");
  });
});
