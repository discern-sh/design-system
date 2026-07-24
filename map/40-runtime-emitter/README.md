# Runtime emitter

The Emitter in [`runtime.ts`](../../src/runtime.ts): Selection resolution through the Registry, deterministic output ordering, the Manifest schema ([`manifest.ts`](../../src/manifest.ts)), Optional Assets, and the cross-runtime `node:fs/promises` write path.

Resolved Component Metadata can also declare selection-scoped browser behavior. The Emitter concatenates those authored behavior sources in canonical order into `discern.js`, records the path in `manifest.outputs.scripts`, and emits no script for a CSS-only Selection. The shared floating-surface behavior uses generic `data-discern-floating-*` hooks, so Hover card, Tooltip, composed dependants, and future Components join the same top-layer clipping cure without consumer-specific code.

_This subtree is not yet written — filling it is tracked in [`discern/TODO.md`](../../discern/TODO.md). Until then, start from the [orientation docs](../00-orientation/)._
