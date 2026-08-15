# Concepts at a glance

A short narrative that connects the dots — the mental model of discern-design-system in a few minutes. For precise per-term definitions, jump to the [glossary](glossary.md). For where each piece lives in code, follow the subsystem subtree READMEs.

> **Naming contract.** The canonical capitalised nouns defined in the [glossary](glossary.md) are used verbatim throughout this tree. Introduce them here, then use them — and only them — everywhere else. Do not invent synonyms.

---

## The shape of the system

The system turns **authored design sources into deterministic web and terminal renderings**. Four building blocks carry everything:

- **Tokens** — the named public custom properties (primitive values, semantic roles, and the branded Preset) that all styling resolves through.
- **Components** — 120 self-contained folders, each owning its CSS, implementation, examples, and Metadata, arranged in thirteen Groups.
- **The Runtime** — the emitted output set (`discern.css`, a Manifest, selection-scoped browser behavior when required, and any requested Optional Assets) that the Emitter writes into a consumer's build from a Selection.
- **The CLI surface** — pure terminal renderers over explicit capabilities, Token-derived themes, and generated per-Component CLI stances.

Codegen reads the Metadata and derives the Registry, React export surface, CLI stance registry, and CLI renderer exports. The Catalogue build combines that Metadata with Component examples and public TypeScript declarations, keeping its states, selection snippets, and prop evidence tied to the authored sources. Consumers state a Selection, and the Emitter resolves it into the requested bytes identically on every run.

---

## How it works, end to end

**Authoring.** A designer-developer edits Tokens in [`tokens.ts`](../../src/tokens/tokens.ts) or a Component folder under [`src/components/`](../../src/components/). Each Component's `*.meta.ts` declares its name, slug, Group, ordering, purpose memberships, usage guidance, accessibility notes, any selection-scoped browser behavior, and a required rendered or reasoned-exempt CLI stance. A rendered stance adds a React-free `*.cli.ts`; vocabulary shared with `*.tsx` lives in a neutral sibling module. Its examples module may add stable named Catalogue states.

**Generation.** `deno task codegen` ([`generate.ts`](../../scripts/generate.ts)) walks the Metadata and writes the generated surfaces in [`src/generated/`](../../src/generated/): the Registry (component IDs, Groups, dependencies, owned classes), the React surface, CLI registry and renderer barrel, base styles, and asset tables. Generated files are committed but never hand-edited; the quality gate regenerates them on every run.

**Emission.** A consumer calls `emitDesignSystemRuntime()` ([`runtime.ts`](../../src/runtime.ts)) with a Selection — explicit component IDs, canonical Groups, `all`, plus Optional Assets. The Emitter resolves dependencies and browser behavior through the Registry, orders output stably, and writes the Runtime: `discern.css` (Tokens, the selected Theme, Root-scoped foundations, utilities, and dependency-ordered component CSS), conditional `discern.js`, `manifest.json` (the Manifest: resolved Selection, Owned Classes, public token names, output paths, byte sizes, SHA-256 integrity), and only the Optional Assets requested. Identical inputs produce byte-identical output on Deno and Node alike.

**Consumption.** The consumer loads `discern.css`, loads every path in `manifest.outputs.scripts`, marks a boundary with `data-discern-root` (the Root), and writes semantic HTML against the public class and data-attribute contract. Components without declared browser behavior remain CSS-only, and declared behavior progressively enhances a usable static fallback. An unforced Root follows the user's system colour scheme; `data-discern-theme="light"` and `"dark"` are explicit overrides, while `"system"` states the default preference directly. React consumers may instead render the same contract to static HTML through the Adapter ([`react.ts`](../../src/react.ts)) at build time.

**Terminal consumption.** A consumer imports `./cli`, detects or declares its terminal colour depth, columns, and Unicode support, and passes those capabilities to a pure renderer. The renderer returns a bounded string. Light and dark terminal colours, ANSI fallbacks, spacing cells, and type attributes derive from the same Token metadata as web output. A Deno consumer may opt into `./cli/interactive`; its interaction state machines own raw input and repainting while delegating every form frame to the same Component renderers.

**Presentation.** The Catalogue ([`catalogue/`](../../catalogue/)) is the local web component browser: `deno task serve` builds the full Runtime plus the example registry and serves it for human review. The CLI Catalogue (`deno task catalogue:cli`) prints every rendered Component example, every reasoned exemption, and the generated Terminal motifs sheet; a Group, Component slug, or `motifs` narrows it. The CLI Playground (`deno task playground:cli`) is the live counterpart: named journeys exercise every high-level interactive API and browse the same generated inventory in a real terminal.

---

## What to read next

The `10-…` through `60-…` subtrees below are proposed but not yet written — filling them is tracked in [`discern/TODO.md`](../../discern/TODO.md). `70-cli/` and `80-development/` exist today.

| Want to understand...                                | Go to                    |
| ---------------------------------------------------- | ------------------------ |
| Tokens, semantic roles, Themes, and the Preset       | `../10-tokens-themes/`   |
| Component anatomy, Groups, and Metadata              | `../20-components/`      |
| Codegen and the generated surfaces                   | `../30-codegen/`         |
| The Emitter, Selections, and the Manifest            | `../40-runtime-emitter/` |
| The React Adapter and static rendering               | `../50-react-adapter/`   |
| The Catalogue and the build pipeline                 | `../60-catalogue/`       |
| Terminal capabilities, primitives, and CLI renderers | `../70-cli/`             |
| Working here: setup, testing, conventions, the gate  | `../80-development/`     |
