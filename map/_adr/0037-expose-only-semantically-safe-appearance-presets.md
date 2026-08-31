# ADR 0037: Expose only semantically safe Appearance presets

**Status**: accepted

## Context

The Catalogue Appearance control exposed the public `--discern-accent-hue` primitive as an unrestricted 0–360 degree slider while success, warning, and danger remained fixed semantic roles. That made the project UI promise more than the Theme could uphold: hues near 20° approach danger, hues near 145° approach success, and part of the cyan range cannot keep the accent focus ring at 3:1 against every semantic soft surface. Three favourable screenshots could not establish safety for the continuous range.

An integer sweep of the existing Token formulae in both Themes, using the existing 4.5:1 text, 3:1 focus, and 0.08 OKLab semantic-distance thresholds, finds safe islands rather than one useful continuous branding range. The project-facing control needs a finite promise that can be tested exhaustively. The public Token must remain available to consumers, who can coordinate a brand hue with any conflicting semantic roles as the green Theme fixture already demonstrates.

## Decision

Catalogue Appearance exposes one source-owned ordered set of named, tested presets with exactly one declared default. URL, storage, shell, Builder preview, and visual review state all consume the same option authority. Unknown or colliding values fail closed instead of being rounded into the apparent range. The authority may admit more named values from the proved integer safe islands without changing this decision; its exhaustive validation remains the admission gate.

The proof evaluates every exposed option in light and dark Themes for accent text contrast, focus contrast across accent, success, warning, and danger soft surfaces, and pairwise distinction between accent, success, warning, and danger roles. The roles retain their own labels and non-colour witnesses; selecting an accent never recolours success.

`--discern-accent-hue` remains a public low-level Token, not a guarantee that all 360 hues are semantically safe with the package defaults. Consumer guidance states that a brand hue near a semantic role must override that semantic family coherently and re-run contrast and distinction checks. No new colour Token or Theme generator is introduced.

## Consequences

Every project-facing Appearance choice is exhaustively defensible and stable in deep links. Adding a preset now requires evidence and automatically joins the Theme proof and review instrument. Consumers retain low-level branding freedom, but arbitrary hues are intentionally absent from the Catalogue control.

The preset set is smaller than a colour picker and does not attempt to model a consumer's whole brand system. A future coordinated Theme generator would be a new public contract and needs separate repeated demand and another decision.

## Alternatives considered

Keeping the unrestricted slider with a warning leaves unsafe values selectable and makes the control semantically false. Clamping to one broad range hides discontinuous safe islands and makes nearby inputs jump unpredictably. Moving success with every accent would erase the success-is-not-accent invariant. Coordinating every semantic role through a new generator is disproportionate to the four project review choices and would expand the public Theme contract.
