# 3B — Turn Foundations into a visual explorer

**Goal:** Replace the single long mixed Foundations page with a bounded, searchable visual Token explorer and a distinct terminal-foundations gallery, both projected from the existing authorities and navigable without reading an inventory line by line.

**Wave:** 3. Implement in parallel with 3A, 3C, 3D, and 3E after 2A has landed. Land second within wave 3, after 3A.

Other wave-3 streams are in flight. You own `3B` only; do not launch, dispatch, or supervise sibling briefs.

## Orient, verify prerequisites, then re-root

Work from `/Users/jack/Sites/discern-design-system`. Call `discern_status`. Verify these landed prerequisites on `main`:

- `map/_private/planning/catalogue-ux/_done/1a-catalogue-architecture-and-shell.md`;
- `map/_private/planning/catalogue-ux/_done/2a-cross-surface-example-contract.md`;
- the live tree has a Foundations-owned route module, page module, and stylesheet seam.

If a prerequisite is absent, stop and report it. Call `discern_start` with the literal name **`catalogue-3b`**, re-root every operation into the returned absolute `data.path`, and pass it to discern tools.

Then read `AGENTS.md`, the programme README, `map/60-catalogue/README.md`, the Foundations route/page/style modules created by 1A, `src/tokens/tokens.ts`, `catalogue/terminal-foundations.ts`, `catalogue/terminal-foundation-preview.tsx`, `tests/catalogue_terminal_foundation_test.tsx`, `tests/catalogue_terminal_theme_test.ts`, and the Foundations-owned browser-check module created by 1A. Verify file locations against the live tree.

## Background

Foundations currently renders every Token category in sequence and then appends terminal motif and narration sheets to the same page. Token cards display a small generic mark, name, description, and raw value; themed colour values appear as a slash-separated string. People must scroll and read labels to discover what is present. Terminal foundations use a different mental model but inherit the same long-page navigation.

The intended experience is a catalogue of visible foundations, not a CSS-variable manual. Users should recognise colour, type, scale, shape, motion, layout, and terminal rhythm before they parse details. Raw values and copy actions remain available, but do not lead the composition.

## Deliverables

### 1. Split the route by human task

Within the Foundations-owned route family, create stable bounded destinations for:

- a small Foundations index;
- the Token explorer;
- terminal foundations, with a detail destination per registered sheet when that produces a calmer page than anchors.

Use the route-family extension seam from 1A; do not edit another page family's route file or a central hard-coded switch. Existing `/catalogue/foundations/` and legacy Token/terminal-foundation fragment links must upgrade or redirect meaningfully rather than break. Add route tests for canonical and legacy URLs.

The Foundations index should make the two choices visually unmistakable. Keep its copy short: “Tokens” and “Terminal foundations” are clearer than provenance-heavy descriptions.

### 2. Build a true Token explorer

Project from `allTokens`, `baseTokens`, `discernThemeTokens`, and the existing token types. Do not author a second Token list, value table, count, category vocabulary, or alias map inside the page.

Provide:

- instant search across name, category, description, and value;
- a category control that works by recognition and keyboard, with “All” as an explicit option;
- URL-addressable query/category state with a useful clear/reset action;
- labelled result count and a helpful empty recovery state;
- copy actions for the custom-property name and the authored value(s), with action labels that say exactly what will be copied;
- a bounded detail treatment or expandable secondary evidence so raw values do not dominate every card.

Make previews truthful to each category:

- **Colour:** show light and dark swatches side by side when both exist, label each scheme, and use a checker/border where transparent or near-canvas values would disappear. Single-value hues or controls show one labelled value.
- **Typography:** render a useful sample phrase, actual role/size/weight/leading where applicable, and a small factual value. A font stack should look like type, not just “Aa”.
- **Spacing/Layout:** show a common scaled ruler or box context so relative steps can be compared; do not let large values overflow their cards or make tiny values invisible.
- **Shape:** show radii and shadows on a consistent surface, not an arbitrary thin bar.
- **Motion:** provide an opt-in replay/preview that respects `prefers-reduced-motion`; do not autoplay a wall of motion.

If meaningful role/alias grouping is impossible from current Token data, extend the token authority and its tests rather than infer a second taxonomy from string parsing. Do not change token values merely to improve the Catalogue.

### 3. Give terminal foundations their own visual grammar

Keep `catalogue/terminal-foundations.ts` as the one framework-neutral registry feeding stdout, browser, search, and playground surfaces.

- Present the registered sheets as a small gallery/index before mounting specimens.
- On a sheet detail, group related specimens, make the live animation versus complete static evidence relationship immediately legible, and keep Play/Pause available.
- Preserve automatic reduced-motion handling, theme projection, source registry ordering, and complete auto-enrolment.
- Avoid nesting every specimen in multiple bordered panels. Let terminal frames carry the visual weight and use whitespace/group headings for structure.
- Give each specimen a stable link, but do not turn every fragment symbol into equally loud chrome.

