# ADR 0009: Fit prompt frames through Component renderers

**Status**: accepted

## Context

Interactive choice and textarea machines accepted requested row counts, then handed frames directly to the inline painter. A grouped 16-row list could need additional rows for its label, group headings, borders, query control, hint, or lifecycle footer. When that complete frame exceeded the terminal, the painter correctly refused it under [ADR-0007](0007-separate-terminal-rendering-and-control-capabilities.md), but the prompt driver could only append static frames. A resize could strand an old tall frame and make later prompts appear to inherit a smaller viewport.

Duplicating every Component renderer's fixed row geometry in its prompt machine would make the interaction layer a second presentation authority. Cropping in the painter would force a generic cursor-safety primitive to decide which labels, controls, or messages are expendable.

## Decision

The shared prompt driver fits every frame through its real Component renderer before asking the painter to replace it. On every paint, it reads the current `TerminalIO.size().rows`, offers the prompt machine a provisional maximum for its variable control rows, renders the whole frame, and reduces that maximum until the rendered label, borders, controls, headings, query, hint, and footer fit together.

Choice `visibleCount` and textarea `rows` are requested upper bounds. Fitting a short frame never mutates the request or becomes a later prompt's default. Selection, query, editor, and logical cursor state remain machine-owned while only the visible window changes. A terminal that cannot hold the minimum coherent frame is refused before a partial prompt is written.

`InlineFramePainter` remains the cursor-safety authority. A downward resize that makes the previous live frame unreachable ends that region and starts a new fitted live region; unavailable ANSI control still uses truthful static frames. No prompt or renderer reads process state beneath `TerminalIO`.

## Consequences

Current and future Component-backed prompts share one viewport-budget authority, and grouped structure or new footer geometry enrolls through actual rendering rather than copied arithmetic. Tall terminals can use the caller's full requested list or editor height; short terminals keep the active choice or textarea cursor visible in a bounded window; repeated prompts recompute from the real terminal instead of progressively surrendering rows.

Fitting may render a frame more than once when space is tight. Prompt frame renderers therefore remain pure and cheap, and machines must interpret the offered control-row maximum rather than ignore it. A resize can leave the old region in scrollback before the compact live region starts, because reaching above the new viewport would be unsafe.

## Alternatives considered

Per-prompt fixed-row subtraction was rejected because it duplicates Component geometry and misses grouped headings or future lifecycle rows. Painter-level cropping was rejected because the painter has no semantic basis for choosing content to remove. Persisting the last fitted height was rejected because a temporary short viewport would silently redefine later prompts.
