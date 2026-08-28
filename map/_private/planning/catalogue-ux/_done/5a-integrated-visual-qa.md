# 5A — Run the integrated visual and interaction hardening pass

**Goal:** Inspect the complete landed Catalogue with human eyes across routes, themes, widths, keyboard, and shareable states; cure cross-page inconsistencies; adopt the shared overflow cue where it materially helps; and leave real-browser guards plus an accurate Catalogue map.

**Wave:** 5. This is the final implementation and convergence stream. Start only after all five wave-4 streams have landed.

You own `5A` only. Do not relaunch completed streams. Read-only audit sub-agents may inspect disjoint route families if available, but one coordinating agent must personally reproduce every reported issue, own all edits, reconcile cross-page judgments, run the browser, and pass the final gate.

## Orient, verify the complete baseline, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify all of these markers are on `main`:

- `_done/1a-catalogue-architecture-and-shell.md`;
- `_done/2a-cross-surface-example-contract.md`;
- `_done/3a-deterministic-component-example-images.md`;
- `_done/4a-component-discovery-and-comparison.md`;
- `_done/4b-foundations-explorer.md`;
- `_done/4c-composition-gallery.md`;
- `_done/4d-overflow-cue-and-terminal-layouts.md`;
- `_done/4e-catalogue-front-doors.md`.

Verify behaviourally that `OverflowCue` is public, Web/CLI example identity is canonical, generated imagery covers every canonical Web example, universal search serves global and family projections, and every route family has its new index/detail structure. If any prerequisite is absent or only the marker landed, stop and report it.

Call `discern_start` with the literal name **`catalogue-5a`**, re-root all operations into the returned absolute `data.path`, and pass it to every discern tool.

After re-rooting, read `AGENTS.md`, the programme README and all completed briefs, `map/60-catalogue/README.md`, the current route descriptor authority, universal search and Appearance authorities, generated example-image manifest/resolver and capture contract, shared shell/card/preview modules and styles, `scripts/conformance.ts` plus every family-owned browser-check module, Catalogue integration tests, and the `OverflowCue` contract. Use the `browser:control-in-app-browser` skill for the visual audit and `discern-cure-a-bug` for every defect you fix.

## Background

The preceding streams deliberately split ownership. That makes parallel work safe, but it also creates a final risk: five individually coherent page families can still disagree in rhythm, labels, control placement, URL conventions, card affordance, or narrow behaviour. This pass exists to judge the whole experience, not trust branch summaries.

The Catalogue's defining quality bar is perceptual. A human should navigate by recognition and intuition, see the specimen before the explanation, and never need to decode internal conventions. Passing tests is necessary but cannot substitute for looking at the pages.

This is a hardening pass, not an invitation to reopen every design decision. Preserve the page-family architecture and agreed product contracts. Fix observed high-leverage inconsistencies and guard them.

## Deliverables

### 1. Launch once and audit the complete route matrix

Run `deno task serve` on this worktree's deterministic `discern identity --port` and leave it running throughout review. Open the exact localhost URL in the in-app browser.

Inspect at minimum:

- `/` and `/catalogue/`;
- Components default, Group, purpose, all, query, empty, and representative detail routes (simple, multi-example, CLI-exempt, Forms lifecycle, wide/dense, Chart/Diagram/Markdown);
- Compare bare, Group, purpose, custom, and complete-system scopes;
- Foundations index, every Token category/filter posture, and every terminal-foundation sheet;
- Compositions index and every pattern detail;
- Terminal layouts index and every recipe detail at presets and custom capabilities;
- a not-found Catalogue route and upgraded legacy fragment routes.

For each meaningful route, check desktop (~1440 px), narrow phone (~390 px), light, and dark. Add targeted tablet, forced-colours, reduced-motion, and no-JavaScript/static-fallback checks where the contract is relevant. Do not open or test the Interface Builder.

Maintain a concise audit table while working: route/state, observed issue, authority, fix, and regression guard. Do not commit a historical issue log; use it to drive present-tense code/tests and discard it before finishing unless the programme needs an owner decision.

### 2. Judge and normalise the cross-page experience

Fix inconsistencies that are visible only when routes are compared:

