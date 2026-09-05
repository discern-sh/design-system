# Open work — discern-design-system

The **deferred-work ledger**: the agent-maintained record of outstanding work — verified defects, deferred fixes, known dead code, and at-risk or unmerged work. The map at `map/` describes what _currently exists_; this file tracks what's _still owed_.

## For agents (any agent — and the maintainer)

- **When you defer something, descope, or find a real issue you won't fix this round, record it here.** Don't bury it in a private memory, a one-off chat reply, or a lone code comment — those are invisible to the next agent and to the maintainer. This file is the shared backlog.
- **Format:** one checkbox per item — a bold title, a one-line description, and `Evidence:` with `file:line` where it applies. Add an area tag if it helps. Keep entries terse and factual; link code with relative paths.
- **When you finish an item, delete its line** — the commit that resolves it is the record. Don't leave ticked boxes lying around.
- **Scope:** this file is for work that _outlives a single session_. For tracking the steps of the task you're doing right now, use your own in-session task tooling, not this file.
- This is a backlog, not documentation — modal verbs ("should", "could") are fine here, unlike in the map. Don't write that something was "finished this round" — that's meaningless to a future reader ("which round?"). Every item must be pickup-able at any later time with no session-specific context required.

---

## 📚 Documentation — finish the seeded map

`discern setup` lays the map at `map/` as a skeleton: `00-orientation/` and the numbered subsystem subtrees (`10-…` onward) ship as stubs, still to be written from the code. Filling them is the one piece of work a fresh project starts out owing.

- [ ] **Document each numbered doc subtree.** Use the `discern-document-subsystem` skill — one run per subsystem — to write that subtree's `README.md` and its leaves from the real code, replacing the placeholder stubs setup laid. Delete each subtree's line as you fill it, and delete this whole section once the tree is complete.
  - [ ] `map/10-tokens-themes/` — Tokens, Theme roles, the Preset, foundations
  - [ ] `map/20-components/` — Component anatomy, Groups, Owned Classes
  - [ ] `map/30-codegen/` — generate.ts and the generated surfaces
  - [ ] `map/40-runtime-emitter/` — the Emitter, Selections, the Manifest
  - [ ] `map/50-react-adapter/` — the Adapter and static rendering
  - [ ] `map/60-catalogue/` — the styleguide app, build.ts, serve.ts

---

<!--
  The severity buckets below start empty by design — beyond the documentation
  item above, a fresh project owes nothing yet. Add items under the heading that
  fits; create a new bucket only if none do. Suggested order is most-urgent first.
-->

## 🟠 Cleanup — known dead or slow code

- [ ] **Capture readiness counts painted frames instead of converging, so stale entries cannot safely capture concurrently.** Four concurrent pages cut a full migration from about 157s to 65s, but renderer cadence changed prepared Tooltip geometry: `tooltip--default` returned a different region and `tooltip--bottom` moved 774 pixels. `settleCapture` waits two `requestAnimationFrame` callbacks after each step, so an interaction can still be measured mid-settle. Replace the frame count with a fixed-point protocol — prepare, measure, settle, measure again, and require the rectangle to repeat — then prove exact region stability across the full population before adding concurrency. Raster-byte identity is deliberately not a requirement under ADR 0041. Evidence: `catalogue/example-images/capture.tsx` (`paintedFrames`, `settleCapture`); `scripts/component-example-images.ts` (`withCapturePage`); `src/components/feedback/tooltip/tooltip.examples.tsx`.

## 🟡 Smaller fixes & polish

