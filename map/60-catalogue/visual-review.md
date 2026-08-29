# Browser visual review

Browser polish uses one source-backed review vocabulary rather than a screenshot checklist. Canonical Web examples remain the stable starting states; [`catalogue/review-postures.ts`](../../catalogue/review-postures.ts) derives a settled posture for every one and validates only the extra interaction, motion, responsive, validation, or Appearance postures authored beside an example. Each extra posture reuses [`ConformanceStep`](../../catalogue/conformance.ts) targets/actions and the existing [`ComponentExampleCaptureDirective`](../../catalogue/example-images/contract.ts). The generated Catalogue registry is the only population projection.

## Visual grammar

- Immediate hover and press feedback may use `--discern-duration-fast`. Pressed feedback stays causally attached to the input and cannot move layout geometry.
- Ordinary open/close, selection, validation, and mode continuity may use `--discern-duration-medium` only when movement helps connect cause and result.
- `--discern-duration-reveal` is opt-in for an authored entrance or story. Controls, lists, and route changes do not inherit it by default.
- Looping motion means ongoing work or explicitly ambient Artwork. The still frame contains the complete meaning, and reduced motion removes movement without removing state.
- `:focus-visible`, hover, active/pressed, and selected are independent facts. Disabled and busy states retain a non-opacity witness. Passive cards do not acquire a clickable lift.
- Card, Window, and pop shadows remain the elevation hierarchy. A Component-specific optical shadow describes its visual object; it does not create another elevation tier.
- Embedded Components respond to allocated inline size. The browser viewport governs only page composition. Builder continues to own truthful iframe viewport widths; this Catalogue tool deliberately measures a local container and reports the outer viewport separately.
- `--discern-font-size-xs` remains the interface-text floor. Terse tertiary metadata can use faint ink; explanatory sentences use readable semantic ink rather than inheriting tertiary styling.

These are decisions, not a universal transition or hover utility. A new duration, easing, elevation, or global interaction class needs repeated semantic demand across at least three unrelated Components and an ADR when it changes a hard-to-reverse shared boundary.

## Local instrument

Run `deno task serve`, then open `/catalogue/reviews/components/` on the port from `discern identity --port`. The route is local-only, absent from public navigation, and outside the package export graph. Its URL records Group, Component, canonical example, posture, state category, local width, Theme, Appearance, motion mode, contact sheet or reel, and production or diagnostic timing.

The settled contact sheet defaults to one Group and mounts only the selected population. The reel mounts one item, remounts it on Replay, runs production Token timing unchanged, and scopes the 4× diagnostic timing override to that specimen. Named narrow, medium, and wide widths allocate 390, 720, and 1120 pixels to embedded specimens inside a contained scroller while the page reports its actual viewport independently. The reviewed viewport exceptions in [`responsive-ownership.ts`](../../catalogue/review/responsive-ownership.ts) instead derive their bounded specimen allocation from that real page width, so full-site chrome, reading shells, breakouts, and broad storytelling sections are not presented as broken embedded Components. The responsive-ownership architecture test binds those same policies to the Component stylesheets, and browser conformance proves both allocations without relying on CSS query spelling.

`deno task catalogue:review` writes the complete tiered plan to `dist/conformance/component-review/manifest.json`. Every canonical example gets four baseline witnesses: Light/medium, Dark/medium, Light/narrow, and Light/wide. Extra postures add only their authored requirements and checkpoints. Browser conformance writes representative contact/reel PNGs beside the manifest. The files are ephemeral perceptual evidence: state, target, focus, geometry, overflow, Theme/Appearance, capture region, accessible name, and reduced-motion behaviour remain separate assertions; there is no pixel-approval gate.

## Appearance

[`shell/appearance-options.ts`](../../catalogue/shell/appearance-options.ts) is the reusable project-facing authority for Sky, Blue, Violet, and Rose. Every option is exhaustively proved in Light and Dark for text contrast, focus contrast on all semantic soft surfaces, and accent/success/warning/danger separation. Unknown values fail closed. [ADR 0037](../_adr/0037-expose-only-semantically-safe-appearance-presets.md) records why the Catalogue no longer presents the public low-level hue Token as an unrestricted safe range.

Consumer Themes can still override `--discern-accent-hue`; a hue near a semantic role must coordinate that role as the green fixture demonstrates. Success remains distinct from accent.
