import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChatMessages } from "./page";

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
});
