# Testing

_The testing approach in this repo — how tests are written, how they run, and the patterns the gate assumes._

The `test` capability in `discern.toml` is what `discern done` runs; this doc explains how to write tests that pass it and how to run them while iterating.

## How tests run

The gate's `test` capability is `deno task test`:

```sh
deno task test
```

It runs `deno task test:unit`, then `deno task conformance`. Representative cross-cutting suites under [`tests/`](../../tests/) include:

- [`artifact_family_test.tsx`](../../tests/artifact_family_test.tsx) — Workflow Artifact ordering, canonical state labels, deep-tree fidelity, and source semantics.
- `catalogue_*_test.ts` files — shared registry and search authorities plus route-family-owned Component, Composition, Compare, route, terminal, and serving contracts. Each family grows its own file instead of a mixed Catalogue suite.
- [`design_system_test.ts`](../../tests/design_system_test.ts) — the package contract: namespace scoping, metadata auto-enrolment, Selection resolution, byte-for-byte determinism, asset independence, theme/contrast semantics, and the external consumer fixtures.
- [`docs_page_furniture_test.ts`](../../tests/docs_page_furniture_test.ts) — Task metadata, Agent handoff, and next-action composition contracts.
- [`journey_resilience_test.tsx`](../../tests/journey_resilience_test.tsx) — journey enrollment, CSS-free Procedure and Diagnostic grammar, and executable Command markup.
- [`release_test.ts`](../../tests/release_test.ts) — the publish contract: allowlisted publish set, module-graph containment, no import attributes, neutral-consumer artifact, documentation coverage, release identity coherence.
- [`serve_test.ts`](../../tests/serve_test.ts) — canonical Catalogue routing and path mapping.
- [`viewport_ownership_test.ts`](../../tests/viewport_ownership_test.ts) — the single temporary-viewport authority, exact restoration after success or failure, and the tracked-source ban on unowned viewport mutation.

Cases run sequentially in one process (no `--parallel`), so ordering hazards don't apply here — but every test still owns its state: fixtures are built in `Deno.makeTempDir()` directories, never shared.

The broad permissions exist because the suites exercise real artifacts: they spawn Deno subprocesses (`Deno.Command` on `Deno.execPath()`), query the host to launch the font audit's installed browser, and the release suite shells `deno publish --dry-run --allow-dirty`. The external fixtures run `--cached-only`, so tests need a warm cache (`deno install --frozen` first) but **no network at test time** — a test that fetches at runtime is a defect.

The conformance pass builds and serves the real Catalogue on an ephemeral local port, then drives installed Chrome through every generated Component example. Every example is scanned in light and dark against automated WCAG A/AA rules. Typed `conformance` exports beside interactive `*.examples.tsx` modules add keyboard, focus, relationship, state-change, and reusable layout assertions without a second Component manifest. The pass also checks a cold fragment URL, focused controls under forced colours, and writes light/dark narrow/wide plus forced-colour review sheets to `dist/conformance/`.

[`resilience-conformance.ts`](../../scripts/resilience-conformance.ts) is a mandatory second phase. It discovers journey recipes and rendered Component surfaces from the Catalogue DOM. Its checks cover journey structure and both-theme axe scans, keyboard order and Command copies, disclosures, nested controls, minimum targets, reflow at 390 pixels and 400% zoom, reduced motion, system-theme return, theme geometry, tuned local-font fallbacks, and semantic-surface focus.

Semantic focus has a bounded browser contract. In light and dark, the check mounts a Button on the canonical accent, success, warning, and danger surfaces. Real keyboard Tab must give each Button `:focus-visible` and a visible outline at least 2 CSS pixels wide using `--discern-color-accent-500`. [`design_system_test.ts`](../../tests/design_system_test.ts) proves that token reaches 3:1 against those surfaces in both themes. The Catalogue-wide forced-color pass checks every focusable Component. Arbitrary rendered-pixel stability belongs in manual and visual review.

