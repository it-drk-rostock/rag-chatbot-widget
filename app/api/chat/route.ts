import { Ratelimit } from "@upstash/ratelimit";

import { botConfig } from "../../../src/config/botConfig";
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

  return new Response(null, { status: 204, headers });
}
