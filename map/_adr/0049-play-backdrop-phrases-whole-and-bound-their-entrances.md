# ADR 0049: Play Backdrop phrases whole and bound their entrances

**Status**: accepted

## Context

The geometric Backdrops were authored as endless loops, staggering their elements by starting each one partway into a shared loop with a negative delay. When they moved to a single authored phrase that ends on a still, only the iteration count changed. A staggered element then stopped short of a full cycle, and whatever turn it took in the missing stretch never played: seven of Approach's nine rings never lit, and discern.sh's hero was static fifteen seconds after load. Nothing in the Catalogue made the loss visible, because a stilled or truncated phrase still renders a finished figure.

Refining Approach as a hero also raised three questions the family had not answered: how long motion that starts by itself may run, whether any Backdrop may move without end, and how motion stays smooth behind a large hero at a high pixel density.

## Decision

**A phrase plays every element's whole cycle.** [`phrase.ts`](../../src/components/artwork/phrase.ts) owns the arithmetic. An element whose keyframes return to where they began keeps its authored stagger and runs for exactly one period (`phraseIterations`), so the whole phrase stays in step and ends on the frame it began with; an element whose keyframes do not close a loop waits for its turn instead (`phraseWait`), because starting it partway in would jump at the seam. [`tests/artwork_phrase_test.ts`](../../tests/artwork_phrase_test.ts) enrols every Artwork piece by Group and fails an element that stops short of a cycle or jumps where its loop closes.

**An entrance settles within five seconds.** Approach's entrance — the station emitting the figure, an optional arrival, and one wave of light running back in — ends inside five seconds, so motion that starts by itself stays clear of WCAG 2.2.2 (Pause, Stop, Hide) without a control. The same test file holds that bound for every entrance combination.

**Motion without end is opt-in and the consumer's to pause.** Approach's `drift` continues after the entrance, one ring-step at a time. It is off by default, and a consumer that turns it on owns giving readers a way to pause it. Motion caused by the reader — the scroll dolly — is causal, runs on a view timeline, and moves only while the reader scrolls.

**Motion is `transform` and `opacity` keyframes over static plates.** Animating one registered custom property that about a hundred SVG descendants inherit cost 94% of the main thread in measurement; the same drift as a `transform` keyframe cost 5%. Approach therefore precomputes each ring's values from one inline depth index, keeps the lines that light up on a second plate so they never repaint the base, and reveals its entrance with a clip that exists only while the phrase runs.

Two supporting pieces follow from the same work. Backdrop's `grain` draws ink speckle through a noise mask rather than an overlay blend, because a blend inside the Backdrop's isolated group mixes with transparency and veils the canvas. `--discern-backdrop-fill-gain` corrects filled areas across themes, since dark ink fills weigh more on a light canvas than light fills on a dark one.

## Consequences

Every existing phrase now plays in full; the longer ones last up to one extra period rather than ending early, and Fold opens dim and settles lit. A new Backdrop inherits the guard without registration. Approach's shipped default is a finished still after five seconds; discern and any other consumer that wants living motion choose `drift` and accept the pause obligation explicitly. The entrance uses container-query units, `linear()` easing, and animated `clip-path`; where a browser lacks one, that animation drops and the complete still remains.

## Alternatives considered

Restoring the endless loops would have kept the original motion but left every Backdrop needing a pause control under WCAG 2.2.2. Converting every negative delay into a forward wait would have been simpler, but it desynchronises Tiling, whose route tracing depends on where each tile stands in the shared loop, and it would have discarded the standing starts the other phrases were authored around. Driving the whole camera from one animated custom property composed arrival, drift, and scroll elegantly, but its measured main-thread cost ruled it out for a hero.
