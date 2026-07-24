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

  it("flushes chunks on paragraph breaks when size target is reached", () => {
    const para1 = "Paragraph 1: " + "a".repeat(600);
    const para2 = "Paragraph 2: " + "b".repeat(500);
    const markdown = `${para1}\n\n${para2}`;

    const chunks = chunkMarkdown(markdown, {
      url: "https://example.com/paras",
      title: "Paragraph test",
    });

    expect(chunks).toHaveLength(2);
    expect(chunks[0].content).toBe(para1);
    expect(chunks[1].content).toBe(para2);
    expect(chunks[0].index).toBe(0);
    expect(chunks[1].index).toBe(1);
  });

  it("strips raw markdown and extra metadata properties from generated chunks", () => {
    const rawPage = {
      markdown: "# Header\nSome raw page content",
      url: "https://example.com/page",
      title: "Example Page",
      extraField: "should be omitted",
    };

    const chunks = chunkMarkdown(rawPage.markdown, rawPage as any);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual({
      url: "https://example.com/page",
      title: "Example Page",
      content: "# Header\nSome raw page content",
      index: 0,
    });
    expect(chunks[0]).not.toHaveProperty("markdown");
    expect(chunks[0]).not.toHaveProperty("extraField");
  });
});

