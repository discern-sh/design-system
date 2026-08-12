# Catalogue

The Catalogue is the local browser for every Component example, public Token, composition recipe, and Component selection. Run `deno task serve` and open the worktree's assigned port.

## Find the right component

Search covers Component names, Groups, descriptions, purposes, and usage guidance. The purpose selector in the Components section narrows the rendered Catalogue to documentation, tool output, procedural workflow, or marketing work. Every ordinary Component card carries its own Web/CLI surface switch; changing one leaves the other cards in place, while `?surface=cli` starts every card on its terminal specimen for review. The sidebar remains a complete Component index, independent of those controls. Search and purpose filters combine. `?purpose=<name>` restores the collection on a cold load.

Component Metadata owns purpose membership, `useWhen`, and `notWhen`. Every Workflow Component and each easily confused pair carries that guidance beside its examples.

Each Component presents its available supporting material in closed disclosures: Best practices first, then Selection and React import, then Props and variants. Best practices contains `useWhen`, `notWhen`, and author responsibilities when its Metadata supplies them.

## Copy source-backed configuration

Each Component exposes copyable runtime selection by slug, Group selection, and its React import. [`build.ts`](../../scripts/build.ts) derives them from the Metadata and adapter export.

Props and variants come from authored TypeScript through `deno doc --json`. Flat prop interfaces become tables and literal unions become variant values. Source unions stay omitted because flattening their branches would erase the contract; the Catalogue prints the reason.

Composition recipes live only in the styleguide. Each recipe renders a preview and produces copyable JSX from one structured definition. A recipe with a `journey` contract declares its ordered semantic stages; the conformance view renders every enrolled journey from that same recipe authority.

The CLI view is not a screenshot or a second set of fixtures. [`build.ts`](../../scripts/build.ts) statically enrolls each rendered Component's default CLI renderer and `cliExamples` beside its web examples. [`cli-preview.tsx`](../../styleguide/cli-preview.tsx) calls those renderers with the fixed 80-column truecolour Unicode profile, decodes the emitted SGR attributes into React spans, and places the result inside Terminal. Exempt Components remain visible with the reason from Component Metadata. The decoder fails closed when output exceeds its supported SGR subset, and a registry-wide test renders and projects every example.

## Link to a state

An examples module may export named `catalogueStates`; other Components receive a generated `default` state. Ordinary single-example cards omit the redundant Default label, while the state and its fragment remain enrolled. The fragment `#component-<slug>--<state>` restores and highlights the state after the app mounts. Command, Path reference, Diagnostic, and Table include stress states.

The toolbar reads the package version from `deno.json`, and conformance sheets repeat it in screenshots. The browser pass first checks every generated Component example, then runs the mandatory journey-resilience phase. Journey checks cover stage order, headings, landmarks, keyboard traversal, exact Command copies, and axe in both themes. Generic rendered-surface scans cover disclosure semantics, nested controls, minimum targets, page reflow at 390 pixels and the 320-pixel equivalent of 400% zoom, reduced motion, system-theme return, composited and visible semantic focus, and forced-colour focus.

The automated boundary is the Catalogue's rendered static surfaces and its declared theme consumer. Consumer application routes, product navigation, and manual screen-reader output remain consumer-level acceptance work.

## Initial render

Composition recipes and web examples remain mounted on the initial Catalogue route. The generated CLI modules are statically imported so browser compatibility and complete renderer enrollment fail at build time; their frames are computed only when the CLI surface renders. This local development instrument favours one inspectable inventory over route-level splitting.

## Where it lives

| Concern                                                                | Authority                                                                  |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Purpose vocabulary and usage fields                                    | [`component-meta.ts`](../../src/types/component-meta.ts)                   |
| Registry, snippets, prop evidence, CLI enrollment, and package version | [`build.ts`](../../scripts/build.ts)                                       |
| Filtering, surface and state links, and rendered instrumentation       | [`app.tsx`](../../styleguide/app.tsx)                                      |
| Browser terminal projection                                            | [`cli-preview.tsx`](../../styleguide/cli-preview.tsx)                      |
| Composition definitions                                                | [`compositions.tsx`](../../styleguide/compositions.tsx)                    |
| Browser assertions                                                     | [`conformance.ts`](../../scripts/conformance.ts)                           |
| Journey and rendered-surface resilience                                | [`resilience-conformance.ts`](../../scripts/resilience-conformance.ts)     |
| CSS-free journey grammar                                               | [`journey_resilience_test.tsx`](../../tests/journey_resilience_test.tsx)   |
| Authority guards                                                       | [`catalogue_instrument_test.ts`](../../tests/catalogue_instrument_test.ts) |
