# 2B — Make long-running activity interrupt-safe; sense the terminal background

**Goal:** Interrupting a spinner or progress frame can never leave the terminal corrupted, determinate progress can name the unit of work it is on, and a consumer can ask — through the effects boundary — whether the terminal ground is light or dark instead of guessing.

**Wave:** 2 — runs alongside 2A, which owns disjoint files (discovery machines and frame states). Starts only after every wave-1 stream has landed. Lands second in the wave, after 2A.

## Orient first

Work in `/Users/jack/Sites/discern-design-system`. Run `discern_status` and read the compiled `AGENTS.md`, `map/70-cli/README.md`, and ADRs 0004, 0007, and 0011. If status records an existing worktree for this exact effort, continue there and pass its path to every discern tool; do not call `discern_start` again. Otherwise, from the main checkout run `discern_start` with the literal name `terminal-2b` and re-root into the returned worktree before reading code.

**Dependency guard:** verify on trunk that wave 1 landed (the driver carries the validation latch; `./cli/interactive/testing` resolves). If not, stop and report the missing landing.

## Background

Verified on trunk `c3ec5d6`:

1. **Ctrl+C during activity corrupts the terminal.** `withSpinner` (`src/cli/interactive/activity.ts:102-147`) hides the cursor via `withHiddenTerminalCursor` (`lifecycle.ts:34-61`) but never enters raw mode and installs no signal handling — no `Deno.addSignalListener` exists anywhere in `src/` (grepped: zero hits). A Ctrl+C therefore terminates the process with default disposition: the `finally` cleanup (`activity.ts:137-145`) never runs, the painted frame is stranded, **and the cursor is left hidden** — `\x1b[?25l` written and never balanced. `withDeterminateProgress` (`activity.ts:257-279`) shares the exposure. Requests are safe only because raw mode turns Ctrl+C into a key; an external `SIGINT` (`kill -INT`) during a request bypasses the restoration bracket the same way.
2. **Progress cannot name its work.** The determinate controller carries one label fixed at construction (`activity.ts:150-157`), while real consumers advance through named units — the flagship consumer's quality gate runs named jobs and formats named standards.
3. **The light theme is undiscoverable.** The package derives light *and* dark terminal themes from tokens (`src/cli/theme.ts`), yet ships no way to learn the terminal's actual ground. The flagship consumer consequently hardcodes dark (`/Users/jack/Sites/discern/src/lib/terminal.ts:329`, `src/main.ts:1125-1127` — read-only evidence; the light variant is unreachable in that product). Terminal emulators answer a standard palette query (OSC 11) with their real background colour, and some environments expose a foreground/background hint variable (`COLORFGBG`); neither is consulted anywhere in either repository (grepped: zero hits).

## Deliverables

Work in atomic commits, one logical step each.

1. **A signal-safe activity bracket.** For the duration of a spinner or determinate progress run, install a SIGINT listener that restores the cursor, clears or finishes the live frame truthfully, then re-raises (or invokes a caller-supplied cancellation path — design the option, document the default). Save and restore any pre-existing listener so nesting inside a host application never clobbers its handling. Extend the same protection to the raw-mode request lifecycle for externally delivered SIGINT, so `withRawTerminal`'s restoration guarantees hold under signals as well as exceptions. Make the signal source injectable so the fake terminal can drive it deterministically.
2. **Per-unit progress labels.** Let the determinate controller update its visible label as work advances (e.g. alongside `advance`/`set`), preserving truthful lifecycle (submitted only at genuine completion) and stable frame geometry. Exact frames cover label changes at every capability level.
3. **Background sensing at the effects boundary.** A new `./cli/interactive` module that determines the terminal ground: query the terminal's reported background colour with a strict timeout, fall back to the environment hint when the query cannot answer, and return a typed fact — light, dark, or unknown — plus the evidence used. No ambient reads: the caller supplies the `TerminalIO` and the environment snapshot, exactly as capability detection already works. The module never mutates terminal state beyond its query round-trip and is inert on non-TTY handles. Map the sensed fact to the existing theme variants in documentation; selection stays the caller's move.
4. **Record the decisions.** Two ADRs: the package's first signal use (scope, nesting guarantees, injectability); and background sensing at the effects boundary (why sensing is effectful and caller-driven, the timeout posture, why unknown is a first-class answer).
5. **Prove the class.** Fake-terminal tests: injected SIGINT mid-spinner restores the cursor and finishes the frame; nested pre-existing listener survives; progress relabelling frames; sensing under a responding terminal, a silent terminal (timeout → fallback), the hint variable alone, and non-TTY (inert). Playground journeys for interrupt behaviour and a sensing journey printing the typed verdict; degradation journeys still pass.
6. **Document.** `map/70-cli/README.md`; CHANGELOG under **Unreleased**; no version bumps.

## Constraints

- Effects stay behind `./cli/interactive`; pure renderers gain nothing effectful. Capability facts remain independent (ADR-0007).
- Signal handling must be bracketed — installed for the duration, restored after — never process-global for the package's lifetime.
- Vocabulary per ADR-0011. Never hand-edit generated files. Iterate with `discern_prepare`; commit each logical step.
- `CHANGELOG.md` and the interactive barrel are shared seams with 2A: edit them in your final commits, immediately after `discern_update`, keeping both entries.

## Out of scope

- The live activity log frame (3A) and any streaming-output composition.
- Consumer adoption of sensing or labels (the consumer programme's wave 3 does that).
- Resize signals (per-paint size reads already govern geometry; do not add a resize listener here).

## Definition of done

- Measurable: injected-signal tests prove cursor and frame restoration and listener preservation; relabelled progress has exact frames; sensing returns typed verdicts under all four proven conditions; both ADRs recorded; playground enrolment complete; `discern_done` passes on the clean committed HEAD.
- Semantic: a person can Ctrl+C any long-running frame and get their cursor and a coherent scrollback every time, watch progress name the unit it is on, and a consumer can finally show light-terminal users the light theme the package always had.
- Housekeeping: in the final task commit, move this brief to `map/_private/planning/terminal-experience-workstreams/_done/2b-activity-and-sensing.md`. Run `discern_done` on the clean committed HEAD, then `discern_accept`: a recorded grant may land it; without one, report the proof line and stop. 2A is in flight — you own 2B only; do not launch, dispatch, or supervise it.
