# Article reading and navigation

[Prose](../../src/components/editorial/prose/prose.css) owns the outer margins of its direct children. It separates paragraph groups, mixed blocks, and changes of subject using existing rhythm roles; a heading stays close to the content it introduces. Embedded Components own their internal spacing. Prose's unclassed native-list treatment stops at its direct list items, so a nested Key points, Footnotes, or consumer block does not acquire another list rhythm. Use List for structured nested lists. Stack can compose whole Prose blocks without acquiring Prose's internal rhythm.

Body copy keeps the strengthened muted ink role. Short secondary annotations use faint ink and the interface-text floor; Footnotes uses the smaller reading role for its owned Paragraph/List/Blockquote content. This local composition does not alter Appearance or the global text roles.

## Allocation and covering chrome

[Article layout](../../src/components/editorial/article-layout/article-layout.tsx) establishes a local container around `discern-article-layout__columns`. The reading column takes priority over side rails, which stack when the allocated width cannot support them. The surrounding viewport does not imply that an embedded article has room for three columns. Optional rails remain labelled complementary landmarks in source order.

The default assumes no covering header. The consumer knows the height of its actual fixed or sticky chrome, including any notice strip, and supplies two separate CSS facts:

- Set `scroll-padding-block-start` on the element that actually scrolls. Native section and note links use that clearance, plus a small target breathing space from the existing spacing scale.
- Set `--discern-article-sticky-offset` on Article layout when its sticky rails need the same clearance. Without an override the rails use ordinary page spacing.

For a nested scrolling article, apply scroll padding to that nested scroller. For document scrolling, apply it to `html`. Do not derive either value from a Catalogue toolbar or assume the library's Site header has a fixed height: its optional content and wrapping affect its occupied size. Header measurement belongs to the consumer's layout contract.

## Native destinations

[Anchor heading](../../src/components/docs/anchor-heading/anchor-heading.tsx) gives its heading `tabIndex={-1}`. Its self link and Table of contents links move focus to the heading through native fragment navigation without adding headings to the sequential Tab order. Authors supply document-unique IDs. Plain authored headings need the same `id` and `tabIndex` contract. Table of contents `current` remains caller-supplied state; no scrollspy or click interception is installed.

[Footnotes](../../src/components/editorial/footnotes/footnotes.tsx) makes each definition a fragment-focus destination. Put each return ID on the actual citation link; a caller-owned wrapper can instead use `tabIndex={-1}`. A note cited twice has two reference IDs and two explicitly ordered return links. Definition-grid styling stops at the direct note list; nested Lists retain their own layout.

Selecting Prose, Article layout, Anchor heading, or Footnotes emits [article-navigation](../../assets/behaviors/article-navigation.js) in `discern.js`. Load that script for reliable history focus and nested-scroll arrival: native Forward can leave focus on the previous note, and nested scrollers can retain the previous scroll position. The script responds to fragment changes by focusing an existing article destination with `preventScroll`, then using native `scrollIntoView({ block: "nearest" })` to keep it visible with the actual containers' scroll padding. It never intercepts a click, changes history, hydrates, or watches the reading position. It also recognizes explicit local return links from Footnotes to citations outside those Components. Native links remain usable without the script, with browser-dependent focus and nested-scroll restoration during history traversal. Unrelated targets outside opted-in roots remain outside this behavior.

[Markdown's projection](../../src/components/editorial/markdown/markdown.tsx) supplies that same focus contract. Its parser-provided heading IDs remain intact unless they collide with a note or citation destination. The projection reserves every existing heading and note ID before adding a deterministic suffix to a colliding heading, preserving unrelated heading links. An explicit link to an ambiguous original note ID resolves to the note. Callers composing multiple documents still own document-wide identity isolation.

## Review evidence

The [Article layout example](../../src/components/editorial/article-layout/article-layout.examples.tsx) is a complete reading sequence in an explicit scrolling allocation: paragraphs, nested List, Key points, Blockquote, Callout, Code listing, Data figure, Pull quote, section links, and a twice-cited note. Its `reading-journey` posture follows the second citation out and back. Anchor heading's `keyboard-anchor` and Footnotes' `second-reference-return` postures expose focus arrivals in the existing review instrument.

[article_reading_polish_test.tsx](../../tests/article_reading_polish_test.tsx) guards local allocations and mixed-block margins, compares embedded list geometry with standalone geometry (including an unrelated synthetic block), checks heading/note ID collisions, and runs fragment and history journeys in static HTML both with and without the selected script. Document and nested scroll containers have their own covering-header clearance. The complete gate also retains the unchanged terminal article contracts.
