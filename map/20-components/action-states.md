# Action states

[`Button`](../../src/components/core/button/button.tsx) and [`IconButton`](../../src/components/core/icon-button/icon-button.tsx) render browser-native actions at build time. Their caller owns task lifecycle. Set `busy` before allowing another activation, retain the original action label and icon, and clear it when the task settles. The busy frame has `aria-busy` and a still dotted progress rail; it adds no layout space and needs no animation to convey state.

## Activation and focus

Busy or `aria-disabled=true` native buttons emit `disabled`. They cannot be clicked or submitted through native keyboard activation and leave the tab sequence. This deliberately chooses browser enforcement without a hydration dependency. A consumer replacing the pending frame should announce task results in its own status region and restore focus to the completed action or appropriate next destination. The library neither starts work nor automatically locks an idle control after a click; consumers must render the pending state promptly and handle submission idempotency themselves.

Unavailable Button anchors retain link semantics but omit `href` and use `tabIndex=-1`. Their old URL cannot be followed through Enter, middle-click, or a context menu. This does not intercept consumer event handlers: those remain the consumer's responsibility. A CSS-only class on consumer-authored HTML conveys appearance, not activation suppression.

Disabled actions retain muted ink on a sunken surface and a dashed edge. Busy adds a dotted rail and progress cursor. Forced colours use system disabled ink; no disabled meaning depends on opacity or an accessible-name-only suffix. IconButton requires a meaningful label; provide surrounding context or a tooltip when the graphic alone is unfamiliar.

## Composition

Use the raised primary for the main next step, a flat bordered secondary for an alternative, ghost for tertiary actions, and the flat danger treatment with explicit destructive wording such as “Delete draft”. Colour cannot substitute for that wording. Keep action groups locally wrapping; Button wraps labels without truncating them, and icon slots stay centered and do not shrink. Artwork keeps its own dimensions within the slot's maximum bounds. The shared control-size roles remain the sizing authority, including density floors and consumer overrides.

The component-owned [Button examples](../../src/components/core/button/button.examples.tsx) and [IconButton examples](../../src/components/core/icon-button/icon-button.examples.tsx) provide the adjacent action matrix in the existing contact/reel review instrument. [`button_action_states_test.tsx`](../../tests/button_action_states_test.tsx) checks static activation policy, caller-rendered idle/busy/idle geometry, native keyboard repeats, readable disabled witnesses, reduced-motion meaning, forced colours, wrapping, and size floors. This browser contract does not change the pure terminal renderer's existing props or bytes.
