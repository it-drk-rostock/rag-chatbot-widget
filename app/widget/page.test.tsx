import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: [
      { id: "welcome", role: "assistant", parts: [{ type: "text", text: "Willkommen" }] },
    ],
    sendMessage: vi.fn(),
    status: "ready",
  }),
}));

import WidgetPage, { ChatMessages } from "./page";

describe("ChatMessages", () => {
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

  it("renders WidgetPage with initial welcome message", () => {
    const page = renderToStaticMarkup(
      <MantineProvider>
        <WidgetPage />
      </MantineProvider>,
    );

    expect(page).toContain("Website-Assistent");
    expect(page).toContain("Willkommen");
  });
});

