# ADR 0026: Use quiet labelled rules for subordinate sections

**Status**: accepted

## Context

The strong embedded section rule established by ADR-0010 remains useful for major boundaries, but it competes with content when a workflow needs to label a subordinate region such as a Procedure's steps. The existing leading-marker divider is appropriately quiet but cannot carry a label, while the documentation-specific Anchor heading adds document hierarchy that general Layout and Workflow Components do not own.

The treatment set is public API, so adding another geometry is costly to reverse. It must remain width-bounded, use the consumer motif and Theme, and preserve meaning in ASCII and no-colour terminals without creating parallel Section and Procedure implementations.

## Decision

The shared motif section-rule renderer retains `embedded` as its default and adds the single-row `quiet` treatment. It places the everyday motif marker at the left, preserves the caller's label casing in the normal ink role, and fills the remaining width with a faint light rule. ASCII uses the same geometry with the motif's ASCII marker and `-` rule.

Section exposes the shared treatment as `quiet-rule`, and Procedure uses it for its `Steps` boundary. Anchor heading may select the same motif treatment through its existing forwarding contract, but it remains the owner only when document heading semantics are required. Components do not copy this geometry.

## Consequences

Major and subordinate boundaries now have distinct strengths without losing a full-width scan line. Consumers can select the quiet rule directly, so its name and exact one-row geometry become public contract. Labels no longer receive automatic uppercasing in this treatment, which makes caller-authored hierarchy more visible but leaves casing consistency to the caller.

This record supersedes ADR-0010's closed treatment inventory while retaining its strong embedded default, underline, sandwich, truncation, and capability-degradation decisions.

## Alternatives considered

Putting the variant only on Section would make Procedure copy it or depend on a Layout Component for a motif primitive. Putting it on Anchor heading would incorrectly add documentation hierarchy to workflows. Reusing the unlabelled ribbon and printing the title on the next row costs vertical space and separates the label from its boundary.
