export type PageMetadata = {
  url: string;
  title: string;
};

export type MarkdownChunk = PageMetadata & {
  content: string;
  index: number;
};

const TARGET_CHUNK_SIZE = 1_000;

export function chunkMarkdown(
  markdown: string,
  metadata: PageMetadata,
): MarkdownChunk[] {
  const lines = markdown.split("\n");
  const chunks: string[] = [];
  let currentLines: string[] = [];
  let currentLength = 0;

  for (const line of lines) {
    const isHeading = /^#{1,6}\s+/.test(line.trim());
    const isParagraphBreak = line.trim() === "";

    if (currentLines.length > 0) {
      const wouldExceed = currentLength + line.length + 1 > TARGET_CHUNK_SIZE;
      const isParagraphAtTarget = isParagraphBreak && currentLength >= TARGET_CHUNK_SIZE;

      if (isHeading || isParagraphAtTarget || wouldExceed) {
        const text = currentLines.join("\n").trim();
        if (text) chunks.push(text);
        currentLines = [];
        currentLength = 0;
      }
    }

    currentLines.push(line);
    currentLength += line.length + 1;
  }

  if (currentLines.length > 0) {
    const text = currentLines.join("\n").trim();
    if (text) chunks.push(text);
  }

  return chunks.map((content, index) => ({
    url: metadata.url,
    title: metadata.title,
    content,
    index,
  }));

}