- [ ] **`ownedClasses` omits emitted classes that have no CSS rule.** Ownership derives from each stylesheet's selectors, so a class the React adapter emits without a rule — `discern-button__label`, the `discern-heading`, `discern-tabs`, and `discern-glossary-term` roots, `discern-activity-log__label`, and about twenty more across 21 Components — is absent from `manifest.json`, and a consumer may style it without breaking the documented contract until a later rule collides. Decide whether emitted-but-unstyled classes are contract (derive ownership from the adapter markup as well as the CSS, with a guard that every literal `discern-<slug>` class an adapter emits is owned) or dead markup to remove. Evidence: `scripts/generate.ts` (`componentOwnedClassNames` reads CSS only); `src/components/workflow/activity-log/activity-log.tsx:74`; `src/components/core/button/button.tsx` (`discern-button__label`).
- [ ] **Q1 — Copy affordances render inert in static consumer output.** Command, Path reference, Diagnostic, and Result summary compose CopyButton, whose clipboard write lives in a React onClick handler that renderToStaticMarkup drops. Make the documented static consumer route deliver functional, exact copy with truthful success/failure feedback through the selected runtime, preserving no-hydration and selection boundaries. Evidence: [copy-button.tsx:47](../src/components/docs/copy-button/copy-button.tsx); [component behaviour opt-ins](../src/types/component-meta.ts). Active brief: [Q1](../map/_private/planning/design-polish/1b-static-copy-contract.md).
- [ ] **Audit the remaining Catalogue controls for public-Component dogfooding.** The Catalogue still authors 98 raw buttons, 17 raw inputs, and 23 details elements after Select and navigation moved to public Components. Migrate ordinary actions and fields first (shell menu/search/close, directory/reset controls, Compare actions, review filters), then record explicit exceptions or missing public contracts for segmented surface controls, terminal capability controls, drawer/search triggers, and other composites; do not blanket-replace native semantics. Evidence: `catalogue/**/*.tsx`; `tests/catalogue_component_dogfooding_test.tsx`; public Core, Forms, and Docs Components under `src/components/`.
- [ ] **Builder: shared-module extraction only covers `src/components/`.** Variant unions and object interfaces in shared modules under `src/components/` (e.g. `layout/space.ts`) now reach the builder, but a union living elsewhere (e.g. `src/tokens/tokens.ts`) still would not. Extend `SHARED` discovery in `scripts/build.ts` `discoverComponents` if a prop ever references one. Evidence: scripts/build.ts sharedModules filter.
- [ ] **O5 — Typed sequential-form step constructors that carry `previous` automatically.** A step's prior value arrives only as the untyped `previous` argument to `step.run`; seeding it into the request's initial value is manual wiring each step author must remember, so Ctrl+U back-navigation silently discards typed work whenever it's forgotten. Add per-kind step constructors (text, selection, …) that thread `previous` into the initial value and give it a real type, keeping the general closure form as the escape hatch. Evidence: `src/cli/interactive/sequential-form.ts:118-129`; `tests/cli/interactive_requests_test.ts:175-179` (the manual pattern). Active brief: [O5](../map/_private/planning/design-polish/2p-terminal-capabilities-and-guided-flows.md).

## 🟢 Test & tooling hygiene

_Nothing outstanding._

## 🔵 Unmerged / at-risk work — decide: land or drop

_Work built but not merged, or otherwise at risk of being lost. Nothing outstanding._

## 🟣 Programmes — dispatch from the planning tree

- [ ] **Dispatch the selected design-polish workstreams.** Choose ready briefs from the [programme index](../map/_private/planning/design-polish/README.md); each names only its actual prerequisites and lands independently under a worktree grant. The index assigns all approved items, including public Segmented control and Progress; the deferred proposals remain in this ledger. Evidence: [implementation briefs](../map/_private/planning/design-polish/README.md).

- [ ] **Release the appearance, then dispatch monochrome-field 4A.** Waves 0A to 3B, the field-appearance programme, and the appearance model of ADR 0045 have all landed; only 4A remains and it runs in the discern repository against a published release. Next: cut the release (breaking for the sibling site, which pins 0.29.0 and selects the removed `theme: "discern"`), write the version into the 4A brief's prerequisite line, then dispatch `map/_private/planning/monochrome-field/4a-site-adoption-and-homepage.md`. Delete this line when 4A lands. Evidence: `map/_adr/0040-derive-the-theme-from-a-monochrome-field.md`; `map/_adr/0045-name-the-model-appearance-and-tint-the-pigments.md`.

