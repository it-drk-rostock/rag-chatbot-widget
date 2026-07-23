# 17 — Boundary-Aware Markdown Paragraph Chunker

**What to build:**
Refactor `src/services/markdownChunker.ts` to use a linear, single-pass paragraph accumulator ($O(N)$) that flushes text buffers on Markdown headings (`#`, `##`, `###`) or paragraph breaks (`\n\n`), preventing character-slicing word breakage and regex lookahead overhead.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Refactor `chunkMarkdown` in `src/services/markdownChunker.ts` to single-pass line/paragraph buffering ($O(N)$).
- [x] Flush chunks on heading lines (`#`, `##`, `###`) or paragraph breaks up to target size ~1,000 characters.
- [x] Ensure no words, sentences, or syntax tokens are split mid-character across chunk boundaries.
- [x] Update unit tests in `src/services/markdownChunker.test.ts` to verify heading boundaries, paragraph breaks, and chunk metadata.