Temporary viewport changes run only through [`withViewport`](../../scripts/viewport.ts), which restores the prior size in `finally` and refuses an unbounded page it cannot restore. The resilience phase starts at 1440×1000 and fails if an earlier phase changed it. The unit guard scans tracked TypeScript for direct viewport mutations, so a new temporary consumer must join the transactional path.

This phase covers static Catalogue surfaces and the declared Catalogue theme consumer. Theme checks compare the consumer, control, sidebar, toolbar, and main geometry before and after a color-mode change. Font checks compare width and `normal` line boxes between the intended webfonts and each available metric-adjusted local alias, reporting every covered and skipped alias by name. [`font-metric-cssom.ts`](../../scripts/font-metric-cssom.ts) feeds the authored CSS to `CSSStyleSheet.replaceSync()` and records browser-normalized descriptors from each `CSSFontFaceRule`. Root faces enroll. Faces under media, supports, container, layer, and scope grouping rules also enroll; style-rule and unsupported ancestors fail. A lexical count decodes escaped `@font-face` names outside comments and strings, then must equal the CSSOM population. This catches source that browser recovery discards.

[`font-metric-overrides.ts`](../../scripts/font-metric-overrides.ts) audits the snapshot against the bundled target authorities: Crimson Pro uses 90% ascent, 21% descent, and 0% line gap; Inter uses 97%, 24%, and 0%. Quoted family identities preserve their decoded whitespace; unquoted identities collapse CSS whitespace and comments. Both compare case-insensitively. Each target `url()` source carries one quoted or identifier WOFF2 `format()` hint in source order. Function names must touch their opening parenthesis. Family, style, weight, source, and metric descriptors consume their complete values. Raw-source policy retains duplicate-descriptor and malformed-tail failures that CSSOM normalization removes. It also rejects decoded `@import` rules outside comments and strings. Move imported rules into the asset so browser-loaded faces cannot bypass the population audit. The audit compares each effective face and each `url()` or `local()` source in both directions: every browser-selectable target source needs a matching authority, and every authority needs one live face. SHA-256 digests bind the authorized URL sources to their 3 target font files. This source guard remains complete on hosts without those local faces. Before geometry is measured, [`font-availability.ts`](../../scripts/font-availability.ts) explicitly loads both the required target and optional local alias at every probe weight; an absent alias is reported as a machine-specific skip, while an unresolved target fails conformance. Review sheets still carry cross-browser glyph rasterization, text wrapping, and full-page visual review. The phase does not replace consumer-level route testing, product navigation checks, or manual screen-reader acceptance. It uses the installed Chrome channel by default; `DISCERN_CHROME_PATH` selects a non-standard executable.

Run one test while iterating:

```sh
deno test --config deno.json --allow-read --allow-write --allow-env --allow-run --allow-sys \
  --filter "all selection and repeated emission are byte-for-byte deterministic" tests
```

Run only the browser harness while iterating:

```sh
deno task conformance
```

## How tests are written

