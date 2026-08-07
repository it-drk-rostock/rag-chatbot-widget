# 28 — Admin Dashboard Manual Vector Reset

**What to build:**
Provide administrators with an on-demand button on the Admin Dashboard to clear and re-initialize the Qdrant vector database collection manually, guarded by authentication and an explicit UI confirmation modal to prevent accidental data loss.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Add `resetVectorCollectionAction()` Server Action in `app/admin/actions.ts` guarded by `isAdminAuthenticated()`.
- [ ] Add unit tests in `app/admin/actions.test.ts` asserting authentication enforcement and `resetCollection` invocation.
- [ ] Add a "Reset Vector DB" button to the Admin Dashboard UI in `app/admin/crawl-progress.tsx`.
- [ ] Implement a Mantine confirmation modal prompting the admin before dispatching `resetVectorCollectionAction()`.
- [ ] Add UI component tests in `app/admin/crawl-progress.test.tsx` for modal opening and server action dispatch.
- [ ] All Vitest tests pass cleanly.
