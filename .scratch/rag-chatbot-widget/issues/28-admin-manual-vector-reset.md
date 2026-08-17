# 28 — Admin Dashboard Manual Vector Reset

**What to build:**
Provide administrators with an on-demand button on the Admin Dashboard to clear and re-initialize the Qdrant vector database collection manually, guarded by authentication and an explicit UI confirmation modal to prevent accidental data loss.

**Blocked by:** None — can start immediately.

**Status:** complete

- [x] Add `resetVectorCollectionAction()` Server Action in `app/admin/actions.ts` guarded by `isAdminAuthenticated()`.
- [x] Add unit tests in `app/admin/actions.test.ts` asserting authentication enforcement and `resetCollection` invocation.
- [x] Add a "Reset Vector DB" button to the Admin Dashboard UI in `app/admin/crawl-progress.tsx`.
- [x] Implement a Mantine confirmation modal prompting the admin before dispatching `resetVectorCollectionAction()`.
- [x] Add UI component tests in `app/admin/crawl-progress.test.tsx` for modal opening and server action dispatch.
- [x] All Vitest tests pass cleanly.