- **Assert on real emitted bytes, not internals.** The suites emit a Runtime into a temp dir and parse the actual CSS, Manifest, and file tree (helpers like `publicCssGlobals` and `contrast` measure emitted output). Prefer extending those assertions over mocking anything — nothing here is mocked.
- **Class-level invariants, not instance checks.** Tests walk all Component folders and generated surfaces so a new Component auto-enrols in every guarantee (namespace, metadata, docs coverage, browser accessibility, and review rendering) without a new test.
- **Consumer-contract changes get a fixture.** Anything promised to external consumers is proved from an _external_ temp project importing only documented exports — the neutral fixture declares no React dependency; the React fixture proves the Adapter's peer contract. Neither reaches into `dist/` or the repo itself.
- **Determinism is asserted, not assumed.** Repeat emission and compare SHA-256 per file; any new emitted artifact must join that comparison.
- **Full-viewport terminal work proves all three layers.** Keep semantic key, mouse, link-resolution, and resize transitions pure, render exact frames against explicit `TerminalCapabilities`, then drive the public operation through `FakeTerminalIO`. Use `TerminalTestEvent` plus `enqueueTerminalEvents()` for ordered text, named-key, typed mouse, resize, and EOF scripts; `encodeTerminalMouseEvent()` and `enqueueMouse()` own valid SGR bytes so tests state button, wheel, coordinate, and modifier facts. Use one raw string chunk when the class under test is burst backpressure: prove every wheel tick applies, the batch paints once, Ctrl+C pre-empts it, and reports queued in later chunks are consumed before restoration without swallowing adjacent text. Scrolling guards must walk every valid rendered-row offset through documents with blank and repeated structural rows, then separately prove a real resize chooses the repeated anchor nearest its proportional fallback. Assert the returned value only after mouse modes, raw mode, cursor visibility, alternate screen, resize/cancellation observers, and signals have restored. Refusal tests must show zero writes before initial mutation, while fault tests inject resolver, decoder, renderer, writer, resize, EOF, cancellation, and SIGINT failures through the real effects boundary. For link hit testing, assert one-based terminal-cell ranges from `projectTerminalCellRows()` rather than JavaScript indices or parsed ANSI.
- **Review viewport behavior as cells, then as pixels.** `inspectTerminalLayout()` is the width/fold oracle and `projectTerminalInspectorHtml()` is the browser review surface. The Markdown browser's Catalogue fixture owns 40×24, 80×24, 120×30, and 80×40 profiles; `markdownBrowserReviewArtifacts()` enrolls the initial picker, split reader, keyboard-focused and pointer-targeted links, a mouse-focused picker, a resolved internal fragment, single-pane fallback, no-colour link focus, and a narrow-to-wide resize result. Browser-render those inspector fragments for visual evidence rather than treating text snapshots as visual review.

## Suite audit ledger

The final accessibility-resilience audit on 2026-07-27 classified all 56 unit cases and judged every baseline class guard against the fresh-name test:

| Test file                     | Cases | Guard assessment                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------- | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `artifact_family_test.tsx`    |     6 | Canonical state arrays enroll future members; decoded CSS identifiers exclude warning and danger tokens from File change's own sheet, while the Runtime CSS surface registry enrolls every emitted stylesheet and valid `class~=` or `class=` selector in its ownership boundary; complete WHATWG flow and phrasing populations guard annotations. |
| `catalogue_*_test.ts` family  |    21 | Metadata, generated registries, route descriptors, search providers, and recipe definitions enroll future members; route-family behavior stays in the owning test file.                                                                                                                                                                            |
| `design_system_test.ts`       |    26 | Folder, token, Runtime, and state vocabularies drive class guards; CSSOM recovery and grouping contexts, future aliases, quoted and unquoted family identities, ordered source modifiers, local shadows, and one-byte mutations prove browser enrollment and metric authority.                                                                     |
| `docs_page_furniture_test.ts` |     4 | Closed Task states and each composition's own definition are the authorities; feature-specific cases assert distinct contracts.                                                                                                                                                                                                                    |
| `journey_resilience_test.tsx` |     4 | Journey-marked recipes auto-enrol; three shipped sequences have an independent test oracle, plus unrelated and missing-middle synthetics.                                                                                                                                                                                                          |
| `release_test.ts`             |     7 | The publish allowlist, exported module graph, package declarations, and behavior opt-in authority provide the release populations.                                                                                                                                                                                                                 |
| `serve_test.ts`               |     2 | The two cases pin distinct routing and deterministic-port contracts rather than a repeated class property.                                                                                                                                                                                                                                         |
| `viewport_ownership_test.ts`  |     3 | Tracked TypeScript auto-enrols in the raw-mutation ban; the viewport helper proves exact restoration after success and failure and refuses state it cannot restore.                                                                                                                                                                                |

No uncovered invariant or under-scoped guard remained after the final review corrections. The browser phase separately proves each generic rendered-DOM detector with a synthetic future sibling; local-font availability is reported rather than hidden.
