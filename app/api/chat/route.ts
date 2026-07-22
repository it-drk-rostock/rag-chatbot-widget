import { openai } from "@ai-sdk/openai";
import { Ratelimit } from "@upstash/ratelimit";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  embed,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";

import { botConfig } from "../../../src/config/botConfig";
import { qdrantClient } from "../../../src/services/qdrantClient";
import { redisClient } from "../../../src/services/redisClient";

export const runtime = "edge";

const rateLimiter = new Ratelimit({
  redis: redisClient,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
});

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

function getQueryText(body: { messages?: UIMessage[]; prompt?: string }): string | null {
  if (typeof body.prompt === "string" && body.prompt.trim()) {
    return body.prompt.trim();
  }
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    const lastUserMessage = [...body.messages].reverse().find((m) => m.role === "user");
    if (lastUserMessage) {
      if (Array.isArray(lastUserMessage.parts)) {
        const textParts = lastUserMessage.parts
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("");
        if (textParts.trim()) return textParts.trim();
      }
      const raw = (lastUserMessage as unknown as Record<string, unknown>).content;
      if (typeof raw === "string" && raw.trim()) {
        return raw.trim();
      }
    }
  }
  return null;
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

  let body: { messages?: UIMessage[]; prompt?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers });
  }

  const query = getQueryText(body);
  if (!query) {
    return Response.json({ error: "A prompt is required" }, { status: 400, headers });
  }

  try {
    let context = "";
    try {
      const { embedding } = await embed({
        model: openai.embedding(botConfig.embeddingModel),
        value: query,
      });

      const searchResults = await qdrantClient.search(botConfig.vectorCollection, {
        vector: embedding,
        limit: 5,
      });

      context = searchResults
        .map((res) => (typeof res.payload?.content === "string" ? res.payload.content : ""))
        .filter(Boolean)
        .join("\n\n");
    } catch (error) {
      console.error("Vector context retrieval failed", error);
    }

    const system = context
      ? `${botConfig.systemPrompt}\n\nKontext:\n${context}`
      : botConfig.systemPrompt;

    const modelMessages = body.messages
      ? await convertToModelMessages(body.messages)
      : [{ role: "user" as const, content: query }];

    const result = streamText({
      model: openai("gpt-5.4-mini-2026-03-17"),
      system,
      messages: modelMessages,
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
      headers,
    });
  } catch (error) {
    console.error("Chat completion failed", error);
    return Response.json({ error: "Unable to generate a response" }, { status: 502, headers });
  }
}
