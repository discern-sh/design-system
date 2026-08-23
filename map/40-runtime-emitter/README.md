# Runtime emitter

The Emitter in [`runtime.ts`](../../src/runtime.ts): Selection resolution through the Registry, deterministic output ordering, the Manifest schema ([`manifest.ts`](../../src/manifest.ts)), Optional Assets, and the cross-runtime `node:fs/promises` write path.

Resolved Component Metadata can also declare selection-scoped browser behavior. The Emitter concatenates those authored behavior sources in canonical order into `discern.js`, records the path in `manifest.outputs.scripts`, and emits no script for a CSS-only Selection. The shared floating-surface behavior uses generic `data-discern-floating-*` hooks, so Hover card, Tooltip, composed dependants, and future Components join the same top-layer clipping cure without consumer-specific code.

Selecting the Diagram Component emits its token-driven CSS through the ordinary Component registry and adds no browser script, font payload, or diagram runtime. Standalone SVG is deliberately outside the runtime emitter: a consumer calls the pure `renderDiagramSvg()` API and owns any file write. Those SVG bytes embed resolved light/dark palette values and conservative font stacks, never page Tokens or emitted optional assets, so an external `<img>` does not depend on the runtime selection.

## Guides

| Page                                             | What it answers                                                                                                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Select a Runtime per route](route-selection.md) | How to combine Groups and Components per route, inspect resolved dependencies in the Manifest, price Optional Assets, and read the governed reference profiles. |
