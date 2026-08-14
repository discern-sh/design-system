# 1C — Give consumers a presenter and narration verbs

**Goal:** Rendering a component takes one bound call instead of three threaded facts, and the smallest output jobs — a success line, a warning, a note — are package one-liners, so the shortest path for a consumer (or an agent writing consumer code) is also the consistent one.

**Wave:** 1 — runs alongside 1A, 1B, and 1D, which own disjoint files. Lands third in the wave, after 1B.

## Orient first

Work in `/Users/jack/Sites/discern-design-system`. Run `discern_status` and read the compiled `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/70-cli/README.md`, and ADRs 0004 and 0011. If status records an existing worktree for this exact effort, continue there and pass its path to every discern tool; do not call `discern_start` again. Otherwise, from the main checkout run `discern_start` with the literal name `terminal-1c` and re-root into the returned worktree before reading code.

Verify anchors against the live tree; they were checked on trunk `c3ec5d6`.

## Background

Every renderer is `(props, capabilities) → string`, which keeps the foundation pure — but consumers pay for that purity at every call. The flagship consumer threads width into `props.width`, re-spreads `{ ...capabilities, columns: width }`, and passes `theme` at **29 capability-respread and 23 theme-respread call sites**, each feature growing its own local shim (read, don't edit: `/Users/jack/Sites/discern/src/commands/doctor.ts:1259`, `src/engine/status/tty.ts:213-218`, `src/engine/gate/gate_tty.ts:269-272`). And because the package offers components but no small verbs, the consumer's margins fall back to two duplicated narration surfaces and bare `console.log` — the copyable example for the next small verb is the ungoverned one.

The consumer's spacing rules add a third lesson: "exactly one blank line between semantic groups" is currently enforced by a lexical guard test and hand-written boundary bookkeeping in two places. Spacing should be a property of composition, not of author vigilance.

Purity does not require ceremony — partial application preserves it. This brief ships the bound presenter, the narration verbs, and a rhythm contract, all pure.

## Deliverables

Work in atomic commits, one logical step each.

1. **A bound presenter.** A constructor (working name `createCliPresenter`; choose the final name with care) takes `TerminalCapabilities` plus presentation defaults — theme variant, default frame width — once, and returns a presenter whose render call takes a renderer and its props and supplies everything else: `present(renderBadgeCli, { label })`. Explicit per-call overrides (a narrower width for one frame) must remain possible and obvious. The presenter is a pure value: construction reads nothing, holds no mutable state, and performs no I/O. Design the surface so a consumer holding one presenter never spreads capabilities or threads theme again.
2. **Narration verbs.** A small family of semantic one-line emitters — success, informational note, warning, failure, and a lead-in/heading form — rendered from the token bridge with the package's existing tone semantics and capability degradation (colour depths, `NO_COLOR`, ASCII markers that keep the meaning). They return strings (no I/O) and are available both standalone and from the presenter. Name them clear of the banned dialect and clear of existing component names; they are foundation vocabulary, not components. Keep the family deliberately small — these are the verbs for output too minor to deserve a component, not a second component system.
3. **A rhythm contract.** Define how composed blocks own their vertical boundaries so "exactly one blank line between groups" is mechanical: a pure composition helper that joins narration lines and component frames with normalised blank-line separation, plus a documented contract a consumer's write sink can implement (blocks declare their boundary; the sink accounts for trailing newlines already written). No I/O in the package half — the consumer implements the counting sink; the package defines the contract it counts against and the helper that makes composed output correct by construction.
4. **Prove and review.** Exact-string tests for every verb across depths, repertoires, and themes; presenter tests proving bound and overridden rendering byte-equal manual calls; composition tests proving the rhythm helper never emits doubled or missing blank lines across any block ordering. Give the new foundation APIs a reviewable surface: extend the CLI catalogue's foundation sheets (as the triangle motif sheet does) so the verbs are visually inspectable, and enrol anything the playground coverage test demands.
5. **Document and steer.** Update `map/70-cli/README.md` so the presenter is the documented default way to render, with the raw `(props, capabilities)` form positioned as the escape hatch. Document every public symbol. CHANGELOG entries under **Unreleased**; no version bumps.

## Constraints

- Purity is absolute: no environment reads, no I/O, no clock, anywhere in this brief's additions.
- Colour and spacing derive from the token bridge only; no literal ANSI or glyphs outside the existing authorities.
- Vocabulary per ADR-0011. New public names are permanent JSR contract — choose them as carefully as the request rename chose its own.
- `CHANGELOG.md` and `src/cli/mod.ts` are shared seams with 1B: edit them in your final commits, immediately after `discern_update`, keeping both streams' entries.
- Never hand-edit generated files. Iterate with `discern_prepare`; commit each logical step.

## Out of scope

- Consumer adoption (the consumer programme's wave 2B migrates the 29 call sites).
- Any I/O sink implementation — that is consumer territory by design.
- New components, interactive machines, or the published tooling entrypoints (1D).

## Definition of done

- Measurable: presenter, verbs, and rhythm helper are public, documented, tested to exact strings across capabilities, visible in the catalogue's foundation output, and `discern_done` passes on the clean committed HEAD.
- Semantic: the shortest correct code a consumer can write — one presenter at the top, one verb or one `present` call per output — is also the consistent, token-derived, degradation-safe code; nobody needs a wrapper module to make the package pleasant.
- Housekeeping: in the final task commit, move this brief to `map/_private/planning/terminal-experience-workstreams/_done/1c-presenter-and-narration.md`. Run `discern_done` on the clean committed HEAD, then `discern_accept`: a recorded grant may land it; without one, report the proof line and stop. Other wave-1 streams are in flight — you own 1C only; do not launch, dispatch, or supervise the sibling briefs.