- canonical navigation names/order and active-state language;
- page-header scale, maximum measure, section rhythm, canvas boundaries, card affordance, labelled counts, `+N more`, previous/next, and back navigation;
- exact action verbs for View, Find, Compare, Copy, Open source, Reset, and Change appearance;
- index versus detail density and the visual priority of specimens/swatches/frames over explanations;
- sidebar/local-navigation depth so it helps rather than becoming another exhaustive inventory;
- empty/loading/unavailable states and surface exception language;
- one `h1`, sensible Group/Component hierarchy, landmarks, target visibility, and focus order;
- URL parameter names/default omission/back-forward behaviour across page families;
- consistent close/reset semantics and control placement.
- search semantics across global, Components, Foundations, Compositions, and Terminal providers: the same intent, alias, ranking, and match-reason vocabulary must feel coherent even where each UI owns different filters;
- generated Component imagery: correct canonical example, active theme, crop, intrinsic sizing, loading/failure posture, and visual usefulness at card scale without live-mounting index populations;
- Appearance placement and state: settle whether accent remains exposed, moved, or hidden, and leave the reusable control/state boundary coherent for later Builder consumption.

Prefer fixing a shared authority when several pages drift. Do not force page-specific content into one generic mega-component merely to make it look identical.

### 3. Apply OverflowCue where the integrated pages prove a need

Audit all horizontally or vertically scrollable human-facing regions: Component/CLI previews, prop tables, Token evidence, Composition/Terminal source, Terminal frames, and wide landing examples.

- Use the public `OverflowCue` wherever content genuinely continues beyond a clipped/scroll boundary and the cue materially improves discovery.
- Remove any page-local fade/mask imitation now superseded by the Component.
- Do not wrap every `overflow: auto` mechanically. Native scrollbars may already be conspicuous, and a cue on trivial overflow adds noise.
- Check scroll start/middle/end, block/inline, RTL, touch/trackpad, keyboard, themes, forced colours, resize, and no-overflow after adoption.
- Preserve local containment and prove there is no document-level horizontal scroll.

If the public Component cannot serve a legitimate landed case, cure its general contract and tests in its own source rather than adding an escape hatch in Catalogue CSS. Record an ADR only if the change alters the public boundary significantly.

### 4. Exercise the human journeys end to end

Use keyboard and pointer to complete these journeys without reading hidden instructions:

1. Land at `/`, choose Find a Component, filter, open a result, switch its named example from Web to CLI, copy/open source, move to the next Component, then return.
2. Browse a purpose, compare it, set all previews to CLI, override one Component, reset overrides, create a custom selection, copy the URL, reload, and use the jump list.
3. Find a colour or typography Token through global search, copy the right fact, change Appearance, and return with Back.
4. Open an illustrative Composition, change width, follow a constituent Component, return, and inspect adaptable source without mistaking it for exported API.
5. Open a Terminal layout, choose a preset, make a custom capability posture, scroll to overflow edges, copy raw output separately from source, reload the URL, and return to the index.
6. On a narrow screen, use SkipLink, mobile drawer, global search, Appearance, deep navigation, and all local overflow without moving the document sideways.

During journeys 1–3, repeat representative intent queries across global and local search—include “call to action” for CTA Band—and confirm the same matching authority produces understandable ranking and reasons. In Component discovery, inspect generated representative imagery in both themes and compare a sample against its live selected example.

Fix any point where the next action depends on scrutinising a label, remembering an undocumented convention, or guessing whether a control changes the page, specimen, theme, or source.

### 5. Strengthen real-browser and structural guards

Refine the bounded `scripts/conformance.ts` orchestrator, family-owned browser checks, and focused integration tests so the gate protects the agreed experience without hard-coding screenshots as the sole oracle.

Cover:

- canonical route projections and bounded index/detail mounting;
- shell skip link, drawer modal behaviour, search close/recovery/match reason, Appearance, Back/Forward, and focus restoration;
- universal search provider enrolment, alias/ranking consistency, and one-source match reasons across global and family projections;
- generated image manifest coverage, active-theme resolution, representative selection, intrinsic sizing, and bounded index mounting;
- Component canonical example preservation and Compare global/custom controls;
- Token/Composition/Terminal URL state and future-member enrolment;
- OverflowCue state at real edges in each adopted class of container;
- one `h1`, heading/landmark integrity, keyboard reachability, axe in both themes, forced-colour focus, reduced motion, and narrow document containment;
- root landing exact-emission/selection and front-door navigation;
- performance-sensitive assertions that index pages do not mount every specimen and exhaustive modes remain explicit.

Use screenshots as review evidence where helpful, but guard semantic geometry and interactions with assertions. Delete obsolete source-string tests and redundant checks rather than layering another test over them. Do not weaken the full conformance population or skip existing gate stages.

### 6. Update present-tense project knowledge

