# 3A — Generate deterministic Component example imagery

**Goal:** Render every canonical Web-capable Component example in the real browser, crop it to its exact capture bounds, and expose the resulting theme-aware image and metadata through one generated authority that Catalogue and Interface Builder projections can reuse.

**Wave:** 3. This is the sole wave-3 stream. It starts after the canonical example contract has landed and must land before Catalogue wave 4 or Builder implementation begins.

Later Catalogue and Builder streams consume this output. You own `3A` only; do not launch, dispatch, or supervise those sibling programmes.

## Orient, verify prerequisites, then re-root

From `/Users/jack/Sites/discern-design-system`, call `discern_status`. Verify these landed prerequisites on `main`:

- `map/_private/planning/catalogue-ux/_done/1a-catalogue-architecture-and-shell.md`, including the route-family/browser-check seams;
- `map/_private/planning/catalogue-ux/_done/2a-cross-surface-example-contract.md`, including one canonical ordered example vocabulary and stable slug/example-id addressing for every Web-capable entry.

Stop if either marker or behavioural outcome is missing. Call `discern_start` with the literal name **`catalogue-3a`**, re-root every operation into the returned absolute `data.path`, and pass it to every discern tool.

Only after re-rooting, read:

- `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/60-catalogue/README.md`, this programme README, and the completed 2A brief;
- the post-2A canonical example types and generated registry, plus the shared Web example renderer;
- `scripts/build.ts`, `scripts/generate.ts`, `scripts/conformance.ts`, `catalogue/conformance.ts`, `deno.json`, and the existing screenshot/review-sheet lifecycle;
- representative Web examples: a simple inline Component, a full-width block, a Forms lifecycle state, a scrolling/wide Component, an animated Component, and Dialog/Tooltip/other portalled content;
- the authored `discern/skills/add-a-component/SKILL.md` rather than any materialised skill copy.

Use `discern-write-it-once` for the source-to-image authority. Use `discern-cure-a-bug` for nondeterminism, stale output, crop, font, animation, or future-enrolment failures. Use the in-app browser to inspect generated images against their live examples. Verify every named anchor against the landed tree.

## Background

Several human-facing surfaces need a recognisable image for a Component without mounting 139 live previews. Today palette and card previews often appear blank or show generic “Text”, while page-specific screenshots would immediately drift from the examples they represent.

The owner wants actual raster evidence produced by a headless browser and cropped to the exact rendered example bounds. The post-2A example contract makes that possible: Component slug plus canonical example id is now one stable input. This stream turns that input into a generated Catalogue-only asset contract once, before any consumer invents its own thumbnail system.

“Deterministic” must be stated precisely. Arbitrary browsers, fonts, GPUs, and operating systems cannot be assumed pixel-identical. Pin and prove the environment the project controls, make all other variation explicit, and never market a weaker “usually looks similar” process as byte determinism.

## Deliverables

### 1. Define and prove the capture contract

Write an ADR if the live-tree-informed decision is hard to reverse, especially the committed-asset, theme, format, or gate-economics boundary. The contract must specify:

- the pinned Chromium/runtime and device-pixel ratio;
- fixed logical harness width, canvas/background, light and dark theme postures, canonical accent, locale, colour scheme, and font loading;
- network isolation and use of repository-owned assets only;
- reduced-motion/frozen-animation behaviour, clock/randomness treatment, and the exact readiness signal after React, fonts, layout, and local images settle;
- integer rounding and the exact capture-region rule. Ordinary examples crop to the example root's bounding box; portalled or multi-root states use one explicit declared capture region rather than silently omitting visible content;
- what byte-identical means inside the pinned environment and what is merely geometry/semantic reproducibility outside it.

Generate both light and dark images for every canonical Web-capable example. If measurement proves that a theme-invariant deduplication materially reduces output, it may share one byte asset through two manifest entries, but coverage remains theme-complete and no consumer guesses.

The image itself contains only the exact capture region. Padding, card composition, object fitting, captions, and backgrounds used by consumers remain consumer presentation rather than baked thumbnail chrome.

### 2. Build one capture-only browser projection

Create a bounded same-origin capture route or harness that consumes the exact canonical Web example renderer. Do not copy JSX, props, labels, or ordering into a screenshot script.

- Address one example by validated Component slug, canonical example id, and theme.
- Mount only that example and the minimum design-system runtime it selects.
- Mark one authoritative capture region and expose a deterministic ready/error state to automation.
- Contain render failures per example, fail the generation task with slug/id/theme, and record console errors rather than producing a plausible broken image.
- Support examples whose visual evidence uses a portal through the declared capture-region contract.
- Keep the route inert, local, and outside ordinary Catalogue navigation/search.

The capture route is test infrastructure and generated-asset production, not a new public package or hosted API.

### 3. Generate images and one typed manifest

Add one project task with clear update and verify postures. Choose names consistent with the live task vocabulary.

- Update renders every canonical Web-capable example in both themes, captures exact bounds, writes stable raster files under a generated Catalogue-only asset directory, and writes one typed manifest.
- Verify proves full current-registry coverage, detects missing/stale/orphan files, validates dimensions and hashes, and performs a bounded repeat-capture witness that fails if the pinned environment produces different geometry or bytes for the same inputs.
- The manifest keys by Component slug, canonical example id, and theme and records the source-backed human label, asset URL/path, intrinsic width/height, content hash, and capture-contract version.
- One derived representative-image selector chooses `default` when present and otherwise the first canonical Web example. Consumers never maintain a second representative list.
- Output order, filenames, manifest serialization, compression, and metadata stripping are stable. Do not embed timestamps, absolute paths, host names, or browser-run ids.
- Generated assets remain outside the JSR publish allowlist. Prove this structurally.

