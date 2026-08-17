# Secure Approved-Origin Chat Widget Embedding

## Problem Statement

The Chat Widget can already be embedded on an external website, but its current browser and API boundaries do not enforce the intended deployment policy. `ALLOWED_ORIGINS` affects which callers receive CORS response headers, yet it does not stop an unapproved website from framing the Chat Widget. Because requests made by the framed Chat Widget are same-origin with the chatbot server, an unapproved embed can consume OpenAI and retrieval capacity.

The public chat API also continues when rate limiting is unavailable, accepts unbounded request bodies and conversation histories, and processes requests from invalid or missing origins instead of rejecting them. The Chat Widget response lacks framing and baseline browser-security headers. These gaps create avoidable cost-abuse and browser-embedding risks.

Website visitors must still be able to use the Chat Widget anonymously when it is embedded by an approved client website. Developers and administrators also need a standalone way to test the Chat Widget, but that testing view must require the existing Admin Dashboard authentication rather than making the public Chat Widget route the testing entry point.

## Solution

Make `ALLOWED_ORIGINS` the browser-facing allowlist for approved Chat Widget hosts. Restrict framing with a route-specific Content Security Policy, reject invalid API origins before expensive work, fail closed when rate limiting is unavailable, and bound chat request size and history. Add the remaining baseline response headers to the Chat Widget.

Keep anonymous access for visitors using an approved embed. Provide the standalone testing experience inside the authenticated Admin Dashboard and reuse its existing session rather than introducing another login system. Document an HTTPS-only embed snippet that loads after the host document body is available.

## User Stories

1. As a website visitor, I want to open the Chat Widget on an approved client website, so that I can ask questions without creating an account.
2. As a website visitor, I want the Chat Widget to continue streaming answers inside its iframe, so that security hardening does not degrade the existing experience.
3. As a client website owner, I want to embed the Chat Widget with one script tag, so that integration remains simple.
4. As a client website owner, I want my website origin to be explicitly approved, so that another website cannot copy the embed and consume the chatbot service under my deployment.
5. As a client website owner, I want host-page and Chat Widget styles to remain isolated, so that the security changes preserve the iframe architecture.
6. As an administrator, I want unapproved websites to be prevented from framing the Chat Widget, so that normal browser users cannot access it through unauthorized hosts.
7. As an administrator, I want invalid cross-origin chat requests rejected before retrieval or model generation, so that they cannot incur avoidable cost.
8. As an administrator, I want requests with no acceptable browser origin rejected, so that the chat API is not accidentally treated as an unrestricted general-purpose endpoint.
9. As an administrator, I want chat requests to stop safely when Redis rate limiting is unavailable, so that an infrastructure failure cannot silently remove cost protection.
10. As an administrator, I want a clear service-unavailable response when rate limiting cannot be checked, so that the failure is observable and clients can retry later.
11. As an administrator, I want oversized request bodies rejected, so that a caller cannot force excessive parsing or model input.
12. As an administrator, I want conversation length and total text bounded, so that a caller cannot submit an arbitrarily expensive history.
13. As an administrator, I want individual user prompts bounded, so that one message cannot consume disproportionate embedding or model resources.
14. As an administrator, I want the Chat Widget to send baseline browser-security headers, so that unnecessary browser capabilities and content-type guessing are disabled.
15. As an administrator, I want framing policy to come from Bot Configuration, so that approved origins are not duplicated across unrelated modules.
16. As an administrator, I want malformed or empty production origin configuration to fail safely, so that a deployment cannot unintentionally allow broad embedding.
17. As an administrator, I want to test the Chat Widget from the Admin Dashboard, so that testing remains available without exposing a standalone public testing page.
18. As an unauthenticated visitor, I want the standalone testing view to remain inaccessible, so that administrative testing is not confused with the public embed.
19. As an authenticated administrator, I want the testing view to use the same Chat Widget behavior as the public embed, so that tests exercise the real user experience.
20. As a developer, I want origin, framing, request-limit, and rate-limit behavior covered at existing public seams, so that future changes cannot silently reopen the vulnerabilities.
21. As a developer, I want an HTTPS embed example using deferred loading, so that the integration works on secure host pages and does not run before the document body exists.
22. As an operator, I want configuration errors and rejected traffic to be distinguishable in logs without recording chat content, so that failures can be diagnosed without leaking user questions.
23. As an operator, I want the existing ten-requests-per-IP-per-minute policy retained when Redis is healthy, so that this hardening does not unexpectedly change normal throughput.
24. As a maintainer, I want the iframe decision record to say “approved client websites” instead of “any website,” so that architecture documentation matches the enforced policy.

## Implementation Decisions

