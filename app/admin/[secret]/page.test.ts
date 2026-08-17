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
      env: {
        ...process.env,
        ADMIN_SECRET_PATH: "correct-secret",
        ADMIN_PASSWORD: "correct-password",
        ADMIN_SESSION_SECRET: "independent-high-entropy-test-secret",
      },
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

    const loginResponse = await fetch(`${baseUrl}/admin/correct-secret`);
    expect(loginResponse.status).toBe(200);
    const html = await loginResponse.text();
    expect(html).toContain("Admin password");
    expect(html).not.toContain("Run hello-world");
    expect(html).not.toContain("Website-Assistent");
  });

  it("shows the dashboard only after login creates a valid session cookie", async () => {
    const loginPage = await fetch(`${baseUrl}/admin/correct-secret`);
    const html = await loginPage.text();
    const formData = new FormData();
    const actionFields = html.matchAll(
      /<input type="hidden" name="(\$ACTION_[^"]+)"(?: value="([^"]*)")?\/>/g,
    );
    for (const [, name, value = ""] of actionFields) {
      formData.set(name, value.replaceAll("&quot;", '"').replaceAll("&amp;", "&"));
    }
    expect([...formData.keys()]).not.toHaveLength(0);
    formData.set("password", "correct-password");

    const loginResponse = await fetch(`${baseUrl}/admin/correct-secret`, {
      method: "POST",
      body: formData,
    });
    const sessionCookie = loginResponse.headers.get("set-cookie")?.split(";", 1)[0];
    expect(sessionCookie).toMatch(/^admin-session=/);

    const dashboard = await fetch(`${baseUrl}/admin/correct-secret`, {
      headers: { cookie: sessionCookie! },
    });
    const dashboardHtml = await dashboard.text();
    expect(dashboardHtml).toContain("Admin Dashboard");
    expect(dashboardHtml).toContain("Run hello-world");
    expect(dashboardHtml).toContain("Website-Assistent");
    expect(dashboardHtml).toContain("Log out");

    const tamperedCookieResponse = await fetch(`${baseUrl}/admin/correct-secret`, {
      headers: { cookie: "admin-session=0.invalid" },
    });
    const tamperedHtml = await tamperedCookieResponse.text();
    expect(tamperedHtml).not.toContain("Run hello-world");
    expect(tamperedHtml).not.toContain("Website-Assistent");
  });
});
