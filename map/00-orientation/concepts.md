# Concepts at a glance

A short narrative that connects the dots — the mental model of discern-design-system in a few minutes. For precise per-term definitions, jump to the [glossary](glossary.md). For where each piece lives in code, follow the subsystem subtree READMEs.

> **Naming contract.** The canonical capitalised nouns defined in the [glossary](glossary.md) are used verbatim throughout this tree. Introduce them here, then use them — and only them — everywhere else. Do not invent synonyms.

---

## The shape of the system

The system turns **authored design sources into a deterministic CSS bundle a consumer selects**. Three building blocks carry everything:

- **Tokens** — the named public custom properties (primitive values, semantic roles, and the branded Preset) that all styling resolves through.
- **Components** — 68 self-contained folders, each owning its CSS, implementation, examples, and Metadata, arranged in nine Groups.
- **The Runtime** — the emitted output set (`discern.css`, a Manifest, and any requested Optional Assets) that the Emitter writes into a consumer's build from a Selection.

Everything between those blocks is generated: Codegen reads the Metadata and derives the Registry, the React export surface, and the Catalogue, so no surface can disagree with the authored sources. Consumers never take a stylesheet wholesale — they state a Selection, and the Emitter resolves it into exactly those bytes, identically on every run.

---

## How it works, end to end

**Authoring.** A designer-developer edits Tokens in [`tokens.ts`](../../src/tokens/tokens.ts) or a Component folder under [`src/components/`](../../src/components/). Each Component's `*.meta.ts` declares its name, slug, Group, ordering, and accessibility notes.

**Generation.** `deno task codegen` ([`generate.ts`](../../scripts/generate.ts)) walks the Metadata and writes the generated surfaces in [`src/generated/`](../../src/generated/): the Registry (component IDs, Groups, dependencies, owned classes), the React surface, base styles, and asset tables. Generated files are committed but never hand-edited; the quality gate regenerates them on every run.

**Emission.** A consumer calls `emitDesignSystemRuntime()` ([`runtime.ts`](../../src/runtime.ts)) with a Selection — explicit component IDs, canonical Groups, `all`, plus Optional Assets. The Emitter resolves dependencies through the Registry, orders output stably, and writes the Runtime: `discern.css` (Tokens, the selected Theme, Root-scoped foundations, utilities, and dependency-ordered component CSS), `manifest.json` (the Manifest: resolved Selection, Owned Classes, public token names, byte sizes, SHA-256 integrity), and only the Optional Assets requested. Identical inputs produce byte-identical output on Deno and Node alike.

**Consumption.** The consumer loads `discern.css`, marks a boundary with `data-discern-root` (the Root), picks light or dark with `data-discern-theme`, and writes semantic HTML against the public class contract — no React and no browser runtime required. React consumers may instead render the same contract to static HTML through the Adapter ([`react.ts`](../../src/react.ts)) at build time.

**Presentation.** The Catalogue ([`styleguide/`](../../styleguide/)) is the local component browser: `deno task serve` builds the full Runtime plus the example registry and serves it for human review.

---

## What to read next

The numbered subtrees below are proposed but not yet written — filling them is tracked in [`discern/TODO.md`](../../discern/TODO.md). `80-development/` exists today.

| Want to understand...                               | Go to                    |
| --------------------------------------------------- | ------------------------ |
| Tokens, semantic roles, Themes, and the Preset      | `../10-tokens-themes/`   |
| Component anatomy, Groups, and Metadata             | `../20-components/`      |
| Codegen and the generated surfaces                  | `../30-codegen/`         |
| The Emitter, Selections, and the Manifest           | `../40-runtime-emitter/` |
| The React Adapter and static rendering              | `../50-react-adapter/`   |
| The Catalogue and the build pipeline                | `../60-catalogue/`       |
| Working here: setup, testing, conventions, the gate | `../80-development/`     |
