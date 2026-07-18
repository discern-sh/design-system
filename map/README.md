# discern-design-system — the map

The agent-maintained map of discern-design-system: how the system fits together, inferred from the code and written by the coding agents that work here. Agents read it to ground their work and keep it current as the code changes; humans read it to orient — and to audit what their agents actually understand about the codebase.

**The map is the canonical account of how the system fits together.** It describes **only what currently exists in code** — present tense, no "will eventually". When a change alters something the map describes, the map changes with it; a stale map is a defect. If a fact lives here and also in code, the code is authoritative and the map must not drift from it.

If you're new, start with [00-orientation/](00-orientation/) and follow the trail.

---

## Reading order

### Start here

| Path                               | What's in it                                                                                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [00-orientation/](00-orientation/) | The shape of the system in plain English. Concepts, glossary, an ASCII system map, and the design principles. Read this once and the rest of the tree slots into place. |

### Subsystems

The subsystems are numbered subtrees, in the order a newcomer should read them — `10-…` through `80-…`. Each has a `README.md` tour plus deeper leaves. Rename and renumber freely — the numbers are a reading order, not a contract. The numbered subtrees below hold stub READMEs today; writing their leaves is tracked in [`discern/TODO.md`](../discern/TODO.md).

| Path                                       | What's in it                                                                                                                                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [10-tokens-themes/](10-tokens-themes/)     | Tokens (primitive, role, and Preset layers), light/dark Themes, and the Root-scoped foundation and utility CSS.                                                                                                          |
| [20-components/](20-components/)           | The 83 Component folders: anatomy, the eleven Groups, Owned Classes, and the authoring rules.                                                                                                                            |
| [30-codegen/](30-codegen/)                 | How `generate.ts` derives the Registry, React surface, base styles, asset tables, and example registry from Metadata.                                                                                                    |
| [40-runtime-emitter/](40-runtime-emitter/) | The Emitter: Selection resolution, deterministic output, the Manifest, and Optional Assets.                                                                                                                              |
| [50-react-adapter/](50-react-adapter/)     | The optional React Adapter: peer contract and build-time static rendering.                                                                                                                                               |
| [60-catalogue/](60-catalogue/)             | The local component browser: the styleguide app, the build pipeline, and the dev server.                                                                                                                                 |
| [80-development/](80-development/)         | Working on discern-design-system: getting set up, the testing approach, code conventions, and the [gate gotchas](80-development/done-gate-gotchas.md) the quality gate points at when a step fails in a non-obvious way. |

### Reference material

| Path           | What's in it                                                                                                                                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [_adr/](_adr/) | Architecture Decision Records — significant design decisions and their rationale, under continuous numbering. [`_adr/README.md`](_adr/README.md) is the canonical format.                                                  |
| `_internal/`   | Created when you first run the `discern-document-subsystem` skill — the documenter brief and per-subtree scope manifests for writing and refreshing this tree. Not part of the user-facing docs; kept for reproducibility. |

---

## How the map is produced and kept current

The map is seeded once by `discern setup`, then grown subtree-by-subtree with the `discern-document-subsystem` skill, which follows the brief it materializes at `_internal/documenter-agent-brief.md` the first time you run it. A single skeleton-and-orientation pass establishes the shared terminology and shape before any subtree is filled in.

Because the map is the canonical account, it must not drift from code. When you change something a doc describes — the architecture, the data model, a subsystem's documented behaviour, a public convention, or whether a feature exists — update the affected docs in the same change.

---

## Conventions

- **File links** use relative paths from inside this tree: `[some module](../src/path/Thing.ext)`. Never a leading `map/` from within the tree.
- **Terminology** follows the [glossary](00-orientation/glossary.md). The project's canonical nouns are defined there once; synonyms are not introduced.
- **No modal verbs about the system** ("should", "would", "could", "will eventually"). Every claim describes what exists in code today. Half-built or deprecated things live under a "Current state & gotchas" heading and are called out plainly.
- **Diagrams are ASCII-first**, so they live in the text and stay diffable. A richer rendered image is the exception, not the default.
- **Outstanding work does not live here.** The map says what _is_; the deferred-work ledger at `discern/TODO.md` tracks what is _owed_.
