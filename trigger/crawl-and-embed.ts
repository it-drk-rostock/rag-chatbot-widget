import { createHash } from "node:crypto";

import { AbortTaskRunError, metadata, task } from "@trigger.dev/sdk";

import { botConfig } from "../src/config/botConfig";
import { firecrawlService } from "../src/services/firecrawlService";
import {
  chunkMarkdown,
  type MarkdownChunk,
} from "../src/services/markdownChunker";
import { openaiClient } from "../src/services/openaiClient";
import { qdrantClient } from "../src/services/qdrantClient";

function pointId(chunk: MarkdownChunk) {
  const hash = createHash("sha256")
    .update(`${chunk.url}:${chunk.index}`)
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

export async function crawlAndEmbed() {
    metadata.set("status", "queued");
    metadata.set("status", "crawling");
    const pages = await firecrawlService.crawl();
    let chunksProcessed = 0;

    for (const page of pages) {
      const chunks = chunkMarkdown(page.markdown, page);
      if (!chunks.length) continue;

      metadata.set("status", "embedding");
      const embeddings = await openaiClient.embeddings.create({
        model: botConfig.embeddingModel,
        input: chunks.map((chunk) => chunk.content),
      });

      if (embeddings.data.length !== chunks.length) {
        throw new AbortTaskRunError("OpenAI returned an incomplete embedding batch");
      }

      await qdrantClient.upsert(botConfig.vectorCollection, {
        wait: true,
        points: chunks.map((chunk, index) => ({
          id: pointId(chunk),
          vector: embeddings.data[index].embedding,
          payload: chunk,
        })),
      });
      chunksProcessed += chunks.length;
    }

    metadata.set("status", "completed");
    return { pages: pages.length, chunks: chunksProcessed };
}

export const crawlAndEmbedTask = task({
  id: "crawl-and-embed",
  maxDuration: 900,
  run: crawlAndEmbed,
});
