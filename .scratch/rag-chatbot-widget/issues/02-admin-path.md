# 02 — Admin Path & 404 Route

**What to build:** The restricted Admin Dashboard path structure. If the request URL does not match the configured `ADMIN_SECRET_PATH`, Next.js returns a 404 error page. If it matches, the user sees a login page prompting for a password.

**Blocked by:** None — can start immediately

**Status:** complete

- [x] A dynamic Next.js route `/admin/[secret]/page.tsx` is implemented.
- [x] Next.js server-side checks verify the dynamic segment against the environment variable `ADMIN_SECRET_PATH`.
- [x] If the path parameter does not match the secret key, the server invokes the Next.js `notFound()` utility to return a standard 404 page.
- [x] If the path parameter matches, the page renders a simple Mantine password input UI requesting the `ADMIN_PASSWORD`.
- [x] Automated tests verify that requests to incorrect secret paths receive a 404, while correct paths load the login UI successfully.
