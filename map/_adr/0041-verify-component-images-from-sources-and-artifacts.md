# ADR 0041: Verify Component images from sources and artifacts

**Status**: accepted

## Context

The committed Component images let Catalogue indexes show recognisable examples without mounting the live Component population. The pipeline must notice when an image's rendering inputs change, preserve the committed file as reviewable evidence, and avoid making unrelated work pay for Chromium.

The version 4 pipeline mixed those responsibilities. One repository-wide hash enrolled every tracked file under `src/`, so an unimported private subtree invalidated all 682 images. Verification then launched Chromium and compared fresh raster pixels with committed pixels through a fixed tolerance. Chromium does not provide that repeatability: text antialiasing, translucent shadows, scrollbars, renderer scheduling, and system load can change imperceptible pixels or subpixels while the rendered image and geometry remain visibly unchanged. A tolerance only moves the arbitrary boundary; it cannot turn nondeterministic raster output into semantic evidence.

The images also used one device pixel per CSS pixel and painted the capture canvas behind every crop. On high-density displays they appeared softer than the surrounding interface, while circles and rounded surfaces retained rectangular corner pixels from that canvas.

## Decision

Capture contract version 5 separates source currency, artifact integrity, and visual judgment.

Each Component image entry carries a source fingerprint derived from the local Deno module graph reachable from that Component's Metadata and Web examples, its implementation dependency closure, its Component CSS dependency closure, and the explicit shared capture, Token, Theme, style, asset, and executable-configuration inputs. A generated Web-only capture registry is the graph boundary: CLI renderers and unimported private source do not enter it. Shared rendering inputs still invalidate every affected entry. The manifest's overall source hash is derived from the ordered entry fingerprints rather than from a broad source directory.

An update reuses an existing entry when its contract version, source fingerprint, dimensions, density, canonical PNG structure, path, and content hash remain valid. Chromium launches only for entries that cannot be reused, and those fresh captures replace their entries once; no live raster is compared with a previous raster. Verification builds the real capture projection and checks graph-derived source currency plus every committed artifact, but does not launch Chromium. SHA-256 remains an integrity fact for the committed bytes, not a promise that Chromium can reproduce them.

Visual correctness stays with the source-backed capture geometry, browser conformance, the generated review page, and human review of intentional image changes. The pipeline does not define a pixel-difference tolerance or a screenshot-regression oracle.

Version 5 captures at two device pixels per CSS pixel, records logical and physical dimensions separately, requests an omitted browser background, and keeps the capture document and harness transparent. A fully opaque crop may use canonical RGB PNG encoding; a crop with exposed corners uses canonical RGBA. Capture remains sequential because preparation readiness and geometry still depend on one settled page cadence even though byte identity no longer does.

## Consequences

Adding an unimported source subtree or changing CLI-only code does not stale Catalogue imagery. A Component-local rendering change recaptures only that Component's Light and Dark entries; shared Tokens, Themes, styles, assets, or capture machinery recapture the entries they can affect. A source-current no-op update builds and validates the projection without launching Chromium.

The committed population is larger because it carries four physical pixels for each logical pixel. In exchange, Catalogue consumers receive high-density imagery with transparent crop corners and continue to size it from logical manifest dimensions.

A source fingerprint proves that the committed artifact was produced for the current declared inputs, not that its pixels are aesthetically correct. Reviewers must inspect intentional recaptures, and the graph and shared-input guards must keep enrolling every future rendering dependency. The updater still requires the pinned canonical platform and Chromium when any entry needs capture; verification is portable.

## Alternatives considered

Exact byte comparison was rejected because Chromium does not promise repeatable raster bytes. A fixed perceptual tolerance was rejected because observed invisible variation can be distributed across more pixels than the bound, while a small real change can fall inside it. More elaborate image metrics would remain a second visual judgment with false-positive and false-negative thresholds. Live Component previews would avoid committed rasters but would recreate the Catalogue mounting cost the images exist to remove.
