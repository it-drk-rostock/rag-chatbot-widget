# 21 — Chat Widget UI Migration to useChat

**What to build:**
Refactor `app/widget/page.tsx` to use the `@ai-sdk/react` `useChat` hook for managing chat history, input state, submit handlers, and stream decoding, eliminating custom SSE readers while preserving Mantine UI layout and source markdown link buttons.

**Blocked by:** 20 — Chat API Route Vercel AI SDK Migration.

**Status:** ready-for-agent

- [ ] Refactor `WidgetPage` component in `app/widget/page.tsx` to use `useChat` from `@ai-sdk/react`.
- [ ] Render source Markdown links as Mantine buttons inside assistant messages.
- [ ] Ensure automatic smooth scrolling on message changes.
- [ ] Update `app/widget/page.test.tsx` to test widget rendering and interaction with `useChat` mock.
