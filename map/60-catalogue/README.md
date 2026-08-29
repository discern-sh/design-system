# Catalogue

The Catalogue is the routed local browser for the design system. It is built for recognition first: an index helps a person find a useful family or item, then a detail route shows the real specimen, swatch, pattern, or terminal frame before its supporting explanation. Run `deno task serve` and open the worktree's assigned port.

## Routes and human navigation

The site root and Catalogue have distinct jobs:

- `/` is the design system's static landing page.
- `/catalogue/` is the small Catalogue overview.
- `/catalogue/components/` owns Component discovery; its slug routes own live detail specimens.
- `/catalogue/foundations/` owns Token and terminal-foundation explorers.
- `/catalogue/compositions/` owns illustrative browser patterns.
- `/catalogue/terminal/` owns complete terminal-layout capability labs.
- `/catalogue/review/` is the deliberate Compare workspace.

Each family in [`catalogue/routes/`](../../catalogue/routes/) owns its route shape, human descriptor, local navigation, legacy projection, and universal search records. The ordered [`routes/registry.ts`](../../catalogue/routes/registry.ts) registry is the one authority for primary navigation names and order. The shell uses that registry for its desktop sidebar, narrow modal drawer, overview, and Search Palette; family navigation stays contextual instead of repeating a complete inventory. The first interactive element is the Skip link to the stable main landmark.

Legacy one-page fragments upgrade to the equivalent routed destination while preserving valid example identity. Unknown route-like Catalogue requests reach the designed not-found page; missing assets remain real HTTP 404s. The local server boundary lives in [`scripts/serve.ts`](../../scripts/serve.ts).

The [Beta Interface Builder](interface-builder.md) remains a secondary link in the shell. It is a separate programme and is not part of ordinary Catalogue route review.

## One example identity across Web and CLI

Every Component's framework-neutral `componentExampleVocabulary` beside its Metadata owns canonical example ids, labels, order, surface applicability, and specific single-surface reasons. Web `catalogueExamples` and rendered `cliExamples` bind implementations to that vocabulary; generation refuses a missing, duplicate, reordered, undeclared, or silently unavailable projection. [ADR 0033](../_adr/0033-use-canonical-example-ids-for-catalogue-fragments.md) records the fragment compatibility boundary.

The Component index projects Groups, purposes, counts, and result cards from [`pages/components/collections.ts`](../../catalogue/pages/components/collections.ts). Cards use the generated representative image for the canonical Web example in the active theme and never mount the live Component population. A detail route mounts one selected example by default; Web and CLI keep the same canonical id, and an unavailable projection states its recorded reason. Deliberate View all is the only ordinary detail mode that mounts every example.

[`cli-preview.tsx`](../../catalogue/cli-preview.tsx) calls the pure CLI renderer with explicit capabilities and projects its supported ANSI output into a bare, cell-stable browser surface. It is a second projection of the same example, not a second catalogue or a screenshot.

Generated discovery imagery has its own exact-bounds contract under [`example-images/`](../../catalogue/example-images/). The capture route renders every canonical Web example in Light and Dark; the update task crops the declared root, commits the PNG, and writes the typed generated manifest. [`example-images.ts`](../../catalogue/example-images.ts) is the consumer seam for active-theme resolution, intrinsic dimensions, and the representative rule (`default`, then the first Web example). Detail routes always retain the live specimen. [ADR 0034](../_adr/0034-commit-pinned-png-component-example-images.md) records the committed-image posture.

[Browser visual review](visual-review.md) composes those examples, conformance actions, and capture regions into a local-only posture instrument. Settled defaults auto-enrol; meaningful extras stay beside their example implementation; the tiered ephemeral matrix is evidence rather than a pixel gate. Embedded review widths follow the requested local canvas, while the small set of page-scale owners declared in [`responsive-ownership.ts`](../../catalogue/review/responsive-ownership.ts) follow the actual page viewport.

## Search, Compare, and source actions

[`catalogue/search/`](../../catalogue/search/) is the only matching authority. It owns normalization, intent aliases, all-token matching, ranking, stable ties, and human match reasons. Global search and family-restricted projections select different populations but consume those exact semantics; an alias such as “call to action” therefore ranks CTA Band and explains the same alias in both places. Route providers contribute source facts without implementing a family matcher.