## Design polish — deferred follow-up

The owner selected these proposals for later work. Their IDs refer to the [design-polish programme](../map/_private/planning/design-polish/README.md); none is part of an active implementation brief. These are requested improvements, not a claim that every area is currently defective.

- [ ] **R2 — Add a public Disclosure.** Promote a small, accessible native-details contract with useful summary, expanded state, focus, and content rhythm; migrate repeated Catalogue disclosures only after deciding its public browser/CLI stance. Evidence: [catalogue/pages/components/component-preview.tsx:398](../catalogue/pages/components/component-preview.tsx); [src/components/feedback/dialog/dialog.meta.ts:11](../src/components/feedback/dialog/dialog.meta.ts).

- [ ] **R4 — Design signed/diverging chart encodings.** Use representative signed data to design a diverging Bar grammar around a meaningful zero/midpoint and an authored two-sided colour ramp. The current bar validator refuses negative values with chart/negative-value; categorical series and the sequential ramp do not supply a diverging authority. Preserve explicit scale/axis semantics and extend the existing colour-vision, ANSI, and deterministic proofs before adding the contract. Evidence: [src/chart/kinds/bar/bar.validation.ts:35](../src/chart/kinds/bar/bar.validation.ts); [src/tokens/tokens.ts:344](../src/tokens/tokens.ts); [tests/chart/palette_test.ts:200](../tests/chart/palette_test.ts).

- [ ] **R5 — Design the Builder's complete document-management model.** Plan named local documents, create/rename/duplicate/delete/recent/open, autosave identity, JSON import/export versus browser file handles, storage limits/migration, recovery/conflicts, and a replaceable future project/remote store as one model. Keep the guarded single autosave until that strategy is ready; avoid attaching a picker to an underspecified storage key. Evidence: [catalogue/builder/persistence.ts](../catalogue/builder/persistence.ts); [map/60-catalogue/interface-builder.md](../map/60-catalogue/interface-builder.md); [map/_private/planning/builder-ux/README.md](../map/_private/planning/builder-ux/README.md).

- [ ] **C3 — Distinguish read-only and disabled fields.** Give values that may be inspected/copied but not edited a deliberate read-only treatment distinct from unavailable disabled controls, with correct focus, selection, and form semantics. Evidence: [src/components/forms/input/input.tsx](../src/components/forms/input/input.tsx); [src/components/forms/input/input.css:20](../src/components/forms/input/input.css).

- [ ] **C5 — Review a complete form journey.** Provide a realistic generic entry→validation→correction→submission→success journey with keyboard-only operation, retained values, useful errors, and clear final state; use it to judge the composed experience beyond isolated field examples. Evidence: [src/components/forms/field/field.examples.tsx](../src/components/forms/field/field.examples.tsx); [catalogue/builder/discovery/templates.ts](../catalogue/builder/discovery/templates.ts).

- [ ] **D1 — Polish long and short-viewport dialogs.** Keep a long dialog title, close control, and primary action understandable and reachable while the body scrolls, including short screens, enlarged text, focus containment, and focus restoration. Evidence: [src/components/feedback/dialog/dialog.tsx](../src/components/feedback/dialog/dialog.tsx); [src/components/feedback/dialog/dialog.css](../src/components/feedback/dialog/dialog.css).

- [ ] **D2 — Make toast persistence fit interaction.** Pause timed dismissal during relevant hover/focus/interaction and give long messages or action-bearing toasts an appropriate persistence policy, with predictable dismissal and accessible announcements. Evidence: [src/components/feedback/toast/toast.tsx:45](../src/components/feedback/toast/toast.tsx).

- [ ] **E1 — Improve numeric table alignment.** Support and demonstrate multiple numeric columns with tabular figures, aligned units/decimals where meaningful, and clear totals; do not assume only the final column is numeric. Evidence: [src/components/display/table/table.css:51](../src/components/display/table/table.css); [src/components/display/table/table.tsx](../src/components/display/table/table.tsx).

