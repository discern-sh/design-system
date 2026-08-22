# 6A — Evaluate optional Diagram dependencies

**Goal:** Measure the dependency-free Diagram system against current credible layout/font alternatives, verify complete licensing and runtime facts for the FSL-licensed Discern consumer, and produce an evidence-backed recommendation without changing production dependencies or APIs.

**Wave:** 6 — optional decision checkpoint after the shipping lane. Starts only after 5A has landed on `main`; it is not required to release the dependency-free surface. This wave is research and decision preparation, not implementation of a selected library.

If read-only research sub-agents are available, parallelise current-version/licence verification, Deno/module-graph experiments, and corpus/layout benchmarking. One coordinating agent owns the final evidence, reconciles contradictions against primary sources, writes the branch, runs the gate, and seeks acceptance. No sub-agent edits production manifests or source.

## Orient, verify the baseline, then re-root

Work from `/Users/jack/Sites/discern-design-system`. Begin with `discern_status`. Verify wave 5A and the complete dependency-free Diagram surface are present on `main`, including its release corpus, geometry/accessibility/terminal guards, publish-shaped consumer proof, and zero-new-dependency evidence. Read the 5A handoff or committed artifacts for measured limitations; do not assume the research brief's candidate list proves a problem exists. If 5A has not landed, stop and report the missing prerequisite.

If status records an existing worktree for this exact effort, continue there and pass its absolute path to every discern tool; do not call `discern_start` again. Otherwise call `discern_start` from the main checkout with the literal name `diagram-6a`, then re-root into the returned absolute worktree before reading or editing.

Read the worktree's `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/25-diagrams/README.md`, every Diagram ADR, the complete `src/diagram/` subsystem and release corpus, `deno.json`, `package.json`, `deno.lock` if present, `LICENSE`, `NOTICE`, `tests/release_test.ts`, and all 5A measurements. Read `map/_adr/README.md` and the `discern-write-adr` skill so the report distinguishes evidence from an accepted decision. Verify anchors against the live tree.

## Background

The implementation deliberately starts without a layout or font dependency. That is not dogma; it is an experiment with a measurable baseline. A dependency earns its cost only if the real documentation corpus exposes a limitation that cannot be cured cleanly in the owned archetype algorithms and the candidate materially improves that limitation while retaining deterministic synchronous Deno execution, package-owned specs/scenes/presentation, terminal meaning, safe SVG, and acceptable distribution terms.

The Discern consumer is distributed under `FSL-1.1-ALv2`; this package is Apache-2.0. A package name, SPDX label, README claim, or secondary-source compatibility table is insufficient. Inspect the exact selected version's distributed licence files and complete resolved graph. Where licence interaction is genuinely uncertain, identify the uncertainty for owner/legal review and treat it as a blocker to adoption—not as permission.

External versions, maintenance, licences, and runtime behavior are time-sensitive. Browse current primary sources and record source URLs plus access dates. For technical claims use official repositories, release notes, package registries, documentation, and the candidate's own licence files; do not rely on the earlier research summary as current authority.

## Candidate frame

Start broad enough to falsify the shortlist, then spend benchmark effort only on candidates that survive the hard gates:

- the current bespoke archetype layouts (control);
- the current official Dagre package for layered flow layout;
- the current ELK JavaScript package for compound/orthogonal layout;
- a maintained in-process Graphviz/WASM binding, if its exact binary/licence/output graph survives preflight;
- build-time font-metric options such as the current maintained OpenType/font libraries only if 5A proves conservative metrics materially harm layout;
- no-dependency precomputed metrics or small owned algorithm improvements as controls.

Mermaid, D2, browser-driven renderers, external services, native binaries, JVM sidecars, and editor-oriented libraries may be screened with current evidence but need not be benchmarked when they require a DOM/browser/process/network, generate presentation outside the package scene, cannot satisfy deterministic hermetic Deno builds, or have an incompatible/uncertain distribution story. Record the reason rather than repeating a stale reputation.

## Hard gates

A candidate cannot receive an adoption recommendation unless the exact proposed integration can satisfy all of these:

