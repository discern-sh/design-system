# ADR 0035: Run Builder previews in a bounded frame realm

**Status**: accepted

## Context

Builder width labels previously resized a `div` while Components continued to execute in the outer Catalogue viewport. The visible box could say 390px while `matchMedia("(max-width: 820px)")` remained false, and a nominal 1200px preview could be silently capped by the centre pane. A CSS transform or container alone cannot give viewport media queries a different browser viewport.

Interaction adds a separate boundary. ADR 0027 requires every accepted Builder document to remain inert data, yet people need to exercise local Component state, required callbacks, native Dialog and disclosure behaviour, and keyboard contracts. Rendering through a React portal into an iframe is insufficient: CSS observes the frame, but Component modules still resolve globals such as `document` in the outer JavaScript realm, so Dialog scroll locking can affect Builder chrome.

## Decision

The Builder renders accepted documents in a dedicated same-origin iframe document. The frame loads the repository-authored Builder bundle in its own JavaScript realm, so viewport media queries, native focus, and Component-owned browser effects resolve against the frame. The parent preserves the exact logical iframe width and applies visual Fit or explicit zoom outside it; visual scale never changes frame layout.

The iframe sandbox permits same-origin access and scripts because the trusted Builder bundle must render the design-system Components. It grants no form submission, downloads, popups, or top-level navigation. The frame document adds a restrictive Content Security Policy, and Interact mode captures link and submit effects before the sandbox supplies a platform backstop. `allow-same-origin` plus `allow-scripts` is not treated as a defence against repository code; the security boundary is between trusted, reviewed bundle code and policy-accepted document data.

One versioned `postMessage` protocol is the only authority crossing that boundary. Every message is bound to the expected origin and window, structured-cloned into the receiving realm, and validated. Parent-to-frame snapshots carry the accepted document, its stable inert identity, logical viewport, visual zoom evidence, Preview Appearance, mode, selection, and explicit interaction reset revision. Frame-to-parent messages carry measured viewport and node geometry, readiness, and bounded inert event summaries. No document value is evaluated, imported as a module, or converted into a callback.

Edit mode leaves the frame subtree inert and places selection, hover, insertion, and drop decoration in a stable parent-owned editor layer. Coordinates map explicitly between displayed and logical space. Interact mode removes that layer. Required callback props come only from the existing export callback contract; the frame supplies deterministic witnesses and may hold a safe primitive as transient controlled state. Those functions and values never enter the document, undo history, persistence, or export.

## Consequences

Every width control can report the iframe's measured `innerWidth`, including a 1200px frame displayed below 100%. Viewport and container queries behave as they do on an ordinary page, while Component globals and native effects remain local to the preview document. Edit and Interact have distinct, testable focus and effect contracts, and switching modes does not record an authoring change.

The preview loads a second instance of the Builder bundle and its design-system graph. Protocol changes are versioned contracts, and frame bootstrap, policy acceptance, coordinate mapping, effect containment, and callback summaries require unit and real-browser guards. The sandbox does not make trusted bundle code untrusted-safe; a future feature that admits arbitrary script, remote module code, or executable imported values would need a different-origin isolation decision and a new ADR.

## Alternatives considered

A width-constrained `div`, CSS zoom, and visual cropping cannot change viewport media queries. A scriptless iframe populated by a parent React portal gives truthful CSS width but leaves module-global effects in the Builder realm. Serializing HTML into a scriptless frame loses real React behaviour. A different-origin frame would provide a stronger code boundary but requires a separately served application and cannot share the current local bundle/runtime without a materially larger deployment contract. Allowing arbitrary callbacks or scripts would make imported documents executable and violate ADR 0027.
