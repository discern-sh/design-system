# Catalogue

The Catalogue is the local browser for every Component example, public Token, composition recipe, and Component selection. Run `deno task serve` and open the worktree's assigned port.

## Find the right component

Search covers Component names, Groups, descriptions, purposes, and usage guidance. Purpose collections narrow the registry to documentation, tool output, procedural workflow, or marketing work. Search and purpose filters combine. `?purpose=<name>` restores the collection on a cold load.

Component Metadata owns purpose membership, `useWhen`, and `notWhen`. Every Workflow Component and each easily confused pair carries that guidance beside its examples.

## Copy source-backed configuration

Each Component exposes copyable runtime selection by slug, Group selection, and its React import. [`build.ts`](../../scripts/build.ts) derives them from the Metadata and adapter export.

Props and variants come from authored TypeScript through `deno doc --json`. Flat prop interfaces become tables and literal unions become variant values. Source unions stay omitted because flattening their branches would erase the contract; the Catalogue prints the reason.

Composition recipes live only in the styleguide. Each recipe renders a preview and produces copyable JSX from one structured definition. A recipe with a `journey` contract declares its ordered semantic stages; the conformance view renders every enrolled journey from that same recipe authority.

## Link to a state

An examples module may export named `catalogueStates`; other Components receive a generated `default` state. The fragment `#component-<slug>--<state>` restores and highlights the state after the app mounts. Command, Path reference, Diagnostic, and Table include stress states.

The toolbar reads the package version from `deno.json`, and conformance sheets repeat it in screenshots. The browser pass first checks every generated Component example, then runs the mandatory journey-resilience phase. Journey checks cover stage order, headings, landmarks, keyboard traversal, exact Command copies, and axe in both themes. Generic rendered-surface scans cover disclosure semantics, nested controls, minimum targets, page reflow at 390 pixels and the 320-pixel equivalent of 400% zoom, reduced motion, system-theme return, composited and visible semantic focus, and forced-colour focus.

The automated boundary is the Catalogue's rendered static surfaces and its declared theme consumer. Consumer application routes, product navigation, and manual screen-reader output remain consumer-level acceptance work.

## Initial render

Composition recipes remain mounted on the initial Catalogue route. The 5 recipes contribute 25,197 bytes to a 572,992-byte mounted body, or 4.40%; Component examples contribute 505,073 bytes. Deferring the recipes would retain their imports in the 1,722,630-byte unminified Catalogue bundle while removing about 25 KB of DOM and complicating the journey auto-enrollment. The measured render does not justify that trade.

## Where it lives

| Concern                                                | Authority                                                                  |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| Purpose vocabulary and usage fields                    | [`component-meta.ts`](../../src/types/component-meta.ts)                   |
| Registry, snippets, prop evidence, and package version | [`build.ts`](../../scripts/build.ts)                                       |
| Filtering, state links, and rendered instrumentation   | [`app.tsx`](../../styleguide/app.tsx)                                      |
| Composition definitions                                | [`compositions.tsx`](../../styleguide/compositions.tsx)                    |
| Browser assertions                                     | [`conformance.ts`](../../scripts/conformance.ts)                           |
| Journey and rendered-surface resilience                | [`resilience-conformance.ts`](../../scripts/resilience-conformance.ts)     |
| CSS-free journey grammar                               | [`journey_resilience_test.tsx`](../../tests/journey_resilience_test.tsx)   |
| Authority guards                                       | [`catalogue_instrument_test.ts`](../../tests/catalogue_instrument_test.ts) |
