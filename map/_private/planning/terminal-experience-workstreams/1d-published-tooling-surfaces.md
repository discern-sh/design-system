# 1D — Publish the testing and projection surfaces

**Goal:** Consumers can test their interactive flows against the real machinery with a published fake terminal, and can project any captured terminal output into structured spans and HTML — because the package ships its own instruments instead of keeping them private.

**Wave:** 1 — runs alongside 1A, 1B, and 1C, which own disjoint files. Lands last in the wave.

## Orient first

Work in `/Users/jack/Sites/discern-design-system`. Run `discern_status` and read the compiled `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/70-cli/README.md`, ADRs 0004 and 0011, and `tests/release_test.ts` (the publish-contract guards you will extend). If status records an existing worktree for this exact effort, continue there and pass its path to every discern tool; do not call `discern_start` again. Otherwise, from the main checkout run `discern_start` with the literal name `terminal-1d` and re-root into the returned worktree before reading code.

Verify anchors against the live tree; they were checked on trunk `c3ec5d6`.

## Background

Two quality instruments already exist in this repository but are unpublishable:

1. **The fake terminal.** `tests/cli/fake-terminal.ts:17-60` is a queue-backed `TerminalIO` capturing writes and raw-mode transitions, driving the *real* driver, painter, and renderers. It is excluded from the publish allowlist (`deno.json:15-23`), so every consumer must rebuild it — and the flagship consumer's own review checklist explicitly hunts "tests that invoke a fake adapter instead of production" as an anti-pattern. The injectable `TerminalIO` seam (`src/cli/interactive/io.ts`) exists precisely so a published fake is possible.
2. **The projection.** `styleguide/cli-preview.tsx` decodes the package's emitted SGR subset into browser spans for the catalogue's Web/CLI switch. That decode logic is the bridge that lets rendered terminal output be *reviewed as a visual artifact* — by humans and by agents — yet it lives unexported inside the styleguide.

Publishing both turns "test the real path" and "look at what the terminal actually shows" from private privileges into consumer contract. The consumer programme's screenshot-loop brief depends on the projection surface.

## Deliverables

Work in atomic commits, one logical step each.

1. **A published testing entrypoint.** Add `./cli/interactive/testing` to both manifests, exporting: the fake terminal (queue-backed reads, scriptable `size()` including mid-interaction resizes, captured writes and raw transitions); key-scripting helpers so a test enqueues named keys and text naturally; and assertion helpers for ANSI-stripped frame content. Promote the implementation out of `tests/` into the published tree as the single authority — the package's own tests consume the published module thereafter (delete the private copy; no drift-prone duplicate).
2. **A published projection entrypoint.** Add `./cli/projection`, exporting a pure decode of package-emitted output — SGR styling and, once 1B lands, hyperlink envelopes — into typed spans (text, style attributes, link target), plus a renderer from those spans to self-contained HTML. Hoist the logic from `styleguide/cli-preview.tsx`; the styleguide then consumes the published module (one authority, no copy). Document the supported input contract honestly: this projects the package's own emitted repertoire, not arbitrary terminal byte streams.
3. **Guard the expanded contract.** Both new graphs must never resolve React or perform I/O on import; extend `tests/release_test.ts` accordingly and include both entrypoints in the publish-shaped neutral-consumer run. Every exported symbol documented. Update the publish allowlist deliberately — nothing else from `tests/` leaks.
4. **Record the decision.** Write an ADR: the package publishes its testing and projection instruments; why (consumers must be able to test the production path and review rendered output), the support boundary (these surfaces follow SemVer like everything else), and the one-authority consequence (internal tests and styleguide consume the published modules).
5. **Prove and enrol.** The package's own interactive tests run against the published fake unchanged in behaviour; projection round-trip tests cover every colour depth, ASCII/Unicode, and (post-1B) hyperlinks; catalogue browser output is byte-identical before and after the hoist. Any new `./cli/interactive` runtime export maps to a playground journey or a recorded exclusion (`tests/cli/playground_test.ts` enforces this).
6. **Document.** `map/70-cli/README.md` gains both surfaces; CHANGELOG entries under **Unreleased**; no version bumps.

## Constraints

- The testing entrypoint ships real machinery seams, not simulations: scripted keys flow through the real decoder, driver, machines, and renderers.
- Projection is pure and total over its documented input contract; undecodable input has a defined, tested behaviour (reject or pass through — choose, document, test).
- Vocabulary per ADR-0011; public names are permanent JSR contract.
- `CHANGELOG.md` and `deno.json` are shared seams with siblings: edit them in your final commits, immediately after `discern_update`.
- Never hand-edit generated files. Iterate with `discern_prepare`; commit each logical step.

## Out of scope

- A PTY harness or process spawning (consumer territory; this package stays process-free).
- Projecting arbitrary non-package terminal streams (document the boundary instead).
- Consumer adoption, and the sibling wave-1 slices (1A, 1B, 1C).

## Definition of done

- Measurable: both entrypoints resolve from a publish-shaped external consumer without React; internal tests and styleguide consume them with no duplicated authority; release tests cover the new graphs; the ADR is recorded; `discern_done` passes on the clean committed HEAD.
- Semantic: a consumer can write a test that drives a real interaction with scripted keys and assert on what a person would actually see, and can turn any captured package output into an HTML view a reviewer — human or agent — can look at.
- Housekeeping: in the final task commit, move this brief to `map/_private/planning/terminal-experience-workstreams/_done/1d-published-tooling-surfaces.md`. Run `discern_done` on the clean committed HEAD, then `discern_accept`: a recorded grant may land it; without one, report the proof line and stop. Other wave-1 streams are in flight — you own 1D only; do not launch, dispatch, or supervise the sibling briefs.
