# 3. Trigger.dev Realtime Task Tracking

## Context
The long-running indexing job (`crawl-and-embed`) is handled asynchronously by Trigger.dev to prevent serverless execution timeouts. The Admin Dashboard needs to show live progress of active runs (such as current steps, status, errors) to the logged-in administrator.

## Decision
We decided to use `@trigger.dev/react-hooks` (`useRealtimeRun`) directly in the frontend Admin Dashboard. The backend Next.js server will generate scoped, temporary public tokens using Trigger.dev's `auth.createPublicToken` and return them to the client upon request, enabling secure WebSockets-based status updates directly from Trigger.dev to the browser.

## Consequences
- **Pros**: Completely stateless Next.js server design, zero database overhead for run states, and low-latency real-time updates without polling.
- **Cons**: Requires generating and managing scoped temporary access tokens securely in Server Actions, and requires client-side dependency on `@trigger.dev/react-hooks`.
