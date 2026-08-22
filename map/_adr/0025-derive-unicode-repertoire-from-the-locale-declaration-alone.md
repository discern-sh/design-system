# ADR 0025: Derive Unicode repertoire from the locale declaration alone

**Status**: accepted

## Context

[ADR-0007](0007-separate-terminal-rendering-and-control-capabilities.md) separated Unicode repertoire, colour depth, and cursor control into independent capability facts, on the argument that `TERM` describes control behaviour rather than the locale's character repertoire. Its detection kept one residue of the old conflation: when the environment declared no locale at all — or declared a locale outside the recognised UTF-8 and `C`/`POSIX` forms — `detectTerminalCapabilities()` fell back to terminal attachment, granting Unicode to TTYs and ASCII to redirected output.

That fallback misclassified the population ADR-0007 set out to serve. Agent harnesses commonly spawn shells with no `LANG`, `LC_ALL`, or `LC_CTYPE` and pipe stdout, so an embedded agent running a consumer's CLI received the ASCII repertoire even though its harness decodes UTF-8 without difficulty — the runtime writes UTF-8 bytes regardless of attachment, and every mainstream consumer of piped output has decoded UTF-8 for years. Meanwhile a TTY that explicitly declared a legacy charset (`en_US.ISO8859-1`) received Unicode it had declared it could not decode. Attachment was standing in for a fact it does not carry.

## Decision

`supportsUnicode()` consults the effective locale declaration and nothing else; terminal attachment no longer participates in repertoire detection.

- **No locale declared** — Unicode. An undeclared locale on a UTF-8-writing runtime is overwhelmingly a UTF-8 consumer; degradation must be opted into, not inferred from a pipe.
- **Exact `C` or `POSIX`** — ASCII, as before.
- **A declared UTF-8 charset** (`en_GB.UTF-8`, `C.UTF-8`, `C.utf8`, with or without `@modifier`) — Unicode, as before.
- **A declared non-UTF-8 charset** (`en_US.ISO8859-1`, `ja_JP.eucJP`) — ASCII, even on a TTY. An explicit legacy declaration is the one trustworthy signal that UTF-8 bytes would mojibake.
- **A bare language tag with no charset** (`en_GB`) — Unicode; modern platforms resolve these to UTF-8.

ADR-0007's remaining decisions — the three-way capability separation, colour and cursor-control detection, and the painter's typed refusal contract — remain in force through this record unchanged; only its repertoire fallback is revised.

## Consequences

Redirected and locale-less environments — agent harnesses foremost — now receive the same Unicode geometry an interactive UTF-8 terminal does, and a TTY that declares a legacy charset stops receiving glyphs it disclaimed. Repertoire, colour, and control are now each derived from their own evidence, completing the separation ADR-0007 began.

The cost is borne by any consumer that pipes output into a genuinely ASCII-only sink without declaring it: that environment must now export `LC_ALL=C` (or any non-UTF-8 charset) to opt out, where previously the pipe itself degraded the output. That trade is accepted deliberately — an explicit declaration is cheap, while the silent degradation punished the common case to protect a vanishing one.

## Alternatives considered

Changing only the undeclared-locale branch and keeping attachment as the fallback for unrecognised declared locales was rejected: it would leave the exact conflation ADR-0007 argues against alive in one branch, and a declared `ISO8859-1` TTY would keep receiving bytes it cannot decode. Sniffing the platform (e.g. treating Darwin and modern Linux as UTF-8) was rejected because detection is a pure function of caller-supplied facts and must stay portable and testable without process reads.
