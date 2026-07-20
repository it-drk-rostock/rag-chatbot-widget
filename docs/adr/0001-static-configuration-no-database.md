# 1. Static Configuration (No Database)

## Context
We need to store configurations such as bot styling, name, welcome message, system prompt, allowed CORS origins, and the target crawler website URL. We want to keep latency, architectural complexity, and running costs at a minimum.

## Decision
We decided to store all configurations statically in a single typescript configuration file (`src/config/botConfig.ts`). We will not use a relational or document database for config storage.

## Consequences
- **Pros**: Zero-latency config reading, simplified local development, zero database hosting costs, and elimination of SQL/NoSQL injections.
- **Cons**: Changing any configuration (e.g. changing the bot's theme color or adding/removing target scrape subpages) requires a code change and redevelopment/re-deployment of the Next.js app.
