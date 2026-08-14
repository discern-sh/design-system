# ADR 0012: Deliver lone Escape through a reader timing window

**Status**: accepted

## Context

Terminals encode both the Escape key and every escape sequence with the same first byte. The incremental decoder therefore retained a bare `\x1b` between reads indefinitely, waiting for continuation bytes that would complete an arrow, paging, or function sequence — which meant the Escape key itself was only ever delivered at end-of-input. Binding Escape to cancel a request requires deciding, at some point, that no continuation is coming.

The byte stream carries no such signal. Every terminal application that binds Escape resolves the ambiguity with time: vim's `ttimeoutlen`, tmux's `escape-time`, readline's `keyseq-timeout`. The alternative — treating any bare `\x1b` as Escape immediately — misreads every split escape sequence, and the decoder's incremental split-sequence guarantee is load-bearing: reads may split a CSI sequence at any byte.

A second ambiguity sits beside the first: terminals with a meta modifier send Alt+key as `\x1b` followed by the printable key. Decoding that pair as an `escape` key plus literal text would make Alt+anything cancel a request and was already leaking literal characters into editors.

## Decision

The decoder stays pure and time-free; time enters only in `TerminalKeyReader`. While the decoder's buffer holds exactly one bare `\x1b`, the reader races the next terminal read against a short continuation window — 100ms by default, tunable through `TerminalKeyReaderOptions.escapeDelayMs`. Bytes arriving inside the window join the buffer and decode normally; an elapsed window calls the decoder's `flushLoneEscape`, which emits the `escape` key only when the buffer is exactly `\x1b` and never touches a longer fragment. Once a sequence introducer such as `\x1b[` is buffered, no timer applies: split sequences keep decoding incrementally no matter how late their remaining bytes arrive.

In the token stream, Escape followed by an unrecognised character becomes one non-printable unknown sequence — an Alt/meta chord machines ignore — while Escape before another possible escape prefix stays a lone `escape` key.

A read that the window leaves pending is parked per terminal and adopted by the next reader on the same terminal, so an interaction cancelled by Escape cannot strand a read that would steal the following interaction's first bytes.

## Consequences

Escape works as terminal users expect: the driver binds it to cancellation, and pressing it costs at most the window in latency. The trade-off every timeout mechanism accepts applies here: a sequence whose continuation bytes arrive later than the window after a bare Escape byte reads as Escape plus the remainder — on a link that slow, an arrow key can cancel a request. The default window balances perceived Escape latency against that risk; callers constructing their own reader can widen it for hostile links.

Key handling now has a time dimension at the reader, which future key work must respect: deterministic tests that feed a bare `\x1b` must either hold the terminal open and accept the window, tune `escapeDelayMs`, or deliver end-of-input, and any future binding that wants ESC-prefixed chords must register complete sequences with the decoder rather than expect `escape`-then-text pairs, which no longer exist. Alt/meta chords are silently ignored rather than inserting their trailing character — the conventional behaviour, but a change from the previous leak.

## Alternatives considered

Emitting Escape immediately on a bare `\x1b` breaks the incremental split-sequence guarantee outright. Applying the window to every incomplete prefix (not just the lone byte) would misread slow split CSI sequences as junk; restricting it to exactly `\x1b` preserves incremental decoding for every real sequence introducer. Waiting for end-of-input — the previous behaviour — makes an Escape binding unusable. Requiring a double-press of Escape avoids timing but matches no terminal convention and still leaves the first press ambiguous.
