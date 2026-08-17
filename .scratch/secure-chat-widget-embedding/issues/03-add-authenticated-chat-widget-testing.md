# 03 — Add authenticated Chat Widget testing to the Admin Dashboard

**What to build:** Administrators have a standalone place to exercise the real Chat Widget after signing in to the Admin Dashboard, while unauthenticated users cannot access that testing experience. Public website visitors continue using the anonymous approved-origin embed and are not given administrator credentials.

**Blocked by:** 01 — Restrict the Chat Widget to approved client websites.

**Status:** ready-for-agent

- [ ] The standalone Chat Widget testing experience is reachable through the Admin Dashboard's existing secret route and encrypted session authentication.
- [ ] An unauthenticated request receives the existing Admin Dashboard login behavior and cannot render or use the standalone testing experience.
- [ ] An authenticated administrator can open the testing experience and send and receive streamed chat messages.
- [ ] The testing experience reuses the production Chat Widget behavior and chat API contract rather than maintaining a second chat implementation.
- [ ] No separate testing password, visitor account, authentication provider, session cookie, or database is introduced.
- [ ] The existing public Chat Widget remains anonymous for visitors when framed by an approved client website.
- [ ] Tests verify authenticated and unauthenticated access at the rendered Admin Dashboard boundary without duplicating the existing Chat Widget component assertions.
- [ ] Existing Admin Dashboard crawling, progress, reset, login, and logout behavior remains unchanged.
- [ ] The focused tests and production build pass.