- Retain the existing iframe-based Chat Widget and lightweight embed script. This work hardens the existing architecture rather than replacing it.
- Treat `ALLOWED_ORIGINS` in Bot Configuration as the single source of truth for approved external website origins. Entries are exact origins containing scheme, host, and optional port; paths, wildcards, malformed values, and empty production configuration are rejected.
- Send a route-specific `Content-Security-Policy` response header for the Chat Widget whose `frame-ancestors` directive contains only the configured approved origins. Do not use `X-Frame-Options` for this allowlist because it cannot express multiple external origins and has been superseded for this purpose by CSP.
- Require the Chat Widget navigation to identify its parent origin and reject missing or unapproved values. The parent-origin value is a routing and consistency check, not a standalone security credential; CSP `frame-ancestors` remains the browser enforcement boundary because query parameters can be copied or forged.
- Reject chat API requests with HTTP 403 when their `Origin` header is neither the chatbot server's own origin nor an entry in `ALLOWED_ORIGINS`. Reject missing `Origin` headers because the supported client is browser-based. Perform this check before rate limiting, retrieval, embedding, or model generation.
- Preserve the same-origin API flow from the framed Chat Widget. Browser calls from the iframe legitimately carry the chatbot server origin; the approved parent website is enforced at the iframe boundary by `frame-ancestors`.
- Keep the existing IP rate and window when Redis is healthy. If the rate-limit check throws, is unavailable, or lacks required production configuration, return HTTP 503 and do not perform retrieval, embedding, or model generation.
- Limit the serialized chat request body to 32 KiB, including requests without a trustworthy `Content-Length`. Return HTTP 413 when the limit is exceeded.
- Accept at most 20 chat messages, at most 2,000 characters in the latest user prompt, and at most 12,000 text characters across the submitted conversation. Return HTTP 400 for structurally invalid input and HTTP 413 for valid but oversized input.
- Validate message shape before converting it to model messages. Only the message roles and text parts supported by the Chat Widget are accepted; unsupported or malformed parts do not reach model conversion.
- Add `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a `Permissions-Policy` disabling camera, microphone, and geolocation to Chat Widget responses. Keep the CSP scoped narrowly enough that existing Next.js and Mantine rendering continues to work.
- Keep safe message rendering unchanged: React renders text, generated links remain limited to HTTP or HTTPS, and new-tab links retain a non-opener referrer policy.
- Put the standalone Chat Widget testing experience under the Admin Dashboard's secret route and existing encrypted session cookie. Unauthenticated requests use the Admin Dashboard's existing login behavior. Do not create separate test credentials, visitor accounts, or another session mechanism.
- Reuse the same Chat Widget component and chat API contract in the authenticated testing view. Do not fork a second testing-only chat implementation.
- Document only HTTPS production embeds. The script tag uses deferred loading or is placed at the end of the host page body so the embed script can safely append its elements.
- Update the iframe embedding decision record to describe approved client websites rather than unrestricted embedding. This refines the consequence of the existing decision without changing the iframe decision itself.
- Do not treat CORS as authentication. Origin and CSP checks enforce normal browser behavior; rate limiting and bounded input remain necessary for direct or non-browser abuse where request headers can be forged.

## Testing Decisions

- Tests assert externally visible behavior at the highest existing seams: HTTP responses for the chat API and Chat Widget headers, rendered access behavior for the Admin Dashboard, and observable DOM behavior for the embed script.
- Extend the existing embed-script test to prove that the configured parent origin is passed to the Chat Widget and that messages are still accepted only from the exact iframe window and chatbot origin.
- Test the Chat Widget response-header contract through Next.js configuration behavior: approved origins appear in `frame-ancestors`, unapproved origins do not, and the content-type, referrer, and permissions headers are present.
- Extend the existing chat route tests to prove that approved external origins and the chatbot server origin are accepted, while invalid and missing origins return 403 before the rate limiter and AI dependencies are called.
- Test that a healthy rate limiter retains the existing ten-per-minute behavior and that an exceeded limit returns 429 without calling retrieval or AI dependencies.
- Test that a rate-limiter exception returns 503 and does not call retrieval, embedding, or model generation. The previous fail-open expectation is replaced rather than supplemented.
- Test request limits at their boundaries: a request at each limit is accepted, while a body over 32 KiB, more than 20 messages, a prompt over 2,000 characters, or total text over 12,000 characters is rejected without expensive downstream calls.
- Extend the existing Admin Dashboard page tests to prove that an unauthenticated user cannot access the standalone testing experience and that an authenticated administrator can render it.
- Retain the existing Chat Widget component tests for the welcome message, message rendering, submission, and loading state. Do not duplicate those assertions in the Admin Dashboard tests.
- Retain a focused production build check because framing and security headers are deployment behavior. Avoid adding a browser-test framework solely for CSP; asserting the emitted response policy plus the existing embed behavior is the smallest stable seam.
- Tests must not assert private helper structure, exact log formatting, cryptographic internals, or third-party implementation details. They assert status codes, headers, absence of expensive calls, rendered access, and user-observable embed behavior.

## Out of Scope

- Replacing the iframe architecture with a web component, framework bundle, or host-page React integration.
- Adding visitor accounts, visitor login, or requiring website visitors to use Admin Dashboard authentication.
- Creating per-customer billing, API keys, signed embed subscriptions, CAPTCHA, bot scoring, or a web application firewall.
- Claiming that `Origin`, `Referer`, CORS, or CSP authenticates arbitrary non-browser clients. A direct client can forge request headers; this spec limits normal browser embedding and bounds anonymous abuse.
- Redesigning the Chat Widget interface, changing assistant behavior, or changing the retrieval and indexing model.
- Replacing the existing Admin Dashboard authentication system.
- Introducing a database or dynamic configuration service for allowed origins or request limits.
- Building a full application-wide CSP. This spec adds the framing directive and baseline headers required for the Chat Widget boundary.
- Changing the Background Pipeline, Full Re-index, Manual Vector Reset, or Vector Payload schema.

## Further Notes

- The current production build succeeds and the focused embed, Chat Widget, and chat API suite passes, but the current runtime warns when Upstash Redis URL and token configuration is missing. Under this spec that condition becomes a safe 503 response rather than an unbounded fallback.
- CSP `frame-ancestors` is the primary browser control for which websites may embed the Chat Widget. CORS controls whether browser JavaScript may read a cross-origin response; it is not API authentication.
- The approved-origin requirement refines ADR-0002. Its iframe isolation decision remains valid, while its statement that the Chat Widget can be embedded on “any site” changes to “any approved client website.”
- Next.js supports route-specific response headers through its `headers` configuration: https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
- CORS behavior and its browser enforcement model are documented by MDN: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- Publish this spec to the GitHub issue tracker with the `ready-for-agent` label before running the ticket-generation flow.
