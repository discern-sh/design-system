# Catalogue

The local component browser: the [`styleguide/`](../../styleguide/) app, the [`build.ts`](../../scripts/build.ts) pipeline that assembles `dist/`, and the [`serve.ts`](../../scripts/serve.ts) dev server on port 8010.

The Catalogue uses the public Theme switcher for System, Light, and Dark; System is the default when no explicit preference is stored. Because the Catalogue is client-rendered, it also replays the initial URL fragment after mounting so a cold `#component-…` URL lands at the same target as a native in-page link.

_This subtree is not yet written — filling it is tracked in [`discern/TODO.md`](../../discern/TODO.md). Until then, start from the [orientation docs](../00-orientation/)._