Measure total file count, bytes, cold update time, unchanged verify time, and per-example cost. Use those measurements to choose PNG or another genuinely deterministic browser-derived format and to decide whether the full update belongs in the gate's fix stage or an input-aware generated check. Do not accept an unbounded every-gate browser tax, and do not leave stale-image detection manual.

### 4. Expose a reusable consumer seam without redesigning consumers

Provide the smallest framework-neutral metadata/helper and, where appropriate, one shared image-rendering primitive that later Catalogue and Builder modules can consume.

- It resolves a requested slug/example/theme or the derived representative image.
- It emits truthful intrinsic dimensions and useful alt/caption inputs from canonical metadata; consumers decide whether a particular occurrence is informative or decorative.
- It has a deliberate missing/error placeholder used only for development failure containment. A missing current example is a generation/test failure, not an ordinary production state.
- It does not mount the live Component, create a page-specific card, or prescribe Builder palette density.

Do not redesign Component discovery or `catalogue/builder/**`; waves 4 and the separate Builder programme own adoption.

### 5. Enrol every current and future example

Add focused guards that prove:

- every current canonical Web-capable example has light and dark manifest entries and valid exact-bounds images;
- CLI-only entries are not assigned fake browser images, while CLI-exempt Components still capture their Web examples;
- a synthetic future Component/example automatically joins capture, manifest, representative selection, verification, and asset cleanup;
- renamed or removed examples cannot leave orphan assets;
- exact bounds contain the declared visible capture region without page chrome, unexpected whitespace, clipping, or zero dimensions;
- fonts are loaded, animations are frozen/reduced as declared, URLs and bytes contain no machine-specific data, and capture produces no unexpected console errors;
- the manifest and generated assets cannot enter the package publish set.

Update the authored add-component skill so new examples know images are generated automatically, how to provide a capture region only when the ordinary root is insufficient, and which task diagnoses a capture failure. Run `discern refresh`; never hand-edit `.agents/skills/**`.

### 6. Inspect the images as images

Run the capture task, serve the worktree on its deterministic port, and leave the server running. Build a temporary review sheet from the generated manifest or use the bounded capture route to inspect at minimum:

- simple inline, full-width, empty/sparse, dense/wide, form lifecycle, animation, portal, Chart, Diagram, and Markdown examples;
- both themes;
- representative selection and at least one non-default canonical example;
- exact crop edges at high zoom and the consumer image at its intended thumbnail size.

Compare each generated image with the live example in the in-app browser. Report the exact review URL, capture task timings, asset count, and total bytes.

## Constraints

- One canonical Web renderer supplies live Catalogue examples and image capture. Never copy example props or JSX into the generator.
- Exact image bounds are a generated fact. Consumer card padding and aspect-ratio treatment stay outside the asset.
- Capture is local, inert, network-free, theme-aware, font-ready, and free of time/randomness/animation nondeterminism.
- Keep generated image metadata Catalogue-only and the package publish set unchanged.
- Do not hand-edit generated images or manifests; fix their authority and rerun the task.
- Do not redesign Catalogue pages, Builder palettes, Component visuals, Tokens, or examples merely to make screenshots easier.
- Commit the capture contract, harness/task, manifest/consumer seam, and generated population in reviewable logical steps.

## Out of scope

- CLI/terminal raster images.
- Responsive screenshot matrices, arbitrary consumer branding, or image CDN/upload work.
- Visual-regression approval of intentional Component design changes; these images are discovery evidence, not the sole conformance oracle.
- Catalogue page redesign or any Interface Builder implementation.
- Package release/version bump unless the chosen contract unexpectedly changes public API; avoid such a change.

## Definition of done

- Every canonical Web-capable example has deterministic exact-bounds light and dark raster imagery and one typed, ordered, content-hashed manifest generated from the real renderer.
- The pinned-environment reproducibility contract is documented and proved by repeat-capture, geometry, stale/orphan, font, animation, console, and machine-data guards.
- Representative Component imagery derives automatically from canonical example order; no hand-maintained thumbnail selection exists.
- A future Component/example auto-enrols, while removal cleans up generated assets and CLI-only entries never receive fictitious browser imagery.
- Catalogue and Builder consumers have one small reusable resolution seam, but neither consuming UI is redesigned here.
- Generated assets are excluded from the JSR publish set, and measured count/bytes/update/verify timings are reported with a defensible gate strategy.
- Representative images have been compared with live examples in both themes at the exact review URL, and the server remains running.
- After the last edit run `discern_prepare`, commit all source and generated output, then run `discern_done` on clean committed HEAD. Fix every diagnostic without loosening a guard or standard.
- Once green, run `discern_accept`. A recorded grant may land; otherwise it must refuse without mutation, after which report the proof line and `catalogue-3a` branch/worktree and stop for owner review.
- In the final commit, move this brief from `map/_private/planning/catalogue-ux/3a-deterministic-component-example-images.md` to `map/_private/planning/catalogue-ux/_done/3a-deterministic-component-example-images.md` (create `_done/` if needed).
