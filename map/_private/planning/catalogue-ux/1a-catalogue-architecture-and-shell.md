# 1A — Create the Catalogue architecture and humane shell

**Goal:** Replace the monolithic Catalogue UI boundary with route-family modules and page-owned styles, then make the shared navigation, search, mobile drawer, and appearance chrome feel obvious to a human without increasing visual noise.

**Wave:** 1. This is the sole foundation stream. It must land before any wave-2 brief starts.

Other programme streams will follow. You own `1A` only; do not launch, dispatch, or supervise sibling briefs.

## Orient, re-root, then read

Work from the main checkout at `/Users/jack/Sites/discern-design-system`. Begin with `discern_status`. Confirm this planning package is present on `main` at `map/_private/planning/catalogue-ux/README.md`; if it is not, stop and report the missing prerequisite.

Call `discern_start` with the literal name **`catalogue-1a`**, then re-root every file and shell operation into the absolute `data.path` it returns. Pass that path to every later discern tool.

Only after re-rooting, read:

- `AGENTS.md` and `map/00-orientation/design-principles.md`;
- `map/60-catalogue/README.md` and the programme README beside this brief;
- `catalogue/app.tsx`, `catalogue/routes.ts`, `catalogue/catalogue.css`, and `catalogue/index.html`;
- the Catalogue-related portions of `tests/catalogue_instrument_test.ts`, `tests/catalogue_routes_test.ts`, `tests/serve_test.ts`, and `scripts/conformance.ts`;
- `src/components/docs/search-palette/**` if the generic component must change to provide an explicit close action.

Verify all anchors against the live tree before editing. Use the `discern-cure-a-bug` procedure for focus, drawer, scroll-lock, heading, or state defects whose cause is not already proven.

## Background

The current explorer is source-backed and functionally capable, but almost all routed UI lives in a 2,008-line `catalogue/app.tsx`, while nearly every Catalogue rule lives in a 1,703-line `catalogue/catalogue.css`. Different page redesigns would collide in those two files. Tests compound the problem by parsing exact function names and CSS source fragments rather than guarding user behaviour.

The visible shell also exposes several implementation-shaped choices: navigation order differs between surfaces; route copy speaks about mounting contracts and explicit scopes; the accent slider sits in primary chrome without an Appearance context; the mobile drawer lacks the complete modal interaction model; search depends on users reading result titles without showing why a match occurred; and the explorer has no Catalogue skip link.

The intended posture is quiet and visual. Do not solve discoverability by adding paragraphs. Give people stable places, direct actions, and recognisable affordances.

## Deliverables

### 1. Establish real route-family ownership seams

Refactor without changing existing public URLs or breaking legacy URL upgrades.

- Reduce `catalogue/app.tsx` to bootstrap, top-level state composition, and route rendering. It must no longer define every page, sidebar branch, and preview renderer inline.
- Introduce explicit, unsurprising modules under `catalogue/shell/`, `catalogue/pages/`, and a route-family structure under `catalogue/routes/`. Keep `catalogue/routes.ts` as a compatibility entrypoint if existing imports need it.
- Give Overview, Components/Compare, Foundations, Compositions, Terminal layouts, and Not found separate page modules. Shared page furniture belongs in a small shared module only when at least two page families genuinely use it.
- Make route-family modules capable of owning their future index/detail route patterns and search projections without editing one central switch. Wave-2 and wave-3 agents must be able to add a Foundations, Composition, Component, Compare, or Terminal detail route inside that family's files.
- Keep canonical shell serving and legacy `#component-*`, Group, Token, Composition, and Terminal fragments working. Strengthen `tests/catalogue_routes_test.ts` and `tests/serve_test.ts` around behaviour rather than filenames.
- Do not create an abstraction framework for hypothetical routes. The seam is successful when the planned page workstreams have disjoint files, not when the router becomes generic for its own sake.

### 2. Create one canonical human navigation authority

