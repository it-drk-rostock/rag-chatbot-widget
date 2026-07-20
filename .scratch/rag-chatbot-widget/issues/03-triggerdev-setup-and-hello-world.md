# 03 — Trigger.dev Setup & Hello World Task

**What to build:** Trigger.dev SDK v4 setup in the project, registering a test "hello-world" task that can be triggered from a Next.js Server Action and returns the run ID to the caller.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Trigger.dev SDK v4 packages (`@trigger.dev/sdk`, `@trigger.dev/react-hooks`) are installed and configured.
- [ ] A Trigger.dev project link is established, and a simple task named `hello-world` is defined.
- [ ] A Server Action (or API route) triggers this task using the Trigger.dev secret key, successfully returning the generated `runId` back to the frontend.
- [ ] The Trigger.dev development server runs and executes the task locally.
- [ ] Basic tests verify that the trigger endpoint correctly invokes the task and returns a valid run ID.
