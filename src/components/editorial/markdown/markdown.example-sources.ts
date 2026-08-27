/** Shared authored Markdown sources projected by browser and terminal examples. */
export const markdownCompactExampleSource = [
  "# A measured document",
  "",
  "Use **clear structure** for [safe references](https://example.test/reference).",
  "",
  "- Preserve the hierarchy",
  "- Keep every target visible",
].join("\n");

/** CommonMark and GFM structures exercised as one catalogue-worthy dialect. */
export const markdownFullDialectExampleSource = [
  "# Full dialect",
  "",
  "Setext heading",
  "--------------",
  "",
  "Escapes, &amp; entities, *emphasis*, **strong text**, ~~removed text~~, `inline code`, and an autolink: https://example.test.",
  "",
  "> [!IMPORTANT]",
  "> Alerts retain nested content.",
  ">",
  "> - [x] Edited",
  "> - [ ] Ready to publish",
  "",
  "3. Ordered from three",
  "4. Second item",
  "",
  "| Stage | Status |",
  "| :---- | -----: |",
  "| Draft | In review |",
  "| Final | Ready |",
  "",
  "---",
  "",
  "```ts module",
  "const pages = 12;",
  "export { pages };",
  "```",
  "",
  "A repeated note[^detail] remains linked[^detail].",
  "",
  "[^detail]: The definition can contain more than one block.",
  "",
  "    > Including a quotation.",
].join("\n");

/** Deep structural nesting shared by both Markdown projections. */
export const markdownDeepNestingExampleSource = [
  "> Outer quotation",
  ">",
  "> 1. Ordered item",
  ">    - Nested item",
  ">      > Inner quotation",
  ">      >",
  ">      > ```text",
  ">      > literal *source*",
  ">      > ```",
].join("\n");

/** Complete heading hierarchy used to compare reading structure. */
export const markdownReadingHierarchyExampleSource = [
  "# Reading foundations",
  "",
  "Use `plain language` when detailed material must remain easy to follow.",
  "",
  "## Document boundary",
  "",
  "### Section marker",
  "",
  "#### Strong subsection",
  "",
  "##### Quiet subsection",
  "",
  "###### Supporting note",
].join("\n");

/** Unsafe constructs that must remain inert and visibly represented. */
export const markdownHostileExampleSource = [
  '<script>alert("inert")</script>',
  "",
  "[Unsafe link](javascript:alert(1)) and ![unsafe image](data:text/html,boom).",
  "",
  "<!-- omitted comment -->",
  "",
  "Control notation remains visible: [31mred[0m‮.",
].join("\n");
