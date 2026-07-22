import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChatMessages } from "./page";

describe("ChatMessages", () => {
  it("renders user and assistant messages", () => {
    const page = renderToStaticMarkup(
      <ChatMessages
        loading={false}
        messages={[
          { id: "user", role: "user", content: "Hallo" },
          { id: "assistant", role: "assistant", content: "Willkommen" },
        ]}
      />,
    );

    expect(page).toContain("Hallo");
    expect(page).toContain("Willkommen");
  });

  it("renders assistant loading state", () => {
    const page = renderToStaticMarkup(<ChatMessages loading messages={[]} />);

    expect(page).toContain("Assistent schreibt…");
    expect(page).toContain('role="status"');
  });
});
