# 4A — Unify Component discovery, detail, and comparison

**Goal:** Make Components one coherent human journey—recognise a collection, find a Component, inspect one visual example, then deliberately compare a bounded set—while preserving closed supporting guidance and the exact shared Web/CLI example contract.

**Wave:** 4. Implement in parallel with 4B–4E after 3A has landed. Land first within wave 4.

Other wave-4 streams are in flight. You own `4A` only; do not launch, dispatch, or supervise sibling briefs.

## Orient, verify prerequisites, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify these completion markers and their behavioural outcomes are on `main`:

- `_done/1a-catalogue-architecture-and-shell.md`: Components and Compare have page/route/style ownership seams;
- `_done/2a-cross-surface-example-contract.md`: generated registry entries expose one canonical ordered example vocabulary with explicit surface exceptions.
- `_done/3a-deterministic-component-example-images.md`: every canonical Web example has reusable theme-aware imagery and one derived representative image.

Use the full path `map/_private/planning/catalogue-ux/_done/…`. Stop if any prerequisite is absent or behaviourally incomplete.

Call `discern_start` with the literal name **`catalogue-4a`**, re-root every operation into the returned absolute `data.path`, and pass it to every discern tool.

Then read `AGENTS.md`, the programme README, `map/60-catalogue/README.md`, the Components and Compare route/page/style modules, the universal search authority created by 1A, the shared Component preview module, the generated example-image manifest and resolver created by 3A, `catalogue/cli-preview.tsx`, `catalogue/generated/registry.ts` as generated evidence only, the Component-family tests, and the Component/Compare browser-check module created by 1A. Verify live anchors. Use `discern-cure-a-bug` for heading, state restoration, duplicate-directory, image, or interaction defects.

## Background

The current Component explorer begins with Group and purpose cards, then replaces them with filtered Component cards. The separate Review route repeats Group and purpose directories before mounting every complete `ComponentPreview`, including three closed disclosure stacks for each Component. Detail routes render every Web state in sequence or every CLI example in sequence. This is complete for an LLM reading the DOM, but humans experience duplicated choices, long pages, repeated headers, and dense secondary evidence.

Wave 2A has made example identity exact across Web and CLI, and wave 3A has captured every Web example into reusable browser imagery. This stream turns those contracts into a visual interaction: discovery uses fast recognisable images without mounting the complete registry, while detail uses the live selected specimen and preserves its identity across surface switches and URL refresh.

The owner's density rule is binding. Guidance and API disclosures were intentionally collapsed because open guidance across multiple Components overwhelmed the specimens. Keep them closed on detail and omit them from ordinary comparison cards. The Catalogue should show the Component before it explains it.

## Deliverables

### 1. Make Components the one discovery directory

Keep `/catalogue/components/` as the canonical place to browse Groups, purposes, search results, and “all Components”. Remove the duplicate Group/purpose card directory from the visible Compare landing.

- Group and purpose cards are obviously clickable as whole cards, use labelled counts, and show a restrained derived mosaic or representative visual from generated member imagery plus a compact preview of member names with a truthful `+N more` treatment. Do not mount live Component populations on the index.
- Cards provide one clear inspect/browse action and a quiet secondary “Compare this collection” action without nested interactive controls inside an anchor.
- Component result cards lead with the generated representative image, then show name, short description, Group only when it disambiguates a mixed result set, and precise surface coverage derived from CLI stance. Use intrinsic dimensions and truthful theme selection from the image manifest; no hand-authored thumbnails or per-page representative list.
- Search, Group, purpose, “show all”, and result state round-trip through URL parameters. Browser Back/Forward restores both the controls and results. Keep the global Search Palette as a separate UI, but consume the universal search engine, aliases, scoring, and match reasons created by 1A rather than implementing a third matching authority.
- Match and empty states help recover with one action, not an instruction block.
- “All Components” is explicit and easy to reach, but Group/purpose recognition remains the calm default.

One collection data authority should feed browse cards, Compare scope choices, sidebar entries, counts, and search—not separate Group/purpose projections in each page.

### 2. Rebuild detail around the specimen

The Component detail page should answer these questions in visual order:

