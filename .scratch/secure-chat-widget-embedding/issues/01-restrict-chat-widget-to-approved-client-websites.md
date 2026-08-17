# 01 — Restrict the Chat Widget to approved client websites

**What to build:** Approved client websites can continue embedding and using the Chat Widget anonymously, while unapproved websites and invalid direct widget navigations are blocked by an origin policy enforced at the browser framing boundary. The delivered embed retains its current interaction and style isolation, sends baseline security headers, and has accurate integration and architecture documentation.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Bot Configuration treats `ALLOWED_ORIGINS` as the single source of truth and accepts only exact origins containing a scheme, host, and optional port.
- [ ] Malformed origins, origins containing paths or wildcards, and empty production configuration fail safely instead of broadening access.
- [ ] An approved client website can load, open, close, and use the existing iframe-based Chat Widget without authenticating its visitors.
- [ ] Chat Widget navigation identifies its parent origin and rejects a missing or unapproved value without rendering the interactive chat experience.
- [ ] Chat Widget responses include a Content Security Policy whose `frame-ancestors` directive contains only the configured approved origins.
- [ ] Chat Widget responses include `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a Permissions Policy disabling camera, microphone, and geolocation.
- [ ] Existing message-origin and iframe-window validation remains effective, and messages from any other origin or window remain ignored.
- [ ] Tests verify approved embedding, rejected parent origins, exact iframe message validation, and the emitted browser-security header contract through externally visible behavior.
- [ ] Production integration guidance uses HTTPS and loads the embed script with deferred execution or at the end of the host page body.
- [ ] The iframe embedding decision record describes approved client websites rather than unrestricted embedding while retaining the iframe isolation decision.
- [ ] The focused tests and production build pass.
