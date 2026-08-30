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

## 🔴 Performance & correctness

_Verified defects and correctness risks. Nothing outstanding._

## 🟠 Cleanup — known dead or slow code

_Dead code, N+1s, and known-slow paths worth removing or fixing. Nothing outstanding._

## 🟡 Smaller fixes & polish

- [ ] **Builder: design named local drafts as part of one wider file-management strategy.** Decide the complete ownership model before adding a draft picker: multiple named local documents, create/rename/duplicate/delete/recent/open flows, autosave identity, Import/Download JSON versus browser file handles, storage limits/migration, recovery and conflict semantics, and how a future project/remote store could replace rather than fork the local authority. Keep the current single guarded autosave during the Builder UX programme instead of bolting names onto one local-storage key. Evidence: `map/_private/planning/builder-ux/README.md`; `catalogue/builder/persistence.ts`; `map/60-catalogue/interface-builder.md`.
- [ ] **Builder: shared-module extraction only covers `src/components/`.** Variant unions and object interfaces in shared modules under `src/components/` (e.g. `layout/space.ts`) now reach the builder, but a union living elsewhere (e.g. `src/tokens/tokens.ts`) still would not. Extend `SHARED` discovery in `scripts/build.ts` `discoverComponents` if a prop ever references one. Evidence: scripts/build.ts sharedModules filter.
- [ ] **Typed sequential-form step constructors that carry `previous` automatically.** A step's prior value arrives only as the untyped `previous` argument to `step.run`; seeding it into the request's initial value is manual wiring each step author must remember, so Ctrl+U back-navigation silently discards typed work whenever it's forgotten. Add per-kind step constructors (text, selection, …) that thread `previous` into the initial value and give it a real type, keeping the general closure form as the escape hatch. Evidence: `src/cli/interactive/sequential-form.ts:118-129`; `tests/cli/interactive_requests_test.ts:175-179` (the manual pattern).

## 🟢 Test & tooling hygiene

_Nothing outstanding._

## 🔵 Unmerged / at-risk work — decide: land or drop

_Work built but not merged, or otherwise at risk of being lost. Nothing outstanding._

## ⚪ Explorations / ideas (unscheduled)

- [ ] **Chart: interactive behaviours are deferred by decision, not omission.** The shipped Chart surface is strictly static — SVG, React output, and terminal frames carry no tooltips, zooming, or hover states — because the `behavior_script` standard's ceiling cannot fit chart interactivity. Revisiting that ceiling is an owner decision that precedes any interactive chart work. Evidence: `discern.toml` `[standards.behavior_script]`; `map/_adr/0030-own-charts-as-a-quantitative-kind-family.md` (static-first).
- [ ] **Chart: a diverging colour ramp has no authority yet.** The categorical series tokens (`--discern-color-series-1..6`) and the accent-ramp sequential convention are the only chart colour families; a diverging encoding (two hues around a meaningful midpoint) needs its own authored ramp with the same CVD/ANSI proofs before any kind can use one. Evidence: `src/tokens/tokens.ts` (series tokens); `tests/chart/palette_test.ts` (the proof machinery to extend).
- [ ] **Bar: design the diverging variant for signed values.** The bar kind enforces a zero baseline and refuses negative values with `chart/negative-value`; the refusal names a deferred diverging variant (mirrored bars around a shared zero line with a stated axis treatment). Design it as its own grammar decision — not a degenerate upward bar — when signed data has a real corpus case. Evidence: `src/chart/kinds/bar/bar.validation.ts` (negative-value refusal); `map/_adr/0030-own-charts-as-a-quantitative-kind-family.md`.
- [ ] **Chart: the `waterfall` kind stays deferred by programme decision.** Signed add/remove netting is the only waterfall-shaped corpus material and the taxonomy note judges it thin; the kind joins the library only through a contract change with fresh corpus evidence, not by quiet addition. Evidence: `map/_private/planning/dataviz-system/taxonomy-evidence.md` (signed netting bullet); `map/_private/planning/dataviz-system/README.md` (deferral row).
- [ ] **Sparkline: inline Markdown-prose sparklines stay deferred by programme decision.** The Sparkline Component is block-context only on both surfaces; an inline terminal grammar inside Markdown prose is a separate contract with its own wrapping and measurement questions. Evidence: `src/components/display/sparkline/sparkline.meta.ts` (block-context notWhen); `map/_private/planning/dataviz-system/README.md` (deferral row).

- [ ] **Support alternate wide-A terminal geometry repo-wide.** Add a caller-declared `ambiguousWidth: 1 | 2` capability rather than guessing from locale; thread it through every measurement, wrap, truncate, padding, layout, projection, cursor, and interaction path; choose coherent package-motif fallbacks under wide-A; and future-enrol every rendered Component plus interactive and Markdown-browser frame under both policies. Treat CJK line breaking and IME behaviour as separately scoped requirements rather than calling this width switch “full CJK support.” Evidence: `src/cli/capabilities.ts:15-31`; `src/cli/text.ts:38-49`; `src/cli/interactive/editor.ts:157-165`; `src/cli/interactive/markdown-browser-renderer.ts:628-635`.
- [ ] **A caller-declared non-interactive posture for requests.** Every request refuses on a non-TTY handle, so each consumer rebuilds the same fallback chain (a flag equivalent per question, `--yes` vetoes). Offer a runtime-declared alternative: resolve with the caller-supplied default, still run validation, and throw a typed rejection on failure — the caller supplies the non-interactive fact; the package never reads the environment. Evidence: `src/cli/interactive/lifecycle.ts:26-28`; the consumer chain at discern's `src/lib/terminal_interaction.ts:111-127`.
- [ ] **A numeric request kind.** Bounded numeric input (minimum/maximum/step, arrow-key stepping, built-in range checks composing with caller validation) has no request kind; `requestText` plus a validator is the only route. Add it when a consumer surface needs one. Evidence: `src/cli/interactive-states.ts` (no numeric frame state).
