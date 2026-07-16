# Code conventions

_The rules the tooling enforces, and the conventions to follow when writing code
here._

This doc is the detailed companion to the **Conventions** section of the project
guidance (`guidance.md`). The guidance holds the short, agent-facing form; this
doc holds the full reasoning and examples. Keep the two in step, and keep both
aligned with what the `[capabilities]` in `discern.toml` actually enforce — the
written rule and the enforced rule must never disagree.

## What the gate enforces

- **Formatting — `deno fmt`** (via `deno task fix` in the fix stage) formats
  TypeScript, CSS, JSON, and markdown, including this documentation tree.
  Excluded: `dist/`, `src/generated/`, `styleguide/generated/`, and the three
  compiled agent files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`), which discern
  regenerates from `discern/guidance.md` — edit the source, run
  `discern refresh`, never the copies.
- **Codegen currency** — the fix stage runs `deno task codegen`, so
  `src/generated/` and `styleguide/generated/` always match the Metadata.
  Hand-edits to generated files are overwritten on the next gate run; CI fails a
  stale generation independently.
- **Linting — `deno task lint`** (`deno lint --no-config`, default rule set)
  over `src`, `styleguide`, `scripts`, and `tests`.
- **Type-checking — `deno task typecheck`** checks every public entrypoint and
  the scripts under the strict compiler options in
  [`deno.json`](../../deno.json): `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride`,
  `noFallthroughCasesInSwitch`, `noImplicitReturns`, `noUnusedLocals`,
  `noUnusedParameters`, `useUnknownInCatchVariables`, `verbatimModuleSyntax`.
  Satisfy the flag, never loosen it. `verbatimModuleSyntax` means type-only
  imports must say `import type`.
- **Build** — `deno task build` assembles the Catalogue into `dist/`, then the
  Catalogue itself is type-checked (`deno task check:catalogue`).
- **Tests** — `deno task test` (see [testing.md](testing.md)).
- **`css_size` standard** — full-catalogue `dist/discern.css` bytes are measured
  on every gate run against a never-worsen ceiling in `discern.toml`. If a
  change trips it, shrink the CSS or justify the growth to the maintainer —
  never raise the limit in a branch (the gate blocks loosened limits, and
  `discern standards --pin` is the only sanctioned way to tighten).

## Conventions to follow

The load-bearing rules live in the
[design principles](../00-orientation/design-principles.md); these are the
working-level habits that keep changes inside them:

- **Component anatomy is fixed.** `src/components/<group>/<slug>/` owns
  `<slug>.css`, `<slug>.tsx`, `<slug>.meta.ts`, `<slug>.examples.tsx`, and
  `mod.ts`. Adding a Component is: create the folder, write the five files, run
  `deno task codegen` — no registration edits anywhere else.
- **Naming:** files and slugs are kebab-case; class names come from
  `semanticClass` and follow BEM-ish `discern-<block>__<element>--<modifier>`;
  every public CSS name (class, custom property, data attribute, keyframe,
  layer) carries the `discern` prefix.
- **Public API changes are contract changes.** Anything exported from a
  documented entrypoint, any public Token name, any Manifest field, and any
  Owned Class is public. A change needs: symbol documentation (the release test
  fails undocumented exports), a `CHANGELOG.md` entry, and a SemVer-consistent
  version plan.
- **Examples stay generic.** Product claims, customer names, routes, commands,
  and bespoke artwork belong to consumers and enter through props or slots.
- **Error handling:** the Emitter validates its inputs (e.g. `outputRoot` must
  end in `/`) and throws typed `Error`s with actionable messages; catch clauses
  type errors as `unknown` (`useUnknownInCatchVariables`) and narrow before use.
- **No new runtime dependencies.** The package graph imports only the standard
  library (`@std/*`) in tests/scripts and React solely behind `./react`. A new
  dependency in the neutral graph is a contract event, not a convenience.
