# Testing

_The testing approach in this repo — how tests are written, how they run, and
the patterns the gate assumes._

The `test` capability in `discern.toml` is what `discern done` runs; this doc
explains how to write tests that pass it and how to run them while iterating.

## How tests run

The gate's `test` capability is `deno task test`:

```sh
deno test --config deno.json --allow-read --allow-write --allow-env --allow-run tests
```

Two suites live under [`tests/`](../../tests/):

- [`design_system_test.ts`](../../tests/design_system_test.ts) — the package
  contract: namespace scoping, metadata auto-enrolment, Selection resolution,
  byte-for-byte determinism, asset independence, theme/contrast semantics, and
  the external consumer fixtures.
- [`release_test.ts`](../../tests/release_test.ts) — the publish contract:
  allowlisted publish set, module-graph containment, no import attributes,
  neutral-consumer artifact, documentation coverage, release identity coherence.

Cases run sequentially in one process (no `--parallel`), so ordering hazards
don't apply here — but every test still owns its state: fixtures are built in
`Deno.makeTempDir()` directories, never shared.

The broad permissions exist because the suites exercise real artifacts: they
spawn Deno subprocesses (`Deno.Command` on `Deno.execPath()`), and the release
suite shells `deno publish --dry-run --allow-dirty`. The external fixtures run
`--cached-only`, so tests need a warm cache (`deno install --frozen` first) but
**no network at test time** — a test that fetches at runtime is a defect.

Run one test while iterating:

```sh
deno test --config deno.json --allow-read --allow-write --allow-env --allow-run \
  --filter "all selection and repeated emission are byte-for-byte deterministic" tests
```

## How tests are written

- **Assert on real emitted bytes, not internals.** The suites emit a Runtime
  into a temp dir and parse the actual CSS, Manifest, and file tree (helpers
  like `publicCssGlobals` and `contrast` measure emitted output). Prefer
  extending those assertions over mocking anything — nothing here is mocked.
- **Class-level invariants, not instance checks.** Tests walk all Component
  folders and generated surfaces so a new Component auto-enrols in every
  guarantee (namespace, metadata, docs coverage) without a new test.
- **Consumer-contract changes get a fixture.** Anything promised to external
  consumers is proved from an _external_ temp project importing only documented
  exports — the neutral fixture declares no React dependency; the React fixture
  proves the Adapter's peer contract. Neither reaches into `dist/` or the repo
  itself.
- **Determinism is asserted, not assumed.** Repeat emission and compare SHA-256
  per file; any new emitted artifact must join that comparison.