1. Works in the supported Deno/JSR environment with explicit inputs and no network, filesystem, browser DOM, subprocess, clock, locale, or environment read at render time.
2. Equal input/version/options produce byte-equivalent coordinates or a canonicalizable result across repeated fresh processes on supported platforms.
3. Remains behind package-owned `DiagramSpec`, validation, `DiagramScene`, SVG, React, description, and CLI contracts; no third-party AST/layout object becomes public API.
4. Preserves synchronous public APIs unless a separately approved breaking ADR justifies otherwise. An async-only engine is not a transparent implementation detail.
5. Can be isolated to the smallest export/build graph so neutral consumers do not pay unrelated DOM, React, parser, binary, WASM, or font payloads.
6. The exact direct/transitive licence graph and bundled assets permit the intended package publication and use from the FSL-licensed Discern consumer, with all notice/source obligations identified. Uncertainty fails this gate pending qualified review.
7. Improves a measured release-corpus problem enough to justify download/build size, cold-start/compile cost, maintenance, upgrade surface, security exposure, and loss of owned control.

## Deliverables

Do not edit production manifests, imports, lockfiles, public source, generated output, or package versions. Keep experiments in an ignored temporary directory outside the repository or in test-owned temporary directories, and remove them when evidence is captured.

1. **State the measured problem before naming a solution.** From wave 5 evidence, identify concrete shortcomings—such as crossing count in supported flow cases, architecture container routing, label-fit compromises, implementation complexity, asset size, or build cost. Quantify the affected corpus and severity. If the owned system meets its supported contract and no real limitation warrants a dependency, say so; “a library might be more general” is not a problem statement.
2. **Verify current candidate identity and maintenance.** For each surviving candidate, record exact package/repository, current stable version, release date/cadence, runtime format, TypeScript support, Deno/JSR resolution behavior, browser/Node assumptions, API sync/async shape, declared and shipped licences, bundled assets/binaries, and direct/transitive graph. Link primary sources and retain small command/output excerpts or reproducible commands in the report without committing package caches.
3. **Audit licensing at the distributed artifact.** Download or inspect the exact registry tarball/release artifact in scratch space. Enumerate every runtime/build transitive package and bundled WASM/font/data asset with its licence file, SPDX expression, copyright/notice obligations, source/reciprocity conditions, and any dual-licence choice. Assess compatibility separately for publishing this Apache-2.0 package and consuming it from `FSL-1.1-ALv2`. Mark “clear from authoritative text,” “owner notice/action required,” or “qualified legal review required”; never silently choose a dual-licence branch or infer compatibility from popularity.
4. **Run hermetic Deno probes.** From scratch config, test import with no ambient permissions, typecheck, cold/warm execution, deterministic repeated layout, platform-independent canonicalization assumptions, failure behavior, graph size, and whether the candidate touches globals/DOM/process/filesystem/network. Test the exact integration layer proposed—not only the package's hello world. Record commands, Deno version, host facts that matter, and results.
5. **Benchmark the real release corpus.** Feed candidate adapters the same semantic cases and constraints as the owned system without changing public specs. Compare objective geometry (overlaps, crossings, edge length/bends, group containment, whitespace, label fit, supported/refused cases), determinism, output/graph size, initialization and representative render cost, and amount of adapter/sanitizer/canonicalizer code required. Separately conduct blind or side-by-side visual review of representative outputs using the Discern style projection. A candidate's own SVG styling does not count as a benefit if the package must discard it to preserve tokens/accessibility.
6. **Evaluate font work only against a proven typography defect.** If 5A found no supported-font clipping or unacceptable whitespace, close the font-library branch with that evidence. Otherwise compare an owned precomputed metric table, current font parser candidates used only at codegen, and the conservative approximation. Measure generated table/asset size, kerning/shaping fidelity, Unicode coverage, reproducibility, licence/notice burden, and whether embedded/subset fonts would harm accessibility or asset size. Runtime font parsing and text-to-path default output remain disqualified.
7. **Score total cost, not feature count.** Produce a compact decision matrix covering problem solved, visual improvement, deterministic behavior, sync/Deno fit, package graph and bytes, cold-start/build cost, security/maintenance surface, scene/API containment, terminal impact, accessibility impact, exact licence status, and removal/replacement cost. Give the bespoke baseline a row. Distinguish a candidate useful only for a future unsupported kind from one that improves today's supported contract.
8. **Write the dated assessment.** Add `map/_private/notes/diagram-dependency-assessment.md` with executive recommendation, measured baseline problem, methods/reproduction commands, source-linked facts, licence matrix, benchmark results, uncertainties, and a clear disposition for each candidate. The note is dated evidence, not timeless map truth. Update `map/25-diagrams/README.md` only if its present-tense architecture statement needs clarification; do not turn the map into a research log.
9. **Recommend exactly one next posture.** Choose among: retain the dependency-free implementation; run one narrower experiment because evidence is inconclusive; or propose one dependency-backed follow-up for a named measured limitation. If proposing adoption, write a **proposed**, not accepted, ADR describing the exact version boundary, isolation, licence/notice prerequisites, fallback/removal plan, API impact, and gates. Do not implement it or pre-empt owner/legal approval. If recommending no dependency, explain what future threshold would justify reopening the question; no ADR is required merely to memorialise that nothing changed.
10. **Leave a future build properly bounded.** If and only if adoption is recommended, include in the assessment a self-contained outline for a later implementation brief: exact owned module seam, tests/benchmarks that must improve, dependency/notice changes, fallback path, and public API non-goals. Do not add a speculative `7A` implementation file until the owner chooses the recommendation; that choice may materially change the prompt.
11. **Prove the review did not mutate the product.** Assert `deno.json`, `package.json`, lockfile, source, generated files, and publish graph contain no candidate dependency or experiment. Run documentation checks and the full discern gate appropriate to the branch. The only expected committed changes are the assessment, an optional proposed ADR/map clarification, and moving this brief.

