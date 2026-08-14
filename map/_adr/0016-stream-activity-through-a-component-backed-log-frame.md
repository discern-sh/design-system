# ADR 0016: Stream activity through a component-backed log frame

**Status**: accepted

## Context

Consumers running minutes-long work need one truthful frame that keeps stable results visible while detail streams: pinned lines above a bounded scrolling tail, an in-place partial line, and a headline naming the work. The flagship consumer's gate records this need verbatim — a live progress table _or_ streamed lines today, never both. The package owns every ingredient — the refusal-typed painter (ADR-0007), renderer-measured fitting (ADR-0009), the activity scheduler as the only time-advancing layer, and the signal-safe bracket (ADR-0014) — but no frame composes them, and no producer API feeds one.

Two shapes could carry the frame. The activity layer could grow the presentation directly, as the spinner grew from the triangle primitive. Or the frame could be a real Component with the fixed anatomy, rendered like Meter renders determinate progress, with a new activity driver composing it. ADR-0004's temporary-dispatcher history is the cautionary tale: a presentation authority living beside the Component renderers had to be deleted once, and must not be rebuilt.

Streamed subprocess output is also untrusted display text. The styled-text authorities accept only package-emitted sequences, and the projection module deliberately refuses foreign bytes, so the frame cannot simply re-emit a subprocess's ANSI.

## Decision

The live activity log is a Workflow Component, `activity-log`, with the full fixed anatomy and a rendered CLI stance. `ActivityLogFrameState` joins `interactive-states.ts` beside the other interaction frames: a headline label with a spinner phase, pinned stable lines each carrying a narration tone (`success`, `note`, `warning`, `failure`), the recent committed tail lines, an optional partial line, and an exact `tailRows` count. The CLI renderer is the one presentation authority: the headline uses the triangle spinner authority, stable lines render through the narration verbs, and the tail renders behind a muted rail with indentation-preserving wrapping hoisted into the shared text authorities. The activity driver composes that renderer; it never draws beside it.

`withActivityLog` in `./cli/interactive` is the producer API: a typed controller with `append` (commit a streamed line), `updatePartial` (replace the in-progress line), `pin` (a stable line with tone), `relabel` (the headline), and `finish` with a declared completion — keep the stable summary, or collapse to a single toned result line. The caller owns its subprocesses and hands the package only text. Streamed text is sanitised, never trusted: foreign ANSI is stripped, carriage returns keep their final visible segment, tabs expand, and remaining control and format characters are removed. Caller-authored text (labels, pinned lines, hints) stays under the existing throwing validation.

Geometry is renderer-measured and fixed: the tail region is the variable budget the viewport fitter reduces first, its rows are reserved even while empty, the footer row is reserved unconditionally, and the partial line occupies exactly one truncated row. Repaints are tick-driven through the injectable activity scheduler — producer events coalesce to the next tick; nothing else advances time. Resize follows the stranded-frame contract; SIGINT rides the ADR-0014 bracket and paints the stable summary before restoration.

Unlike the spinner and progress wrappers, `withActivityLog` never refuses a non-interactive terminal. Non-TTY, missing ANSI control, and painter refusals all degrade to the same truthful append-only feed: the headline as a lead line, each committed line once behind the rail, each stable line as a narration line when pinned, no partial churn, and an uncommitted partial flushed at finish. This degraded mode is a first-class contract — CI and agent readers live in it — so one producer drives both presentations.

One live frame per terminal at a time remains the Adapter's contract; the log inherits it and adds no multiplexing.

## Consequences

The frame enrols everywhere Components enrol — catalogue, browser preview, generated registries, exact-frame conformance — with no manual registration, and future visual changes land in one renderer. The interaction layer stays free of presentation arithmetic: the driver maps the fitter's offer to `tailRows` and measures nothing itself.

A producer writes one feed and gets an honest presentation on every terminal, but the two modes differ deliberately: live scrollback ends with the declared completion while append-only scrollback retains every committed line — the windowed tail is a viewing contract, not a recorder. Committed lines beyond the requested tail window are dropped from the live buffer, so memory stays bounded.

Sanitising foreign ANSI means a subprocess's own colours do not survive into the frame; the visible text does. Rare multi-byte escape forms outside the CSI/OSC grammar may leave a residue character — the package remains a renderer, not a terminal emulator.

The non-TTY posture diverges from `withSpinner` and `withDeterminateProgress`, which throw. That asymmetry is the point of this frame — streaming work must degrade rather than refuse — and a future decision may extend the same posture to the other wrappers.

## Alternatives considered

Rendering the frame inside the activity layer as string composition repeats the temporary-dispatcher mistake ADR-0004 deleted: a second presentation authority beside the Component renderers. Extending an existing Component was rejected because none holds this shape — Worklog is a status feed without a streaming tail, Raw output is a static disclosure, and Terminal is display chrome; forcing any of them would muddle a shipped contract. Emitting committed lines above the live frame into scrollback (the flagship's sketched clear-emit-redraw loop) was rejected because it interleaves live-region control sequences with scrollback writes — exactly the corruption class the painter's refusal semantics exist to prevent. Re-emitting subprocess ANSI was rejected because the styled authorities accept only package-emitted sequences; widening them to arbitrary terminal bytes would make every frame a terminal-emulation problem.