1. What is it?
2. What does this named example look like on Web or CLI?
3. Where is the source / how do I select it?
4. What supporting usage or API evidence is available if I need it?

Implement:

- a compact identity header with Component name, Group/breadcrumb, one short description, and precisely labelled source actions;
- one surface control whose Web/CLI state is URL-addressable and persists when moving to another Component;
- one example control derived from the canonical example authority. Switching Web/CLI keeps the same id and label whenever shared. A truly surface-only entry is visibly unavailable with its recorded reason; it must not silently jump to an unrelated example;
- one primary canvas showing the selected example at a time. Add a small responsive-width control only if it materially reveals Component behaviour; make it URL-addressable and avoid a generic control cockpit;
- a secondary **View all examples** mode for users doing complete state review. It may render the ordered gallery, but it is not the default page posture;
- stable example anchors/deep links, target highlighting that does not obscure the specimen, and previous/next Component navigation in canonical Group order;
- explicit source labels such as “Open React source”, “Open CLI renderer”, or “Open metadata” rather than a generic `Source ↗` whose destination changes silently.

Keep supporting evidence closed and orderly. A suitable sequence is Usage guidance, Selection/import, then Props/variants. Reword “Best practices” if a quieter “Usage guidance” label better matches the non-preachy posture. Do not open any disclosure by default, duplicate the Component description inside it, or add an instructional sidebar.

### 3. Turn Review into one deliberate Compare workspace

Keep `/catalogue/review/` working but use **Compare** in visible language. It is a workspace, not a second directory.

- Enter Compare from a Group/purpose card, selected Component results, a Component detail, or a small scope control. The bare Compare route offers a compact scope picker or a direct return to Components, not another full Group/purpose card grid.
- Support Group, purpose, custom Component selection, and complete-system scopes. Custom selection is shareable in the URL, order-stable, de-duplicated, and built from canonical Component ids.
- Make Complete system visibly secondary and warn only through concise weight/count information, not alarming prose.
- Provide **Set all to Web**, **Set all to CLI**, and **Reset individual overrides**. CLI-exempt Components remain honest and do not break global actions.
- Provide a sticky or otherwise dependable jump list grouped by canonical Group, with current target indication and no duplicated `h1`/Group/Component heading hierarchy.
- Each comparison item leads with identity, selected named specimen, surface/example controls where useful, and a link to full detail. Omit Usage, selection/import, and Props disclosures from the comparison population; those belong to detail and are the chief source of avoidable density.
- Let people remove/add Components in custom comparison without losing the rest of the URL state.

The conformance-only sheet may continue to render complete hidden/test evidence from the canonical source, but must not dictate ordinary Compare density.

### 4. Make state predictable across routes

Define and test one URL/state policy for:

- Component explorer query, Group, purpose, and all/show state;
- detail surface, selected example, optional view-all/preview width;
- Compare scope, selected Component ids, global surface, per-Component overrides, and current anchor.

Use History APIs so controls do not unexpectedly reload the whole shell, while refresh and copied URLs reproduce the view. Back/Forward must work. Local storage may remember a comfort default but never replace URL evidence.

### 5. Preserve source-backed contracts and accessibility

- Derive examples, labels, order, CLI availability, Group order, purpose membership, source paths, selection snippets, props, and variants from existing/generated authorities.
- Keep all existing Component conformance enrolment, state-fragment restoration, CLI projection, and source-copy contracts.
- Use one clear `h1` on detail and Compare, logical `h2` Groups and `h3` Components where applicable, labelled control groups, live result counts, visible focus, and target/focus styles that survive forced colours.
- Ensure previews contain wide content locally; no document-level horizontal overflow.

### 6. Replace implementation assertions with experience guards

Add tests that automatically cover the live registry and prove:

- collection cards/counts/`+N` are derived and direct to browse and Compare;
- every Component card resolves its representative image from the generated manifest in the active theme, index pages do not mount live specimens, and a future Component enrols without adding a thumbnail;
- explorer URL state and Back/Forward restoration;
- detail defaults to one example, preserves canonical id across Web/CLI, exposes honest surface-only reasons, and makes view-all deliberate;
- disclosures remain closed and ordered on detail and are absent from ordinary Compare items;
- global Compare surface actions, per-item overrides/reset, custom selection, jump links, Group headings, CLI exemptions, and complete-system secondary posture;
- source action labels match their actual destination;
- future Components and examples enrol without page edits;
- narrow layout, heading hierarchy, focus, keyboard control, and deep-link restoration work in a real browser.