- [ ] **E2 — Preserve table context while scrolling.** Design optional sticky headings and identity columns with an intentional overflow container, visible keyboard focus, readable intersections, and sensible behaviour on narrow screens. Evidence: [src/components/display/table/table.css](../src/components/display/table/table.css); [src/components/display/table/table.examples.tsx](../src/components/display/table/table.examples.tsx).

- [ ] **F5 — Polish article printing.** Provide a clean print treatment for long articles, code, figures, references, and headings, with useful page-break behaviour and screen-only chrome removed without losing content. Evidence: [src/components/editorial/prose/prose.css](../src/components/editorial/prose/prose.css); [src/components/editorial/article-layout/article-layout.css](../src/components/editorial/article-layout/article-layout.css).

- [ ] **H4 — Control artwork focal placement and text safety.** Make artwork intensity, focal positioning, and text-safe space work across responsive compositions while keeping bespoke imagery and product claims with consumers. Evidence: [src/components/artwork/](../src/components/artwork/); [src/components/marketing/hero-block/hero-block.examples.tsx](../src/components/marketing/hero-block/hero-block.examples.tsx).

- [ ] **I1 — Demonstrate complete data figures.** Compose charts with a useful title, units, legend, caption, and source through DataFigure so the quantitative story is understandable without surrounding explanation. Evidence: [src/components/editorial/data-figure/data-figure.tsx](../src/components/editorial/data-figure/data-figure.tsx); [src/components/editorial/chart/chart.examples.tsx](../src/components/editorial/chart/chart.examples.tsx).

- [ ] **I3 — Give Stat and Sparkline sufficient context.** Show period, unit, comparison basis, and change interpretation beside compact metrics and movement; preserve the distinction between local sparkline shape and a comparable quantitative scale. Evidence: [src/components/display/stat/stat.examples.tsx](../src/components/display/stat/stat.examples.tsx); [src/components/display/sparkline/sparkline.examples.tsx](../src/components/display/sparkline/sparkline.examples.tsx).

- [ ] **I4 — Expose useful chart data-table alternatives.** Make the existing underlying data and summaries discoverable in suitable chart examples, with accessible table representation and a clear relationship to the graphic; reuse the lossless description/data authority. Evidence: [src/chart/accessibility.ts](../src/chart/accessibility.ts); [src/chart/markdown.ts](../src/chart/markdown.ts); [src/components/editorial/chart/chart.examples.tsx](../src/components/editorial/chart/chart.examples.tsx).

- [ ] **J4 — Help authors choose neighbouring components.** Add concise comparison guidance and links for commonly confused choices such as Banner/Callout/Toast and Card/ArtifactCard, derived from the components' useWhen/notWhen metadata rather than a competing advice inventory. Evidence: [src/types/component-meta.ts:98](../src/types/component-meta.ts); [catalogue/pages/components/component-preview.tsx](../catalogue/pages/components/component-preview.tsx).

- [ ] **L2 — Compare multiple instances of one component.** Separate comparison instance identity from component slug so variants, examples, or widths of the same component can sit side by side with stable URLs and independent controls. Evidence: [catalogue/pages/compare/state.ts](../catalogue/pages/compare/state.ts); [catalogue/pages/compare/page.tsx:57](../catalogue/pages/compare/page.tsx).

- [ ] **L3 — Synchronize comparison width and Appearance.** Extend the existing global/per-item surface model with shared width and Appearance controls plus explicit individual overrides and predictable reset semantics. Evidence: [catalogue/pages/compare/state.ts](../catalogue/pages/compare/state.ts); [catalogue/pages/compare/page.tsx](../catalogue/pages/compare/page.tsx).

- [ ] **L4 — Add a specimen-focused comparison mode.** Let comparison hide repeated descriptions and supporting controls so the selected specimens receive most of the space, while preserving accessible identification and a clear way back. Evidence: [catalogue/pages/compare/page.tsx](../catalogue/pages/compare/page.tsx); [catalogue/styles/compare.css](../catalogue/styles/compare.css).

