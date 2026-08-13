# ADR 0007: Separate terminal rendering and control capabilities

**Status**: accepted

## Context

The CLI package originally inferred three different terminal properties as though they were one: Unicode character repertoire, ANSI colour styling, and ANSI cursor control. That collapsed common embedded-agent terminals into ASCII because they report `TERM=dumb`, even when their UTF-8 locale and output surface render the package's triangle glyphs correctly. The same assumption let the inline frame painter attempt to replace frames taller than the viewport. Once the top of such a frame had entered scrollback, cursor-up controls could reach only its visible tail, so each animation tick stranded another partial frame.

Pure renderers need character and colour facts. Effectful interaction additionally needs to know whether cursor movement is safe and whether a complete frame remains addressable. None of those facts implies another.

## Decision

`TerminalCapabilities` carries Unicode repertoire, colour depth, and optional ANSI-control support as independent facts. `detectTerminalCapabilities()` recognises `C.UTF-8` and `C.utf8` as Unicode locales, including redirected output, retains exact `C` and `POSIX` as ASCII, suppresses colour for `NO_COLOR` and `TERM=dumb`, and suppresses cursor control for non-TTY and `TERM=dumb` output without suppressing Unicode.

`InlineFramePainter.replace()` returns a typed result. It paints only when ANSI control is available and both the current and replacement frames fit wholly within the current viewport. Otherwise it returns a refusal with the reason and frame measurements, writes nothing, and preserves its current-frame state. Interactive package drivers consume that refusal by ending live repaint and emitting subsequent states statically. A consumer that constructs `TerminalCapabilities` without the new optional field retains the previous ANSI-control assumption; detector-produced capabilities always state it explicitly.

The painter does not crop a frame, guess how many rows remain addressable, erase scrollback, or silently append an allegedly live frame. Product consumers may instead choose their own compact static presentation after a refusal.

## Consequences

UTF-8 `TERM=dumb` environments and UTF-8 redirected output retain Unicode geometry without receiving colour or cursor escapes. Oversized and resize-invalidated frames cannot multiply through scrollback. Callers can distinguish a repeated unchanged frame from a painted frame and can respond to an exact refusal rather than duplicate viewport-fit arithmetic.

The capability field is optional for source compatibility, so manually constructed legacy capability objects continue to opt into the prior control assumption. Consumers that know cursor control is unavailable must set it to `false`, and process-aware callers should prefer the detector. Static prompt fallback can produce more output than an in-place frame, but it remains truthful and scrollable instead of corrupting terminal history.

## Alternatives considered

Treating every `TERM=dumb` environment as ASCII was rejected because `TERM` describes terminal control behaviour, not the locale's character repertoire. Cropping inside the generic painter was rejected because the painter cannot decide which product information is expendable. Clamping cursor movement to viewport height was the original failure mechanism, not a safe degradation.
