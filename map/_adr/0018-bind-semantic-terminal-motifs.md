# ADR 0018: Bind semantic terminal motifs

**Status**: accepted

## Context

The terminal surface began as the discern product's design language, so its public foundation named triangle geometry directly and Component renderers embedded that vocabulary throughout headings, progress, workflow state, narration, and live activity. That was a sensible first authority for discern itself, but it made the package's product identity look like a required design-system identity. A later consumer could call the low-level pattern functions with different options, yet it could not replace the complete visual language once and have every Component and interaction follow it.

The replacement needed to preserve three useful properties. Discern still needed a coherent default with no setup. A consumer needed one product-level choice rather than an override at every call site. Individual compositions still needed a local exception without mutating shared state. The same choice also had to reach pure Component renderers and the effectful Interactive Adapter, including grouped headings, time-advancing activity, and nested sequential-form requests.

Terminal glyphs add a geometry constraint that ordinary visual themes do not have. A symbol that looks like one cell in one terminal can be East Asian Width–Ambiguous, wide, combining, emoji-shaped, or absent from a fallback font elsewhere. Accepting arbitrary strings would let a brand override silently break box widths, repainting, progress, and column alignment.

## Decision

The public contract is semantic rather than geometric. `TerminalMotif` contains four roles for each Unicode and ASCII repertoire: an indeterminate spinner cycle, a repeated pattern cycle, one accent marker, and complete/incomplete status glyphs. Renderers ask for those roles and never infer direction from a glyph name. `motifs.ts` owns pattern, spinner, progress, section-rule, workflow-stepper, and activity-beacon geometry over that semantic value.

`defineTerminalMotif()` is the only complete constructor. It validates every role and returns a deeply frozen, opaquely branded value. `deriveTerminalMotif()` applies partial role replacements to an existing validated value and runs the same complete validation. The package publishes one preset, `DISCERN_TERMINAL_MOTIF`; it does not publish an enum of stylistic presets that would make the package curate other products' identities.

Unicode roles contain exactly one assigned, visible, non-combining scalar. They measure one terminal cell and are neither Ambiguous nor Wide/Fullwidth under the Unicode 17.0 East Asian Width data pinned in `east-asian-width.ts`. Extended pictographic width is rejected by the shared grapheme measurement. ASCII roles contain exactly one printable non-space ASCII character. Every definition includes both repertoires, so capability degradation cannot discard the chosen semantics.

`createCliPresenter(capabilities, { theme, motif, width })` is the product-level binding. Resolution is deterministic: an explicit per-call motif wins, then the presenter's motif, then `DISCERN_TERMINAL_MOTIF`. `CliPresentationOptions` carries theme and motif together as presentation inputs, but they remain independent facts: theme chooses Token-derived colour and typography, while motif chooses semantic glyphs. `with()` derives another pure presenter; there is no process-global or mutable default.

Every rendered Component accepts the shared presentation options and forwards the motif whenever it delegates to another renderer. The interaction runtime forwards the same fact to every Component callback. Spinner, determinate-progress, activity-log, and sequential-form options bind it for their whole operation, and a sequential form passes it into nested request runtimes. Time-advancing drivers derive their modulo from the effective spinner cycle rather than the discern preset's length.

The package makes this set future-enrolling. A generated-registry test renders every Component example through a non-discern presenter and rejects discern-glyph leakage. Direct tests cover grouped requests and every interactive composition path. A source guard keeps the distinctive discern glyph repertoire in `motif.ts`, and the canonical-set map names that module as the only authority.

The old `Triangle*`, `renderTriangle*`, presenter triangle bindings, constants, and `verticalTriangleStatusPhase` names are removed rather than aliased. The package has no external consumers at this point, is pre-1.0, and records the break in the changelog; retaining two vocabularies would create two apparent authorities for the same contract.

## Consequences

Discern keeps a zero-configuration triangle language, including the smaller clockwise spinner, while another product can bind one validated motif and receive it across static renderers and live interactions. A one-off call remains an ordinary prop override. Consumers can replace a single role through derivation or define a complete language without forking Component renderers.

Motif identity stays orthogonal to light/dark selection and terminal capability detection. Presenter values remain deterministic, immutable, and safe to share. Variable-length spinner cycles animate correctly, while each accepted glyph preserves the one-cell geometry on which frames and cursor replacement depend.

The strict portability policy excludes some visually attractive symbols. In particular, an East Asian Width–Ambiguous glyph can render as one cell in a Western locale and two in a CJK locale, so the factory rejects it even when the current terminal appears to align it. Consumers that intentionally target one controlled terminal cannot bypass the brand with an object literal; they retain the raw renderer escape hatch only with a valid motif. Updating the pinned Unicode width data is an observable layout change and receives normal review.

The rename is deliberately breaking. Source code, exact-frame tests, documentation, and catalogue selectors use the generic motif vocabulary, while historical ADRs continue to describe the triangle-specific system that existed when those decisions were made.

## Alternatives considered

Per-call overrides alone kept every renderer pure but made product identity repetitive and easy to omit in nested Components. A mutable package-global default shortened call sites but introduced order dependence, test leakage, and concurrent-consumer conflicts. Putting glyphs in the terminal theme coupled brand geometry to light/dark colour choice and multiplied otherwise identical themes. Publishing several named presets made discovery easy but turned a semantic extension point into a closed style menu and implied package ownership of consumer identities.

Accepting partial unvalidated objects at render time reduced setup but moved failures into live output and repeated merge logic across renderers. Allowing Ambiguous glyphs with a width hint made the caller restate a terminal-local policy that could change with locale or font fallback. Keeping compatibility aliases avoided an immediate rename but left triangle terminology embedded in the public architecture and weakened the one-authority guard.
