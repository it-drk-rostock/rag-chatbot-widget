export type PageMetadata = {
  url: string;
  title: string;
};

export type MarkdownChunk = PageMetadata & {
  content: string;
  index: number;
};

const MAX_SECTION_LENGTH = 1_200;
const WINDOW_LENGTH = 1_000;
const WINDOW_OVERLAP = 150;

export function chunkMarkdown(
  markdown: string,
  metadata: PageMetadata,
): MarkdownChunk[] {
  const sections = markdown
    .split(/(?=^#{1,3}\s+)/m)
    .map((section) => section.trim())
    .filter(Boolean);

  return sections.flatMap((section) =>
    section.length > MAX_SECTION_LENGTH
      ? windows(section)
      : [section],
  ).map((content, index) => ({ ...metadata, content, index }));
}

function windows(section: string) {
  const chunks: string[] = [];
  const step = WINDOW_LENGTH - WINDOW_OVERLAP;

  for (let start = 0; start < section.length; start += step) {
    chunks.push(section.slice(start, start + WINDOW_LENGTH));
  }

  return chunks;
}