The terminal-foundation route remains distinct from complete Terminal layouts. Explain that difference in one short sentence at the index: foundations are motifs and narration primitives; Terminal layouts are composed full frames.

### 4. Integrate navigation and search from the family authority

Project Token categories, registered foundation sheets, and their detail destinations into the route-family navigation/search contribution introduced in 1A.

- Sidebar/local navigation should show the bounded current level, not every Token and every terminal specimen at once.
- Global search reaches the relevant Token or sheet directly and keeps the shell's concise match-reason treatment.
- Detail pages provide an obvious return to Foundations and previous/next movement where helpful.

Do not edit the shared shell/search implementation or another family's search provider.

### 5. Leave future-member guards

Add focused tests proving:

- every Token category and registered terminal foundation appears without manual enrolment;
- search/filter and URL state round-trip from the authority;
- themed versus single-value Token previews are labelled correctly;
- copy actions copy the advertised fact;
- reduced-motion and explicit animation controls still work;
- a synthetic future terminal sheet joins index, detail route, navigation, search, and browser rendering without page-specific edits;
- headings/landmarks are coherent and the explorer has no document-level overflow at narrow widths.

Prefer semantic render/interaction tests to source regexes. Keep existing stdout and projection tests intact.

### 6. Inspect with human eyes

Run `deno task serve` on the worktree's deterministic port and leave it running. In the in-app browser, inspect the Foundations index, each Token category, search/no-results, light/dark colour evidence, typography/spacing/motion previews, and both terminal foundation sheets at wide and narrow widths. Exercise keyboard filters, copy, deep links, reduced motion, and animation controls. Report exact URLs.

## Wave-3 landing order

Implementation may finish while 3A is still in flight, but this branch lands second. Before the final `discern_prepare`/commit/`discern_done`, confirm `map/_private/planning/catalogue-ux/_done/3a-component-discovery-and-comparison.md` is present on `main`. If it is not, report that 3B is implementation-ready, keep the worktree, and stop for the owner to resume after 3A lands. Once present, call `discern_update`, follow its exact recovery/overlap guidance, re-read any files it names, then finish and gate the composed tree.

## Constraints

- The page projects Token and terminal-foundation authorities; it never duplicates their facts.
- Preserve `--discern-font-size-xs` and every authored Token value. A UI problem is not permission to retune the design system.
- Do not perform the deferred global muted-text or tiny-metadata prominence pass.
- Keep copy/actions accessible without adding instructional paragraphs to every card.
- Stay within the Foundations family modules/styles, `terminal-foundation-*` projections, and Foundations-owned unit/browser tests. Do not edit Component, Composition, Terminal-layout, overview, landing, shared shell, or shared conformance-orchestration files.
- Never hand-edit generated output.
- Commit route shape, Token explorer, terminal gallery, and guards as focused logical changes.

## Out of scope

- Component examples, detail pages, or Compare.
- Composition patterns or complete Terminal layout recipes.
- Public landing/overview redesign.
- `OverflowCue`; 3D owns it. Use existing local containment until 3D lands, and let 4A adopt the public cue here if the integrated audit proves it useful.
- Interface Builder work or dedicated testing.
- Token-value, theme, or typography retuning.

## Definition of done

- `/catalogue/foundations/` is a calm index, Tokens and terminal foundations have bounded destinations, and legacy links resolve meaningfully.
- A person can find a Token visually or by search/category, copy the intended fact, compare light/dark truthfully, and share the current state in the URL.
- Colour, Typography, Spacing/Layout, Shape, and Motion previews communicate their category without requiring the description to be read first.
- Terminal foundations read as motif/narration galleries, preserve complete registry auto-enrolment and reduced-motion behaviour, and are clearly distinct from full Terminal layouts.
- Navigation/search contributions derive from the family authorities and do not flood the sidebar.
- Focused tests cover future Tokens/sheets, URL state, copying, motion, headings, and narrow overflow.
- No other page family, muted-metadata pass, Token retuning, or Interface Builder work appears in the diff.
- Exact live URLs have been visually and interactively checked at wide/narrow and light/dark; the server remains running.
- After 3A has landed, run `discern_update`; after the last edit run `discern_prepare`, commit all changes, then run `discern_done` on clean committed HEAD.
- Once green, run `discern_accept`. A recorded grant may land; without one it must refuse without mutation, after which report the proof line and `catalogue-3b` branch/worktree and stop.
- In the final commit, move this brief from `map/_private/planning/catalogue-ux/3b-foundations-explorer.md` to `map/_private/planning/catalogue-ux/_done/3b-foundations-explorer.md` (create `_done/` if needed).
