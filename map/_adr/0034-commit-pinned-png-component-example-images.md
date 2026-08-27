# ADR 0034: Commit pinned PNG Component example images

**Status**: accepted

## Context

Catalogue discovery and later Interface Builder projections need recognisable Component imagery without mounting hundreds of live React examples. The canonical example vocabulary now gives every Web posture a stable Component slug and example ID, but an image adds another contract: pixels depend on the browser build, operating system, font resolver, colour pipeline, device scale, animation state, and capture geometry.

The repository can pin its Deno, Playwright, Chromium, fonts, locale, and harness. It cannot make arbitrary operating systems, GPUs, or browser builds rasterise identical bytes. Calling those environments deterministic would hide the actual boundary. Regenerating every image in every gate would also turn a bounded generated-source check into an unbounded browser tax.

## Decision

Canonical Web examples generate committed, Catalogue-only PNG files and one typed manifest. The ordered canonical example registry supplies every input; each Web entry emits Light and Dark images, while CLI-only entries emit none. The representative posture is `default` when present and otherwise the first canonical Web entry. Consumers resolve the manifest and do not maintain a second thumbnail list.

Capture version 1 pins Deno 2.9.5, Playwright 1.61.1, Playwright-managed Chromium revision 1228 reporting 149.0.7827.55, and the byte platform `darwin/aarch64/25.6.0`. It uses a 1280×1040 viewport, a 960-pixel logical harness inset by 160 pixels, device-pixel ratio 1, sRGB, `en-GB`, UTC, a fixed clock and seeded randomness, reduced motion, frozen animation, canonical accent 255, and repository-owned Crimson Pro, Inter, and JetBrains Mono faces. The browser also disables GPU raster, LCD text, runtime Skia optimisation, and font hinting so the named byte environment follows one software raster posture. Each input receives a fresh page rather than inheriting DOM, focus, scroll, or raster state from the previous canonical entry. The route is same-origin, blocks external requests and service workers, and becomes ready only after React, the declared local fonts, layout paints, local images, and any explicit example preparation settle without active animation or console failure.

An ordinary example exposes exactly one top-level rendered root. Its capture box is `floor(left/top)` through `ceil(right/bottom)`. A portalled or genuinely multi-root posture declares selectors beside its canonical Web renderer; their visible rectangles form one union box. The image contains that box only. Consumer padding, background treatment, captions, fitting, and aspect ratio are not image bytes.

Within the complete pinned byte environment, repeat capture and the committed SHA-256 must match byte for byte. Elsewhere, verification proves manifest and file coverage, source currency, exact geometry, and byte/geometry equality between two captures in that host; it does not claim cross-platform byte identity.

Full population capture is an explicit update. The normal gate performs cheap source, hash, dimension, metadata, stale, and orphan checks, then rebuilds the real capture projection and repeats a bounded first/middle/last witness. PNG serialization is accepted only with canonical `IHDR`, `sRGB`, `IDAT`, and `IEND` chunks, so timestamps, text, EXIF, host paths, and run IDs cannot enter the committed files. The generated directory remains outside the package publish allowlist.

## Consequences

Catalogue and Builder work can share intrinsic dimensions, labels, hashes, theme coverage, and representative selection without mounting Components or copying example props. New and removed canonical examples join update, verification, and cleanup through the same plan.

The repository carries hundreds of PNG files, and an image update requires the named byte platform and browser revision. A Component pixel change makes the source hash stale until that explicit update runs. Other development and CI hosts can still prove the structural and geometry contract, but cannot bless different raster bytes as equivalent.

## Alternatives considered

Live previews preserve the renderer but recreate the original mounting cost. Page-specific screenshots duplicate composition and crop facts. SVG cannot faithfully represent arbitrary browser Components. WebP adds encoder and metadata variability without a measured need. Re-capturing the full population in every gate provides stronger sampling only by making cost grow linearly with every future example; the input-aware full artifact check plus bounded live witness keeps stale detection automatic and gate cost bounded.
