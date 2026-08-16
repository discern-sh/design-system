# ADR 0017: Inspect terminal layouts with explicit geometry

**Status**: accepted

## Context

The package could already project one package-emitted terminal frame into browser HTML, but that projection presented only the text and styling. It did not expose the spatial facts a person uses to judge a terminal interface: the terminal width, the visible height, the fold, the longest row, or which content would sit outside the viewport. Consumers could build screenshot loops from the projection, yet every consumer still had to invent its own rulers and measurements before a coding agent could review output as a layout rather than read it as prose.

The obvious next step was either a policy engine that declared good and bad terminal layouts, or a visual instrument that made the geometry inspectable. A policy engine would be premature. Repeated visible lines and consecutive blank rows can indicate accidental duplication or broken rhythm, but both can also be intentional component anatomy. Adjacent headings require semantic knowledge that a flat terminal string does not contain. A row budget can prevent growth, but it can just as easily freeze an unsettled composition or reward deleting useful information.

The choice-frame improvements in 0.16.0 also establish an important boundary. Component renderers and the interactive viewport fitter own their own responsive geometry: available width, label wrapping, group spacing, hidden-choice disclosure, and the largest coherent frame that fits. A composition inspector must reveal the result of those authorities, not reproduce or override them.

## Decision

`./cli/projection` publishes a pure terminal layout inspection layer above its existing emitted-sequence decoder. `inspectTerminalLayout()` accepts one static package-emitted frame and an explicit `{ columns, rows }` viewport. It returns line-by-line visible-cell widths, overflow rows, content height, spare or below-fold rows, and the maximum width. Tabs use terminal eight-cell stops and all other width measurement uses the package's grapheme-aware text authority.

`projectTerminalInspectorHtml()` renders those same facts as a self-contained browser fragment: real package styles, a column ruler, row numbers, an explicit fold boundary, optional cell guides, overflow and below-fold treatment, and a compact metric summary. Like the existing bare projector, it is script-free, has no process or environment access, rejects output outside the package-emitted repertoire, and is not a terminal emulator.

Consecutive blank rows and repeated exact nonblank visible rows are returned and displayed as advisory review cues. They are never failures. The inspector does not infer headings, semantic groups, importance, or a permitted row count from flat output. It therefore adds no layout conformance gate, default output budget, or consumer policy.

The Catalogue demonstrates the instrument with complete, source-backed CLI compositions at three explicit review profiles: compact 40×24, standard 80×24, and wide 120×30. These recipes compose only public `./cli` renderers and remain Catalogue examples rather than new runtime abstractions. In particular, the guided-choice recipe exercises the 0.16.0 choice-frame geometry through the real Select renderer; the inspector does not contain a second choice-layout implementation.

The existing `projectTerminalHtml()` contract remains the small bare projection used by individual Component specimens. A layout inspector is additional review chrome, not the new default rendering surface.

## Consequences

Humans and coding agents can now discuss terminal output in spatial terms—“row 25 is below the fold” or “row 7 is 83 cells wide”—and inspect the same coloured frame in a browser without copying terminal geometry into each consumer. Complete recipes make component relationships and reading order visible, while their copyable source gives consumers a practical starting point.

The package takes on a new public SemVer surface and a modest amount of self-contained HTML presentation. The returned measurements are stable facts for a fixed frame and viewport; the advisory cue set may only change deliberately because consumers can display it. The inspector still cannot know whether a line is a heading, whether a repeated border is meaningful, or whether content deserves its rows. Those questions remain with the composition author until a later semantic layout model earns its own contract.

The three Catalogue profiles are review fixtures, not claims about every real terminal. Consumers remain responsible for sensing their actual terminal and for testing other geometries their users rely on.

## Alternatives considered

Adding row ceilings and source outlaws now would turn a fast-moving visual design into a compatibility constraint and make iteration more expensive. Keeping the inspector Catalogue-private would avoid a public contract but force every consumer screenshot loop to rebuild the same geometry. Building a browser terminal emulator would handle arbitrary cursor streams, but it would enlarge a static layout-review problem into process and emulation semantics; the existing projection boundary deliberately treats pure frames as the reviewable unit. Encoding a terminal layout tree or grid system now could eventually support semantic rules, but there are not yet enough settled compositions to identify the right abstraction without designing ahead of evidence.