Catalogue copy states its semantic role through [`metadata-copy.ts`](../../catalogue/metadata-copy.ts). Sentence-length descriptions, match reasons, guidance, recovery, impact, and unavailable explanations use the readable decision-copy treatment; short Groups, example labels, counts, source facts, and availability markers remain terse tertiary metadata. The Component directory suppresses a match explanation only when it exactly duplicates the already-visible description. [`metadata-copy.ts`](../../scripts/conformance/catalogue/metadata-copy.ts) guards the role in both Themes and representative 400% reflow without changing the public xs floor or faint-ink Token.

Compare asks for a Group, purpose, custom Component set, or explicit complete system before mounting specimens. It renders one named example per Component, keeps the jump list aligned with the selected population, and separates the global Web/CLI choice from per-Component overrides. Ordinary Compare items omit detail-only evidence. Its state authority is [`pages/compare/state.ts`](../../catalogue/pages/compare/state.ts).

Component detail source actions name their destination: React source, CLI renderer when present, and Metadata. Runtime selection, Group selection, and React imports are copied separately. Props and variants come from authored TypeScript through the build's `deno doc --json` projection; unsupported source unions state why they are not flattened.

## Explorers

The Foundations index leads to two distinct review modes. The Token explorer shows recognisable previews before expandable values and copy actions; query and category filters share the URL and the category row uses a selective inline overflow cue when needed. The terminal-foundation registry in [`terminal-foundations.ts`](../../catalogue/terminal-foundations.ts) enrols each sheet in stdout, browser navigation, search, preview, and conformance. Animated motifs honour reduced motion and retain an explicit Play/Pause action.

Compositions are illustrative Catalogue patterns, not exported package APIs. Each definition in [`compositions.tsx`](../../catalogue/compositions.tsx) drives its index card, responsive preview, constituent links, and adaptable source. Detail routes expose Narrow, Standard, and Wide review widths in URL state and label copied source as adaptable rather than drop-in API.

Terminal layouts compose public CLI renderers into complete frames. Definitions in [`cli-compositions.ts`](../../catalogue/cli-compositions.ts) feed the capability lab in [`terminal-layout-inspector.tsx`](../../catalogue/terminal-layout-inspector.tsx). Preset or custom geometry, character set, colour depth, hyperlinks where applicable, and grid state reproduce through the URL. Raw terminal output, reproducible lab URL, and adaptable composition source are separate copy actions. The public inspector supplies rulers, fold and overflow facts; the Catalogue does not recreate terminal geometry.

## Appearance and URL state

Appearance is a reusable consumer boundary, split between the proved presets in [`shell/appearance-options.ts`](../../catalogue/shell/appearance-options.ts), pure state in [`shell/appearance-state.ts`](../../catalogue/shell/appearance-state.ts), and the compact control in [`shell/appearance.tsx`](../../catalogue/shell/appearance.tsx). System, Light, and Dark resolve the browser and terminal preview palettes together. The closed disclosure offers only semantically safe named accents. Valid explicit `theme` and non-default `accent` parameters are shareable, storage supplies comfort persistence, and Back/Forward restores URL-preferred state. Local Component and Compare controls preserve explicit Appearance parameters.

Family state uses stable parameters and omits comfort defaults:

| Family                  | Consequential URL state                                                    |
| ----------------------- | -------------------------------------------------------------------------- |
| Components index        | query, Group, purpose, explicit All                                        |
| Component detail        | surface, canonical example, deliberate View all                            |
| Compare                 | scope, global surface, overrides, examples, custom membership, jump target |
| Tokens and Compositions | query/category and responsive width                                        |
| Terminal layouts        | preset/custom capabilities and grid                                        |

Invalid values fall back to bounded canonical defaults. Components and Compare use native history for consequential selection changes; the filter-style Token, Composition width, Terminal capability, and Appearance controls replace their current entry. Reload and Back/Forward reconstruct visible controls from the URL rather than hidden component state.

## Overflow discovery

The Catalogue uses the public [`OverflowCue`](../../src/components/layout/overflow-cue/) only where clipped content materially continues: wide Web specimens and prop tables, CLI output, Token categories, Compare's jump list, responsive Composition previews and source, Terminal frames and source, and selected wide landing examples. Native scrollbars remain primary; fitting or trivial regions receive no cue. No family-owned fade or mask duplicates the Component.