- [ ] **L5 — Save named local comparison sets.** Build named local sets on the existing reproducible comparison URL state, with straightforward open/rename/delete, safe storage fallback, and no second comparison-state authority. Evidence: [catalogue/pages/compare/state.ts](../catalogue/pages/compare/state.ts).

- [ ] **M2 — Keep Appearance controls stable during extreme previews.** Allow specimen-only Appearance adjustment so extreme axes can be judged without making the surrounding control interface difficult to use; make scope and reset unmistakable. Evidence: [catalogue/shell/appearance.tsx](../catalogue/shell/appearance.tsx); [catalogue/pages/foundations/appearance-page.tsx](../catalogue/pages/foundations/appearance-page.tsx).

- [ ] **M5 — Show the visible effect of token changes.** Connect token inspection to representative consuming components using source-derived relationships, so an author can see which visual roles change without maintaining a separate dependency map. Evidence: [src/tokens/tokens.ts](../src/tokens/tokens.ts); [scripts/generate.ts](../scripts/generate.ts); [catalogue/pages/foundations/page.tsx](../catalogue/pages/foundations/page.tsx).

- [ ] **N4 — Collect a coherent glyph set for use.** Let authors gather several public glyph names and copy a coherent usage/fallback example while preserving each alias's actual browser/terminal capabilities. Evidence: [catalogue/pages/glyphs/workbench.tsx](../catalogue/pages/glyphs/workbench.tsx); [src/glyphs/mod.ts](../src/glyphs/mod.ts).

- [ ] **N5 — Make the full glyph workbench state shareable.** Round-trip label, font, specimen size, character repertoire, and other meaningful workbench controls through validated URL state instead of sharing only the selected alias. Evidence: [catalogue/pages/glyphs/workbench.tsx](../catalogue/pages/glyphs/workbench.tsx); [catalogue/pages/glyphs/state.ts](../catalogue/pages/glyphs/state.ts).

- [ ] **O4 — Clarify plain-text versus ANSI copy.** Offer clearly named copy actions that distinguish visible plain text from escape-containing terminal output, with exact content and truthful availability/feedback. Evidence: [catalogue/terminal-layout-inspector.tsx](../catalogue/terminal-layout-inspector.tsx); [src/cli/projection.ts](../src/cli/projection.ts).

- [ ] **P4 — Reduce the Catalogue's initial JavaScript payload.** Measure the current cold-load payload and interaction readiness, then split heavy route/example loading where measurements justify it; preserve searchable metadata, stable URLs, and a fast first useful result. Evidence: [scripts/build.ts](../scripts/build.ts); [catalogue/app.tsx](../catalogue/app.tsx); [catalogue/pages/components/index-page.tsx](../catalogue/pages/components/index-page.tsx).

- [ ] **Q2 — Make interaction requirements explicit.** Explain which component interactions come from native static HTML, selected package scripts, or consumer-supplied control logic, and surface those requirements consistently in metadata, adoption examples, and the Catalogue. Evidence: [src/types/component-meta.ts:59](../src/types/component-meta.ts); [src/components/docs/copy-button/copy-button.meta.ts](../src/components/docs/copy-button/copy-button.meta.ts); [map/50-react-adapter/README.md](../map/50-react-adapter/README.md).

- [ ] **Q3 — Pair before/after visual review.** Extend the existing review instrument with consistent paired evidence across the same examples, widths, and Appearance settings; use images for judgment while keeping structural and accessibility guards authoritative. Evidence: [catalogue/review/](../catalogue/review/); [map/60-catalogue/visual-review.md](../map/60-catalogue/visual-review.md).

- [ ] **Q4 — Expand adversarial visual and interaction coverage.** Extend the existing harness for long labels, fallback fonts, zoom/reflow, RTL, crowded targets, and sticky/overflow focus. Enrol future applicable components automatically and guard real behaviour rather than screenshot pixels alone. Evidence: [scripts/conformance/catalogue/components.ts](../scripts/conformance/catalogue/components.ts); [catalogue/review/responsive-ownership.ts](../catalogue/review/responsive-ownership.ts); [tests/browser_polish_contract_test.ts](../tests/browser_polish_contract_test.ts).

