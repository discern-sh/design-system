# 2A — Make Web and CLI examples one guarded contract

**Goal:** Give every Component one precise, ordered example vocabulary that Web and CLI share by default, migrate the complete registry to it, and make silent name/order drift impossible for every future Component.

**Wave:** 2. This is the sole wave-2 stream. It starts only after 1A has landed and must land before the five wave-3 UI streams begin.

Other programme streams will follow. You own `2A` only; do not launch, dispatch, or supervise sibling briefs.

If sub-agents are available, use them after the shared contract and migration rules are committed: one coordinator owns the authority, generators, generated outputs, tests, final integration, and gate; up to four sub-agents migrate disjoint Component Group bundles. If sub-agents are unavailable, perform the same bundles in sequence. No sub-agent edits shared types, build scripts, generated files, the add-component skill, or another bundle.

## Orient, verify the prerequisite, then re-root

Work from `/Users/jack/Sites/discern-design-system`. Begin with `discern_status`. Verify wave 1A is present on `main` both by finding `map/_private/planning/catalogue-ux/_done/1a-catalogue-architecture-and-shell.md` and by confirming the Catalogue has route-family/page/style seams. If either check fails, stop and report the missing prerequisite.

Call `discern_start` with the literal name **`catalogue-2a`**, then re-root every operation into the returned absolute `data.path` and pass it to every discern tool.

After re-rooting, read:

- `AGENTS.md`, `map/00-orientation/design-principles.md`, `map/60-catalogue/README.md`, and the programme README;
- `src/types/component-meta.ts`, `src/cli/contracts.ts`, and `catalogue/conformance.ts`;
- the registry generation in `scripts/build.ts` and Component generation in `scripts/generate.ts`;
- `catalogue/cli-preview.tsx`, the post-1A shared Component-preview module, the post-1A shared-registry/example contract tests, `tests/catalogue_cli_preview_test.ts`, and `tests/cli/catalogue_test.ts`;
- representative paired sources: `src/components/display/window/window.examples.tsx` plus `.cli.ts`, a Forms Component, a Workflow Component, an exempt Component, and the complex Chart, Diagram, and Markdown Components;
- the authored `discern/skills/add-a-component/SKILL.md` (never edit the materialised `.agents/skills` copy directly).

Use the `discern-write-it-once` procedure to design the authority and future-member enrolment. Use `discern-cure-a-bug` when replacing drift-prone duplicated facts and tests.

## Background

Web states currently come from `catalogueStates` in `*.examples.tsx`, falling back to one synthetic `default`; CLI states come from `cliExamples` in `*.cli.ts`. CLI labels are mechanically title-cased from their ids. There is no cross-surface contract.

The result is complete drift: all 109 Components with rendered CLI stances currently have different Web and CLI example sequences. Examples such as Window (`standard`, `showcase` versus `titled`, `untitled`), Table (`default`, `dense-overflow`, `rich-cells` versus `status`, `responsive-rich`), and entire form lifecycle sets do not preserve identity when a person switches surface.

The owner has made the rule explicit: use the same examples for Web and CLI always, deviating only when it is literally impossible. “Existing fixtures differ”, “it would take more work”, and “the surfaces have different props” are not impossibility reasons. A shared example represents the same semantic posture, not necessarily identical prop shapes or pixels.

## Deliverables

### 1. Define the one cross-surface example contract

Create one framework-neutral per-Component authority that both React example modules, pure CLI renderer modules, the generated Catalogue registry, and tests can consume without importing React into the neutral/CLI graph.

The live-tree-informed design must provide:

- a stable kebab-case id;
- one human label shown on both surfaces;
- one canonical relative order;
- applicability to Web, CLI, or both;
- a mandatory specific reason for any single-surface applicability;
- enough type information or helpers for Web and CLI implementations to prove they implement the declared entry without sharing incompatible props.