One data authority must project the same route names and order into the sidebar, global search, Catalogue overview, and downstream landing-page consumers:

1. Overview
2. Components
3. Foundations
4. Compositions
5. Terminal layouts
6. Compare

Keep `/catalogue/review/` stable for compatibility, but use “Compare” in visible task language. Route descriptors may carry a short human description and search terms; do not repeat those facts in each consumer.

Remove internal language from shared shell copy. A user should see actions such as “Find a Component”, “Compare Components”, “Open source”, and “Change appearance”, not implementation statements about mounting, generated destinations, inventories, contracts, or explicit scopes.

### 3. Make the shared shell work by feel

- Add the package `SkipLink` as the first interactive Catalogue element and a stable main-content target. Confirm one `h1` per routed page and a coherent landmark/heading structure.
- Keep desktop navigation calm and compact. Active route and active local destination must be distinguishable by more than colour alone without turning every entry into a badge.
- Turn the narrow navigation into a complete modal drawer: labelled dialog semantics, Escape close, backdrop close, initial focus, focus containment, focus restoration to the menu trigger, background inertness/scroll lock, and no duplicate close announcements. Preserve ordinary navigation when JavaScript or an enhancement is unavailable.
- Keep Theme readily reachable, but place Theme and accent hue inside one compact **Appearance** control. The hue range retains its accessible name, swatch, numeric feedback, persistence, and token-driven preview; it no longer reads as an unexplained primary-toolbar slider.
- Ensure the shell has no document-level horizontal overflow at narrow widths and does not hide access to search, appearance, or navigation.

### 4. Make global search legible without making it verbose

Continue to search route names, Component metadata, Tokens, terminal foundations, and Composition definitions from their real authorities.

- Show a concise match reason or highlighted matched field when a result was found through description, purpose, guidance, Group, or keywords rather than its title.
- For an empty query, show a small set of useful starting destinations derived from the canonical route authority rather than an instruction paragraph.
- For no results, offer direct recovery actions such as viewing all Components or clearing the query.
- Provide a conspicuous close action in addition to Escape/backdrop behaviour. If this is generically missing from `SearchPalette`, fix the public Component with focused examples, conformance coverage, and an Unreleased changelog entry; do not bolt a Catalogue-only close button onto its internal DOM.
- Preserve direct routed results, keyboard focus, Escape behaviour, and focus restoration. Do not build a second search implementation beside `SearchPalette`.

### 5. Split the Catalogue stylesheet by ownership

Keep `/catalogue/catalogue.css` as the stable stylesheet URL, but make it a small ordered entrypoint over page-owned styles. A suitable live-tree-verified shape is:

- `catalogue/styles/foundation.css` for Catalogue-only variables and resets;
- `catalogue/styles/shell.css` and `catalogue/styles/shared.css`;
- one stylesheet per route family (`overview.css`, `components.css`, `foundations.css`, `compositions.css`, `terminal.css`, `compare.css`);
- one responsive file only for truly cross-page shell behaviour; page-specific responsive rules stay with their page.

Preserve the `discern` namespace and layer rules. Remove dead selectors during the move. Do not change the deliberately deferred muted-text/token hierarchy as a side effect.

### 6. Replace brittle structure checks with useful guards

Refactor Catalogue tests that currently slice `app.tsx` by function name or regex exact CSS bodies. Keep the underlying invariants, but guard them at the closest behavioural or exported authority:

- canonical route order and descriptors;
- explorer routes do not mount specimen populations;
- Compare requires a deliberate scope before exhaustive rendering;
- supporting Component disclosures are closed by default;
- mobile drawer focus/scroll semantics;
- search destinations, reasons, recovery, direct routing, and focus restoration;
- one `h1`, skip-link target, landmarks, no narrow document overflow, and accessible appearance controls.