- [ ] **Q5 — Evaluate real adoption journeys.** Observe representative find→copy→adapt journeys and keyboard/touch use in a real consumer context, recording where people hesitate or need undocumented wiring; prioritize resulting improvements from that evidence. Evidence: [skills/use-discern-design-system/SKILL.md](../skills/use-discern-design-system/SKILL.md); [catalogue/pages/components/detail-page.tsx](../catalogue/pages/components/detail-page.tsx); [catalogue/builder/export.ts](../catalogue/builder/export.ts).

## ⚪ Explorations / ideas (unscheduled)

- [ ] **Decide how consumers receive the `use-discern-design-system` skill.** The review copy lives under `skills/`; it is not in the JSR publish set, and discern does not bundle it. Options: publish it in the package artifact, have the discern product bundle it for every discern project, or document a link-and-copy route in the README. Evidence: `skills/use-discern-design-system/SKILL.md`; `deno.json` `publish.include`; `README.md` (Component Metadata and author guide).

- [ ] **Chart: interactive behaviours are deferred by decision, not omission.** The shipped Chart surface is strictly static — SVG, React output, and terminal frames carry no tooltips, zooming, or hover states — because the `behavior_script` standard's ceiling cannot fit chart interactivity. Revisiting that ceiling is an owner decision that precedes any interactive chart work. Evidence: `discern.toml` `[standards.behavior_script]`; `map/_adr/0030-own-charts-as-a-quantitative-kind-family.md` (static-first).
- [ ] **Chart: the `waterfall` kind stays deferred by programme decision.** Signed add/remove netting is the only waterfall-shaped corpus material and the taxonomy note judges it thin; the kind joins the library only through a contract change with fresh corpus evidence, not by quiet addition. Evidence: `map/_private/planning/dataviz-system/taxonomy-evidence.md` (signed netting bullet); `map/_private/planning/dataviz-system/README.md` (deferral row).
- [ ] **Sparkline: inline Markdown-prose sparklines stay deferred by programme decision.** The Sparkline Component is block-context only on both surfaces; an inline terminal grammar inside Markdown prose is a separate contract with its own wrapping and measurement questions. Evidence: `src/components/display/sparkline/sparkline.meta.ts` (block-context notWhen); `map/_private/planning/dataviz-system/README.md` (deferral row).

- [ ] **Support alternate wide-A terminal geometry repo-wide.** Add a caller-declared `ambiguousWidth: 1 | 2` capability rather than guessing from locale; thread it through every measurement, wrap, truncate, padding, layout, projection, cursor, and interaction path; choose coherent package-motif fallbacks under wide-A; and future-enrol every rendered Component plus interactive and Markdown-browser frame under both policies. Treat CJK line breaking and IME behaviour as separately scoped requirements rather than calling this width switch “full CJK support.” Evidence: `src/cli/capabilities.ts:15-31`; `src/cli/text.ts:38-49`; `src/cli/interactive/editor.ts:157-165`; `src/cli/interactive/markdown-browser-renderer.ts:628-635`.
- [ ] **A caller-declared non-interactive posture for requests.** Every request refuses on a non-TTY handle, so each consumer rebuilds the same fallback chain (a flag equivalent per question, `--yes` vetoes). Offer a runtime-declared alternative: resolve with the caller-supplied default, still run validation, and throw a typed rejection on failure — the caller supplies the non-interactive fact; the package never reads the environment. Evidence: `src/cli/interactive/lifecycle.ts:26-28`; the consumer chain at discern's `src/lib/terminal_interaction.ts:111-127`.
- [ ] **A numeric request kind.** Bounded numeric input (minimum/maximum/step, arrow-key stepping, built-in range checks composing with caller validation) has no request kind; `requestText` plus a validator is the only route. Add it when a consumer surface needs one. Evidence: `src/cli/interactive-states.ts` (no numeric frame state).
