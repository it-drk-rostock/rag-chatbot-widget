# 04 — Chat API CORS & Rate Limiter

**What to build:** The structure of the `/api/chat` Edge route, enforcing origin-based CORS headers against `allowedOrigins` from the static configuration and checking Upstash Redis rate-limiting (failing open if Upstash fails).

**Blocked by:** 01 — Bot Configuration & Service Clients

**Status:** complete

- [x] A POST API route is created at `/api/chat` using the Edge runtime.
- [x] CORS validation logic verifies that the incoming request's origin matches one of the domains in `allowedOrigins` in `botConfig.ts`. (Same-origin requests are also allowed).
- [x] Rate-limiting logic using `@upstash/ratelimit` verifies client IP and caps requests at 10 per minute per IP.
- [x] If the rate limit is exceeded, the API returns a `429 Too Many Requests` status code.
- [x] If the connection to Upstash Redis fails, the error is logged, but the request fails open (continues execution instead of throwing a 500 error).
- [x] Integration tests verify CORS header presence for valid/invalid origins and 429 response structures using mocked Redis behavior.
