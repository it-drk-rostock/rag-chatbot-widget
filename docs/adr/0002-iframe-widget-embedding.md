# 2. Iframe-based Chat Widget Embedding

## Context
The chatbot widget needs to be embedded on host sites (such as a TYPO3 backend/frontend) via simple HTML inputs. We must guarantee that styles from the host page do not bleed into the chatbot widget, and that the chatbot widget's CSS does not alter the host page's formatting.

## Decision
We decided to serve the Chat Widget UI inside a dedicated Next.js path (`/widget`) loaded in an `iframe` element. To handle resizing and toggle interactions for a floating bubble, we will serve a lightweight `<script>` wrapper (`embed.js`) that dynamically instantiates and controls the dimensions of the iframe.

## Consequences
- **Pros**: CSS styling is fully isolated (no bleed in either direction). The widget can easily be embedded on any site (including CMSs like TYPO3) by pasting a single script tag.
- **Cons**: We must implement message passing (`window.postMessage`) between the helper script in the parent page and the iframe if we want to synchronize layout transitions or bubble state changes.
