/**
 * Authored Markdown dialect fixtures.
 *
 * The short cases are independently written from the public CommonMark 0.31.2
 * and GitHub Flavored Markdown 0.29-gfm specifications; no upstream suite or
 * prose is copied. `discern-compatibility` records constructs exercised by the
 * downstream Discern renderer as read-only compatibility evidence.
 *
 * @module
 */

import type { MarkdownBlock } from "../components/editorial/markdown/markdown.model.ts";

/** Fixed supported feature inventory for the v1 Markdown dialect. */
export const MARKDOWN_SUPPORTED_FEATURES = [
  "paragraph",
  "atx-heading",
  "setext-heading",
  "long-rich-heading",
  "duplicate-heading",
  "thematic-break",
  "soft-break",
  "hard-break",
  "escape",
  "entity",
  "emphasis",
  "strong",
  "strikethrough",
  "inline-code",
  "snake-case",
  "delimiter-edge",
  "inline-link",
  "reference-link",
  "autolink",
  "image",
  "reference-image",
  "nested-inline",
  "fenced-code",
  "indented-code",
  "info-string",
  "unordered-list",
  "ordered-list",
  "ordered-start",
  "task-list",
  "tight-list",
  "loose-list",
  "nested-list",
  "nested-code",
  "blockquote",
  "nested-blockquote",
  "alert",
  "table",
  "table-alignment",
  "empty-table-cell",
  "empty-table",
  "wide-table",
  "footnote",
  "repeated-footnote",
  "multi-block-footnote",
  "raw-html",
  "html-comment",
  "hostile-control",
  "unsafe-url",
  "empty-source",
  "unclosed-construct",
  "crlf",
  "discern-compatibility",
] as const;

/** One supported Markdown feature name. */
export type MarkdownSupportedFeature =
  (typeof MARKDOWN_SUPPORTED_FEATURES)[number];

/** One table-driven source case and the neutral blocks it must exercise. */
export interface MarkdownFixture {
  readonly id: string;
  readonly source: string;
  readonly features: readonly MarkdownSupportedFeature[];
  readonly blockKinds: readonly MarkdownBlock["kind"][];
  readonly provenance: string;
}

const authored =
  "Package-authored case informed by CommonMark 0.31.2 and GFM 0.29-gfm.";