Do not replace behavioural checks with new source regexes. Keep exhaustive conformance population tests separate from ordinary UI-density assertions. Edit only the Components/Compare family browser-check module; do not edit shared `scripts/conformance.ts` orchestration in this parallel wave.

### 7. Inspect representative journeys visually

Run `deno task serve` on the worktree's deterministic port and leave it running. In the in-app browser, exercise:

- default discovery, each Group/purpose, all Components, query, empty state, Back/Forward;
- simple one-example, multi-example, CLI-exempt, Forms lifecycle, dense Table/Command, and Chart/Diagram/Markdown detail pages;
- Web/CLI and example identity, view-all, deep links, source/disclosures, previous/next;
- Group, purpose, custom, and complete-system Compare, global/per-item controls, jump list, and removal;
- wide/narrow and light/dark, plus keyboard-only use.

Report exact URLs that reproduce each representative state.

## Constraints

- The specimen leads. Guidance and API disclosures stay closed on detail and do not appear in ordinary Compare cards.
- Consume the wave-2 canonical example authority and wave-3 generated image manifest; never invent display labels, representative examples, image paths, or example order in page code.
- Consume the universal search authority from 1A. This route family owns query/URL controls and record projection, not tokenisation, synonyms, scoring, match reasons, or tie-breaking.
- Keep Components as the one discovery directory and Compare as the one comparison workspace.
- Stay within Components/Compare route/page/style modules, the shared Component preview, `catalogue/cli-preview.tsx` only where its projection context needs change, and Components/Compare-owned unit/browser tests. Do not edit Foundations, Compositions, Terminal, landing/Overview, shared shell, or shared conformance-orchestration files.
- Do not edit generated files or Component example sources.
- Do not perform the deferred muted explanatory text/tiny metadata pass.
- No Interface Builder work or dedicated testing.
- Commit discovery, detail, Compare, URL state, and guards as reviewable logical steps.

## Out of scope

- Altering the canonical example contract or migrating Component fixtures.
- Foundations, Composition, Terminal layout, public landing, or Overview redesign.
- Adding `OverflowCue`; 4D owns it, and 5A can adopt it in remaining Component overflow locations after all page streams land.
- Opening or expanding usage guidance by default.
- Component visual redesigns, Token changes, or package release.

## Definition of done

- Components is the sole Group/purpose discovery directory; Compare no longer duplicates it.
- A person can browse by recognition, search/filter with shareable state, and understand cards/counts/actions without reading implementation language.
- Discovery cards use generated representative images in the correct theme without live-mounting the registry; image membership and selection auto-enrol future Components.
- Detail defaults to one large named specimen; the canonical example identity survives Web/CLI switching and refresh, while View all is deliberate and exceptions are honest.
- Usage, selection/import, and API evidence remain closed on detail and are absent from ordinary Compare populations.
- Compare supports Group, purpose, custom, and complete scopes; global Web/CLI, per-item overrides/reset, jump navigation, and URL restoration all work.
- Source actions, headings, focus, deep links, CLI exemptions, future enrolment, and narrow containment have practical regression guards.
- Representative journeys have been visually inspected wide/narrow and light/dark at exact URLs, with the server left running.
- No sibling page, generated/example source, muted-metadata, or Interface Builder work appears in the diff.
- After the final edit run `discern_prepare`, commit all changes, then run `discern_done` on clean committed HEAD.
- Once green, run `discern_accept`. A recorded grant may land; otherwise it must refuse without mutation, after which report the proof line and `catalogue-4a` branch/worktree and stop.
- In the final commit, move this brief from `map/_private/planning/catalogue-ux/4a-component-discovery-and-comparison.md` to `map/_private/planning/catalogue-ux/_done/4a-component-discovery-and-comparison.md` (create `_done/` if needed).
