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
