# ADR 0053: Applications paint incrementally and animate

**Status**: accepted

## Context

A persistent application repaints whenever its data, its selection, or its geometry changes. The package erased the whole display and rewrote every row on each change. That was correct and easy to capture, but each repaint cost a full screen of bytes, and on terminals that render as bytes arrive the erase showed as a flash. A screen that shows work in progress needs a moving glyph. A moving glyph repaints four times a second for as long as the work runs, so a full-screen repaint per frame multiplies both costs. The application also had no clock: nothing could repaint on time, and a test could only wait for real time to pass.

The testing entrypoint ([ADR-0046](0046-own-terminal-applications-through-bounded-regions.md)) extracted a settled frame by finding the last erase-and-home and reading exactly one viewport of rows after it. Any painter that writes less than a full screen breaks that extractor. Consumers drive end-to-end tests through it, and their readiness conditions matched prose in the frame. Prose changes with copy edits and wraps with geometry, so those conditions were brittle.

## Decision

**Every paint is one synchronized update.** The application writes each paint as a single write bracketed by DECSET 2026. Terminals that support synchronized output show the paint at once; others ignore the brackets.

**Between keyframes, only changed rows are written.** A row write positions the cursor absolutely at column one, erases the line, and writes the row. A keyframe erases the display, homes the cursor, and writes every row. The first paint in a terminal bracket, a new geometry, a new composition (a layer, or the region a single-region layout shows), and the first changed paint at least 30 seconds after the previous keyframe are keyframes. An unchanged frame writes nothing, so an idle screen is never repainted, even after 30 seconds. Every written row passes the complete-frame checks before anything is written. A failed write makes the next paint a keyframe. `TerminalPaintOptions` can turn off synchronization or row diffs; the Markdown browser paints whole and unsynchronized through the same painter.

**The painter and the replay share one grammar.** The paint grammar is a synchronized-update bracket, an optional state report, and then a keyframe, row writes, or nothing. The testing entrypoint replays exactly that grammar through a small screen model, from the last keyframe to the first restoration boundary, and rejects every other byte. A synchronized update still open at the end of a transcript is in flight, so the previous settled frame stands. `captureTerminalFrame` therefore still returns one exact settled frame. `ptySettledFrame` builds readiness conditions that replay the whole output, because a phase's own output usually holds only row writes. The replay is not a terminal emulator.

**State reports are opt-in test instruments.** With `TERMINAL_APPLICATION_STATE_REPORTS=1`, and only then, each paint opens with a private OSC sequence carrying a flat JSON summary of navigation identities. Terminals ignore it, and the capture returns it, so tests key on stable identities instead of prose. The shape is flat scalars, and readers ignore fields they do not know, so the package can report more without breaking consumers.

**Animation is a tick that runs only while a glyph moves.** A glyph moves when the caller marks it as a spinner, the output is Unicode, and motion is not reduced. Its cell then cycles through the bound motif's spinner at one shared phase. The runtime schedules one repaint 250 ms after each paint whose frame moves, so a slow paint delays the next frame instead of queueing ticks. The tick stops when nothing visible moves, below the minimum size, during foreground work, and on exit. ASCII shows a static fallback. Reduced motion shows the resting glyph and never ticks. The caller freezes a glyph by no longer marking it as a spinner. All timing goes through one injectable `TerminalClock`, which tests replace with `ManualTerminalClock`.

## Consequences

A spinner frame costs one row per visible spinner instead of a screen. On terminals with synchronized output, a keyframe appears without an intermediate blank screen. Row granularity still rewrites a whole row for a one-cell change; cell-level diffs would need column positioning, which the replay grammar deliberately excludes. A row write relies on its row being exactly the viewport's width, or the erase covering the rest, so the closed-row validation is load-bearing.

Transcripts change shape. Code that found paints by a leading erase, or that captured from a phase's output alone, has to migrate. The replay accepts only the package's own grammar, so a consumer that writes between paints must stop doing so or extend the grammar deliberately. Mid-session mode changes such as window titles or mouse toggles are not part of it yet.

State reports are inert by default but add bytes to every paint when enabled, so they belong in tests. Keyframes every 30 seconds bound how long screen damage can last while the screen changes, but a static screen damaged by foreign output stays damaged until something changes. The clock is now part of the runtime contract, and a later timed behaviour such as a dismissal or settle window uses the same clock.

## Alternatives considered

Synchronized output alone would remove the flash but keep the full-screen cost per spinner frame. A terminal emulator in the testing entrypoint would accept arbitrary transcripts, but it would be a second terminal implementation to maintain and would hide grammar violations that should fail. Cell-level diffs would save more bytes per frame at the cost of column positioning and a replay that tracks cells rather than rows. A free-running interval timer would tick during foreground work and would queue ticks behind a slow paint. Prose-only readiness keeps tests coupled to copy, which is why state reports exist, and keeping them off by default avoids changing output for anyone who has not asked for them.