The Component behaviour follows real block and inline edges, RTL conventions, resize, late-added or replaced descendant targets, forced colours, and its contextual surface colour. Every adopted target remains keyboard focusable and locally contained; narrow conformance proves that it never turns local overflow into document overflow.

## Landing page

[`landing/page.tsx`](../../catalogue/landing/page.tsx) renders the site root to static HTML from published Components and a selection-scoped runtime. Manifest facts in [`landing/facts.ts`](../../catalogue/landing/facts.ts) supply inventory and cross-surface evidence. Page-owned behavior under [`landing/behaviors/`](../../catalogue/landing/behaviors/) applies Theme preference and identifies native scroll targets for the selected wide examples; the cue itself remains the public package behavior. The page has no React hydration.

[`landing_test.ts`](../../tests/landing_test.ts) proves exact emission, deterministic markup, behavior inventory, and selection/class coverage. Front-door browser checks add navigation, Theme persistence, structural and axe checks, narrow containment, and real OverflowCue edges.

## Browser conformance

[`scripts/conformance.ts`](../../scripts/conformance.ts) is the bounded browser orchestrator. The derived plan in [`browser-check-plan.ts`](../../scripts/conformance/catalogue/browser-check-plan.ts) requires every registered route family to own exactly one browser module, so a future family cannot exist without a runner and an existing runner cannot stay orphaned. Family checks live beside shared shell, front-door, and public OverflowCue checks under [`scripts/conformance/catalogue/`](../../scripts/conformance/catalogue/).

The real-browser gate protects route projection and bounded mounting; drawer, Skip link, search, Appearance, history, and focus restoration; one semantic page heading and landmark order; canonical examples and generated imagery; Compare and every explorer's URL state; actual OverflowCue start, middle, and end edges; keyboard reachability; axe in both themes; forced-colour focus; reduced motion; local-width geometry; semantic metadata roles at representative 400% reflow; and narrow document containment. Screenshots remain review evidence, while semantic state, geometry, and interactions are assertions. [`resilience-conformance.ts`](../../scripts/resilience-conformance.ts) retains the cross-route journey and exhaustive rendered-surface stage.

The machine-only `?conformance=1` route remains exhaustive. Ordinary indexes stay light, Component detail and Compare mount one selected frame per member, and complete-system or View-all modes remain explicit review choices.

## Where to start

| Concern                                                       | Authority                                                                                                                                                                                                                                     |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route vocabulary, matching, local navigation, legacy upgrades | [`catalogue/routes/`](../../catalogue/routes/) and [`routes.ts`](../../catalogue/routes.ts)                                                                                                                                                   |
| Shell, drawer, universal search, Appearance                   | [`catalogue/shell/`](../../catalogue/shell/)                                                                                                                                                                                                  |
| Component discovery, detail, and Compare pages                | [`catalogue/pages/components/`](../../catalogue/pages/components/) and [`catalogue/pages/compare/`](../../catalogue/pages/compare/)                                                                                                           |
| Canonical examples and generated registry                     | Component Metadata/vocabularies and [`scripts/build.ts`](../../scripts/build.ts)                                                                                                                                                              |
| Generated example-image contract and resolver                 | [`catalogue/example-images/`](../../catalogue/example-images/) and [`catalogue/example-images.ts`](../../catalogue/example-images.ts)                                                                                                         |
| Visual grammar, postures, and local review                    | [`visual-review.md`](visual-review.md), [`catalogue/review-postures.ts`](../../catalogue/review-postures.ts), [`catalogue/review/`](../../catalogue/review/), and [`responsive-ownership.ts`](../../catalogue/review/responsive-ownership.ts) |
| Token and terminal-foundation explorers                       | [`routes/foundations.ts`](../../catalogue/routes/foundations.ts) and [`terminal-foundations.ts`](../../catalogue/terminal-foundations.ts)                                                                                                     |
| Illustrative Compositions and terminal layouts                | [`compositions.tsx`](../../catalogue/compositions.tsx) and [`cli-compositions.ts`](../../catalogue/cli-compositions.ts)                                                                                                                       |
| Browser conformance and family enrolment                      | [`scripts/conformance.ts`](../../scripts/conformance.ts) and [`scripts/conformance/catalogue/`](../../scripts/conformance/catalogue/)                                                                                                         |
