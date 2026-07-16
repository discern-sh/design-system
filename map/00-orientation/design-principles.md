# Design principles

The handful of rules the discern-design-system codebase keeps coming back to.
Each one shows up in dozens of decisions; together they explain why the system
is shaped the way it is.

These are **hard requirements**. They apply to **every** change, in every area
of the codebase — not just the part you happen to be touching. Read them once in
full; the one-line forms exist for quick recall once you have.

If a change you are about to make violates one of these, treat that as a signal
to **question the change, not the principle**. There is one escape hatch, and it
is deliberate: to override a principle on purpose, **write an Architecture
Decision Record** (see [`../_adr/`](../_adr/)) that states what you are
overriding and why. A principle bent silently is a bug; a principle bent on the
record is a decision.

---

## 1. Everything public wears the `discern` namespace inside an opted-in root

Every class, custom property, data attribute, keyframe, and cascade layer the
package emits is `discern`-prefixed, and every generated foundation applies only
beneath `:where([data-discern-root])`. The package never styles a consumer's
page outside that boundary, and it never claims an unprefixed global name.

**Why it matters.** This package drops into pages that already have their own
CSS. An unscoped rule or an unprefixed name collides with consumer styles in
ways the consumer cannot debug or override; zero-specificity scoping under an
explicit root is what makes adoption safe and removal clean.

**How it shows up.** [`foundation.css`](../../src/styles/foundation.css) scopes
every foundation rule with `:where([data-discern-root])`;
[`semantic-class.ts`](../../src/semantic-class.ts) builds `discern-*` class
names; the test "runtime globals are branded and defaults stay inside the
opted-in root" in [`design_system_test.ts`](../../tests/design_system_test.ts)
fails any emitted global that escapes the namespace or the root.

## 2. Component metadata is the single source; generated surfaces are never hand-edited

Each component folder owns its `*.meta.ts`, CSS, implementation, examples, and
`mod.ts`. The runtime registry, React export surface, catalogue registry, and
dependency graph are all generated from that metadata by `deno task codegen` —
never edited directly.

**Why it matters.** The same component facts feed four surfaces. Hand-editing a
generated file forks a fact: the next codegen run silently reverts it, or worse,
the surfaces disagree about what components exist and what they depend on.

**How it shows up.** [`generate.ts`](../../scripts/generate.ts) writes
`src/generated/` (registry, React surface, assets, base styles) from the
`*.meta.ts` files; the test "component metadata auto-enrols React and runtime
surfaces" proves a new component folder needs no manual registration; CI fails
if `deno task codegen` produces a diff, and the quality gate runs codegen as a
fix stage so the generated files can never go stale on a gated change.

## 3. The neutral core never resolves React

The root, `./manifest`, `./runtime`, `./tokens`, and `./theme/discern` module
graphs import no React. React lives only behind the optional `./react` adapter,
as an 18.3+ peer contract, and is a build-time renderer: consumers ship static
HTML and CSS, never a React bundle or hydration.

**Why it matters.** The package's promise is framework-neutrality. One stray
React import in the neutral graph forces every non-React consumer to install
React just to emit CSS — a contract break that type-checks fine locally and only
explodes in a consumer's project.

**How it shows up.** The release test "the publish-shaped artifact serves the
neutral consumer alone" in [`release_test.ts`](../../tests/release_test.ts)
builds an external Deno project with no React dependency and runs it
`--cached-only`; only [`react.ts`](../../src/react.ts) resolves the adapter;
`react` and `react-dom` are peer/development dependencies only.

## 4. Emission is deterministic and selection-scoped

The runtime emitter writes byte-for-byte identical output for identical inputs,
in stable order, with SHA-256 integrity recorded in `manifest.json`. It emits
only what the consumer selected: dependencies resolve from generated metadata,
unrelated groups are excluded, and no optional asset is copied unrequested.

**Why it matters.** Consumers commit or cache emitted output and diff rebuilds;
nondeterminism turns every rebuild into churn and every integrity hash into
noise. Unselected output is dead bytes a consumer cannot audit and did not agree
to serve.

