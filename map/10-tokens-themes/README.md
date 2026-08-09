# Tokens & themes

Tokens (primitive, semantic-role, and Preset layers in [`tokens.ts`](../../src/tokens/tokens.ts)), the light/dark Theme roles, the branded blue Preset, and the Root-scoped foundation and utility CSS.

## Typography roles

The display face carries editorial headings. The body and interface faces carry prose, labels, indices, dates, measurements, status metadata, annotations, captions, and identities. The monospace face is reserved for an explicitly monospaced brand name and code, including source, commands, file paths, and terminal output. A component does not use monospace to create a technical mood.

Components that accept arbitrary content keep the text face by default. Consumers mark code through the component's code-bearing prop or semantic markup. The `Brand`, `SiteHeader`, and `SiteFooter` `mono` variants and the `.discern-mono` utility remain explicit opt-ins; discern's public surfaces use that brand variant for the name `discern`.

The emitted Runtime treats the user's system colour scheme as the default. A Root with no `data-discern-theme`, or with `data-discern-theme="system"`, follows `prefers-color-scheme`; `"light"` and `"dark"` remain deterministic overrides. Consumer Presets mirror their dark overrides inside the same system media query so branding and semantic roles move together.

_This subtree is not yet written — filling it is tracked in [`discern/TODO.md`](../../discern/TODO.md). Until then, start from the [orientation docs](../00-orientation/)._
