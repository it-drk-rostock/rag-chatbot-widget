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

  it("uses overlapping windows for heading sections over 1200 characters", () => {
    const markdown = `# Long section\n${"x".repeat(1_250)}`;
    const chunks = chunkMarkdown(markdown, {
      url: "https://example.com/long",
      title: "Long page",
    });

    expect(chunks).toHaveLength(2);
    expect(chunks[0].content).toHaveLength(1_000);
    expect(chunks[1].content).toBe(markdown.slice(850));
    expect(chunks.map(({ index }) => index)).toEqual([0, 1]);
  });
});
