import { openai } from "@ai-sdk/openai";
import { Ratelimit } from "@upstash/ratelimit";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  embed,
  streamText,
  toUIMessageStream,
} from "ai";

import { botConfig } from "../../../src/config/botConfig";
import { qdrantClient } from "../../../src/services/qdrantClient";
import { redisClient } from "../../../src/services/redisClient";

export const runtime = "edge";

const MAX_BODY_BYTES = 32 * 1024;
const MAX_MESSAGES = 20;
const MAX_PROMPT_CHARACTERS = 2_000;
const MAX_CONVERSATION_CHARACTERS = 12_000;

const rateLimiter = new Ratelimit({
  redis: redisClient,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
});

function acceptedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    origin &&
    (origin === new URL(request.url).origin ||
      botConfig.allowedOrigins.includes(origin))
  ) {
    return origin;
  }
  return null;
}

function corsHeaders(origin: string | null) {
  const headers = new Headers({
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

type TextMessage = {
  id: string;
  role: "user" | "assistant";
  parts: Array<{ type: "text"; text: string }>;
};

type ChatBody =
  | { messages: TextMessage[]; prompt?: never }
  | { messages?: never; prompt: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateBody(value: unknown):
  | { body: ChatBody; query: string }
  | { error: string; status: 400 | 413; reason: string } {
  if (!isRecord(value)) {
    return { error: "Invalid chat body", status: 400, reason: "invalid body shape" };
  }

  if ("prompt" in value) {
    if (
      typeof value.prompt !== "string" ||
      !value.prompt.trim() ||
      "messages" in value
    ) {
      return { error: "Invalid chat body", status: 400, reason: "invalid prompt" };
    }
    if (value.prompt.length > MAX_PROMPT_CHARACTERS) {
      return { error: "Prompt is too large", status: 413, reason: "prompt limit exceeded" };
    }
    return { body: { prompt: value.prompt }, query: value.prompt.trim() };
  }

  if (!Array.isArray(value.messages)) {
    return { error: "Invalid chat body", status: 400, reason: "invalid messages" };
  }
  if (value.messages.length > MAX_MESSAGES) {
    return { error: "Conversation is too large", status: 413, reason: "message limit exceeded" };
  }
  if (
    value.messages.length === 0 ||
    !value.messages.every((message): message is TextMessage =>
      isRecord(message) &&
      typeof message.id === "string" &&
      (message.role === "user" || message.role === "assistant") &&
      Array.isArray(message.parts) &&
      message.parts.length > 0 &&
      message.parts.every((part) =>
        isRecord(part) && part.type === "text" && typeof part.text === "string"),
    )
  ) {
    return { error: "Invalid messages", status: 400, reason: "invalid message shape" };
  }

  const totalCharacters = value.messages.reduce(
    (total, message) => total + message.parts.reduce((sum, part) => sum + part.text.length, 0),
    0,
  );
  if (totalCharacters > MAX_CONVERSATION_CHARACTERS) {
    return { error: "Conversation is too large", status: 413, reason: "conversation limit exceeded" };
  }

  const lastUserMessage = value.messages.findLast((message) => message.role === "user");
  const prompt = lastUserMessage?.parts.map((part) => part.text).join("");
  if (!prompt?.trim()) {
    return { error: "A prompt is required", status: 400, reason: "missing user prompt" };
  }
  if (prompt.length > MAX_PROMPT_CHARACTERS) {
    return { error: "Prompt is too large", status: 413, reason: "prompt limit exceeded" };
  }

  return { body: { messages: value.messages }, query: prompt.trim() };
}

async function readBoundedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    bytes += value.byteLength;
    if (bytes > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}

function hasProductionRateLimitConfig() {
  if (process.env.NODE_ENV !== "production") return true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token?.trim()) return false;
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

function rejection(
  status: 400 | 403 | 413 | 429 | 503,
  error: string,
  reason: string,
  headers: Headers,
) {
  console.warn("Chat request rejected", { status, reason });
  return Response.json({ error }, { status, headers });
}

export function OPTIONS(request: Request) {
  const origin = acceptedOrigin(request);
  const headers = corsHeaders(origin);
  if (!origin) {
    return rejection(403, "Origin not allowed", "invalid or missing origin", headers);
  }
  return new Response(null, { status: 204, headers });
}

export async function POST(request: Request) {
  const origin = acceptedOrigin(request);
  const headers = corsHeaders(origin);
  if (!origin) {
    return rejection(403, "Origin not allowed", "invalid or missing origin", headers);
  }

  const clientIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!hasProductionRateLimitConfig()) {
    console.error("Chat rate limiting unavailable: invalid production configuration");
    return Response.json({ error: "Rate limiting unavailable" }, { status: 503, headers });
  }

  try {
    const { success } = await rateLimiter.limit(clientIp);

    if (!success) {
      return rejection(429, "Too many requests", "rate limit exceeded", headers);
    }
  } catch (error) {
    console.error("Chat rate limiting unavailable: Redis check failed", error);
    return Response.json({ error: "Rate limiting unavailable" }, { status: 503, headers });
  }

  const serializedBody = await readBoundedBody(request);
  if (serializedBody === null) {
    return rejection(413, "Request body is too large", "body limit exceeded", headers);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(serializedBody);
  } catch {
    return rejection(400, "Invalid JSON body", "invalid JSON", headers);
  }

  const validated = validateBody(parsedBody);
  if ("error" in validated) {
    return rejection(validated.status, validated.error, validated.reason, headers);
  }
  const { body, query } = validated;

  try {
    let context = "";
    try {
      const { embedding } = await embed({
        model: openai.embedding(botConfig.embeddingModel),
        value: query,
      });

      const searchResults = await qdrantClient.search(
        botConfig.vectorCollection,
        {
          vector: embedding,
          limit: 5,
        },
      );

      context = searchResults
        .map((res) =>
          typeof res.payload?.content === "string"
            ? `Title: ${res.payload.title}\nURL: ${res.payload.url}\nContent:\n${res.payload.content}`
            : "",
        )
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
    return Response.json(
      { error: "Unable to generate a response" },
      { status: 502, headers },
    );
  }
}
