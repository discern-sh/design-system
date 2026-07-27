# Testing

_The testing approach in this repo — how tests are written, how they run, and the patterns the gate assumes._

The `test` capability in `discern.toml` is what `discern done` runs; this doc explains how to write tests that pass it and how to run them while iterating.

## How tests run

The gate's `test` capability is `deno task test`:

```sh
deno task test
```

It runs `deno task test:unit`, then `deno task conformance`. Seven unit suites live under [`tests/`](../../tests/):

- [`artifact_family_test.tsx`](../../tests/artifact_family_test.tsx) — Workflow Artifact ordering, canonical state labels, deep-tree fidelity, and source semantics.
- [`catalogue_instrument_test.ts`](../../tests/catalogue_instrument_test.ts) — purpose, selection, prop, state-fragment, version, and composition authorities.
- [`design_system_test.ts`](../../tests/design_system_test.ts) — the package contract: namespace scoping, metadata auto-enrolment, Selection resolution, byte-for-byte determinism, asset independence, theme/contrast semantics, and the external consumer fixtures.
- [`docs_page_furniture_test.ts`](../../tests/docs_page_furniture_test.ts) — Task metadata, Agent handoff, and next-action composition contracts.
- [`journey_resilience_test.tsx`](../../tests/journey_resilience_test.tsx) — journey enrollment, CSS-free Procedure and Diagnostic grammar, and executable Command markup.
- [`release_test.ts`](../../tests/release_test.ts) — the publish contract: allowlisted publish set, module-graph containment, no import attributes, neutral-consumer artifact, documentation coverage, release identity coherence.
- [`serve_test.ts`](../../tests/serve_test.ts) — canonical Catalogue routing and path mapping.

Cases run sequentially in one process (no `--parallel`), so ordering hazards don't apply here — but every test still owns its state: fixtures are built in `Deno.makeTempDir()` directories, never shared.

The broad permissions exist because the suites exercise real artifacts: they spawn Deno subprocesses (`Deno.Command` on `Deno.execPath()`), and the release suite shells `deno publish --dry-run --allow-dirty`. The external fixtures run `--cached-only`, so tests need a warm cache (`deno install --frozen` first) but **no network at test time** — a test that fetches at runtime is a defect.

The conformance pass builds and serves the real Catalogue on an ephemeral local port, then drives installed Chrome through every generated Component example. Every example is scanned in light and dark against automated WCAG A/AA rules. Typed `conformance` exports beside interactive `*.examples.tsx` modules add keyboard, focus, relationship, state-change, and reusable layout assertions without a second Component manifest. The pass also checks a cold fragment URL, focused controls under forced colours, and writes light/dark narrow/wide plus forced-colour review sheets to `dist/conformance/`.

[`resilience-conformance.ts`](../../scripts/resilience-conformance.ts) is a mandatory second phase, not an optional scenario set. It discovers journey recipes and rendered Component surfaces from the Catalogue DOM. Its checks cover journey structure and both-theme axe scans, keyboard order and exact Command copies, disclosures, nested controls, minimum targets, reflow at 390 pixels and 400% zoom, reduced motion, system-theme return, theme geometry, tuned local-font fallbacks, and focus across semantic surfaces and forced colours. Semantic focus composites each indicator through element, ancestor, and opacity-filter effects, rejects hidden or unmodelled paint, and requires at least 3:1 contrast against the adjacent surface. A focus change to existing outline, shadow, or underline paint must also differ from its resting appearance by 3:1. Numeric geometry is parsed from complete computed CSS-pixel values. New outline, shadow, or underline paint qualifies; an existing outline's width or offset, each shadow layer's x, y, blur, or spread, or an underline's thickness must change by at least 2 CSS pixels. A rendered non-`none` outline is existing paint at every width. Outline-style and shadow-inset changes carry no numeric evidence. Paint on a parent or next sibling counts only when a native label or explicit ARIA relationship joins it to the target. Parent paint must remain control-sized, contain or intersect the target, and stay close to every target edge. An unmarked next sibling may be no wider or taller than 4 times the control scale and must remain within 2 control scales in distance. Checkbox, Switch, and Theme switcher instead declare `--discern-focus-proxy: 1` on their visual candidates; this candidate-local marker relaxes size and distance only when the input's native label contains both rectangles. Inherited markers receive no relaxation. The browser fixtures prove marked, unmarked, inherited, oversized, and remote proxies independently, alongside a 1-to-2-pixel outline change, 0.02-pixel shadow and underline changes, sub-threshold outline geometry, style-only and inset-only changes, new paint, 2-pixel geometry changes, subtle opacity and color changes, multi-filter opacity, invisible paint, and local parent paint while accent, success, warning, and danger targets auto-enrol in both themes.

