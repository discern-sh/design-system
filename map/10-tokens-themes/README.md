# Tokens & themes

Tokens (primitive, semantic-role, and Preset layers in [`tokens.ts`](../../src/tokens/tokens.ts)), the light/dark Theme roles, the branded blue Preset, and the Root-scoped foundation and utility CSS.

The emitted Runtime treats the user's system colour scheme as the default. A Root with no `data-discern-theme`, or with `data-discern-theme="system"`, follows `prefers-color-scheme`; `"light"` and `"dark"` remain deterministic overrides. Consumer Presets mirror their dark overrides inside the same system media query so branding and semantic roles move together.

_This subtree is not yet written — filling it is tracked in [`discern/TODO.md`](../../discern/TODO.md). Until then, start from the [orientation docs](../00-orientation/)._
