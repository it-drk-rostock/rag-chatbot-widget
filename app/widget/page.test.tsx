import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requestHeaders = vi.hoisted(() => new Headers());

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(requestHeaders),
}));

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: [
      { id: "welcome", role: "assistant", parts: [{ type: "text", text: "Willkommen" }] },
    ],
    sendMessage: vi.fn(),
    status: "ready",
  }),
}));

import ChatWidget, { ChatMessages } from "./chat-widget";
import WidgetPage from "./page";

describe("ChatMessages", () => {
  beforeEach(() => {
    requestHeaders.set("sec-fetch-dest", "iframe");
  });

  it("renders user and assistant messages", () => {
    const page = renderToStaticMarkup(
      <MantineProvider>
        <ChatMessages
          loading={false}
          messages={[
            { id: "user", role: "user", content: "Hallo" },
            { id: "assistant", role: "assistant", content: "Willkommen" },
          ]}
        />
      </MantineProvider>,
    );

    expect(page).toContain("Hallo");
    expect(page).toContain("Willkommen");
  });

  it("renders assistant loading state", () => {
    const page = renderToStaticMarkup(
      <MantineProvider>
        <ChatMessages loading messages={[]} />
      </MantineProvider>,
    );

    expect(page).toContain("Assistent schreibt…");
    expect(page).toContain('role="status"');
  });

  it("renders source markdown links as buttons", () => {
    const page = renderToStaticMarkup(
      <MantineProvider>
        <ChatMessages
          loading={false}
          messages={[
            {
              id: "assistant-link",
              role: "assistant",
              content: "Siehe [Quelle](https://example.com/doc) for info.",
            },
          ]}
        />
      </MantineProvider>,
    );

    expect(page).toContain('href="https://example.com/doc"');
    expect(page).toContain("Quelle");
  });

  it("renders ChatWidget with initial welcome message", () => {
    const page = renderToStaticMarkup(
      <MantineProvider>
        <ChatWidget />
      </MantineProvider>,
    );

    expect(page).toContain("Website-Assistent");
    expect(page).toContain("Willkommen");
  });

  it("renders for an approved parent origin", async () => {
    const widget = await WidgetPage({
      searchParams: Promise.resolve({ parentOrigin: "http://localhost:3000" }),
    });

    expect(renderToStaticMarkup(<MantineProvider>{widget}</MantineProvider>)).toContain(
      "Website-Assistent",
    );
  });

  it.each([{}, { parentOrigin: "https://evil.example" }])(
    "rejects missing or unapproved parent origin",
    async (searchParams) => {
      await expect(
        WidgetPage({ searchParams: Promise.resolve(searchParams) }),
      ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    },
  );

  it("rejects direct top-level navigation", async () => {
    requestHeaders.set("sec-fetch-dest", "document");

    await expect(
      WidgetPage({
        searchParams: Promise.resolve({ parentOrigin: "http://localhost:3000" }),
      }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });
});
