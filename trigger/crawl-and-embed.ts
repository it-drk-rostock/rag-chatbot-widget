import "dotenv/config";
import { createHash } from "node:crypto";

import { createOpenAI } from "@ai-sdk/openai";
import { AbortTaskRunError, metadata, task } from "@trigger.dev/sdk";
import { embedMany } from "ai";

import { botConfig } from "../src/config/botConfig";
import { firecrawlService } from "../src/services/firecrawlService";
import {
  chunkMarkdown,
  type MarkdownChunk,
} from "../src/services/markdownChunker";
import { qdrantClient, resetCollection } from "../src/services/qdrantClient";

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
  await resetCollection(botConfig.vectorCollection);

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const chunks = pages.flatMap((page) => chunkMarkdown(page.markdown, page));
  let chunksProcessed = 0;

  for (let start = 0; start < chunks.length; start += 100) {
    const batch = chunks.slice(start, start + 100);

    metadata.set("status", "embedding");
    const { embeddings } = await embedMany({
      model: openai.embedding(botConfig.embeddingModel),
      values: batch.map((chunk) => chunk.content),
    });

    if (embeddings.length !== batch.length) {
      throw new AbortTaskRunError("OpenAI returned an incomplete embedding batch");
    }

    metadata.set("status", "upserting");
    await qdrantClient.upsert(botConfig.vectorCollection, {
      wait: true,
      points: batch.map((chunk, index) => ({
        id: pointId(chunk),
        vector: embeddings[index],
        payload: {
          url: chunk.url,
          title: chunk.title,
          index: chunk.index,
          content: chunk.content,
        },
      })),
    });
    chunksProcessed += batch.length;
    metadata.set("chunksProcessed", chunksProcessed);
  }

  metadata.set("status", "completed");
  return { pages: pages.length, chunks: chunksProcessed };
}

export const crawlAndEmbedTask = task({
  id: "crawl-and-embed",
  maxDuration: 900,
  run: crawlAndEmbed,
});
