# ADR 0015: Sense terminal background as a caller-driven effect

**Status**: accepted

## Context

The package derives light and dark terminal themes from the same Token metadata ([`theme.ts`](../../src/cli/theme.ts)), yet shipped no way to learn which ground a terminal actually presents. Consumers hardcoded dark, leaving the light theme unreachable in practice for light-terminal users.

The terminal's real background is knowable, but only effectfully. Emulators answer the OSC 11 palette query with their actual background colour — a write to the terminal and a read of its reply, which requires raw mode (a canonical-mode reply would echo to the screen and sit unreadable in the line buffer) and may simply never come: multiplexers and older emulators drop the query. Some environments export a `COLORFGBG` hint instead. Neither is a pure fact like `TERM`; both are I/O with failure modes. Capability detection (ADR-0007) set the pattern for facts the caller supplies; this decision extends the boundary to a fact only the terminal itself can supply.

## Decision

Background sensing is an effect of the optional `./cli/interactive` Adapter, never of the pure rendering graph. `senseTerminalBackground` takes the `TerminalIO` and an environment snapshot from the caller — it reads nothing ambiently — and returns a typed reading: a ground of `light`, `dark`, or `unknown`, plus the evidence used (`terminal-report` with the raw payload and its 8-bit sRGB reduction, `environment-hint` with the raw `COLORFGBG` value, or `none` with a typed reason).

The query round-trip is the module's entire terminal footprint. It runs only on an interactive terminal whose `ansiControl` capability permits control bytes, inside the signal-safe raw bracket with cursor hiding disabled, and is bounded by a strict timeout (250 ms by default, caller-tunable) — long enough for a remote terminal's round trip, short enough that a silent terminal costs one imperceptible pause at startup. Reply bytes are scanned at the byte level: input that arrived around the report, and a reply still pending at the deadline, are parked through the shared read broker for the next consumer, so sensing can never swallow a person's keystrokes or race a later reader.

When the query cannot answer — no TTY pair is refused inertly; no ANSI control skips the query; a timeout, end-of-input, or unrecognised payload exhausts it — the `COLORFGBG` hint is judged by its final segment: ANSI backgrounds 0–6 and 8 read dark, 7 and 15 read light, anything else stays unknown. `unknown` is a first-class answer, not an error: a consumer maps `light` and `dark` to the derived `terminalThemes` variants and chooses its own default for `unknown`. The package never selects a theme on the caller's behalf.

A reported colour splits at relative luminance 0.179 — the flip point where black text overtakes white text in WCAG contrast — because "which text colour belongs on this ground" is precisely the light-versus-dark question a theme choice answers.

## Consequences

A consumer can finally show light-terminal users the light theme the package always had, with one call and an honest three-way answer. The evidence field keeps verdicts auditable — a wrong guess names the payload or hint that produced it — and the fake terminal proves all four outcomes deterministically: a responding terminal, a silent one falling back to the hint, the hint alone, and inert non-TTY handles.

Sensing costs its timeout exactly once on terminals that never reply, and any bytes it consumed while waiting are re-parked rather than lost. Because selection stays with the caller, two consumers may answer `unknown` differently — that divergence is deliberate; a package default would silently overrule product judgment.

The hint table and reply grammar are conservative: bright backgrounds 9–14 and non-XParseColor payloads stay unknown rather than guessed. Terminals that answer with unusual but truthful forms fall back accordingly; widening the grammar is cheap and evidence-driven later.

## Alternatives considered

Deriving the ground from `TERM`/`COLORTERM` guesses nothing real — those name capabilities, not palettes. An ambient `Deno.env`/stdin default inside the function would break the Adapter's no-ambient-reads rule and make the effect untestable; the caller-supplied snapshot mirrors `detectTerminalCapabilities` exactly. Returning a binary light/dark with a heuristic default would hide failure inside a confident answer — the flagship consumer's hardcoded dark is exactly that failure, promoted to the package. Auto-selecting a `terminalThemes` variant was rejected because themes move Tokens, and which ground wins on `unknown` is a product decision, not a palette fact.
