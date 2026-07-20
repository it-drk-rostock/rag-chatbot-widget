# 11 — Mantine Widget UI Page

**What to build:** The dedicated `/widget` Next.js page featuring a Mantine-styled chatbot interface that posts queries to `/api/chat` and streams the results back dynamically.

**Blocked by:** 10 — RAG Integration on Chat API

**Status:** ready-for-agent

- [ ] A dedicated page `/widget/page.tsx` is implemented, utilizing Mantine UI components for the layout (message feed, chat input, send buttons, assistant typing states).
- [ ] The page calls `/api/chat` via standard HTTP POST and streams responses using Vercel AI SDK hooks or custom readable streams, rendering markdown content and source links as stylized clickable buttons.
- [ ] A clean scroll behavior is added to auto-scroll to the bottom of the feed when new tokens arrive.
- [ ] Responsive design principles ensure the widget looks premium on both mobile and desktop browser windows.
- [ ] Component tests verify rendering of message lists, user text entries, and assistant loading states.
