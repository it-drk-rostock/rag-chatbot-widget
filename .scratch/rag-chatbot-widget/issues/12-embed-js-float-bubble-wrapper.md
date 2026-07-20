# 12 — Embed.js Float Bubble Wrapper

**What to build:** A static, lightweight `embed.js` script served from `/public`. When pasted on external sites (like TYPO3), it renders a floating bubble. Clicking the bubble toggles the visibility and dimensions of the `/widget` iframe.

**Blocked by:** 11 — Mantine Widget UI Page

**Status:** ready-for-agent

- [ ] A lightweight script file `embed.js` (written in vanilla ES5/ES6 Javascript with no frameworks) is placed in `public/embed.js`.
- [ ] When loaded on a page, the script dynamically injects a floating button (chat bubble) and an `iframe` pointing to the chatbot's `/widget` URL.
- [ ] Click event listeners on the bubble toggle the iframe's styling (e.g. switching between hidden or minimized `width: 60px; height: 60px` and open `width: 380px; height: 600px`).
- [ ] Safe `window.postMessage` communication is set up between the iframe and the host page script to synchronize layout changes.
- [ ] Verification tests on a local static HTML page confirm that the bubble renders, clicking it loads the iframe, and the widget dimensions toggle correctly.