## Constraints

- This wave may browse, download, and execute candidates only in scratch space for read-only evaluation. It cannot add, vendor, pin, import, generate from, or ship one in the repository.
- Use current primary sources and exact artifact licence files. Cite URLs and access dates. Clearly label inference and legal uncertainty.
- FSL compatibility is a release constraint, not a claim to improvise. Escalate ambiguity; do not offer legal advice or silently accept reciprocal/notice obligations.
- Compare candidates behind the existing package-owned spec/scene/projection boundary. Do not redesign the public API to make a candidate look viable.
- A general engine does not win by supporting more graph types than the package intentionally promises. Only real supported-corpus improvements count.
- Do not release, bump versions, edit the sibling Discern repository, or dispatch a follow-up implementation without fresh owner instruction.
- After the final edit, run `discern_prepare`, commit the resulting clean tree, then run `discern_done` once.

## Out of scope

- Production integration, dependency manifest/lock changes, new kinds, new public APIs, replacing the owned scene/SVG/CLI projections, font embedding, or asset generation changes.
- A full legal opinion, procurement/security approval, consumer release, package release, or downstream Discern adoption.
- Re-benchmarking tools that fail a hard gate merely to make the comparison table look comprehensive.

## Definition of done

- **Measurable:** a dated source-linked assessment identifies the real baseline limitation or proves none; current candidate/runtime/transitive/licence facts come from exact primary artifacts; reproducible Deno and corpus benchmarks compare surviving candidates with the bespoke control; the decision matrix and one clear recommendation are complete; any adoption recommendation has only a proposed ADR and bounded future outline; repository manifests/source/generated/publish graphs contain no candidate change; `discern_done` is green on clean committed HEAD.
- **Semantic:** the owner can decide whether a dependency earns its long-term product, legal, bundle, and maintenance cost from concrete Discern-shaped evidence—not aesthetics, feature lists, or stale package reputation—and a “keep the owned baseline” result is treated as a successful decision.
- **Housekeeping and authority:** in the final task commit, move this file to `map/_private/planning/diagram-system/_done/6a-dependency-review.md`. After the green proof, run `discern_accept`; a recorded grant may land the assessment, while a refusal means report the proof line and branch/worktree and stop for owner review. Do not create or dispatch a dependency implementation brief without a new owner decision.
