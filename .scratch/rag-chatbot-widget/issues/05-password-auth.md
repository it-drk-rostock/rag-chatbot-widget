# 05 — Password Auth Server Action

**What to build:** The backend Server Action that validates the password submitted on the Admin login page against `ADMIN_PASSWORD` and stores a secure session cookie, enabling access to the index trigger button.

**Blocked by:** 02 — Admin Path & 404 Route

**Status:** complete

- [x] A Next.js Server Action is implemented to verify the user-entered password against `ADMIN_PASSWORD`.
- [x] If verified, it establishes a secure session (using stateless JWT or encrypted cookie session).
- [x] The Admin Dashboard page at `/admin/[secret]` reads this session cookie. If authenticated, it renders the admin panel dashboard with the Trigger button; if not, it continues to show the login form.
- [x] Log out functionality is added to clear the session cookie.
- [x] Automated tests verify that correct passwords yield session cookies and that requests without valid cookies are blocked from the admin panel layout.
