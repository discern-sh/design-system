# The documentation shell

A static, server-rendered documentation site composes its complete reading chrome from the Docs Group without writing a package class or a line of layout or drawer script: Skip link, Docs header, Docs layout, Docs nav, Breadcrumbs, Table of contents, Pager, Anchor heading, and Search palette. React renders at build time; the emitted `discern.js` carries the behaviours the selection resolves; the consumer's own script keeps only what is genuinely its application — fetching and ranking a search index, rendering results, scroll-spy.

## Regions

[Docs layout](../../src/components/docs/docs-layout/docs-layout.tsx) is the grid: a navigation column, one `<main>` landmark whose id (`mainId`, default `main`) the skip link targets, and an optional labelled contents rail. Three columns fit a wide allocation, the rail leaves at a medium one, and at a narrow one the navigation becomes the off-canvas drawer described in [Static docs drawer](../40-runtime-emitter/static-drawer.md). The navigation column takes `navigationId`, which the consumer's toggle names, and `navigationLabel`, which names the drawer while it is a dialog; the column itself is a plain region, so the Docs nav it holds keeps its own landmark name. `--discern-docs-layout-max` widens the shell past the editorial page maximum, `--discern-docs-layout-navigation-size` and `--discern-docs-layout-rail-size` set the side columns, and `--discern-docs-layout-sticky-offset` clears the sticky header; its default matches Docs header's minimum block size, and a header that wraps or carries a notice strip needs the measured value.

[Docs header](../../src/components/docs/docs-header/docs-header.css) measures its inner row against `--discern-docs-header-max`, falling back to `--discern-page-max`, so a shell that runs wider than an article widens the bar without re-pointing the page token. [Pager](../../src/components/docs/pager/pager.tsx) emits `rel="prev"` and `rel="next"`, so the reading sequence is machine-readable.

## The document

[Anchor heading](../../src/components/docs/anchor-heading/anchor-heading.tsx) is a row holding the heading and its permalink as siblings, so the permalink never joins the heading's accessible name; a consumer that renders Markdown outside React emits the same wrapper form, and [Article reading](article-reading.md) records how Prose recognises the row. [Table of contents](../../src/components/editorial/table-of-contents/table-of-contents.tsx) shows a document's own section numbers when the document authors them and leaves framing sections blank, through `number` on each item, so a procedure's contents rail matches its headings.

## Search

[Search palette](../../src/components/docs/search-palette/search-palette.tsx) has two modes chosen by `onOpenChange`, following Theme toggle and [ADR-0047](../_adr/0047-select-static-modes-by-omitting-the-handler-and-mark-enhancement-on-the-root.md). Controlled, React owns `showModal()`, dismissal, and the field. Static, the dialog renders closed with no effects or handlers and stamps `data-discern-search-palette` on the dialog, `data-discern-search-palette-input` on the field, and `data-discern-search-palette-close` on the close control; only the static mode carries them, so one activation is never handled twice, and the field never carries `autofocus`, because a closed dialog's autofocus is the consumer script's decision when it opens. `closeAriaLabel` names the close control when the derived name does not read well.

The results region is anatomy the consumer's script fills: Search palette list is the `role="listbox"` the field's combobox wiring names through `aria-controls`, Search palette option is the `role="option"` form of the result anatomy — `discern-search-palette__result` with its `__result-title` and `__result-context` — that a script renders the same way, Search palette empty stays hidden until revealed, and Search palette status is the visually hidden polite live region for counts and load state. A selected option shares the result's highlighted treatment through `aria-selected`.

Opening, closing, focusing the field, Escape, backdrop dismissal, and the fallback for a reader without `showModal()` stay consumer-owned in this round; the ledger records the condition for lifting them into a package behaviour.

## Evidence

[docs_shell_contracts_test.tsx](../../tests/docs_shell_contracts_test.tsx) pins the Pager rel attributes, the Docs header token, the Anchor heading row and its Prose rhythm parity, the Table of contents numbering on both surfaces, the byte-identical controlled Search palette, and the static palette's hooks and companions. [docs_drawer_browser_test.tsx](../../tests/docs_drawer_browser_test.tsx) proves the drawer.
