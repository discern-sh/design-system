# ADR 0003: Adapt terminal interaction behind frame states

**Status**: accepted

## Context

The design system needs an optional interactive terminal Adapter while keeping `./cli` a deterministic renderer graph. A proven experiment already exists in the `discern` repository (`/Users/jack/Sites/discern` in the reference checkout), branch `recovered/terminal-playground`, principally in `src/experimental/prompts.ts`, `src/experimental/terminal_ui.ts`, and `tests/playground_prompts_test.ts`. It demonstrates raw-mode cleanup, buffered input, Unicode editing, inline repainting, the required prompt set, conditional forms, animation, and a fake terminal. Its `experiments/terminal-playground-gaps.md` also draws an explicit boundary around behavior it does not attempt.

The experiment predates this package's stricter TypeScript contract and the landed CLI foundation. It owns an ANSI palette, terminal width logic, box geometry, spinner glyphs, and progress arithmetic that are now authoritative in Token-derived CLI modules. It also lives behind a hidden product command and couples state transitions directly to presentation. Copying it would create second authorities and prevent Wave 3 from replacing temporary prompt frames with Component renderers.

## Decision

`./cli/interactive` adapts the experiment's behavior rather than porting its source. It keeps the injectable terminal boundary, exception-safe raw-mode and cursor lifecycle, buffered escape decoding, grapheme editing, common Emacs keys, inline frame replacement, prompt semantics, conditional form steps, Ctrl+U back-navigation, fake-terminal testing, and exact-frame intent.

Every prompt machine produces the frame-state types established in `src/cli/interactive-states.ts`. One temporary pure module, `src/cli/interactive/frame-renderers.ts`, converts those states to strings through one function per prompt type and an exhaustive dispatcher. It delegates colours, spacing, boxes, width measurement, triangle phases, spinner glyphs, progress percentage, and progress fill to the landed CLI foundation. Wave 3 replaces that module at one seam; terminal I/O, decoding, editing, and state transitions do not change.

The Adapter has no new runtime dependency and no dependency on the `discern` product repository. It drops the hidden playground command, the experiment's private palette and geometry, its braille spinner, its block progress bar, and the unimplemented prompt/display/platform gaps named by the experiment. Those gaps do not silently become design-system commitments. The optional activity-beacon prompt remains outside this Adapter; only the existing sequential-frame beacon field can be rendered when a caller supplies it.

## Consequences

Consumers opt into Deno terminal effects only through `./cli/interactive`; `./cli` remains pure and both graphs remain React-free. Tests can exercise every exit path without a real terminal, while the Deno implementation uses the same interface as the fake. Masked values never enter frame state, spinner time advances in the driver, and determinate completion remains semantic rather than pre-rendered.

The public Adapter API and its cancellation signal become package contract. The temporary renderer seam intentionally duplicates some composition that later Component renderers own, so it is isolated in one file and tracked for removal. Behavior added later to the source experiment does not flow automatically into this package; it must be judged against the package's own foundations and gap boundary.

## Alternatives considered

A direct source port preserved line-level provenance but also preserved duplicate palettes, geometry, animation, loose typing, and the hidden-command shape. A clean rewrite without the experiment discarded already-proven lifecycle and interaction behavior. Wiring directly to the Wave 2 Component renderers coupled parallel workstreams that share only frame-state contracts. A runtime import from the `discern` repository reversed package ownership and denied consumers a stable design-system authority.