This phase covers static Catalogue surfaces and the declared Catalogue theme consumer. Theme checks compare the consumer, control, sidebar, toolbar, and main geometry before and after a color-mode change. Font checks compare width and `normal` line boxes between the intended webfonts and each available metric-adjusted local alias, reporting every covered and skipped alias by name. [`font-metric-overrides.ts`](../../scripts/font-metric-overrides.ts) derives both the source audit and live browser cases from aliases in the public font-role stacks. It audits every face against the bundled target authorities: Crimson Pro uses 90% ascent, 21% descent, and 0% line gap; Inter uses 97%, 24%, and 0%. The shared CSS parser ignores comments outside strings, decodes escaped syntax, and reports each block at-rule's parent context and depth. Quoted family identities preserve their decoded whitespace; unquoted identities collapse CSS whitespace and comments. Both compare case-insensitively. Only top-level `@font-face` rules enter the live population. Each target `url()` source carries one quoted or identifier WOFF2 `format()` hint in source order. Family, style, weight, source, and metric descriptors must consume their complete values; malformed tails fail explicitly, and duplicate audited descriptors remain failures while the effective last value is still audited. The audit compares each effective face and each `url()` or `local()` source in both directions: every browser-selectable target source needs a matching authority, and every authority needs one live face. SHA-256 digests bind the authorised URL sources to their 3 target font files. This source guard remains complete on hosts without those local faces. Review sheets still carry cross-browser glyph rasterization, text wrapping, and full-page visual review. The phase does not replace consumer-level route testing, product navigation checks, or manual screen-reader acceptance. It uses the installed Chrome channel by default; `DISCERN_CHROME_PATH` selects a non-standard executable.

Run one test while iterating:

```sh
deno test --config deno.json --allow-read --allow-write --allow-env --allow-run \
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

## Suite audit ledger

The final accessibility-resilience audit on 2026-07-27 classified all 53 unit cases and judged every baseline class guard against the fresh-name test:

| Test file                      | Cases | Guard assessment                                                                                                                                                                                                                                                                                                |
| ------------------------------ | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `artifact_family_test.tsx`     |     6 | Canonical state arrays enroll future members; decoded CSS identifiers exclude warning and danger tokens from File change's own sheet, while the Runtime CSS surface registry enrolls every emitted stylesheet in its class-ownership boundary; complete WHATWG flow and phrasing populations guard annotations. |
| `catalogue_instrument_test.ts` |     4 | Metadata, generated registry, and recipe definitions are the authorities; no hand-listed Component population remains.                                                                                                                                                                                          |
| `design_system_test.ts`        |    26 | Folder, token, Runtime, and state vocabularies drive class guards; future aliases, quoted and unquoted family identities, top-level face context, ordered source modifiers, local shadows, and one-byte mutations prove browser enrollment and metric authority.                                                |
| `docs_page_furniture_test.ts`  |     4 | Closed Task states and each composition's own definition are the authorities; feature-specific cases assert distinct contracts.                                                                                                                                                                                 |
| `journey_resilience_test.tsx`  |     4 | Journey-marked recipes auto-enrol; three shipped sequences have an independent test oracle, plus unrelated and missing-middle synthetics.                                                                                                                                                                       |
| `release_test.ts`              |     7 | The publish allowlist, exported module graph, package declarations, and behavior opt-in authority provide the release populations.                                                                                                                                                                              |
| `serve_test.ts`                |     2 | The two cases pin distinct routing and deterministic-port contracts rather than a repeated class property.                                                                                                                                                                                                      |

No uncovered invariant or under-scoped guard remained after the final review corrections. The browser phase separately proves each generic rendered-DOM detector with a synthetic future sibling; local-font availability is reported rather than hidden.
