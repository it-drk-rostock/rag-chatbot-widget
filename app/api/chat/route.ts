import { openai } from "@ai-sdk/openai";
import { Ratelimit } from "@upstash/ratelimit";
import { streamText } from "ai";

import { botConfig } from "../../../src/config/botConfig";
import { redisClient } from "../../../src/services/redisClient";

export const runtime = "edge";

const rateLimiter = new Ratelimit({
  redis: redisClient,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
});
const encoder = new TextEncoder();

function corsHeaders(request: Request) {
  const headers = new Headers({
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  });
  const origin = request.headers.get("origin");

  if (
    origin &&
    (origin === new URL(request.url).origin ||
      botConfig.allowedOrigins.includes(origin))
  ) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

function sseStream(textStream: AsyncIterable<string>) {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const text of textStream) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
        controller.enqueue(encoder.encode("event: done\ndata: [DONE]\n\n"));
      } catch (error) {
        console.error("Chat completion failed", error);
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ error: "Unable to generate a response" })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  const clientIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const headers = corsHeaders(request);

  try {
    const { success } = await rateLimiter.limit(clientIp);

    if (!success) {
      return Response.json(
        { error: "Too many requests" },
        { status: 429, headers },
      );
    }
  } catch (error) {
    console.error("Rate limit check failed", error);
  }

  let prompt: unknown;

  try {
    ({ prompt } = await request.json());
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers });
  }

  if (typeof prompt !== "string" || !prompt.trim()) {
    return Response.json({ error: "A prompt is required" }, { status: 400, headers });
  }

  try {
    const result = streamText({
      model: openai("gpt-5.4-mini-2026-03-17"),
      prompt,
    });

    headers.set("Content-Type", "text/event-stream");
    return new Response(sseStream(result.textStream), { headers });
  } catch (error) {
    console.error("Chat completion failed", error);
    return Response.json({ error: "Unable to generate a response" }, { status: 502, headers });
  }
}
