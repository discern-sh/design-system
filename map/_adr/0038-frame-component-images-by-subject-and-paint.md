# ADR 0038: Frame Component images by subject and paint

**Status**: superseded by [ADR-0041](0041-verify-component-images-from-sources-and-artifacts.md)

## Context

[ADR-0034](0034-commit-pinned-png-component-example-images.md) made the canonical Web example's border box the generated image boundary. That rule was simple, but a border box is not always the visual subject. Paint such as a hard shadow can escape it and be clipped, while a transparent layout root can occupy the full 960-pixel harness even when its visible children use only a small fraction of that allocation. Both failures produce valid PNGs and hashes, so artifact integrity cannot distinguish a useful discovery image from a cropped or pathologically sparse one.

Adding generic padding would protect some effects but would change every image, make empty space part of the bytes, and still leave unbounded filters or positioned pseudo-elements unproved. Choosing a bespoke crop for each current example would fix the instances without protecting future Components.

## Decision

Capture contract version 4 frames the selected visual subjects and their finite paint. An ordinary example still selects its single rendered root; an explicit capture may select one or more matching elements, which are deduplicated and unioned in document order. Every selected element and descendant contributes its border box plus computed non-inset box shadow, text shadow, and outline. Clipping on the painted element or its ancestors constrains that paint.

The version 4 raster viewport is 1600×2000 with the existing 960-pixel logical harness inset by 256 pixels. Those margins keep the largest proved optical shadow inside the in-viewport raster path; the contract remains the sole source of those document and harness dimensions.

The computed grammar is strict. Paint whose physical extent cannot be proved, including filters and escaping positioned pseudo-elements, requires an explicit `paintBleed`. Declared bleed is unioned with paint the capture can prove; it cannot hide a larger known effect. The capture adds no generic padding.

A representative selection whose root paints no box is also a framing contract. The capture descends through transparent allocation wrappers to the first painted subjects and requires those subjects to cover at least one third of the selected allocation. Authors normally select the visible subjects instead. When empty allocation is itself meaningful evidence, they may declare `framing: { mode: "allocation", reason }`; the non-empty reason makes the exception reviewable.

The committed PNG, canonical environment, representative selection, artifact integrity, update tolerance, and bounded live verification decisions from ADR-0034 remain in force. This ADR supersedes ADR-0034 because it replaces that decision's border-box and exceptional-union geometry with the version 4 subject-and-paint boundary.

## Consequences

Shadows, outlines, and multi-subject examples cannot be silently clipped, and a future transparent layout wrapper cannot become a nearly empty representative thumbnail without failing the update. The same source-backed directive handles the rare effect or intentional allocation that automatic geometry cannot prove.

Capture code is more conservative and a new unsupported paint form fails until its extent is declared or the grammar learns it. The one-third threshold is a versioned review judgment rather than a universal design ratio; changing it is a capture-contract change and requires regenerating and reviewing the corpus.

## Alternatives considered

Blanket padding changes unrelated bytes and cannot bound arbitrary effects. Pixel-scanning for non-transparent content makes antialiasing and colour part of the geometry contract. Per-Component crop dimensions duplicate facts already available from the rendered DOM and do not enrol future examples. Retaining the border box and fixing only Button and Cluster would leave the defect class open.
