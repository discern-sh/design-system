# ADR 0023: Bind terminal motifs to narrow-A geometry

**Status**: accepted

## Context

[ADR-0018](0018-bind-semantic-terminal-motifs.md) introduced the immutable semantic motif, its package-wide binding, and a strict Unicode factory. The factory rejected every East Asian Width–Ambiguous scalar because some terminals can render that class as two cells. The rest of the CLI did not implement that posture: the shared `graphemeWidth()` authority already resolves Ambiguous scalars to one cell, package Components and foundations already emit them, and all wrapping, padding, boxes, projections, and interactive repainting use that shared result. Rejecting Ambiguous custom motifs therefore restricted one extension point without making wide-A terminals safe.

Terminal width policy cannot be inferred reliably from locale, font fallback, or a standard capability report. Supporting an alternate two-cell interpretation requires a caller-declared capability threaded through every measurement and layout path, package-glyph fallback choices, cursor geometry, interaction frame, and conformance matrix. That is a repo-wide capability rather than a local motif-validator fix. Ordinary CJK Wide/Fullwidth scalars already measure two cells; the unresolved case is specifically a terminal that chooses two cells for the Ambiguous class.

## Decision

The supported CLI geometry resolves East Asian Width–Ambiguous scalars to one cell. `defineTerminalMotif()` delegates cell eligibility to the same `graphemeWidth()` authority as every other CLI layout and applies no second East Asian Width classification rule. Unicode motif roles must still be exactly one assigned, visible, non-combining scalar and must measure exactly one cell; Wide/Fullwidth scalars, RGI emoji, controls, separators, combining marks, and multi-scalar strings remain invalid. ASCII roles remain one printable non-space character.

`DISCERN_TERMINAL_MOTIF` uses the clockwise half-filled-circle spinner `◐ ◓ ◑ ◒`. Its ASCII `^ < v >` spinner and its pattern, marker, and status roles remain unchanged.

The semantic roles, opaque factory brand, immutable derivation, presenter precedence, Component forwarding, interactive propagation, and future-enrolling tests established by ADR-0018 remain the architecture. This record supersedes ADR-0018 because it replaces that record's glyph-width decision and default spinner. It does not claim support for terminals configured to render Ambiguous scalars as two cells, and it does not remove the validation that protects deterministic one-cell motif geometry.

## Consequences

Consumers can use the larger set of one-cell symbols the package itself already measures, including the preferred half-filled circles, without bypassing the motif brand. Motif validation and layout now have one width authority, and the default spinner is exercised through static Components, live interactions, projection, and Catalogue evidence.

On a terminal configured for wide Ambiguous glyphs, the new spinner can occupy two physical cells and existing Ambiguous package glyphs can already misalign frames. Consumers targeting that posture must select the ASCII repertoire until the capability model represents it. Adding that model later is intentionally repo-wide: a motif-only width hint would recreate the inconsistency this decision removes.

## Alternatives considered

Keeping the Ambiguous rejection would preserve a conservative label for custom motifs but not a conservative terminal surface; existing package glyphs and layout would remain unsupported on the same terminals. Removing validation entirely would admit objective geometry failures such as emoji-width, combining, or multi-scalar roles. Implementing alternate wide-A geometry before launch would delay the current change for a broad capability that has no reliable automatic detector, so that work remains explicitly deferred in the project ledger.