Split the current mixed `tests/catalogue_instrument_test.ts` responsibilities into shared-registry and route-family-owned test files, so later Components, Foundations, Compositions, Terminal, and front-door streams never edit one test file concurrently. Likewise make `scripts/conformance.ts` a bounded orchestrator over shared shell checks and family-owned browser-check modules (or an equivalently concrete seam). Move existing checks without dropping coverage. A later page stream must be able to add its browser interactions inside its own family module; wave 4 alone owns final cross-family orchestration.

Use focused unit/render tests where sufficient and real-browser checks where layout, focus, native dialog, or scroll behaviour is the contract. Do not weaken existing Component conformance. Do not add or perform dedicated Interface Builder testing.

### 7. Inspect the result visually

Run `deno task serve` on this worktree's deterministic `discern identity --port` and leave it running. Use the in-app browser to inspect at minimum Overview and one representative route at wide and narrow widths, in light and dark. Exercise keyboard search, skip link, drawer open/close/focus restoration, Appearance, and route navigation. Report the exact `http://127.0.0.1:<port>/catalogue/` URL.

## Constraints

- Preserve one authority per route fact and every generated fact. Never hand-edit `src/generated/**` or `catalogue/generated/**`.
- Keep all supporting guidance/disclosures closed by default. This architecture pass must not expand the Catalogue into an instruction manual.
- Keep page modules concrete. Avoid one-caller indirection or a custom page framework.
- Cure each interaction defect as a class and leave a regression guard.
- If the route-family boundary or a public Search Palette API choice is surprising or hard to reverse, write an ADR under `map/_adr/` and update the map.
- Commit atomically: architecture seam, shell behaviour, and test migration should review as coherent steps.
- The full `discern_done` gate is the bar. Do not skip existing gate work that happens to cover the Interface Builder, but do not browse or target the Builder yourself.

## Out of scope

- Redesigning Component discovery/detail/Compare content; wave 3A owns it.
- Migrating Web/CLI example names or Component example modules; wave 2A owns it.
- Redesigning Foundations, Compositions, Terminal layouts, or the public landing content.
- Adding `OverflowCue`; wave 3B owns the public Component and adoption.
- Raising the prominence of muted explanatory copy or tiny metadata.
- Editing `catalogue/builder/**` or adding dedicated Builder checks.

## Definition of done

- `catalogue/app.tsx` is a bounded bootstrap/composition module; routed pages, styles, family tests, and browser checks have disjoint named owners; later programme streams can work without sharing a page file, stylesheet, mixed test file, or conformance body.
- One tested route descriptor authority supplies the canonical six-destination names/order everywhere this stream owns, while all existing canonical and legacy URLs still resolve.
- The Catalogue has a working skip link, one `h1` per route, a keyboard-complete modal mobile drawer, a compact Appearance control, and no narrow document overflow.
- Search exposes concise match reasons, useful starting/recovery destinations, direct links, an explicit close action, and correct focus restoration.
- Source-string tests that pinned the old monolith are replaced by guards that fail when the user-facing invariant regresses.
- Component guidance remains closed and visual density has not increased; the Catalogue reads more clearly with less prose, not more.
- No muted-metadata pass or Interface Builder work has slipped into the diff.
- The exact Catalogue preview URL has been inspected in the in-app browser at wide/narrow and light/dark, and the dev server remains running for review.
- After the last edit, run `discern_prepare`, commit every resulting change in focused commits, then run `discern_done` on the clean committed HEAD. Fix every diagnostic without loosening a standard or test.
- Once `discern_done` is green, run `discern_accept`. A recorded grant may land the branch; without one it must refuse without mutation, after which report the proof line and the `catalogue-1a` branch/worktree and stop for owner review.
- In the final commit, move this brief from `map/_private/planning/catalogue-ux/1a-catalogue-architecture-and-shell.md` to `map/_private/planning/catalogue-ux/_done/1a-catalogue-architecture-and-shell.md` (create `_done/` if needed) so the landed tree records completion.