The default is both surfaces. Make the exceptional path more explicit than the shared path. A CLI-exempt Component may derive its Web-only posture from the Component's existing non-empty CLI exemption instead of repeating that reason per example.

Choose the least public authority that remains genuinely single-source and fits the fixed Component anatomy. Plausible homes include framework-neutral metadata or an optional component sibling module; do not create a central 139-Component hand-maintained registry. If the best solution adds example facts to public `ComponentMeta`, changes the fixed anatomy, or materially changes generated public metadata, document the compatibility consequences and write an ADR before migrating the population.

The convention is binding:

- ids name meaning or posture, never a transport (`web-*`, `react-*`, `cli-*`);
- `default`, when present, is the representative baseline and is first;
- ordinary variants follow, then lifecycle/interaction states, then stress, narrow, reduced-capability, or fallback evidence;
- a capability override remains capability data unless that capability change is the scenario being taught;
- labels are human-readable and come from the authority, not ad-hoc title-casing;
- shared ids keep the same semantic intent even though Web and CLI props differ.

### 2. Make enrolment and projection fail closed

Update the source generators and generated Catalogue types so that build/codegen verifies every Component against its declared sequence.

- A Web state implementation must reference a declared Web-capable entry exactly once and in canonical order.
- A rendered CLI example must reference a declared CLI-capable entry exactly once and in canonical order.
- Undeclared, duplicate, missing, reordered, or silently surface-only examples fail generation with the Component slug and an actionable message.
- The generated registry exposes the canonical id and label to both preview projections. Remove `catalogue/cli-preview.tsx`'s independent `exampleLabel()` title-casing authority.
- A new Component or new example automatically joins the guard. No test may enumerate today's 109 rendered slugs by hand.
- Keep fragment ids stable where an existing id survives. Where migration changes an id, add a deliberate legacy-fragment upgrade only for links known to be part of the Catalogue contract; do not maintain an unbounded alias history.

Never hand-edit generated files. Change sources, run the producing task, and commit generated results only after the population migration is complete.

### 3. Migrate the complete Component population

Migrate every Component, including CLI-exempt Components where needed for the canonical Web vocabulary. Work from semantic scenarios, not from whichever surface currently has more entries.

For rendered Components:

- establish at least one genuinely shared representative example;
- split Web catch-all examples when they currently render many unrelated variants inside one unnamed `default` but CLI exposes distinct meaningful postures;
- consolidate or rename CLI fixtures when several implementation-level frames do not deserve separate human examples;
- keep stress and fallback evidence when it protects a real contract, but share it where the other surface can truthfully demonstrate the same stress;
- use a surface-only declaration only when the opposite medium cannot represent the fact without deception (for example, a terminal control-sequence capability with no browser analogue), and write a reason that names that incompatibility.

Do not achieve parity by renaming two unrelated scenarios to the same word. Do not turn every historical fixture into a Catalogue card. Exact renderer tests may retain additional test fixtures outside the human Catalogue example contract when those fixtures are quality evidence rather than catalogue-worthy examples.

After the coordinator commits the shared contract, parallel migration may use these disjoint bundles:

1. Agents + Workflow;
2. Docs + Editorial;
3. Core + Display + Navigation + People;
4. Forms + Feedback + Layout + Marketing + Artwork.

The coordinator reviews every surface-only exception and resolves cross-bundle naming consistency before generating outputs.

### 4. Make the convention visible and durable

- Update the authored `discern/skills/add-a-component/SKILL.md` so a new Component defines its canonical example vocabulary at birth, implements it on every applicable surface, records a real impossibility reason for deviations, and runs the parity guard. Run `discern refresh`; do not edit materialised skill copies.
- Update the relevant present-tense Catalogue map section so future agents know where example identity lives and how Web/CLI projection works. Do not maintain a hand-written list of examples.
- Add an Unreleased changelog entry if a public type, metadata surface, Component example contract, or fragment contract changes.
- If the migration intentionally changes many deep links, record the boundary and compatibility posture in an ADR.