Rewrite `map/60-catalogue/README.md` to describe the final current route structure, human navigation model, canonical example and generated-image authorities, universal search contract, reusable Appearance boundary, illustrative Composition status, Token and Terminal explorers, Compare workspace, URL-state contract, `OverflowCue` usage, and where browser conformance lives.

Link code authorities instead of copying mechanically derivable route/example inventories. Remove statements made false by the redesign. Do not write a change log into the map.

If the audit produces a real deferred decision beyond the explicitly skipped muted-metadata pass, record it in the project's canonical TODO surface with enough context for a later session; do not hide it in the final chat summary.

### 7. Perform a final adversarial pass

After fixes and before the gate, browse the entire matrix again from a clean reload and ask:

- Can I recognise where to go before reading descriptions?
- Does the page show the thing before explaining the thing?
- Is every exhaustive or technical surface deliberate and secondary?
- Do Web and CLI feel like two projections of one example, not different catalogues?
- Is any visible copy written for an implementation agent rather than a person?
- Can every consequential review state be copied as a URL?
- Does one intent query mean the same thing everywhere, and can I recognise image-backed results before reading descriptions?
- Is any cue, border, badge, disclosure, or paragraph repeating a fact already visible?

Remove unnecessary visual noise found by this pass. Do **not** respond by globally darkening muted text or enlarging tiny metadata; that pass remains deferred.

## Constraints

- Preserve the landed route-family modules and their ownership. Cross-page fixes belong in shared authorities only when genuinely shared.
- The Catalogue remains a catalogue, not an instruction manual. Supporting material is progressive disclosure.
- Do not change Component examples, Token values, Composition status, or terminal geometry unless a proven integration defect requires curing the authority.
- Use only the public `OverflowCue`; no new bespoke fades.
- No Interface Builder browsing, redesign, or dedicated tests. Do not weaken the full gate if existing conformance includes it.
- No global muted-copy/tiny-metadata prominence pass.
- Never hand-edit generated files.
- Commit fixes atomically by defect class; keep the final map/tests commit reviewable.

## Out of scope

- New Component families beyond curing `OverflowCue` if its shipped contract cannot serve an agreed case.
- Interface Builder work.
- Package release/version bump.
- Wholesale visual rebranding, Token retuning, or typography changes.
- New Catalogue features not required by the programme acceptance matrix.
- The separately deferred muted explanatory text/tiny metadata pass.

## Definition of done

- Every major route/state in the audit matrix has been personally inspected in the in-app browser at relevant widths/themes, with no Interface Builder testing.
- All six end-to-end human journeys complete by keyboard and pointer without hidden conventions, broken Back/Forward, lost URL state, or document-level overflow.
- Canonical navigation, page rhythm, cards/counts/actions, index/detail density, headings, unavailable states, and source/copy semantics are coherent across page families.
- Global and local searches consume one matching/alias/ranking/match-reason authority, including the agreed intent-query witnesses, and no family-specific matcher remains.
- Generated Component imagery is complete, theme-correct, well-cropped, useful at discovery scale, and never substitutes for the live detail specimen or bloats the published package.
- Appearance is calm and coherent, with a reusable state/control contract ready for the separate Builder programme; the accent range is moved or hidden if the integrated browser evidence supports that choice.
- `OverflowCue` is used selectively wherever it materially reveals continuing content; no bespoke fades remain and every adoption works at actual start/middle/end edges.
- Real-browser guards cover shell, examples/Compare, each explorer family, overflow, accessibility, reduced motion/forced colours, narrow containment, front-door emission, and bounded mounting.
- `map/60-catalogue/README.md` accurately describes the final present system and links its authorities.
- The final adversarial pass finds no implementation-language leakage, duplicated directory, accidentally expanded guidance, or avoidable visual noise.
- The muted-metadata pass remains untouched, and no Interface Builder or release work appears in the diff.
- Leave `deno task serve` running and report the exact Catalogue base URL plus a compact set of representative deep links for owner review.
- After the last edit run `discern_prepare`, commit every rewrite/fix/map change in focused commits, then run `discern_done` on clean committed HEAD. Fix every diagnostic without loosening tests or standards.
- Once green, run `discern_accept`. A recorded grant may land; otherwise it must refuse without mutation, after which report the proof line and `catalogue-5a` branch/worktree and stop for owner review.
- In the final commit, move this brief from `map/_private/planning/catalogue-ux/5a-integrated-visual-qa.md` to `map/_private/planning/catalogue-ux/_done/5a-integrated-visual-qa.md` (create `_done/` if needed).
