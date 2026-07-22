# 13 — Live Progress UI on Admin Dashboard

**What to build:** Integrating `@trigger.dev/react-hooks` with the Admin Dashboard page. When the admin clicks the index button, it triggers the Trigger.dev task and streams the run progress live in the UI.

**Blocked by:**

- 05 — Password Auth Server Action
- 09 — Trigger.dev Crawl Task Integration

**Status:** complete

- [x] The Admin Dashboard page is updated to include the Trigger button and a progress section (loading spinner, task steps checklist).
- [x] Clicking the "Website jetzt neu indexieren" button calls a Server Action to trigger the Trigger.dev task and returns a public client-scoped read-only token.
- [x] The dashboard component uses Trigger.dev React hooks (e.g. `useRealtimeRun`) with the public token and run ID to subscribe to updates.
- [x] The UI dynamically displays run stages (Scraping, Generating Embeddings, Upserting to Vector Store, Completed).
- [x] Component tests verify that clicking the trigger button changes the UI status and displays the loading progress checklist based on mocked task status changes.