**How it shows up.** [`runtime.ts`](../../src/runtime.ts) resolves selections
against the generated registry and replaces the dedicated `outputRoot` on every
emission; the tests "all selection and repeated emission are byte-for-byte
deterministic", "selection resolves dependencies and excludes unrelated groups",
and "font and grain assets are independent, licensed, and integrity-mapped" pin
each half of the promise.

## 5. Themes move tokens, never component CSS

Semantic roles (canvas, ink, accent, success, warning, danger, and the
deliberately non-inverting inverse roles) are the theme surface. Light/dark
selection and consumer branding happen by overriding public custom properties —
the branded blue preset is itself just a token layer — and component stylesheets
stay byte-identical across every theme.

**Why it matters.** The moment a theme forks a component stylesheet, every
component fix must land per-theme and themes drift apart. Token-only theming is
also what keeps role semantics intact — a green-branded consumer must still be
able to tell "brand action" from "successful outcome".

**How it shows up.** Roles live in [`tokens.ts`](../../src/tokens/tokens.ts);
the preset in [`theme/discern.ts`](../../src/theme/discern.ts) sets only public
tokens; [`green-theme.css`](../../tests/fixtures/green-theme.css) re-brands
without touching component CSS, and the test "default blue and green themes
share component CSS and preserve state semantics" fails a theme that forks or an
accent that swallows success.

## 6. Accessibility invariants are tested contract, not garnish

Light and dark text contrast, accent/success/warning/danger distinguishability,
reduced-motion behaviour, forced-colours focus visibility, and the
`--discern-font-size-xs` interface-text floor are package tests. A change that
regresses one does not ship.

**Why it matters.** Accessibility regressions are invisible in the happy-path
demo — they surface for the user in dark mode, at high zoom, with motion
disabled, or in forced-colours mode, long after the change merged. Encoding the
invariants as tests moves them from reviewer vigilance to gate arithmetic.

**How it shows up.** The contrast helpers and theme assertions in
[`design_system_test.ts`](../../tests/design_system_test.ts) measure real
emitted CSS; component `*.meta.ts` files carry accessibility notes rendered into
the catalogue; `--discern-font-size-xs` in
[`tokens.ts`](../../src/tokens/tokens.ts) is the authored floor for interface
text.

## 7. The published contract is guarded like the public API it is

This package serves public JSR consumers. Public classes, tokens, exports, the
manifest schema, and `ownedClasses` are contract: versions are immutable,
releases follow SemVer, every breaking change lands in the changelog, every
public symbol is documented, and the publish set is allowlisted.

**Why it matters.** JSR versions cannot be edited after the fact — a leaked
private file, an undocumented export, or an unrecorded breaking change is
permanent. Consumers pin against the manifest and the class contract; loosening
either quietly breaks builds the maintainer never sees.

**How it shows up.** [`release_test.ts`](../../tests/release_test.ts) enforces
the publish allowlist, module-graph containment, symbol documentation coverage,
and config/changelog identity coherence; `deno publish --dry-run` runs in CI;
[`publish.yml`](../../.github/workflows/publish.yml) refuses a tag that
disagrees with `deno.json`'s version; [`CHANGELOG.md`](../../CHANGELOG.md)
records every contract change.

---

## What these add up to

A consumer can adopt any slice of this system — one component, one group, or the
whole catalogue — and trust three things: nothing leaks outside the root they
opted in (1), the bytes they get are reproducible and only what they chose (4),
and re-branding it never costs them component fidelity or role semantics (5).
The other principles are what keep that promise cheap to maintain:
metadata-driven generation (2) means the registry, adapter, and catalogue cannot
disagree about what exists; core neutrality (3) means the promise holds for
consumers who have never installed React; and the tested accessibility and
release contracts (6, 7) turn "safe to upgrade" from a hope into a gate. Every
principle trades a little authoring convenience for a lot of consumer trust —
that is the system's character.

When you propose a change that violates one of these principles, that is a
signal to question the change — not the principle. If you have a genuinely good
reason to override one, write an ADR (see [`../_adr/`](../_adr/)).
