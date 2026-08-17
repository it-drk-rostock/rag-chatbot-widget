# 02 — Make the chat API reject unsafe or unbounded requests

**What to build:** Only bounded browser chat requests from an accepted origin can reach retrieval and AI services. Invalid origins, unavailable production rate limiting, malformed input, and oversized bodies or histories receive explicit error responses before they can consume OpenAI or retrieval capacity.

**Blocked by:** 01 — Restrict the Chat Widget to approved client websites.

**Status:** complete

- [x] Requests from the chatbot server origin and configured approved origins retain the existing streaming chat behavior.
- [x] Requests with an invalid or missing `Origin` header return HTTP 403 before rate limiting, retrieval, embedding, model conversion, or model generation.
- [x] Healthy Redis rate limiting retains the existing ten-requests-per-IP-per-minute policy and returns HTTP 429 when the limit is exceeded.
- [x] In production, missing or invalid Redis rate-limit configuration returns HTTP 503 and never bypasses rate limiting.
- [x] A Redis rate-limit exception returns HTTP 503 before retrieval, embedding, model conversion, or model generation.
- [x] A serialized request body over 32 KiB returns HTTP 413, including when `Content-Length` is absent or cannot be trusted.
- [x] A request containing more than 20 messages returns HTTP 413 before expensive downstream work.
- [x] A latest user prompt over 2,000 characters or total conversation text over 12,000 characters returns HTTP 413 before expensive downstream work.
- [x] Structurally invalid messages, roles, or message parts return HTTP 400 and are never passed to model-message conversion.
- [x] Boundary tests prove inputs exactly at the documented limits remain accepted.
- [x] Tests prove every 403, 413, 429, and 503 path makes zero retrieval, embedding, model-conversion, or model-generation calls as applicable.
- [x] Rejection and configuration failures are distinguishable in operational logs without recording prompts or conversation content.
- [x] The focused tests and production build pass.