### 5. Build guards that prove the class, not samples

Add focused tests that mechanically traverse the live component population and prove:

- canonical ids, labels, ordering, and uniqueness;
- full implementation coverage on each declared surface;
- zero undeclared divergence;
- every surface-only entry has a non-empty, component-specific impossibility reason;
- every rendered Component has at least one shared semantic example;
- generated browser and stdout Catalogues show the canonical labels/order;
- the neutral/CLI module graph remains React-free;
- a synthetic future Component/example fails when it omits, duplicates, reorders, or silently changes a surface.

Prefer a generator-level or architectural test that automatically enrols future members. Keep renderer-specific frame tests where they protect output, but separate those fixtures from the human example vocabulary when appropriate.

### 6. Inspect representative Components visually

Run `deno task serve` on this worktree's deterministic port and leave it running. In the in-app browser, switch Web/CLI on a simple Component, a form lifecycle Component, a Workflow Component, and one complex Chart/Diagram/Markdown Component. Confirm the same named semantic sequence is recognisable on both and exceptions are rare, honest, and understandable. Do not redesign the detail page; wave 3A owns its layout. Report the exact Component preview URLs.

## Constraints

- One fact, one authority. A test that merely compares two duplicated arrays is a guard, not an authority; the design still needs one canonical vocabulary.
- Neutral and CLI graphs never import React or browser-only modules.
- Keep examples generic and catalogue-worthy. Product-specific copy and exhaustive test matrices stay out of the human Catalogue.
- Preserve exact renderer tests by moving non-catalogue fixtures to explicit test fixture authorities where necessary; do not delete quality evidence to make the names match.
- Never hand-edit generated surfaces. Regenerate from the source contract.
- Do not edit post-1A shell, route-family, or page-style modules. Page UX is owned by later streams.
- Commit the shared authority before population bundles, then commit migrations in reviewable Group-sized steps, then generated/integration changes.
- The gate is the bar. A clean typecheck is insufficient for a migration spanning every Component.

## Out of scope

- Component discovery/detail/Compare layout or control redesign.
- Foundations, Compositions, Terminal layout, overview, or landing-page UI.
- Adding the reusable overflow affordance.
- Raising muted text or tiny metadata prominence.
- Interface Builder changes or dedicated testing.
- Publishing a release.

## Definition of done

- Every Component has one canonical example vocabulary, and every rendered Component has at least one truthfully shared Web/CLI example.
- The effective Web and CLI ids, labels, and relative order are identical for shared entries across the complete generated registry.
- No single-surface example exists without a precise, reviewed impossibility reason; convenience or historical fixture shape is not accepted as a reason.
- Generation fails automatically on a future missing, duplicate, reordered, undeclared, or silently divergent example.
- CLI preview no longer invents labels, and browser/stdout projections consume the same canonical facts.
- Additional renderer test fixtures remain available where needed without bloating the human Catalogue example set.
- The authored add-component skill teaches the convention and `discern refresh` has materialised it correctly.
- Representative simple, lifecycle, Workflow, and complex Components have been visually checked on both surfaces at the exact live preview URLs, with the server left running.
- No shell/page redesign, muted-metadata pass, or Interface Builder work appears in the diff.
- After the last edit, run `discern_prepare`, commit all rewrites and generated changes in focused commits, then run `discern_done` on clean committed HEAD. Fix every diagnostic without loosening a guard or standard.
- Once green, run `discern_accept`. A recorded grant may land; without one it must refuse without mutation, after which report the proof line and `catalogue-2a` branch/worktree and stop for owner review.
- In the final commit, move this brief from `map/_private/planning/catalogue-ux/2a-cross-surface-example-contract.md` to `map/_private/planning/catalogue-ux/_done/2a-cross-surface-example-contract.md` (create `_done/` if needed).