/** Compact corpus covering every declared v1 dialect feature. */
export const markdownFixtures: readonly MarkdownFixture[] = [
  {
    id: "inline-core",
    source:
      "First line\nsecond line with two spaces  \nthird &amp; \\*literal\\*, *emphasis*, **strong**, ~~removed~~, `a_b`, main_branch, and * unclosed.",
    features: [
      "paragraph",
      "soft-break",
      "hard-break",
      "escape",
      "entity",
      "emphasis",
      "strong",
      "strikethrough",
      "inline-code",
      "snake-case",
      "delimiter-edge",
    ],
    blockKinds: ["paragraph"],
    provenance: authored,
  },
  {
    id: "headings-and-rule",
    source:
      "# A very long **rich** heading with `code` and [a label](#target)\n\nSetext heading\n==============\n\n## Repeat\n\n## Repeat\n\n---",
    features: [
      "atx-heading",
      "setext-heading",
      "long-rich-heading",
      "duplicate-heading",
      "thematic-break",
    ],
    blockKinds: ["heading", "thematic-break"],
    provenance: authored,
  },
  {
    id: "links-and-images",
    source:
      '[Inline](https://example.test/path) [**reference `code`**][ref] <https://example.test/auto> ![Inline alt](/image.png) ![Reference alt][image]\n\n[ref]: ../relative?q=1 "Relative reference"\n[image]: //cdn.example.test/image.png',
    features: [
      "inline-link",
      "reference-link",
      "autolink",
      "image",
      "reference-image",
      "nested-inline",
    ],
    blockKinds: ["paragraph"],
    provenance: authored,
  },
  {
    id: "code-blocks",
    source:
      "```ts module\nconst value = `*literal*`;\n```\n\n    indented_source = true",
    features: ["fenced-code", "indented-code", "info-string"],
    blockKinds: ["code"],
    provenance: authored,
  },
  {
    id: "list-forms",
    source:
      "- tight one\n- tight two\n  - nested child\n\n7. [x] ordered task\n8. [ ] pending\n\n- Loose opening\n\n  Continuation paragraph.\n\n- Final loose item",
    features: [
      "unordered-list",
      "ordered-list",
      "ordered-start",
      "task-list",
      "tight-list",
      "loose-list",
      "nested-list",
    ],
    blockKinds: ["list"],
    provenance: authored,
  },
  {
    id: "quotes-and-alerts",
    source:
      "> Ordinary quotation\n>\n> > Nested quotation\n\n> [!CAUTION]\n> Keep the facts visible.\n>\n> - Nested alert item",
    features: ["blockquote", "nested-blockquote", "alert"],
    blockKinds: ["blockquote", "callout"],
    provenance: authored,
  },
  {
    id: "nested-containers",
    source:
      "> - Parent item\n>   - Child item\n>\n>   ```text\n>   nested source remains literal\n>   ```",
    features: ["nested-list", "nested-blockquote", "nested-code"],
    blockKinds: ["blockquote"],
    provenance: authored,
  },
  {
    id: "aligned-table",
    source:
      "| Start | Centre | End | Empty |\n| :---- | :----: | ---: | :--- |\n| alpha | **beta** | 42 | |",
    features: ["table", "table-alignment", "empty-table-cell"],
    blockKinds: ["table"],
    provenance: authored,
  },
  {
    id: "wide-table",
    source:
      "| Identifier | Meaning | Evidence | State | Owner |\n| --- | --- | --- | --- | --- |\n| alpha | A deliberately wide relationship | https://example.test/evidence | ready | team |",
    features: ["wide-table"],
    blockKinds: ["table"],
    provenance: authored,
  },
  {
    id: "empty-table",
    source: "| Name | Value |\n| --- | --- |",
    features: ["table", "empty-table"],
    blockKinds: ["table"],
    provenance: authored,
  },
  {
    id: "footnotes",
    source:
      "One claim[^proof] and a repeated reference[^proof].\n\n[^proof]: First definition paragraph.\n\n    - Supporting item\n\n    > Supporting quotation",
    features: ["footnote", "repeated-footnote", "multi-block-footnote"],
    blockKinds: ["paragraph", "footnotes"],
    provenance: authored,
  },
  {
    id: "inert-and-hostile",
    source:
      "<script data-x=\"1\">alert('inert')</script>\n\nBefore <!-- omitted --> after.\n\n[Unsafe](javascript:alert(1)) ![Unsafe image](data:text/html,boom)\n\nControl: [31mred[0m‮",
    features: [
      "raw-html",
      "html-comment",
      "hostile-control",
      "unsafe-url",
    ],
    blockKinds: ["paragraph"],
    provenance: authored,
  },
  {
    id: "empty",
    source: " \n\t\n",
    features: ["empty-source"],
    blockKinds: [],
    provenance: authored,
  },
  {
    id: "unclosed-and-crlf",
    source: "Paragraph with *unclosed emphasis.\r\n\r\n- first\r\n- second\r\n",
    features: ["unclosed-construct", "crlf"],
    blockKinds: ["paragraph", "list"],
    provenance: authored,
  },
  {
    id: "discern-compatibility",
    source:
      "# Overview\n\nUse `<unsafe>` with [the docs](/docs).\n\n- parent\n  - child\n\n> [!NOTE]\n> Review the committed boundary.\n\n| Name | State |\n| --- | --- |\n| café 🙂 | ready |",
    features: ["discern-compatibility"],
    blockKinds: ["heading", "paragraph", "list", "callout", "table"],
    provenance:
      "Package-authored compatibility case derived from constructs asserted by Discern tests/markdown_test.ts on 2026-08-16.",
  },
] as const;
