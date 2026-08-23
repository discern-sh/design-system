# Catalogue

The Catalogue is the routed local browser for every Component example, public Token, terminal foundation sheet, web and terminal composition recipe, and Component selection. Run `deno task serve` and open the worktree's assigned port.

Its ordinary routes separate discovery from exhaustive review:

- `/catalogue/` is a small overview rather than a complete inventory.
- `/catalogue/components/` browses generated Groups and task-oriented collections without mounting Component specimens.
- `/catalogue/components/<slug>/` mounts one complete Component contract.
- `/catalogue/foundations/`, `/catalogue/compositions/`, and `/catalogue/terminal/` own their bounded inventories.
- `/catalogue/review/` asks for a Group, purpose collection, or explicit complete-system scope before mounting comparison sheets.

The server returns the same authored shell for every explorer route. Route facts live in `catalogue/routes.ts`; static assets use mount-absolute `/catalogue/…` URLs so nested detail routes never resolve against the Component slug.

The Catalogue also hosts the [Beta interface builder](interface-builder.md), a safe adaptive composition surface at `/catalogue/builder/` that renders real Components on an inert inspection canvas and exports consumer TSX with its runtime selection. Its link is deliberately secondary to the Catalogue's primary routes while the owner evaluates it through real consumer use.

## Find the right component

The toolbar Search Palette presents explicit routed destinations across Component names, Groups, descriptions, purposes, usage guidance, Tokens, terminal foundations, and web or terminal composition recipes. Press `/` outside a form control to open it. Selecting a Component result opens its detail route directly instead of scrolling through an already-mounted inventory.

The Component explorer starts with generated Group and purpose cards. Search, Group, and purpose controls reveal compact Component links; they never mount the full specimen. A detail route carries the ordinary Component card's Web/CLI surface switch and supporting disclosures. Review mode retains the multi-Component surface switch and accepts `?surface=cli` for a reproducible initial posture. Group, purpose, and complete-system review scopes are URL-addressable.

The sidebar is contextual: the explorer lists Groups and purposes, a Component detail lists its Group beside a return link to that filtered collection, and each foundation or composition route lists its local anchors. Query and fragment destinations carry their own active state, while the package identity sits in a monospaced footer at the bottom of the navigation. Below the desktop breakpoint the sidebar becomes an explicit modal navigation drawer rather than disappearing. The old one-page `#component-*`, `#group-*`, Token, Composition, and terminal-layout fragments upgrade in place to their routed equivalents, preserving Component state fragments and native `:target` highlighting where the detail route still owns the target.

The toolbar uses Theme toggle because it is persistent page chrome: it resolves an initial System preference to light or dark, then exposes only the opposite comfort state. Theme switcher remains the three-way choice for settings and inspection surfaces. The accent control keeps its colour swatch and accessible range name without repeating a visible label. Route-card eyebrows and Component Group labels appear only when they distinguish siblings within the same grid.

Component Metadata owns purpose membership, `useWhen`, and `notWhen`. Every Workflow Component and each easily confused pair carries that guidance beside its examples.

Each Component presents its available supporting material in closed disclosures: Best practices first, then Selection and React import, then Props and variants. Best practices contains `useWhen`, `notWhen`, and author responsibilities when its Metadata supplies them.

## Copy source-backed configuration

Each Component exposes copyable runtime selection by slug, Group selection, and its React import. [`build.ts`](../../scripts/build.ts) derives them from the Metadata and adapter export.

Props and variants come from authored TypeScript through `deno doc --json`. Flat prop interfaces become tables and literal unions become variant values. Source unions stay omitted because flattening their branches would erase the contract; the Catalogue prints the reason.

Composition recipes live only in the Catalogue. Each recipe renders a preview and produces copyable JSX from one structured definition. A recipe with a `journey` contract declares its ordered semantic stages; the conformance view renders every enrolled journey from that same recipe authority.

The CLI view is not a screenshot or a second set of fixtures. [`build.ts`](../../scripts/build.ts) statically enrolls each rendered Component's default CLI renderer and `cliExamples` beside its web examples. [`cli-preview.tsx`](../../catalogue/cli-preview.tsx) calls those renderers with the fixed 80-column truecolour Unicode profile and decodes the emitted SGR attributes into React spans on one bare, cell-stable monospace output surface. It deliberately omits nested Terminal window chrome so the Component frame is the specimen. Every specimen receives the toolbar's resolved terminal palette; explicit Light and Dark modes are direct, while System follows the live `prefers-color-scheme` query. Theme toggle is the one stateful naming collision: its authored `theme` still determines the action being demonstrated, while its separate `palette` receives the Catalogue theme. A reasoned exemption disables that card's CLI choice and exposes the exact Metadata reason as a tooltip before the unavailable choice can be made. The decoder fails closed when output exceeds its supported SGR subset, and a registry-wide test renders and projects every example.

Diagram's detail route is the visual grammar for the closed kind library. Its Web surface derives every kind's minimal, representative, structural, long-text, maximum-density, and semantic-role postures from the generated release corpus, alongside literal light, dark, and adaptive standalone assets, Markdown promotion, and DataFigure composition. Its CLI surface derives the same specs into enhanced flow, cycle, and sequence frames; architecture and timeline descriptions; explicit description mode; and typed width/density fallbacks. No hand-drawn preview scene or second example fact set exists, so a new kind or posture joins generation, Catalogue review, and projection tests together.

## Review terminal foundations

