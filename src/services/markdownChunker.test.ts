import { describe, expect, it } from "vitest";

import { chunkMarkdown } from "./markdownChunker";

describe("chunkMarkdown", () => {
  it("keeps each heading with its following text and metadata", () => {
    expect(
      chunkMarkdown("# Intro\nWelcome.\n\n## Details\nUseful facts.", {
        url: "https://example.com/page",
        title: "Example page",
      }),
    ).toEqual([
      {
        content: "# Intro\nWelcome.",
        url: "https://example.com/page",
        title: "Example page",
        index: 0,
      },
      {
        content: "## Details\nUseful facts.",
        url: "https://example.com/page",
        title: "Example page",
        index: 1,
      },
    ]);
  });

  it("splits content at boundary line without cutting words mid-character when size target is reached", () => {
    const line = "Word ".repeat(40); // 200 chars per line
    const markdown = `# Section\n${line}\n${line}\n${line}\n${line}\n${line}\n${line}`;
    const chunks = chunkMarkdown(markdown, {
      url: "https://example.com/long",
      title: "Long page",
    });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.content).not.toMatch(/Wor$/); // Does not slice words mid-character
    }
    expect(chunks.map(({ index }) => index)).toEqual(chunks.map((_, i) => i));
  });
});