[`terminal-foundations.ts`](../../catalogue/terminal-foundations.ts) is the one framework-neutral registry for review surfaces smaller than a Component. The stdout and browser Catalogues plus the Playground's static browser derive Terminal motifs and Narration lines from it: a new sheet automatically receives a CLI selector, stdout section, Playground choice, browser sidebar link, Search Palette destination, projected specimen cards, and conformance enrollment. The browser sheet shares [`cli-preview.tsx`](../../catalogue/cli-preview.tsx)'s projector rather than creating another ANSI decoder.

Animated specimens pair one live frame with their complete static frame evidence. The default and consumer-derived spinners start automatically when the user has no reduced-motion preference; `prefers-reduced-motion: reduce` starts them paused, and an explicit Play/Pause control always remains available. The real-browser gate compares every rendered sheet and specimen identity with the registry, finds Terminal motifs by searching for “spinner”, proves the reduced-motion frame stays still until Play, exercises playback, and runs an accessibility scan over the complete foundation population. A synthetic differently named sheet proves the generic renderer and search projection do not special-case today's two entries.

## Review complete terminal layouts

The Terminal layouts section composes multiple public CLI renderers into complete pages rather than inspecting one Component in isolation. Four source-backed recipes cover an operational status, a failure report, a command reference, and a guided interactive choice. Each can be switched among compact 40×24, standard 80×24, and wide 120×30 profiles and can overlay character-cell guides. The package's public `projectTerminalInspectorHtml()` supplies the actual frame, subdued row and column rulers, fold, overflow facts, and advisory repeated-row or blank-run cues; the Catalogue adds only controls and copyable composition source. The recipe renderer and inspector chrome receive the same resolved terminal theme, so changing a component renderer or the Catalogue theme immediately re-renders the complete page from its real authorities.

These profiles make comparisons reproducible, but they are review fixtures rather than supported-terminal limits. The renderer still receives the selected profile's real column count, so responsive Component behaviour—including the available-width choice frames introduced in 0.16.0—runs before inspection. A layout recipe never recreates Component geometry.

## Link to a state

An examples module may export named `catalogueStates`; other Components receive a generated `default` state. Ordinary single-example cards omit the redundant Default label, while the state and its fragment remain enrolled. The fragment `#component-<slug>--<state>` restores and highlights the state after the app mounts. Command, Path reference, Diagnostic, and Table include stress states.

The toolbar reads the package version from `deno.json`, and conformance sheets repeat it in screenshots. The browser pass checks every generated Component example and terminal foundation, then runs the mandatory journey-resilience phase. Journey checks cover stage order, headings, landmarks, keyboard traversal, exact Command copies, and axe in both themes. Generic rendered-surface scans cover disclosure semantics, nested controls, minimum targets, page reflow at 390 pixels and the 320-pixel equivalent of 400% zoom, reduced motion, system-theme return, composited and visible semantic focus, and forced-colour focus.

The automated boundary is the Catalogue's rendered static surfaces and its declared theme consumer. Consumer application routes, product navigation, and manual screen-reader output remain consumer-level acceptance work.

## Initial render and exhaustive review

The initial route mounts only the overview shell. Generated CLI modules remain statically imported so browser compatibility and complete renderer enrollment still fail at build time, but ordinary Component frames mount only on a detail route or an explicitly scoped Review sheet. Individual CLI frames are still computed only when their CLI surface renders.

The machine conformance route remains separate and exhaustive: `?conformance=1` mounts every generated web specimen and declared journey without ordinary Catalogue chrome. Human review and machine conformance therefore preserve complete enrollment without making completeness the cost of every browsing visit.

## Where it lives

| Concern                                                                | Authority                                                                            |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Explorer paths, legacy-link upgrades, and shell route recognition      | [`routes.ts`](../../catalogue/routes.ts)                                             |
| Purpose vocabulary and usage fields                                    | [`component-meta.ts`](../../src/types/component-meta.ts)                             |
| Registry, snippets, prop evidence, CLI enrollment, and package version | [`build.ts`](../../scripts/build.ts)                                                 |
| Search destinations, purpose filtering, surface and state links        | [`app.tsx`](../../catalogue/app.tsx)                                                 |
| Browser terminal projection                                            | [`cli-preview.tsx`](../../catalogue/cli-preview.tsx)                                 |
| Terminal foundation inventory                                          | [`terminal-foundations.ts`](../../catalogue/terminal-foundations.ts)                 |
| Browser terminal foundation host                                       | [`terminal-foundation-preview.tsx`](../../catalogue/terminal-foundation-preview.tsx) |
| Composition definitions                                                | [`compositions.tsx`](../../catalogue/compositions.tsx)                               |
| Terminal composition definitions                                       | [`cli-compositions.ts`](../../catalogue/cli-compositions.ts)                         |
| Terminal layout inspector host                                         | [`terminal-layout-inspector.tsx`](../../catalogue/terminal-layout-inspector.tsx)     |
| Resolved terminal theme                                                | [`terminal-theme.ts`](../../catalogue/terminal-theme.ts)                             |
| Browser assertions                                                     | [`conformance.ts`](../../scripts/conformance.ts)                                     |
| Journey and rendered-surface resilience                                | [`resilience-conformance.ts`](../../scripts/resilience-conformance.ts)               |
| CSS-free journey grammar                                               | [`journey_resilience_test.tsx`](../../tests/journey_resilience_test.tsx)             |
| Authority guards                                                       | [`catalogue_instrument_test.ts`](../../tests/catalogue_instrument_test.ts)           |
